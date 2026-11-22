/* Shapes of the 3D view that need some working out: a hollow cylinder, a helical gear with involute
 * teeth, and the holes in the web of a pulley. THREE is loaded by view3d.js and handed in here, together
 * with `mat`, its function that makes a material.
 */

import { COLORS } from './state.js';

export function makeGeometry(THREE, mat) {
  // hollow cylinder along local Y
  function tube(rIn, rOut, w) {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, rOut, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, rIn, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false, curveSegments: 40 });
    geo.translate(0, 0, -w / 2);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }

  // helical gear along local Y, built as twisted slices of a simple trapezoidal tooth profile
  function helicalGear(gr) {
    const pitch = 2 * Math.PI / gr.z;
    const prof = [];
    // Involute teeth. Two involute gears with the same module and pressure angle roll on each other
    // without their flanks ever crossing, whatever their sizes, so the meshing teeth touch and do not
    // sink into one another. Half the tooth thickness, as an angle, at radius R is
    //   psi(R) = pi / (2 z) + inv(phi) - inv(alpha_R) ,  cos(alpha_R) = r_base / R ,  inv(a) = tan(a) - a
    // (half a pitch thick at the pitch circle, so there is no backlash). Below the base circle, where
    // there is no involute, the flank goes straight down a radius.
    const phi = gr.phi || 0, rb = gr.r * Math.cos(phi);
    const inv = a => Math.tan(a) - a;
    const psi = R => {
      const half = Math.PI / (2 * gr.z) + inv(phi) - (R > rb ? inv(Math.acos(rb / R)) : 0);
      return Math.min(half, 0.98 * Math.PI / gr.z);
    };
    // a tooth so pointed that its flanks meet below the tip circle ends where they meet
    let rTip = gr.ra;
    if (psi(rTip) < 0.004) {
      let lo = gr.r, hi = gr.ra;
      for (let it = 0; it < 30; it++) { const mid = (lo + hi) / 2; if (psi(mid) > 0.004) lo = mid; else hi = mid; }
      rTip = lo;
    }
    const STEPS = 7, radii = [];
    for (let q = 0; q <= STEPS; q++) radii.push(gr.rf + (rTip - gr.rf) * q / STEPS);
    if (rb > gr.rf && rb < rTip) { radii.push(rb); radii.sort((a, b) => a - b); }    // keep the corner at the base circle
    const perTooth = 2 * radii.length;
    for (let i = 0; i < gr.z; i++) {
      const c = (i + 0.5) * pitch;                                                       // tooth centre
      radii.forEach(R => prof.push([R, c - psi(R)]));                                    // up one flank
      radii.slice().reverse().forEach(R => prof.push([R, c + psi(R)]));                  // down the other
    }
    const n = prof.length, slices = 14;
    const twist = gr.w * Math.tan(gr.beta) / gr.r;
    const pt = (i, k) => {
      const q = prof[i % n], t = k / slices, a = q[1] + (t - 0.5) * twist;
      return [q[0] * Math.cos(a), q[0] * Math.sin(a), (t - 0.5) * gr.w];
    };
    const pos = [];
    for (let k = 0; k < slices; k++) {
      for (let i = 0; i < n; i++) {
        const a = pt(i, k), b = pt(i + 1, k), c = pt(i + 1, k + 1), d = pt(i, k + 1);
        pos.push(...a, ...b, ...c, ...a, ...c, ...d);
      }
    }
    [0, slices].forEach(k => {
      const zc = (k / slices - 0.5) * gr.w;
      for (let i = 0; i < n; i++) pos.push(0, 0, zc, ...pt(i, k), ...pt(i + 1, k));
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    geo.rotateX(-Math.PI / 2);

    // Outline of the gear, built by hand: finding edges automatically also marks the triangles the flat
    // end faces are made of. It is the profile at both ends plus, along the face, the two tip corners and
    // the two root corners of each tooth.
    const line = [];
    [0, slices].forEach(k => { for (let i = 0; i < n; i++) line.push(...pt(i, k), ...pt(i + 1, k)); });
    for (let tooth = 0; tooth < gr.z; tooth++) {
      [0, perTooth / 2 - 1, perTooth / 2, perTooth - 1].forEach(c => {
        const i = tooth * perTooth + c;
        for (let k = 0; k < slices; k++) line.push(...pt(i, k), ...pt(i, k + 1));
      });
    }
    const edges = new THREE.BufferGeometry();
    edges.setAttribute('position', new THREE.Float32BufferAttribute(line, 3));
    edges.rotateX(-Math.PI / 2);
    geo.userData.outline = edges;
    return geo;
  }

  // A pulley is a body of revolution, so its rotation is invisible: add a ring of dark through-holes
  // in the web (between hub and groove roots) that turn with it.
  function addWebHoles(mesh, pl) {
    const rin = pl.rHub, rout = pl.R - pl.depth, web = rout - rin;
    if (web < 10) return;
    const rh = Math.min(web * 0.32, rout * 0.22), rm = (rin + rout) / 2;
    const count = Math.max(3, Math.min(6, Math.round(2 * Math.PI * rm / (rh * 4.5))));
    const geo = new THREE.CylinderGeometry(rh, rh, pl.w + 1.2, 28);
    const dark = mat(COLORS.hole, { metalness: 0.2, roughness: 0.8 });
    for (let i = 0; i < count; i++) {
      const a = i / count * Math.PI * 2;
      const hole = new THREE.Mesh(geo, dark);
      hole.position.set(rm * Math.cos(a), 0, rm * Math.sin(a));
      mesh.add(hole);
    }
  }

  return { tube, helicalGear, addWebHoles };
}
