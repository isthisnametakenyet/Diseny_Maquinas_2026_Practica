/* Table and chart images (taken from the T08 / T09 slides) and how to point at a value on them.
 *
 * TABLES[id] describes one image: where each row and column sits, in image pixels.
 * TableFigure.render(id, picks) returns an SVG showing the image with the value marked the way you would
 * read it by hand: the row label and the column heading are highlighted, a red arrow runs from each of
 * them to the value, and the value gets a red box. Arrows are straight; one only curves when another
 * red-boxed value is in its way.
 *
 *   grid tables:  picks = [{ row: <row key>, col: <column key> }, ...]
 *   charts:       picks = [{ x: <x value>, y: <y value> }]        (axis units of the chart)
 *   no picks      → the plain image, with no marks
 */
(function (root) {
  'use strict';

  const seq = (keys, start, step) => Object.fromEntries(keys.map((k, i) => [k, start + step * i]));
  const J_TEETH = [12, 14, 17, 21, 26, 35, 55, 135];
  const MATERIALS = ['steel', 'malleableIron', 'nodularIron', 'castIron', 'aluminumBronze', 'tinBronze'];
  const MODULES = [0.3, 0.4, 0.5, 0.8, 1, 1.25, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 25];

  // J tables: one row per gear tooth count, two columns (P, G) per pinion tooth count → keys '21P', '21G'
  const jCols = (x0, dx) => {
    const cols = {};
    J_TEETH.forEach((n, k) => { cols[n + 'P'] = x0 + dx * 2 * k; cols[n + 'G'] = x0 + dx * (2 * k + 1); });
    return cols;
  };
  const jSpur = (src, title) => ({
    src, title, w: 1124, h: 443,
    rows: seq(J_TEETH, 200, 31), cols: jCols(150, 62.5),
    rowLabel: { x: 67, w: 44 }, colHead: { y: 161, h: 24, w: 32 }, cell: { w: 52, h: 25 },
  });

  const TABLES = {
    Ka: {
      src: 'tables/table-8-17-Ka.png', title: 'Tabla 8-17, T08 p. 44', w: 1068, h: 373,
      rows: { uniform: 184, lightShock: 251, mediumShock: 319 },
      cols: { uniform: 473, moderateShock: 693, heavyShock: 862 },
      rowLabel: { x: 188, w: 292 }, colHead: { y: 126, h: 30, w: 150 }, cell: { w: 74, h: 30 },
    },
    Km: {
      src: 'tables/table-T8-45-Km.png', title: 'Factores Km, T08 p. 45', w: 507, h: 466,
      rows: { 50: 244, 150: 303, 250: 363, 500: 422 },
      cols: { Km: 375 },
      rowLabel: { x: 145, w: 176 }, colHead: { y: 145, h: 44, w: 70 }, cell: { w: 70, h: 40 },
    },
    KR: {
      src: 'tables/table-T8-59-KR.png', title: 'Factor KR, T08 p. 59', w: 375, h: 356,
      rows: { 90: 180, 99: 224, 99.9: 268, 99.99: 311 },
      cols: { KR: 318 },
      rowLabel: { x: 138, w: 84 }, colHead: { y: 105, h: 32, w: 60 }, cell: { w: 66, h: 30 },
    },
    minTeeth: {
      src: 'tables/table-T8-27-min-teeth-rack.png', title: 'Número mínimo de dientes, T08 p. 27', w: 339, h: 414,
      rows: { 14.5: 287, 20: 330, 25: 373 },
      cols: { N: 238 },
      rowLabel: { x: 90, w: 64 }, colHead: { y: 208, h: 88, w: 112 }, cell: { w: 54, h: 30 },
    },
    modules: {
      src: 'tables/table-T8-23-standard-modules.png', title: 'Módulos métricos estándares, T08 p. 23', w: 294, h: 773,
      rows: seq(MODULES, 141, 35.35),
      cols: { m: 73 },
      colHead: { y: 75, h: 66, w: 62 }, cell: { w: 62, h: 27 },
    },
    Cp: {
      src: 'tables/table-8-18-Cp.jpg', title: 'Tabla 8-18, T08 p. 52', w: 1072, h: 768,
      rows: seq(MATERIALS, 259, 74.7), cols: seq(MATERIALS, 342, 132),
      rowLabel: { x: 82, w: 124 }, colHead: { y: 185, h: 58, w: 112 }, cell: { w: 98, h: 60 },
    },
    spur20tip:   jSpur('tables/table-8-8-J-spur-20-tip.png',    'Tabla 8-8, T08 p. 40'),
    spur20hpstc: jSpur('tables/table-8-9-J-spur-20-hpstc.png',  'Tabla 8-9, T08 p. 41'),
    spur25tip:   jSpur('tables/table-8-12-J-spur-25-tip.png',   'Tabla 8-12, T08 p. 42'),
    spur25hpstc: jSpur('tables/table-8-13-J-spur-25-hpstc.png', 'Tabla 8-13, T08 p. 43'),
    helical25psi20tip: {
      src: 'tables/table-9-5-J-helical-25-psi20-tip.jpg', title: 'Tabla 9-5, T09 p. 14', w: 1285, h: 522,
      rows: seq(J_TEETH, 238, 35.1), cols: jCols(178, 70.93),
      rowLabel: { x: 83, w: 48 }, colHead: { y: 196, h: 26, w: 36 }, cell: { w: 58, h: 27 },
    },
    // chart: Kv against pitch-line velocity (top axis ft/min; the m/s axis below it is the same scale)
    Kv: {
      src: 'charts/chart-T8-46-Kv.png', title: 'Factor dinámico Kv, T08 p. 46', w: 1048, h: 597,
      plot: { x0: 93, x1: 1013, xmin: 0, xmax: 10000, y0: 425, y1: 13, ymin: 0.4, ymax: 1.0 },
    },

    // life factor charts: both axes are logarithmic
    KL: {
      src: 'charts/chart-T8-58-KL.jpg', title: 'Factor de vida KL, T08 p. 58', w: 1301, h: 719,
      plot: { x0: 246, x1: 1229, xmin: 1e2, xmax: 1e10, xlog: true, y0: 611, y1: 22, ymin: 0.5, ymax: 5, ylog: true },
    },
    CL: {
      src: 'charts/chart-T8-62-CL.jpg', title: 'Factor de vida CL, T08 p. 62', w: 1468, h: 594,
      plot: { x0: 172, x1: 1385, xmin: 1e2, xmax: 1e10, xlog: true, y0: 457, y1: 18, ymin: 0.5, ymax: 2, ylog: true },
    },

    // ---- V-belts (T12) ----
    vbeltKs: {
      src: 'tables/table-T12-13-vbelt-Ks.png', title: 'Factor de servicio Ks, T12 p. 13', w: 706, h: 260,
      rows: { uniform: 125, lightShock: 160, mediumShock: 191, heavyShock: 222 },
      cols: { normalTorque: 340, highTorque: 578 },
      rowLabel: { x: 88, w: 144 }, colHead: { y: 78, h: 44, w: 190 }, cell: { w: 96, h: 24 },
    },
    vbeltSections: {
      src: 'tables/table-T12-5-vbelt-sections.png', title: 'Secciones de bandas en V, T12 p. 5', w: 1078, h: 392,
      rows: { A: 155, B: 204, C: 253, D: 300, E: 351 },
      cols: { a: 219, b: 399, dMin: 638, hp: 923 }, colWidth: { hp: 190, dMin: 90 },
      rowLabel: { x: 70, w: 44 }, cell: { w: 70, h: 40 },
    },
    vbeltLengths: {
      src: 'tables/table-T12-6-vbelt-circumferences.jpg', title: 'Circunferencias interiores, T12 p. 6', w: 821, h: 356,
      rows: { A: [78, 50], B: [149, 74], C: [220, 50], D: [278, 50], E: [324, 26] },
      rowBand: { x0: 8, x1: 813 },
    },
    vbeltPower: {
      src: 'tables/table-T12-10-vbelt-power.png', title: 'Potencias nominales de bandas en V, T12 p. 10', w: 541, h: 728,
      rows: (() => {
        const ys = { A: [78, 94, 111, 128, 145, 162, 180], B: [200, 217, 233, 250, 267, 284, 301, 319],
                     C: [339, 356, 372, 389, 406, 423, 442], D: [461, 478, 495, 511, 528, 545, 562, 581],
                     E: [600, 617, 634, 650, 667, 684, 703] };
        const dia = { A: [2.6, 3.0, 3.4, 3.8, 4.2, 4.6, 5.0], B: [4.2, 4.6, 5.0, 5.4, 5.8, 6.2, 6.6, 7.0],
                      C: [6, 7, 8, 9, 10, 11, 12], D: [10, 11, 12, 13, 14, 15, 16, 17], E: [16, 18, 20, 22, 24, 26, 28] };
        const out = {};
        Object.keys(ys).forEach(k => ys[k].forEach((y, i) => { out[k + ':' + dia[k][i].toFixed(1)] = y; }));
        return out;
      })(),
      cols: { 1000: 241, 2000: 309, 3000: 378, 4000: 445, 5000: 510 },
      rowLabel: { x: 122, w: 36 }, colHead: { y: 52, h: 18, w: 52 }, cell: { w: 44, h: 16 },
    },
    vbeltK1: {
      src: 'tables/table-T12-11-vbelt-K1.png', title: 'Factor K1, T12 p. 11', w: 446, h: 517,
      rows: (() => { const o = {}; for (let i = 0; i <= 15; i++) o[(i / 10).toFixed(1)] = 87 + 26.75 * i; return o; })(),
      cols: { theta: 149, VV: 262, flat: 380 },
      rowLabel: { x: 34, w: 44 }, colHead: { y: 52, h: 26, w: 56 }, cell: { w: 48, h: 20 },
    },
    vbeltK2: {
      src: 'tables/table-T12-12-vbelt-K2.png', title: 'Factor K2, T12 p. 12', w: 684, h: 299,
      rows: { '0.85': 82, '0.90': 109, '0.95': 136, '1.00': 162, '1.05': 189, '1.10': 216, '1.15': 245, '1.20': 271 },
      cols: { A: 202, B: 309, C: 415, D: 522, E: 620 },
      rowLabel: { x: 54, w: 46 }, colHead: { y: 52, h: 22, w: 86 }, cell: { w: 98, h: 22 },
    },
    vbeltKc: {
      src: 'tables/table-T12-15-vbelt-Kb-Kc.png', title: 'Parámetros Kb y Kc, T12 p. 15', w: 435, h: 352,
      rows: { A: 90, B: 123, C: 155, D: 188, E: 220, '3V': 253, '5V': 285, '8V': 319 },
      cols: { Kb: 250, Kc: 385 },
      rowLabel: { x: 33, w: 40 }, colHead: { y: 50, h: 30, w: 50 }, cell: { w: 74, h: 24 },
    },

    // images kept for reference only (nothing is read from them automatically yet)
    timingPitch:       { src: 'tables/table-T12-20-timing-belt-pitch.png', title: 'Pasos de bandas dentadas, T12 p. 20', w: 538, h: 239 },
    ansiChains:        { src: 'tables/table-T10-11-ansi-chains.png', title: 'Cadenas ANSI, T10 p. 11', w: 753, h: 827 },
    sprocketTeeth:     { src: 'tables/table-T10-16-sprocket-teeth.png', title: 'Dientes de catarina disponibles, T10 p. 16', w: 1113, h: 529 },
    chainPowerSmall:   { src: 'tables/table-T10-20-chain-power-25-60.jpg', title: 'Potencia de cadenas 25–60, T10 p. 20', w: 828, h: 804 },
    chainPowerLarge:   { src: 'tables/table-T10-20-chain-power-80-240.jpg', title: 'Potencia de cadenas 80–240, T10 p. 20', w: 820, h: 857 },
    chainK1:           { src: 'tables/table-T10-21-chain-K1.png', title: 'Factor K1 de cadenas, T10 p. 21', w: 594, h: 479 },
    chainK2:           { src: 'tables/table-T10-21-chain-K2.png', title: 'Factor K2 de cadenas, T10 p. 21', w: 350, h: 292 },
    chainKs:           { src: 'tables/table-7-8-chain-Ks.jpg', title: 'Tabla 7.8, T10 p. 22', w: 954, h: 639 },
    beltTypes:         { src: 'tables/table-T11-7-belt-types.jpg', title: 'Tipos de bandas, T11 p. 7', w: 1239, h: 582 },
    flatBeltMaterials: { src: 'tables/table-T11-26-flat-belt-materials.jpg', title: 'Materiales de bandas planas, T11 p. 26', w: 1162, h: 831 },
    flatBeltCp:        { src: 'tables/table-T11-29-flat-belt-Cp.png', title: 'Factor Cp de bandas planas, T11 p. 29', w: 1115, h: 399 },
    flatBeltCv:        { src: 'charts/chart-T11-30-flat-belt-Cv.jpg', title: 'Factor Cv de bandas de cuero, T11 p. 30', w: 760, h: 435 },
    toothProportions:  { src: 'tables/table-8-1-tooth-proportions.png', title: 'Tabla 8-1, T08 p. 24', w: 809, h: 443 },
    diametralPitches:  { src: 'tables/table-T8-23-standard-diametral-pitches.png', title: 'Pasos diametrales estándares, T08 p. 23', w: 336, h: 778 },
    maxGearTeeth:      { src: 'tables/table-T8-27-max-gear-teeth.png', title: 'Dientes máximos del engrane, T08 p. 27', w: 338, h: 544 },
    Sfb:               { src: 'tables/table-8-20-Sfb.jpg', title: 'Tabla 8-20, T08 p. 57', w: 693, h: 627 },
    Sfc:               { src: 'tables/table-8-21-Sfc.jpg', title: 'Tabla 8-21, T08 p. 61', w: 675, h: 640 },
    CH:                { src: 'tables/table-T8-63-CH.png', title: 'Factor CH, T08 p. 63', w: 932, h: 131 },
    bevelJ:            { src: 'charts/chart-T9-22-J-bevel.jpg', title: 'Factor J cónicos, T09 p. 22', w: 991, h: 801 },
    bevelI:            { src: 'charts/chart-9-7-I-bevel.jpg', title: 'Figura 9-7, T09 p. 23', w: 1134, h: 590 },
  };

  const RED = '#b5463c';
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const n1 = v => Math.round(v * 10) / 10;
  let uid = 0;

  function render(id, picks, label) {
    const T = TABLES[id];
    if (!T) return '';
    picks = (picks || []).filter(Boolean);
    const lw = Math.max(2.5, T.w / 320);            // stroke width scaled to the image
    const marker = 'tf-arrow-' + (++uid);
    const arrow = d => `<path d="${d}" class="tf-trace" marker-end="url(#${marker})"/>`;
    let marks = '';

    // ---- pass 1: where every marked value sits ----
    const cells = [];                               // { x, y, left, top, w, h } of each red box
    picks.forEach(p => {
      if (T.plot && p.x != null) {
        // chart: go up from the x axis to the curve, then across to the y axis
        const pl = T.plot;
        // position along an axis, 0 to 1; logarithmic axes when the chart says so
        const along = (v, lo, hi, log) => {
          const c = Math.min(hi, Math.max(lo, v));
          return log ? (Math.log10(c) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo)) : (c - lo) / (hi - lo);
        };
        const cx = pl.x0 + along(p.x, pl.xmin, pl.xmax, pl.xlog) * (pl.x1 - pl.x0);
        const cy = pl.y0 + along(p.y, pl.ymin, pl.ymax, pl.ylog) * (pl.y1 - pl.y0);
        marks += arrow(`M${n1(cx)},${pl.y0} V${n1(cy + 9)}`) + arrow(`M${n1(cx - 9)},${n1(cy)} H${pl.x0 + 6}`)
               + `<circle cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(lw * 2.6)}" class="tf-dot"/>`;
        return;
      }
      if (!T.rows) return;
      const r = T.rows[p.row];
      if (r == null) return;
      const y = Array.isArray(r) ? r[0] : r, h = Array.isArray(r) ? r[1] : T.cell.h;
      if (p.col == null) {
        // whole row picked (lists with no single cell to point at)
        if (T.rowBand) marks += `<rect x="${T.rowBand.x0}" y="${n1(y - h / 2)}" width="${T.rowBand.x1 - T.rowBand.x0}" height="${h}" rx="6" class="tf-cell"/>`;
        return;
      }
      const x = T.cols ? T.cols[p.col] : null;
      if (x == null) return;
      const w = (T.colWidth && T.colWidth[p.col]) || T.cell.w;
      cells.push({ x, y, w, h, left: x - w / 2, top: y - h / 2 });
    });

    // ---- pass 2: highlights and arrows ----
    // An arrow goes straight from the row label / column heading to its value (it may cross ordinary values).
    // Only when another marked value lies in its way does it curve round that red box.
    const pad = Math.max(12, lw * 5);               // clearance kept from a red box when going round it
    const rad = pad * 0.5;                          // corner radius of the detour
    const hitsH = (yy, xa, xb, self) => cells.some(b => b !== self && yy > b.top - 1 && yy < b.top + b.h + 1 && b.left < Math.max(xa, xb) && b.left + b.w > Math.min(xa, xb));
    const hitsV = (xx, ya, yb, self) => cells.some(b => b !== self && xx > b.left - 1 && xx < b.left + b.w + 1 && b.top < Math.max(ya, yb) && b.top + b.h > Math.min(ya, yb));
    const done = { row: {}, col: {} };              // label / heading highlights already drawn

    cells.forEach(c => {
      // row: highlighted label + arrow to the value
      if (T.rowLabel) {
        const rl = T.rowLabel, rx = rl.x - rl.w / 2, sx = rx + rl.w;
        if (!done.row[c.top]) {
          done.row[c.top] = true;
          marks += `<rect x="${n1(rx)}" y="${n1(c.top)}" width="${rl.w}" height="${c.h}" rx="5" class="tf-head"/>`;
        }
        const blockers = cells.filter(b => b !== c && c.y > b.top && c.y < b.top + b.h && b.left < c.left && b.left + b.w > sx);
        if (!blockers.length) {
          marks += arrow(`M${n1(sx)},${n1(c.y)} H${n1(c.left - 5)}`);
        } else {
          // leave the row before the first red box, pass above or below it, and come into the value from that side
          const xt = Math.max(sx + rad + 1, Math.min(...blockers.map(b => b.left)) - pad);
          const xe = c.x - c.w / 4;
          const level = dir => (dir > 0 ? c.top + c.h + pad : c.top - pad);
          const dir = !hitsH(level(1), xt, xe, c) ? 1 : !hitsH(level(-1), xt, xe, c) ? -1 : 1;
          const yd = level(dir), edge = dir > 0 ? c.top + c.h : c.top;
          marks += arrow(`M${n1(sx)},${n1(c.y)} H${n1(xt - rad)} Q${n1(xt)},${n1(c.y)} ${n1(xt)},${n1(c.y + dir * rad)}`
                       + ` V${n1(yd - dir * rad)} Q${n1(xt)},${n1(yd)} ${n1(xt + rad)},${n1(yd)}`
                       + ` H${n1(xe - rad)} Q${n1(xe)},${n1(yd)} ${n1(xe)},${n1(yd - dir * rad)} V${n1(edge + dir * 3)}`);
        }
      }
      // column: highlighted heading + arrow to the value
      if (T.colHead) {
        const ch = T.colHead, cw = ch.w || c.w, hy = ch.y - ch.h / 2, hb = hy + ch.h;
        if (!done.col[c.x]) {
          done.col[c.x] = true;
          marks += `<rect x="${n1(c.x - cw / 2)}" y="${n1(hy)}" width="${cw}" height="${ch.h}" rx="5" class="tf-head"/>`;
        }
        const blockers = cells.filter(b => b !== c && c.x > b.left && c.x < b.left + b.w && b.top < c.top && b.top + b.h > hb);
        if (!blockers.length) {
          marks += arrow(`M${n1(c.x)},${n1(hb)} V${n1(c.top - 5)}`);
        } else {
          // leave the column before the first red box, pass beside it, and come into the value from that side
          const yt = Math.max(hb + rad + 1, Math.min(...blockers.map(b => b.top)) - pad);
          const lane = side => (side > 0 ? c.left + c.w + pad : c.left - pad);
          const ok = side => lane(side) > 3 && lane(side) < T.w - 3 && !hitsV(lane(side), yt, c.y, c);
          const side = ok(1) ? 1 : ok(-1) ? -1 : 1;
          const xd = lane(side), edge = side > 0 ? c.left + c.w : c.left;
          marks += arrow(`M${n1(c.x)},${n1(hb)} V${n1(yt - rad)} Q${n1(c.x)},${n1(yt)} ${n1(c.x + side * rad)},${n1(yt)}`
                       + ` H${n1(xd - side * rad)} Q${n1(xd)},${n1(yt)} ${n1(xd)},${n1(yt + rad)}`
                       + ` V${n1(c.y - rad)} Q${n1(xd)},${n1(c.y)} ${n1(xd - side * rad)},${n1(c.y)} H${n1(edge + side * 3)}`);
        }
      }
    });
    // red box round each value, drawn last so it sits on top of the arrows
    cells.forEach(c => {
      marks += `<rect x="${n1(c.left)}" y="${n1(c.top)}" width="${c.w}" height="${c.h}" rx="6" class="tf-cell"/>`;
    });

    return `<figure class="lookup">
      <svg viewBox="0 0 ${T.w} ${T.h}" style="max-width:${T.w}px" role="img" aria-label="${esc(T.title)}${label ? ': ' + esc(label) : ''}">
        <defs><marker id="${marker}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="${RED}"/></marker></defs>
        <rect width="${T.w}" height="${T.h}" fill="#ffffff"/>
        <image href="${T.src}" width="${T.w}" height="${T.h}"/>
        <g style="--tf-lw:${n1(lw)}px">${marks}</g>
      </svg>
      <figcaption>${esc(T.title)}</figcaption>
    </figure>`;
  }

  root.TABLES = TABLES;
  root.TableFigure = { render };
})(typeof globalThis !== 'undefined' ? globalThis : this);
