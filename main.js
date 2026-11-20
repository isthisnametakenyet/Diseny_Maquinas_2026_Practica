/* Parametric shaft assembly: bearing A, helical gear B, bearing C, V-belt pulley D.
 * All dimensions in mm. x = shaft axis, y = up, z = towards the viewer (as in the figure).
 * 3D: Three.js   2D: Two.js
 */
(function () {
  'use strict';

  // ------------------------------------------------------------------
  // Component definitions (every component has its own parameters)
  // ------------------------------------------------------------------
  let POWER_W = 4000;      // W,   set from the "Power and speed" card in derive()
  let SPEED_RPM = 800;     // rpm, set from the "Power and speed" card in derive()

  // ------------------------------------------------------------------
  // Translations: key → [English, Spanish, Catalan]
  // ------------------------------------------------------------------
  const LANGS = ['en', 'es', 'ca'];
  let lang = 'en';

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
  function saveState() {
    // the theme is stored only once the user has picked one; until then the system setting decides
    const json = JSON.stringify({ lang, theme: themeChosen ? theme : undefined, P, visible, opts, locked, speed: animSpeed });
    try { localStorage.setItem(STORE_KEY, json); } catch (e) { /* storage unavailable */ }
  }
  const saved = readState() || {};
  try { document.cookie = STORE_KEY + '=; max-age=0; path=/'; } catch (e) { /* remove the cookie older versions set */ }
  if (LANGS.includes(saved.lang)) lang = saved.lang;

  // ------------------------------------------------------------------
  // Colours: one calm palette per theme. Everything drawn in 2D and 3D reads from `C`.
  // ------------------------------------------------------------------
  const PALETTES = {
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
  // light or dark: the saved choice, else whatever the system prefers
  const systemDark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  let themeChosen = saved.theme === 'dark' || saved.theme === 'light';
  let theme = themeChosen ? saved.theme : (systemDark && systemDark.matches ? 'dark' : 'light');
  let C = PALETTES[theme];
  document.documentElement.dataset.theme = theme;

  const T = {
    docTitle:   ['PBL - Comprehensive machine design exercise',
                 'ABP - Ejercicio integral de diseño de máquinas',
                 'ABP - Exercici integral de disseny de màquines'],
    title:      ['Shaft assembly', 'Conjunto del árbol', "Conjunt de l'arbre"],
    subtitle:   ['{kW} kW, {n} rpm, bearings A (located) and C (floating), helical gear B, V-belt pulley D',
                 '{kW} kW, {n} rpm, rodamientos A (fijo) y C (libre), rueda helicoidal B, polea trapezoidal D',
                 '{kW} kW, {n} rpm, rodaments A (localitzat) i C (lliure), roda helicoïdal B, politja de canals en V D'],
    panelVars:  ['Variables', 'Variables', 'Variables'],
    panelLoads: ['Loads and checks', 'Cargas y comprobaciones', 'Càrregues i comprovacions'],
    dark:       ['Dark', 'Oscuro', 'Fosc'],
    light:      ['Light', 'Claro', 'Clar'],
    pause:      ['Pause', 'Pausar', 'Pausa'],
    play:       ['Play', 'Reproducir', 'Reprodueix'],
    animOn:     ['Animation running', 'Animación en marcha', 'Animació en marxa'],
    animOff:    ['Animation paused', 'Animación en pausa', 'Animació en pausa'],
    forces:     ['Forces', 'Fuerzas', 'Forces'],
    labels:     ['Labels', 'Etiquetas', 'Etiquetes'],
    edges:      ['Edges', 'Aristas', 'Arestes'],
    pinion:     ['Pinion', 'Piñón', 'Pinyó'],
    pulleyD:    ['Pulley D', 'Polea D', 'Politja D'],
    drivenPulley: ['Driven pulley', 'Polea conducida', 'Politja conduïda'],
    expandAll:  ['Expand all', 'Desplegar todo', 'Desplega-ho tot'],
    collapseAll:['Collapse all', 'Plegar todo', 'Plega-ho tot'],
    resetAll:   ['Reset all', 'Restablecer todo', 'Restableix-ho tot'],
    show:       ['show', 'mostrar', 'mostra'],
    reset:      ['reset', 'restablecer', 'restableix'],
    loadsTitle: ['Loads', 'Cargas', 'Càrregues'],
    loadsSub:   ['from current sizes', 'con las dimensiones actuales', 'amb les dimensions actuals'],
    tabVisual:  ['Visual', 'Visual', 'Visual'],
    tabCalc:    ['Calculations', 'Cálculos', 'Càlculs'],
    view3d:     ['3D view', 'Vista 3D', 'Vista 3D'],
    hint3d:     ['click to select, drag to orbit, wheel to zoom, middle or right drag to pan',
                 'clic para seleccionar, arrastrar para orbitar, rueda para zoom, botón central o derecho para desplazar',
                 'clic per seleccionar, arrossegar per orbitar, roda per fer zoom, botó central o dret per desplaçar'],
    view2d:     ['2D views', 'Vistas 2D', 'Vistes 2D'],
    hint2d:     ['side view (x–y) and pulley end view (z–y)',
                 'vista lateral (x–y) y vista frontal de la polea (z–y)',
                 'vista lateral (x–y) i vista frontal de la politja (z–y)'],

    // components
    'c.drive':    ['Power and speed', 'Potencia y velocidad', 'Potència i velocitat'],
    'c.shaft':    ['Shaft', 'Árbol', 'Arbre'],
    'c.bearingA': ['Bearing A (located)', 'Rodamiento A (fijo)', 'Rodament A (localitzat)'],
    'c.gear':     ['Helical gear B', 'Rueda helicoidal B', 'Roda helicoïdal B'],
    'c.pinion':   ['Pinion (motor, drives B)', 'Piñón (motor, acciona B)', 'Pinyó (motor, acciona B)'],
    'c.bearingC': ['Bearing C (floating)', 'Rodamiento C (libre)', 'Rodament C (lliure)'],
    'c.pulley':   ['V-belt pulley D', 'Polea trapezoidal D', 'Politja de canals en V D'],
    'c.layout':   ['Positions along the shaft', 'Posiciones a lo largo del árbol', "Posicions al llarg de l'arbre"],

    // parameters
    'p.drive.kW':     ['Power (kW)', 'Potencia (kW)', 'Potència (kW)'],
    'p.drive.peak': ['Peak load (motor start), × nominal torque', 'Carga de pico (arranque del motor), × par nominal', 'Càrrega de pic (arrencada del motor), × parell nominal'],
    'p.gear.phi':     ['Transverse pressure angle (°)', 'Ángulo de presión transversal (°)', 'Angle de pressió transversal (°)'],
    'p.vbelt.ratio':  ['Belt tension ratio F1/F2', 'Relación de tensiones F1/F2', 'Relació de tensions F1/F2'],
    'p.drive.n':      ['Shaft speed (rpm)', 'Velocidad del árbol (rpm)', "Velocitat de l'arbre (rpm)"],
    'p.shaft.d':      ['Journal diameter (mm)', 'Diámetro del muñón (mm)', 'Diàmetre del monyó (mm)'],
    'p.shaft.ds':     ['Shoulder diameter (mm)', 'Diámetro del resalte (mm)', 'Diàmetre del ressalt (mm)'],
    'p.shaft.overL':  ['Left overhang past A (mm)', 'Voladizo izquierdo tras A (mm)', 'Voladís esquerre més enllà de A (mm)'],
    'p.shaft.Sut': ['Steel ultimate strength Sut (MPa)', 'Resistencia última del acero Sut (MPa)', "Resistència última de l'acer Sut (MPa)"],
    'p.shaft.Sy': ['Steel yield strength Sy (MPa)', 'Límite elástico del acero Sy (MPa)', "Límit elàstic de l'acer Sy (MPa)"],
    'p.shaft.Kf': ['Fatigue stress concentration in bending, Kf', 'Concentración de tensiones a fatiga en flexión, Kf', 'Concentració de tensions a fatiga en flexió, Kf'],
    'p.shaft.Kfs': ['Fatigue stress concentration in torsion, Kfs', 'Concentración de tensiones a fatiga en torsión, Kfs', 'Concentració de tensions a fatiga en torsió, Kfs'],
    'p.shaft.overR':  ['Right overhang past D (mm)', 'Voladizo derecho tras D (mm)', 'Voladís dret més enllà de D (mm)'],
    'p.bearingA.D':   ['Outer diameter (mm)', 'Diámetro exterior (mm)', 'Diàmetre exterior (mm)'],
    'p.bearingA.w':   ['Width (mm)', 'Anchura (mm)', 'Amplada (mm)'],
    'p.bearingC.D':   ['Outer diameter (mm)', 'Diámetro exterior (mm)', 'Diàmetre exterior (mm)'],
    'p.bearingC.w':   ['Width (mm)', 'Anchura (mm)', 'Amplada (mm)'],
    'p.gear.d':       ['Pitch diameter (mm)', 'Diámetro primitivo (mm)', 'Diàmetre primitiu (mm)'],
    'p.gear.w':       ['Face width (mm)', 'Anchura del dentado (mm)', 'Amplada del dentat (mm)'],
    'p.gear.z':       ['Number of teeth', 'Número de dientes', 'Nombre de dents'],
    'p.gear.beta':    ['Helix angle (°)', 'Ángulo de hélice (°)', "Angle d'hèlix (°)"],
    'p.pinion.z':     ['Number of teeth (same module as B)', 'Número de dientes (mismo módulo que B)', 'Nombre de dents (mateix mòdul que B)'],
    'p.pinion.w':     ['Face width (mm)', 'Anchura del dentado (mm)', 'Amplada del dentat (mm)'],
    'p.pulley.D':     ['Outer diameter (mm)', 'Diámetro exterior (mm)', 'Diàmetre exterior (mm)'],
    'p.pulley.w':     ['Width (mm)', 'Anchura (mm)', 'Amplada (mm)'],
    'p.pulley.n':     ['Number of grooves', 'Número de canales', 'Nombre de canals'],
    'p.pulley.depth': ['Groove depth (mm)', 'Profundidad del canal (mm)', 'Profunditat del canal (mm)'],
    'p.layout.ab':    ['A → B distance (mm)', 'Distancia A → B (mm)', 'Distància A → B (mm)'],
    'p.layout.bc':    ['B → C distance (mm)', 'Distancia B → C (mm)', 'Distància B → C (mm)'],
    'p.layout.cd':    ['C → D distance (mm)', 'Distancia C → D (mm)', 'Distància C → D (mm)'],

    // loads panel
    rTorque:  ['Torque T', 'Par T', 'Parell T'],
    rFt:      ['Gear tangential F<sub>t</sub>', 'Tangencial en la rueda F<sub>t</sub>', 'Tangencial a la roda F<sub>t</sub>'],
    rFr:      ['Gear radial F<sub>r</sub>', 'Radial en la rueda F<sub>r</sub>', 'Radial a la roda F<sub>r</sub>'],
    rFa:      ['Gear axial F<sub>a</sub>', 'Axial en la rueda F<sub>a</sub>', 'Axial a la roda F<sub>a</sub>'],
    rF1:      ['Belt tight side F<sub>1</sub>', 'Ramal tenso F<sub>1</sub>', 'Ramal tens F<sub>1</sub>'],
    rF2:      ['Belt slack side F<sub>2</sub>', 'Ramal flojo F<sub>2</sub>', 'Ramal fluix F<sub>2</sub>'],
    rPeak:    ['Peak torque ({k} × T)', 'Par de pico ({k} × T)', 'Parell de pic ({k} × T)'],
    rBelt:    ['Belt F<sub>1</sub> − F<sub>2</sub>', 'Correa F<sub>1</sub> − F<sub>2</sub>', 'Corretja F<sub>1</sub> − F<sub>2</sub>'],
    rModule:  ['Gear module (transverse)', 'Módulo (transversal)', 'Mòdul (transversal)'],
    rPinionD: ['Pinion pitch diameter', 'Diámetro primitivo del piñón', 'Diàmetre primitiu del pinyó'],
    rPinionN: ['Pinion speed (ratio {i})', 'Velocidad del piñón (relación {i})', 'Velocitat del pinyó (relació {i})'],
    rLength:  ['Shaft length', 'Longitud del árbol', "Longitud de l'arbre"],

    // calculation steps: titles (ct) and notes (cw)
    ct0: ['Angular speed of the shaft', 'Velocidad angular del árbol', "Velocitat angular de l'arbre"],
    ct1: ['Torque transmitted by the shaft', 'Par transmitido por el árbol', "Parell transmès per l'arbre"],
    ct2: ['Transverse module of gear B', 'Módulo transversal de la rueda B', 'Mòdul transversal de la roda B'],
    ct3: ['Tangential force on gear B', 'Fuerza tangencial en la rueda B', 'Força tangencial a la roda B'],
    ct4: ['Radial force on gear B', 'Fuerza radial en la rueda B', 'Força radial a la roda B'],
    ct5: ['Axial force on gear B', 'Fuerza axial en la rueda B', 'Força axial a la roda B'],
    ct6: ['Belt forces on pulley D', 'Fuerzas de la correa en la polea D', 'Forces de la corretja a la politja D'],
    ct7: ['Pinion pitch diameter', 'Diámetro primitivo del piñón', 'Diàmetre primitiu del pinyó'],
    ct8: ['Gear ratio and pinion speed', 'Relación de transmisión y velocidad del piñón', 'Relació de transmissió i velocitat del pinyó'],
    ct9: ['Shaft length', 'Longitud del árbol', "Longitud de l'arbre"],
    // gear check steps (table lookups)
    'c.design':   ['Gear check', 'Comprobación del engranaje', "Comprovació de l'engranatge"],
    'p.design.life': ['Required gear life (h)', 'Vida requerida de las ruedas (h)', 'Vida requerida de les rodes (h)'],
    'p.design.Qv': ['Quality index Qv', 'Índice de calidad Qv', 'Índex de qualitat Qv'],
    ct10: ['Minimum pinion teeth (interference)', 'Número mínimo de dientes del piñón (interferencia)', 'Nombre mínim de dents del pinyó (interferència)'],
    ct11: ['Normal module and next standard module', 'Módulo normal y siguiente módulo estándar', 'Mòdul normal i següent mòdul estàndard'],
    stdNone: ['above the largest standard module', 'por encima del mayor módulo estándar', 'per sobre del mòdul estàndard més gran'],
    ct12: ['Application factor K<sub>a</sub>', 'Factor de aplicación K<sub>a</sub>', "Factor d'aplicació K<sub>a</sub>"],
    kaSel: ['Driver: electric motor (uniform); Driven machine: moderate shock',
            'Máquina impulsora: motor eléctrico (uniforme); Máquina impulsada: impacto moderado',
            'Màquina impulsora: motor elèctric (uniforme); Màquina impulsada: impacte moderat'],
    ct13: ['Load distribution factor K<sub>m</sub>', 'Factor de distribución de carga K<sub>m</sub>', 'Factor de distribució de càrrega K<sub>m</sub>'],
    kmSel: ['Face width F = {F} mm → row "{row} mm"', 'Anchura de cara F = {F} mm → fila «{row} mm»', 'Amplada de cara F = {F} mm → fila «{row} mm»'],
    ct14: ['Pitch-line velocity and dynamic factor K<sub>v</sub>', 'Velocidad en la línea de paso y factor dinámico K<sub>v</sub>', 'Velocitat a la línia de pas i factor dinàmic K<sub>v</sub>'],
    ct15: ['Bending geometry factor J', 'Factor geométrico de flexión J', 'Factor geomètric de flexió J'],
    jSel:  ['Pinion {np} teeth, gear {ng} teeth → read at {npu} / {ngu}',
            'Piñón de {np} dientes, rueda de {ng} dientes → se lee en {npu} / {ngu}',
            'Pinyó de {np} dents, roda de {ng} dents → es llegeix a {npu} / {ngu}'],
    jNone: ['Pinion {np} teeth, gear {ng} teeth → not in the table',
            'Piñón de {np} dientes, rueda de {ng} dientes → fuera de la tabla',
            'Pinyó de {np} dents, roda de {ng} dents → fora de la taula'],
    jNoneR: ['J not tabulated for this pair', 'J no tabulado para este par', 'J no tabulat per a aquest parell'],
    ct16: ['Elastic coefficient C<sub>p</sub>', 'Coeficiente elástico C<sub>p</sub>', 'Coeficient elàstic C<sub>p</sub>'],
    cpSel: ['Pinion: steel; Gear: steel', 'Piñón: acero; Rueda: acero', 'Pinyó: acer; Roda: acer'],
    ct17: ['Bending stress at the tooth root', 'Tensión de flexión en la raíz del diente', "Tensió de flexió a l'arrel de la dent"],
    noJ:  ['needs J, which is not tabulated for this tooth count', 'requiere J, no tabulado para este número de dientes', 'requereix J, no tabulat per a aquest nombre de dents'],
    // V-belt drive steps
    'c.vbelt':        ['V-belt drive (pulley D)', 'Transmisión por correa trapezoidal (polea D)', 'Transmissió per corretja trapezoïdal (politja D)'],
    'c.vbeltSection': ['Section', 'Sección', 'Secció'],
    'p.vbelt.D2':     ['Other pulley pitch diameter (mm)', 'Diámetro de paso de la otra polea (mm)', "Diàmetre de pas de l'altra politja (mm)"],
    'p.vbelt.C':      ['Centre distance (mm)', 'Distancia entre centros (mm)', 'Distància entre centres (mm)'],
    'p.vbelt.Ks':     ['Service factor Ks', 'Factor de servicio Ks', 'Factor de servei Ks'],
    ct18: ['V-belt: design power', 'Correa trapezoidal: potencia de diseño', 'Corretja trapezoïdal: potència de disseny'],
    ct19: ['V-belt: section', 'Correa trapezoidal: sección', 'Corretja trapezoïdal: secció'],
    secSel: ['P<sub>d</sub> = {P} hp, smaller pulley d = {d} in → section {s}',
             'P<sub>d</sub> = {P} hp, polea menor d = {d} pulg → sección {s}',
             'P<sub>d</sub> = {P} hp, politja menor d = {d} in → secció {s}'],
    ct20: ['V-belt: belt speed', 'Correa trapezoidal: velocidad de la correa', 'Corretja trapezoïdal: velocitat de la corretja'],
    ct21: ['V-belt: belt length and standard belt', 'Correa trapezoidal: longitud y correa normalizada', 'Corretja trapezoïdal: longitud i corretja normalitzada'],
    ct22: ['V-belt: centre distance with the standard belt', 'Correa trapezoidal: distancia entre centros con la correa normalizada', 'Corretja trapezoïdal: distància entre centres amb la corretja normalitzada'],
    ct23: ['V-belt: rated power per belt', 'Correa trapezoidal: potencia tabulada por correa', 'Corretja trapezoïdal: potència tabulada per corretja'],
    ptSel: ['Section {s}, d = {d} in, V = {V} ft/min', 'Sección {s}, d = {d} pulg, V = {V} pies/min', 'Secció {s}, d = {d} in, V = {V} ft/min'],
    ptNone: ['the smaller pulley is below the smallest tabulated diameter', 'la polea menor está por debajo del menor diámetro tabulado', 'la politja menor està per sota del menor diàmetre tabulat'],
    ct24: ['V-belt: contact angle factor K<sub>1</sub>', 'Correa trapezoidal: factor del ángulo de contacto K<sub>1</sub>', "Corretja trapezoïdal: factor de l'angle de contacte K<sub>1</sub>"],
    ct25: ['V-belt: length factor K<sub>2</sub>', 'Correa trapezoidal: factor de longitud K<sub>2</sub>', 'Corretja trapezoïdal: factor de longitud K<sub>2</sub>'],
    k2Sel: ['Belt {b} → section {s}, nominal length {L} in', 'Correa {b} → sección {s}, longitud nominal {L} pulg', 'Corretja {b} → secció {s}, longitud nominal {L} in'],
    ct26: ['V-belt: allowable power and number of belts', 'Correa trapezoidal: potencia admisible y número de correas', 'Corretja trapezoïdal: potència admissible i nombre de corretges'],
    ct27: ['V-belt: belt forces', 'Correa trapezoidal: fuerzas en la correa', 'Corretja trapezoïdal: forces a la corretja'],
    // fixing variables and design checks
    met:        ['Met', 'Se cumple', 'Es compleix'],
    notMet:     ['Not met', 'No se cumple', 'No es compleix'],
    calcLocked: ['Fix at least one variable (the pin next to it) to see the calculations. While every value is still free, only the design checks are shown.',
                 'Fija al menos una variable (la chincheta a su lado) para ver los cálculos. Mientras todos los valores sigan libres, solo se muestran las comprobaciones de diseño.',
                 'Fixa almenys una variable (la xinxeta del costat) per veure els càlculs. Mentre tots els valors siguin lliures, només es mostren les comprovacions de disseny.'],
    whyNone:    ['no value passes all of these checks at once:', 'ningún valor cumple todas estas comprobaciones a la vez:', 'cap valor compleix totes aquestes comprovacions alhora:'],
    whyOut:     ['outside its valid range because of these checks:', 'fuera de su rango válido por estas comprobaciones:', 'fora del seu rang vàlid per aquestes comprovacions:'],
    copyLatex:  ['Copy this equation as LaTeX', 'Copiar esta ecuación como LaTeX', 'Copia aquesta equació com a LaTeX'],
    animSpeed:  ['Animation speed', 'Velocidad de la animación', "Velocitat de l'animació"],
    whyRule:    ['Why this rule?', '¿Por qué esta regla?', 'Per què aquesta regla?'],
    whyNeeds:   ['needs {r}', 'necesita {r}', 'necessita {r}'],
    whyNow:     ['Now:', 'Ahora:', 'Ara:'],
    varsFixed:  ['Fixed', 'Fijas', 'Fixades'],
    varsFree:   ['Free', 'Libres', 'Lliures'],
    rngValid:   ['valid {r}', 'válido {r}', 'vàlid {r}'],
    rngSpan:    ['{a} to {b}', '{a} a {b}', '{a} a {b}'],
    rngAny:     ['any value', 'cualquier valor', 'qualsevol valor'],
    rngNone:    ['no valid value', 'ningún valor válido', 'cap valor vàlid'],
    showCalc:   ['Show the calculation', 'Ver el cálculo', 'Mostra el càlcul'],
    fix:        ['fix', 'fijar', 'fixa'],
    fixed:      ['fixed', 'fijo', 'fixat'],
    checksTitle: ['Design checks', 'Comprobaciones de diseño', 'Comprovacions de disseny'],
    checksCount: ['{a} of {b} pass', '{a} de {b} correctas', '{a} de {b} correctes'],
    bandTip:    ['works from {a} to {b}', 'válido de {a} a {b}', 'vàlid de {a} a {b}'],
    bandNone:   ['No value of this variable makes its checks pass', 'Ningún valor de esta variable cumple sus comprobaciones', "Cap valor d'aquesta variable compleix les seves comprovacions"],
    // why each design check exists (shown with the check in the Calculations tab)
    'y.shoulder': ["The shoulder is the step the bearing rings and the gear rest against, so they cannot slide along the shaft. If it is not larger than the journal there is nothing to rest on. This is a construction rule of the app, not a value from the statement.", "El resalte es el escalón contra el que apoyan los anillos de los rodamientos y la rueda, para que no se desplacen a lo largo del árbol. Si no es mayor que el muñón no hay dónde apoyar. Es una regla constructiva de la app, no un dato del enunciado.", "El ressalt és l'esglaó contra el qual recolzen els anells dels rodaments i la roda, perquè no es desplacin al llarg de l'arbre. Si no és més gran que el monyó no hi ha on recolzar. És una regla constructiva de l'app, no una dada de l'enunciat."],
    'y.bearingA': ["Between the bore and the outer diameter a ball bearing has to fit the inner ring, the balls and the outer ring. The 16 mm is a rough minimum chosen by the app so the drawing is a possible bearing; the real outer diameter comes from the catalogue once the bearing is selected.", "Entre el agujero y el diámetro exterior un rodamiento de bolas debe alojar el anillo interior, las bolas y el anillo exterior. Los 16 mm son un mínimo aproximado elegido por la app para que el dibujo sea un rodamiento posible; el diámetro exterior real sale del catálogo al seleccionar el rodamiento.", "Entre el forat i el diàmetre exterior un rodament de boles ha d'allotjar l'anell interior, les boles i l'anell exterior. Els 16 mm són un mínim aproximat triat per l'app perquè el dibuix sigui un rodament possible; el diàmetre exterior real surt del catàleg en seleccionar el rodament."],
    'y.rim': ["The rim is the material between the tooth roots and the bore. If it is thin, the gear cracks through the rim instead of at the tooth root, and the bending stress formula no longer holds. AGMA keeps its rim factor at 1 (no penalty) only while the rim is at least 1.2 times the whole tooth depth, which is 2.25 modules.", "La llanta es el material entre el pie de los dientes y el agujero. Si es delgada, la rueda se agrieta a través de la llanta en lugar de por el pie del diente, y la fórmula de la tensión de flexión deja de valer. AGMA mantiene su factor de llanta en 1 (sin penalización) solo mientras la llanta sea al menos 1,2 veces la altura total del diente, que es 2,25 módulos.", "La llanta és el material entre el peu de les dents i el forat. Si és prima, la roda s'esquerda a través de la llanta en lloc de pel peu de la dent, i la fórmula de la tensió de flexió deixa de valdre. AGMA manté el seu factor de llanta en 1 (sense penalització) només mentre la llanta sigui almenys 1,2 vegades l'alçada total de la dent, que és 2,25 mòduls."],
    'y.face': ["The face width F shares the tooth load along its length. Too narrow (under 8 modules) and the load per millimetre, and so the stress, is high. Too wide (over 16 modules) and the shaft's bending and misalignment stop the load from spreading evenly, so one end of the tooth carries most of it and the extra width is wasted. That is why the limits are multiples of the module: they scale with the tooth size.", "El ancho de cara F reparte la carga del diente a lo largo de su longitud. Demasiado estrecho (menos de 8 módulos) y la carga por milímetro, y por tanto la tensión, es alta. Demasiado ancho (más de 16 módulos) y la flexión del árbol y la desalineación impiden que la carga se reparta por igual, de modo que un extremo del diente soporta casi todo y el ancho extra no sirve. Por eso los límites son múltiplos del módulo: crecen con el tamaño del diente.", "L'amplada de cara F reparteix la càrrega de la dent al llarg de la seva longitud. Massa estreta (menys de 8 mòduls) i la càrrega per mil·límetre, i per tant la tensió, és alta. Massa ampla (més de 16 mòduls) i la flexió de l'arbre i la desalineació impedeixen que la càrrega es reparteixi per igual, de manera que un extrem de la dent ho suporta gairebé tot i l'amplada extra no serveix. Per això els límits són múltiples del mòdul: creixen amb la mida de la dent."],
    'y.minTeeth': ["With too few teeth, the tip of the mating tooth reaches below the base circle of the pinion and digs into the flank near its root (interference). Cutting the gear then removes that material (undercut) and weakens the tooth. The minimum number depends only on the pressure angle: a larger angle allows fewer teeth.", "Con muy pocos dientes, la punta del diente conjugado llega por debajo de la circunferencia base del piñón y se clava en el flanco cerca del pie (interferencia). Al tallar la rueda ese material se elimina (socavado) y el diente queda debilitado. El número mínimo depende solo del ángulo de presión: un ángulo mayor permite menos dientes.", "Amb massa poques dents, la punta de la dent conjugada arriba per sota de la circumferència base del pinyó i es clava al flanc prop del peu (interferència). En tallar la roda aquest material s'elimina (soscavat) i la dent queda debilitada. El nombre mínim depèn només de l'angle de pressió: un angle més gran permet menys dents."],
    'y.motor': ["The pinion is on the motor shaft, so it turns at the motor speed. The ratio of teeth is what turns that speed into the speed the shaft needs: n × zB / zp has to equal the motor speed. Teeth are whole numbers, so the exact ratio is rarely possible; the 2 % allowed is a tolerance chosen by the app.", "El piñón está en el eje del motor, así que gira a la velocidad del motor. La relación de dientes es la que convierte esa velocidad en la que necesita el árbol: n × zB / zp debe ser igual a la velocidad del motor. Los dientes son números enteros, por lo que la relación exacta rara vez es posible; el 2 % admitido es una tolerancia elegida por la app.", "El pinyó és a l'eix del motor, de manera que gira a la velocitat del motor. La relació de dents és la que converteix aquesta velocitat en la que necessita l'arbre: n × zB / zp ha de ser igual a la velocitat del motor. Les dents són nombres enters, per això la relació exacta poques vegades és possible; el 2 % admès és una tolerància triada per l'app."],
    'y.pinionW': ["The pinion is usually made a little wider than the gear so that the whole face of the gear stays in mesh even if the two are not perfectly aligned along the shaft. The pinion is also the cheaper part to widen. This is common practice, not a value from the statement.", "El piñón suele hacerse algo más ancho que la rueda para que toda la cara de la rueda siga engranando aunque no estén perfectamente alineados a lo largo del árbol. Además el piñón es la pieza más barata de ensanchar. Es práctica habitual, no un dato del enunciado.", "El pinyó se sol fer una mica més ample que la roda perquè tota la cara de la roda continuï engranant encara que no estiguin perfectament alineats al llarg de l'arbre. A més, el pinyó és la peça més barata d'eixamplar. És pràctica habitual, no una dada de l'enunciat."],
    'y.groove': ["A V-belt grips by wedging its sides into the groove. The groove must be at least as deep as the belt section (b), or the belt sits on the bottom and loses the wedge effect. Under the groove there must still be material above the hub; the 5 mm is the app's own margin.", "Una correa trapezoidal agarra al acuñarse por sus flancos en la canal. La canal debe ser al menos tan profunda como la sección de la correa (b); si no, la correa apoya en el fondo y pierde el efecto cuña. Bajo la canal debe quedar material por encima del cubo; los 5 mm son un margen propio de la app.", "Una corretja trapezoïdal agafa en falcar-se pels flancs dins la canal. La canal ha de ser almenys tan fonda com la secció de la corretja (b); si no, la corretja recolza al fons i perd l'efecte falca. Sota la canal ha de quedar material per sobre del cub; els 5 mm són un marge propi de l'app."],
    'y.pitch': ["Each groove needs the top width of the belt section (a) plus a wall between it and the next groove; the 3 mm of wall is the app's own value. If the pulley is narrower than that times the number of grooves, the belts do not fit side by side.", "Cada canal necesita el ancho superior de la sección de la correa (a) más una pared entre ella y la siguiente; los 3 mm de pared son un valor propio de la app. Si la polea es más estrecha que eso por el número de canales, las correas no caben una junto a otra.", "Cada canal necessita l'amplada superior de la secció de la corretja (a) més una paret entre ella i la següent; els 3 mm de paret són un valor propi de l'app. Si la politja és més estreta que això pel nombre de canals, les corretges no caben de costat."],
    'y.dmin': ["A belt bends every time it goes round a pulley. On a pulley that is too small it bends too sharply, which overstresses its cords and shortens its life quickly. Each belt section has a minimum pulley diameter in the T12 table for that reason.", "Una correa se dobla cada vez que pasa por una polea. En una polea demasiado pequeña se dobla en exceso, lo que sobrecarga sus cuerdas y acorta mucho su vida. Por eso cada sección de correa tiene un diámetro mínimo de polea en la tabla de T12.", "Una corretja es doblega cada vegada que passa per una politja. En una politja massa petita es doblega en excés, cosa que sobrecarrega les seves cordes i n'escurça molt la vida. Per això cada secció de corretja té un diàmetre mínim de politja a la taula de T12."],
    'y.speed': ["The belt power tables of T12 only go up to 5000 ft/min. Above that, centrifugal force throws the belt outwards, it presses less on the grooves and transmits less, so the tables can no longer be used.", "Las tablas de potencia de las correas de T12 solo llegan a 5000 ft/min. Por encima, la fuerza centrífuga lanza la correa hacia fuera, aprieta menos en las canales y transmite menos, de modo que las tablas ya no sirven.", "Les taules de potència de les corretges de T12 només arriben a 5000 ft/min. Per sobre, la força centrífuga llança la corretja cap enfora, prem menys a les canals i transmet menys, de manera que les taules ja no serveixen."],
    'y.centre': ["If the pulleys are too close (C below the larger diameter), the belt wraps little of the small pulley, so it slips, and each point of the belt bends too often. If they are too far apart (C above three times the sum of the diameters), the long free spans vibrate and whip. T12 gives this range.", "Si las poleas están demasiado cerca (C menor que el diámetro mayor), la correa abraza poco la polea pequeña, por lo que patina, y cada punto de la correa se dobla con demasiada frecuencia. Si están demasiado lejos (C mayor que tres veces la suma de los diámetros), los tramos libres largos vibran y dan latigazos. T12 da este intervalo.", "Si les politges són massa a prop (C més petit que el diàmetre gran), la corretja abraça poc la politja petita, per això patina, i cada punt de la corretja es doblega massa sovint. Si són massa lluny (C més gran que tres vegades la suma dels diàmetres), els trams lliures llargs vibren i fan fuetades. T12 dona aquest interval."],
    'y.fatigue': ["The loads keep their direction while the shaft turns, so every point of its surface goes from tension to compression once per turn: millions of cycles. A stress far below the yield strength can then start a crack. The Goodman factor compares the stresses with what the steel endures for an unlimited number of cycles, and the statement asks for at least 2.0.", "Las cargas mantienen su dirección mientras el árbol gira, así que cada punto de su superficie pasa de tracción a compresión una vez por vuelta: millones de ciclos. Una tensión muy inferior al límite elástico puede entonces iniciar una grieta. El coeficiente de Goodman compara las tensiones con lo que el acero aguanta durante un número ilimitado de ciclos, y el enunciado pide al menos 2,0.", "Les càrregues mantenen la seva direcció mentre l'arbre gira, de manera que cada punt de la seva superfície passa de tracció a compressió un cop per volta: milions de cicles. Una tensió molt inferior al límit elàstic pot llavors iniciar una esquerda. El coeficient de Goodman compara les tensions amb el que l'acer aguanta durant un nombre il·limitat de cicles, i l'enunciat demana almenys 2,0."],
    'y.peak': ["When the motor starts it gives 2.5 times the nominal torque for a moment. That happens too few times to cause fatigue, but a single peak can bend the shaft permanently if the stress reaches the yield strength. So the largest stress at the peak is compared with the yield strength, and the statement asks for a factor of at least 1.5.", "Al arrancar, el motor da 2,5 veces el par nominal durante un instante. Eso ocurre muy pocas veces para causar fatiga, pero un solo pico puede doblar el árbol de forma permanente si la tensión alcanza el límite elástico. Por eso la tensión máxima en el pico se compara con el límite elástico, y el enunciado pide un coeficiente de al menos 1,5.", "En arrencar, el motor dona 2,5 vegades el parell nominal durant un instant. Això passa massa poques vegades per causar fatiga, però un sol pic pot doblegar l'arbre de manera permanent si la tensió arriba al límit elàstic. Per això la tensió màxima al pic es compara amb el límit elàstic, i l'enunciat demana un coeficient d'almenys 1,5."],
    'y.belts': ["One belt can only carry a limited power (its table value, corrected for wrap angle and length). The number of belts is the design power divided by that, rounded up, and every belt needs its own groove on the pulley.", "Una correa solo puede transmitir una potencia limitada (su valor de tabla, corregido por el ángulo de contacto y la longitud). El número de correas es la potencia de diseño dividida por ese valor, redondeado hacia arriba, y cada correa necesita su propia canal en la polea.", "Una corretja només pot transmetre una potència limitada (el seu valor de taula, corregit per l'angle de contacte i la longitud). El nombre de corretges és la potència de disseny dividida per aquest valor, arrodonit cap amunt, i cada corretja necessita la seva pròpia canal a la politja."],
    'y.bearingC': ["Between the bore and the outer diameter a ball bearing has to fit the inner ring, the balls and the outer ring. The 16 mm is a rough minimum chosen by the app so the drawing is a possible bearing; the real outer diameter comes from the catalogue once the bearing is selected.", "Entre el agujero y el diámetro exterior un rodamiento de bolas debe alojar el anillo interior, las bolas y el anillo exterior. Los 16 mm son un mínimo aproximado elegido por la app para que el dibujo sea un rodamiento posible; el diámetro exterior real sale del catálogo al seleccionar el rodamiento.", "Entre el forat i el diàmetre exterior un rodament de boles ha d'allotjar l'anell interior, les boles i l'anell exterior. Els 16 mm són un mínim aproximat triat per l'app perquè el dibuix sigui un rodament possible; el diàmetre exterior real surt del catàleg en seleccionar el rodament."],
    'y.roomAB': ["The statement fixes the distance between the centres of the two parts. Half the width of each has to fit in that distance, plus 2 mm so they do not touch (the gap is the app's choice). Otherwise the parts would occupy the same space.", "El enunciado fija la distancia entre los centros de las dos piezas. La mitad del ancho de cada una debe caber en esa distancia, más 2 mm para que no se toquen (la holgura la elige la app). De lo contrario las piezas ocuparían el mismo espacio.", "L'enunciat fixa la distància entre els centres de les dues peces. La meitat de l'amplada de cadascuna ha de cabre en aquesta distància, més 2 mm perquè no es toquin (el joc el tria l'app). Altrament les peces ocuparien el mateix espai."],
    'y.roomBC': ["The statement fixes the distance between the centres of the two parts. Half the width of each has to fit in that distance, plus 2 mm so they do not touch (the gap is the app's choice). Otherwise the parts would occupy the same space.", "El enunciado fija la distancia entre los centros de las dos piezas. La mitad del ancho de cada una debe caber en esa distancia, más 2 mm para que no se toquen (la holgura la elige la app). De lo contrario las piezas ocuparían el mismo espacio.", "L'enunciat fixa la distància entre els centres de les dues peces. La meitat de l'amplada de cadascuna ha de cabre en aquesta distància, més 2 mm perquè no es toquin (el joc el tria l'app). Altrament les peces ocuparien el mateix espai."],
    'y.roomCD': ["The statement fixes the distance between the centres of the two parts. Half the width of each has to fit in that distance, plus 2 mm so they do not touch (the gap is the app's choice). Otherwise the parts would occupy the same space.", "El enunciado fija la distancia entre los centros de las dos piezas. La mitad del ancho de cada una debe caber en esa distancia, más 2 mm para que no se toquen (la holgura la elige la app). De lo contrario las piezas ocuparían el mismo espacio.", "L'enunciat fixa la distància entre els centres de les dues peces. La meitat de l'amplada de cadascuna ha de cabre en aquesta distància, més 2 mm perquè no es toquin (el joc el tria l'app). Altrament les peces ocuparien el mateix espai."],
    'k.shoulder': ['Shaft shoulder larger than the journal', 'Resalte del árbol mayor que el muñón', "Ressalt de l'arbre més gran que el monyó"],
    'k.bearingA': ['Bearing A outer diameter leaves room for the rings (bore + 16 mm)', 'Diámetro exterior del rodamiento A con espacio para los aros (agujero + 16 mm)', 'Diàmetre exterior del rodament A amb espai per als anells (forat + 16 mm)'],
    'k.bearingC': ['Bearing C outer diameter leaves room for the rings (bore + 16 mm)', 'Diámetro exterior del rodamiento C con espacio para los aros (agujero + 16 mm)', 'Diàmetre exterior del rodament C amb espai per als anells (forat + 16 mm)'],
    'k.rim':      ['Gear B rim at least 1.2 × the tooth depth', 'Llanta de la rueda B de al menos 1,2 × la altura del diente', "Llanta de la roda B d'almenys 1,2 × l'alçada de la dent"],
    'k.face':     ['Gear B face width between 8 and 16 modules', 'Anchura de la rueda B entre 8 y 16 módulos', 'Amplada de la roda B entre 8 i 16 mòduls'],
    'k.minTeeth': ['Pinion has at least the minimum teeth without interference', 'El piñón tiene al menos el mínimo de dientes sin interferencia', 'El pinyó té almenys el mínim de dents sense interferència'],
    'k.motor':    ['Pinion speed within 2 % of the motor speed', 'Velocidad del piñón dentro del 2 % de la velocidad del motor', 'Velocitat del pinyó dins del 2 % de la velocitat del motor'],
    'k.pinionW':  ['Pinion at least as wide as gear B', 'Piñón al menos tan ancho como la rueda B', 'Pinyó almenys tan ample com la roda B'],
    'k.roomAB':   ['Bearing A and the gears do not overlap along the shaft', 'El rodamiento A y los engranajes no se solapan a lo largo del árbol', "El rodament A i els engranatges no se solapen al llarg de l'arbre"],
    'k.roomBC':   ['The gears and bearing C do not overlap along the shaft', 'Los engranajes y el rodamiento C no se solapan a lo largo del árbol', "Els engranatges i el rodament C no se solapen al llarg de l'arbre"],
    'k.roomCD':   ['Bearing C and pulley D do not overlap along the shaft', 'El rodamiento C y la polea D no se solapan a lo largo del árbol', "El rodament C i la politja D no se solapen al llarg de l'arbre"],
    'k.groove':   ['Pulley D grooves deep enough for the belt and clear of the hub', 'Canales de la polea D con profundidad suficiente para la correa y sin tocar el cubo', 'Canals de la politja D prou profunds per a la corretja i sense tocar la boixa'],
    'k.pitch':    ['Pulley D wide enough for its grooves', 'Polea D con anchura suficiente para sus canales', 'Politja D prou ampla per als seus canals'],
    'k.dmin':     ['Smaller pulley at least the minimum diameter of the belt section', 'Polea menor de al menos el diámetro mínimo de la sección de correa', "Politja menor d'almenys el diàmetre mínim de la secció de corretja"],
    'k.speed':    ['Belt speed within the rated range (up to 5000 ft/min)', 'Velocidad de la correa dentro del intervalo tabulado (hasta 5000 pies/min)', "Velocitat de la corretja dins de l'interval tabulat (fins a 5000 ft/min)"],
    'k.centre':   ['Centre distance between D and 3 (D + d)', 'Distancia entre centros entre D y 3 (D + d)', 'Distància entre centres entre D i 3 (D + d)'],
    'k.fatigue':  ['Shaft fatigue safety factor reached (infinite life)', 'Coeficiente de seguridad a fatiga del árbol alcanzado (vida infinita)', "Coeficient de seguretat a fatiga de l'arbre assolit (vida infinita)"],
    'k.peak':     ['Shaft does not yield at the starting peak', 'El árbol no plastifica en el pico de arranque', "L'arbre no plastifica en el pic d'arrencada"],
    'k.belts':    ['Enough grooves for the belts needed', 'Canales suficientes para las correas necesarias', 'Canals suficients per a les corretges necessàries'],
    ct28: ['Gear life: load cycles', 'Vida de las ruedas: ciclos de carga', 'Vida de les rodes: cicles de càrrega'],
    ct29: ['Gear life: bending life factor K<sub>L</sub>', 'Vida de las ruedas: factor de vida a flexión K<sub>L</sub>', 'Vida de les rodes: factor de vida a flexió K<sub>L</sub>'],
    ct30: ['Gear life: surface life factor C<sub>L</sub>', 'Vida de las ruedas: factor de vida superficial C<sub>L</sub>', 'Vida de les rodes: factor de vida superficial C<sub>L</sub>'],
    // starting data of the statement
    'c.given':          ['Bearings: life and conditions', 'Rodamientos: vida y condiciones', 'Rodaments: vida i condicions'],
    'p.given.motor':    ['Motor speed (rpm)', 'Velocidad del motor (rpm)', 'Velocitat del motor (rpm)'],
    'p.given.nf':       ['Shaft fatigue safety factor (infinite life)', 'Coeficiente de seguridad a fatiga del árbol (vida infinita)', "Coeficient de seguretat a fatiga de l'arbre (vida infinita)"],
    'p.given.relShaft': ['Shaft reliability (%)', 'Fiabilidad del árbol (%)', "Fiabilitat de l'arbre (%)"],
    'p.given.npeak': ['Peak safety factor, minimum (Npic)', 'Coeficiente de seguridad de pico, mínimo (Npic)', 'Coeficient de seguretat de pic, mínim (Npic)'],
    'p.given.bearLife': ['Bearing life (h)', 'Vida de los rodamientos (h)', 'Vida dels rodaments (h)'],
    'p.given.relBear':  ['Bearing reliability (%)', 'Fiabilidad de los rodamientos (%)', 'Fiabilitat dels rodaments (%)'],
    'p.given.temp':     ['Working temperature (°C)', 'Temperatura de trabajo (°C)', 'Temperatura de treball (°C)'],
    ct31: ['Temperature factor K<sub>T</sub>', 'Factor de temperatura K<sub>T</sub>', 'Factor de temperatura K<sub>T</sub>'],
    ct32: ['Bearings: required life in revolutions', 'Rodamientos: vida requerida en revoluciones', 'Rodaments: vida requerida en revolucions'],
    ct33: ['Shaft: bearing reactions, vertical plane (x, y)', 'Árbol: reacciones en los rodamientos, plano vertical (x, y)', 'Arbre: reaccions als rodaments, pla vertical (x, y)'],
    ct34: ['Shaft: bearing reactions, horizontal plane (x, z)', 'Árbol: reacciones en los rodamientos, plano horizontal (x, z)', 'Arbre: reaccions als rodaments, pla horitzontal (x, z)'],
    ct35: ['Shaft: bending moments at the critical sections', 'Árbol: momentos flectores en las secciones críticas', 'Arbre: moments flectors a les seccions crítiques'],
    ct36: ['Shaft: endurance limit S<sub>e</sub>', 'Árbol: límite de fatiga S<sub>e</sub>', 'Arbre: límit de fatiga S<sub>e</sub>'],
    ct37: ['Shaft: stresses at the critical sections', 'Árbol: tensiones en las secciones críticas', 'Arbre: tensions a les seccions crítiques'],
    ct38: ['Shaft: fatigue safety factor (Goodman)', 'Árbol: coeficiente de seguridad a fatiga (Goodman)', 'Arbre: coeficient de seguretat a fatiga (Goodman)'],
    ct39: ['Shaft: yield safety factor at the starting peak', 'Árbol: coeficiente de seguridad a fluencia en el pico de arranque', "Arbre: coeficient de seguretat a fluència en el pic d'arrencada"],
    // under each worked step: what every symbol of its equation is
    cv0: ["n is the shaft speed.", "n es la velocidad del árbol.", "n és la velocitat de l'arbre."],
    cv1: ["P is the power transmitted. ω is the angular speed of the shaft.", "P es la potencia transmitida. ω es la velocidad angular del árbol.", "P és la potència transmesa. ω és la velocitat angular de l'arbre."],
    cv2: ["d<sub>B</sub> is the pitch diameter of gear B. z<sub>B</sub> is its number of teeth.", "d<sub>B</sub> es el diámetro primitivo de la rueda B. z<sub>B</sub> es su número de dientes.", "d<sub>B</sub> és el diàmetre primitiu de la roda B. z<sub>B</sub> és el seu nombre de dents."],
    cv3: ["T is the torque on the shaft. d<sub>B</sub> is the pitch diameter of gear B.", "T es el par en el árbol. d<sub>B</sub> es el diámetro primitivo de la rueda B.", "T és el parell a l'arbre. d<sub>B</sub> és el diàmetre primitiu de la roda B."],
    cv4: ["F<sub>t</sub> is the tangential force on gear B. φ<sub>t</sub> is the transverse pressure angle.", "F<sub>t</sub> es la fuerza tangencial en la rueda B. φ<sub>t</sub> es el ángulo de presión transversal.", "F<sub>t</sub> és la força tangencial a la roda B. φ<sub>t</sub> és l'angle de pressió transversal."],
    cv5: ["F<sub>t</sub> is the tangential force on gear B. β is the helix angle.", "F<sub>t</sub> es la fuerza tangencial en la rueda B. β es el ángulo de hélice.", "F<sub>t</sub> és la força tangencial a la roda B. β és l'angle d'hèlix."],
    cv6: ["T is the torque on the shaft. D is the outer diameter of pulley D. k is the ratio of belt tensions F<sub>1</sub> / F<sub>2</sub>.", "T es el par en el árbol. D es el diámetro exterior de la polea D. k es la relación de tensiones de las correas F<sub>1</sub> / F<sub>2</sub>.", "T és el parell a l'arbre. D és el diàmetre exterior de la politja D. k és la relació de tensions de les corretges F<sub>1</sub> / F<sub>2</sub>."],
    cv7: ["m<sub>t</sub> is the transverse module. z<sub>p</sub> is the number of teeth of the pinion.", "m<sub>t</sub> es el módulo transversal. z<sub>p</sub> es el número de dientes del piñón.", "m<sub>t</sub> és el mòdul transversal. z<sub>p</sub> és el nombre de dents del pinyó."],
    cv8: ["z<sub>B</sub> and z<sub>p</sub> are the numbers of teeth of gear B and of the pinion. n is the shaft speed.", "z<sub>B</sub> y z<sub>p</sub> son los números de dientes de la rueda B y del piñón. n es la velocidad del árbol.", "z<sub>B</sub> i z<sub>p</sub> són els nombres de dents de la roda B i del pinyó. n és la velocitat de l'arbre."],
    cv9: ["e<sub>L</sub> and e<sub>R</sub> are the left and right overhangs. w<sub>A</sub> and w<sub>D</sub> are the widths of bearing A and of pulley D. AB, BC and CD are the distances between the parts.", "e<sub>L</sub> y e<sub>R</sub> son los voladizos izquierdo y derecho. w<sub>A</sub> y w<sub>D</sub> son los anchos del rodamiento A y de la polea D. AB, BC y CD son las distancias entre las piezas.", "e<sub>L</sub> i e<sub>R</sub> són els voladissos esquerre i dret. w<sub>A</sub> i w<sub>D</sub> són les amplades del rodament A i de la politja D. AB, BC i CD són les distàncies entre les peces."],
    cv10: ["φ is the transverse pressure angle.", "φ es el ángulo de presión transversal.", "φ és l'angle de pressió transversal."],
    cv11: ["m<sub>t</sub> is the transverse module. β is the helix angle.", "m<sub>t</sub> es el módulo transversal. β es el ángulo de hélice.", "m<sub>t</sub> és el mòdul transversal. β és l'angle d'hèlix."],
    cv12: ["K<sub>a</sub> is read from the table with the kind of driver and of driven machine.", "K<sub>a</sub> se lee en la tabla con el tipo de máquina motriz y de máquina conducida.", "K<sub>a</sub> es llegeix a la taula amb el tipus de màquina motriu i de màquina conduïda."],
    cv13: ["F is the face width of gear B. K<sub>m</sub> is read at the next tabulated width up.", "F es el ancho de cara de la rueda B. K<sub>m</sub> se lee en el siguiente ancho tabulado.", "F és l'amplada de cara de la roda B. K<sub>m</sub> es llegeix a la següent amplada tabulada."],
    cv14: ["ω is the angular speed of the shaft. d<sub>B</sub> is the pitch diameter of gear B. Q<sub>v</sub> is the gear quality index, which picks the curve of K<sub>v</sub>.", "ω es la velocidad angular del árbol. d<sub>B</sub> es el diámetro primitivo de la rueda B. Q<sub>v</sub> es el índice de calidad del engranaje, que elige la curva de K<sub>v</sub>.", "ω és la velocitat angular de l'arbre. d<sub>B</sub> és el diàmetre primitiu de la roda B. Q<sub>v</sub> és l'índex de qualitat de l'engranatge, que tria la corba de K<sub>v</sub>."],
    cv15: ["J is read from the table with the number of teeth of the pinion and of the gear.", "J se lee en la tabla con el número de dientes del piñón y de la rueda.", "J es llegeix a la taula amb el nombre de dents del pinyó i de la roda."],
    cv16: ["C<sub>p</sub> is read from the table with the materials of the pinion and of the gear.", "C<sub>p</sub> se lee en la tabla con los materiales del piñón y de la rueda.", "C<sub>p</sub> es llegeix a la taula amb els materials del pinyó i de la roda."],
    cv17: ["F<sub>t</sub> is the tangential force. F is the face width of gear B. m is the transverse module. J is the bending geometry factor. K<sub>a</sub>, K<sub>m</sub> and K<sub>v</sub> are the application, load distribution and dynamic factors.", "F<sub>t</sub> es la fuerza tangencial. F es el ancho de cara de la rueda B. m es el módulo transversal. J es el factor geométrico de flexión. K<sub>a</sub>, K<sub>m</sub> y K<sub>v</sub> son los factores de aplicación, de distribución de carga y dinámico.", "F<sub>t</sub> és la força tangencial. F és l'amplada de cara de la roda B. m és el mòdul transversal. J és el factor geomètric de flexió. K<sub>a</sub>, K<sub>m</sub> i K<sub>v</sub> són els factors d'aplicació, de distribució de càrrega i dinàmic."],
    cv18: ["P<sub>nom</sub> is the power transmitted. K<sub>s</sub> is the service factor. N<sub>d</sub> is the design factor.", "P<sub>nom</sub> es la potencia transmitida. K<sub>s</sub> es el factor de servicio. N<sub>d</sub> es el factor de diseño.", "P<sub>nom</sub> és la potència transmesa. K<sub>s</sub> és el factor de servei. N<sub>d</sub> és el factor de disseny."],
    cv19: ["P<sub>d</sub> is the design power. d is the diameter of the smaller pulley.", "P<sub>d</sub> es la potencia de diseño. d es el diámetro de la polea menor.", "P<sub>d</sub> és la potència de disseny. d és el diàmetre de la politja petita."],
    cv20: ["d is the diameter of pulley D, in inches. n is the shaft speed.", "d es el diámetro de la polea D, en pulgadas. n es la velocidad del árbol.", "d és el diàmetre de la politja D, en polzades. n és la velocitat de l'arbre."],
    cv21: ["C is the centre distance. D and d are the diameters of the larger and of the smaller pulley.", "C es la distancia entre centros. D y d son los diámetros de la polea mayor y de la menor.", "C és la distància entre centres. D i d són els diàmetres de la politja gran i de la petita."],
    cv22: ["L<sub>p</sub> is the pitch length of the standard belt. D and d are the diameters of the larger and of the smaller pulley.", "L<sub>p</sub> es la longitud primitiva de la correa normalizada. D y d son los diámetros de la polea mayor y de la menor.", "L<sub>p</sub> és la longitud primitiva de la corretja normalitzada. D i d són els diàmetres de la politja gran i de la petita."],
    cv23: ["P<sub>tab</sub> is read from the table with the belt section, the diameter d of the smaller pulley and the belt speed V.", "P<sub>tab</sub> se lee en la tabla con la sección de la correa, el diámetro d de la polea menor y la velocidad V de la correa.", "P<sub>tab</sub> es llegeix a la taula amb la secció de la corretja, el diàmetre d de la politja petita i la velocitat V de la corretja."],
    cv24: ["D and d are the diameters of the larger and of the smaller pulley. C is the centre distance. K<sub>1</sub> is read from the table with this value.", "D y d son los diámetros de la polea mayor y de la menor. C es la distancia entre centros. K<sub>1</sub> se lee en la tabla con este valor.", "D i d són els diàmetres de la politja gran i de la petita. C és la distància entre centres. K<sub>1</sub> es llegeix a la taula amb aquest valor."],
    cv25: ["K<sub>2</sub> is read from the table with the belt section and its nominal length.", "K<sub>2</sub> se lee en la tabla con la sección de la correa y su longitud nominal.", "K<sub>2</sub> es llegeix a la taula amb la secció de la corretja i la seva longitud nominal."],
    cv26: ["K<sub>1</sub> is the contact angle factor. K<sub>2</sub> is the length factor. P<sub>tab</sub> is the rated power of one belt. P<sub>d</sub> is the design power.", "K<sub>1</sub> es el factor de ángulo de contacto. K<sub>2</sub> es el factor de longitud. P<sub>tab</sub> es la potencia nominal de una correa. P<sub>d</sub> es la potencia de diseño.", "K<sub>1</sub> és el factor d'angle de contacte. K<sub>2</sub> és el factor de longitud. P<sub>tab</sub> és la potència nominal d'una corretja. P<sub>d</sub> és la potència de disseny."],
    cv27: ["K<sub>c</sub> is the centrifugal constant of the belt section. V is the belt speed. T is the torque. d is the diameter of the smaller pulley. N<sub>b</sub> is the number of belts. θ is the contact angle on the smaller pulley.", "K<sub>c</sub> es la constante centrífuga de la sección de la correa. V es la velocidad de la correa. T es el par. d es el diámetro de la polea menor. N<sub>b</sub> es el número de correas. θ es el ángulo de contacto en la polea menor.", "K<sub>c</sub> és la constant centrífuga de la secció de la corretja. V és la velocitat de la corretja. T és el parell. d és el diàmetre de la politja petita. N<sub>b</sub> és el nombre de corretges. θ és l'angle de contacte a la politja petita."],
    cv28: ["n is the speed of the wheel (pinion or gear). h is the required gear life, in hours.", "n es la velocidad de la rueda (piñón o rueda). h es la vida requerida de las ruedas, en horas.", "n és la velocitat de la roda (pinyó o roda). h és la vida requerida de les rodes, en hores."],
    cv29: ["N is the number of load cycles.", "N es el número de ciclos de carga.", "N és el nombre de cicles de càrrega."],
    cv30: ["N is the number of load cycles.", "N es el número de ciclos de carga.", "N és el nombre de cicles de càrrega."],
    cv31: ["T is the working temperature. T<sub>F</sub> is the same temperature in °F.", "T es la temperatura de trabajo. T<sub>F</sub> es la misma temperatura en °F.", "T és la temperatura de treball. T<sub>F</sub> és la mateixa temperatura en °F."],
    cv32: ["n is the shaft speed. h is the required bearing life, in hours.", "n es la velocidad del árbol. h es la vida requerida de los rodamientos, en horas.", "n és la velocitat de l'arbre. h és la vida requerida dels rodaments, en hores."],
    cv33: ["F<sub>r</sub> and F<sub>a</sub> are the radial and axial forces on gear B. d<sub>B</sub> is the pitch diameter of gear B. AB and BC are the distances between A, B and C.", "F<sub>r</sub> y F<sub>a</sub> son las fuerzas radial y axial en la rueda B. d<sub>B</sub> es el diámetro primitivo de la rueda B. AB y BC son las distancias entre A, B y C.", "F<sub>r</sub> i F<sub>a</sub> són les forces radial i axial a la roda B. d<sub>B</sub> és el diàmetre primitiu de la roda B. AB i BC són les distàncies entre A, B i C."],
    cv34: ["F<sub>t</sub> is the tangential force on gear B. F<sub>1</sub> and F<sub>2</sub> are the belt forces on pulley D. AB, BC and AD are the distances between the parts.", "F<sub>t</sub> es la fuerza tangencial en la rueda B. F<sub>1</sub> y F<sub>2</sub> son las fuerzas de las correas en la polea D. AB, BC y AD son las distancias entre las piezas.", "F<sub>t</sub> és la força tangencial a la roda B. F<sub>1</sub> i F<sub>2</sub> són les forces de les corretges a la politja D. AB, BC i AD són les distàncies entre les peces."],
    cv35: ["R<sub>Ay</sub>, R<sub>Az</sub> and R<sub>Cy</sub> are the bearing reactions. F<sub>1</sub> and F<sub>2</sub> are the belt forces on pulley D. AB, BC and CD are the distances between the parts.", "R<sub>Ay</sub>, R<sub>Az</sub> y R<sub>Cy</sub> son las reacciones en los rodamientos. F<sub>1</sub> y F<sub>2</sub> son las fuerzas de las correas en la polea D. AB, BC y CD son las distancias entre las piezas.", "R<sub>Ay</sub>, R<sub>Az</sub> i R<sub>Cy</sub> són les reaccions als rodaments. F<sub>1</sub> i F<sub>2</sub> són les forces de les corretges a la politja D. AB, BC i CD són les distàncies entre les peces."],
    cv36: ["S<sub>ut</sub> is the ultimate strength of the steel. S′<sub>e</sub> is the endurance limit of the test specimen. k<sub>a</sub>, k<sub>b</sub> and k<sub>e</sub> are the surface, size and reliability factors. d is the diameter of the section.", "S<sub>ut</sub> es la resistencia última del acero. S′<sub>e</sub> es el límite de fatiga de la probeta. k<sub>a</sub>, k<sub>b</sub> y k<sub>e</sub> son los factores de superficie, de tamaño y de fiabilidad. d es el diámetro de la sección.", "S<sub>ut</sub> és la resistència última de l'acer. S′<sub>e</sub> és el límit de fatiga de la proveta. k<sub>a</sub>, k<sub>b</sub> i k<sub>e</sub> són els factors de superfície, de mida i de fiabilitat. d és el diàmetre de la secció."],
    cv37: ["K<sub>f</sub> and K<sub>fs</sub> are the fatigue stress concentration factors in bending and in torsion. M is the bending moment at the section. T is the torque. F<sub>a</sub> is the axial force on gear B. d is the diameter of the section.", "K<sub>f</sub> y K<sub>fs</sub> son los factores de concentración de tensiones a fatiga en flexión y en torsión. M es el momento flector en la sección. T es el par. F<sub>a</sub> es la fuerza axial en la rueda B. d es el diámetro de la sección.", "K<sub>f</sub> i K<sub>fs</sub> són els factors de concentració de tensions a fatiga en flexió i en torsió. M és el moment flector a la secció. T és el parell. F<sub>a</sub> és la força axial a la roda B. d és el diàmetre de la secció."],
    cv38: ["σ<sub>a</sub> and τ<sub>a</sub> are the alternating stresses. σ<sub>m</sub> and τ<sub>m</sub> are the mean stresses. S<sub>e</sub> is the endurance limit. S<sub>ut</sub> is the ultimate strength of the steel.", "σ<sub>a</sub> y τ<sub>a</sub> son las tensiones alternantes. σ<sub>m</sub> y τ<sub>m</sub> son las tensiones medias. S<sub>e</sub> es el límite de fatiga. S<sub>ut</sub> es la resistencia última del acero.", "σ<sub>a</sub> i τ<sub>a</sub> són les tensions alternants. σ<sub>m</sub> i τ<sub>m</sub> són les tensions mitjanes. S<sub>e</sub> és el límit de fatiga. S<sub>ut</sub> és la resistència última de l'acer."],
    cv39: ["S<sub>y</sub> is the yield strength of the steel. k<sub>pic</sub> is the peak load factor. σ<sub>a</sub>, σ<sub>m, axial</sub> and τ<sub>m</sub> are the stresses at the section.", "S<sub>y</sub> es el límite elástico del acero. k<sub>pic</sub> es el factor de carga de pico. σ<sub>a</sub>, σ<sub>m, axial</sub> y τ<sub>m</sub> son las tensiones en la sección.", "S<sub>y</sub> és el límit elàstic de l'acer. k<sub>pic</sub> és el factor de càrrega de pic. σ<sub>a</sub>, σ<sub>m, axial</sub> i τ<sub>m</sub> són les tensions a la secció."],
    pinionWord: ['pinion', 'piñón', 'pinyó'],
    gearWord:   ['gear', 'rueda', 'roda'],
  };
  const t = key => (T[key] ? T[key][LANGS.indexOf(lang)] : key);

  const SCHEMA = [
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
  const HOME = {
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
  const ICON = {
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

  const P = {};        // P[componentId][paramKey] = value
  const visible = {};  // visible[componentId] = bool
  const opts = { spin: true, forces: true, labels: true, edges: true, showVars: true, showLoads: true };
  const colorOf = {};
  // animation speed, 0.1 to 1 in steps of 0.1 (1 is the full pace); half pace unless one was saved
  const ANIM_SPEED_DEFAULT = 0.5;
  let animSpeed = Number(saved.speed);
  if (!(animSpeed >= 0.1 && animSpeed <= 1)) animSpeed = ANIM_SPEED_DEFAULT;
  animSpeed = Math.round(animSpeed * 10) / 10;

  SCHEMA.forEach(c => {
    P[c.id] = {};
    visible[c.id] = true;
    colorOf[c.id] = C.comp[c.id];
    c.params.forEach(p => { P[c.id][p.key] = p.def; });
  });

  // locked[componentId][paramKey] = true when the user has fixed that variable
  const locked = {};
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
  // Derived geometry shared by the 2D and 3D views
  // ------------------------------------------------------------------
  function derive() {
    POWER_W = P.drive.kW * 1000;
    SPEED_RPM = P.drive.n;
    const s = P.shaft, a = P.bearingA, g = P.gear, c = P.bearingC, p = P.pulley, l = P.layout;
    const d = s.d;
    const ds = Math.max(s.ds, d);
    const xA = 0, xB = l.ab, xC = l.ab + l.bc, xD = l.ab + l.bc + l.cd;

    const m = g.d / g.z;                               // transverse module
    const gear = {
      x: xB, w: g.w, r: g.d / 2, z: g.z, m,
      ra: g.d / 2 + m,
      rf: Math.max(g.d / 2 - 1.25 * m, g.d * 0.25),
      beta: g.beta * Math.PI / 180,
      phi: g.phi * Math.PI / 180,                       // transverse pressure angle: slope of the tooth flanks
    };

    // Pinion: meshes with B from above, same module, opposite helix hand
    const pz = P.pinion.z, pr = m * pz / 2;
    const pinion = {
      x: xB, w: P.pinion.w, z: pz, m, r: pr,
      ra: pr + m,
      rf: Math.max(pr - 1.25 * m, pr * 0.4),
      beta: -gear.beta,
      phi: gear.phi,
      yc: gear.r + pr,
    };

    const bearing = (x, b) => {
      const rIn = d / 2;
      const rOut = Math.max(b.D / 2, rIn + 4);
      const t = (rOut - rIn) * 0.28;                   // ring thickness
      return { x, w: b.w, rIn, rOut, t, rBall: (rOut - rIn - 2 * t) * 0.5 * 0.92, rMid: (rIn + rOut) / 2 };
    };
    const bA = bearing(xA, a), bC = bearing(xC, c);

    const R = p.D / 2;
    const depth = Math.min(p.depth, R - d / 2 - 3);
    const hubLen = Math.min(s.overR * 0.6, 14);
    const pulley = { x: xD, w: p.w, R, n: p.n, depth: Math.max(depth, 1), rBore: d / 2, rHub: Math.min(d * 0.85, R * 0.8), hubLen };

    const x0 = xA - bA.w / 2 - s.overL;
    const x1 = xD + p.w / 2 + s.overR;

    // Stepped shaft: full-length core + shoulders between components + gear seat
    const steps = [
      [xA + bA.w / 2, xB - g.w / 2, ds / 2],
      [xB - g.w / 2,  xB + g.w / 2, (d + ds) / 4],
      [xB + g.w / 2,  xC - bC.w / 2, ds / 2],
    ].filter(st => st[1] - st[0] > 0.5 && st[2] > d / 2);

    const torque = POWER_W / (SPEED_RPM * 2 * Math.PI / 60);   // N m
    const Ft = 2 * torque * 1000 / g.d;                         // N
    const beltNet = 2 * torque * 1000 / p.D, kT = P.vbelt.ratio;   // F1 - F2 and F1 / F2
    const loads = {
      torque, Ft,
      Fr: Ft * Math.tan(P.gear.phi * Math.PI / 180),              // phi is the transverse pressure angle
      Fa: Ft * Math.tan(gear.beta),
      belt: beltNet,
      F1: beltNet * kT / (kT - 1),
      F2: beltNet / (kT - 1),
      peakTorque: torque * P.drive.peak,
    };

    const Rmax = Math.max(gear.ra, R, bA.rOut, bC.rOut, ds / 2);
    return {
      d, ds, xA, xB, xC, xD, x0, x1, len: x1 - x0,
      gear, pinion, bA, bC, pulley, steps, loads,
      vbelt: { C: P.vbelt.C, R2: P.vbelt.D2 / 2 },
      Rmax,
      top: visible.pinion ? Math.max(Rmax, pinion.yc + pinion.ra) : Rmax,   // highest point above the axis
    };
  }

  // Half cross-section of the pulley as [radius, axial offset] pairs (bore → rim with V grooves → hub)
  function pulleyProfile(pl) {
    const { w, R, n, depth, rBore, rHub, hubLen } = pl;
    const pts = [[rBore, -w / 2], [R, -w / 2]];
    const e = w / n;
    for (let i = 0; i < n; i++) {
      const c = -w / 2 + e * (i + 0.5);
      pts.push([R, c - 0.36 * e], [R - depth, c - 0.1 * e], [R - depth, c + 0.1 * e], [R, c + 0.36 * e]);
    }
    pts.push([R, w / 2]);
    if (hubLen > 1 && rHub > rBore) pts.push([rHub, w / 2], [rHub, w / 2 + hubLen], [rBore, w / 2 + hubLen]);
    else pts.push([rBore, w / 2]);
    return pts;
  }

  // ------------------------------------------------------------------
  // Sidebar UI
  // ------------------------------------------------------------------
  const $ = sel => document.querySelector(sel);
  const inputs = [];   // { comp, param, range, number }
  const cards = {};    // cards[componentId] = sidebar card element

  function buildUI() {
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
      animSpeed = ANIM_SPEED_DEFAULT;
      $('#selSpeed').value = String(animSpeed);
      syncInputs();
      refresh();
    });
    $('#btnTheme').addEventListener('click', () => { themeChosen = true; setTheme(theme === 'dark' ? 'light' : 'dark'); });
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
    speedSel.addEventListener('change', () => { animSpeed = Number(speedSel.value); saveState(); });
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
    theme = next;
    C = PALETTES[theme];
    INK = C.ink;
    FORCE = C.force;
    document.documentElement.dataset.theme = theme;
    SCHEMA.forEach(c => {
      colorOf[c.id] = C.comp[c.id];
      if (cards[c.id]) cards[c.id].style.setProperty('--swatch', colorOf[c.id]);
    });
    updateThemeButton();
    refresh();
  }

  function syncInputs() {
    inputs.forEach(i => { i.range.value = i.number.value = P[i.comp][i.key]; });
  }

  function updateReadout(g) {
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

  // Step-by-step list of how every load is obtained, with the current numbers substituted
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
  const SYM_IN = {
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
  function readSymDefs(steps) {
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
  function linkSymbols(html, extra, at) {
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
  function substituteSymbols(html, extra, calc) {
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
  const toLatex = html => stackFractions(html || '', true)
    .replace(/ {2,}/g, ' ').replace(/ ,/g, ',')
    .replace(/(\d) (?=\\text\{|[A-Za-z])/g, '$1\\,')                     // a thin space between a number and its unit
    .replace(/\\,([NWJmsh])(?![A-Za-z_^{])/g, '\\,\\mathrm{$1}')         // one-letter units upright
    .replace(/\\mathrm\{N\} (m|\\text\{mm\})/g, (m, u) => `\\mathrm{N\\,${u === 'm' ? 'm' : 'mm'}}`)
    .trim();
  // latexOf['step-3'] or latexOf['check-face']: the LaTeX the copy button of that equation puts on the clipboard
  let latexOf = {};
  function copyLatex(btn) {
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
  const copyButton = id =>
    `<button type="button" class="copy-eq" data-eq="${id}" title="${t('copyLatex')}" aria-label="${t('copyLatex')}">${ICON.copy}</button>`;

  // ---- equations written the way they are written by hand: a / b becomes a stacked fraction ----
  // The formulas of this file are plain HTML strings such as "2 × T / d<sub>B</sub>". stackFractions()
  // reads one and rebuilds every " / " (with spaces; units like ft/min are left alone) as a fraction:
  // the numerator is everything before it in the same term, the denominator what follows up to the
  // next × or the end of the term. Terms end at + − = ≤ ≥ < > , ; : and at the enclosing bracket.
  function stackFractions(html, latex) {
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

  // open the card of a variable, bring its row into view and flash it
  function goToVariable(id) {
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

  let noFigs = false;   // true while the steps are recomputed only to compare their numbers
  function calcSteps(g) {
    const L = g.loads, gr = g.gear, pn = g.pinion, s = P.shaft;
    const f = (v, n) => Number(v).toFixed(n == null ? 1 : n);
    const omega = SPEED_RPM * 2 * Math.PI / 60;
    const betaDeg = P.gear.beta;
    const i = gr.z / pn.z;
    const steps = [
      { f: 'ω = 2π × n / 60',
        s: `2π × ${SPEED_RPM} / 60`,
        r: `ω = ${f(omega, 2)} rad/s` },
      { f: 'T = P / ω',
        s: `${POWER_W} W / ${f(omega, 2)} rad/s`,
        r: `T = ${f(L.torque, 2)} N m` },
      { f: 'm<sub>t</sub> = d<sub>B</sub> / z<sub>B</sub>',
        s: `${f(P.gear.d, 0)} mm / ${gr.z}`,
        r: `m<sub>t</sub> = ${f(gr.m, 2)} mm` },
      { f: 'F<sub>t</sub> = 2 × T / d<sub>B</sub>',
        s: `2 × ${f(L.torque * 1000, 0)} N mm / ${f(P.gear.d, 0)} mm`,
        r: `F<sub>t</sub> = ${f(L.Ft, 1)} N` },
      { f: 'F<sub>r</sub> = F<sub>t</sub> × tan φ<sub>t</sub>',
        s: `${f(L.Ft, 1)} × tan ${P.gear.phi}°`,
        r: `F<sub>r</sub> = ${f(L.Fr, 1)} N` },
      { f: 'F<sub>a</sub> = F<sub>t</sub> × tan β',
        s: `${f(L.Ft, 1)} × tan ${betaDeg}°`,
        r: `F<sub>a</sub> = ${f(L.Fa, 1)} N` },
      { f: 'F<sub>1</sub> − F<sub>2</sub> = 2 × T / D ,  F<sub>1</sub> / F<sub>2</sub> = k',
        s: `2 × ${f(L.torque * 1000, 0)} N mm / ${f(P.pulley.D, 0)} mm = ${f(L.belt, 1)} N ,  k = ${P.vbelt.ratio}`,
        r: `F<sub>1</sub> = ${f(L.F1, 1)} N ,  F<sub>2</sub> = ${f(L.F2, 1)} N` },
      { f: 'd<sub>p</sub> = m<sub>t</sub> × z<sub>p</sub>',
        s: `${f(gr.m, 2)} mm × ${pn.z}`,
        r: `d<sub>p</sub> = ${f(2 * pn.r, 1)} mm` },
      { f: 'i = z<sub>B</sub> / z<sub>p</sub> ,  n<sub>p</sub> = n × i',
        s: `${gr.z} / ${pn.z} = ${f(i, 3)} ,  ${SPEED_RPM} × ${f(i, 3)}`,
        r: `n<sub>p</sub> = ${f(SPEED_RPM * i, 0)} rpm` },
      { f: 'L = e<sub>L</sub> + w<sub>A</sub>/2 + AB + BC + CD + w<sub>D</sub>/2 + e<sub>R</sub>',
        s: `${s.overL} + ${f(P.bearingA.w / 2, 1)} + ${P.layout.ab} + ${P.layout.bc} + ${P.layout.cd} + ${f(P.pulley.w / 2, 1)} + ${s.overR}`,
        r: `L = ${f(g.len, 1)} mm` },
    ];

    // ---- gear check: values read from the course tables, each shown on the table it comes from ----
    const fig = (id, picks, label) => (!noFigs && typeof TableFigure !== 'undefined' ? TableFigure.render(id, picks, label) : '');
    if (typeof EQ !== 'undefined') {
      const fill = (key, map) => Object.keys(map).reduce((str, k) => str.replace('{' + k + '}', map[k]), t(key));
      const phiDeg = P.gear.phi, psi = gr.beta, F = P.gear.w;

      // the table only has 14.5, 20 and 25 degrees; other angles use the formula rounded up
      const nMin = EQ.minTeethNoInterference(EQ.rad(phiDeg));
      const nTab = EQ.MIN_TEETH_VS_RACK[phiDeg] || Math.ceil(nMin);
      steps.push({
        f: 'N<sub>min</sub> = 2 / sin² φ',
        s: `2 / sin² ${phiDeg}° = ${f(nMin, 1)}`,
        r: `N<sub>min</sub> = ${nTab}`,
        fig: fig('minTeeth', EQ.MIN_TEETH_VS_RACK[phiDeg] ? [{ row: phiDeg, col: 'N' }] : [], 'Nmin = ' + nTab),
      });

      const mn = EQ.normalModule(gr.m, psi), mStd = EQ.nextStandardModule(mn);
      steps.push({
        f: 'm<sub>n</sub> = m<sub>t</sub> × cos β',
        s: `${f(gr.m, 2)} mm × cos ${betaDeg}° = ${f(mn, 2)} mm`,
        r: mStd ? `m<sub>n</sub> = ${f(mn, 2)} mm → ${mStd} mm` : `m<sub>n</sub> = ${f(mn, 2)} mm (${t('stdNone')})`,
        fig: fig('modules', mStd ? [{ row: mStd, col: 'm' }] : [], 'm = ' + mStd + ' mm'),
      });

      const Ka = EQ.applicationFactor('uniform', 'moderateShock');
      steps.push({
        f: t('kaSel'),
        r: `K<sub>a</sub> = ${f(Ka, 2)}`,
        fig: fig('Ka', [{ row: 'uniform', col: 'moderateShock' }], 'Ka = ' + f(Ka, 2)),
      });

      const Km = EQ.loadDistributionFactorSI(F);
      const kmRow = F <= 50 ? 50 : F <= 150 ? 150 : F <= 250 ? 250 : 500;
      steps.push({
        f: fill('kmSel', { F: f(F, 0), row: kmRow }),
        r: `K<sub>m</sub> = ${f(Km, 1)}`,
        fig: fig('Km', [{ row: kmRow, col: 'Km' }], 'Km = ' + f(Km, 1)),
      });

      const Qv = P.design.Qv;
      const Vt = EQ.pitchLineVelocityFromDiameter(omega, P.gear.d / 1000);   // m/s
      const Kv = EQ.dynamicFactorSI(Vt, Qv);
      steps.push({
        f: 'V<sub>t</sub> = ω × d<sub>B</sub> / 2',
        s: `${f(omega, 2)} rad/s × ${f(P.gear.d / 1000, 3)} m / 2 = ${f(Vt, 2)} m/s`,
        r: `K<sub>v</sub> = ${f(Kv, 3)}  (Q<sub>v</sub> = ${Qv})`,
        fig: fig('Kv', [{ x: Vt * 196.85, y: Kv }], `Vt = ${f(Vt, 2)} m/s → Kv = ${f(Kv, 2)}`),
      });

      const J = EQ.geometryFactorJ('helical25psi20tip', pn.z, gr.z);
      steps.push({
        f: fill(J ? 'jSel' : 'jNone', { np: pn.z, ng: gr.z, npu: J && J.NpUsed, ngu: J && J.NgUsed }),
        r: J ? `J<sub>p</sub> = ${f(J.pinion, 2)} ,  J<sub>g</sub> = ${f(J.gear, 2)}` : t('jNoneR'),
        fig: fig('helical25psi20tip',
          J ? [{ row: J.NgUsed, col: J.NpUsed + 'P' }, { row: J.NgUsed, col: J.NpUsed + 'G' }] : [],
          J ? `Jp = ${f(J.pinion, 2)}   Jg = ${f(J.gear, 2)}` : ''),
      });

      const Cp = EQ.elasticCoefficientSI('steel', 'steel');
      steps.push({
        f: t('cpSel'),
        r: `C<sub>p</sub> = ${Cp} MPa<sup>0.5</sup>`,
        fig: fig('Cp', [{ row: 'steel', col: 'steel' }], 'Cp = ' + Cp + ' MPa^0.5'),
      });

      const sb = Jx => EQ.bendingStressSI(L.Ft, gr.m, F, Jx, Ka, Km, Kv);
      steps.push({
        f: 'σ<sub>b</sub> = F<sub>t</sub> / (F × m × J) × K<sub>a</sub> K<sub>m</sub> / K<sub>v</sub>',
        s: J ? `${f(L.Ft, 1)} / (${f(F, 0)} × ${f(gr.m, 2)} × J) × ${f(Ka, 2)} × ${f(Km, 1)} / ${f(Kv, 3)}` : '',
        r: J ? `σ<sub>b</sub> = ${f(sb(J.pinion), 1)} MPa (${t('pinionWord')}) ,  ${f(sb(J.gear), 1)} MPa (${t('gearWord')})`
             : `σ<sub>b</sub>: ${t('noJ')}`,
      });

      // ---- V-belt drive on pulley D (T12). The course tables are in US units, so the work is done in in / lbf / hp. ----
      {
        const IN = 25.4, LBF = 4.4482, HP = 745.7;
        const dD = P.pulley.D / IN, d2 = P.vbelt.D2 / IN;            // pitch diameters [in]
        const big = Math.max(dD, d2), small = Math.min(dD, d2);
        const Ks = P.vbelt.Ks, Pnom = POWER_W / HP, Pd = EQ.designPower(Pnom, Ks, 1);

        const ksRow = ['lightShock', 'mediumShock', 'heavyShock', 'uniform']
          .find(r => Ks >= EQ.V_BELT_KS[r].normalTorque[0] - 1e-9 && Ks <= EQ.V_BELT_KS[r].normalTorque[1] + 1e-9);
        steps.push({
          f: 'P<sub>d</sub> = P<sub>nom</sub> × K<sub>s</sub> × N<sub>d</sub>',
          s: `${f(POWER_W / 1000, 2)} kW × ${f(Ks, 2)} × 1 = ${f(Pd * HP / 1000, 2)} kW`,
          r: `P<sub>d</sub> = ${f(Pd, 2)} hp`,
          fig: fig('vbeltKs', ksRow ? [{ row: ksRow, col: 'normalTorque' }] : [], 'Ks = ' + f(Ks, 2)),
        });

        const names = ['A', 'B', 'C', 'D', 'E'];
        const sec = names.find(k => Pd <= EQ.V_BELT_SECTIONS[k].hp[1]) || 'E';
        const S = EQ.V_BELT_SECTIONS[sec];
        steps.push({
          f: fill('secSel', { P: f(Pd, 2), d: f(small, 2), s: sec }),
          r: `${sec}  (d<sub>min</sub> = ${f(S.dMin, 1)} in = ${f(S.dMin * IN, 0)} mm)`,
          fig: fig('vbeltSections', [{ row: sec, col: 'hp' }, { row: sec, col: 'dMin' }], t('c.vbeltSection') + ' ' + sec),
        });

        const V = EQ.beltSpeedFtPerMin(dD, SPEED_RPM);
        steps.push({
          f: 'V = π × d × n / 12',
          s: `π × ${f(dD, 2)} in × ${SPEED_RPM} rpm / 12`,
          r: `V = ${f(V, 0)} ft/min  (${f(V * 0.00508, 2)} m/s)`,
        });

        const Cwant = P.vbelt.C / IN;
        const LpWant = EQ.vBeltPitchLengthFromCenterDistance(Cwant, big, small);
        const add = EQ.V_BELT_LENGTH_ADD[sec], sizes = EQ.V_BELT_CIRCUMFERENCES[sec];
        const Lin = sizes.find(x => x >= LpWant - add) || sizes[sizes.length - 1];
        const Lp = EQ.vBeltPitchLength(sec, Lin);
        steps.push({
          f: 'L<sub>p</sub> = 2C + π (D + d) / 2 + (D − d)² / (4C)',
          s: `2 × ${f(Cwant, 2)} + π (${f(big, 2)} + ${f(small, 2)}) / 2 + (${f(big, 2)} − ${f(small, 2)})² / (4 × ${f(Cwant, 2)}) = ${f(LpWant, 1)} in`,
          r: `${f(LpWant, 1)} − ${add} = ${f(LpWant - add, 1)} in → ${sec}${Lin}  (L<sub>p</sub> = ${f(Lp, 1)} in)`,
          fig: fig('vbeltLengths', [{ row: sec }], sec + Lin),
        });

        const C = EQ.vBeltCenterDistance(Lp, big, small);
        steps.push({
          f: 'C = 0.25 { [L<sub>p</sub> − π/2 (D + d)] + √( [L<sub>p</sub> − π/2 (D + d)]² − 2 (D − d)² ) }',
          s: `L<sub>p</sub> = ${f(Lp, 1)} in ,  D = ${f(big, 2)} in ,  d = ${f(small, 2)} in`,
          r: `C = ${f(C, 2)} in = ${f(C * IN, 0)} mm`,
        });

        // rated power: mark the cells the interpolation uses
        const Ptab = EQ.vBeltTabulatedPower(sec, small, V);
        const rowsP = EQ.V_BELT_POWER[sec].map(r => r[0]);
        const lo = rowsP.filter(x => x <= small).pop(), hi = rowsP.find(x => x > small);
        const vc = Math.min(5000, Math.max(1000, V)), s0 = Math.floor(vc / 1000) * 1000, s1 = Math.min(5000, s0 + 1000);
        const pPicks = [];
        if (lo != null) {
          [lo, hi].filter(x => x != null).forEach(dia => {
            [s0, s1].filter((x, i, a) => a.indexOf(x) === i).forEach(sp => {
              const row = EQ.V_BELT_POWER[sec].find(r => r[0] === dia);
              if (row[EQ.V_BELT_POWER_SPEEDS.indexOf(sp) + 1] != null && (sp === s0 || vc > s0)) {
                pPicks.push({ row: sec + ':' + dia.toFixed(1), col: sp });
              }
            });
          });
        }
        steps.push({
          f: fill('ptSel', { s: sec, d: f(small, 2), V: f(V, 0) }),
          r: Ptab != null ? `P<sub>tab</sub> = ${f(Ptab, 2)} hp` : `P<sub>tab</sub>: ${t('ptNone')}`,
          fig: fig('vbeltPower', Ptab != null ? pPicks : [], Ptab != null ? 'Ptab = ' + f(Ptab, 2) + ' hp' : ''),
        });

        const ratio = (big - small) / C, K1 = EQ.vBeltAngleFactor(big, small, C);
        const r0 = Math.min(1.5, Math.floor(ratio * 10 + 1e-9) / 10), r1 = Math.min(1.5, r0 + 0.1);
        steps.push({
          f: '(D − d) / C',
          s: `(${f(big, 2)} − ${f(small, 2)}) / ${f(C, 2)} = ${f(ratio, 3)}`,
          r: `K<sub>1</sub> = ${f(K1, 3)}`,
          fig: fig('vbeltK1', [{ row: r0.toFixed(1), col: 'VV' }].concat(ratio > r0 + 1e-6 && r1 > r0 ? [{ row: r1.toFixed(1), col: 'VV' }] : []), 'K1 = ' + f(K1, 3)),
        });

        const K2 = EQ.vBeltLengthFactor(sec, Lin);
        steps.push({
          f: fill('k2Sel', { b: sec + Lin, s: sec, L: Lin }),
          r: `K<sub>2</sub> = ${f(K2, 2)}`,
          fig: fig('vbeltK2', [{ row: K2.toFixed(2), col: sec }], 'K2 = ' + f(K2, 2)),
        });

        if (Ptab != null) {
          const Pa = EQ.vBeltAllowablePower(K1, K2, Ptab), Nb = EQ.vBeltCount(Pd, Pa), grooves = P.pulley.n;
          steps.push({
            f: 'P<sub>a</sub> = K<sub>1</sub> × K<sub>2</sub> × P<sub>tab</sub> ,  N<sub>b</sub> ≥ P<sub>d</sub> / P<sub>a</sub>',
            s: `${f(K1, 3)} × ${f(K2, 2)} × ${f(Ptab, 2)} = ${f(Pa, 2)} hp ,  ${f(Pd, 2)} / ${f(Pa, 2)} = ${f(Pd / Pa, 2)}`,
            r: `N<sub>b</sub> = ${Nb}`,
          });

          const theta = EQ.vBeltContactAngle(big, small, C), Fc = EQ.vBeltCentrifugalForce(sec, V);
          const T = EQ.torqueFromPowerHp(Pd, SPEED_RPM), dF = EQ.vBeltNetForcePerBelt(T, dD, Nb);
          const F1 = EQ.vBeltTightSide(dF, Fc, theta), F2 = EQ.vBeltSlackSide(F1, dF), Fi = EQ.vBeltInitialTension(F1, F2, Fc);
          steps.push({
            f: 'F<sub>c</sub> = K<sub>c</sub> (V/1000)² ,  ΔF = 2T / (d × N<sub>b</sub>) ,  F<sub>1</sub> = F<sub>c</sub> + ΔF × e<sup>0.5123θ</sup> / (e<sup>0.5123θ</sup> − 1) ,  F<sub>2</sub> = F<sub>1</sub> − ΔF',
            s: `F<sub>c</sub> = ${EQ.V_BELT_KB_KC[sec].Kc} × ${f(V / 1000, 3)}² = ${f(Fc, 2)} lbf ,  T = ${f(T, 1)} lbf in ,  ΔF = ${f(dF, 1)} lbf ,  θ = ${f(theta, 3)} rad`,
            r: `F<sub>1</sub> = ${f(F1 * LBF, 0)} N ,  F<sub>2</sub> = ${f(F2 * LBF, 0)} N ,  F<sub>i</sub> = ${f(Fi * LBF, 0)} N`,
            fig: fig('vbeltKc', [{ row: sec, col: 'Kc' }], 'Kc = ' + EQ.V_BELT_KB_KC[sec].Kc),
          });
        } else {
          steps.push({ f: 'P<sub>a</sub> = K<sub>1</sub> × K<sub>2</sub> × P<sub>tab</sub>', r: `P<sub>a</sub>: ${t('ptNone')}` });
          steps.push({ f: 'F<sub>1</sub> , F<sub>2</sub>', r: t('ptNone') });
        }
      }

      // ---- gear life (statement: 20 000 h): load cycles and the two life factors, read on their charts ----
      {
        const hours = P.design.life, nPinion = SPEED_RPM * gr.z / pn.z;
        const Np = EQ.loadCycles(nPinion, hours), Ng = EQ.loadCycles(SPEED_RPM, hours);
        const sci = x => { const e = Math.floor(Math.log10(x)); return `${f(x / Math.pow(10, e), 2)} × 10<sup>${e}</sup>`; };
        steps.push({
          f: 'N = 60 × n × h',
          s: `${t('pinionWord')}: 60 × ${f(nPinion, 0)} rpm × ${hours} h ,  ${t('gearWord')}: 60 × ${SPEED_RPM} rpm × ${hours} h`,
          r: `N<sub>p</sub> = ${sci(Np)} ,  N<sub>g</sub> = ${sci(Ng)}`,
        });
        const KLp = EQ.lifeFactorBendingCommercial(Np), KLg = EQ.lifeFactorBendingCommercial(Ng);
        steps.push({
          f: 'K<sub>L</sub> = 1.3558 × N<sup>−0.0178</sup>',
          s: `1.3558 × (${sci(Np)})<sup>−0.0178</sup> ,  1.3558 × (${sci(Ng)})<sup>−0.0178</sup>`,
          r: `K<sub>L</sub> = ${f(KLp, 3)} (${t('pinionWord')}) ,  ${f(KLg, 3)} (${t('gearWord')})`,
          fig: fig('KL', [{ x: Np, y: KLp }, { x: Ng, y: KLg }]),
        });
        const CLp = EQ.lifeFactorSurfaceCommercial(Np), CLg = EQ.lifeFactorSurfaceCommercial(Ng);
        steps.push({
          f: 'C<sub>L</sub> = 1.4488 × N<sup>−0.023</sup>  (N > 10<sup>7</sup>) ,  C<sub>L</sub> = 2.466 × N<sup>−0.056</sup>  (N ≤ 10<sup>7</sup>)',
          r: `C<sub>L</sub> = ${f(CLp, 3)} (${t('pinionWord')}) ,  ${f(CLg, 3)} (${t('gearWord')})`,
          fig: fig('CL', [{ x: Np, y: CLp }, { x: Ng, y: CLg }]),
        });
      }

      // temperature factor of the gear strengths, and the life the bearings have to reach
      {
        const Tc = P.given.temp, KT = EQ.temperatureFactorFromCelsius(Tc);
        steps.push({
          f: 'K<sub>T</sub> = 1  (T < 120 °C) ,  K<sub>T</sub> = (460 + T<sub>F</sub>) / 620  (T > 120 °C)',
          s: `T = ${Tc} °C = ${f(EQ.celsiusToFahrenheit(Tc), 0)} °F`,
          r: `K<sub>T</sub> = ${f(KT, 3)}`,
        });
        const Lrev = 60 * SPEED_RPM * P.given.bearLife / 1e6;
        steps.push({
          f: 'L = 60 × n × h / 10<sup>6</sup>',
          s: `60 × ${SPEED_RPM} rpm × ${P.given.bearLife} h / 10<sup>6</sup>`,
          r: `L = ${f(Lrev, 0)} × 10<sup>6</sup> rev`,
        });
      }

      // ---- shaft strength (T04): reactions, moments, endurance limit, stresses and the two safety factors ----
      {
        const a = shaftAnalysis(g), sh = P.shaft, ab = P.layout.ab, bc = P.layout.bc, cd = P.layout.cd;
        const [sB, sC] = a.sections, each = fn => a.sections.map(fn).join(' ;  ');
        steps.push({
          f: 'R<sub>Cy</sub> = (F<sub>r</sub> × AB + F<sub>a</sub> × d<sub>B</sub> / 2) / (AB + BC) ,  R<sub>Ay</sub> = F<sub>r</sub> − R<sub>Cy</sub>',
          s: `(${f(L.Fr, 1)} × ${ab} + ${f(L.Fa, 1)} × ${f(P.gear.d / 2, 1)}) / ${ab + bc} ,  ${f(L.Fr, 1)} − ${f(a.RCy, 1)}`,
          r: `R<sub>Cy</sub> = ${f(a.RCy, 1)} N ,  R<sub>Ay</sub> = ${f(a.RAy, 1)} N ,  R<sub>Ax</sub> = F<sub>a</sub> = ${f(L.Fa, 1)} N`,
        });
        steps.push({
          f: 'R<sub>Cz</sub> = (F<sub>t</sub> × AB + (F<sub>1</sub> + F<sub>2</sub>) × AD) / (AB + BC) ,  R<sub>Az</sub> = F<sub>t</sub> + F<sub>1</sub> + F<sub>2</sub> − R<sub>Cz</sub>',
          s: `(${f(L.Ft, 1)} × ${ab} + ${f(a.Fb, 1)} × ${ab + bc + cd}) / ${ab + bc} ,  ${f(L.Ft, 1)} + ${f(a.Fb, 1)} − ${f(a.RCz, 1)}`,
          r: `R<sub>Cz</sub> = ${f(a.RCz, 1)} N ,  R<sub>Az</sub> = ${f(a.RAz, 1)} N ,  R<sub>A</sub> = ${f(a.RA, 1)} N ,  R<sub>C</sub> = ${f(a.RC, 1)} N`,
        });
        steps.push({
          f: 'M<sub>B</sub> = max( √((R<sub>Ay</sub> × AB)² + (R<sub>Az</sub> × AB)²) , √((R<sub>Cy</sub> × BC)² + (R<sub>Az</sub> × AB)²) ) ,  M<sub>C</sub> = (F<sub>1</sub> + F<sub>2</sub>) × CD',
          s: `max( ${f(a.MBl / 1000, 2)} , ${f(a.MBr / 1000, 2)} ) N m ,  ${f(a.Fb, 1)} N × ${cd} mm`,
          r: `M<sub>B</sub> = ${f(sB.M / 1000, 2)} N m ,  M<sub>C</sub> = ${f(sC.M / 1000, 2)} N m ,  T = ${f(L.torque, 2)} N m`,
        });
        steps.push({
          f: 'S<sub>e</sub> = k<sub>a</sub> × k<sub>b</sub> × k<sub>e</sub> × S′<sub>e</sub> ,  S′<sub>e</sub> = 0.5 × S<sub>ut</sub> ,  k<sub>a</sub> = 4.51 × S<sub>ut</sub><sup>−0.265</sup> ,  k<sub>b</sub> = 1.24 × d<sup>−0.107</sup>',
          s: `S′<sub>e</sub> = ${f(EQ.enduranceLimitSteel(sh.Sut), 1)} MPa ,  k<sub>a</sub> = ${f(sB.ka, 3)} ,  k<sub>e</sub> = ${f(sB.ke, 3)} ,  k<sub>b</sub> = ` + each(x => `${f(x.kb, 3)} (${x.id}, d = ${f(x.d, 0)} mm)`),
          r: each(x => `S<sub>e, ${x.id}</sub> = ${f(x.Se, 1)} MPa`),
        });
        steps.push({
          f: 'σ<sub>a</sub> = K<sub>f</sub> × 32 M / (π d³) ,  τ<sub>m</sub> = K<sub>fs</sub> × 16 T / (π d³) ,  σ<sub>m, axial</sub> = K<sub>f</sub> × 4 F<sub>a</sub> / (π d²)',
          s: `K<sub>f</sub> = ${sh.Kf} ,  K<sub>fs</sub> = ${sh.Kfs} ,  ` + each(x => `${x.id}: d = ${f(x.d, 0)} mm, M = ${f(x.M / 1000, 2)} N m`),
          r: each(x => `${x.id}: σ<sub>a</sub> = ${f(x.sa, 1)} MPa, τ<sub>m</sub> = ${f(x.tm, 1)} MPa, σ<sub>m, axial</sub> = ${f(x.sax, 2)} MPa`),
        });
        steps.push({
          f: '1 / N<sub>f</sub> = σ′<sub>a</sub> / S<sub>e</sub> + σ′<sub>m</sub> / S<sub>ut</sub> ,  σ′<sub>a</sub> = √(σ<sub>a</sub>² + 3 τ<sub>a</sub>²) ,  σ′<sub>m</sub> = √((σ<sub>m</sub> + σ<sub>m, axial</sub>)² + 3 τ<sub>m</sub>²)',
          s: each(x => `${x.id}: ${f(x.saEq, 1)} / ${f(x.Se, 1)} + ${f(x.smEq, 1)} / ${sh.Sut}`),
          r: each(x => `N<sub>f, ${x.id}</sub> = ${f(x.Nf, 2)}`) + ` ;  N<sub>f</sub> = ${f(a.Nf, 2)}`,
        });
        steps.push({
          f: 'N<sub>pic</sub> = S<sub>y</sub> / σ′<sub>max</sub> ,  σ′<sub>max</sub> = k<sub>pic</sub> × √((σ<sub>a</sub> + σ<sub>m, axial</sub>)² + 3 τ<sub>m</sub>²)',
          s: each(x => `${x.id}: ${sh.Sy} / (${P.drive.peak} × ${f(x.smax / P.drive.peak, 1)}) = ${sh.Sy} / ${f(x.smax, 1)}`),
          r: each(x => `N<sub>pic, ${x.id}</sub> = ${f(x.Ny, 2)}`) + ` ;  N<sub>pic</sub> = ${f(a.Ny, 2)}`,
        });
      }
    }

    return steps;
  }

  function updateCalc(g) {
    latexOf = {};
    const steps = calcSteps(g);
    readSymDefs(anyLocked() ? steps : []);
    // The steps are worked with the fixed values as their starting point, so they are only shown once
    // something is fixed. The design checks are always shown.
    if (!anyLocked()) {
      $('#calcList').innerHTML = `<p class="calc-empty">${t('calcLocked')}</p>` + checksHtml(g);
      return;
    }
    $('#calcList').innerHTML = steps.map((st, k) => {
      const why = T['cv' + k] ? t('cv' + k) : '';
      latexOf['step-' + k] = toLatex(st.f) + (st.s ? ' = ' + toLatex(st.s) : '') + ' \\;\\Rightarrow\\; ' + toLatex(st.r);
      return `
      <div class="calc-step" id="step-${k}">
        <div class="num">${k + 1}</div>
        <h3>${t('ct' + k)}</h3>
        ${copyButton('step-' + k)}
        <div class="work">
          <div class="formula">${stackFractions(linkSymbols(st.f, null, k))}</div>
          ${st.s ? `<div class="subst">= ${stackFractions(st.s)}</div>` : ''}
          <div class="result">${st.r}</div>
        </div>
        ${st.fig || ''}
        ${why ? `<div class="why">${why}</div>` : ''}
      </div>`;
    }).join('') + checksHtml(g);
  }

  // ------------------------------------------------------------------
  // 2D views (Two.js)
  // ------------------------------------------------------------------
  // How a force arrow shows its size: mostly by its thickness, a little by its length.
  // The thickness follows the square root of the force: 1.2 times the base size for the tangential force
  // of the statement's 4 kW (637 N), held between 0.5 and 3 times. The base sizes are ARROW_2D (line width
  // in pixels) and ARROW_3D (shaft radius as a share of the largest radius of the model).
  const FORCE_REF = 637, ARROW_2D = 3.6, ARROW_3D = 0.035;
  function forceLook(F) {
    const k = Math.max(1e-6, F) / FORCE_REF;
    return { thick: Math.max(0.5, Math.min(3, 1.2 * Math.sqrt(k))), long: Math.max(0.8, Math.min(1.35, Math.pow(k, 0.12))) };
  }

  let two = null;
  let INK = C.ink;         // both follow the theme: see setTheme()
  let FORCE = C.force;

  function init2D() {
    if (typeof Two === 'undefined') {
      $('#view2d').innerHTML = '<p style="padding:40px;color:#66727e">Two.js could not be loaded (check the internet connection).</p>';
      return;
    }
    two = new Two({ type: Two.Types.svg, width: 100, height: 100, autostart: false }).appendTo($('#view2d'));
    // a click on a component selects it; a click on the empty drawing clears the selection
    $('#view2d').addEventListener('click', e => {
      const hit = e.target.closest ? e.target.closest('[data-part]') : null;
      select(hit ? hit.dataset.part : null);
    });
  }

  function draw2D(g) {
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
      shape.stroke = stroke || INK;
      shape.linewidth = lw == null ? 1.2 : lw;
      if (part && part === selected) { shape.stroke = C.select; shape.linewidth += 1.6; }
      return tag(shape);
    };
    const line = (x1, y1, x2, y2, stroke, lw, dashes) => {
      const ln = two.makeLine(x1, y1, x2, y2);
      ln.stroke = stroke || INK;
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
      t.fill = fill || INK;
      t.family = 'system-ui, Segoe UI, sans-serif';
      if (italic) t.style = 'italic';
      if (weight) t.weight = weight;
      return tag(t);
    };
    const arrow = (x1, y1, x2, y2, color, lw) => {
      color = color || FORCE;
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

    line(sideW, 34, sideW, H - 12, C.line, 1);

    // ===================== SIDE VIEW =====================
    if (visible.shaft) {
      part = 'shaft';
      rectX(g.x0, g.x1, g.d / 2, C.steel);
      g.steps.forEach(st => rectX(st[0], st[1], st[2], C.steel2));
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
      gearFace(gear, 0, C.fill.gear, colorOf.gear);
      [gear.r, -gear.r].forEach(r => line(X(xl) - 6, Y(r), X(xr) + 6, Y(r), C.fill.pitch, 0.8, [8, 3, 2, 3]));
    }

    if (visible.pinion) {
      part = 'pinion';
      const pn = g.pinion, stub = 50, rs = pn.rf * 0.55;
      style(two.makeRectangle(X(pn.x - pn.w / 2 - stub / 2), Y(pn.yc), stub * s, 2 * rs * s), C.steel, INK, 1.2);
      gearFace(pn, pn.yc, C.fill.pinion, colorOf.pinion);
      line(X(pn.x - pn.w / 2 - stub) - 8, Y(pn.yc), X(pn.x + pn.w / 2) + 10, Y(pn.yc), INK, 0.7, [14, 4, 3, 4]);
      if (opts.labels) text(t('pinion'), X(pn.x + pn.w / 2) + 26, Y(pn.yc) + 4, 13, colorOf.pinion, false, 700);
    }

    if (visible.pulley) {
      part = 'pulley';
      const prof = pulleyProfile(pl);
      [1, -1].forEach(sgn => {
        poly(prof.map(p => [X(pl.x + p[1]), Y(sgn * p[0])]), C.fill.pulleyHub, colorOf.pulley, 1.4);
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
        band(b.rIn, b.rOut, C.paper);
        band(b.rOut - b.t, b.rOut, C.ring);
        band(b.rIn, b.rIn + b.t, C.ring);
        style(two.makeCircle(cx, Y(sgn * b.rMid), Math.min(b.rBall, b.w * 0.45) * s), C.ball, col, 1.2);
      });
    });

    // centre line
    part = null;
    line(X(g.x0) - 18, cy, X(g.x1) + 18, cy, INK, 0.8, [14, 4, 3, 4]);

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
      arrow(ax, ay, ax, ay - 34, INK, 1.2);
      text('y', ax - 9, ay - 30, 12, INK, true);
      style(two.makeCircle(ax, ay, 5), C.paper, INK, 1.2);
      style(two.makeCircle(ax, ay, 1.4), INK, INK, 1);
      text('z', ax - 12, ay + 4, 12, INK, true);
      arrow(X(g.x1) + 6, cy, X(g.x1) + 32, cy, INK, 1.2);
      text('x', X(g.x1) + 30, cy + 14, 12, INK, true);
    }

    // dimension chain A–B–C–D
    const yd = Math.min(Y(-g.Rmax) + 30, H - 22);
    const stations = [g.xA, g.xB, g.xC, g.xD];
    stations.forEach(x => line(X(x), cy, X(x), yd + 6, C.muted, 0.7));
    for (let i = 0; i < 3; i++) {
      const xa = X(stations[i]), xb = X(stations[i + 1]);
      arrow((xa + xb) / 2, yd, xa, yd, C.dim, 1);
      arrow((xa + xb) / 2, yd, xb, yd, C.dim, 1);
      text((stations[i + 1] - stations[i]).toFixed(0) + ' mm', (xa + xb) / 2, yd + 13, 11.5, C.dim);
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
      arrow(px, py - Lr, px, py, FORCE, ARROW_2D * kr.thick);
      text('Fr', px + 13, py - Lr + 4, 13, FORCE, true);
      arrow(px - Lax, py, px - 4, py, FORCE, ARROW_2D * ka.thick);
      text('Fa', px - Lax + 10, py - 10, 13, FORCE, true);
      style(two.makeCircle(px, py, 4 + 1.5 * kt.thick), C.paper, FORCE, 1.6 * kt.thick);   // Ft: out of the page (+z)
      style(two.makeCircle(px, py, 1.2 + 0.4 * kt.thick), FORCE, FORCE, 1);
      text('Ft', px - 15, py - 14, 13, FORCE, true);
    }

    // ===================== END VIEW (looking along −x, z to the left) =====================
    const drv = visible.vbelt ? g.vbelt : null;                 // driven pulley of the V-belt drive, if shown
    // own scale, so a long centre distance does not shrink the side view
    const se = drv ? Math.min(s, (endW - 80) / (pl.R + drv.C + drv.R2)) : s;
    const R = pl.R * se;
    const ex = W - 35 - R, ey = cy;
    const BELT = C.belt;
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

      style(two.makeCircle(ex2, ey, R2), C.fill.driven, colorOf.vbelt, 1.5);
      if ((drv.R2 - pl.depth) * se > 3) {
        const gr2 = two.makeCircle(ex2, ey, (drv.R2 - pl.depth) * se);
        style(gr2, 'none', colorOf.vbelt, 0.9);
        gr2.dashes = [5, 4];
      }
      style(two.makeCircle(ex2, ey, Math.max(2, Math.min(drv.R2 * 0.3, g.d / 2) * se)), C.fill.drivenHub, colorOf.vbelt, 1.2);
      line(ex2 - R2 - 10, ey, ex2 + R2 + 10, ey, INK, 0.7, [14, 4, 3, 4]);
      line(ex2, ey - R2 - 10, ex2, ey + R2 + 10, INK, 0.7, [14, 4, 3, 4]);

      // centre distance
      const yd2 = Math.min(ey + Math.max(R, R2) + 22, H - 20);
      line(ex, ey, ex, yd2 + 6, C.muted, 0.7);
      line(ex2, ey, ex2, yd2 + 6, C.muted, 0.7);
      arrow((ex + ex2) / 2, yd2, ex, yd2, C.dim, 1);
      arrow((ex + ex2) / 2, yd2, ex2, yd2, C.dim, 1);
      text(drv.C.toFixed(0) + ' mm', (ex + ex2) / 2, yd2 + 13, 11.5, C.dim);
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
      style(two.makeCircle(ex, ey, R), C.fill.pulley, colorOf.pulley, 1.5);
      const gr = two.makeCircle(ex, ey, (pl.R - pl.depth) * se);
      style(gr, 'none', colorOf.pulley, 0.9);
      gr.dashes = [5, 4];
      style(two.makeCircle(ex, ey, pl.rHub * se), C.fill.pulleyHub, colorOf.pulley, 1.2);

      if (opts.labels) {
        text(t('pulleyD'), ex - R * 0.72 - 8, ey - R - 2, 12, colorOf.pulley, false, 600);
        // rotation arrow
        const ra = R * 0.72, arc = [];
        for (let a = -0.15; a <= 0.5; a += 0.05) arc.push([ex + ra * Math.cos(a), ey - ra * Math.sin(a)]);
        poly(arc, 'none', INK, 1.2, false);
        const n = arc.length;
        arrow(arc[n - 2][0], arc[n - 2][1], arc[n - 1][0], arc[n - 1][1], INK, 1.2);
      }
    }
    part = null;
    if (opts.forces && pulls && visible.pulley) {
      const [f2, f1] = pulls, k1 = forceLook(g.loads.F1), k2 = forceLook(g.loads.F2);
      const L2 = 40 * k2.long, L1 = 40 * k1.long;
      arrow(f2[0], f2[1], f2[0] + f2[2] * L2, f2[1] + f2[3] * L2, FORCE, ARROW_2D * k2.thick);
      text('F2', f2[0] + f2[2] * L2 * 0.5, f2[1] + f2[3] * L2 * 0.5 - 13, 13, FORCE, true);
      arrow(f1[0], f1[1], f1[0] + f1[2] * L1, f1[1] + f1[3] * L1, FORCE, ARROW_2D * k1.thick);
      text('F1', f1[0] + f1[2] * L1 * 0.5, f1[1] + f1[3] * L1 * 0.5 + 17, 13, FORCE, true);
    }
    if (visible.shaft) {
      part = 'shaft';
      style(two.makeCircle(ex, ey, g.d / 2 * se), C.steel3, INK, 1.2);
      const k = g.d * 0.13 * se;                                   // key
      style(two.makeRectangle(ex, ey + g.d / 2 * se, 2 * k, 2 * k), C.paper, INK, 1);
    }
    part = null;
    line(ex - R - 14, ey, ex + R + 14, ey, INK, 0.7, [14, 4, 3, 4]);
    line(ex, ey - R - 14, ex, ey + R + 14, INK, 0.7, [14, 4, 3, 4]);
    if (opts.labels) {
      arrow(ex, ey - R - 8, ex, ey - R - 30, INK, 1.2);
      text('y', ex + 10, ey - R - 24, 12, INK, true);
      text('z', ex - R - 20, ey + 14, 12, INK, true);
    }

    two.update();
    // the SVG elements exist now: mark each with its component so a click can find it
    tagged.forEach(([shape, id]) => {
      const elem = shape._renderer && shape._renderer.elem;
      if (elem) { elem.dataset.part = id; elem.style.cursor = 'pointer'; }
    });
  }

  // ------------------------------------------------------------------
  // 3D view (Three.js)
  // ------------------------------------------------------------------
  let view3d = null;   // { rebuild(g), resize(), highlight() }

  // The selected component (its id in SCHEMA) or null. It is highlighted in both views and in its card.
  let selected = null;
  function select(id) {
    selected = id && cards[id] ? id : null;
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

  async function init3D() {
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
    scene.background = new THREE.Color(C.sceneBg);
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
      select(hit ? partOf(hit.object) : null);
    });

    // the selected component glows in the selection colour
    function highlight() {
      [spin, fixed, drive].forEach(grp => grp.traverse(o => {
        if (!o.material || !o.material.emissive) return;
        const on = !!selected && partOf(o) === selected;
        o.material.emissive.set(on ? C.select : 0x000000);
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
    let drivenMesh = null;               // driven pulley of the V-belt drive
    let beltRun = null;                  // belts and the marks that travel along them
    const markPos = new THREE.Vector3(), markObj = new THREE.Object3D();
    const overlay = new THREE.Group();   // arrows, labels, axes (world coordinates)
    scene.add(overlay);

    const mat = (color, extra) => new THREE.MeshStandardMaterial(Object.assign(
      { color, metalness: 0.45, roughness: 0.45 }, extra));

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

    function label(str, color, size) {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 128;
      const ctx = cv.getContext('2d');
      ctx.font = 'bold 76px system-ui, Segoe UI, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 10;
      ctx.strokeStyle = C.paper;
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

    // A pulley is a body of revolution, so its rotation is invisible: add a ring of dark through-holes
    // in the web (between hub and groove roots) that turn with it.
    function addWebHoles(mesh, pl) {
      const rin = pl.rHub, rout = pl.R - pl.depth, web = rout - rin;
      if (web < 10) return;
      const rh = Math.min(web * 0.32, rout * 0.22), rm = (rin + rout) / 2;
      const count = Math.max(3, Math.min(6, Math.round(2 * Math.PI * rm / (rh * 4.5))));
      const geo = new THREE.CylinderGeometry(rh, rh, pl.w + 1.2, 28);
      const dark = mat(C.hole, { metalness: 0.2, roughness: 0.8 });
      for (let i = 0; i < count; i++) {
        const a = i / count * Math.PI * 2;
        const hole = new THREE.Mesh(geo, dark);
        hole.position.set(rm * Math.cos(a), 0, rm * Math.sin(a));
        mesh.add(hole);
      }
    }

    function rebuild(g) {
      scene.background.set(C.sceneBg);
      clear(spin); clear(fixed); clear(overlay); clear(drive);
      pinionMesh = null;
      drivenMesh = null;
      beltRun = null;

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

        const beltMat = mat(C.belt3d, { metalness: 0.05, roughness: 0.95 });
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
          mat(C.beltMark, { metalness: 0.05, roughness: 0.9 }), per * curves.length);
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
        const ballMat = mat(C.chrome, { metalness: 0.9, roughness: 0.15 });
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
        arrow3(V(0, -1, 0), tip, L + (pin ? 2 * pn.r + pn.m : 0), FORCE, 'Fr', g.loads.Fr);
        arrow3(V(1, 0, 0), tip, L + (pin ? Math.max(pn.w, g.gear.w) / 2 : 0), FORCE, 'Fa', g.loads.Fa);
        arrow3(V(0, 0, 1), tip, L + (pin ? pn.ra : 0), FORCE, 'Ft', g.loads.Ft);
      }
      if (opts.forces && visible.pulley) {
        const rp = g.pulley.R - g.pulley.depth / 2, L = g.Rmax * 0.45;
        arrow3(V(0, 0, 1), V(g.xD, rp, g.pulley.R * 1.1 + L), L, FORCE, 'F2', g.loads.F2);
        arrow3(V(0, 0, 1), V(g.xD, -rp, g.pulley.R * 1.1 + L), L, FORCE, 'F1', g.loads.F1);
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
          overlay.add(new THREE.ArrowHelper(d, o, al, C.ink, al * 0.2, al * 0.09));
          const sp = label(n, C.ink, lsz * 0.7);
          sp.position.copy(o).addScaledVector(d, al + lsz * 0.3);
          overlay.add(sp);
        });
      }

      // Outlines: a dark line along every sharp edge, so that parts of one flat colour still show where a
      // face ends and which one is in front. Belts and balls are round all over and get none.
      if (opts.edges) {
        const edgeMat = new THREE.LineBasicMaterial({ color: C.edge, transparent: true, opacity: 0.6 });
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
      if (opts.spin) spin.rotation.y += dt * (SPEED_RPM * 2 * Math.PI / 60) / 50 * animSpeed;
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

  // ------------------------------------------------------------------
  // Glue
  // ------------------------------------------------------------------
  // ------------------------------------------------------------------
  // Design checks, fixed variables and the valid range shown on each slider
  // ------------------------------------------------------------------

  // V-belt selection for the current inputs (same method as the Calculations tab, T12), in in / hp.
  function vbeltDesign() {
    const IN = 25.4, HP = 745.7;
    const dD = P.pulley.D / IN, d2 = P.vbelt.D2 / IN;
    const big = Math.max(dD, d2), small = Math.min(dD, d2);
    const Pd = P.drive.kW * 1000 / HP * P.vbelt.Ks;
    const sec = ['A', 'B', 'C', 'D', 'E'].find(k => Pd <= EQ.V_BELT_SECTIONS[k].hp[1]) || 'E';
    const S = EQ.V_BELT_SECTIONS[sec];
    const V = EQ.beltSpeedFtPerMin(dD, P.drive.n);
    const sizes = EQ.V_BELT_CIRCUMFERENCES[sec];
    const want = EQ.vBeltPitchLengthFromCenterDistance(P.vbelt.C / IN, big, small) - EQ.V_BELT_LENGTH_ADD[sec];
    const Lin = sizes.find(x => x >= want) || sizes[sizes.length - 1];
    const C = EQ.vBeltCenterDistance(EQ.vBeltPitchLength(sec, Lin), big, small);
    const Ptab = EQ.vBeltTabulatedPower(sec, small, V);
    let Nb = null;
    if (Ptab != null) {
      const Pa = EQ.vBeltAllowablePower(EQ.vBeltAngleFactor(big, small, C), EQ.vBeltLengthFactor(sec, Lin), Ptab);
      Nb = EQ.vBeltCount(Pd, Pa);
    }
    return { sec, S, big, small, V, C, Ptab, Nb };
  }

  // Every rule the design has to meet: [id, test, detail].
  //   test(g, v)   → true when the rule is met for the current inputs
  //   detail(g, v) → { f: the condition as a formula, s: the same with the current numbers } for the Calculations tab
  const nf = (x, n) => String(Math.round(x * Math.pow(10, n == null ? 1 : n)) / Math.pow(10, n == null ? 1 : n));
  const minPinionTeeth = () => EQ.MIN_TEETH_VS_RACK[P.gear.phi] || Math.ceil(EQ.minTeethNoInterference(EQ.rad(P.gear.phi)));
  const widestGear = () => Math.max(P.gear.w, P.pinion.w);
  const seatRadius = () => (P.shaft.d + Math.max(P.shaft.ds, P.shaft.d)) / 4;
  // Shaft as a beam on bearings A and C (T04): reactions, bending moments at the gear and at bearing C,
  // then at each of those sections the Goodman fatigue factor and the yield factor at the starting peak.
  // Forces in N, lengths in mm, moments in N mm, stresses in MPa.
  function shaftAnalysis(g) {
    const L = g.loads, ab = P.layout.ab, bc = P.layout.bc, cd = P.layout.cd, span = ab + bc;
    const r = P.gear.d / 2, Fb = L.F1 + L.F2, sh = P.shaft;
    // vertical plane (x, y): Fr pushes the gear down, Fa at the pitch radius adds the couple Fa * r
    const RCy = (L.Fr * ab + L.Fa * r) / span, RAy = L.Fr - RCy;
    // horizontal plane (x, z): Ft at B and the belt pull at D point the same way; positive = opposing them
    const RCz = (L.Ft * ab + Fb * (span + cd)) / span, RAz = L.Ft + Fb - RCz;
    const MBl = Math.hypot(RAy * ab, RAz * ab), MBr = Math.hypot(RCy * bc, RAz * ab);
    const T = L.torque * 1000, peak = P.drive.peak;
    const section = (id, d, M, Fax) => {
      const sa = EQ.shaftBendingStress(sh.Kf, M, d), sax = EQ.shaftAxialStress(sh.Kf, Fax, d);
      const tm = EQ.shaftTorsionStress(sh.Kfs, T, d);
      const saEq = sa, smEq = EQ.vonMisesStress(sax, tm);          // no alternating shear, no mean bending
      const ka = EQ.marinSurfaceFactor(sh.Sut), kb = EQ.marinSizeFactor(d), ke = EQ.marinReliabilityFactor(P.given.relShaft);
      const Se = ka * kb * ke * EQ.enduranceLimitSteel(sh.Sut);
      const smax = peak * EQ.vonMisesStress(sa + sax, tm);
      return { id, d, M, sa, sax, tm, saEq, smEq, ka, kb, ke, Se, smax,
               Nf: EQ.goodmanSafetyFactor(saEq, smEq, Se, sh.Sut), Ny: EQ.yieldSafetyFactor(sh.Sy, smax) };
    };
    const sections = [section('B', 2 * seatRadius(), Math.max(MBl, MBr), L.Fa), section('C', sh.d, Fb * cd, 0)];
    return { RAy, RCy, RAz, RCz, RA: Math.hypot(RAy, RAz), RC: Math.hypot(RCy, RCz), MBl, MBr, Fb, T, sections,
             Nf: Math.min(...sections.map(x => x.Nf)), Ny: Math.min(...sections.map(x => x.Ny)) };
  }

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
  function checksHtml(g) {
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
  let bandOf = {};
  let checkNow = {};   // checkNow[checkId] = that check written with the current numbers

  // Under every worked step, list the variables its numbers depend on: the fixed ones with their value,
  // and the free ones with their current value and the range in which every check still passes.
  // Which step depends on which variable is found by moving each variable and seeing which steps change.
  function annotateCalc() {
    const els = [...document.querySelectorAll('#calcList .calc-step:not(.calc-check)')];
    if (!els.length) return;                                    // nothing is fixed: the steps are not shown
    const key = st => (st.s || '') + '|' + st.r;
    const dep = els.map(() => []);
    noFigs = true;
    try {
      const base = calcSteps(derive()).map(key);
      inputs.forEach(inp => {
        const p = inp.p, cur = P[inp.comp][inp.key];
        const d = Math.max(p.step, Math.round((p.max - p.min) * 0.1 / p.step) * p.step);
        const changed = new Set();
        [cur + d, cur - d].filter(v => v >= p.min && v <= p.max).forEach(v => {
          P[inp.comp][inp.key] = v;
          try { calcSteps(derive()).forEach((st, k) => { if (key(st) !== base[k]) changed.add(k); }); } catch (e) { /* skip this trial */ }
        });
        P[inp.comp][inp.key] = cur;
        changed.forEach(k => { if (dep[k]) dep[k].push(inp); });
      });
    } catch (e) { /* leave the steps without the list */ }
    noFigs = false;
    derive();

    const explained = new Set();
    const span = r => (r[0] === r[1] ? String(r[0]) : t('rngSpan').replace('{a}', r[0]).replace('{b}', r[1]));
    els.forEach((el, k) => {
      const old = el.querySelector('.vars');
      if (old) old.remove();
      if (!dep[k].length) return;
      const chip = inp => {
        const id = inp.comp + '.' + inp.key, v = P[inp.comp][inp.key];
        // two parts can have a variable of the same name (a width, a number of teeth): then say whose it is
        const twin = dep[k].some(o => o !== inp && t('p.' + o.comp + '.' + o.key) === t('p.' + id));
        const name = (twin ? t('c.' + inp.comp) + ', ' : '') + t('p.' + id);
        if (locked[inp.comp][inp.key]) return `<span class="var fixed">${name}: <b>${v}</b></span>`;
        const b = bandOf[id];
        if (!b || b.any) return `<span class="var">${name}: <b>${v}</b> <i>${t('rngAny')}</i></span>`;
        if (!b.runs.length) return `<span class="var bad">${name}: <b>${v}</b> <i>${t('rngNone')}</i></span>`;
        return `<span class="var${b.ok ? '' : ' bad'}">${name}: <b>${v}</b> <i>${t('rngValid').replace('{r}', b.runs.map(span).join(' ; '))}</i></span>`;
      };
      const fixedVars = dep[k].filter(i => locked[i.comp][i.key]), freeVars = dep[k].filter(i => !locked[i.comp][i.key]);
      // a free variable that is out of range gets its reasons: every check that limits it, the values that
      // check accepts, and the check with today's numbers. Open the first time it appears, folded after that.
      const why = freeVars.map(inp => {
        const id = inp.comp + '.' + inp.key, b = bandOf[id];
        if (!b || b.any || b.ok) return '';
        const open = explained.has(id) ? '' : ' open';
        explained.add(id);
        const lines = b.limits.map(c => `
          <li class="${c.ok ? 'ok' : 'bad'}"><b>${c.ok ? '✓' : '✗'}</b>
            <span><button type="button" class="why-link" data-check="${c.id}">${t('k.' + c.id)}</button>:
            ${t('whyNeeds').replace('{r}', c.runs.map(span).join(' ; '))}
            ${checkNow[c.id] ? `<small>${t('whyNow')} ${checkNow[c.id]}</small>` : ''}</span></li>`).join('');
        return `<details class="var-why"${open}><summary>${t('p.' + id)}: <b>${P[inp.comp][inp.key]}</b>, `
          + `${t(b.runs.length ? 'whyOut' : 'whyNone')}</summary><ul>${lines}</ul></details>`;
      }).join('');
      const row = (title, list) => (list.length ? `<div><span class="vars-h">${title}</span>${list.map(chip).join('')}</div>` : '');
      el.insertAdjacentHTML('beforeend', `<div class="vars">${row(t('varsFixed'), fixedVars)}${row(t('varsFree'), freeVars)}${why}</div>`);
    });
  }

  const anyLocked = () => inputs.some(i => locked[i.comp][i.key]);

  // For every variable that is not fixed, try each value of its slider with everything else as it is now.
  // A value is good when every check that this variable can influence passes. The good stretch is painted
  // on the slider track. Checks that fail whatever this variable is set to are not held against it.
  function updateBands() {
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
    const GREEN = C.valid, GREY = C.line;
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
        inp.range.style.background = C.invalid;
        inp.range.title = t('bandNone');
      }
    });
    derive();   // the trial values moved the shared power / speed globals: put them back
    annotateCalc();
  }

  let bandTimer = 0;
  function scheduleBands() {
    clearTimeout(bandTimer);
    bandTimer = setTimeout(updateBands, 140);
  }

  let pending = false;
  function refresh() {
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

  // language: fill every [data-i18n] element, then redraw the generated text (loads, calculations, 2D labels)
  function applyLang() {
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
  document.querySelectorAll('.langs button[data-lang]').forEach(b => {
    b.addEventListener('click', () => {
      lang = b.dataset.lang;
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

  // the two side columns (variables; loads and checks) can be hidden to leave only the views
  function applyPanels() {
    document.body.classList.toggle('no-vars', !opts.showVars);
    document.body.classList.toggle('no-loads', !opts.showLoads);
    $('#btnVars').setAttribute('aria-pressed', String(opts.showVars));
    $('#btnLoads').setAttribute('aria-pressed', String(opts.showLoads));
  }
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

  buildUI();
  applyLang();
  init2D();
  refresh();
  init3D().then(refresh);

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
})();
