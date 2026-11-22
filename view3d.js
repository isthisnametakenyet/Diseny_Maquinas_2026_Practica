/* 3D view (Three.js): scene, camera, the parts, the arrows and the animation. onSelect(id) is called on a click. */

import { $, animSpeed, colorOf, COLORS, opts, selected, visible } from './state.js';
import { derive, pulleyProfile, SPEED_RPM } from './model.js';
import { ARROW_3D, forceLook } from './arrows.js';
import { makeGeometry } from './geometry3d.js';

export let view3d = null;   // { rebuild(g), resize(), highlight() }

export async function init3D(onSelect) {
  let THREE, OrbitControls;
  try {
    THREE = await import('three');
    ({ OrbitControls } = await import('three/addons/controls/OrbitControls.js'));
  } catch (err) {
    const msg = $('#msg3d');
    msg.hidden = false;
    msg.textContent = 'Three.js could not be loaded (check the internet connection): ' + err.message;
    return;
  }

  const host = $('#view3d');
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.sceneBg);
  const camera = new THREE.PerspectiveCamera(40, 1, 1, 10000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  // left drag orbits, wheel zooms, middle or right drag pans
  controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.PAN };
  const canvas = renderer.domElement;

  // Zoom. A mouse wheel sends a few large steps (about 100 per notch); a touchpad sends a stream of very
  // small ones (two-finger scroll), or small ones with ctrlKey set (pinch). The same gain cannot suit both,
  // so the wheel is handled here: the distance to the orbit centre is scaled by the amount scrolled, with
  // a larger gain for the touchpad.
  controls.enableZoom = false;
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const px = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 300 : 1);   // lines or pages, as pixels
    if (!px) return;
    const mouse = e.deltaMode !== 0 || (!e.ctrlKey && Number.isInteger(e.deltaY) && Math.abs(e.deltaY) >= 50);
    // per pixel scrolled: a touchpad scroll gets 5 times the mouse gain, a pinch more still
    const gain = mouse ? 0.0011 : e.ctrlKey ? 0.02 : 0.0055;
    const factor = Math.exp(Math.max(-0.5, Math.min(0.5, px * gain)));
    const offset = camera.position.clone().sub(controls.target);
    const dist = Math.max(15, Math.min(8000, offset.length() * factor));
    camera.position.copy(controls.target).add(offset.setLength(dist));
  }, { passive: false });
  canvas.addEventListener('mousedown', e => { if (e.button === 1) e.preventDefault(); });   // no browser auto-scroll

  // the component a mesh belongs to: its own tag, or the tag of the mesh it is attached to
  const partOf = o => {
    for (; o; o = o.parent) if (o.userData && o.userData.part) return o.userData.part;
    return null;
  };
  const part3 = (mesh, id) => { mesh.userData.part = id; return mesh; };

  // a left click that did not turn into a drag selects the component under the pointer
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  let down = null;
  canvas.addEventListener('pointerdown', e => { down = e.button === 0 ? [e.clientX, e.clientY] : null; });
  canvas.addEventListener('pointerup', e => {
    if (!down || e.button !== 0) return;
    const moved = Math.hypot(e.clientX - down[0], e.clientY - down[1]);
    down = null;
    if (moved > 4) return;
    const r = canvas.getBoundingClientRect();
    ptr.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects([spin, fixed, drive], true).find(h => partOf(h.object));
    onSelect(hit ? partOf(hit.object) : null);
  });

  // the selected component glows in the selection colour
  function highlight() {
    [spin, fixed, drive].forEach(grp => grp.traverse(o => {
      if (!o.material || !o.material.emissive) return;
      const on = !!selected && partOf(o) === selected;
      o.material.emissive.set(on ? COLORS.select : 0x000000);
      o.material.emissiveIntensity = on ? 0.5 : 1;
    }));
  }
  let lastTarget = '';

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a94a0, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(300, 500, 400);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xffffff, 0.7);
  fill.position.set(-400, 100, -300);
  scene.add(fill);

  // root: local +Y is the shaft axis, mapped onto world +X
  const root = new THREE.Group();
  root.rotation.z = -Math.PI / 2;
  scene.add(root);
  const spin = new THREE.Group();      // rotating parts
  const fixed = new THREE.Group();     // bearing outer rings
  const drive = new THREE.Group();     // pinion (counter-rotating about its own axis)
  root.add(spin, fixed, drive);
  let pinionMesh = null;
  let gearPitch = 0.1;                 // angle between two teeth of gear B, rad
  let drivenMesh = null;               // driven pulley of the V-belt drive
  let beltRun = null;                  // belts and the marks that travel along them
  const markPos = new THREE.Vector3(), markObj = new THREE.Object3D();
  const overlay = new THREE.Group();   // arrows, labels, axes (world coordinates)
  scene.add(overlay);

  const mat = (color, extra) => new THREE.MeshStandardMaterial(Object.assign(
    { color, metalness: 0.45, roughness: 0.45 }, extra));
  const { tube, helicalGear, addWebHoles } = makeGeometry(THREE, mat);

  function label(str, color, size) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const ctx = cv.getContext('2d');
    ctx.font = 'bold 76px system-ui, Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 10;
    ctx.strokeStyle = COLORS.paper;
    ctx.strokeText(str, 64, 68);
    ctx.fillStyle = color;
    ctx.fillText(str, 64, 68);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    sp.scale.set(size, size, 1);
    sp.renderOrder = 10;
    return sp;
  }

  function clear(group) {
    group.traverse(o => {
      if (o.geometry) {
        if (o.geometry.userData.outline) o.geometry.userData.outline.dispose();
        o.geometry.dispose();
      }
      if (o.material) {
        if (o.material.map) o.material.map.dispose();
        o.material.dispose();
      }
    });
    group.clear();
  }

  const at = (mesh, x) => { mesh.position.y = x; return mesh; };   // place along the shaft axis

  function rebuild(g) {
    scene.background.set(COLORS.sceneBg);
    clear(spin); clear(fixed); clear(overlay); clear(drive);
    pinionMesh = null;
    drivenMesh = null;
    beltRun = null;
    gearPitch = 2 * Math.PI / g.gear.z;

    if (visible.pinion) {
      const pn = g.pinion;
      pinionMesh = new THREE.Mesh(helicalGear(pn), mat(colorOf.pinion, { flatShading: true, side: THREE.DoubleSide }));
      pinionMesh.position.set(-pn.yc, pn.x, 0);        // local −X is world +Y: sits on top of B
      pinionMesh.userData = { ratio: g.gear.z / pn.z, pitchG: 2 * Math.PI / g.gear.z, part: 'pinion' };
      const stub = 50, rs = pn.rf * 0.55;
      const motorShaft = new THREE.Mesh(new THREE.CylinderGeometry(rs, rs, stub, 32),
        mat(colorOf.shaft, { metalness: 0.7, roughness: 0.35 }));
      motorShaft.position.y = -(pn.w / 2 + stub / 2);
      pinionMesh.add(motorShaft);
      drive.add(pinionMesh);
    }

    if (visible.shaft) {
      const m = mat(colorOf.shaft, { metalness: 0.7, roughness: 0.35 });
      const cyl = (xa, xb, r) => part3(at(new THREE.Mesh(new THREE.CylinderGeometry(r, r, xb - xa, 48), m), (xa + xb) / 2), 'shaft');
      spin.add(cyl(g.x0, g.x1, g.d / 2));
      g.steps.forEach(st => spin.add(cyl(st[0], st[1], st[2])));
    }

    if (visible.gear) {
      spin.add(part3(at(new THREE.Mesh(helicalGear(g.gear),
        mat(colorOf.gear, { flatShading: true, side: THREE.DoubleSide })), g.gear.x), 'gear'));
    }

    if (visible.pulley) {
      const pts = pulleyProfile(g.pulley).map(p => new THREE.Vector2(p[0], p[1]));
      const pulleyMesh = new THREE.Mesh(new THREE.LatheGeometry(pts, 96),
        mat(colorOf.pulley, { flatShading: true, side: THREE.DoubleSide }));
      addWebHoles(pulleyMesh, g.pulley);
      spin.add(part3(at(pulleyMesh, g.pulley.x), 'pulley'));
    }

    // V-belt drive: the driven pulley on its own shaft at +z, and one belt loop per groove
    if (visible.vbelt) {
      const v = g.vbelt, pl = g.pulley;
      const depth2 = Math.max(1, Math.min(pl.depth, v.R2 * 0.4));
      const bore2 = Math.max(4, Math.min(pl.rBore, v.R2 * 0.3));
      const pl2 = Object.assign({}, pl, { R: v.R2, depth: depth2, rBore: bore2, rHub: Math.max(bore2 + 2, Math.min(pl.rHub, v.R2 * 0.55)) });
      const pts2 = pulleyProfile(pl2).map(p => new THREE.Vector2(p[0], p[1]));
      drivenMesh = new THREE.Mesh(new THREE.LatheGeometry(pts2, 96),
        mat(colorOf.vbelt, { flatShading: true, side: THREE.DoubleSide }));
      drivenMesh.position.set(0, pl.x, v.C);                    // local z is world z: the drive runs towards +z
      drivenMesh.userData = { ratio: pl.R / v.R2, part: 'vbelt' };
      addWebHoles(drivenMesh, pl2);
      drivenMesh.add(new THREE.Mesh(new THREE.CylinderGeometry(bore2, bore2, pl.w + 90, 32),
        mat(colorOf.shaft, { metalness: 0.7, roughness: 0.35 })));
      drive.add(drivenMesh);

      // belt centre line in the (y, z) plane: wrap on pulley D, tangent, wrap on the driven pulley, tangent back
      const r1 = pl.R - pl.depth / 2, r2 = Math.max(2, v.R2 - depth2 / 2);
      const a = Math.asin(Math.max(-1, Math.min(1, (r2 - r1) / v.C)));
      const loop = [];
      const arc = (r, zc, from, to) => {
        const n = Math.max(6, Math.ceil(Math.abs(to - from) / 0.12));
        for (let i = 0; i <= n; i++) {
          const th = from + (to - from) * i / n;
          loop.push([r * Math.cos(th), zc + r * Math.sin(th)]);
        }
      };
      const span = (p, q) => { for (let i = 1; i < 8; i++) loop.push([p[0] + (q[0] - p[0]) * i / 8, p[1] + (q[1] - p[1]) * i / 8]); };
      arc(r1, 0, -a, -Math.PI + a);
      const p1 = loop[loop.length - 1], q1 = [r2 * Math.cos(Math.PI + a), v.C + r2 * Math.sin(Math.PI + a)];
      span(p1, q1);
      arc(r2, v.C, Math.PI + a, -a);
      span(loop[loop.length - 1], loop[0]);

      const beltMat = mat(COLORS.belt3d, { metalness: 0.05, roughness: 0.95 });
      const tubeR = Math.max(1.5, pl.depth * 0.32), pitch = pl.w / pl.n;
      const curves = [];
      for (let i = 0; i < pl.n; i++) {
        const xg = pl.x - pl.w / 2 + pitch * (i + 0.5);
        // world (x, y, z) is local (−y, x, z) inside `root`
        const curve = new THREE.CatmullRomCurve3(loop.map(q => new THREE.Vector3(-q[0], xg, q[1])), true, 'centripetal');
        drive.add(part3(new THREE.Mesh(new THREE.TubeGeometry(curve, loop.length * 2, tubeR, 6, true), beltMat), 'vbelt'));
        curves.push(curve);
      }
      // light marks riding on the belts; the animation loop moves them along at the belt speed
      const len = curves[0].getLength();
      const per = Math.max(12, Math.min(48, Math.round(len / (tubeR * 9))));
      const marks = new THREE.InstancedMesh(new THREE.SphereGeometry(tubeR * 1.28, 10, 8),
        mat(COLORS.beltMark, { metalness: 0.05, roughness: 0.9 }), per * curves.length);
      marks.frustumCulled = false;
      marks.userData.part = 'vbelt';
      drive.add(marks);
      beltRun = { curves, len, per, r1, marks };
    }

    [['bearingA', g.bA], ['bearingC', g.bC]].forEach(([id, b]) => {
      if (!visible[id]) return;
      const ring = mat(colorOf[id], { metalness: 0.6, roughness: 0.3 });
      fixed.add(part3(at(new THREE.Mesh(tube(b.rOut - b.t, b.rOut, b.w), ring), b.x), id));
      spin.add(part3(at(new THREE.Mesh(tube(b.rIn, b.rIn + b.t, b.w), ring), b.x), id));
      const rBall = Math.min(b.rBall, b.w * 0.45);
      const count = Math.max(6, Math.floor(2 * Math.PI * b.rMid / (rBall * 2.5)));
      const ballGeo = new THREE.SphereGeometry(rBall, 20, 14);
      const ballMat = mat(COLORS.chrome, { metalness: 0.9, roughness: 0.15 });
      for (let i = 0; i < count; i++) {
        const a = i / count * Math.PI * 2;
        const ball = new THREE.Mesh(ballGeo, ballMat);
        ball.position.set(b.rMid * Math.cos(a), b.x, b.rMid * Math.sin(a));
        spin.add(part3(ball, id));
      }
    });

    // ---- overlay (world coordinates: x axis = shaft) ----
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const arrow3 = (dir, tip, len, color, name, force) => {
      const d = dir.clone().normalize();
      const look = forceLook(force);
      len *= look.long;
      const origin = tip.clone().addScaledVector(d, -len);
      // a round shaft and a cone head, so the arrow can be as thick as the force is large
      const rad = g.Rmax * ARROW_3D * look.thick, head = Math.min(len * 0.45, rad * 7);
      const m = new THREE.MeshBasicMaterial({ color });
      const turn = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d);
      const shaftMesh = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, len - head, 16), m);
      shaftMesh.position.copy(origin).addScaledVector(d, (len - head) / 2);
      shaftMesh.quaternion.copy(turn);
      const headMesh = new THREE.Mesh(new THREE.ConeGeometry(rad * 2.6, head, 20), m);
      headMesh.position.copy(tip).addScaledVector(d, -head / 2);
      headMesh.quaternion.copy(turn);
      overlay.add(shaftMesh, headMesh);
      if (name && opts.labels) {
        const sp = label(name, color, lsz * 0.9);
        sp.position.copy(origin).addScaledVector(d, -lsz * 0.35);
        overlay.add(sp);
      }
    };
    const lsz = Math.max(22, g.Rmax * 0.28);

    if (opts.forces && visible.gear) {
      // with the pinion shown the forces act at the pitch point; lengthen the arrows so they stick out of it
      const pn = g.pinion, pin = visible.pinion, L = g.Rmax * 0.45;
      const tip = V(g.xB, pin ? g.gear.r : g.gear.ra, 0);
      arrow3(V(0, -1, 0), tip, L + (pin ? 2 * pn.r + pn.m : 0), COLORS.force, 'Fr', g.loads.Fr);
      arrow3(V(1, 0, 0), tip, L + (pin ? Math.max(pn.w, g.gear.w) / 2 : 0), COLORS.force, 'Fa', g.loads.Fa);
      arrow3(V(0, 0, 1), tip, L + (pin ? pn.ra : 0), COLORS.force, 'Ft', g.loads.Ft);
    }
    if (opts.forces && visible.pulley) {
      const rp = g.pulley.R - g.pulley.depth / 2, L = g.Rmax * 0.45;
      arrow3(V(0, 0, 1), V(g.xD, rp, g.pulley.R * 1.1 + L), L, COLORS.force, 'F2', g.loads.F2);
      arrow3(V(0, 0, 1), V(g.xD, -rp, g.pulley.R * 1.1 + L), L, COLORS.force, 'F1', g.loads.F1);
    }
    if (opts.labels) {
      const put = (id, str, x, r) => {
        if (!visible[id]) return;
        const sp = label(str, colorOf[id], lsz);
        sp.position.set(x, -(r + lsz * 0.6), 0);
        overlay.add(sp);
      };
      put('bearingA', 'A', g.xA, g.bA.rOut);
      put('gear', 'B', g.xB, g.gear.ra);
      put('bearingC', 'C', g.xC, g.bC.rOut);
      put('pulley', 'D', g.xD, g.pulley.R);

      const o = V(g.x0 - 30, 0, 0), al = g.Rmax * 0.4;
      [[V(1, 0, 0), 'x'], [V(0, 1, 0), 'y'], [V(0, 0, 1), 'z']].forEach(([d, n]) => {
        overlay.add(new THREE.ArrowHelper(d, o, al, COLORS.ink, al * 0.2, al * 0.09));
        const sp = label(n, COLORS.ink, lsz * 0.7);
        sp.position.copy(o).addScaledVector(d, al + lsz * 0.3);
        overlay.add(sp);
      });
    }

    // Outlines: a dark line along every sharp edge, so that parts of one flat colour still show where a
    // face ends and which one is in front. Belts and balls are round all over and get none.
    if (opts.edges) {
      const edgeMat = new THREE.LineBasicMaterial({ color: COLORS.edge, transparent: true, opacity: 0.6 });
      const solids = [];
      [spin, fixed, drive].forEach(grp => grp.traverse(o => {
        if (!o.isMesh || o.isInstancedMesh) return;
        const type = o.geometry.type;
        if (type === 'TubeGeometry' || type === 'SphereGeometry') return;
        solids.push(o);
      }));
      solids.forEach(o => o.add(new THREE.LineSegments(
        o.geometry.userData.outline || new THREE.EdgesGeometry(o.geometry, 24), edgeMat)));
    }
    highlight();
    // re-centre the orbit only when the model's centre moved, so a pan survives ordinary redraws
    const tgt = [(g.x0 + g.x1) / 2, 0, visible.vbelt ? g.vbelt.C / 2 : 0];
    if (tgt.join() !== lastTarget) { lastTarget = tgt.join(); controls.target.set(tgt[0], tgt[1], tgt[2]); }
  }

  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const g0 = derive();
  if (visible.vbelt) {
    // stand back and to the side so the whole belt drive is in view
    const dist = Math.max(g0.len, g0.Rmax * 2, g0.vbelt.C + g0.vbelt.R2 + g0.pulley.R) * 1.25;
    camera.position.set((g0.x0 + g0.x1) / 2 + dist * 0.85, dist * 0.42, g0.vbelt.C / 2 + dist * 0.75);
  } else {
    const dist = Math.max(g0.len, g0.Rmax * 2) * 1.9;
    camera.position.set((g0.x0 + g0.x1) / 2 + dist * 0.3, dist * 0.32, dist * 0.95);
  }
  resize();
  rebuild(g0);

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();
    // the real angular speed of the shaft, slowed 50 times so the teeth can be followed, times the speed chosen
    if (opts.spin) {
      let step = dt * (SPEED_RPM * 2 * Math.PI / 60) / 50 * animSpeed;
      // A screen shows separate frames. If a tooth moved more than half the way to the next tooth between
      // two frames, the eye would pair it with the wrong tooth and the gear would seem to turn backwards
      // (the wagon wheel effect). The marks on the belt repeat too. So the step of one frame is held under
      // 0.4 of the smallest repeat: the speed still grows with the shaft speed, then levels off.
      let repeat = gearPitch;
      if (beltRun) repeat = Math.min(repeat, beltRun.len / beltRun.per / beltRun.r1);
      const limit = 0.4 * repeat;
      step = limit * Math.tanh(step / limit);
      spin.rotation.y += step;
    }
    if (pinionMesh) {                                // keep the teeth in mesh with gear B
      const u = pinionMesh.userData;
      pinionMesh.rotation.y = -(spin.rotation.y - Math.PI + 0.5 * u.pitchG) * u.ratio;
    }
    if (drivenMesh) drivenMesh.rotation.y = spin.rotation.y * drivenMesh.userData.ratio;   // same direction as pulley D
    if (beltRun) {
      // belt travel = pulley D angle × pitch radius; the top strand runs from pulley D to the driven pulley
      const { curves, len, per, r1, marks } = beltRun;
      const shift = spin.rotation.y * r1 / len;
      let k = 0;
      curves.forEach(curve => {
        for (let i = 0; i < per; i++) {
          let u = (i / per - shift) % 1;
          if (u < 0) u += 1;
          curve.getPointAt(u, markPos);
          markObj.position.copy(markPos);
          markObj.updateMatrix();
          marks.setMatrixAt(k++, markObj.matrix);
        }
      });
      marks.instanceMatrix.needsUpdate = true;
    }
    controls.update();
    renderer.render(scene, camera);
  });

  view3d = { rebuild, resize, highlight };
}
