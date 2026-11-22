/* Formulas as text. The formulas of the app are HTML strings such as "2 × T / d<sub>B</sub>"; this file
 * turns their symbols into links, puts numbers in place of symbols, stacks fractions and writes LaTeX.
 */

import { T, t } from './i18n.js';
import { ICON } from './schema.js';
import { P } from './state.js';

// ---- symbols in an equation that are input variables: a click on one goes to its input ----
// Key: the symbol, plus "_" and its subscript when it has one. Value: 'component.parameter'.
// Only symbols that mean the same input everywhere are listed here; a check can add its own (see SYM_IN).
const SYM = {
  'P': 'drive.kW', 'n': 'drive.n', 'n_motor': 'given.motor', 'k_pic': 'drive.peak',
  'z_B': 'gear.z', 'z_p': 'pinion.z', 'd_B': 'gear.d', 'β': 'gear.beta', 'φ': 'gear.phi', 'φ_t': 'gear.phi',
  'w_A': 'bearingA.w', 'w_B': 'gear.w', 'w_C': 'bearingC.w', 'w_D': 'pulley.w', 'w_p': 'pinion.w',
  'D_A': 'bearingA.D', 'D_C': 'bearingC.D', 'd_s': 'shaft.ds', 'e_L': 'shaft.overL', 'e_R': 'shaft.overR',
  'AB': 'layout.ab', 'BC': 'layout.bc', 'CD': 'layout.cd',
  'S_ut': 'shaft.Sut', 'S_y': 'shaft.Sy', 'K_f': 'shaft.Kf', 'K_fs': 'shaft.Kfs',
  'N_f, min': 'given.nf', 'N_pic, min': 'given.npeak', 'Q_v': 'design.Qv', 'K_s': 'vbelt.Ks', 'k': 'vbelt.ratio',
};
// symbols whose meaning depends on the check they appear in
export const SYM_IN = {
  shoulder: { d: 'shaft.d' }, bearingA: { d: 'shaft.d' }, bearingC: { d: 'shaft.d' },
  face: { F: 'gear.w' }, centre: { C: 'vbelt.C' },
  groove: { depth: 'pulley.depth', D: 'pulley.D' }, pitch: { grooves: 'pulley.n' }, belts: { grooves: 'pulley.n' },
};
// Symbols the app calculates: symDefs lists, for every worked step, the symbols its result line defines
// ("Ft = 636.6 N" defines Ft). A calculated symbol in a later equation links to the nearest step before
// it that defines it. Filled each time the steps are rendered.
let symDefs = [];   // [{ key, k }] in step order
const SYM_UNITS = { in: 1, mm: 1, ft: 1, hp: 1, rpm: 1, lbf: 1, rad: 1, max: 1, min: 1, N: 0 };
const SYM_ALIAS = { m: 'm_t' };   // the checks write the transverse module as m
const SYM_RE = /<su[bp]>[^<]*<\/su[bp]>|<[^>]+>|([A-Za-z\u0370-\u03FF]+)(<sub>([^<]*)<\/sub>)?/g;
export function readSymDefs(steps) {
  symDefs = [];
  steps.forEach((st, k) => {
    const re = /([A-Za-z\u0370-\u03FF]+)(?:<sub>([^<]*)<\/sub>)?\s*=/g;
    let m;
    while ((m = re.exec(st.r || ''))) symDefs.push({ key: m[2] != null ? m[1] + '_' + m[2] : m[1], k });
  });
}
const definingStep = (key, before) => {
  let found = -1;
  symDefs.forEach(d => { if (d.key === key && d.k < before) found = d.k; });
  return symDefs.some(d => d.key === key && d.k === before) ? -1 : found;   // a step does not link to itself
};

// wrap every known symbol of a formula (HTML) in a button; tags and unknown symbols are left as they are.
// `at` is the index of the step the formula belongs to (checks come after every step).
export function linkSymbols(html, extra, at) {
  if (at == null) at = Infinity;
  return html.replace(SYM_RE, (m, sym, subTag, sub, offset) => {
    if (!sym || html[offset - 1] === '°') return m;                      // a tag, or the C of °C
    const withSub = sub != null ? sym + '_' + sub : null;
    const hit = (withSub && ((extra && extra[withSub]) || SYM[withSub])) || (!subTag && ((extra && extra[sym]) || SYM[sym]));
    if (!hit || !T['p.' + hit]) {
      const key = withSub || sym, k = definingStep(SYM_ALIAS[key] || key, at);
      // units and words are not symbols; in the temperature step T is the temperature, not the torque
      if (k < 0 || (!subTag && SYM_UNITS[sym]) || (key === 'T' && /K<sub>T<\/sub> = 1/.test(html))) return m;
      const title = (t('ct' + k) || '').replace(/<[^>]+>/g, '');
      return `<button type="button" class="sym calc" data-step="${k}" title="${k + 1}. ${title}">${m}</button>`;
    }
    return `<button type="button" class="sym" data-var="${hit}" title="${t('p.' + hit)}">${m}</button>`;
  });
}
// The same formula with every symbol replaced by its current number: inputs from their sliders, calculated
// symbols from `calc` ({ key: number }). Returns null when a symbol has no known value, or when there is
// nothing to work out (no operation in the formula), so the caller can leave that line out.
const SYM_WORDS = { mm: 1, max: 1, min: 1, ft: 1, π: 1 };
export function substituteSymbols(html, extra, calc) {
  if (!/[×/+−]/.test(html.replace(/<[^>]+>/g, ''))) return null;
  let unknown = false;
  const out = html.replace(SYM_RE, (m, sym, subTag, sub) => {
    if (!sym) return m;
    const withSub = sub != null ? sym + '_' + sub : null;
    const hit = (withSub && ((extra && extra[withSub]) || SYM[withSub])) || (!subTag && ((extra && extra[sym]) || SYM[sym]));
    if (hit && T['p.' + hit]) { const [c, k] = hit.split('.'); return String(P[c][k]); }
    const key = withSub || sym;
    if (calc && typeof calc[key] === 'number' && isFinite(calc[key])) return String(Math.round(calc[key] * 100) / 100);
    if (!subTag && SYM_WORDS[sym]) return m;
    unknown = true;
    return m;
  });
  return unknown ? null : out;
}

// ---- LaTeX ----
// One piece of a formula (text with <sub>/<sup> tags) as LaTeX: tags become _{ } and ^{ }, the special
// characters become commands, and words and units go inside \text{ }.
const TEX_CHAR = {
  '×': '\\times ', '−': '-', '≤': '\\le ', '≥': '\\ge ', '≈': '\\approx ', '→': '\\rightarrow ', '⇒': '\\Rightarrow ',
  'π': '\\pi ', 'ω': '\\omega ', 'φ': '\\varphi ', 'β': '\\beta ', 'σ': '\\sigma ', 'τ': '\\tau ', 'θ': '\\theta ',
  'ψ': '\\psi ', 'Δ': '\\Delta ', '′': "'", '°': '^{\\circ}', '%': '\\%', '²': '^{2}', '³': '^{3}', '√': '\\sqrt{}',
  '{': '\\{', '}': '\\}', ' ': '\\,', '«': '\\text{«}', '»': '\\text{»}', '&': '\\&', '#': '\\#', '_': '\\_',
};
const TEX_FUNC = { tan: 1, sin: 1, cos: 1, max: 1, min: 1, log: 1, exp: 1 };
function texText(str) {
  return str.replace(/<su([bp])>([\s\S]*?)<\/su[bp]>|<[^>]+>|([^<]+)/g, (m, kind, inner, plain) => {
    if (kind) return (kind === 'b' ? '_{' : '^{') + texText(inner) + '}';
    if (plain == null) return '';
    return plain
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
      .replace(/[A-Za-zÀ-ÖØ-öø-ÿ]{2,}(?: [A-Za-zÀ-ÖØ-öø-ÿ]{2,})*|[^A-Za-zÀ-ÖØ-öø-ÿ]/g, w =>
        (w.length > 1 ? (TEX_FUNC[w] ? '\\' + w + ' ' : `\\text{${w}}`) : TEX_CHAR[w] != null ? TEX_CHAR[w] : w));
  });
}
export const toLatex = html => stackFractions(html || '', true)
  .replace(/ {2,}/g, ' ').replace(/ ,/g, ',')
  .replace(/(\d) (?=\\text\{|[A-Za-z])/g, '$1\\,')                     // a thin space between a number and its unit
  .replace(/\\,([NWJmsh])(?![A-Za-z_^{])/g, '\\,\\mathrm{$1}')         // one-letter units upright
  .replace(/\\mathrm\{N\} (m|\\text\{mm\})/g, (m, u) => `\\mathrm{N\\,${u === 'm' ? 'm' : 'mm'}}`)
  .trim();
// latexOf['step-3'] or latexOf['check-face']: the LaTeX the copy button of that equation puts on the clipboard
export let latexOf = {};
export function resetLatex() { latexOf = {}; }
export function copyLatex(btn) {
  const tex = latexOf[btn.dataset.eq];
  if (!tex) return;
  const done = () => {
    btn.classList.add('done');
    btn.innerHTML = ICON.check;
    setTimeout(() => { btn.classList.remove('done'); btn.innerHTML = ICON.copy; }, 1300);
  };
  const fallback = () => {                       // older browsers, or a page not served over https
    const ta = document.createElement('textarea');
    ta.value = tex;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { /* nothing more to try */ }
    ta.remove();
  };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(tex).then(done, fallback);
  else fallback();
}
export const copyButton = id =>
  `<button type="button" class="copy-eq" data-eq="${id}" title="${t('copyLatex')}" aria-label="${t('copyLatex')}">${ICON.copy}</button>`;

// ---- equations written the way they are written by hand: a / b becomes a stacked fraction ----
// The formulas of this file are plain HTML strings such as "2 × T / d<sub>B</sub>". stackFractions()
// reads one and rebuilds every " / " (with spaces; units like ft/min are left alone) as a fraction:
// the numerator is everything before it in the same term, the denominator what follows up to the
// next × or the end of the term. Terms end at + − = ≤ ≥ < > , ; : and at the enclosing bracket.
export function stackFractions(html, latex) {
  if (!latex && html.indexOf(' / ') < 0) return html;
  // 1. tokens
  const toks = [];
  const TAG = /<button[^>]*>[\s\S]*?<\/button>|<su[bp]>[\s\S]*?<\/su[bp]>|<\/?[a-zA-Z][^>]*>/g;
  const text = str => {
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (ch === '(' ) toks.push({ t: 'open' });
      else if (ch === ')') toks.push({ t: 'close' });
      else if (ch === '|') toks.push({ t: 'bar' });
      else if (ch === '/' && str[i - 1] === ' ' && str[i + 1] === ' ') toks.push({ t: 'div' });
      else if (ch === '×') toks.push({ t: 'mul', v: ch });
      else if ('+−=≤≥<>,;:→'.indexOf(ch) >= 0) toks.push({ t: 'sep', v: ch });
      else if (ch === ' ' || ch === ' ') toks.push({ t: 'sp', v: ch });
      else if (toks.length && toks[toks.length - 1].t === 'txt') toks[toks.length - 1].v += ch;
      else toks.push({ t: 'txt', v: ch });
    }
  };
  let last = 0, m;
  while ((m = TAG.exec(html))) {
    text(html.slice(last, m.index));
    toks.push({ t: 'txt', v: m[0] });
    last = m.index + m[0].length;
  }
  text(html.slice(last));

  // 2. tree: brackets and |bars| become groups
  let pos = 0;
  const parse = closer => {
    const out = [];
    while (pos < toks.length) {
      const k = toks[pos++];
      if (k.t === 'close') { if (closer === 'close') return out; out.push({ t: 'txt', v: ')' }); }
      else if (k.t === 'bar') {
        if (closer === 'bar') return out;
        out.push({ t: 'grp', o: '|', c: '|', kids: parse('bar') });
      } else if (k.t === 'open') out.push({ t: 'grp', o: '(', c: ')', kids: parse('close') });
      else out.push(k);
    }
    return out;
  };
  const tree = parse(null);

  // 3. render
  const trim = list => {
    let a = 0, b = list.length;
    while (a < b && list[a].t === 'sp') a++;
    while (b > a && list[b - 1].t === 'sp') b--;
    return list.slice(a, b);
  };
  const one = n => {
    if (n.t === 'html') return n.v;
    if (n.t === 'grp') {
      if (!latex) return n.o + seq(n.kids) + n.c;
      return n.o === '|' ? `\\left| ${seq(n.kids)} \\right|` : `\\left( ${seq(n.kids)} \\right)`;
    }
    return latex ? texText(n.v || '') : n.v || '';
  };
  // a list of nodes; in LaTeX a root sign takes the bracket that follows it
  const run = list => {
    let out = '';
    for (let i = 0; i < list.length; i++) {
      const n = list[i], nx = list[i + 1];
      if (latex && n.t === 'txt' && /√$/.test(n.v) && nx && nx.t === 'grp' && nx.o === '(') {
        out += texText(n.v.slice(0, -1)) + `\\sqrt{${seq(nx.kids)}}`;
        i++;
      } else out += one(n);
    }
    return out;
  };
  const side = list => {                       // numerator or denominator: a lone (bracket) loses its brackets
    const l = trim(list);
    return l.length === 1 && l[0].t === 'grp' && l[0].o === '(' ? seq(l[0].kids) : run(l);
  };
  const term = items => {
    for (;;) {
      const i = items.findIndex(n => n.t === 'div');
      if (i < 0) break;
      let j = i + 1;
      while (j < items.length && items[j].t !== 'mul' && items[j].t !== 'div') j++;
      const num = items.slice(0, i), den = items.slice(i + 1, j);
      const lead = [];                          // keep the spaces in front of the fraction
      while (num.length && num[0].t === 'sp') lead.push(num.shift());
      const frac = { t: 'html', v: latex ? `\\frac{${side(num)}}{${side(den)}}`
        : `<span class="frac"><span class="fnum">${side(num)}</span><span class="fden">${side(den)}</span></span>` };
      const tail = den.length && den[den.length - 1].t === 'sp' ? [{ t: 'sp', v: ' ' }] : [];
      items = lead.concat([frac], tail, items.slice(j));
    }
    return run(items);
  };
  function seq(nodes) {
    let out = '', cur = [];
    nodes.forEach(n => {
      if (n.t === 'sep') { out += term(cur) + (latex ? texText(n.v) : n.v); cur = []; } else cur.push(n);
    });
    return out + term(cur);
  }
  return seq(tree);
}
