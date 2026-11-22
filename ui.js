/* The page around the views: the cards of variables, the toolbar buttons, the theme, the loads list,
 * the language, and selecting a component.
 */

import { lang, t } from './i18n.js';
import { HOME, ICON, SCHEMA } from './schema.js';
import {
  $, ANIM_SPEED_DEFAULT, animSpeed, cards, colorOf, COLORS, inputs, locked, markThemeChosen, opts, P, refresh,
  saveState, selected, setAnimSpeed, setSelected, setThemeName, systemDark, theme, themeChosen, visible,
} from './state.js';
import { derive, SPEED_RPM } from './model.js';
import { draw2D } from './view2d.js';
import { view3d } from './view3d.js';

export function buildUI() {
  const host = $('#components');
  SCHEMA.forEach(comp => {
    const card = document.createElement('section');
    card.className = 'card';
    card.style.setProperty('--swatch', colorOf[comp.id]);
    if (comp.noToggle) card.classList.add('plain');   // not a component: no colour bar

    const head = document.createElement('div');
    head.className = 'card-head';
    const h = document.createElement('h2');
    h.dataset.i18n = 'c.' + comp.id;
    head.appendChild(h);

    if (!comp.noToggle) {
      const lab = document.createElement('label');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = visible[comp.id];
      card.classList.toggle('hidden-part', !visible[comp.id]);
      cb.addEventListener('change', () => {
        visible[comp.id] = cb.checked;
        card.classList.toggle('hidden-part', !cb.checked);
        refresh();
      });
      // an eye instead of a word: open and coloured when the part is drawn, crossed and grey when hidden
      lab.className = 'eye';
      lab.dataset.i18nTitle = 'show';
      cb.dataset.i18nLabel = 'show';
      lab.append(cb);
      lab.insertAdjacentHTML('beforeend', ICON.eye + ICON.eyeOff);
      head.appendChild(lab);
    }

    const reset = document.createElement('button');
    reset.type = 'button';
    // a circular arrow instead of the word, which is long in Spanish; the word is the tooltip
    reset.className = 'icon-btn';
    reset.innerHTML = ICON.reset;
    reset.dataset.i18nTitle = 'reset';
    reset.dataset.i18nLabel = 'reset';
    reset.addEventListener('click', () => {
      inputs.filter(i => i.row.parentNode === card)
        .forEach(i => { if (!locked[i.comp][i.key]) P[i.comp][i.key] = i.p.def; });
      syncInputs();
      refresh();
    });
    head.appendChild(reset);
    card.appendChild(head);
    cards[comp.id] = card;

    comp.params.forEach(p => {
      const row = document.createElement('div');
      row.className = 'param';
      const name = document.createElement('span');
      name.dataset.i18n = 'p.' + comp.id + '.' + p.key;
      const range = document.createElement('input');
      range.type = 'range';
      const number = document.createElement('input');
      number.type = 'number';
      [range, number].forEach(el => { el.min = p.min; el.max = p.max; el.step = p.step; el.value = P[comp.id][p.key]; });

      const set = (raw, from) => {
        if (locked[comp.id][p.key]) return;
        let v = parseFloat(raw);
        if (!isFinite(v)) return;
        v = Math.min(p.max, Math.max(p.min, v));
        P[comp.id][p.key] = v;
        if (from !== range) range.value = v;
        if (from !== number) number.value = v;
        refresh();
      };
      range.addEventListener('input', () => set(range.value, range));
      number.addEventListener('input', () => set(number.value, number));
      number.addEventListener('change', () => { number.value = P[comp.id][p.key]; });

      const fixBtn = document.createElement('button');
      fixBtn.type = 'button';
      fixBtn.className = 'fix';
      const entry = { comp: comp.id, key: p.key, p, range, number, fixBtn, row };
      fixBtn.addEventListener('click', () => {
        locked[comp.id][p.key] = !locked[comp.id][p.key];
        applyLock(entry);
        refresh();
      });

      row.append(name, range, number, fixBtn);
      card.appendChild(row);
      inputs.push(entry);
      applyLock(entry);
    });

    host.appendChild(card);
  });
  // move the inputs that belong with another part into that part's card; a card left empty is dropped
  Object.keys(HOME).forEach(id => {
    const i = inputs.find(x => x.comp + '.' + x.key === id);
    if (i && cards[HOME[id]]) cards[HOME[id]].appendChild(i.row);
  });
  // order of the cards in the sidebar
  ['drive', 'shaft', 'layout', 'bearingA', 'pinion', 'gear', 'design', 'bearingC', 'given', 'pulley', 'vbelt']
    .forEach(id => { if (cards[id]) host.appendChild(cards[id]); });
  SCHEMA.forEach(c => {
    if (!cards[c.id].querySelector('.param')) { cards[c.id].remove(); delete cards[c.id]; }
  });

  // every card (components and loads) collapses to its title; collapsed by default
  const allCards = [...document.querySelectorAll('.card')];
  const expandBtn = $('#btnExpand');
  const setCollapsed = (card, on) => {
    card.classList.toggle('collapsed', on);
    card.querySelector('h2').setAttribute('aria-expanded', String(!on));
    updateExpandButton();
  };
  allCards.forEach(card => {
    const title = card.querySelector('h2');
    title.tabIndex = 0;
    title.setAttribute('role', 'button');
    const toggle = () => setCollapsed(card, !card.classList.contains('collapsed'));
    title.addEventListener('click', toggle);
    title.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
    setCollapsed(card, true);
  });
  expandBtn.addEventListener('click', () => {
    const anyCollapsed = allCards.some(c => c.classList.contains('collapsed'));
    allCards.forEach(c => setCollapsed(c, !anyCollapsed));
  });

  $('#btnReset').innerHTML = ICON.reset;
  $('#btnReset').addEventListener('click', () => {
    SCHEMA.forEach(c => c.params.forEach(p => { if (!locked[c.id][p.key]) P[c.id][p.key] = p.def; }));
    setAnimSpeed(ANIM_SPEED_DEFAULT);
    $('#selSpeed').value = String(animSpeed);
    syncInputs();
    refresh();
  });
  $('#btnTheme').addEventListener('click', () => { markThemeChosen(); setTheme(theme === 'dark' ? 'light' : 'dark'); });
  // with no choice stored, follow the system when it switches between light and dark
  if (systemDark && systemDark.addEventListener) {
    systemDark.addEventListener('change', e => { if (!themeChosen) setTheme(e.matches ? 'dark' : 'light'); });
  }
  const speedSel = $('#selSpeed');
  for (let i = 1; i <= 10; i++) {
    const o = document.createElement('option');
    o.value = String(i / 10);
    o.textContent = (i / 10).toFixed(1) + ' ×';
    speedSel.appendChild(o);
  }
  speedSel.value = String(animSpeed);
  speedSel.addEventListener('change', () => { setAnimSpeed(Number(speedSel.value)); saveState(); });
  $('#btnPlay').addEventListener('click', () => {
    opts.spin = !opts.spin;
    updatePlayButton();
    refresh();
  });
  [['#optForces', 'forces'], ['#optLabels', 'labels'], ['#optEdges', 'edges']].forEach(([sel, key]) => {
    $(sel).checked = opts[key];
    $(sel).addEventListener('change', e => { opts[key] = e.target.checked; refresh(); });
  });
}

// the toolbar buttons are icons only; their words are the tooltips
function updateExpandButton() {
  const b = $('#btnExpand');
  const expand = !!document.querySelector('.card.collapsed');
  b.innerHTML = expand ? ICON.expand : ICON.collapse;
  b.title = t(expand ? 'expandAll' : 'collapseAll');
  b.setAttribute('aria-label', b.title);
}

// the animation toggle shows what a click will do: pause while running, play while paused
function updatePlayButton() {
  const b = $('#btnPlay');
  b.innerHTML = opts.spin ? ICON.pause : ICON.play;
  b.setAttribute('aria-label', t(opts.spin ? 'pause' : 'play'));
  b.setAttribute('aria-pressed', String(opts.spin));
  b.title = t(opts.spin ? 'animOn' : 'animOff');
}

// a fixed variable has its slider and number box disabled and its button lit
function applyLock(i) {
  const on = locked[i.comp][i.key];
  i.range.disabled = i.number.disabled = on;
  i.row.classList.toggle('fixed', on);
  i.fixBtn.setAttribute('aria-pressed', String(on));
  // a pin: lit when the variable is fixed; the word is the tooltip
  if (!i.fixBtn.firstChild) i.fixBtn.innerHTML = ICON.pin;
  i.fixBtn.title = t(on ? 'fixed' : 'fix');
  i.fixBtn.setAttribute('aria-label', i.fixBtn.title);
}

// light / dark: swap the palette, repaint the cards, and redraw everything
function updateThemeButton() {
  const b = $('#btnTheme');
  // only the icon of the theme a click switches to; its name is the tooltip
  b.innerHTML = theme === 'dark' ? ICON.sun : ICON.moon;
  b.title = t(theme === 'dark' ? 'light' : 'dark');
  b.setAttribute('aria-label', b.title);
  b.setAttribute('aria-pressed', String(theme === 'dark'));
}
function setTheme(next) {
  setThemeName(next);
  SCHEMA.forEach(c => {
    colorOf[c.id] = COLORS.comp[c.id];
    if (cards[c.id]) cards[c.id].style.setProperty('--swatch', colorOf[c.id]);
  });
  updateThemeButton();
  refresh();
}

function syncInputs() {
  inputs.forEach(i => { i.range.value = i.number.value = P[i.comp][i.key]; });
}

export function updateReadout(g) {
  $('#subtitle').textContent = t('subtitle').replace('{kW}', P.drive.kW).replace('{n}', P.drive.n);
  const L = g.loads;
  const rows = [
    [t('rTorque'), L.torque.toFixed(1) + ' N m'],
    [t('rFt'), L.Ft.toFixed(0) + ' N'],
    [t('rFr'), L.Fr.toFixed(0) + ' N'],
    [t('rFa'), L.Fa.toFixed(0) + ' N'],
    [t('rBelt'), L.belt.toFixed(0) + ' N'],
    [t('rF1'), L.F1.toFixed(0) + ' N'],
    [t('rF2'), L.F2.toFixed(0) + ' N'],
    [t('rPeak').replace('{k}', P.drive.peak), L.peakTorque.toFixed(1) + ' N m'],
    [t('rModule'), g.gear.m.toFixed(2) + ' mm'],
    [t('rPinionD'), (2 * g.pinion.r).toFixed(1) + ' mm'],
    [t('rPinionN').replace('{i}', (g.gear.z / g.pinion.z).toFixed(3)), (SPEED_RPM * g.gear.z / g.pinion.z).toFixed(0) + ' rpm'],
    [t('rLength'), g.len.toFixed(0) + ' mm'],
  ];
  $('#loadsList').innerHTML = rows.map(r => `<div class="row"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');
}

// open the card of a variable, bring its row into view and flash it
export function goToVariable(id) {
  const inp = inputs.find(i => i.comp + '.' + i.key === id);
  if (!inp) return;
  if (document.body.classList.contains('no-vars')) $('#btnVars').click();
  const card = inp.row.closest('.card');
  if (card && card.classList.contains('collapsed')) card.querySelector('h2').click();
  inp.row.scrollIntoView({ block: 'center', behavior: 'smooth' });
  inp.row.classList.remove('flash');
  void inp.row.offsetWidth;
  inp.row.classList.add('flash');
}

// Select a component (its id in SCHEMA) or nothing: its card is marked and opened, and both views redraw it
export function select(id) {
  setSelected(id && cards[id] ? id : null);
  Object.keys(cards).forEach(k => cards[k].classList.toggle('selected', k === selected));
  if (selected) {
    const card = cards[selected];
    card.classList.remove('collapsed');
    card.querySelector('h2').setAttribute('aria-expanded', 'true');
    updateExpandButton();
    card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  draw2D(derive());
  if (view3d) view3d.highlight();
}

// language: fill every [data-i18n] element, then redraw the generated text (loads, calculations, 2D labels)
export function applyLang() {
  document.documentElement.lang = lang;
  document.title = t('docTitle');
  updatePlayButton();
  updateThemeButton();
  inputs.forEach(applyLock);
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
  document.querySelectorAll('[data-i18n-label]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nLabel)); });
  document.querySelectorAll('.langs button[data-lang]').forEach(b => {
    b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
  });
  updateExpandButton();
  refresh();
}

// the two side columns (variables; loads and checks) can be hidden to leave only the views
export function applyPanels() {
  document.body.classList.toggle('no-vars', !opts.showVars);
  document.body.classList.toggle('no-loads', !opts.showLoads);
  $('#btnVars').setAttribute('aria-pressed', String(opts.showVars));
  $('#btnLoads').setAttribute('aria-pressed', String(opts.showLoads));
}
