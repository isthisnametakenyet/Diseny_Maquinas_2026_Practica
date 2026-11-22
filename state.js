/* The state of the app: the value of every variable, what is shown, what is fixed, the theme, the
 * selection, and what is kept in localStorage. Other files read these and ask for a redraw with refresh().
 */

import { lang, setLang } from './i18n.js';
import { PALETTES, SCHEMA } from './schema.js';

// ------------------------------------------------------------------
// Persistence: language, every input value, show/hide and view options are kept in localStorage
// ------------------------------------------------------------------
const STORE_KEY = 'shaft-state-v3';   // bumped when the defaults changed, so old saved values do not hide them
function readState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* storage unavailable */ }
  return null;
}
export function saveState() {
  // the theme is stored only once the user has picked one; until then the system setting decides
  const json = JSON.stringify({ lang, theme: themeChosen ? theme : undefined, P, visible, opts, locked, speed: animSpeed });
  try { localStorage.setItem(STORE_KEY, json); } catch (e) { /* storage unavailable */ }
}
const saved = readState() || {};
try { document.cookie = STORE_KEY + '=; max-age=0; path=/'; } catch (e) { /* remove the cookie older versions set */ }
setLang(saved.lang);

// ------------------------------------------------------------------
// Theme. COLORS always holds the colours of the theme in use: it is one object, refilled when the theme
// changes, so every file that reads it sees the new colours.
// ------------------------------------------------------------------
// light or dark: the saved choice, else whatever the system prefers
export const systemDark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
export let themeChosen = saved.theme === 'dark' || saved.theme === 'light';
export let theme = themeChosen ? saved.theme : (systemDark && systemDark.matches ? 'dark' : 'light');
export const COLORS = Object.assign({}, PALETTES[theme]);
document.documentElement.dataset.theme = theme;
export function setThemeName(next) {
  theme = next;
  Object.assign(COLORS, PALETTES[theme]);
  document.documentElement.dataset.theme = theme;
}
export function markThemeChosen() { themeChosen = true; }

export const P = {};        // P[componentId][paramKey] = value
export const visible = {};  // visible[componentId] = bool
export const opts = { spin: true, forces: true, labels: true, edges: true, showVars: true, showLoads: true };
export const colorOf = {};
// animation speed, 0.1 to 1 in steps of 0.1 (1 is the full pace); half pace unless one was saved
export const ANIM_SPEED_DEFAULT = 0.5;
export let animSpeed = Number(saved.speed);
if (!(animSpeed >= 0.1 && animSpeed <= 1)) animSpeed = ANIM_SPEED_DEFAULT;
animSpeed = Math.round(animSpeed * 10) / 10;
export function setAnimSpeed(v) { animSpeed = v; }

SCHEMA.forEach(c => {
  P[c.id] = {};
  visible[c.id] = true;
  colorOf[c.id] = COLORS.comp[c.id];
  c.params.forEach(p => { P[c.id][p.key] = p.def; });
});

// locked[componentId][paramKey] = true when the user has fixed that variable
export const locked = {};
SCHEMA.forEach(c => {
  locked[c.id] = {};
  c.params.forEach(p => { locked[c.id][p.key] = !!(saved.locked && saved.locked[c.id] && saved.locked[c.id][p.key]); });
});

// restore saved values, ignoring anything unknown or out of range
SCHEMA.forEach(c => {
  const sp = saved.P && saved.P[c.id];
  c.params.forEach(p => {
    const v = sp ? Number(sp[p.key]) : NaN;
    if (isFinite(v)) P[c.id][p.key] = Math.min(p.max, Math.max(p.min, v));
  });
  if (saved.visible && typeof saved.visible[c.id] === 'boolean' && !c.noToggle) visible[c.id] = saved.visible[c.id];
});
Object.keys(opts).forEach(k => {
  if (saved.opts && typeof saved.opts[k] === 'boolean') opts[k] = saved.opts[k];
});

// ------------------------------------------------------------------
// The page: a short way to find an element, and the inputs and cards of the sidebar (filled by buildUI)
// ------------------------------------------------------------------
export const $ = sel => document.querySelector(sel);
export const inputs = [];   // { comp, param, range, number }
export const cards = {};    // cards[componentId] = sidebar card element
export const anyLocked = () => inputs.some(i => locked[i.comp][i.key]);

// The selected component (its id in SCHEMA) or null. It is highlighted in both views and in its card.
export let selected = null;
export function setSelected(id) { selected = id; }

// ------------------------------------------------------------------
// Redraw. Any file calls refresh() after changing a value; main.js says what a redraw does (onRefresh).
// ------------------------------------------------------------------
let redraw = () => {};
export function onRefresh(fn) { redraw = fn; }
export function refresh() { redraw(); }
