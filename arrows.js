/* How a force arrow is sized, shared by the 2D and the 3D view. */

// How a force arrow shows its size: mostly by its thickness, a little by its length.
// The thickness follows the square root of the force: 1.2 times the base size for the tangential force
// of the statement's 4 kW (637 N), held between 0.5 and 3 times. The base sizes are ARROW_2D (line width
// in pixels) and ARROW_3D (shaft radius as a share of the largest radius of the model).
const FORCE_REF = 637;
export const ARROW_2D = 3.6;
export const ARROW_3D = 0.035;
export function forceLook(F) {
  const k = Math.max(1e-6, F) / FORCE_REF;
  return { thick: Math.max(0.5, Math.min(3, 1.2 * Math.sqrt(k))), long: Math.max(0.8, Math.min(1.35, Math.pow(k, 0.12))) };
}
