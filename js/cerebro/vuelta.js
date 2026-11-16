// R14 · Vuelta tras días sin ir.
import { diasEntre, sumarDias } from './fechas.js';
import { redondearAEscalon } from './progresion.js';

/**
 * R14 · Qué tipo de sesión toca según los días desde el último entreno.
 *  ≤7 días: normal · 8-20: primera sesión con RIR +1 · ≥21: primera semana con cargas −10 %,
 *  dos tercios de las series y RIR 2-3; la segunda semana, normal.
 * @param {string[]} fechas fechas de las sesiones ya hechas ('AAAA-MM-DD'), sin la de hoy.
 * @param {string} hoy
 */
export function vuelta(fechas, hoy) {
  const f = [...new Set(fechas)].filter((x) => x < hoy).sort();
  if (!f.length) return { tipo: 'primera', dias: null };
  const dias = diasEntre(f[f.length - 1], hoy);
  if (dias >= 21) return { tipo: 'larga', dias, factorCarga: 0.9, factorSeries: 2 / 3, rir: { min: 2, max: 3 }, hasta: sumarDias(hoy, 6) };
  if (dias >= 8) return { tipo: 'media', dias, rirExtra: 1 };
  // ¿Seguimos dentro de la primera semana de una vuelta larga? Se busca el último parón de 21+ días.
  for (let i = f.length - 1; i > 0; i--) {
    if (diasEntre(f[i - 1], f[i]) >= 21) {
      const inicio = f[i];
      if (diasEntre(inicio, hoy) <= 6) {
        return { tipo: 'larga', dias, desde: inicio, factorCarga: 0.9, factorSeries: 2 / 3, rir: { min: 2, max: 3 }, hasta: sumarDias(inicio, 6) };
      }
      break;
    }
  }
  return { tipo: 'normal', dias };
}

/**
 * R14 · Aplica la vuelta a la prescripción de un ejercicio.
 * @param {{peso:number, series:number, rir:{min,max}}} p
 * @param {*} v resultado de vuelta()
 * @param {number|number[]} escalon escalones del material (R12)
 */
export function aplicarVuelta(p, v, escalon) {
  if (v.tipo === 'larga') {
    return {
      ...p,
      peso: p.peso ? redondearAEscalon(p.peso * v.factorCarga, escalon, 'abajo') : p.peso,
      series: Math.max(1, Math.round(p.series * v.factorSeries)),
      rir: { ...v.rir },
    };
  }
  if (v.tipo === 'media') return { ...p, rir: { min: p.rir.min + 1, max: p.rir.max + 1 } };
  return { ...p };
}
