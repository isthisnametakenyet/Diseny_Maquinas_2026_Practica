/* Parametric shaft assembly: bearing A, helical gear B, bearing C, V-belt pulley D.
 * All dimensions in mm. x = shaft axis, y = up, z = towards the viewer (as in the figure).
 * 3D: Three.js   2D: Two.js
 *
 * This file only starts the app and says what a redraw is. The rest lives in:
 *   i18n.js        texts in three languages          schema.js      cards, sliders, colours, icons
 *   state.js       values, theme, storage            model.js       geometry, loads, belt, shaft strength
 *   checks.js      design checks and valid ranges    mathtext.js    fractions, symbol links, LaTeX
 *   calc.js        the Calculations tab              ui.js          cards, buttons, language, selection
 *   view2d.js      2D drawings                       view3d.js      3D scene (with geometry3d.js)
 *   arrows.js      size of the force arrows
 * equations.js (EQ) and tables.js (TABLES, TableFigure) are plain scripts loaded before this one.
 */

import { setLang } from './i18n.js';
import { $, onRefresh, opts, refresh, saveState } from './state.js';
import { derive } from './model.js';
import { copyLatex } from './mathtext.js';
import { updateBands } from './checks.js';
import { annotateCalc, updateCalc } from './calc.js';
import { draw2D, init2D } from './view2d.js';
import { init3D, view3d } from './view3d.js';
import { applyLang, applyPanels, buildUI, goToVariable, select, updateReadout } from './ui.js';

let bandTimer = 0;
function scheduleBands() {
  clearTimeout(bandTimer);
  bandTimer = setTimeout(() => { updateBands(); annotateCalc(); }, 140);   // ranges first: the steps list them
}

let pending = false;
function redrawAll() {
  if (pending) return;
  pending = true;
  // next frame, or after a short delay when the tab is in the background and frames are paused
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    pending = false;
    saveState();
    const g = derive();
    updateReadout(g);
    updateCalc(g);
    draw2D(g);
    if (view3d) view3d.rebuild(g);
    scheduleBands();
  };
  requestAnimationFrame(run);
  setTimeout(run, 150);
}

document.querySelectorAll('.langs button[data-lang]').forEach(b => {
  b.addEventListener('click', () => {
    setLang(b.dataset.lang);
    applyLang();
  });
});

// clicking a check opens the Calculations tab at the item that works it out
$('#checksList').addEventListener('click', e => {
  const btn = e.target.closest('[data-check]');
  if (!btn) return;
  $('#tabBtnCalc').click();
  const item = document.getElementById('check-' + btn.dataset.check);
  if (!item) return;
  item.scrollIntoView({ block: 'center' });
  item.classList.remove('flash');
  void item.offsetWidth;            // restart the highlight if it is clicked twice
  item.classList.add('flash');
});

[['#btnVars', 'showVars'], ['#btnLoads', 'showLoads']].forEach(([sel, key]) => {
  $(sel).addEventListener('click', () => {
    opts[key] = !opts[key];
    applyPanels();
    refresh();
  });
});
applyPanels();

$('#calcList').addEventListener('click', e => {
  const copy = e.target.closest('.copy-eq');
  if (copy) { copyLatex(copy); return; }
  const sym = e.target.closest('.sym[data-var]');
  if (sym) { goToVariable(sym.dataset.var); return; }
  const calc = e.target.closest('.sym[data-step]');
  if (calc) {
    const step = document.getElementById('step-' + calc.dataset.step);
    if (step) {
      step.scrollIntoView({ block: 'center' });
      step.classList.remove('flash');
      void step.offsetWidth;
      step.classList.add('flash');
    }
    return;
  }
  const btn = e.target.closest('.why-link[data-check]');
  const item = btn && document.getElementById('check-' + btn.dataset.check);
  if (!item) return;
  item.scrollIntoView({ block: 'center' });
  item.classList.remove('flash');
  void item.offsetWidth;
  item.classList.add('flash');
});

onRefresh(redrawAll);   // what refresh() does, for every file
buildUI();
applyLang();
init2D(select);
refresh();
init3D(select).then(refresh);

// tabs: Visual (3D + 2D) / Calculations
const tabs = [['#tabBtnVisual', '#tabVisual'], ['#tabBtnCalc', '#tabCalc']];
tabs.forEach(([btnSel]) => {
  $(btnSel).addEventListener('click', () => {
    tabs.forEach(([b, p]) => {
      const on = b === btnSel;
      $(b).setAttribute('aria-selected', String(on));
      $(p).hidden = !on;
    });
  });
});

// also fires when the Visual tab becomes visible again
const ro = new ResizeObserver(() => {
  if (view3d) view3d.resize();
  refresh();
});
ro.observe($('#pane3d'));
ro.observe($('#pane2d'));
