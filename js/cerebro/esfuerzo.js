// R11 · Repeticiones, esfuerzo (RIR) y fuerza estimada.

/** R11.2 · RIR objetivo: 1-2 en multiarticulares, 0-1 en aislamiento. */
export function rirObjetivo(tipo) {
  return tipo === 'multi' ? { min: 1, max: 2 } : { min: 0, max: 1 };
}

/** R11.3 · Botones del RIR: 0, 1, 2, 3 y 4+ (4 significa «4 o más»). */
export const BOTONES_RIR = [0, 1, 2, 3, 4];

/**
 * R11.4 · Fuerza estimada (e1RM) = peso × (1 + (reps + RIR) ÷ 30): Epley con el RIR sumado.
 * Solo para ver la tendencia de cada ejercicio; nunca para mandar a hacer un máximo.
 * Pierde precisión por encima de ~10-12 repeticiones (certeza 🟠).
 */
export function e1rm(peso, reps, rir = 0) {
  if (!(peso > 0) || !(reps > 0)) return 0;
  return peso * (1 + (reps + Math.max(0, rir)) / 30);
}

/** R11.4 · La mejor e1RM de una lista de series de un mismo ejercicio. */
export function mejorE1rm(series) {
  return series.reduce((m, s) => Math.max(m, e1rm(s.peso, s.reps, s.rir)), 0);
}
