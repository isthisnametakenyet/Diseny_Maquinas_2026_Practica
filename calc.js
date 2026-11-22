/* The Calculations tab: every worked step with the current numbers (calcSteps), the tab itself
 * (updateCalc) and, under each step, the variables it depends on with their valid ranges (annotateCalc).
 */

import { T, t } from './i18n.js';
import { $, anyLocked, inputs, locked, P } from './state.js';
import { derive, POWER_W, shaftAnalysis, SPEED_RPM } from './model.js';
import { copyButton, latexOf, linkSymbols, readSymDefs, resetLatex, stackFractions, toLatex } from './mathtext.js';
import { bandOf, checkNow, checksHtml } from './checks.js';

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

export function updateCalc(g) {
  resetLatex();
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

// Under every worked step, list the variables its numbers depend on: the fixed ones with their value,
// and the free ones with their current value and the range in which every check still passes.
// Which step depends on which variable is found by moving each variable and seeing which steps change.
export function annotateCalc() {
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
