// R21 · Modo «día malo» (libro v1.1): una sesión corta para no dejar el día en blanco.
import { CATALOGO, ejercicio } from './ejercicios.js';
import { rirObjetivo } from './esfuerzo.js';

/**
 * R21 · Los ejercicios clave del día (los multiarticulares, hasta 3, en su orden), 2 series cada uno
 * y 2 repeticiones más de margen (RIR objetivo +2, como mucho 4). El peso no baja: el margen ya hace la sesión más llevadera.
 * Si el día tiene menos de 2 multiarticulares, se completan con los primeros ejercicios del día.
 */
export function diaMalo(ejercicios, catalogo = CATALOGO, { maxEjercicios = 3, series = 2, margen = 2 } = {}) {
  const multi = ejercicios.filter((e) => ejercicio(e.ej, catalogo).tipo === 'multi');
  const clave = [...multi];
  for (const e of ejercicios) if (clave.length < 2 && !clave.includes(e)) clave.push(e);
  return clave.slice(0, maxEjercicios).map((e) => {
    const r = rirObjetivo(ejercicio(e.ej, catalogo).tipo);
    return { ...e, series: Math.min(series, e.series), rir: { min: Math.min(4, r.min + margen), max: Math.min(4, r.max + margen) }, diaMalo: true };
  });
}

/** R21 · Minutos aproximados de una lista de ejercicios (≈ 3 min por serie con descanso, R15.7). */
export const minutosDe = (ejercicios) => ejercicios.reduce((s, e) => s + e.series, 0) * 3;
