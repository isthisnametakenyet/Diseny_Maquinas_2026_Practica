/* Equation database: gears (T08 spur, T09 helical / bevel / worm), chains (T10) and belts (T11 flat, T12 V and timing).
 *
 * One function per equation (or per form of an equation). Nothing here touches the page:
 * it only exposes a global `EQ` object, e.g. EQ.velocityRatioFromTeeth(19, 37).
 *
 * Conventions
 *   - Angles are in RADIANS. Use EQ.rad(deg) / EQ.deg(rad) to convert.
 *   - Subscript p = pinion, g = gear (wheel).
 *   - Functions are unit-agnostic as long as the inputs are consistent, except where a name
 *     ends in US or SI:  US = in, lb, psi, pd in teeth/in; SI = mm, N, MPa, module m in mm.
 *   - Geometry formulas written with the diametral pitch pd also work in metric if you pass
 *     pd = 1/m (teeth per mm): see EQ.diametralPitchMetric(m).
 *   - `external` = true for external gear pairs (the usual case), false for internal ones.
 *   - Each comment cites the slide it comes from: T8-28 = Tema 8, slide 28.
 *     "Norton" marks equations that are NOT written on the slides (only plotted or referenced).
 */
(function (root) {
  'use strict';

  const { PI, sin, cos, tan, acos, atan, sqrt, pow, exp, floor } = Math;
  const frac = x => x - floor(x);
  const sign = external => (external === false ? -1 : 1);

  const EQ = {};

  // ====================================================================
  // 0. HELPERS, UNITS, POWER
  // ====================================================================
  EQ.rad = deg => deg * PI / 180;
  EQ.deg = rad => rad * 180 / PI;

  /** ω [rad/s] from n [rpm]. */
  EQ.angularSpeedFromRpm = n => 2 * PI * n / 60;
  /** n [rpm] from ω [rad/s]. */
  EQ.rpmFromAngularSpeed = omega => 60 * omega / (2 * PI);

  /** T = P / ω. (SI: W, rad/s → N m; US: in lb/s, rad/s → in lb) */
  EQ.torqueFromPower = (P, omega) => P / omega;
  /** P = T × ω. */
  EQ.powerFromTorque = (T, omega) => T * omega;
  /** 1 hp = 6600 in lb/s (T8-30). */
  EQ.HP_TO_INLB_PER_S = 6600;
  EQ.hpToInLbPerS = hp => hp * 6600;

  /** Temperature conversions (T8-59). */
  EQ.celsiusToFahrenheit = C => 1.8 * C + 32;
  EQ.fahrenheitToCelsius = F => (F - 32) / 1.8;
  EQ.celsiusToKelvin = C => C + 273;
  EQ.kelvinToCelsius = K => K - 273;

  // ====================================================================
  // 1. SPUR GEARS: KINEMATICS AND GEOMETRY (T8)
  // ====================================================================

  /** Velocity ratio mV = ω_out / ω_in (T8-15). */
  EQ.velocityRatioFromSpeeds = (omegaOut, omegaIn) => omegaOut / omegaIn;
  /** Velocity ratio mV = r_in / r_out (T8-15). */
  EQ.velocityRatioFromRadii = (rIn, rOut) => rIn / rOut;
  /** Velocity ratio mV = N_in / N_out (T8-20). */
  EQ.velocityRatioFromTeeth = (NIn, NOut) => NIn / NOut;

  /** Torque ratio (mechanical advantage) mA = 1 / mV = T_out / T_in (T8-10). */
  EQ.torqueRatioFromVelocityRatio = mV => 1 / mV;
  EQ.torqueRatioFromTorques = (TOut, TIn) => TOut / TIn;
  /** Gear ratio mG: whichever of mV, mA is > 1 (T8-10). For a pair, mG = Ng / Np. */
  EQ.gearRatio = mV => (mV >= 1 ? mV : 1 / mV);
  EQ.gearRatioFromTeeth = (Np, Ng) => Ng / Np;

  /** Output speed and torque from the velocity ratio. */
  EQ.outputSpeed = (omegaIn, mV) => omegaIn * mV;
  EQ.outputTorque = (TIn, mV) => TIn / mV;

  /** Pitch-point velocity vP = ω × r (T8-15); VT = (dp / 2) × ωp (T8-46). */
  EQ.pitchLineVelocityFromRadius = (omega, r) => omega * r;
  EQ.pitchLineVelocityFromDiameter = (omega, d) => omega * d / 2;

  /** Pressure angle φ = acos(r_base / r_pitch) (T8-16). */
  EQ.pressureAngleFromRadii = (rBase, rPitch) => acos(rBase / rPitch);
  /** Base radius r_b = r × cos φ (T8-16 rearranged). */
  EQ.baseRadius = (rPitch, phi) => rPitch * cos(phi);

  /** Centre distance C = rp + rg (T8-17). */
  EQ.centerDistanceFromRadii = (rp, rg) => rp + rg;
  EQ.centerDistanceFromDiameters = (dp, dg) => (dp + dg) / 2;
  EQ.centerDistanceFromTeeth = (Np, Ng, pd) => (Np + Ng) / (2 * pd);
  EQ.centerDistanceFromTeethModule = (Np, Ng, m) => m * (Np + Ng) / 2;

  /** Whole depth h = a + b (T8-18). */
  EQ.wholeDepth = (a, b) => a + b;

  /** Circular pitch pc = π d / N (T8-19). */
  EQ.circularPitchFromDiameter = (d, N) => PI * d / N;
  /** Circular pitch pc = π / pd (T8-19). */
  EQ.circularPitchFromDiametralPitch = pd => PI / pd;
  /** Circular pitch pc = π m (T8-20). */
  EQ.circularPitchFromModule = m => PI * m;

  /** Diametral pitch pd = N / d [teeth/in] (T8-19). */
  EQ.diametralPitchFromTeeth = (N, d) => N / d;
  /** Diametral pitch pd = π / pc (T8-19). */
  EQ.diametralPitchFromCircularPitch = pc => PI / pc;
  /** Diametral pitch pd = 25.4 / m [teeth/in, m in mm] (T8-20). */
  EQ.diametralPitchFromModule = m => 25.4 / m;
  /** Metric equivalent of pd for the geometry formulas: 1 / m [teeth/mm]. */
  EQ.diametralPitchMetric = m => 1 / m;

  /** Module m = d / N [mm] (T8-20). */
  EQ.moduleFromDiameter = (d, N) => d / N;
  /** Module m = pc / π (T8-20). */
  EQ.moduleFromCircularPitch = pc => pc / PI;
  /** Module m = 25.4 / pd (T8-20). */
  EQ.moduleFromDiametralPitch = pd => 25.4 / pd;

  /** Pitch diameter d = N / pd, or d = m × N. */
  EQ.pitchDiameterFromDiametralPitch = (N, pd) => N / pd;
  EQ.pitchDiameterFromModule = (N, m) => m * N;
  /** Number of teeth N = d × pd, or N = d / m. */
  EQ.teethFromDiametralPitch = (d, pd) => d * pd;
  EQ.teethFromModule = (d, m) => d / m;

  /** Minimum teeth to avoid interference with a rack, N_min = 2 / sin²φ (T8-27). */
  EQ.minTeethNoInterference = phi => 2 / pow(sin(phi), 2);

  /** Length of action Z (T8-28). */
  EQ.lengthOfAction = (rp, rg, ap, ag, phi) => {
    const C = rp + rg;
    return sqrt(pow(rp + ap, 2) - pow(rp * cos(phi), 2))
         + sqrt(pow(rg + ag, 2) - pow(rg * cos(phi), 2))
         - C * sin(phi);
  };
  /** Contact ratio mp = pd × Z / (π cos φ) (T8-28). AGMA: at least 1.2. */
  EQ.contactRatio = (pd, Z, phi) => pd * Z / (PI * cos(phi));
  EQ.contactRatioFromModule = (m, Z, phi) => Z / (PI * m * cos(phi));

  // ---- AGMA full-depth tooth proportions, Table 8-1 (T8-24). pd in teeth/in → inches.
  //      In metric use pd = 1/m and ignore `fine` (the +0.002 in term is imperial only).
  EQ.addendum = pd => 1.000 / pd;
  EQ.dedendum = pd => 1.250 / pd;
  EQ.workingDepth = pd => 2.000 / pd;
  EQ.wholeDepthStandard = (pd, fine) => (fine ? 2.200 / pd + 0.002 : 2.250 / pd);
  EQ.circularToothThickness = pd => 1.571 / pd;
  EQ.filletRadiusBasicRack = pd => 0.300 / pd;                 // coarse pitch only
  EQ.minClearance = (pd, fine) => (fine ? 0.200 / pd + 0.002 : 0.250 / pd);
  EQ.minTopLandWidth = pd => 0.250 / pd;                       // coarse pitch only
  EQ.clearanceShavedOrGround = (pd, fine) => (fine ? 0.350 / pd + 0.002 : 0.350 / pd);
  /** Coarse pitch is pd < 20, fine pitch is pd ≥ 20. */
  EQ.isFinePitch = pd => pd >= 20;

  /** Outside (addendum) and root (dedendum) diameters. */
  EQ.outsideDiameter = (d, a) => d + 2 * a;
  EQ.rootDiameter = (d, b) => d - 2 * b;

  // ====================================================================
  // 2. SPUR GEARS: TRANSMITTED FORCES (T8-33, T8-34)
  // ====================================================================

  /** Tangential force Wt = Tp / rp. */
  EQ.tangentialForceFromRadius = (Tp, rp) => Tp / rp;
  /** Tangential force Wt = 2 Tp / dp. */
  EQ.tangentialForceFromDiameter = (Tp, dp) => 2 * Tp / dp;
  /** Tangential force Wt = 2 pd Tp / Np. */
  EQ.tangentialForceFromTeeth = (Tp, pd, Np) => 2 * pd * Tp / Np;
  /** Tangential force Wt = W cos φ. */
  EQ.tangentialForceFromTotal = (W, phi) => W * cos(phi);

  /** Radial force Wr = Wt tan φ. */
  EQ.radialForce = (Wt, phi) => Wt * tan(phi);
  /** Total tooth force W = Wt / cos φ. */
  EQ.totalForce = (Wt, phi) => Wt / cos(phi);
  /** Shaft reactions equal the tooth force components: Rt = Wt, Rr = Wr (T8-34). */
  EQ.shaftReactions = (Wt, Wr) => ({ Rt: Wt, Rr: Wr, R: sqrt(Wt * Wt + Wr * Wr) });

  // ====================================================================
  // 3. SPUR GEARS: BENDING STRESS (T8-38 … T8-48)
  // ====================================================================

  /** Lewis equation σ = Wt pd / (F Y) (T8-38). */
  EQ.lewisStress = (Wt, pd, F, Y) => Wt * pd / (F * Y);
  /** Recommended face width range 8/pd < F < 16/pd (T8-38). Metric: 8m … 16m. */
  EQ.faceWidthRange = pd => ({ min: 8 / pd, max: 16 / pd, nominal: 12 / pd });
  EQ.faceWidthRangeFromModule = m => ({ min: 8 * m, max: 16 * m, nominal: 12 * m });

  /** AGMA bending stress, US: σb = (Wt pd / (F J)) (Ka Km / Kv) Ks KB KI [psi] (T8-38). */
  EQ.bendingStressUS = (Wt, pd, F, J, Ka, Km, Kv, Ks = 1, KB = 1, KI = 1) =>
    (Wt * pd / (F * J)) * (Ka * Km / Kv) * Ks * KB * KI;
  /** AGMA bending stress, SI: σb = (Wt / (F m J)) (Ka Km / Kv) Ks KB KI [MPa] (T8-38). */
  EQ.bendingStressSI = (Wt, m, F, J, Ka, Km, Kv, Ks = 1, KB = 1, KI = 1) =>
    (Wt / (F * m * J)) * (Ka * Km / Kv) * Ks * KB * KI;

  /** Application factor Ka, Table 8-17 (T8-44).
   *  driver: 'uniform' | 'lightShock' | 'mediumShock'; driven: 'uniform' | 'moderateShock' | 'heavyShock'
   *  The heavy-shock column is "that value or more". */
  EQ.KA_TABLE = {
    uniform:     { uniform: 1.00, moderateShock: 1.25, heavyShock: 1.75 },
    lightShock:  { uniform: 1.25, moderateShock: 1.50, heavyShock: 2.00 },
    mediumShock: { uniform: 1.50, moderateShock: 1.75, heavyShock: 2.25 },
  };
  EQ.applicationFactor = (driver, driven) => EQ.KA_TABLE[driver][driven];

  /** Load distribution factor Km from the face width (T8-45).
   *  Tabulated: <50 mm → 1.6; 150 → 1.7; 250 → 1.8; ≥500 → 2.0. Takes the next tabulated row up. */
  EQ.loadDistributionFactorSI = Fmm => (Fmm <= 50 ? 1.6 : Fmm <= 150 ? 1.7 : Fmm <= 250 ? 1.8 : 2.0);
  EQ.loadDistributionFactorUS = Fin => (Fin <= 2 ? 1.6 : Fin <= 6 ? 1.7 : Fin <= 9 ? 1.8 : 2.0);

  /** Dynamic factor Kv = Cv. The slides only give the chart (T8-46); these are the curves it plots (Norton).
   *  Qv = AGMA quality index. US: Vt in ft/min; SI: Vt in m/s. */
  EQ.dynamicFactorB = Qv => pow(12 - Qv, 2 / 3) / 4;           // 6 ≤ Qv ≤ 11
  EQ.dynamicFactorA = Qv => 50 + 56 * (1 - EQ.dynamicFactorB(Qv));
  EQ.dynamicFactorUS = (Vt, Qv) => {
    if (Qv <= 5) return 50 / (50 + sqrt(Vt));
    const B = EQ.dynamicFactorB(Qv), A = 50 + 56 * (1 - B);
    return pow(A / (A + sqrt(Vt)), B);
  };
  EQ.dynamicFactorSI = (Vt, Qv) => {
    if (Qv <= 5) return 50 / (50 + sqrt(200 * Vt));
    const B = EQ.dynamicFactorB(Qv), A = 50 + 56 * (1 - B);
    return pow(A / (A + sqrt(200 * Vt)), B);
  };

  /** Backup ratio mB = tR / ht (rim thickness / tooth whole depth) (T8-47). */
  EQ.backupRatio = (tR, ht) => tR / ht;
  /** Rim thickness factor KB = −2 mB + 3.4 for 0.5 ≤ mB ≤ 1.2, else 1 (T8-47). Solid gears: 1. */
  EQ.rimThicknessFactor = mB => (mB > 1.2 ? 1 : -2 * mB + 3.4);

  /** Size factor Ks: 1, or 1.25 for a very conservative calculation (T8-48). */
  EQ.sizeFactor = conservative => (conservative ? 1.25 : 1);
  /** Idler factor KI: 1.42 for an idler gear, 1 otherwise (T8-48). */
  EQ.idlerFactor = isIdler => (isIdler ? 1.42 : 1);

  /** Bending geometry factor J for spur gears (T8-40 … T8-43), full-depth teeth.
   *  Tables are indexed [pinion teeth][gear teeth] → [J pinion, J gear]. Missing entries are "U" (undercut). */
  EQ.J_TEETH = [12, 14, 17, 21, 26, 35, 55, 135];
  EQ.J_TABLES = {
    // Table 8-8: φ = 20°, tip loading
    spur20tip: {
      21:  { 21: [0.24, 0.24], 26: [0.24, 0.25], 35: [0.24, 0.26], 55: [0.24, 0.28], 135: [0.24, 0.29] },
      26:  { 26: [0.25, 0.25], 35: [0.25, 0.26], 55: [0.25, 0.28], 135: [0.25, 0.29] },
      35:  { 35: [0.26, 0.26], 55: [0.26, 0.28], 135: [0.26, 0.29] },
      55:  { 55: [0.28, 0.28], 135: [0.28, 0.29] },
      135: { 135: [0.29, 0.29] },
    },
    // Table 8-9: φ = 20°, HPSTC loading
    spur20hpstc: {
      21:  { 21: [0.33, 0.33], 26: [0.33, 0.35], 35: [0.34, 0.37], 55: [0.34, 0.40], 135: [0.35, 0.43] },
      26:  { 26: [0.35, 0.35], 35: [0.36, 0.38], 55: [0.37, 0.41], 135: [0.38, 0.44] },
      35:  { 35: [0.39, 0.39], 55: [0.40, 0.42], 135: [0.41, 0.45] },
      55:  { 55: [0.43, 0.43], 135: [0.45, 0.47] },
      135: { 135: [0.49, 0.49] },
    },
    // Table 8-12: φ = 25°, tip loading
    spur25tip: {
      14:  { 14: [0.28, 0.28], 17: [0.28, 0.30], 21: [0.28, 0.31], 26: [0.28, 0.33], 35: [0.28, 0.34], 55: [0.28, 0.36], 135: [0.28, 0.38] },
      17:  { 17: [0.30, 0.30], 21: [0.30, 0.31], 26: [0.30, 0.33], 35: [0.30, 0.34], 55: [0.30, 0.36], 135: [0.30, 0.38] },
      21:  { 21: [0.31, 0.31], 26: [0.31, 0.33], 35: [0.31, 0.34], 55: [0.31, 0.36], 135: [0.31, 0.38] },
      26:  { 26: [0.33, 0.33], 35: [0.33, 0.34], 55: [0.33, 0.36], 135: [0.33, 0.38] },
      35:  { 35: [0.34, 0.34], 55: [0.34, 0.36], 135: [0.34, 0.38] },
      55:  { 55: [0.36, 0.36], 135: [0.36, 0.38] },
      135: { 135: [0.38, 0.38] },
    },
    // Table 8-13: φ = 25°, HPSTC loading
    spur25hpstc: {
      14:  { 14: [0.33, 0.33], 17: [0.33, 0.36], 21: [0.33, 0.39], 26: [0.33, 0.41], 35: [0.34, 0.44], 55: [0.34, 0.47], 135: [0.35, 0.51] },
      17:  { 17: [0.36, 0.36], 21: [0.36, 0.39], 26: [0.37, 0.42], 35: [0.37, 0.45], 55: [0.38, 0.48], 135: [0.38, 0.52] },
      21:  { 21: [0.39, 0.39], 26: [0.40, 0.42], 35: [0.40, 0.45], 55: [0.41, 0.49], 135: [0.42, 0.53] },
      26:  { 26: [0.43, 0.43], 35: [0.43, 0.46], 55: [0.44, 0.49], 135: [0.45, 0.53] },
      35:  { 35: [0.46, 0.46], 55: [0.47, 0.50], 135: [0.48, 0.54] },
      55:  { 55: [0.51, 0.51], 135: [0.53, 0.56] },
      135: { 135: [0.57, 0.57] },
    },
    // Table 9-5 (T9-14): helical, φ = 25°, ψ = 20°, tip loading.
    // NOTE: the slide prints 0.69 for pinion 21 / gear 26 (pinion value); the neighbours suggest 0.59.
    helical25psi20tip: {
      12:  { 12: [0.47, 0.47], 14: [0.47, 0.50], 17: [0.48, 0.53], 21: [0.48, 0.56], 26: [0.49, 0.59], 35: [0.49, 0.62], 55: [0.50, 0.66], 135: [0.51, 0.70] },
      14:  { 14: [0.50, 0.50], 17: [0.51, 0.54], 21: [0.51, 0.57], 26: [0.52, 0.60], 35: [0.53, 0.63], 55: [0.53, 0.67], 135: [0.54, 0.71] },
      17:  { 17: [0.54, 0.54], 21: [0.55, 0.58], 26: [0.55, 0.60], 35: [0.56, 0.64], 55: [0.57, 0.67], 135: [0.58, 0.72] },
      21:  { 21: [0.58, 0.58], 26: [0.69, 0.61], 35: [0.60, 0.64], 55: [0.60, 0.68], 135: [0.62, 0.72] },
      26:  { 26: [0.62, 0.62], 35: [0.62, 0.65], 55: [0.63, 0.69], 135: [0.65, 0.73] },
      35:  { 35: [0.66, 0.66], 55: [0.67, 0.70], 135: [0.68, 0.74] },
      55:  { 55: [0.71, 0.71], 135: [0.72, 0.75] },
      135: { 135: [0.76, 0.76] },
    },
  };
  /** Largest tabulated tooth count ≤ N (the conservative row/column to read), or null if below the table. */
  EQ.tabulatedTeeth = N => {
    let best = null;
    EQ.J_TEETH.forEach(t => { if (t <= N) best = t; });
    return best;
  };
  /** J lookup. Returns { pinion, gear, NpUsed, NgUsed } or null when the pair is undercut / not tabulated.
   *  Tooth counts between tabulated values are rounded DOWN to the nearest tabulated one (no interpolation). */
  EQ.geometryFactorJ = (table, Np, Ng) => {
    const t = EQ.J_TABLES[table];
    const p = EQ.tabulatedTeeth(Np), g = EQ.tabulatedTeeth(Ng);
    if (!t || p == null || g == null || !t[p] || !t[p][g]) return null;
    return { pinion: t[p][g][0], gear: t[p][g][1], NpUsed: p, NgUsed: g };
  };

  // ====================================================================
  // 4. SPUR GEARS: SURFACE (PITTING) STRESS (T8-51 … T8-53)
  // ====================================================================

  /** AGMA surface stress σc = Cp sqrt( (Wt / (F I d)) (Ca Cm / Cv) Cs Cf ) (T8-51).
   *  d = pitch diameter of the smaller gear. Ca = Ka, Cm = Km, Cv = Kv, Cs = Ks; Cf = 1 for a good finish. */
  EQ.surfaceStress = (Cp, Wt, F, I, d, Ca, Cm, Cv, Cs = 1, Cf = 1) =>
    Cp * sqrt((Wt / (F * I * d)) * (Ca * Cm / Cv) * Cs * Cf);
  /** Surface finish factor Cf = 1 when the finish is good (T8-51). */
  EQ.surfaceFinishFactor = () => 1;

  /** Elastic coefficient Cp, Table 8-18 (T8-52): [psi^0.5] and [MPa^0.5]. Indexed [pinion][gear]. */
  EQ.CP_MATERIALS = ['steel', 'malleableIron', 'nodularIron', 'castIron', 'aluminumBronze', 'tinBronze'];
  EQ.CP_TABLE_US = [
    [2300, 2180, 2160, 2100, 1950, 1900],
    [2180, 2090, 2070, 2020, 1900, 1850],
    [2160, 2070, 2050, 2000, 1880, 1830],
    [2100, 2020, 2000, 1960, 1850, 1800],
    [1950, 1900, 1880, 1850, 1750, 1700],
    [1900, 1850, 1830, 1800, 1700, 1650],
  ];
  EQ.CP_TABLE_SI = [
    [191, 181, 179, 174, 162, 158],
    [181, 174, 172, 168, 158, 154],
    [179, 172, 170, 166, 156, 152],
    [174, 168, 166, 163, 154, 149],
    [162, 158, 156, 154, 145, 141],
    [158, 154, 152, 149, 141, 137],
  ];
  /** Approximate Young's modulus used by the table: [psi] and [MPa]. */
  EQ.CP_MODULUS_US = [30e6, 25e6, 24e6, 22e6, 17.5e6, 16e6];
  EQ.CP_MODULUS_SI = [2e5, 1.7e5, 1.7e5, 1.5e5, 1.2e5, 1.1e5];
  EQ.elasticCoefficientUS = (pinionMaterial, gearMaterial) =>
    EQ.CP_TABLE_US[EQ.CP_MATERIALS.indexOf(pinionMaterial)][EQ.CP_MATERIALS.indexOf(gearMaterial)];
  EQ.elasticCoefficientSI = (pinionMaterial, gearMaterial) =>
    EQ.CP_TABLE_SI[EQ.CP_MATERIALS.indexOf(pinionMaterial)][EQ.CP_MATERIALS.indexOf(gearMaterial)];
  /** Cp from the material properties (Norton eq. 7.23, cited in the table footnote; not written on the slides):
   *  Cp = sqrt( 1 / ( π [ (1 − νp²)/Ep + (1 − νg²)/Eg ] ) ). */
  EQ.elasticCoefficientFromProperties = (Ep, nup, Eg, nug) =>
    sqrt(1 / (PI * ((1 - nup * nup) / Ep + (1 - nug * nug) / Eg)));

  /** Pinion tooth radius of curvature, spur (T8-53):
   *  ρp = sqrt( (rp + (1 + xp)/pd)² − (rp cos φ)² ) − (π/pd) cos φ.   xp = addendum coefficient, normally 0. */
  EQ.pinionCurvatureRadiusSpur = (rp, pd, phi, xp = 0) =>
    sqrt(pow(rp + (1 + xp) / pd, 2) - pow(rp * cos(phi), 2)) - (PI / pd) * cos(phi);
  /** Gear tooth radius of curvature ρg = C sin φ ∓ ρp (− external, + internal) (T8-53, T9-15). */
  EQ.gearCurvatureRadius = (C, phi, rhoP, external = true) => C * sin(phi) - sign(external) * rhoP;
  /** Surface geometry factor, spur: I = cos φ / ( (1/ρp ± 1/ρg) dp ) (+ external, − internal) (T8-53). */
  EQ.surfaceGeometryFactorSpur = (phi, rhoP, rhoG, dp, external = true) =>
    cos(phi) / ((1 / rhoP + sign(external) / rhoG) * dp);

  // ====================================================================
  // 5. SPUR GEARS: STRENGTHS (T8-57 … T8-63)
  // ====================================================================

  /** Corrected bending fatigue strength Sfb = (KL / (KT KR)) S'fb (T8-57). */
  EQ.bendingStrength = (SfbPrime, KL, KT = 1, KR = 1) => (KL / (KT * KR)) * SfbPrime;
  /** Corrected surface fatigue strength Sfc = (CL CH / (CT CR)) S'fc (T8-61). CT = KT, CR = KR. */
  EQ.surfaceStrength = (SfcPrime, CL, CH = 1, CT = 1, CR = 1) => (CL * CH / (CT * CR)) * SfcPrime;

  /** Number of load cycles: N = 60 × n[rpm] × hours (per tooth, one contact per revolution). */
  EQ.loadCycles = (rpm, hours) => 60 * rpm * hours;

  /** Bending life factor KL, curves printed on the chart (T8-58). N = load cycles.
   *  Below ~3 × 10⁶ cycles pick the hardness curve; above, 'commercial' (upper) or 'critical' (lower). */
  EQ.lifeFactorBending400HB = N => 9.4518 * pow(N, -0.148);
  EQ.lifeFactorBendingCarburized = N => 6.1514 * pow(N, -0.1192);
  EQ.lifeFactorBending250HB = N => 4.9404 * pow(N, -0.1045);
  EQ.lifeFactorBending160HB = N => 2.3194 * pow(N, -0.0538);
  EQ.lifeFactorBendingCommercial = N => 1.3558 * pow(N, -0.0178);
  EQ.lifeFactorBendingCritical = N => 1.6831 * pow(N, -0.0323);

  /** Surface life factor CL, curves printed on the chart (T8-62).
   *  10⁴ ≤ N ≤ 10⁷ (and the lower, critical-service line beyond): 2.466 N^−0.056; commercial above 10⁷: 1.4488 N^−0.023.
   *  Below 10⁴ cycles the chart is flat at the 10⁴ value. */
  EQ.lifeFactorSurfaceCritical = N => 2.466 * pow(Math.max(N, 1e4), -0.056);
  EQ.lifeFactorSurfaceCommercial = N => (N <= 1e7 ? 2.466 * pow(Math.max(N, 1e4), -0.056) : 1.4488 * pow(N, -0.023));

  /** Temperature factor KT = CT: 1 below 120 °C (250 °F); (460 + T_F) / 620 above (T8-59). */
  EQ.temperatureFactorFromFahrenheit = TF => (TF <= 250 ? 1 : (460 + TF) / 620);
  EQ.temperatureFactorFromCelsius = TC => EQ.temperatureFactorFromFahrenheit(1.8 * TC + 32);

  /** Reliability factor KR = CR (T8-59): 90 % → 0.85; 99 % → 1.00; 99.9 % → 1.25; 99.99 % → 1.50. */
  EQ.KR_TABLE = { 90: 0.85, 99: 1.00, 99.9: 1.25, 99.99: 1.50 };
  EQ.reliabilityFactor = percent => EQ.KR_TABLE[percent];

  /** Hardness ratio factor CH (gear only; the pinion uses 1) (T8-63).
   *  Through-hardened: CH = 1 + A (mG − 1), with A from the hardness ratio HBp / HBg. */
  EQ.hardnessRatioCoefficientA = (HBp, HBg) => {
    const r = HBp / HBg;
    if (r < 1.2) return 0;
    if (r > 1.7) return 0.00698;
    return 0.00898 * r - 0.00829;
  };
  EQ.hardnessRatioFactorThroughHardened = (HBp, HBg, mG) => 1 + EQ.hardnessRatioCoefficientA(HBp, HBg) * (mG - 1);
  /** Surface-hardened pinion (> 450 HB): CH = 1 + B (450 − HBg), B = 0.00075 e^(−0.0112 Rq), Rq in μin RMS. */
  EQ.hardnessRatioCoefficientB = Rq => 0.00075 * exp(-0.0112 * Rq);
  EQ.hardnessRatioFactorSurfaceHardened = (HBg, Rq) => 1 + EQ.hardnessRatioCoefficientB(Rq) * (450 - HBg);

  /** Safety factors (Norton; not written on the slides): bending Nb = Sfb / σb, surface Nc = (Sfc / σc)². */
  EQ.safetyFactorBending = (Sfb, sigmaB) => Sfb / sigmaB;
  EQ.safetyFactorSurface = (Sfc, sigmaC) => pow(Sfc / sigmaC, 2);

  // ====================================================================
  // 6. HELICAL GEARS (T9-7 … T9-16)      ψ = helix angle
  // ====================================================================

  /** Transverse pitch pt = π / pd (T9-7). */
  EQ.transversePitchFromDiametralPitch = pd => PI / pd;
  /** Transverse pitch pt = pn / cos ψ (T9-9). */
  EQ.transversePitchFromNormalPitch = (pn, psi) => pn / cos(psi);
  /** Normal pitch pn = pt cos ψ (T9-9 rearranged). */
  EQ.normalPitch = (pt, psi) => pt * cos(psi);
  /** Normal diametral pitch pdn = pd / cos ψ (T9-9). */
  EQ.normalDiametralPitch = (pd, psi) => pd / cos(psi);
  /** Transverse and normal module: mt = mn / cos ψ (same relation, in metric). */
  EQ.transverseModule = (mn, psi) => mn / cos(psi);
  EQ.normalModule = (mt, psi) => mt * cos(psi);
  /** Axial pitch px = pn / sin ψ (T9-10), or px = pt / tan ψ. */
  EQ.axialPitchFromNormalPitch = (pn, psi) => pn / sin(psi);
  EQ.axialPitchFromTransversePitch = (pt, psi) => pt / tan(psi);

  /** Transverse pressure angle: tan φt = tan φn / cos ψ (T9-9). */
  EQ.transversePressureAngle = (phiN, psi) => atan(tan(phiN) / cos(psi));
  /** Normal pressure angle: tan φn = tan φt cos ψ (T9-9 rearranged). */
  EQ.normalPressureAngle = (phiT, psi) => atan(tan(phiT) * cos(psi));

  /** Helical forces (T9-11). φ = transverse pressure angle, φn = normal pressure angle.
   *  Wt is the same as for spur gears (section 2). */
  EQ.helicalRadialForce = (Wt, phiT) => Wt * tan(phiT);
  EQ.helicalRadialForceFromNormalAngle = (Wt, phiN, psi) => Wt * tan(phiN) / cos(psi);
  EQ.helicalAxialForce = (Wt, psi) => Wt * tan(psi);
  EQ.helicalTotalForce = (Wt, psi, phiN) => Wt / (cos(psi) * cos(phiN));

  /** Virtual number of teeth Ne = N / cos³ψ (T9-12). */
  EQ.virtualTeeth = (N, psi) => N / pow(cos(psi), 3);

  /** Transverse contact ratio mp = pd Z / (π cos φ): same as EQ.contactRatio (T9-13). */
  EQ.transverseContactRatio = (pd, Z, phiT) => pd * Z / (PI * cos(phiT));
  /** Axial (face) contact ratio mF = F pd tan ψ / π (T9-13). Recommended > 1.15; < 1 is LACR. */
  EQ.axialContactRatio = (F, pd, psi) => F * pd * tan(psi) / PI;
  EQ.axialContactRatioFromAxialPitch = (F, px) => F / px;

  /** Helical bending stress: same equations as spur (EQ.bendingStressUS / SI) with the helical J (T9-14). */
  EQ.helicalBendingStressUS = EQ.bendingStressUS;
  EQ.helicalBendingStressSI = EQ.bendingStressSI;
  /** Helical surface stress: same equation as spur (EQ.surfaceStress) with the helical I (T9-15). */
  EQ.helicalSurfaceStress = EQ.surfaceStress;

  /** Pinion radius of curvature, helical (T9-15):
   *  ρp = sqrt( { 0.5 [ (rp + ap) ± (C − rg − ag) ] }² − (rp cos φ)² )   (+ external, − internal). */
  EQ.pinionCurvatureRadiusHelical = (rp, ap, rg, ag, C, phiT, external = true) =>
    sqrt(pow(0.5 * ((rp + ap) + sign(external) * (C - rg - ag)), 2) - pow(rp * cos(phiT), 2));
  /** Base helix angle ψb = acos( cos ψ × cos φn / cos φ ) (T9-16). */
  EQ.baseHelixAngle = (psi, phiN, phiT) => acos(cos(psi) * cos(phiN) / cos(phiT));
  /** nr, na = fractional parts of mp and mF (T9-16). */
  EQ.fractionalPart = frac;
  /** Minimum length of the lines of contact L_min (T9-16). */
  EQ.minContactLength = (mp, mF, F, px, psiB) => {
    const nr = frac(mp), na = frac(mF);
    return na <= 1 - nr
      ? (mp * F - na * nr * px) / cos(psiB)
      : (mp * F - (1 - na) * (1 - nr) * px) / cos(psiB);
  };
  /** Load sharing ratio mN = F / L_min (T9-15). */
  EQ.loadSharingRatio = (F, Lmin) => F / Lmin;
  /** Surface geometry factor, helical: I = cos φ / ( (1/ρp ± 1/ρg) dp mN ) (T9-15). */
  EQ.surfaceGeometryFactorHelical = (phiT, rhoP, rhoG, dp, mN, external = true) =>
    cos(phiT) / ((1 / rhoP + sign(external) / rhoG) * dp * mN);

  // ====================================================================
  // 7. BEVEL GEARS (T9-18 … T9-23)      α = pitch cone angle
  // ====================================================================

  /** Cone distance L = rp / sin αp = dp / (2 sin αp) = dg / (2 sin αg) (T9-19). */
  EQ.coneDistanceFromRadius = (rp, alphaP) => rp / sin(alphaP);
  EQ.coneDistanceFromPinionDiameter = (dp, alphaP) => dp / (2 * sin(alphaP));
  EQ.coneDistanceFromGearDiameter = (dg, alphaG) => dg / (2 * sin(alphaG));
  /** Usual face width limit F = L / 3 (T9-19). */
  EQ.bevelFaceWidth = L => L / 3;

  /** Bevel gear ratio mG = ωp/ωg = Ng/Np = dg/dp = tan αg = cot αp (T9-20), shafts at 90°. */
  EQ.bevelGearRatioFromSpeeds = (omegaP, omegaG) => omegaP / omegaG;
  EQ.bevelGearRatioFromTeeth = (Np, Ng) => Ng / Np;
  EQ.bevelGearRatioFromDiameters = (dp, dg) => dg / dp;
  EQ.bevelGearRatioFromGearAngle = alphaG => tan(alphaG);
  EQ.bevelGearRatioFromPinionAngle = alphaP => 1 / tan(alphaP);
  /** Pitch cone angles from the ratio: αg = atan(mG), αp = atan(1 / mG). */
  EQ.bevelGearPitchAngle = mG => atan(mG);
  EQ.bevelPinionPitchAngle = mG => atan(1 / mG);

  /** Tangential force Wt = 2 T / dm, dm = mean diameter (T9-21). */
  EQ.bevelTangentialForce = (T, dm) => 2 * T / dm;
  /** Mean diameter of a bevel gear: dm = d − F sin α (geometry; not written on the slides). */
  EQ.bevelMeanDiameter = (d, F, alpha) => d - F * sin(alpha);

  /** Straight bevel: Wa = Wt tan φ sin α, Wr = Wt tan φ cos α (T9-21). */
  EQ.straightBevelAxialForce = (Wt, phi, alpha) => Wt * tan(phi) * sin(alpha);
  EQ.straightBevelRadialForce = (Wt, phi, alpha) => Wt * tan(phi) * cos(alpha);

  /** Spiral bevel (T9-21):
   *    Wa = (Wt / cos ψ) (tan φn sin α ∓ sin ψ cos α)
   *    Wr = (Wt / cos ψ) (tan φn cos α ± sin ψ sin α)
   *  upperSign = true for a right-hand driving pinion turning clockwise seen from the large end,
   *  or a left-hand driving pinion turning counter-clockwise; false for the opposite cases. */
  EQ.spiralBevelAxialForce = (Wt, phiN, psi, alpha, upperSign = true) =>
    (Wt / cos(psi)) * (tan(phiN) * sin(alpha) - (upperSign ? 1 : -1) * sin(psi) * cos(alpha));
  EQ.spiralBevelRadialForce = (Wt, phiN, psi, alpha, upperSign = true) =>
    (Wt / cos(psi)) * (tan(phiN) * cos(alpha) + (upperSign ? 1 : -1) * sin(psi) * sin(alpha));

  /** Kx = 1 for straight bevel gears, 1.15 for spiral bevel gears (T9-22). */
  EQ.bevelCurvatureFactor = isSpiral => (isSpiral ? 1.15 : 1);
  /** Bevel bending stress, US: σb = (2 Tp / d) (pd / (F J)) (Ka Km Ks / (Kv Kx)) [psi] (T9-22). */
  EQ.bevelBendingStressUS = (Tp, d, pd, F, J, Ka, Km, Kv, Ks = 1, Kx = 1) =>
    (2 * Tp / d) * (pd / (F * J)) * (Ka * Km * Ks / (Kv * Kx));
  /** Bevel bending stress, SI: σb = (2000 Tp / d) (1 / (F m J)) (Ka Km Ks / (Kv Kx)) [MPa; Tp in N m, mm] (T9-22). */
  EQ.bevelBendingStressSI = (Tp, d, m, F, J, Ka, Km, Kv, Ks = 1, Kx = 1) =>
    (2000 * Tp / d) * (1 / (F * m * J)) * (Ka * Km * Ks / (Kv * Kx));

  /** Bevel surface stress constants (T9-23). */
  EQ.BEVEL_CB = 0.634;                                          // stress adjustment constant
  EQ.bevelCrowningFactor = crowned => (crowned ? 1.5 : 1);      // Cxc
  EQ.bevelTorqueExponent = (Tp, TD) => (Tp < TD ? 0.667 : 1);   // z
  /** Bevel surface stress (T9-23):
   *  σc = Cp Cb sqrt( (2 TD / (F I d²)) (Tp / TD)^z (Ca Cm / Cv) Cs Cf Cxc ).
   *  Tp = pinion operating torque, TD = pinion design torque. SI: use torques in N mm with mm and MPa. */
  EQ.bevelSurfaceStress = (Cp, TD, Tp, F, I, d, Ca, Cm, Cv, Cs = 1, Cf = 1, Cxc = 1, Cb = 0.634) => {
    const z = Tp < TD ? 0.667 : 1;
    return Cp * Cb * sqrt((2 * TD / (F * I * d * d)) * pow(Tp / TD, z) * (Ca * Cm / Cv) * Cs * Cf * Cxc);
  };
  /** Pinion design torque TD (T9-23):
   *  TD = (F / k) × I Cv / (Cs Cmd Cf Ca Cxc) × ( S'fc d / (Cp Cb) × 0.774 CH / (CT CR) )²
   *  k = 2 → lb in (US); k = 2000 → N m (SI, with mm and MPa). */
  const bevelDesignTorque = k => (F, I, Cv, Cs, Cmd, Cf, Ca, Cxc, SfcPrime, d, Cp, CH = 1, CT = 1, CR = 1, Cb = 0.634) =>
    (F / k) * (I * Cv / (Cs * Cmd * Cf * Ca * Cxc)) * pow((SfcPrime * d / (Cp * Cb)) * (0.774 * CH / (CT * CR)), 2);
  EQ.bevelDesignTorqueUS = bevelDesignTorque(2);
  EQ.bevelDesignTorqueSI = bevelDesignTorque(2000);

  // ====================================================================
  // 8. WORM GEARS (T9-26, T9-27)      w = worm, g = wheel, λ = lead angle
  // ====================================================================

  /** Lead angle: tan λ = L / (π d), d = worm pitch diameter (T9-26). */
  EQ.wormLeadAngle = (L, d) => atan(L / (PI * d));
  /** Lead L = π d tan λ (T9-26 rearranged), or L = px × Nw. */
  EQ.wormLeadFromAngle = (d, lambda) => PI * d * tan(lambda);
  EQ.wormLeadFromAxialPitch = (px, Nw) => px * Nw;
  /** Worm axial pitch px = L / Nw (T9-26). Nw = number of starts. */
  EQ.wormAxialPitch = (L, Nw) => L / Nw;
  /** Wheel circular pitch pc = π dg / Ng; meshing requires px = pc (T9-26). */
  EQ.wormWheelCircularPitch = (dg, Ng) => PI * dg / Ng;
  /** Wheel pitch diameter that meshes with the worm: dg = Ng px / π. */
  EQ.wormWheelDiameter = (Ng, px) => Ng * px / PI;
  /** Worm gear ratio mG = Ng / Nw. */
  EQ.wormGearRatio = (Ng, Nw) => Ng / Nw;

  /** Wheel tangential = worm axial force: Wtg = Waw = 2 Tg / dg (T9-27). */
  EQ.wormWheelTangentialForce = (Tg, dg) => 2 * Tg / dg;
  /** Wheel axial = worm tangential force: Wag = Wtw = 2 Tw / d (T9-27). */
  EQ.wormWheelAxialForce = (Tw, d) => 2 * Tw / d;
  /** Radial (separating) force Wr = Wtg tan φ / cos λ (T9-27). */
  EQ.wormRadialForce = (Wtg, phi, lambda) => Wtg * tan(phi) / cos(lambda);

  // ====================================================================
  // 9. REFERENCE DATA (T8-23, T8-27)
  // ====================================================================

  /** Standard metric modules [mm] (T8-23). */
  EQ.STANDARD_MODULES = [0.3, 0.4, 0.5, 0.8, 1, 1.25, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 25];
  /** Standard diametral pitches [teeth/in]: coarse (pd < 20) and fine (pd ≥ 20) (T8-23). */
  EQ.STANDARD_PD_COARSE = [1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 14, 16, 18];
  EQ.STANDARD_PD_FINE = [20, 24, 32, 48, 64, 72, 80, 96, 120];
  /** Smallest standard module ≥ m. */
  EQ.nextStandardModule = m => EQ.STANDARD_MODULES.find(s => s >= m);

  /** Minimum full-depth pinion teeth to avoid interference with a full-depth rack (T8-27). */
  EQ.MIN_TEETH_VS_RACK = { 14.5: 32, 20: 18, 25: 12 };
  /** 20° full-depth: minimum pinion teeth → maximum gear teeth without interference (T8-27). */
  EQ.MAX_GEAR_TEETH_FOR_PINION_20 = { 17: 1309, 16: 101, 15: 45, 14: 26, 13: 16 };

  // ====================================================================
  // 10. ROLLER CHAINS (T10)      p = chain pitch, N = sprocket teeth
  // ====================================================================

  /** Linear interpolation helper for the tables below: xs ascending, clamped at both ends. */
  const interp = (xs, ys, x) => {
    if (x <= xs[0]) return ys[0];
    for (let i = 1; i < xs.length; i++) {
      if (x <= xs[i]) return ys[i - 1] + (ys[i] - ys[i - 1]) * (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
    }
    return ys[ys.length - 1];
  };

  /** Pitch angle γ = 360° / N, returned in radians (T10-12). */
  EQ.chainPitchAngle = N => 2 * PI / N;
  /** sin(γ/2) = p / D  →  γ from pitch and sprocket diameter (T10-12). */
  EQ.chainPitchAngleFromDiameter = (p, D) => 2 * Math.asin(p / D);
  /** Sprocket pitch diameter D = p / sin(180° / N) (T10-12). */
  EQ.sprocketDiameter = (p, N) => p / sin(PI / N);
  /** Chain pitch from the sprocket: p = D sin(180° / N). */
  EQ.chainPitchFromSprocket = (D, N) => D * sin(PI / N);
  /** Chain speed V = ω D / 2 (T10-14). */
  EQ.chainSpeed = (omega, D) => omega * D / 2;
  /** Chain speed in ft/min from p [in], N and n [rpm]: V = N p n / 12 (Shigley; not written on the slides). */
  EQ.chainSpeedFtPerMin = (N, p, n) => N * p * n / 12;
  /** Minimum effective diameter d = D cos(γ/2) (T10-14). */
  EQ.sprocketMinDiameter = (D, gamma) => D * cos(gamma / 2);
  /** Chordal speed variation ΔV / V = (π/N) [ 1/sin(180°/N) − 1/tan(180°/N) ] (T10-15). */
  EQ.chordalSpeedVariation = N => (PI / N) * (1 / sin(PI / N) - 1 / tan(PI / N));
  /** Reference minimum sprocket teeth (T10-15). */
  EQ.CHAIN_REFERENCE_TEETH = 17;

  /** Chain length in pitches: L/p = 2C/p + (N1 + N2)/2 + p (N2 − N1)² / (4π² C) (T10-17). */
  EQ.chainLengthInPitches = (C, p, N1, N2) =>
    2 * C / p + (N1 + N2) / 2 + p * pow(N2 - N1, 2) / (4 * PI * PI * C);
  /** A = (N1 + N2)/2 − L/p (T10-17). */
  EQ.chainCenterDistanceA = (N1, N2, LoverP) => (N1 + N2) / 2 - LoverP;
  /** Centre distance C = (p/4) [ −A + sqrt( A² − 8 ((N2 − N1)/(2π))² ) ] (T10-17). */
  EQ.chainCenterDistance = (p, N1, N2, LoverP) => {
    const A = (N1 + N2) / 2 - LoverP;
    return (p / 4) * (-A + sqrt(A * A - 8 * pow((N2 - N1) / (2 * PI), 2)));
  };
  /** Recommended centre distance for short drives: 30p … 50p (T10-17). */
  EQ.chainCenterDistanceRange = p => ({ min: 30 * p, max: 50 * p });

  /** Allowable power Pa = K1 K2 Ptab (T10-19). */
  EQ.chainAllowablePower = (K1, K2, Ptab) => K1 * K2 * Ptab;
  /** Tooth correction factor K1 (T10-21): (N1/17)^1.08 pre-extreme power, (N1/17)^1.5 post-extreme power. */
  EQ.chainToothFactorPreExtreme = N1 => pow(N1 / 17, 1.08);
  EQ.chainToothFactorPostExtreme = N1 => pow(N1 / 17, 1.5);
  /** Strand factor K2 by number of strands (T10-21). */
  EQ.CHAIN_K2 = { 1: 1.0, 2: 1.7, 3: 2.5, 4: 3.3, 5: 3.9, 6: 4.6, 8: 6.0 };
  EQ.chainStrandFactor = strands => EQ.CHAIN_K2[strands];

  /** Design power Pd = Pnom Ks Nd (T10-22; same form for belts, T11-27 and T12-13). */
  EQ.designPower = (Pnom, Ks, Nd = 1) => Pnom * Ks * Nd;
  /** Chain service factor Ks, Table 7.8 (T10-22).
   *  load: 'uniform' | 'moderateShock' | 'heavyShock'; driver: 'hydraulic' | 'electricMotor' | 'combustionEngine' */
  EQ.CHAIN_KS = {
    uniform:       { hydraulic: 1.0, electricMotor: 1.0, combustionEngine: 1.2 },
    moderateShock: { hydraulic: 1.2, electricMotor: 1.3, combustionEngine: 1.4 },
    heavyShock:    { hydraulic: 1.4, electricMotor: 1.5, combustionEngine: 1.7 },
  };
  EQ.chainServiceFactor = (load, driver) => EQ.CHAIN_KS[load][driver];
  /** Number of strands needed / safety check: design power must not exceed the allowable power. */
  EQ.chainSafetyFactor = (Pa, Pnom, Ks) => Pa / (Pnom * Ks);

  /** ANSI roller chain dimensions (T10-11): pitch, width, roller diameter, strand spacing in inches;
   *  minimum tensile strength in lbf; average weight in lbf/ft. Chain 41 has no multi-strand spacing. */
  EQ.ANSI_CHAINS = {
    25:  { pitch: 0.250, width: 0.125, strength: 780,    weight: 0.09,  roller: 0.130, strandSpacing: 0.252 },
    35:  { pitch: 0.375, width: 0.188, strength: 1760,   weight: 0.21,  roller: 0.200, strandSpacing: 0.399 },
    41:  { pitch: 0.500, width: 0.250, strength: 1500,   weight: 0.25,  roller: 0.306, strandSpacing: null },
    40:  { pitch: 0.500, width: 0.312, strength: 3130,   weight: 0.42,  roller: 0.312, strandSpacing: 0.566 },
    50:  { pitch: 0.625, width: 0.375, strength: 4880,   weight: 0.69,  roller: 0.400, strandSpacing: 0.713 },
    60:  { pitch: 0.750, width: 0.500, strength: 7030,   weight: 1.00,  roller: 0.469, strandSpacing: 0.897 },
    80:  { pitch: 1.000, width: 0.625, strength: 12500,  weight: 1.71,  roller: 0.625, strandSpacing: 1.153 },
    100: { pitch: 1.250, width: 0.750, strength: 19500,  weight: 2.58,  roller: 0.750, strandSpacing: 1.409 },
    120: { pitch: 1.500, width: 1.000, strength: 28000,  weight: 3.87,  roller: 0.875, strandSpacing: 1.789 },
    140: { pitch: 1.750, width: 1.000, strength: 38000,  weight: 4.95,  roller: 1.000, strandSpacing: 1.924 },
    160: { pitch: 2.000, width: 1.250, strength: 50000,  weight: 6.61,  roller: 1.125, strandSpacing: 2.305 },
    180: { pitch: 2.250, width: 1.406, strength: 63000,  weight: 9.06,  roller: 1.406, strandSpacing: 2.592 },
    200: { pitch: 2.500, width: 1.500, strength: 78000,  weight: 10.96, roller: 1.562, strandSpacing: 2.817 },
    240: { pitch: 3.000, width: 1.875, strength: 112000, weight: 16.4,  roller: 1.875, strandSpacing: 3.458 },
  };

  /** Rated power Ptab [hp] of single-strand ANSI chain on a 17-tooth sprocket (T10-20).
   *  CHAIN_POWER[chain][i] goes with CHAIN_POWER_RPM[i]; missing entries are beyond the rated speed. */
  EQ.CHAIN_POWER_RPM = [50, 100, 150, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1200, 1400, 1600, 1800, 2000, 2500, 3000];
  EQ.CHAIN_POWER = {
    25:  [0.05, 0.09, 0.13, 0.16, 0.23, 0.30, 0.37, 0.44, 0.50, 0.56, 0.62, 0.68, 0.81, 0.93, 1.05, 1.16, 1.27, 1.56, 1.84],
    35:  [0.16, 0.29, 0.41, 0.54, 0.78, 1.01, 1.24, 1.46, 1.68, 1.89, 2.10, 2.31, 2.73, 3.13, 3.53, 3.93, 4.32, 5.28, 5.64],
    40:  [0.37, 0.69, 0.99, 1.29, 1.85, 2.40, 2.93, 3.45, 3.97, 4.48, 4.98, 5.48, 6.45, 7.41, 8.36, 8.96, 7.72, 5.51, 4.17],
    41:  [0.20, 0.38, 0.55, 0.71, 1.02, 1.32, 1.61, 1.90, 2.18, 2.46, 2.74, 3.01, 3.29, 2.61, 2.14, 1.79, 1.52, 1.10, 0.83],
    50:  [0.72, 1.34, 1.92, 2.50, 3.61, 4.67, 5.71, 6.72, 7.73, 8.71, 9.69, 10.7, 12.6, 14.4, 12.8, 10.7, 9.23, 6.58, 4.98],
    60:  [1.24, 2.31, 3.32, 4.30, 6.20, 8.03, 9.81, 11.6, 13.3, 15.0, 16.7, 18.3, 21.6, 18.1, 14.8, 12.4, 10.6, 7.57, 5.76],
    80:  [2.88, 5.38, 7.75, 10.0, 14.5, 18.7, 22.9, 27.0, 31.0, 35.0, 39.9, 37.7, 28.7, 22.7, 18.6, 15.6, 13.3, 9.56, 7.25],
    100: [5.52, 10.3, 14.8, 19.2, 27.7, 35.9, 43.9, 51.7, 59.4, 63.0, 52.8, 45.0, 34.3, 27.2, 22.3, 18.7, 15.9, 0.40, 0],
    120: [9.33, 17.4, 25.1, 32.5, 46.8, 60.6, 74.1, 87.3, 89.0, 72.8, 61.0, 52.1, 39.6, 31.5, 25.8, 21.6, 0],
    140: [14.4, 26.9, 38.8, 50.3, 72.4, 93.8, 115, 127, 101, 82.4, 69.1, 59.0, 44.9, 35.6, 0],
    160: [20.9, 39.1, 56.3, 72.9, 105, 136, 166, 141, 112, 91.7, 76.8, 65.6, 49.9, 0],
    180: [28.9, 54.0, 77.7, 101, 145, 188, 204, 155, 123, 101, 84.4, 72.1, 0],
    200: [38.4, 71.6, 103, 134, 193, 249, 222, 169, 0],
    240: [61.8, 115, 166, 215, 310, 359, 0],
  };
  /** Ptab [hp] for a chain number at a sprocket speed [rpm], interpolated between tabulated speeds.
   *  Returns null outside the tabulated range for that chain. */
  EQ.chainTabulatedPower = (chain, rpm) => {
    const row = EQ.CHAIN_POWER[chain];
    if (!row) return null;
    const xs = EQ.CHAIN_POWER_RPM.slice(0, row.length);
    if (rpm < xs[0] || rpm > xs[xs.length - 1]) return null;
    return interp(xs, row, rpm);
  };

  // ====================================================================
  // 11. FLAT BELTS (T11)      D, d = large / small pulley diameter, C = centre distance
  // ====================================================================

  /** Open belt contact angles (T11-17): θd = π − 2 asin((D − d)/(2C)), θD = π + 2 asin((D − d)/(2C)). */
  EQ.openBeltContactAngleSmall = (D, d, C) => PI - 2 * Math.asin((D - d) / (2 * C));
  EQ.openBeltContactAngleLarge = (D, d, C) => PI + 2 * Math.asin((D - d) / (2 * C));
  /** Open belt length L = sqrt(4C² − (D − d)²) + ½ (D θD + d θd) (T11-17). */
  EQ.openBeltLength = (D, d, C) => {
    const a = 2 * Math.asin((D - d) / (2 * C));
    return sqrt(4 * C * C - pow(D - d, 2)) + 0.5 * (D * (PI + a) + d * (PI - a));
  };
  /** Crossed belt contact angle, the same on both pulleys: θ = π + 2 asin((D + d)/(2C)) (T11-18). */
  EQ.crossedBeltContactAngle = (D, d, C) => PI + 2 * Math.asin((D + d) / (2 * C));
  /** Crossed belt length L = sqrt(4C² − (D + d)²) + ½ (D + d) θ (T11-18).
   *  NOTE: the slide's formula prints (D − d)² under the root; its own figure (and Shigley) use (D + d)². */
  EQ.crossedBeltLength = (D, d, C) =>
    sqrt(4 * C * C - pow(D + d, 2)) + 0.5 * (D + d) * EQ.crossedBeltContactAngle(D, d, C);

  /** Belt speed. US: v = π d n / 720 [ft/s] and V = π d n / 12 [ft/min], d in inches, n in rpm (T11-20, T12-15).
   *  SI: v = π d n / 60 [m/s], d in metres. */
  EQ.beltSpeedFtPerS = (d, n) => PI * d * n / 720;
  EQ.beltSpeedFtPerMin = (d, n) => PI * d * n / 12;
  EQ.beltSpeedSI = (d, n) => PI * d * n / 60;

  /** Belt weight per foot w = 12 γ b t [lbf/ft]; γ in lbf/in³, b and t in inches (T11-26). */
  EQ.flatBeltWeightPerFoot = (gamma, b, t) => 12 * gamma * b * t;
  /** Mass per unit length m = w / g [slug/ft], g = 32.17 ft/s² (T11-26). */
  EQ.GRAVITY_FT_S2 = 32.17;
  EQ.beltMassPerLength = (w, g = 32.17) => w / g;
  /** Centrifugal tension Fc = m v² (T11-20). US: slug/ft × (ft/s)² → lbf. SI: kg/m × (m/s)² → N. */
  EQ.beltCentrifugalForce = (m, v) => m * v * v;

  /** Belting equation (F1 − Fc) / (F2 − Fc) = e^(μθ) (T11-20). */
  EQ.beltTensionRatio = (mu, theta) => exp(mu * theta);
  /** Initial tension Fi = (F1 + F2)/2 − Fc (T11-21). */
  EQ.beltInitialTension = (F1, F2, Fc = 0) => (F1 + F2) / 2 - Fc;
  /** Torque the belt can transmit: T = Fi d (e^(μθ) − 1) / (e^(μθ) + 1) (T11-21). */
  EQ.beltTorqueFromInitialTension = (Fi, d, mu, theta) => {
    const e = exp(mu * theta);
    return Fi * d * (e - 1) / (e + 1);
  };
  /** Initial tension needed for a torque (the equation above, solved for Fi). */
  EQ.beltInitialTensionFromTorque = (T, d, mu, theta) => {
    const e = exp(mu * theta);
    return (T / d) * (e + 1) / (e - 1);
  };
  /** Tight side F1 = Fc + Fi × 2 e^(μθ) / (e^(μθ) + 1) (T11-21). */
  EQ.beltTightSideFromInitialTension = (Fi, Fc, mu, theta) => {
    const e = exp(mu * theta);
    return Fc + Fi * 2 * e / (e + 1);
  };
  /** Slack side F2 = Fc + Fi × 2 / (e^(μθ) + 1) (T11-21). */
  EQ.beltSlackSideFromInitialTension = (Fi, Fc, mu, theta) => Fc + Fi * 2 / (exp(mu * theta) + 1);
  /** Net belt pull F1 − F2 = 2T / d (T11-22). */
  EQ.beltNetForce = (T, d) => 2 * T / d;
  /** Tight and slack side from the net pull ΔF = F1 − F2 and the belting equation:
   *  F1 = Fc + ΔF e^(μθ) / (e^(μθ) − 1),  F2 = F1 − ΔF  (T12-16; the same algebra applies to flat belts). */
  EQ.beltTightSideFromNetForce = (dF, Fc, mu, theta) => {
    const e = exp(mu * theta);
    return Fc + dF * e / (e - 1);
  };
  EQ.beltSlackSideFromNetForce = (dF, Fc, mu, theta) => EQ.beltTightSideFromNetForce(dF, Fc, mu, theta) - dF;
  /** Resultant load of the belt on the shaft when both sides are roughly parallel: F1 + F2. */
  EQ.beltShaftLoad = (F1, F2) => F1 + F2;

  /** Design power in hp from torque [lbf in] and speed [rpm]: Pd = T n / 63025 (T11-27). */
  EQ.powerHpFromTorque = (T, n) => T * n / 63025;
  EQ.torqueFromPowerHp = (Pd, n) => 63025 * Pd / n;

  /** Largest allowable tight-side tension (F1)a = b Ftab Cp Cv (T11-28).
   *  b = belt width [in], Ftab = allowable tension per unit width [lbf/in]. */
  EQ.flatBeltAllowableTension = (b, Ftab, Cp, Cv = 1) => b * Ftab * Cp * Cv;

  /** Transmitted power, US: P[hp] = (F1 − F2) V / 33000 with V = ω r in ft/min (T11-31). */
  EQ.beltPowerHp = (F1, F2, V) => (F1 - F2) * V / 33000;
  /** Transmitted power, SI: P[W] = (F1 − F2) v, with v = ω r in m/s.
   *  NOTE: the slide prints P = 3,768 (F1 − F2) ω r for SI; with N, m and rad/s no constant is needed, so it is not used here. */
  EQ.beltPowerSI = (F1, F2, v) => (F1 - F2) * v;

  /** Flat belt materials (T11-26): t = thickness [in], dMin = minimum pulley [in], Ftab [lbf/in at 600 ft/min],
   *  gamma = specific weight [lbf/in³] (leather: 0.035–0.045, the midpoint is stored), f = friction coefficient.
   *  Leather pulleys: add 2 in to dMin for belts 8 in wide or more (the 20/64 and 23/64 sizes). */
  EQ.FLAT_BELTS = {
    'leather-1ply-11/64': { t: 11 / 64, dMin: 3.0,  Ftab: 30,  gamma: 0.040, f: 0.4 },
    'leather-1ply-13/64': { t: 13 / 64, dMin: 3.5,  Ftab: 33,  gamma: 0.040, f: 0.4 },
    'leather-2ply-18/64': { t: 18 / 64, dMin: 4.5,  Ftab: 41,  gamma: 0.040, f: 0.4 },
    'leather-2ply-20/64': { t: 20 / 64, dMin: 6.0,  Ftab: 50,  gamma: 0.040, f: 0.4 },
    'leather-2ply-23/64': { t: 23 / 64, dMin: 9.0,  Ftab: 60,  gamma: 0.040, f: 0.4 },
    'polyamide-F-0':      { t: 0.03,    dMin: 0.60, Ftab: 10,  gamma: 0.035, f: 0.5 },
    'polyamide-F-1':      { t: 0.05,    dMin: 1.0,  Ftab: 35,  gamma: 0.035, f: 0.5 },
    'polyamide-F-2':      { t: 0.07,    dMin: 2.4,  Ftab: 60,  gamma: 0.051, f: 0.5 },
    'polyamide-A-2':      { t: 0.11,    dMin: 2.4,  Ftab: 60,  gamma: 0.037, f: 0.8 },
    'polyamide-A-3':      { t: 0.13,    dMin: 4.3,  Ftab: 100, gamma: 0.042, f: 0.8 },
    'polyamide-A-4':      { t: 0.20,    dMin: 9.5,  Ftab: 175, gamma: 0.039, f: 0.8 },
    'polyamide-A-5':      { t: 0.25,    dMin: 13.5, Ftab: 125, gamma: 0.039, f: 0.8 },
  };
  /** Pulley correction factor Cp for flat belts (T11-29), by small-pulley diameter [in]:
   *  columns 1.6–4, 4.5–8, 9–12.5, 14–16, 18–31.5, over 31.5. null = not allowed on that pulley size. */
  EQ.FLAT_BELT_CP_LIMITS = [4, 8, 12.5, 16, 31.5, Infinity];
  EQ.FLAT_BELT_CP = {
    leather: [0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
    'F-0':   [0.95, 1.0, 1.0, 1.0, 1.0, 1.0],
    'F-1':   [0.70, 0.92, 0.95, 1.0, 1.0, 1.0],
    'F-2':   [0.73, 0.86, 0.96, 1.0, 1.0, 1.0],
    'A-2':   [0.73, 0.86, 0.96, 1.0, 1.0, 1.0],
    'A-3':   [null, 0.70, 0.87, 0.94, 0.96, 1.0],
    'A-4':   [null, null, 0.71, 0.80, 0.85, 0.92],
    'A-5':   [null, null, null, 0.72, 0.77, 0.91],
  };
  EQ.flatBeltPulleyFactor = (material, dSmall) => {
    const row = EQ.FLAT_BELT_CP[material];
    if (!row) return null;
    return row[EQ.FLAT_BELT_CP_LIMITS.findIndex(lim => dSmall <= lim)];
  };
  /** Velocity correction factor Cv: 1 for polyamide and urethane belts; leather is read from the chart (T11-30). */
  EQ.flatBeltVelocityFactorPolyamide = () => 1;

  // ====================================================================
  // 12. V-BELTS AND TIMING BELTS (T12)
  // ====================================================================

  /** V-belt sections (T12-5): a = top width [in], b = thickness [in], dMin = minimum sheave [in], hp = power range per belt(s). */
  EQ.V_BELT_SECTIONS = {
    A: { a: 1 / 2,   b: 11 / 32, dMin: 3.0,  hp: [0.25, 10] },
    B: { a: 21 / 32, b: 7 / 16,  dMin: 5.4,  hp: [1, 25] },
    C: { a: 7 / 8,   b: 17 / 32, dMin: 9.0,  hp: [15, 100] },
    D: { a: 1.25,    b: 3 / 4,   dMin: 13.0, hp: [50, 250] },
    E: { a: 1.5,     b: 1,       dMin: 21.6, hp: [100, Infinity] },
  };
  /** Groove / belt angle of every standard section (T12-5). */
  EQ.V_BELT_ANGLE_DEG = 40;
  /** Standard inside circumferences [in] (T12-6). A belt "B75" is section B with a 75 in inside circumference. */
  EQ.V_BELT_CIRCUMFERENCES = {
    A: [26, 31, 33, 35, 38, 42, 46, 48, 51, 53, 55, 57, 60, 62, 64, 66, 68, 71, 75, 78, 80, 85, 90, 96, 105, 112, 120, 128],
    B: [35, 38, 42, 46, 48, 51, 53, 55, 57, 60, 62, 64, 65, 66, 68, 71, 75, 78, 79, 81, 83, 85, 90, 93, 97, 100, 103, 105, 112, 120, 128, 131, 136, 144, 158, 173, 180, 195, 210, 240, 270, 300],
    C: [51, 60, 68, 75, 81, 85, 90, 96, 105, 112, 120, 128, 136, 144, 158, 162, 173, 180, 195, 210, 240, 270, 300, 330, 360, 390, 420],
    D: [120, 128, 144, 158, 162, 173, 180, 195, 210, 240, 270, 300, 330, 360, 390, 420, 480, 540, 600, 660],
    E: [180, 195, 210, 240, 270, 300, 330, 360, 390, 420, 480, 540, 600, 660],
  };
  /** Pitch length Lp = inside circumference + amount from the table (T12-7). B75 → 76.8 in. */
  EQ.V_BELT_LENGTH_ADD = { A: 1.3, B: 1.8, C: 2.9, D: 3.3, E: 4.5 };
  EQ.vBeltPitchLength = (section, insideCircumference) => insideCircumference + EQ.V_BELT_LENGTH_ADD[section];

  /** Centre distance from the pitch length (T12-8):
   *  C = 0.25 { [Lp − π/2 (D + d)] + sqrt( [Lp − π/2 (D + d)]² − 2 (D − d)² ) }. */
  EQ.vBeltCenterDistance = (Lp, D, d) => {
    const k = Lp - (PI / 2) * (D + d);
    return 0.25 * (k + sqrt(k * k - 2 * pow(D - d, 2)));
  };
  /** Pitch length from the centre distance: Lp = 2C + π (D + d)/2 + (D − d)² / (4C) (Shigley; the inverse of the above). */
  EQ.vBeltPitchLengthFromCenterDistance = (C, D, d) => 2 * C + PI * (D + d) / 2 + pow(D - d, 2) / (4 * C);
  /** Design condition D < C < 3 (D + d) (T12-8). */
  EQ.vBeltCenterDistanceRange = (D, d) => ({ min: D, max: 3 * (D + d) });
  EQ.vBeltCenterDistanceOk = (C, D, d) => C > D && C < 3 * (D + d);

  /** Contact angle on the small sheave θ = π − 2 asin((D − d)/(2C)) (T12-11). */
  EQ.vBeltContactAngle = (D, d, C) => PI - 2 * Math.asin((D - d) / (2 * C));

  /** Rated power Ptab [hp] per belt (T12-10), indexed [section] → rows of [sheave pitch diameter, hp at each speed].
   *  Speeds are V_BELT_POWER_SPEEDS [ft/min]. The last diameter of each section means "that size and larger".
   *  null = no rating at that speed. */
  EQ.V_BELT_POWER_SPEEDS = [1000, 2000, 3000, 4000, 5000];
  EQ.V_BELT_POWER = {
    A: [[2.6, 0.47, 0.62, 0.53, 0.15, null], [3.0, 0.66, 1.01, 1.12, 0.93, 0.38], [3.4, 0.81, 1.31, 1.57, 1.53, 1.12],
        [3.8, 0.93, 1.55, 1.92, 2.00, 1.71], [4.2, 1.03, 1.74, 2.20, 2.38, 2.19], [4.6, 1.11, 1.89, 2.44, 2.69, 2.58],
        [5.0, 1.17, 2.03, 2.64, 2.96, 2.89]],
    B: [[4.2, 1.07, 1.58, 1.68, 1.26, 0.22], [4.6, 1.27, 1.99, 2.29, 2.08, 1.24], [5.0, 1.44, 2.33, 2.80, 2.76, 2.10],
        [5.4, 1.59, 2.62, 3.24, 3.34, 2.82], [5.8, 1.72, 2.87, 3.61, 3.85, 3.45], [6.2, 1.82, 3.09, 3.94, 4.28, 4.00],
        [6.6, 1.92, 3.29, 4.23, 4.67, 4.48], [7.0, 2.01, 3.46, 4.49, 5.01, 4.90]],
    C: [[6.0, 1.84, 2.66, 2.72, 1.87, null], [7.0, 2.48, 3.94, 4.64, 4.44, 3.12], [8.0, 2.96, 4.90, 6.09, 6.36, 5.52],
        [9.0, 3.34, 5.65, 7.21, 7.86, 7.39], [10.0, 3.64, 6.25, 8.11, 9.06, 8.89], [11.0, 3.88, 6.74, 8.84, 10.0, 10.1],
        [12.0, 4.09, 7.15, 9.46, 10.9, 11.1]],
    D: [[10.0, 4.14, 6.13, 6.55, 5.09, 1.35], [11.0, 5.00, 7.83, 9.11, 8.50, 5.62], [12.0, 5.71, 9.26, 11.2, 11.4, 9.18],
        [13.0, 6.31, 10.5, 13.0, 13.8, 12.2], [14.0, 6.82, 11.5, 14.6, 15.8, 14.8], [15.0, 7.27, 12.4, 15.9, 17.6, 17.0],
        [16.0, 7.66, 13.2, 17.1, 19.2, 19.0], [17.0, 8.01, 13.9, 18.1, 20.6, 20.7]],
    E: [[16.0, 8.68, 14.0, 17.5, 18.1, 15.3], [18.0, 9.92, 16.7, 21.2, 23.0, 21.5], [20.0, 10.9, 18.7, 24.2, 26.9, 26.4],
        [22.0, 11.7, 20.3, 26.6, 30.2, 30.5], [24.0, 12.4, 21.6, 28.6, 32.9, 33.8], [26.0, 13.0, 22.8, 30.3, 35.1, 36.7],
        [28.0, 13.4, 23.7, 31.8, 37.1, 39.1]],
  };
  /** Ptab [hp] for a section, small sheave pitch diameter [in] and belt speed [ft/min].
   *  Interpolates linearly in both directions; clamps to the table edges. Returns null below the smallest sheave. */
  EQ.vBeltTabulatedPower = (section, d, V) => {
    const rows = EQ.V_BELT_POWER[section];
    if (!rows || d < rows[0][0]) return null;
    const atSpeed = row => {
      const xs = [], ys = [];
      EQ.V_BELT_POWER_SPEEDS.forEach((s, i) => { if (row[i + 1] != null) { xs.push(s); ys.push(row[i + 1]); } });
      return interp(xs, ys, V);
    };
    return interp(rows.map(r => r[0]), rows.map(atSpeed), d);
  };

  /** Allowable power per belt Pa = K1 K2 Ptab (T12-10). */
  EQ.vBeltAllowablePower = (K1, K2, Ptab) => K1 * K2 * Ptab;
  /** Contact angle correction K1 (T12-11), tabulated against (D − d)/C from 0.00 to 1.50 in steps of 0.10.
   *  VV = V-belt on V sheaves; V-flat = V-belt on a flat pulley. Interpolated between rows. */
  EQ.V_BELT_K1_X = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5];
  EQ.V_BELT_K1_THETA_DEG = [180, 174.3, 166.5, 162.7, 156.9, 151.0, 145.1, 139.0, 132.8, 126.5, 120.0, 113.3, 106.3, 98.9, 91.1, 82.8];
  EQ.V_BELT_K1_VV = [1.00, 0.99, 0.97, 0.96, 0.94, 0.93, 0.91, 0.89, 0.87, 0.85, 0.82, 0.80, 0.77, 0.73, 0.70, 0.65];
  EQ.V_BELT_K1_VFLAT = [0.75, 0.76, 0.78, 0.79, 0.80, 0.81, 0.83, 0.84, 0.85, 0.85, 0.82, 0.80, 0.77, 0.73, 0.70, 0.65];
  EQ.vBeltAngleFactor = (D, d, C, vFlat = false) =>
    interp(EQ.V_BELT_K1_X, vFlat ? EQ.V_BELT_K1_VFLAT : EQ.V_BELT_K1_VV, (D - d) / C);
  /** Belt length correction K2 (T12-12): [largest nominal length in inches for the factor, factor]. */
  EQ.V_BELT_K2 = {
    A: [[35, 0.85], [46, 0.90], [55, 0.95], [75, 1.00], [90, 1.05], [112, 1.10], [Infinity, 1.15]],
    B: [[46, 0.85], [60, 0.90], [75, 0.95], [97, 1.00], [120, 1.05], [144, 1.10], [180, 1.15], [Infinity, 1.20]],
    C: [[75, 0.85], [96, 0.90], [120, 0.95], [158, 1.00], [195, 1.05], [240, 1.10], [300, 1.15], [Infinity, 1.20]],
    D: [[128, 0.85], [162, 0.90], [210, 0.95], [240, 1.00], [330, 1.05], [420, 1.10], [480, 1.15], [Infinity, 1.20]],
    E: [[195, 0.90], [240, 0.95], [300, 1.00], [390, 1.05], [480, 1.10], [600, 1.15], [Infinity, 1.20]],
  };
  EQ.vBeltLengthFactor = (section, nominalLength) => {
    const rows = EQ.V_BELT_K2[section];
    return rows ? rows.find(r => nominalLength <= r[0])[1] : null;
  };

  /** Service factor Ks for V-belts (T12-13): [min, max] of the tabulated range.
   *  driven: 'uniform' | 'lightShock' | 'mediumShock' | 'heavyShock'; source: 'normalTorque' | 'highTorque' */
  EQ.V_BELT_KS = {
    uniform:     { normalTorque: [1.0, 1.2], highTorque: [1.1, 1.3] },
    lightShock:  { normalTorque: [1.1, 1.3], highTorque: [1.2, 1.4] },
    mediumShock: { normalTorque: [1.2, 1.4], highTorque: [1.4, 1.6] },
    heavyShock:  { normalTorque: [1.3, 1.5], highTorque: [1.5, 1.8] },
  };
  EQ.vBeltServiceFactorRange = (driven, source) => EQ.V_BELT_KS[driven][source];

  /** Number of belts Nb ≥ Pd / Pa (T12-14), rounded up to a whole belt. */
  EQ.vBeltCount = (Pd, Pa) => Math.ceil(Pd / Pa - 1e-9);
  /** Factor of safety of the installed drive: nfs = Pa Nb / (Pnom Ks) (Shigley; asked for in the T12-17 example). */
  EQ.vBeltSafetyFactor = (Pa, Nb, Pnom, Ks) => Pa * Nb / (Pnom * Ks);

  /** Effective friction coefficient of every V-belt section (T12-15). */
  EQ.V_BELT_FRICTION = 0.5123;
  /** (F1 − Fc) / (F2 − Fc) = e^(0.5123 θ) (T12-15). */
  EQ.vBeltTensionRatio = theta => exp(0.5123 * theta);
  /** Kb and Kc by section (T12-15). */
  EQ.V_BELT_KB_KC = {
    A: { Kb: 220, Kc: 0.561 }, B: { Kb: 576, Kc: 0.965 }, C: { Kb: 1600, Kc: 1.716 },
    D: { Kb: 5680, Kc: 3.498 }, E: { Kb: 10850, Kc: 5.041 },
    '3V': { Kb: 230, Kc: 0.425 }, '5V': { Kb: 1098, Kc: 1.217 }, '8V': { Kb: 4830, Kc: 3.288 },
  };
  /** Centrifugal tension Fc = Kc (V / 1000)² [lbf], V in ft/min (T12-15). */
  EQ.vBeltCentrifugalForce = (section, V) => EQ.V_BELT_KB_KC[section].Kc * pow(V / 1000, 2);
  /** Net pull per belt ΔF = F1 − F2 = 2T / (d Nb) (T12-16). */
  EQ.vBeltNetForcePerBelt = (T, d, Nb) => 2 * T / (d * Nb);
  /** Tight side per belt F1 = Fc + ΔF e^(0.5123θ) / (e^(0.5123θ) − 1) (T12-16). */
  EQ.vBeltTightSide = (dF, Fc, theta) => EQ.beltTightSideFromNetForce(dF, Fc, 0.5123, theta);
  /** Slack side per belt F2 = F1 − ΔF. */
  EQ.vBeltSlackSide = (F1, dF) => F1 - dF;
  /** Initial tension per belt Fi = (F1 + F2)/2 − Fc (T12-16). */
  EQ.vBeltInitialTension = (F1, F2, Fc) => (F1 + F2) / 2 - Fc;
  /** Extra tension from bending round a sheave, Fb = Kb / d [lbf] (Shigley; Kb is tabulated on T12-15 but not used on the slides). */
  EQ.vBeltBendingForce = (section, d) => EQ.V_BELT_KB_KC[section].Kb / d;

  /** Timing belt standard pitches [in] by service (T12-20). */
  EQ.TIMING_BELT_PITCH = { XL: 1 / 5, L: 3 / 8, H: 1 / 2, XH: 7 / 8, XXH: 1.25 };
  /** Timing pulley pitch diameter d = N p / π, and speed ratio by tooth count (geometry; not written on the slides). */
  EQ.timingPulleyDiameter = (N, p) => N * p / PI;
  EQ.timingBeltSpeedRatio = (NDriver, NDriven) => NDriver / NDriven;

  // ====================================================================
  // T04: shaft strength design. Lengths in mm, forces in N, moments in N mm, stresses in MPa
  // (any consistent set of units works).
  // ====================================================================
  /** Power P = T ω (T4-4). */
  EQ.shaftPower = (T, omega) => T * omega;
  /** Bending stress of a round shaft, σ = Kf 32 M / (π d³) (T4-13); use Ma for σa and Mm for σm. */
  EQ.shaftBendingStress = (Kf, M, d) => Kf * 32 * M / (PI * pow(d, 3));
  /** Axial stress of a round shaft, σm,axial = Kf 4 F / (π d²) (T4-14). */
  EQ.shaftAxialStress = (Kf, F, d) => Kf * 4 * F / (PI * d * d);
  /** Torsional shear stress of a round shaft, τ = Kfs 16 T / (π d³) (T4-15); use Ta for τa and Tm for τm. */
  EQ.shaftTorsionStress = (Kfs, T, d) => Kfs * 16 * T / (PI * pow(d, 3));
  /** Fatigue stress concentration factor Kf = 1 + q (Kt − 1), same form for Kfs with q shear and Kts (T4-16). */
  EQ.fatigueConcentrationFactor = (q, Kt) => 1 + q * (Kt - 1);
  /** von Mises equivalent of a normal and a shear stress, σ' = √(σ² + 3 τ²) (T4-21). */
  EQ.vonMisesStress = (sigma, tau) => sqrt(sigma * sigma + 3 * tau * tau);
  /** Goodman fatigue safety factor, 1 / Nf = σa' / Se + σm' / Sut (T4-20, T4-21). */
  EQ.goodmanSafetyFactor = (sigmaA, sigmaM, Se, Sut) => 1 / (sigmaA / Se + sigmaM / Sut);
  /** Shaft diameter by Goodman with negligible axial stress (T4-21):
   *  d = [ 32 Nf / π × ( √((Kf Ma)² + ¾ (Kfs Ta)²) / Se + √((Kf Mm)² + ¾ (Kfs Tm)²) / Sut ) ]^(1/3). */
  EQ.shaftDiameterGoodman = (Nf, Kf, Kfs, Ma, Ta, Mm, Tm, Se, Sut) =>
    pow(32 * Nf / PI * (sqrt(pow(Kf * Ma, 2) + 0.75 * pow(Kfs * Ta, 2)) / Se
                        + sqrt(pow(Kf * Mm, 2) + 0.75 * pow(Kfs * Tm, 2)) / Sut), 1 / 3);
  /** Largest von Mises stress of the cycle, σ'max = √((32 Kf (Mm + Ma) / π d³)² + 3 (16 Kfs (Tm + Ta) / π d³)²) (T4-22). */
  EQ.shaftMaxVonMises = (Kf, Kfs, M, T, d) =>
    EQ.vonMisesStress(EQ.shaftBendingStress(Kf, M, d), EQ.shaftTorsionStress(Kfs, T, d));
  /** Yield safety factor Ny = Sy / σ'max (T4-22). */
  EQ.yieldSafetyFactor = (Sy, sigmaMax) => Sy / sigmaMax;
  /** Second moment of area I = π d⁴ / 64 and polar moment J = π d⁴ / 32 of a round section (T4-13, T4-15). */
  EQ.roundSectionInertia = d => PI * pow(d, 4) / 64;
  EQ.roundSectionPolarInertia = d => PI * pow(d, 4) / 32;
  /** Twist of a stepped shaft, φ = T / G × Σ (l / J) [rad]; segments = [[length, diameter], ...] (T4-28). */
  EQ.shaftTwistAngle = (T, G, segments) =>
    T / G * segments.reduce((sum, s) => sum + s[0] / EQ.roundSectionPolarInertia(s[1]), 0);

  // Endurance limit of the shaft. T04 uses Se in Goodman but does not say how to get it; these are the
  // Marin factors of Budynas and Nisbett, chapter 6 (the book T04 lists as basic bibliography).
  /** Endurance limit of the test specimen for steel, S'e = 0.5 Sut up to Sut = 1400 MPa, 700 MPa above. */
  EQ.enduranceLimitSteel = Sut => (Sut <= 1400 ? 0.5 * Sut : 700);
  /** Surface factor ka = a Sut^b, Sut in MPa. */
  EQ.MARIN_SURFACE = { ground: [1.58, -0.085], machined: [4.51, -0.265], hotRolled: [57.7, -0.718], forged: [272, -0.995] };
  EQ.marinSurfaceFactor = (Sut, finish) => {
    const c = EQ.MARIN_SURFACE[finish || 'machined'];
    return c[0] * pow(Sut, c[1]);
  };
  /** Size factor kb for a rotating round shaft, d in mm: 1.24 d^−0.107 (2.79 to 51 mm), 1.51 d^−0.157 (51 to 254 mm). */
  EQ.marinSizeFactor = d => (d < 2.79 ? 1 : d <= 51 ? 1.24 * pow(d, -0.107) : 1.51 * pow(d, -0.157));
  /** Reliability factor ke = 1 − 0.08 z: 90 % → 0.897; 95 % → 0.868; 99 % → 0.814; 99.9 % → 0.753; 99.99 % → 0.702.
   *  Between the tabulated reliabilities z is interpolated on log(1 − R). */
  EQ.MARIN_RELIABILITY_Z = [[50, 0], [90, 1.288], [95, 1.645], [99, 2.326], [99.9, 3.091], [99.99, 3.719]];
  EQ.marinReliabilityFactor = percent => {
    const tab = EQ.MARIN_RELIABILITY_Z, p = Math.min(99.99, Math.max(50, percent));
    let k = 0;
    while (k < tab.length - 2 && p > tab[k + 1][0]) k++;
    const u = v => Math.log10(100 - v);
    const z = tab[k][1] + (tab[k + 1][1] - tab[k][1]) * (u(p) - u(tab[k][0])) / (u(tab[k + 1][0]) - u(tab[k][0]));
    return 1 - 0.08 * z;
  };
  /** Corrected endurance limit Se = ka kb ke S'e (load and temperature factors taken as 1). */
  EQ.enduranceLimit = (Sut, d, reliabilityPercent, finish) =>
    EQ.marinSurfaceFactor(Sut, finish) * EQ.marinSizeFactor(d) * EQ.marinReliabilityFactor(reliabilityPercent) * EQ.enduranceLimitSteel(Sut);

  // ====================================================================
  // Inverting any equation
  // ====================================================================
  /**
   * Solve an equation of this file for any one of its arguments.
   *
   *   EQ.solveFor('torqueFromPower', [null, 83.78], 47.75)   → the power that gives T = 47.75 at ω = 83.78
   *   EQ.solveFor(EQ.shaftBendingStress, [1.7, 39100, null], 25)   → the diameter that gives σ = 25
   *
   * fn      a function of EQ, or its name
   * args    its arguments in order, with null in the place of the unknown (exactly one)
   * target  the value the function has to return
   * opts    { guess, min, max }: where to start and the allowed range of the unknown (all optional)
   *
   * The unknown is found numerically (damped Newton, then a sign-change search with bisection), so the same
   * function that gives a from b and c also gives b from a and c. It returns NaN when no value reaches the
   * target. When several values do, it returns the one nearest the guess. Functions that look a value up in
   * a table by name, or that return something other than a number, cannot be inverted this way.
   */
  EQ.solveFor = (fn, args, target, opts) => {
    const f = typeof fn === 'string' ? EQ[fn] : fn;
    if (typeof f !== 'function') throw new Error('solveFor: unknown equation ' + fn);
    const k = args.findIndex(a => a == null);
    if (k < 0 || args.some((a, i) => a == null && i !== k)) throw new Error('solveFor: exactly one argument must be null');
    const o = opts || {};
    const lo = o.min == null ? -Infinity : o.min, hi = o.max == null ? Infinity : o.max;
    const good = v => typeof v === 'number' && isFinite(v);
    const g = x => { const a = args.slice(); a[k] = x; try { return f(...a) - target; } catch (err) { return NaN; } };
    const tol = 1e-10 * (1 + Math.abs(target));
    const clamp = x => Math.min(hi, Math.max(lo, x));

    // damped Newton from the guess
    let x = clamp(o.guess == null ? 1 : o.guess), fx = g(x);
    for (let it = 0; it < 80 && good(fx); it++) {
      if (Math.abs(fx) <= tol) return x;
      const h = 1e-6 * (Math.abs(x) + 1e-6);
      const d = (g(x + h) - fx) / h;
      if (!good(d) || d === 0) break;
      let step = fx / d, xn = clamp(x - step), fn2 = g(xn), tries = 0;
      while ((!good(fn2) || Math.abs(fn2) > Math.abs(fx)) && tries++ < 40) { step /= 2; xn = clamp(x - step); fn2 = g(xn); }
      if (!good(fn2) || xn === x) break;
      x = xn; fx = fn2;
    }
    if (good(fx) && Math.abs(fx) <= tol) return x;

    // search for a change of sign over many orders of magnitude, nearest the guess first, then bisect
    const pts = [0];
    for (let e10 = -9; e10 <= 12; e10 += 0.125) { const v = Math.pow(10, e10); pts.push(v, -v); }
    const xs = pts.filter(v => v >= lo && v <= hi).sort((p, q) => p - q);
    if (good(lo)) xs.unshift(lo);
    if (good(hi)) xs.push(hi);
    const ref = o.guess == null ? 1 : o.guess;
    let best = null;
    for (let i = 0; i + 1 < xs.length; i++) {
      const fa = g(xs[i]), fb = g(xs[i + 1]);
      if (!good(fa) || !good(fb) || fa * fb > 0) continue;
      const dist = Math.abs((xs[i] + xs[i + 1]) / 2 - ref);
      if (!best || dist < best.dist) best = { a: xs[i], b: xs[i + 1], fa, dist };
    }
    if (!best) return NaN;
    let a = best.a, b = best.b, fa = best.fa;
    for (let it = 0; it < 200; it++) {
      const m = (a + b) / 2, fm = g(m);
      if (!good(fm)) return NaN;
      if (Math.abs(fm) <= tol || Math.abs(b - a) <= 1e-13 * (1 + Math.abs(m))) return m;
      if (fa * fm <= 0) b = m; else { a = m; fa = fm; }
    }
    return (a + b) / 2;
  };

  // ---- export ----
  root.EQ = EQ;
  if (typeof module !== 'undefined' && module.exports) module.exports = EQ;
})(typeof globalThis !== 'undefined' ? globalThis : this);
