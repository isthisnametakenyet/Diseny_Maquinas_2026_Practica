/* The design checks: every rule the design has to meet, whether it is met now, and for each free
 * variable the range of values in which the rules it affects are met (painted on its slider).
 */

import { T, t } from './i18n.js';
import { ICON } from './schema.js';
import { $, anyLocked, COLORS, inputs, locked, P } from './state.js';
import { derive, minPinionTeeth, nf, seatRadius, shaftAnalysis, vbeltDesign, widestGear } from './model.js';
import { copyButton, latexOf, linkSymbols, stackFractions, substituteSymbols, SYM_IN, toLatex } from './mathtext.js';

// Every rule the design has to meet: [id, test, detail].
//   test(g, v)   → true when the rule is met for the current inputs
//   detail(g, v) → { f: the condition as a formula, s: the same with the current numbers } for the Calculations tab
const CHECKS = [
  ['shoulder', () => P.shaft.ds > P.shaft.d,
    () => ({ f: 'd<sub>s</sub> > d', s: `${P.shaft.ds} mm > ${P.shaft.d} mm` })],
  ['bearingA', () => P.bearingA.D >= P.shaft.d + 16,
    () => ({ f: 'D<sub>A</sub> ≥ d + 16 mm', s: `${P.bearingA.D} mm ≥ ${P.shaft.d} + 16 = ${P.shaft.d + 16} mm` })],
  ['bearingC', () => P.bearingC.D >= P.shaft.d + 16,
    () => ({ f: 'D<sub>C</sub> ≥ d + 16 mm', s: `${P.bearingC.D} mm ≥ ${P.shaft.d} + 16 = ${P.shaft.d + 16} mm` })],
  ['rim', g => g.gear.rf - seatRadius() >= 1.2 * 2.25 * g.gear.m,
    g => ({ f: 't<sub>R</sub> ≥ 1.2 × h<sub>t</sub> ,  t<sub>R</sub> = r<sub>f</sub> − r<sub>seat</sub> ,  h<sub>t</sub> = 2.25 × m',
            s: `${nf(g.gear.rf)} − ${nf(seatRadius())} = ${nf(g.gear.rf - seatRadius())} mm ≥ 1.2 × ${nf(2.25 * g.gear.m, 2)} = ${nf(2.7 * g.gear.m, 2)} mm` })],
  ['face', g => P.gear.w >= 8 * g.gear.m && P.gear.w <= 16 * g.gear.m,
    g => ({ f: '8 × m ≤ F ≤ 16 × m', s: `${nf(8 * g.gear.m)} mm ≤ ${P.gear.w} mm ≤ ${nf(16 * g.gear.m)} mm` })],
  ['minTeeth', () => P.pinion.z >= minPinionTeeth(),
    () => ({ f: 'z<sub>p</sub> ≥ N<sub>min</sub>', s: `${P.pinion.z} ≥ ${minPinionTeeth()}` })],
  ['motor', () => Math.abs(P.drive.n * P.gear.z / P.pinion.z - P.given.motor) / P.given.motor <= 0.02,
    () => {
      const np = P.drive.n * P.gear.z / P.pinion.z, M = P.given.motor;
      return { f: '| n × z<sub>B</sub> / z<sub>p</sub> − n<sub>motor</sub> | / n<sub>motor</sub> ≤ 2 %',
               s: `${P.drive.n} × ${P.gear.z} / ${P.pinion.z} = ${nf(np, 0)} rpm ,  | ${nf(np, 0)} − ${M} | / ${M} = ${nf(Math.abs(np - M) / M * 100, 1)} %` };
    }],
  ['pinionW', () => P.pinion.w >= P.gear.w,
    () => ({ f: 'w<sub>p</sub> ≥ w<sub>B</sub>', s: `${P.pinion.w} mm ≥ ${P.gear.w} mm` })],
  ['roomAB', () => P.bearingA.w / 2 + widestGear() / 2 + 2 <= P.layout.ab,
    () => ({ f: 'w<sub>A</sub> / 2 + max(w<sub>B</sub>, w<sub>p</sub>) / 2 + 2 ≤ AB',
             s: `${nf(P.bearingA.w / 2)} + ${nf(widestGear() / 2)} + 2 = ${nf(P.bearingA.w / 2 + widestGear() / 2 + 2)} mm ≤ ${P.layout.ab} mm` })],
  ['roomBC', () => widestGear() / 2 + P.bearingC.w / 2 + 2 <= P.layout.bc,
    () => ({ f: 'max(w<sub>B</sub>, w<sub>p</sub>) / 2 + w<sub>C</sub> / 2 + 2 ≤ BC',
             s: `${nf(widestGear() / 2)} + ${nf(P.bearingC.w / 2)} + 2 = ${nf(widestGear() / 2 + P.bearingC.w / 2 + 2)} mm ≤ ${P.layout.bc} mm` })],
  ['roomCD', () => P.bearingC.w / 2 + P.pulley.w / 2 + 2 <= P.layout.cd,
    () => ({ f: 'w<sub>C</sub> / 2 + w<sub>D</sub> / 2 + 2 ≤ CD',
             s: `${nf(P.bearingC.w / 2)} + ${nf(P.pulley.w / 2)} + 2 = ${nf(P.bearingC.w / 2 + P.pulley.w / 2 + 2)} mm ≤ ${P.layout.cd} mm` })],
  ['groove', (g, v) => P.pulley.depth >= v.S.b * 25.4 && P.pulley.D / 2 - P.pulley.depth >= g.pulley.rHub + 5,
    (g, v) => ({ f: `depth ≥ b<sub>${v.sec}</sub> ,  D / 2 − depth ≥ r<sub>hub</sub> + 5`,
                 s: `${P.pulley.depth} mm ≥ ${nf(v.S.b * 25.4)} mm ,  ${nf(P.pulley.D / 2 - P.pulley.depth)} mm ≥ ${nf(g.pulley.rHub + 5)} mm` })],
  ['pitch', (g, v) => P.pulley.w / P.pulley.n >= v.S.a * 25.4 + 3,
    (g, v) => ({ f: `w<sub>D</sub> / grooves ≥ a<sub>${v.sec}</sub> + 3`,
                 s: `${P.pulley.w} / ${P.pulley.n} = ${nf(P.pulley.w / P.pulley.n)} mm ≥ ${nf(v.S.a * 25.4)} + 3 = ${nf(v.S.a * 25.4 + 3)} mm` })],
  ['dmin', (g, v) => v.small >= v.S.dMin,
    (g, v) => ({ f: `d<sub>small</sub> ≥ d<sub>min, ${v.sec}</sub>`, s: `${nf(v.small * 25.4)} mm ≥ ${nf(v.S.dMin * 25.4)} mm` })],
  ['speed', (g, v) => v.V <= 5000,
    (g, v) => ({ f: 'V = π × d × n / 12 ≤ 5000 ft/min', s: `${nf(v.V, 0)} ft/min  (${nf(v.V * 0.00508, 1)} m/s) ≤ 5000 ft/min` })],
  ['centre', (g, v) => EQ.vBeltCenterDistanceOk(P.vbelt.C / 25.4, v.big, v.small),
    (g, v) => ({ f: 'D < C < 3 (D + d)',
                 s: `${nf(v.big * 25.4)} mm < ${P.vbelt.C} mm < 3 × (${nf(v.big * 25.4)} + ${nf(v.small * 25.4)}) = ${nf(3 * (v.big + v.small) * 25.4)} mm` })],
  ['fatigue', g => shaftAnalysis(g).Nf >= P.given.nf,
    g => { const a = shaftAnalysis(g);
           return { f: 'N<sub>f</sub> = 1 / (σ′<sub>a</sub> / S<sub>e</sub> + σ′<sub>m</sub> / S<sub>ut</sub>) ≥ N<sub>f, min</sub>',
                    s: a.sections.map(x => `${x.id}: ${nf(x.Nf, 2)}`).join(' ,  ') + ` ,  min = ${nf(a.Nf, 2)} ≥ ${P.given.nf}` }; }],
  ['peak', g => shaftAnalysis(g).Ny >= P.given.npeak,
    g => { const a = shaftAnalysis(g);
           return { f: 'N<sub>pic</sub> = S<sub>y</sub> / σ′<sub>max</sub> ≥ N<sub>pic, min</sub>',
                    s: a.sections.map(x => `${x.id}: ${nf(x.Ny, 2)}`).join(' ,  ') + ` ,  min = ${nf(a.Ny, 2)} ≥ ${P.given.npeak}` }; }],
  ['belts', (g, v) => v.Nb != null && v.Nb <= P.pulley.n,
    (g, v) => ({ f: 'N<sub>b</sub> ≤ grooves', s: v.Nb != null ? `${v.Nb} ≤ ${P.pulley.n}` : t('ptNone') })],
];

// The checks as worked items for the Calculations tab; each has id="check-<id>" so the list can jump to it.
export function checksHtml(g) {
  let v;
  try { v = vbeltDesign(); } catch (e) { return ''; }
  // values of the calculated symbols the check formulas use
  const calc = { m: g.gear.m, 'm_t': g.gear.m, 'r_f': g.gear.rf, 'r_seat': seatRadius(),
                 't_R': g.gear.rf - seatRadius(), 'h_t': 2.25 * g.gear.m, 'N_min': minPinionTeeth() };
  const items = CHECKS.map(c => {
    let ok = false, d = { f: '', s: '' };
    try { ok = !!c[1](g, v); d = c[2](g, v); } catch (e) { /* shown as not met */ }
    const known = d.f ? substituteSymbols(d.f, SYM_IN[c[0]], calc) : null;   // the formula with its numbers
    latexOf['check-' + c[0]] = [d.f, known, d.s].filter(Boolean).map(toLatex).join(' \\;\\Rightarrow\\; ');
    return `
    <div class="calc-step calc-check ${ok ? 'ok' : 'bad'}" id="check-${c[0]}">
      <div class="num">${ok ? '✓' : '✗'}</div>
      <h3>${t('k.' + c[0])}</h3>
      ${copyButton('check-' + c[0])}
      <div class="formula">${stackFractions(linkSymbols(d.f, SYM_IN[c[0]]))}</div>
      ${known ? `<div class="subst known">${stackFractions(known)}</div>` : ''}
      <div class="subst">${stackFractions(d.s)}</div>
      <div class="result">${t(ok ? 'met' : 'notMet')}</div>
      ${T['y.' + c[0]] ? `<details class="check-why"><summary>${ICON.info}<span>${t('whyRule')}</span></summary><p>${t('y.' + c[0])}</p></details>` : ''}
    </div>`;
  }).join('');
  return `<h2 class="calc-heading">${t('checksTitle')}</h2>${items}`;
}

function runChecks() {
  try {
    const g = derive(), v = vbeltDesign();
    return CHECKS.map(c => { try { return !!c[1](g, v); } catch (e) { return false; } });
  } catch (e) {
    return CHECKS.map(() => false);
  }
}

function renderChecks(results) {
  const pass = results.filter(Boolean).length;
  $('#checksCount').textContent = t('checksCount').replace('{a}', pass).replace('{b}', results.length);
  $('#checksList').innerHTML = CHECKS.map((c, i) =>
    `<button type="button" class="check ${results[i] ? 'ok' : 'bad'}" data-check="${c[0]}" title="${t('showCalc')}">`
    + `<b>${results[i] ? '✓' : '✗'}</b><span>${t('k.' + c[0])}</span></button>`).join('');
}

// bandOf['comp.key'] = { runs: [[from, to], ...], ok } for a free variable some check limits,
// { any: true } for a free variable no check limits. Filled by updateBands().
export let bandOf = {};
export let checkNow = {};   // checkNow[checkId] = that check written with the current numbers

// For every variable that is not fixed, try each value of its slider with everything else as it is now.
// A value is good when every check that this variable can influence passes. The good stretch is painted
// on the slider track. Checks that fail whatever this variable is set to are not held against it.
export function updateBands() {
  bandOf = {};
  const base = runChecks();
  checkNow = {};
  try {
    const g0 = derive(), v0 = vbeltDesign();
    CHECKS.forEach(c => { try { checkNow[c[0]] = c[2](g0, v0).s; } catch (e) { /* no numbers for this one */ } });
  } catch (e) { /* keep the list without the current numbers */ }
  // stretches of consecutive slider values for which `pass` is true
  const runsOf = (vals, pass) => {
    const out = [];
    for (let i = 0; i < vals.length; i++) {
      if (!pass[i]) continue;
      let j = i;
      while (j + 1 < vals.length && pass[j + 1]) j++;
      out.push([vals[i], vals[j]]);
      i = j;
    }
    return out;
  };
  renderChecks(base);
  const show = anyLocked();
  const GREEN = COLORS.valid, GREY = COLORS.line;
  const stop = f => `calc(8px + (100% - 16px) * ${Math.round(f * 10000) / 10000})`;

  inputs.forEach(inp => {
    const p = inp.p, isLocked = locked[inp.comp][inp.key];
    inp.range.style.background = '';
    inp.range.title = '';
    inp.row.classList.remove('out');
    if (!show || isLocked) return;

    // every step of the slider when there are few, else a fine sampling; always including the current value
    const steps = Math.round((p.max - p.min) / p.step), n = Math.min(steps, 320);
    const cur = P[inp.comp][inp.key];
    const set = new Set([cur]);
    for (let i = 0; i <= n; i++) set.add(Math.round((p.min + Math.round(i * steps / n) * p.step) * 1e6) / 1e6);
    const vals = [...set].sort((a, b) => a - b);
    const res = vals.map(v => { P[inp.comp][inp.key] = v; return runChecks(); });
    P[inp.comp][inp.key] = cur;

    const mine = CHECKS.map((c, j) => res.some(r => r[j]) && res.some(r => !r[j]));   // checks this variable can flip
    if (!mine.some(Boolean)) { bandOf[inp.comp + '.' + inp.key] = { any: true }; return; }   // it affects no check
    const good = res.map(r => mine.every((m, j) => !m || r[j]));
    inp.row.classList.toggle('out', !good[vals.indexOf(cur)]);   // current value outside the green: red knob

    // contiguous good runs → gradient stops; edges fall halfway between neighbouring samples
    const f = v => (v - p.min) / (p.max - p.min);
    const parts = [], ranges = [], runs = [];
    let i = 0;
    while (i < vals.length) {
      if (!good[i]) { i++; continue; }
      let j = i;
      while (j + 1 < vals.length && good[j + 1]) j++;
      const a = i === 0 ? 0 : f((vals[i - 1] + vals[i]) / 2), b = j === vals.length - 1 ? 1 : f((vals[j] + vals[j + 1]) / 2);
      parts.push(`${GREY} ${stop(a)}, ${GREEN} ${stop(a)}, ${GREEN} ${stop(b)}, ${GREY} ${stop(b)}`);
      runs.push([vals[i], vals[j]]);
      ranges.push(vals[i] === vals[j] ? String(vals[i]) : t('bandTip').replace('{a}', vals[i]).replace('{b}', vals[j]));
      i = j + 1;
    }
    // the checks that limit this variable, each with the values it accepts on its own
    const at = vals.indexOf(cur);
    const limits = CHECKS.map((c, j) => (mine[j] ? { id: c[0], ok: res[at][j], runs: runsOf(vals, res.map(r => r[j])) } : null))
      .filter(Boolean).sort((a, b) => a.ok - b.ok);
    bandOf[inp.comp + '.' + inp.key] = { runs, ok: good[at], limits };
    if (parts.length) {
      inp.range.style.background = `linear-gradient(to right, ${GREY} 0, ${parts.join(', ')}, ${GREY} 100%)`;
      inp.range.title = ranges.join(' ; ');
    } else {
      inp.range.style.background = COLORS.invalid;
      inp.range.title = t('bandNone');
    }
  });
  derive();   // the trial values moved the shared power / speed values: put them back
}
