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
    const json = JSON.stringify({ lang, theme: themeChosen ? theme : undefined, P, visible, opts, locked });
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
      force: '#b5463c', valid: '#6a9f7c', invalid: '#e6cfcb',
      steel: '#dfe3e7', steel2: '#d2d7dc', steel3: '#c5cbd1', ring: '#cfdae4', ball: '#f1f3f5', chrome: '#e3e6e9',
      belt: '#4d5257', belt3d: '#3f4347', beltMark: '#a9afb6', hole: '#2a2d31',
      comp: { given: '#7a8794', drive: '#5b7fa6', shaft: '#8b949e', bearingA: '#5c85ad', pinion: '#b0705f', gear: '#b8904f',
              bearingC: '#5f9a90', pulley: '#8676a8', layout: '#6a727b', design: '#6f9a7c', vbelt: '#a56f8a' },
      fill: { gear: '#eadfc8', pinion: '#ead3cb', pulley: '#e2dcee', pulleyHub: '#d6cfe6',
              driven: '#efdfe7', drivenHub: '#e3cdd8', pitch: '#8a6a2c' },
    },
    dark: {
      ink: '#d7dce2', dim: '#b4bcc5', muted: '#98a2ad', paper: '#1e2125', line: '#3a4048', sceneBg: '#1a1c20',
      force: '#d9796f', valid: '#6fae86', invalid: '#5a3b38',
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
    hint3d:     ['drag to orbit, wheel to zoom, right-drag to pan',
                 'arrastrar para orbitar, rueda para zoom, arrastrar con botón derecho para desplazar',
                 'arrossega per orbitar, roda per fer zoom, arrossega amb el botó dret per desplaçar'],
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
    cw0: ['n is the shaft speed set in the "Power and speed" card; the statement gives 800 rpm.',
          'n es la velocidad del árbol fijada en la tarjeta «Potencia y velocidad»; el enunciado da 800 rpm.',
          "n és la velocitat de l'arbre fixada a la targeta «Potència i velocitat»; l'enunciat dona 800 rpm."],
    cw1: ['The same torque enters at gear B and leaves at pulley D (losses neglected).',
          'El mismo par entra por la rueda B y sale por la polea D (se desprecian las pérdidas).',
          'El mateix parell entra per la roda B i surt per la politja D (es negligeixen les pèrdues).'],
    cw2: ['The pinion shares this module so the teeth can mesh.',
          'El piñón comparte este módulo para que los dientes engranen.',
          'El pinyó comparteix aquest mòdul perquè les dents engranin.'],
    cw3: ['Acts at the pitch circle, along z.',
          'Actúa en la circunferencia primitiva, según z.',
          'Actua a la circumferència primitiva, segons z.'],
    cw4: ['φ<sub>t</sub> = {phi}° is the transverse pressure angle (20° in the statement). Points towards the shaft axis (−y).',
          'φ<sub>t</sub> = {phi}° es el ángulo de presión transversal (20° en el enunciado). Apunta hacia el eje del árbol (−y).',
          "φ<sub>t</sub> = {phi}° és l'angle de pressió transversal (20° a l'enunciat). Apunta cap a l'eix de l'arbre (−y)."],
    cw5: ['Along x; taken by the located bearing A.',
          'Según x; la absorbe el rodamiento fijo A.',
          "Segons x; l'absorbeix el rodament localitzat A."],
    cw6: ['The tension ratio k = F1/F2 comes from the statement (5): F<sub>1</sub> = ΔF × k / (k − 1) and F<sub>2</sub> = ΔF / (k − 1), with ΔF = F<sub>1</sub> − F<sub>2</sub>.',
          'La relación de tensiones k = F1/F2 viene del enunciado (5): F<sub>1</sub> = ΔF × k / (k − 1) y F<sub>2</sub> = ΔF / (k − 1), con ΔF = F<sub>1</sub> − F<sub>2</sub>.',
          "La relació de tensions k = F1/F2 ve de l'enunciat (5): F<sub>1</sub> = ΔF × k / (k − 1) i F<sub>2</sub> = ΔF / (k − 1), amb ΔF = F<sub>1</sub> − F<sub>2</sub>."],
    cw7: ['', '', ''],
    cw8: ['The motor runs at {m} rpm, which needs i = {i}.',
          'El motor gira a {m} rpm, lo que requiere i = {i}.',
          'El motor gira a {m} rpm, cosa que requereix i = {i}.'],
    cw9: ['e<sub>L</sub>, e<sub>R</sub> are the left and right overhangs.',
          'e<sub>L</sub>, e<sub>R</sub> son los voladizos izquierdo y derecho.',
          'e<sub>L</sub>, e<sub>R</sub> són els voladissos esquerre i dret.'],
    // gear check steps (table lookups)
    'c.design':   ['Gear check', 'Comprobación del engranaje', "Comprovació de l'engranatge"],
    'p.design.life': ['Required gear life (h)', 'Vida requerida de las ruedas (h)', 'Vida requerida de les rodes (h)'],
    'p.design.Qv': ['Quality index Qv', 'Índice de calidad Qv', 'Índex de qualitat Qv'],
    ct10: ['Minimum pinion teeth (interference)', 'Número mínimo de dientes del piñón (interferencia)', 'Nombre mínim de dents del pinyó (interferència)'],
    cw10ok:  ['The pinion has {z} teeth: no interference with full-depth teeth.',
              'El piñón tiene {z} dientes: sin interferencia con dientes de profundidad total.',
              'El pinyó té {z} dents: sense interferència amb dents de profunditat total.'],
    cw10bad: ['The pinion has {z} teeth, below the minimum: expect interference (undercut) with standard full-depth teeth.',
              'El piñón tiene {z} dientes, por debajo del mínimo: habrá interferencia (rebaje) con dientes estándar de profundidad total.',
              'El pinyó té {z} dents, per sota del mínim: hi haurà interferència (rebaix) amb dents estàndard de profunditat total.'],
    ct11: ['Normal module and next standard module', 'Módulo normal y siguiente módulo estándar', 'Mòdul normal i següent mòdul estàndard'],
    cw11: ['Standard modules apply in the normal plane of a helical gear.',
           'Los módulos estándar se aplican en el plano normal de un engranaje helicoidal.',
           "Els mòduls estàndard s'apliquen al pla normal d'un engranatge helicoïdal."],
    stdNone: ['above the largest standard module', 'por encima del mayor módulo estándar', 'per sobre del mòdul estàndard més gran'],
    ct12: ['Application factor K<sub>a</sub>', 'Factor de aplicación K<sub>a</sub>', "Factor d'aplicació K<sub>a</sub>"],
    kaSel: ['Driver: electric motor (uniform); Driven machine: moderate shock',
            'Máquina impulsora: motor eléctrico (uniforme); Máquina impulsada: impacto moderado',
            'Màquina impulsora: motor elèctric (uniforme); Màquina impulsada: impacte moderat'],
    cw12: ['The statement says an electric motor drives a machine with a moderately variable load.',
           'El enunciado indica un motor eléctrico que acciona una máquina con carga moderadamente variable.',
           "L'enunciat indica un motor elèctric que acciona una màquina amb càrrega moderadament variable."],
    ct13: ['Load distribution factor K<sub>m</sub>', 'Factor de distribución de carga K<sub>m</sub>', 'Factor de distribució de càrrega K<sub>m</sub>'],
    kmSel: ['Face width F = {F} mm → row "{row} mm"', 'Anchura de cara F = {F} mm → fila «{row} mm»', 'Amplada de cara F = {F} mm → fila «{row} mm»'],
    cw13: ['F is the face width of gear B; the next tabulated width up is used.',
           'F es la anchura de cara de la rueda B; se toma la siguiente anchura tabulada.',
           "F és l'amplada de cara de la roda B; es pren la següent amplada tabulada."],
    ct14: ['Pitch-line velocity and dynamic factor K<sub>v</sub>', 'Velocidad en la línea de paso y factor dinámico K<sub>v</sub>', 'Velocitat a la línia de pas i factor dinàmic K<sub>v</sub>'],
    cw14: ['Q<sub>v</sub> is the quality index set in the "Gear check" card. Read the chart on the m/s axis.',
           'Q<sub>v</sub> es el índice de calidad fijado en la tarjeta «Comprobación del engranaje». El gráfico se lee en el eje de m/s.',
           "Q<sub>v</sub> és l'índex de qualitat fixat a la targeta «Comprovació de l'engranatge». El gràfic es llegeix a l'eix de m/s."],
    ct15: ['Bending geometry factor J', 'Factor geométrico de flexión J', 'Factor geomètric de flexió J'],
    jSel:  ['Pinion {np} teeth, gear {ng} teeth → read at {npu} / {ngu}',
            'Piñón de {np} dientes, rueda de {ng} dientes → se lee en {npu} / {ngu}',
            'Pinyó de {np} dents, roda de {ng} dents → es llegeix a {npu} / {ngu}'],
    jNone: ['Pinion {np} teeth, gear {ng} teeth → not in the table',
            'Piñón de {np} dientes, rueda de {ng} dientes → fuera de la tabla',
            'Pinyó de {np} dents, roda de {ng} dents → fora de la taula'],
    jNoneR: ['J not tabulated for this pair', 'J no tabulado para este par', 'J no tabulat per a aquest parell'],
    cw15: ['Table 9-5 is for φ = 25° and ψ = 20°; other angles need their own table. Tooth counts are rounded down to the nearest tabulated value.',
           'La tabla 9-5 es para φ = 25° y ψ = 20°; otros ángulos requieren su propia tabla. El número de dientes se redondea hacia abajo al valor tabulado más cercano.',
           "La taula 9-5 és per a φ = 25° i ψ = 20°; altres angles requereixen la seva pròpia taula. El nombre de dents s'arrodoneix cap avall al valor tabulat més proper."],
    ct16: ['Elastic coefficient C<sub>p</sub>', 'Coeficiente elástico C<sub>p</sub>', 'Coeficient elàstic C<sub>p</sub>'],
    cpSel: ['Pinion: steel; Gear: steel', 'Piñón: acero; Rueda: acero', 'Pinyó: acer; Roda: acer'],
    cw16: ['Steel on steel is assumed; the statement does not give the materials.',
           'Se supone acero contra acero; el enunciado no indica los materiales.',
           "Se suposa acer contra acer; l'enunciat no indica els materials."],
    ct17: ['Bending stress at the tooth root', 'Tensión de flexión en la raíz del diente', "Tensió de flexió a l'arrel de la dent"],
    cw17: ['K<sub>s</sub> = K<sub>B</sub> = K<sub>I</sub> = 1 (solid gears, no idler). m is the transverse module.',
           'K<sub>s</sub> = K<sub>B</sub> = K<sub>I</sub> = 1 (ruedas macizas, sin rueda loca). m es el módulo transversal.',
           'K<sub>s</sub> = K<sub>B</sub> = K<sub>I</sub> = 1 (rodes massisses, sense roda boja). m és el mòdul transversal.'],
    noJ:  ['needs J, which is not tabulated for this tooth count', 'requiere J, no tabulado para este número de dientes', 'requereix J, no tabulat per a aquest nombre de dents'],
    // V-belt drive steps
    'c.vbelt':        ['V-belt drive (pulley D)', 'Transmisión por correa trapezoidal (polea D)', 'Transmissió per corretja trapezoïdal (politja D)'],
    'c.vbeltSection': ['Section', 'Sección', 'Secció'],
    'p.vbelt.D2':     ['Other pulley pitch diameter (mm)', 'Diámetro de paso de la otra polea (mm)', "Diàmetre de pas de l'altra politja (mm)"],
    'p.vbelt.C':      ['Centre distance (mm)', 'Distancia entre centros (mm)', 'Distància entre centres (mm)'],
    'p.vbelt.Ks':     ['Service factor Ks', 'Factor de servicio Ks', 'Factor de servei Ks'],
    ct18: ['V-belt: design power', 'Correa trapezoidal: potencia de diseño', 'Corretja trapezoïdal: potència de disseny'],
    cw18: ['K<sub>s</sub> is set in the "V-belt drive" card; 1.1–1.3 is the range for a light-shock machine driven by a normal-torque source. Design factor N<sub>d</sub> = 1.',
           'K<sub>s</sub> se fija en la tarjeta «Transmisión por correa trapezoidal»; 1,1–1,3 es el intervalo para una máquina con impacto ligero y fuente de par normal. Factor de diseño N<sub>d</sub> = 1.',
           "K<sub>s</sub> es fixa a la targeta «Transmissió per corretja trapezoïdal»; 1,1–1,3 és l'interval per a una màquina amb impacte lleuger i font de parell normal. Factor de disseny N<sub>d</sub> = 1."],
    ct19: ['V-belt: section', 'Correa trapezoidal: sección', 'Corretja trapezoïdal: secció'],
    secSel: ['P<sub>d</sub> = {P} hp, smaller pulley d = {d} in → section {s}',
             'P<sub>d</sub> = {P} hp, polea menor d = {d} pulg → sección {s}',
             'P<sub>d</sub> = {P} hp, politja menor d = {d} in → secció {s}'],
    cw19ok:  ['Smallest section whose power range covers P<sub>d</sub>. The smaller pulley meets the minimum diameter of {m} in.',
              'Sección más pequeña cuyo intervalo de potencias cubre P<sub>d</sub>. La polea menor cumple el diámetro mínimo de {m} pulg.',
              "Secció més petita amb un interval de potències que cobreix P<sub>d</sub>. La politja menor compleix el diàmetre mínim de {m} in."],
    cw19bad: ['Smallest section whose power range covers P<sub>d</sub>. The smaller pulley is below the minimum diameter of {m} in for this section.',
              'Sección más pequeña cuyo intervalo de potencias cubre P<sub>d</sub>. La polea menor está por debajo del diámetro mínimo de {m} pulg para esta sección.',
              "Secció més petita amb un interval de potències que cobreix P<sub>d</sub>. La politja menor està per sota del diàmetre mínim de {m} in per a aquesta secció."],
    ct20: ['V-belt: belt speed', 'Correa trapezoidal: velocidad de la correa', 'Corretja trapezoïdal: velocitat de la corretja'],
    cw20: ['d is the pitch diameter of pulley D (its outer diameter is used) in inches; n = {n} rpm. V-belts are meant to run at 4000–5000 ft/min.',
           'd es el diámetro de paso de la polea D (se usa su diámetro exterior) en pulgadas; n = {n} rpm. Las correas trapezoidales están pensadas para 4000–5000 pies/min.',
           "d és el diàmetre de pas de la politja D (s'usa el diàmetre exterior) en polzades; n = {n} rpm. Les corretges trapezoïdals estan pensades per a 4000–5000 ft/min."],
    ct21: ['V-belt: belt length and standard belt', 'Correa trapezoidal: longitud y correa normalizada', 'Corretja trapezoïdal: longitud i corretja normalitzada'],
    cw21: ['The inside circumference is L<sub>p</sub> minus {a} in for section {s}; the next standard length up is taken. C is the centre distance set in the "V-belt drive" card.',
           'La circunferencia interior es L<sub>p</sub> menos {a} pulg para la sección {s}; se toma la siguiente longitud normalizada. C es la distancia entre centros fijada en la tarjeta «Transmisión por correa trapezoidal».',
           'La circumferència interior és L<sub>p</sub> menys {a} in per a la secció {s}; es pren la següent longitud normalitzada. C és la distància entre centres fixada a la targeta «Transmissió per corretja trapezoïdal».'],
    ct22: ['V-belt: centre distance with the standard belt', 'Correa trapezoidal: distancia entre centros con la correa normalizada', 'Corretja trapezoïdal: distància entre centres amb la corretja normalitzada'],
    cw22ok:  ['Meets the design condition D < C < 3(D + d).', 'Cumple la condición de diseño D < C < 3(D + d).', 'Compleix la condició de disseny D < C < 3(D + d).'],
    cw22bad: ['Outside the design condition D < C < 3(D + d).', 'Fuera de la condición de diseño D < C < 3(D + d).', 'Fora de la condició de disseny D < C < 3(D + d).'],
    ct23: ['V-belt: rated power per belt', 'Correa trapezoidal: potencia tabulada por correa', 'Corretja trapezoïdal: potència tabulada per corretja'],
    ptSel: ['Section {s}, d = {d} in, V = {V} ft/min', 'Sección {s}, d = {d} pulg, V = {V} pies/min', 'Secció {s}, d = {d} in, V = {V} ft/min'],
    cw23: ['Interpolated between the marked cells; d is the smaller pulley.', 'Interpolado entre las celdas marcadas; d es la polea menor.', 'Interpolat entre les cel·les marcades; d és la politja menor.'],
    ptNone: ['the smaller pulley is below the smallest tabulated diameter', 'la polea menor está por debajo del menor diámetro tabulado', 'la politja menor està per sota del menor diàmetre tabulat'],
    ct24: ['V-belt: contact angle factor K<sub>1</sub>', 'Correa trapezoidal: factor del ángulo de contacto K<sub>1</sub>', "Corretja trapezoïdal: factor de l'angle de contacte K<sub>1</sub>"],
    cw24: ['V-belt on V-grooved pulleys (column VV), interpolated between the marked rows.',
           'Correa trapezoidal sobre poleas acanaladas (columna VV), interpolado entre las filas marcadas.',
           'Corretja trapezoïdal sobre politges acanalades (columna VV), interpolat entre les files marcades.'],
    ct25: ['V-belt: length factor K<sub>2</sub>', 'Correa trapezoidal: factor de longitud K<sub>2</sub>', 'Corretja trapezoïdal: factor de longitud K<sub>2</sub>'],
    k2Sel: ['Belt {b} → section {s}, nominal length {L} in', 'Correa {b} → sección {s}, longitud nominal {L} pulg', 'Corretja {b} → secció {s}, longitud nominal {L} in'],
    ct26: ['V-belt: allowable power and number of belts', 'Correa trapezoidal: potencia admisible y número de correas', 'Corretja trapezoïdal: potència admissible i nombre de corretges'],
    cw26ok:  ['Pulley D has {n} grooves: enough. Safety factor P<sub>a</sub> × N<sub>b</sub> / (P<sub>nom</sub> × K<sub>s</sub>) = {sf}.',
              'La polea D tiene {n} canales: suficiente. Factor de seguridad P<sub>a</sub> × N<sub>b</sub> / (P<sub>nom</sub> × K<sub>s</sub>) = {sf}.',
              'La politja D té {n} canals: suficient. Factor de seguretat P<sub>a</sub> × N<sub>b</sub> / (P<sub>nom</sub> × K<sub>s</sub>) = {sf}.'],
    cw26bad: ['Pulley D has only {n} grooves: {nb} are needed.', 'La polea D solo tiene {n} canales: se necesitan {nb}.', "La politja D només té {n} canals: se'n necessiten {nb}."],
    ct27: ['V-belt: belt forces', 'Correa trapezoidal: fuerzas en la correa', 'Corretja trapezoïdal: forces a la corretja'],
    cw27: ['Per belt, with the design power. θ is the contact angle on the smaller pulley and 0.5123 the effective friction coefficient. Total pull on the shaft ≈ N<sub>b</sub> (F<sub>1</sub> + F<sub>2</sub>) = {tot} N.',
           'Por correa, con la potencia de diseño. θ es el ángulo de contacto en la polea menor y 0,5123 el coeficiente de fricción efectivo. Tiro total sobre el árbol ≈ N<sub>b</sub> (F<sub>1</sub> + F<sub>2</sub>) = {tot} N.',
           "Per corretja, amb la potència de disseny. θ és l'angle de contacte a la politja menor i 0,5123 el coeficient de fricció efectiu. Tir total sobre l'arbre ≈ N<sub>b</sub> (F<sub>1</sub> + F<sub>2</sub>) = {tot} N."],
    // fixing variables and design checks
    met:        ['Met', 'Se cumple', 'Es compleix'],
    notMet:     ['Not met', 'No se cumple', 'No es compleix'],
    showCalc:   ['Show the calculation', 'Ver el cálculo', 'Mostra el càlcul'],
    fix:        ['fix', 'fijar', 'fixa'],
    fixed:      ['fixed', 'fijo', 'fixat'],
    checksTitle: ['Design checks', 'Comprobaciones de diseño', 'Comprovacions de disseny'],
    checksCount: ['{a} of {b} pass', '{a} de {b} correctas', '{a} de {b} correctes'],
    bandTip:    ['works from {a} to {b}', 'válido de {a} a {b}', 'vàlid de {a} a {b}'],
    bandNone:   ['No value of this variable makes its checks pass', 'Ningún valor de esta variable cumple sus comprobaciones', "Cap valor d'aquesta variable compleix les seves comprovacions"],
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
    cw28: ['h is the required gear life set in the "Gear check" card (20 000 h in the statement). Each tooth is loaded once per turn.',
           'h es la vida requerida de las ruedas fijada en la tarjeta «Comprobación del engranaje» (20 000 h en el enunciado). Cada diente se carga una vez por vuelta.',
           "h és la vida requerida de les rodes fixada a la targeta «Comprovació de l'engranatge» (20 000 h a l'enunciat). Cada dent es carrega un cop per volta."],
    ct29: ['Gear life: bending life factor K<sub>L</sub>', 'Vida de las ruedas: factor de vida a flexión K<sub>L</sub>', 'Vida de les rodes: factor de vida a flexió K<sub>L</sub>'],
    cw29: ['Upper (commercial) curve of the chart, valid above about 3 × 10<sup>6</sup> cycles. It scales the bending strength: S<sub>fb</sub> = K<sub>L</sub> / (K<sub>T</sub> K<sub>R</sub>) × S′<sub>fb</sub>.',
           'Curva superior (comercial) del gráfico, válida por encima de unos 3 × 10<sup>6</sup> ciclos. Escala la resistencia a flexión: S<sub>fb</sub> = K<sub>L</sub> / (K<sub>T</sub> K<sub>R</sub>) × S′<sub>fb</sub>.',
           'Corba superior (comercial) del gràfic, vàlida per sobre d\'uns 3 × 10<sup>6</sup> cicles. Escala la resistència a flexió: S<sub>fb</sub> = K<sub>L</sub> / (K<sub>T</sub> K<sub>R</sub>) × S′<sub>fb</sub>.'],
    ct30: ['Gear life: surface life factor C<sub>L</sub>', 'Vida de las ruedas: factor de vida superficial C<sub>L</sub>', 'Vida de les rodes: factor de vida superficial C<sub>L</sub>'],
    cw30: ['Upper (commercial) curve of the chart. It scales the surface strength: S<sub>fc</sub> = C<sub>L</sub> C<sub>H</sub> / (C<sub>T</sub> C<sub>R</sub>) × S′<sub>fc</sub>.',
           'Curva superior (comercial) del gráfico. Escala la resistencia superficial: S<sub>fc</sub> = C<sub>L</sub> C<sub>H</sub> / (C<sub>T</sub> C<sub>R</sub>) × S′<sub>fc</sub>.',
           'Corba superior (comercial) del gràfic. Escala la resistència superficial: S<sub>fc</sub> = C<sub>L</sub> C<sub>H</sub> / (C<sub>T</sub> C<sub>R</sub>) × S′<sub>fc</sub>.'],
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
    cw31: ['T is the working temperature set in the bearings card. K<sub>T</sub> divides both gear strengths.',
           'T es la temperatura de trabajo fijada en la tarjeta de rodamientos. K<sub>T</sub> divide ambas resistencias de las ruedas.',
           'T és la temperatura de treball fixada a la targeta de rodaments. K<sub>T</sub> divideix totes dues resistències de les rodes.'],
    ct32: ['Bearings: required life in revolutions', 'Rodamientos: vida requerida en revoluciones', 'Rodaments: vida requerida en revolucions'],
    cw32: ['Life the bearings must reach at {r} % reliability. Choosing the bearing and checking its load rating is not in the app yet.',
           'Vida que deben alcanzar los rodamientos con una fiabilidad del {r} %. La elección del rodamiento y la comprobación de su capacidad de carga aún no están en la app.',
           "Vida que han d'assolir els rodaments amb una fiabilitat del {r} %. L'elecció del rodament i la comprovació de la seva capacitat de càrrega encara no són a l'app."],
    ct33: ['Shaft: bearing reactions, vertical plane (x, y)', 'Árbol: reacciones en los rodamientos, plano vertical (x, y)', 'Arbre: reaccions als rodaments, pla vertical (x, y)'],
    cw33: ['The shaft is a beam on A and C. In this plane F<sub>r</sub> pushes the gear down and F<sub>a</sub>, acting at the pitch radius, adds the couple F<sub>a</sub> × d<sub>B</sub> / 2. Bearing A also takes the whole axial force F<sub>a</sub>.',
           'El árbol es una viga apoyada en A y C. En este plano F<sub>r</sub> empuja la rueda hacia abajo y F<sub>a</sub>, aplicada en el radio primitivo, añade el par F<sub>a</sub> × d<sub>B</sub> / 2. El rodamiento A absorbe además toda la fuerza axial F<sub>a</sub>.',
           "L'arbre és una biga recolzada en A i C. En aquest pla F<sub>r</sub> empeny la roda cap avall i F<sub>a</sub>, aplicada al radi primitiu, hi afegeix el parell F<sub>a</sub> × d<sub>B</sub> / 2. El rodament A absorbeix a més tota la força axial F<sub>a</sub>."],
    ct34: ['Shaft: bearing reactions, horizontal plane (x, z)', 'Árbol: reacciones en los rodamientos, plano horizontal (x, z)', 'Arbre: reaccions als rodaments, pla horitzontal (x, z)'],
    cw34: ['F<sub>t</sub> at B and the belt pull F<sub>1</sub> + F<sub>2</sub> at D act in the same direction. A negative value means the reaction points the same way as those forces. R<sub>A</sub> and R<sub>C</sub> are the radial loads on the bearings.',
           'F<sub>t</sub> en B y el tiro de las correas F<sub>1</sub> + F<sub>2</sub> en D actúan en el mismo sentido. Un valor negativo indica que la reacción tiene el mismo sentido que esas fuerzas. R<sub>A</sub> y R<sub>C</sub> son las cargas radiales sobre los rodamientos.',
           'F<sub>t</sub> a B i la tracció de les corretges F<sub>1</sub> + F<sub>2</sub> a D actuen en el mateix sentit. Un valor negatiu indica que la reacció té el mateix sentit que aquestes forces. R<sub>A</sub> i R<sub>C</sub> són les càrregues radials sobre els rodaments.'],
    ct35: ['Shaft: bending moments at the critical sections', 'Árbol: momentos flectores en las secciones críticas', 'Arbre: moments flectors a les seccions crítiques'],
    cw35: ['The two candidate sections are the gear B (the couple of F<sub>a</sub> makes the moment jump there, so the larger side is taken) and the bearing C, where the overhung pulley bends the shaft. The torque T runs from B to D, so it acts on both.',
           'Las dos secciones candidatas son la rueda B (el par de F<sub>a</sub> hace saltar el momento, así que se toma el lado mayor) y el rodamiento C, donde la polea en voladizo flecta el árbol. El par T va de B a D, de modo que actúa en ambas.',
           "Les dues seccions candidates són la roda B (el parell de F<sub>a</sub> fa saltar el moment, de manera que es pren el costat més gran) i el rodament C, on la politja en voladís flecta l'arbre. El parell T va de B a D, de manera que actua a totes dues."],
    ct36: ['Shaft: endurance limit S<sub>e</sub>', 'Árbol: límite de fatiga S<sub>e</sub>', 'Arbre: límit de fatiga S<sub>e</sub>'],
    cw36: ['T04 uses S<sub>e</sub> but does not say how to get it. These are the Marin factors of Budynas and Nisbett (chapter 6): machined surface, size factor for each diameter, and reliability {r} % from the statement. The steel is an assumption of the app (the one of the T04 examples).',
           'T04 usa S<sub>e</sub> pero no dice cómo obtenerlo. Estos son los factores de Marin de Budynas y Nisbett (capítulo 6): superficie mecanizada, factor de tamaño para cada diámetro y fiabilidad del {r} % del enunciado. El acero es una suposición de la app (el de los ejemplos de T04).',
           "T04 fa servir S<sub>e</sub> però no diu com obtenir-lo. Aquests són els factors de Marin de Budynas i Nisbett (capítol 6): superfície mecanitzada, factor de mida per a cada diàmetre i fiabilitat del {r} % de l'enunciat. L'acer és una suposició de l'app (el dels exemples de T04)."],
    ct37: ['Shaft: stresses at the critical sections', 'Árbol: tensiones en las secciones críticas', 'Arbre: tensions a les seccions crítiques'],
    cw37: ['The shaft turns under loads of fixed direction, so bending fully reverses each turn (M<sub>a</sub> = M, M<sub>m</sub> = 0) while the torque is steady (T<sub>m</sub> = T, T<sub>a</sub> = 0). The axial stress of F<sub>a</sub> only exists between A and B. K<sub>f</sub> and K<sub>fs</sub> are inputs of the Shaft card.',
           'El árbol gira bajo cargas de dirección fija, así que la flexión se invierte por completo en cada vuelta (M<sub>a</sub> = M, M<sub>m</sub> = 0) mientras que el par es constante (T<sub>m</sub> = T, T<sub>a</sub> = 0). La tensión axial de F<sub>a</sub> solo existe entre A y B. K<sub>f</sub> y K<sub>fs</sub> son entradas de la tarjeta Árbol.',
           "L'arbre gira sota càrregues de direcció fixa, de manera que la flexió s'inverteix del tot a cada volta (M<sub>a</sub> = M, M<sub>m</sub> = 0) mentre que el parell és constant (T<sub>m</sub> = T, T<sub>a</sub> = 0). La tensió axial de F<sub>a</sub> només existeix entre A i B. K<sub>f</sub> i K<sub>fs</sub> són entrades de la targeta Arbre."],
    ct38: ['Shaft: fatigue safety factor (Goodman)', 'Árbol: coeficiente de seguridad a fatiga (Goodman)', 'Arbre: coeficient de seguretat a fatiga (Goodman)'],
    cw38: ['Goodman with the von Mises equivalents (T04). The smaller of the two sections must reach the required factor, {n} in the statement.',
           'Goodman con los equivalentes de von Mises (T04). La menor de las dos secciones debe alcanzar el coeficiente requerido, {n} en el enunciado.',
           "Goodman amb els equivalents de von Mises (T04). La més petita de les dues seccions ha d'assolir el coeficient requerit, {n} a l'enunciat."],
    ct39: ['Shaft: yield safety factor at the starting peak', 'Árbol: coeficiente de seguridad a fluencia en el pico de arranque', "Arbre: coeficient de seguretat a fluència en el pic d'arrencada"],
    cw39: ['Yield check of T04 with every load multiplied by the peak factor {k}, since all the forces are proportional to the torque. The smaller value must be at least {n}.',
           'Comprobación a fluencia de T04 con todas las cargas multiplicadas por el factor de pico {k}, ya que todas las fuerzas son proporcionales al par. El valor menor debe ser al menos {n}.',
           "Comprovació a fluència de T04 amb totes les càrregues multiplicades pel factor de pic {k}, ja que totes les forces són proporcionals al parell. El valor més petit ha de ser almenys {n}."],
    pinionWord: ['pinion', 'piñón', 'pinyó'],
    gearWord:   ['gear', 'rueda', 'roda'],
  };
  const t = key => (T[key] ? T[key][LANGS.indexOf(lang)] : key);

  const SCHEMA = [
    { id: 'drive', noToggle: true, params: [
      { key: 'kW', min: 0.5, max: 50,   step: 0.1, def: 4 },
      { key: 'n',  min: 50,  max: 3000, step: 10,  def: 800 },
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
    moon:   svgIcon('', '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>'),
  };

  const P = {};        // P[componentId][paramKey] = value
  const visible = {};  // visible[componentId] = bool
  const opts = { spin: true, forces: true, labels: true, showVars: true, showLoads: true };
  const colorOf = {};

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
    };

    // Pinion: meshes with B from above, same module, opposite helix hand
    const pz = P.pinion.z, pr = m * pz / 2;
    const pinion = {
      x: xB, w: P.pinion.w, z: pz, m, r: pr,
      ra: pr + m,
      rf: Math.max(pr - 1.25 * m, pr * 0.4),
      beta: -gear.beta,
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
      syncInputs();
      refresh();
    });
    $('#btnTheme').addEventListener('click', () => { themeChosen = true; setTheme(theme === 'dark' ? 'light' : 'dark'); });
    // with no choice stored, follow the system when it switches between light and dark
    if (systemDark && systemDark.addEventListener) {
      systemDark.addEventListener('change', e => { if (!themeChosen) setTheme(e.matches ? 'dark' : 'light'); });
    }
    $('#btnPlay').addEventListener('click', () => {
      opts.spin = !opts.spin;
      updatePlayButton();
      refresh();
    });
    [['#optForces', 'forces'], ['#optLabels', 'labels']].forEach(([sel, key]) => {
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
  function updateCalc(g) {
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
    const fig = (id, picks, label) => (typeof TableFigure !== 'undefined' ? TableFigure.render(id, picks, label) : '');
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
        w: fill(pn.z >= nTab ? 'cw10ok' : 'cw10bad', { z: pn.z }),
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
          w: fill(small >= S.dMin ? 'cw19ok' : 'cw19bad', { m: f(S.dMin, 1) }),
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
          w: fill('cw21', { a: add, s: sec }),
          fig: fig('vbeltLengths', [{ row: sec }], sec + Lin),
        });

        const C = EQ.vBeltCenterDistance(Lp, big, small);
        steps.push({
          f: 'C = 0.25 { [L<sub>p</sub> − π/2 (D + d)] + √( [L<sub>p</sub> − π/2 (D + d)]² − 2 (D − d)² ) }',
          s: `L<sub>p</sub> = ${f(Lp, 1)} in ,  D = ${f(big, 2)} in ,  d = ${f(small, 2)} in`,
          r: `C = ${f(C, 2)} in = ${f(C * IN, 0)} mm`,
          w: t(EQ.vBeltCenterDistanceOk(C, big, small) ? 'cw22ok' : 'cw22bad'),
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
            w: fill(grooves >= Nb ? 'cw26ok' : 'cw26bad', { n: grooves, nb: Nb, sf: f(EQ.vBeltSafetyFactor(Pa, Math.max(Nb, 1), Pnom, Ks), 2) }),
          });

          const theta = EQ.vBeltContactAngle(big, small, C), Fc = EQ.vBeltCentrifugalForce(sec, V);
          const T = EQ.torqueFromPowerHp(Pd, SPEED_RPM), dF = EQ.vBeltNetForcePerBelt(T, dD, Nb);
          const F1 = EQ.vBeltTightSide(dF, Fc, theta), F2 = EQ.vBeltSlackSide(F1, dF), Fi = EQ.vBeltInitialTension(F1, F2, Fc);
          steps.push({
            f: 'F<sub>c</sub> = K<sub>c</sub> (V/1000)² ,  ΔF = 2T / (d × N<sub>b</sub>) ,  F<sub>1</sub> = F<sub>c</sub> + ΔF × e<sup>0.5123θ</sup> / (e<sup>0.5123θ</sup> − 1) ,  F<sub>2</sub> = F<sub>1</sub> − ΔF',
            s: `F<sub>c</sub> = ${EQ.V_BELT_KB_KC[sec].Kc} × ${f(V / 1000, 3)}² = ${f(Fc, 2)} lbf ,  T = ${f(T, 1)} lbf in ,  ΔF = ${f(dF, 1)} lbf ,  θ = ${f(theta, 3)} rad`,
            r: `F<sub>1</sub> = ${f(F1 * LBF, 0)} N ,  F<sub>2</sub> = ${f(F2 * LBF, 0)} N ,  F<sub>i</sub> = ${f(Fi * LBF, 0)} N`,
            w: fill('cw27', { tot: f(Nb * (F1 + F2) * LBF, 0) }),
            fig: fig('vbeltKc', [{ row: sec, col: 'Kc' }], 'Kc = ' + EQ.V_BELT_KB_KC[sec].Kc),
          });
        } else {
          steps.push({ f: 'P<sub>a</sub> = K<sub>1</sub> × K<sub>2</sub> × P<sub>tab</sub>', r: `P<sub>a</sub>: ${t('ptNone')}`, w: ' ' });
          steps.push({ f: 'F<sub>1</sub> , F<sub>2</sub>', r: t('ptNone'), w: ' ' });
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
          w: fill('cw32', { r: P.given.relBear }),
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
          w: fill('cw36', { r: P.given.relShaft }),
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
          w: fill('cw38', { n: P.given.nf }),
        });
        steps.push({
          f: 'N<sub>pic</sub> = S<sub>y</sub> / σ′<sub>max</sub> ,  σ′<sub>max</sub> = k<sub>pic</sub> × √((σ<sub>a</sub> + σ<sub>m, axial</sub>)² + 3 τ<sub>m</sub>²)',
          s: each(x => `${x.id}: ${sh.Sy} / (${P.drive.peak} × ${f(x.smax / P.drive.peak, 1)}) = ${sh.Sy} / ${f(x.smax, 1)}`),
          r: each(x => `N<sub>pic, ${x.id}</sub> = ${f(x.Ny, 2)}`) + ` ;  N<sub>pic</sub> = ${f(a.Ny, 2)}`,
          w: fill('cw39', { k: P.drive.peak, n: P.given.npeak }),
        });
      }
    }

    $('#calcList').innerHTML = steps.map((st, k) => {
      const why = (st.w || (T['cw' + k] ? t('cw' + k) : ''))
        .replace('{n}', SPEED_RPM).replace('{i}', (P.given.motor / SPEED_RPM).toFixed(3)).replace('{m}', P.given.motor)
        .replace('{phi}', P.gear.phi);
      return `
      <div class="calc-step">
        <div class="num">${k + 1}</div>
        <h3>${t('ct' + k)}</h3>
        <div class="formula">${st.f}</div>
        ${st.s ? `<div class="subst">= ${st.s}</div>` : ''}
        <div class="result">${st.r}</div>
        ${st.fig || ''}
        ${why ? `<div class="why">${why}</div>` : ''}
      </div>`;
    }).join('') + checksHtml(g);
  }

  // ------------------------------------------------------------------
  // 2D views (Two.js)
  // ------------------------------------------------------------------
  let two = null;
  let INK = C.ink;         // both follow the theme: see setTheme()
  let FORCE = C.force;

  function init2D() {
    if (typeof Two === 'undefined') {
      $('#view2d').innerHTML = '<p style="padding:40px;color:#66727e">Two.js could not be loaded (check the internet connection).</p>';
      return;
    }
    two = new Two({ type: Two.Types.svg, width: 100, height: 100, autostart: false }).appendTo($('#view2d'));
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

    // ---- drawing helpers ----
    const style = (shape, fill, stroke, lw) => {
      shape.fill = fill || 'none';
      shape.stroke = stroke || INK;
      shape.linewidth = lw == null ? 1.2 : lw;
      return shape;
    };
    const line = (x1, y1, x2, y2, stroke, lw, dashes) => {
      const ln = two.makeLine(x1, y1, x2, y2);
      ln.stroke = stroke || INK;
      ln.linewidth = lw || 1;
      if (dashes) ln.dashes = dashes;
      return ln;
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
      return t;
    };
    const arrow = (x1, y1, x2, y2, color, lw) => {
      color = color || FORCE;
      line(x1, y1, x2, y2, color, lw || 2);
      const ang = Math.atan2(y2 - y1, x2 - x1), h = 9;
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
      const xl = gear.x - gear.w / 2, xr = gear.x + gear.w / 2;
      gearFace(gear, 0, C.fill.gear, colorOf.gear);
      [gear.r, -gear.r].forEach(r => line(X(xl) - 6, Y(r), X(xr) + 6, Y(r), C.fill.pitch, 0.8, [8, 3, 2, 3]));
    }

    if (visible.pinion) {
      const pn = g.pinion, stub = 50, rs = pn.rf * 0.55;
      style(two.makeRectangle(X(pn.x - pn.w / 2 - stub / 2), Y(pn.yc), stub * s, 2 * rs * s), C.steel, INK, 1.2);
      gearFace(pn, pn.yc, C.fill.pinion, colorOf.pinion);
      line(X(pn.x - pn.w / 2 - stub) - 8, Y(pn.yc), X(pn.x + pn.w / 2) + 10, Y(pn.yc), INK, 0.7, [14, 4, 3, 4]);
      if (opts.labels) text(t('pinion'), X(pn.x + pn.w / 2) + 26, Y(pn.yc) + 4, 13, colorOf.pinion, false, 700);
    }

    if (visible.pulley) {
      const prof = pulleyProfile(pl);
      [1, -1].forEach(sgn => {
        poly(prof.map(p => [X(pl.x + p[1]), Y(sgn * p[0])]), C.fill.pulleyHub, colorOf.pulley, 1.4);
      });
    }

    [['bearingA', g.bA], ['bearingC', g.bC]].forEach(([id, b]) => {
      if (!visible[id]) return;
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
    line(X(g.x0) - 18, cy, X(g.x1) + 18, cy, INK, 0.8, [14, 4, 3, 4]);

    // labels
    if (opts.labels) {
      const lab = (id, str, x, r) => {
        if (visible[id]) text(str, X(x), Y(r) - 12, 15, colorOf[id], false, 700);
      };
      lab('bearingA', 'A', g.xA, g.bA.rOut);
      lab('bearingC', 'C', g.xC, g.bC.rOut);
      lab('pulley', 'D', g.xD, pl.R);
      if (visible.gear) text('B', X(g.xB) + gear.w * s / 2 + 12, Y(gear.ra) + 6, 15, colorOf.gear, false, 700);

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
      arrow(px, py - L, px, py, FORCE);
      text('Fr', px + 13, py - L + 4, 13, FORCE, true);
      arrow(px - La, py, px - 4, py, FORCE);
      text('Fa', px - La + 10, py - 10, 13, FORCE, true);
      style(two.makeCircle(px, py, 5.5), C.paper, FORCE, 1.6);        // Ft: out of the page (+z)
      style(two.makeCircle(px, py, 1.6), FORCE, FORCE, 1);
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
    if (opts.forces && pulls && visible.pulley) {
      const [f2, f1] = pulls, L = 40;
      arrow(f2[0], f2[1], f2[0] + f2[2] * L, f2[1] + f2[3] * L, FORCE);
      text('F2', f2[0] + f2[2] * L * 0.5, f2[1] + f2[3] * L * 0.5 - 13, 13, FORCE, true);
      arrow(f1[0], f1[1], f1[0] + f1[2] * L, f1[1] + f1[3] * L, FORCE);
      text('F1', f1[0] + f1[2] * L * 0.5, f1[1] + f1[3] * L * 0.5 + 17, 13, FORCE, true);
    }
    if (visible.shaft) {
      style(two.makeCircle(ex, ey, g.d / 2 * se), C.steel3, INK, 1.2);
      const k = g.d * 0.13 * se;                                   // key
      style(two.makeRectangle(ex, ey + g.d / 2 * se, 2 * k, 2 * k), C.paper, INK, 1);
    }
    line(ex - R - 14, ey, ex + R + 14, ey, INK, 0.7, [14, 4, 3, 4]);
    line(ex, ey - R - 14, ex, ey + R + 14, INK, 0.7, [14, 4, 3, 4]);
    if (opts.labels) {
      arrow(ex, ey - R - 8, ex, ey - R - 30, INK, 1.2);
      text('y', ex + 10, ey - R - 24, 12, INK, true);
      text('z', ex - R - 20, ey + 14, 12, INK, true);
    }

    two.update();
  }

  // ------------------------------------------------------------------
  // 3D view (Three.js)
  // ------------------------------------------------------------------
  let view3d = null;   // { rebuild(g), resize() }

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
      for (let i = 0; i < gr.z; i++) {
        [[gr.rf, 0], [gr.rf, 0.2], [gr.ra, 0.4], [gr.ra, 0.6], [gr.rf, 0.8]]
          .forEach(q => prof.push([q[0], (i + q[1]) * pitch]));
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
        if (o.geometry) o.geometry.dispose();
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
        pinionMesh.userData = { ratio: g.gear.z / pn.z, pitchG: 2 * Math.PI / g.gear.z };
        const stub = 50, rs = pn.rf * 0.55;
        const motorShaft = new THREE.Mesh(new THREE.CylinderGeometry(rs, rs, stub, 32),
          mat(colorOf.shaft, { metalness: 0.7, roughness: 0.35 }));
        motorShaft.position.y = -(pn.w / 2 + stub / 2);
        pinionMesh.add(motorShaft);
        drive.add(pinionMesh);
      }

      if (visible.shaft) {
        const m = mat(colorOf.shaft, { metalness: 0.7, roughness: 0.35 });
        const cyl = (xa, xb, r) => at(new THREE.Mesh(new THREE.CylinderGeometry(r, r, xb - xa, 48), m), (xa + xb) / 2);
        spin.add(cyl(g.x0, g.x1, g.d / 2));
        g.steps.forEach(st => spin.add(cyl(st[0], st[1], st[2])));
      }

      if (visible.gear) {
        spin.add(at(new THREE.Mesh(helicalGear(g.gear),
          mat(colorOf.gear, { flatShading: true, side: THREE.DoubleSide })), g.gear.x));
      }

      if (visible.pulley) {
        const pts = pulleyProfile(g.pulley).map(p => new THREE.Vector2(p[0], p[1]));
        const pulleyMesh = new THREE.Mesh(new THREE.LatheGeometry(pts, 96),
          mat(colorOf.pulley, { flatShading: true, side: THREE.DoubleSide }));
        addWebHoles(pulleyMesh, g.pulley);
        spin.add(at(pulleyMesh, g.pulley.x));
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
        drivenMesh.userData = { ratio: pl.R / v.R2 };
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
          drive.add(new THREE.Mesh(new THREE.TubeGeometry(curve, loop.length * 2, tubeR, 6, true), beltMat));
          curves.push(curve);
        }
        // light marks riding on the belts; the animation loop moves them along at the belt speed
        const len = curves[0].getLength();
        const per = Math.max(12, Math.min(48, Math.round(len / (tubeR * 9))));
        const marks = new THREE.InstancedMesh(new THREE.SphereGeometry(tubeR * 1.28, 10, 8),
          mat(C.beltMark, { metalness: 0.05, roughness: 0.9 }), per * curves.length);
        marks.frustumCulled = false;
        drive.add(marks);
        beltRun = { curves, len, per, r1, marks };
      }

      [['bearingA', g.bA], ['bearingC', g.bC]].forEach(([id, b]) => {
        if (!visible[id]) return;
        const ring = mat(colorOf[id], { metalness: 0.6, roughness: 0.3 });
        fixed.add(at(new THREE.Mesh(tube(b.rOut - b.t, b.rOut, b.w), ring), b.x));
        spin.add(at(new THREE.Mesh(tube(b.rIn, b.rIn + b.t, b.w), ring), b.x));
        const rBall = Math.min(b.rBall, b.w * 0.45);
        const count = Math.max(6, Math.floor(2 * Math.PI * b.rMid / (rBall * 2.5)));
        const ballGeo = new THREE.SphereGeometry(rBall, 20, 14);
        const ballMat = mat(C.chrome, { metalness: 0.9, roughness: 0.15 });
        for (let i = 0; i < count; i++) {
          const a = i / count * Math.PI * 2;
          const ball = new THREE.Mesh(ballGeo, ballMat);
          ball.position.set(b.rMid * Math.cos(a), b.x, b.rMid * Math.sin(a));
          spin.add(ball);
        }
      });

      // ---- overlay (world coordinates: x axis = shaft) ----
      const V = (x, y, z) => new THREE.Vector3(x, y, z);
      const arrow3 = (dir, tip, len, color, name) => {
        const d = dir.clone().normalize();
        const origin = tip.clone().addScaledVector(d, -len);
        overlay.add(new THREE.ArrowHelper(d, origin, len, color, len * 0.28, len * 0.13));
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
        arrow3(V(0, -1, 0), tip, L + (pin ? 2 * pn.r + pn.m : 0), FORCE, 'Fr');
        arrow3(V(1, 0, 0), tip, L + (pin ? Math.max(pn.w, g.gear.w) / 2 : 0), FORCE, 'Fa');
        arrow3(V(0, 0, 1), tip, L + (pin ? pn.ra : 0), FORCE, 'Ft');
      }
      if (opts.forces && visible.pulley) {
        const rp = g.pulley.R - g.pulley.depth / 2, L = g.Rmax * 0.45;
        arrow3(V(0, 0, 1), V(g.xD, rp, g.pulley.R * 1.1 + L), L, FORCE, 'F2');
        arrow3(V(0, 0, 1), V(g.xD, -rp, g.pulley.R * 1.1 + L), L, FORCE, 'F1');
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

      controls.target.set((g.x0 + g.x1) / 2, 0, visible.vbelt ? g.vbelt.C / 2 : 0);
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
      if (opts.spin) spin.rotation.y += dt * 1.2;     // slowed down for visibility
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

    view3d = { rebuild, resize };
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
    const items = CHECKS.map(c => {
      let ok = false, d = { f: '', s: '' };
      try { ok = !!c[1](g, v); d = c[2](g, v); } catch (e) { /* shown as not met */ }
      return `
      <div class="calc-step calc-check ${ok ? 'ok' : 'bad'}" id="check-${c[0]}">
        <div class="num">${ok ? '✓' : '✗'}</div>
        <h3>${t('k.' + c[0])}</h3>
        <div class="formula">${d.f}</div>
        <div class="subst">${d.s}</div>
        <div class="result">${t(ok ? 'met' : 'notMet')}</div>
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

  const anyLocked = () => inputs.some(i => locked[i.comp][i.key]);

  // For every variable that is not fixed, try each value of its slider with everything else as it is now.
  // A value is good when every check that this variable can influence passes. The good stretch is painted
  // on the slider track. Checks that fail whatever this variable is set to are not held against it.
  function updateBands() {
    const base = runChecks();
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
      if (!mine.some(Boolean)) return;                                                   // it affects no check
      const good = res.map(r => mine.every((m, j) => !m || r[j]));
      inp.row.classList.toggle('out', !good[vals.indexOf(cur)]);   // current value outside the green: red knob

      // contiguous good runs → gradient stops; edges fall halfway between neighbouring samples
      const f = v => (v - p.min) / (p.max - p.min);
      const parts = [], ranges = [];
      let i = 0;
      while (i < vals.length) {
        if (!good[i]) { i++; continue; }
        let j = i;
        while (j + 1 < vals.length && good[j + 1]) j++;
        const a = i === 0 ? 0 : f((vals[i - 1] + vals[i]) / 2), b = j === vals.length - 1 ? 1 : f((vals[j] + vals[j + 1]) / 2);
        parts.push(`${GREY} ${stop(a)}, ${GREEN} ${stop(a)}, ${GREEN} ${stop(b)}, ${GREY} ${stop(b)}`);
        ranges.push(vals[i] === vals[j] ? String(vals[i]) : t('bandTip').replace('{a}', vals[i]).replace('{b}', vals[j]));
        i = j + 1;
      }
      if (parts.length) {
        inp.range.style.background = `linear-gradient(to right, ${GREY} 0, ${parts.join(', ')}, ${GREY} 100%)`;
        inp.range.title = ranges.join(' ; ');
      } else {
        inp.range.style.background = C.invalid;
        inp.range.title = t('bandNone');
      }
    });
    derive();   // the trial values moved the shared power / speed globals: put them back
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
