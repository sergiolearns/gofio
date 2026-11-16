// R23 · Constancia semanal (libro v1.1): semanas con al menos un entreno. Sin rachas que se pongan a cero.
import { lunesDe, sumarDias } from './fechas.js';

/**
 * @param {string[]} fechas fechas de las sesiones hechas
 * @param {string} hoy
 * @returns {{semanas:{lunes:string, dias:number}[], conEntreno:number, total:number}}
 *   las últimas `n` semanas, de la más antigua a la actual; `dias` = días distintos con entreno.
 */
export function constancia(fechas, hoy, n = 8) {
  const actual = lunesDe(hoy);
  const semanas = [];
  for (let i = n - 1; i >= 0; i--) {
    const lunes = sumarDias(actual, -7 * i);
    const domingo = sumarDias(lunes, 6);
    const dias = new Set(fechas.filter((f) => f >= lunes && f <= domingo && f <= hoy)).size;
    semanas.push({ lunes, dias });
  }
  // La semana en curso solo cuenta como «sin entreno» cuando ya ha terminado: aún puede sumar.
  const cerradas = semanas.filter((s) => s.lunes !== actual || s.dias > 0);
  return { semanas, conEntreno: semanas.filter((s) => s.dias > 0).length, total: cerradas.length };
}
