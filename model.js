/* The machine as numbers: the geometry and loads both views draw (derive), the V-belt selection and
 * the strength of the shaft. No drawing and no page here.
 */

import { P, visible } from './state.js';

export let POWER_W = 4000;      // W,   set from the "Power and speed" card in derive()
export let SPEED_RPM = 800;     // rpm, set from the "Power and speed" card in derive()

// ------------------------------------------------------------------
// Derived geometry shared by the 2D and 3D views
// ------------------------------------------------------------------
export function derive() {
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
export function pulleyProfile(pl) {
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

// V-belt selection for the current inputs (same method as the Calculations tab, T12), in in / hp.
export function vbeltDesign() {
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

export const nf = (x, n) => String(Math.round(x * Math.pow(10, n == null ? 1 : n)) / Math.pow(10, n == null ? 1 : n));
export const minPinionTeeth = () => EQ.MIN_TEETH_VS_RACK[P.gear.phi] || Math.ceil(EQ.minTeethNoInterference(EQ.rad(P.gear.phi)));
export const widestGear = () => Math.max(P.gear.w, P.pinion.w);
export const seatRadius = () => (P.shaft.d + Math.max(P.shaft.ds, P.shaft.d)) / 4;
// Shaft as a beam on bearings A and C (T04): reactions, bending moments at the gear and at bearing C,
// then at each of those sections the Goodman fatigue factor and the yield factor at the starting peak.
// Forces in N, lengths in mm, moments in N mm, stresses in MPa.
export function shaftAnalysis(g) {
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
