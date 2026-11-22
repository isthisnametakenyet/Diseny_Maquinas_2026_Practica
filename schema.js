/* What the app is made of before any value is set: the colours of each theme, the cards with their
 * sliders (ranges and defaults), and the icons.
 */

// ------------------------------------------------------------------
// Colours: one calm palette per theme. Everything drawn in 2D and 3D reads from COLORS (state.js).
// ------------------------------------------------------------------
export const PALETTES = {
  light: {
    ink: '#2b3138', dim: '#3d444d', muted: '#6b7480', paper: '#ffffff', line: '#d9dde2', sceneBg: '#f1f2f4',
    select: '#2f6fc4', edge: '#22272d', force: '#b5463c', valid: '#6a9f7c', invalid: '#e6cfcb',
    steel: '#dfe3e7', steel2: '#d2d7dc', steel3: '#c5cbd1', ring: '#cfdae4', ball: '#f1f3f5', chrome: '#e3e6e9',
    belt: '#4d5257', belt3d: '#3f4347', beltMark: '#a9afb6', hole: '#2a2d31',
    comp: { given: '#7a8794', drive: '#5b7fa6', shaft: '#8b949e', bearingA: '#5c85ad', pinion: '#b0705f', gear: '#b8904f',
            bearingC: '#5f9a90', pulley: '#8676a8', layout: '#6a727b', design: '#6f9a7c', vbelt: '#a56f8a' },
    fill: { gear: '#eadfc8', pinion: '#ead3cb', pulley: '#e2dcee', pulleyHub: '#d6cfe6',
            driven: '#efdfe7', drivenHub: '#e3cdd8', pitch: '#8a6a2c' },
  },
  dark: {
    ink: '#d7dce2', dim: '#b4bcc5', muted: '#98a2ad', paper: '#1e2125', line: '#3a4048', sceneBg: '#1a1c20',
    select: '#7fb4f5', edge: '#08090b', force: '#d9796f', valid: '#6fae86', invalid: '#5a3b38',
    steel: '#4a5057', steel2: '#555c64', steel3: '#616973', ring: '#42566a', ball: '#6c747d', chrome: '#9aa2ab',
    belt: '#9aa1a8', belt3d: '#6d747c', beltMark: '#c2c8ce', hole: '#111315',
    comp: { given: '#9aa6b2', drive: '#7d9dc0', shaft: '#9aa3ad', bearingA: '#7ba0c4', pinion: '#c58d7d', gear: '#cdaa6e',
            bearingC: '#7fb3a9', pulley: '#a295c2', layout: '#8a929b', design: '#8cb497', vbelt: '#bf8ea6' },
    fill: { gear: '#4a4233', pinion: '#4a3832', pulley: '#3d3850', pulleyHub: '#4a4460',
            driven: '#473843', drivenHub: '#55434f', pitch: '#cdaa6e' },
  },
};

export const SCHEMA = [
  { id: 'drive', noToggle: true, params: [
    // the range is chosen so that the statement's 4 kW sits a quarter of the way along the slider
    { key: 'kW', min: 0.5, max: 14.5, step: 0.1, def: 4 },
    { key: 'n',  min: 50,  max: 3000, step: 10,  def: 1500 },   // the statement gives 800 rpm
    { key: 'peak', min: 1, max: 5,    step: 0.1, def: 2.5 },
  ]},
  { id: 'shaft', params: [
    { key: 'd', min: 10, max: 80,  step: 1, def: 30 },
    { key: 'ds', min: 12, max: 120, step: 1, def: 42 },
    { key: 'overL',  min: 0, max: 80, step: 1, def: 12 },
    { key: 'overR', min: 0, max: 80, step: 1, def: 18 },
    // not given by the statement: the shaft steel and the stress concentration at its shoulders
    { key: 'Sut', min: 300, max: 1500, step: 5,    def: 615 },
    { key: 'Sy',  min: 200, max: 1300, step: 5,    def: 380 },
    { key: 'Kf',  min: 1,   max: 3,    step: 0.05, def: 1.7 },
    { key: 'Kfs', min: 1,   max: 3,    step: 0.05, def: 1.5 },
  ]},
  { id: 'bearingA', params: [
    { key: 'D', min: 20, max: 200, step: 1, def: 72 },
    { key: 'w',          min: 5,  max: 60,  step: 1, def: 19 },
  ]},
  { id: 'pinion', params: [
    { key: 'z', min: 6,  max: 40,  step: 1, def: 18 },
    { key: 'w', min: 10, max: 160, step: 1, def: 66 },
  ]},
  { id: 'gear', params: [
    { key: 'd', min: 40, max: 400, step: 1, def: 150 },
    { key: 'w', min: 10, max: 150, step: 1, def: 60 },
    { key: 'z', min: 10, max: 80,  step: 1, def: 30 },
    { key: 'beta', min: 0,    max: 40, step: 1,   def: 10 },
    { key: 'phi',  min: 14.5, max: 25, step: 0.5, def: 20 },
  ]},
  { id: 'bearingC', params: [
    { key: 'D', min: 20, max: 200, step: 1, def: 72 },
    { key: 'w',          min: 5,  max: 60,  step: 1, def: 19 },
  ]},
  // Statement values that are not a size of a component. The card of this group shows the ones both
  // bearings share (life, reliability, temperature); the others are shown elsewhere: see HOME.
  { id: 'given', noToggle: true, params: [
    { key: 'motor',    min: 500,  max: 3600,   step: 10,   def: 2900 },
    { key: 'nf',       min: 1,    max: 5,      step: 0.1,  def: 2 },
    { key: 'relShaft', min: 90,   max: 99.99,  step: 0.01, def: 99 },
    { key: 'npeak',    min: 1,    max: 5,      step: 0.1,  def: 1.5 },
    { key: 'bearLife', min: 1000, max: 100000, step: 500,  def: 20000 },
    { key: 'relBear',  min: 90,   max: 99,     step: 1,    def: 90 },
    { key: 'temp',     min: -20,  max: 200,    step: 1,    def: 20 },
  ]},
  { id: 'pulley', params: [
    { key: 'D', min: 50, max: 500, step: 1, def: 220 },
    { key: 'w', min: 15, max: 200, step: 1, def: 70 },
    { key: 'n', min: 1,  max: 8,   step: 1, def: 3 },
    { key: 'depth',   min: 3,  max: 40,  step: 1, def: 14 },
  ]},
  { id: 'layout', noToggle: true, params: [
    { key: 'ab', min: 20, max: 300, step: 1, def: 100 },
    { key: 'bc', min: 20, max: 300, step: 1, def: 100 },
    { key: 'cd', min: 20, max: 300, step: 1, def: 60 },
  ]},
  { id: 'design', noToggle: true, params: [
    { key: 'Qv', min: 5, max: 11, step: 1, def: 6 },
    { key: 'life', min: 1000, max: 100000, step: 500, def: 20000 },
  ]},
  { id: 'vbelt', params: [
    { key: 'D2', min: 50,  max: 600,  step: 1,    def: 300 },
    { key: 'C',  min: 150, max: 2000, step: 10,   def: 500 },
    { key: 'Ks', min: 1,   max: 1.8,  step: 0.05, def: 1.2 },
    { key: 'ratio', min: 1.5, max: 10, step: 0.1, def: 5 },
  ]},
];

// Some values are stored in one group but belong, for the user, with the part they affect.
// HOME says in which card the input of such a value is shown.
export const HOME = {
  'given.motor': 'pinion',        // the motor drives the pinion
  'drive.peak': 'shaft',          // peak torque at start, shaft safety factors and reliability
  'given.nf': 'shaft',
  'given.relShaft': 'shaft',
  'given.npeak': 'shaft',
  'vbelt.ratio': 'pulley',        // belt tensions act on pulley D
  'layout.ab': 'shaft',           // where the parts sit along the shaft
  'layout.bc': 'shaft',
  'layout.cd': 'shaft',
};

// small line icons, drawn in the current text colour
const svgIcon = (cls, body) =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" `
  + `stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
export const ICON = {
  eye:    svgIcon('eye-on', '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  eyeOff: svgIcon('eye-off', '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M4 4l16 16"/>'),
  sun:    svgIcon('', '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  reset:  svgIcon('', '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>'),
  pin:    svgIcon('', '<path d="M9 3h6l-1 6 3 4H7l3-4z"/><path d="M12 13v8"/>'),
  play:     svgIcon('', '<path d="M7 4l13 8-13 8z" fill="currentColor"/>'),
  pause:    svgIcon('', '<path d="M8 5v14M16 5v14"/>'),
  expand:   svgIcon('', '<path d="M7 4l5 5 5-5"/><path d="M7 13l5 5 5-5"/>'),
  collapse: svgIcon('', '<path d="M7 11l5-5 5 5"/><path d="M7 20l5-5 5 5"/>'),
  info:   svgIcon('', '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'),
  copy:   svgIcon('', '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>'),
  check:  svgIcon('', '<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  moon:   svgIcon('', '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>'),
};
