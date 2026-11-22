/* 2D views (Two.js): the side view of the shaft and the end view. onSelect(id) is called on a click. */

import { t } from './i18n.js';
import { $, colorOf, COLORS, opts, selected, visible } from './state.js';
import { pulleyProfile } from './model.js';
import { ARROW_2D, forceLook } from './arrows.js';

let two = null;

export function init2D(onSelect) {
  if (typeof Two === 'undefined') {
    $('#view2d').innerHTML = '<p style="padding:40px;color:#66727e">Two.js could not be loaded (check the internet connection).</p>';
    return;
  }
  two = new Two({ type: Two.Types.svg, width: 100, height: 100, autostart: false }).appendTo($('#view2d'));
  // a click on a component selects it; a click on the empty drawing clears the selection
  $('#view2d').addEventListener('click', e => {
    const hit = e.target.closest ? e.target.closest('[data-part]') : null;
    onSelect(hit ? hit.dataset.part : null);
  });
}

export function draw2D(g) {
  if (!two) return;
  const el = $('#view2d');
  const W = el.clientWidth, H = el.clientHeight;
  if (W < 50 || H < 50) return;
  two.renderer.setSize(W, H);
  two.width = W;
  two.height = H;
  two.clear();

  // `part` is the component being drawn; its shapes are tagged so a click on them selects it,
  // and the selected component is outlined in the selection colour
  let part = null;
  const tagged = [];
  const tag = shape => { if (part) tagged.push([shape, part]); return shape; };

  // ---- drawing helpers ----
  const style = (shape, fill, stroke, lw) => {
    shape.fill = fill || 'none';
    shape.stroke = stroke || COLORS.ink;
    shape.linewidth = lw == null ? 1.2 : lw;
    if (part && part === selected) { shape.stroke = COLORS.select; shape.linewidth += 1.6; }
    return tag(shape);
  };
  const line = (x1, y1, x2, y2, stroke, lw, dashes) => {
    const ln = two.makeLine(x1, y1, x2, y2);
    ln.stroke = stroke || COLORS.ink;
    ln.linewidth = lw || 1;
    if (dashes) ln.dashes = dashes;
    return tag(ln);
  };
  const poly = (pts, fill, stroke, lw, closed) => {
    const path = new Two.Path(pts.map(p => new Two.Anchor(p[0], p[1])), closed !== false, false);
    two.add(path);
    return style(path, fill, stroke, lw);
  };
  const text = (str, x, y, size, fill, italic, weight) => {
    const t = two.makeText(str, x, y);
    t.size = size || 12;
    t.fill = fill || COLORS.ink;
    t.family = 'system-ui, Segoe UI, sans-serif';
    if (italic) t.style = 'italic';
    if (weight) t.weight = weight;
    return tag(t);
  };
  const arrow = (x1, y1, x2, y2, color, lw) => {
    color = color || COLORS.force;
    line(x1, y1, x2, y2, color, lw || 2);
    const ang = Math.atan2(y2 - y1, x2 - x1), h = 9 + Math.max(0, (lw || 2) - 2) * 1.6;   // a thicker arrow has a bigger head
    poly([
      [x2, y2],
      [x2 - h * Math.cos(ang - 0.35), y2 - h * Math.sin(ang - 0.35)],
      [x2 - h * Math.cos(ang + 0.35), y2 - h * Math.sin(ang + 0.35)],
    ], color, color, 1);
  };

  // ---- layout: side view on the left, end view on the right ----
  const { pulley: pl, gear } = g;
  const sideW = W * 0.62, endW = W - sideW;
  const s = Math.min((sideW - 90) / g.len, (H - 130) / (g.Rmax + g.top), (endW - 70) / (pl.R * 3.5));
  const cy = H / 2 + 2 + (g.top - g.Rmax) * s / 2;
  const ox = 45 + ((sideW - 90) - g.len * s) / 2;
  const X = x => ox + (x - g.x0) * s;
  const Y = y => cy - y * s;
  const rectX = (xa, xb, r, fill, stroke, lw) =>
    style(two.makeRectangle((X(xa) + X(xb)) / 2, cy, (xb - xa) * s, 2 * r * s), fill, stroke, lw);

  line(sideW, 34, sideW, H - 12, COLORS.line, 1);

  // ===================== SIDE VIEW =====================
  if (visible.shaft) {
    part = 'shaft';
    rectX(g.x0, g.x1, g.d / 2, COLORS.steel);
    g.steps.forEach(st => rectX(st[0], st[1], st[2], COLORS.steel2));
  }

  // gear seen from the side: rectangle with slanted helix lines, centred at height yc
  const gearFace = (gr, yc, fill, col) => {
    const xl = gr.x - gr.w / 2;
    style(two.makeRectangle(X(gr.x), Y(yc), gr.w * s, 2 * gr.ra * s), fill, col, 1.4);
    const dy = gr.w * Math.tan(gr.beta);              // drop of a tooth line across the face
    const pitch = Math.max(Math.PI * gr.m, 4 / s);
    for (let y = -gr.ra + Math.min(dy, 0); y <= gr.ra + Math.max(dy, 0); y += pitch) {
      let t0 = 0, t1 = 1;                             // clip y - dy t to [-ra, ra]
      if (Math.abs(dy) > 1e-6) {
        const ta = (y - gr.ra) / dy, tb = (y + gr.ra) / dy;
        t0 = Math.max(0, Math.min(ta, tb));
        t1 = Math.min(1, Math.max(ta, tb));
      } else if (Math.abs(y) > gr.ra) continue;
      if (t1 - t0 > 0.02) {
        line(X(xl + t0 * gr.w), Y(yc + y - dy * t0), X(xl + t1 * gr.w), Y(yc + y - dy * t1), col, 0.8);
      }
    }
  };

  if (visible.gear) {
    part = 'gear';
    const xl = gear.x - gear.w / 2, xr = gear.x + gear.w / 2;
    gearFace(gear, 0, COLORS.fill.gear, colorOf.gear);
    [gear.r, -gear.r].forEach(r => line(X(xl) - 6, Y(r), X(xr) + 6, Y(r), COLORS.fill.pitch, 0.8, [8, 3, 2, 3]));
  }

  if (visible.pinion) {
    part = 'pinion';
    const pn = g.pinion, stub = 50, rs = pn.rf * 0.55;
    style(two.makeRectangle(X(pn.x - pn.w / 2 - stub / 2), Y(pn.yc), stub * s, 2 * rs * s), COLORS.steel, COLORS.ink, 1.2);
    gearFace(pn, pn.yc, COLORS.fill.pinion, colorOf.pinion);
    line(X(pn.x - pn.w / 2 - stub) - 8, Y(pn.yc), X(pn.x + pn.w / 2) + 10, Y(pn.yc), COLORS.ink, 0.7, [14, 4, 3, 4]);
    if (opts.labels) text(t('pinion'), X(pn.x + pn.w / 2) + 26, Y(pn.yc) + 4, 13, colorOf.pinion, false, 700);
  }

  if (visible.pulley) {
    part = 'pulley';
    const prof = pulleyProfile(pl);
    [1, -1].forEach(sgn => {
      poly(prof.map(p => [X(pl.x + p[1]), Y(sgn * p[0])]), COLORS.fill.pulleyHub, colorOf.pulley, 1.4);
    });
  }

  [['bearingA', g.bA], ['bearingC', g.bC]].forEach(([id, b]) => {
    if (!visible[id]) return;
    part = id;
    const col = colorOf[id];
    const xl = b.x - b.w / 2, xr = b.x + b.w / 2, cx = (X(xl) + X(xr)) / 2;
    [1, -1].forEach(sgn => {
      const band = (r1, r2, fill) =>
        style(two.makeRectangle(cx, Y(sgn * (r1 + r2) / 2), b.w * s, Math.abs(r2 - r1) * s), fill, col, 1.2);
      band(b.rIn, b.rOut, COLORS.paper);
      band(b.rOut - b.t, b.rOut, COLORS.ring);
      band(b.rIn, b.rIn + b.t, COLORS.ring);
      style(two.makeCircle(cx, Y(sgn * b.rMid), Math.min(b.rBall, b.w * 0.45) * s), COLORS.ball, col, 1.2);
    });
  });

  // centre line
  part = null;
  line(X(g.x0) - 18, cy, X(g.x1) + 18, cy, COLORS.ink, 0.8, [14, 4, 3, 4]);

  // labels
  if (opts.labels) {
    const lab = (id, str, x, r) => {
      part = id;
      if (visible[id]) text(str, X(x), Y(r) - 12, 15, colorOf[id], false, 700);
      part = null;
    };
    lab('bearingA', 'A', g.xA, g.bA.rOut);
    lab('bearingC', 'C', g.xC, g.bC.rOut);
    lab('pulley', 'D', g.xD, pl.R);
    part = 'gear';
    if (visible.gear) text('B', X(g.xB) + gear.w * s / 2 + 12, Y(gear.ra) + 6, 15, colorOf.gear, false, 700);

    part = null;
    // coordinate axes
    const ax = X(g.x0) - 26, ay = cy;
    arrow(ax, ay, ax, ay - 34, COLORS.ink, 1.2);
    text('y', ax - 9, ay - 30, 12, COLORS.ink, true);
    style(two.makeCircle(ax, ay, 5), COLORS.paper, COLORS.ink, 1.2);
    style(two.makeCircle(ax, ay, 1.4), COLORS.ink, COLORS.ink, 1);
    text('z', ax - 12, ay + 4, 12, COLORS.ink, true);
    arrow(X(g.x1) + 6, cy, X(g.x1) + 32, cy, COLORS.ink, 1.2);
    text('x', X(g.x1) + 30, cy + 14, 12, COLORS.ink, true);
  }

  // dimension chain A–B–C–D
  const yd = Math.min(Y(-g.Rmax) + 30, H - 22);
  const stations = [g.xA, g.xB, g.xC, g.xD];
  stations.forEach(x => line(X(x), cy, X(x), yd + 6, COLORS.muted, 0.7));
  for (let i = 0; i < 3; i++) {
    const xa = X(stations[i]), xb = X(stations[i + 1]);
    arrow((xa + xb) / 2, yd, xa, yd, COLORS.dim, 1);
    arrow((xa + xb) / 2, yd, xb, yd, COLORS.dim, 1);
    text((stations[i + 1] - stations[i]).toFixed(0) + ' mm', (xa + xb) / 2, yd + 13, 11.5, COLORS.dim);
  }

  // gear forces
  if (opts.forces && visible.gear) {
    // with the pinion shown the forces act at the pitch point of the mesh
    const pin = visible.pinion;
    const px = X(g.xB), py = Y(pin ? gear.r : gear.ra);
    const L = pin ? (g.pinion.yc + g.pinion.ra - gear.r) * s + 26 : 42;
    const La = pin ? Math.max(g.pinion.w, gear.w) * s / 2 + 34 : 54;
    const kr = forceLook(g.loads.Fr), ka = forceLook(g.loads.Fa), kt = forceLook(g.loads.Ft);
    const Lr = L * kr.long, Lax = La * ka.long;
    arrow(px, py - Lr, px, py, COLORS.force, ARROW_2D * kr.thick);
    text('Fr', px + 13, py - Lr + 4, 13, COLORS.force, true);
    arrow(px - Lax, py, px - 4, py, COLORS.force, ARROW_2D * ka.thick);
    text('Fa', px - Lax + 10, py - 10, 13, COLORS.force, true);
    style(two.makeCircle(px, py, 4 + 1.5 * kt.thick), COLORS.paper, COLORS.force, 1.6 * kt.thick);   // Ft: out of the page (+z)
    style(two.makeCircle(px, py, 1.2 + 0.4 * kt.thick), COLORS.force, COLORS.force, 1);
    text('Ft', px - 15, py - 14, 13, COLORS.force, true);
  }

  // ===================== END VIEW (looking along −x, z to the left) =====================
  const drv = visible.vbelt ? g.vbelt : null;                 // driven pulley of the V-belt drive, if shown
  // own scale, so a long centre distance does not shrink the side view
  const se = drv ? Math.min(s, (endW - 80) / (pl.R + drv.C + drv.R2)) : s;
  const R = pl.R * se;
  const ex = W - 35 - R, ey = cy;
  const BELT = COLORS.belt;
  const beltW = Math.max(2.5, pl.depth * 0.6 * se);
  const rp = (pl.R - pl.depth / 2) * se;                      // pitch radius the belt runs on
  let pulls = null;                                           // [[x, y, ux, uy] for F2 (top), same for F1 (bottom)]

  if (drv) {
    part = 'vbelt';
    // open belt: the two outer tangents between the pitch circles (screen x = ex − z, screen y = ey − y)
    const Cpx = drv.C * se, R2 = drv.R2 * se, rp2 = Math.max(2, (drv.R2 - pl.depth / 2) * se);
    const a = Math.asin(Math.max(-1, Math.min(1, (rp2 - rp) / Cpx))), ca = Math.cos(a), sa = Math.sin(a);
    const ex2 = ex - Cpx;
    const top = [ex + rp * sa, ey - rp * ca, ex2 + rp2 * sa, ey - rp2 * ca];
    const bot = [ex + rp * sa, ey + rp * ca, ex2 + rp2 * sa, ey + rp2 * ca];
    line(top[0], top[1], top[2], top[3], BELT, beltW);
    line(bot[0], bot[1], bot[2], bot[3], BELT, beltW);

    style(two.makeCircle(ex2, ey, R2), COLORS.fill.driven, colorOf.vbelt, 1.5);
    if ((drv.R2 - pl.depth) * se > 3) {
      const gr2 = two.makeCircle(ex2, ey, (drv.R2 - pl.depth) * se);
      style(gr2, 'none', colorOf.vbelt, 0.9);
      gr2.dashes = [5, 4];
    }
    style(two.makeCircle(ex2, ey, Math.max(2, Math.min(drv.R2 * 0.3, g.d / 2) * se)), COLORS.fill.drivenHub, colorOf.vbelt, 1.2);
    line(ex2 - R2 - 10, ey, ex2 + R2 + 10, ey, COLORS.ink, 0.7, [14, 4, 3, 4]);
    line(ex2, ey - R2 - 10, ex2, ey + R2 + 10, COLORS.ink, 0.7, [14, 4, 3, 4]);

    // centre distance
    const yd2 = Math.min(ey + Math.max(R, R2) + 22, H - 20);
    line(ex, ey, ex, yd2 + 6, COLORS.muted, 0.7);
    line(ex2, ey, ex2, yd2 + 6, COLORS.muted, 0.7);
    arrow((ex + ex2) / 2, yd2, ex, yd2, COLORS.dim, 1);
    arrow((ex + ex2) / 2, yd2, ex2, yd2, COLORS.dim, 1);
    text(drv.C.toFixed(0) + ' mm', (ex + ex2) / 2, yd2 + 13, 11.5, COLORS.dim);
    if (opts.labels) text(t('drivenPulley'), ex2, ey - R2 - 16, 12, colorOf.vbelt, false, 600);

    // force arrows sit on the belts, near the middle, pointing away from pulley D
    const anchor = b => {
      const len = Math.hypot(b[2] - b[0], b[3] - b[1]) || 1;
      return [b[0] + (b[2] - b[0]) * 0.45, b[1] + (b[3] - b[1]) * 0.45, (b[2] - b[0]) / len, (b[3] - b[1]) / len];
    };
    pulls = [anchor(top), anchor(bot)];
    part = null;
  } else if (visible.pulley) {
    // drive hidden: just two belt stubs leaving towards +z (left), slightly converging
    const conv = 0.12, beltLen = pl.R * 1.5 * se;
    const tx = Math.sin(conv) * rp, ty = Math.cos(conv) * rp;
    const bx = ex - beltLen, byTop = ey - ty + Math.tan(conv) * (beltLen - tx), byBot = ey + ty - Math.tan(conv) * (beltLen - tx);
    line(ex - tx, ey - ty, bx, byTop, BELT, beltW);
    line(ex - tx, ey + ty, bx, byBot, BELT, beltW);
    pulls = [[bx, byTop, -Math.cos(conv), Math.sin(conv)], [bx, byBot, -Math.cos(conv), -Math.sin(conv)]];
  }

  if (visible.pulley) {
    part = 'pulley';
    style(two.makeCircle(ex, ey, R), COLORS.fill.pulley, colorOf.pulley, 1.5);
    const gr = two.makeCircle(ex, ey, (pl.R - pl.depth) * se);
    style(gr, 'none', colorOf.pulley, 0.9);
    gr.dashes = [5, 4];
    style(two.makeCircle(ex, ey, pl.rHub * se), COLORS.fill.pulleyHub, colorOf.pulley, 1.2);

    if (opts.labels) {
      text(t('pulleyD'), ex - R * 0.72 - 8, ey - R - 2, 12, colorOf.pulley, false, 600);
      // rotation arrow
      const ra = R * 0.72, arc = [];
      for (let a = -0.15; a <= 0.5; a += 0.05) arc.push([ex + ra * Math.cos(a), ey - ra * Math.sin(a)]);
      poly(arc, 'none', COLORS.ink, 1.2, false);
      const n = arc.length;
      arrow(arc[n - 2][0], arc[n - 2][1], arc[n - 1][0], arc[n - 1][1], COLORS.ink, 1.2);
    }
  }
  part = null;
  if (opts.forces && pulls && visible.pulley) {
    const [f2, f1] = pulls, k1 = forceLook(g.loads.F1), k2 = forceLook(g.loads.F2);
    const L2 = 40 * k2.long, L1 = 40 * k1.long;
    arrow(f2[0], f2[1], f2[0] + f2[2] * L2, f2[1] + f2[3] * L2, COLORS.force, ARROW_2D * k2.thick);
    text('F2', f2[0] + f2[2] * L2 * 0.5, f2[1] + f2[3] * L2 * 0.5 - 13, 13, COLORS.force, true);
    arrow(f1[0], f1[1], f1[0] + f1[2] * L1, f1[1] + f1[3] * L1, COLORS.force, ARROW_2D * k1.thick);
    text('F1', f1[0] + f1[2] * L1 * 0.5, f1[1] + f1[3] * L1 * 0.5 + 17, 13, COLORS.force, true);
  }
  if (visible.shaft) {
    part = 'shaft';
    style(two.makeCircle(ex, ey, g.d / 2 * se), COLORS.steel3, COLORS.ink, 1.2);
    const k = g.d * 0.13 * se;                                   // key
    style(two.makeRectangle(ex, ey + g.d / 2 * se, 2 * k, 2 * k), COLORS.paper, COLORS.ink, 1);
  }
  part = null;
  line(ex - R - 14, ey, ex + R + 14, ey, COLORS.ink, 0.7, [14, 4, 3, 4]);
  line(ex, ey - R - 14, ex, ey + R + 14, COLORS.ink, 0.7, [14, 4, 3, 4]);
  if (opts.labels) {
    arrow(ex, ey - R - 8, ex, ey - R - 30, COLORS.ink, 1.2);
    text('y', ex + 10, ey - R - 24, 12, COLORS.ink, true);
    text('z', ex - R - 20, ey + 14, 12, COLORS.ink, true);
  }

  two.update();
  // the SVG elements exist now: mark each with its component so a click can find it
  tagged.forEach(([shape, id]) => {
    const elem = shape._renderer && shape._renderer.elem;
    if (elem) { elem.dataset.part = id; elem.style.cursor = 'pointer'; }
  });
}
