// v0.2 · Progresión: la fuerza estimada por ejercicio (R11), su estado (R12) y la descarga propuesta (R13).
import { e1rm } from './esfuerzo.js';
import { estancado, redondearAEscalon } from './progresion.js';
import { diasEntre, lunesDe, sumarDias } from './fechas.js';

/**
 * R11 · La fuerza estimada de cada sesión de un ejercicio: la mejor e1RM de sus series.
 * @param {{sesionId, fecha, ts, peso, reps, rir}[]} series de UN ejercicio
 * @returns {{sesionId, fecha, e1rm, top}[]} de la más antigua a la más reciente
 */
export function fuerzaPorSesion(series) {
  const porSesion = new Map();
  for (const s of [...series].sort((a, b) => a.ts - b.ts)) {
    const v = e1rm(s.peso, s.reps, s.rir);
    const x = porSesion.get(s.sesionId);
    if (!x) porSesion.set(s.sesionId, { sesionId: s.sesionId, fecha: s.fecha, e1rm: v, top: s });
    else if (v > x.e1rm) { x.e1rm = v; x.top = s; }
  }
  return [...porSesion.values()];
}

/**
 * Estado de un ejercicio (diseño de Gofio sobre R12):
 *  · 'nuevo'     → menos de 2 sesiones: aún no hay tendencia.
 *  · 'atascado'  → R12: la e1RM no mejora en 3 sesiones seguidas de ese ejercicio. Pero R12 manda mirar antes
 *                  si ha faltado mucho: si en ese tramo hubo 8 días o más sin ir al gimnasio (la vuelta de R14),
 *                  no se marca. (Se mira el gimnasio, no el ejercicio: con 5 días de rutina, un ejercicio vuelve
 *                  cada 7-10 días sin que falte nada.)
 *  · 'sube'      → la última sesión supera a todas las anteriores.
 *  · 'asienta'   → lo demás: ni sube ni lleva 3 sin mejorar.
 * @param {{fecha:string, e1rm:number}[]} sesiones de la más antigua a la más reciente
 * @param {string[]} fechasGimnasio todas las fechas con entreno (para ver si ha faltado mucho)
 */
export function estadoFuerza(sesiones, fechasGimnasio = []) {
  if (sesiones.length < 2) return 'nuevo';
  const v = sesiones.map((s) => s.e1rm);
  if (estancado(v)) {
    const desde = sesiones.at(-4).fecha, hasta = sesiones.at(-1).fecha;
    const tramo = [...new Set([...fechasGimnasio, ...sesiones.slice(-4).map((s) => s.fecha)])].filter((f) => f >= desde && f <= hasta).sort();
    const falto = tramo.slice(1).some((f, i) => diasEntre(tramo[i], f) >= 8);
    if (!falto) return 'atascado';
  }
  const antes = Math.max(...v.slice(0, -1));
  return v[v.length - 1] > antes + 1e-9 ? 'sube' : 'asienta';
}

/**
 * R12 · Qué proponer cuando un ejercicio se atasca: otra variante del mismo patrón (R22) o un rango de repeticiones
 * más bajo. El rango nuevo baja 2 repeticiones por los dos extremos, sin bajar de 5 (R11: rango libre dentro de 5-30).
 * El salto de 2 es diseño de Gofio.
 */
export function rangoMasBajo(repMin, repMax) {
  const ancho = repMax - repMin;
  const min = Math.max(5, repMin - 2);
  return { repMin: min, repMax: Math.max(min, min + ancho) };
}

/**
 * R13 · Descarga propuesta, nunca fija: si se dan dos de estas tres señales.
 *  1) estancamiento (R12) en 2 o más ejercicios a la vez;
 *  2) cansancio o molestias marcados en varias sesiones seguidas (diseño de Gofio: las 2 últimas);
 *  3) 6-8 semanas seguidas yendo 4 días o más (se usa el mínimo: 6 semanas ya terminadas).
 * @param {{atascados:number, sensaciones:(string|null)[], fechas:string[], hoy:string}} d
 *   sensaciones: de las sesiones hechas, de la más antigua a la más reciente ('entero' | 'molido' | 'molesta' | null)
 */
export function senalesDescarga({ atascados, sensaciones, fechas, hoy }) {
  const s1 = atascados >= 2;
  const ult = sensaciones.slice(-2);
  const s2 = ult.length === 2 && ult.every((x) => x === 'molido' || x === 'molesta');
  const s3 = semanasSeguidasFuertes(fechas, hoy) >= 6;
  const n = [s1, s2, s3].filter(Boolean).length;
  return { atascados: s1, cansancio: s2, semanas: s3, proponer: n >= 2, semanasSeguidas: semanasSeguidasFuertes(fechas, hoy) };
}

/** R13.3 · Semanas terminadas seguidas (hacia atrás desde la anterior a la actual) con 4 días de entreno o más. */
export function semanasSeguidasFuertes(fechas, hoy, minDias = 4) {
  let lunes = sumarDias(lunesDe(hoy), -7);
  let n = 0;
  for (;;) {
    const domingo = sumarDias(lunes, 6);
    const dias = new Set(fechas.filter((f) => f >= lunes && f <= domingo)).size;
    if (dias < minDias) return n;
    n += 1; lunes = sumarDias(lunes, -7);
  }
}

/** R13 · Duración de la descarga: de 5 a 7 días. Gofio la deja 7 (hasta el mismo día de la semana siguiente, sin él). */
export const DIAS_DESCARGA = 7;

/**
 * R13 · Una sesión en descarga: misma frecuencia y mismos ejercicios, ≈ la mitad de series, RIR +2 y cargas −10 %
 * (redondeadas hacia abajo al escalón del gimnasio, R12).
 */
export function aplicarDescarga(p, escalon) {
  return {
    ...p,
    peso: p.peso ? redondearAEscalon(p.peso * 0.9, escalon, 'abajo') : p.peso,
    series: Math.max(1, Math.round(p.series / 2)),
    rir: { min: Math.min(4, p.rir.min + 2), max: Math.min(4, p.rir.max + 2) },
  };
}
