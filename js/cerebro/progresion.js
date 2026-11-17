// R12 · Progresión de cargas (doble progresión) y estancamiento.
import { rirObjetivo, e1rm } from './esfuerzo.js';

/**
 * R12 · Escalones de carga por material. Se configuran una vez en Ajustes.
 * Un número = paso fijo (kg). Una lista = los pesos que existen de verdad (p. ej. las mancuernas del gimnasio).
 * Valores por defecto: diseño de Gofio (⚪), pensados para un gimnasio corriente.
 */
export const ESCALONES_POR_DEFECTO = {
  barra: 2.5, smith: 2.5, mancuernas: 2, maquina: 5, polea: 2.5, lastre: 2.5,
};

const r2 = (x) => Math.round(x * 100) / 100;

/** R12 · Siguiente peso disponible hacia arriba (dir = +1) o hacia abajo (dir = −1). */
export function siguienteEscalon(peso, cfg, dir = 1) {
  if (Array.isArray(cfg)) {
    const v = [...cfg].sort((a, b) => a - b);
    if (dir > 0) return v.find((x) => x > peso + 1e-9) ?? peso;
    const abajo = v.filter((x) => x < peso - 1e-9);
    return abajo.length ? abajo[abajo.length - 1] : Math.min(peso, v[0] ?? 0);
  }
  const paso = cfg > 0 ? cfg : 2.5;
  if (dir > 0) return r2(Math.floor(peso / paso + 1e-9) * paso + paso);
  return r2(Math.max(0, Math.ceil(peso / paso - 1e-9) * paso - paso));
}

/** R12 / R14 · Redondea un peso al escalón disponible más cercano por debajo (o por arriba). */
export function redondearAEscalon(peso, cfg, hacia = 'abajo') {
  if (Array.isArray(cfg)) {
    const v = [...cfg].sort((a, b) => a - b);
    if (hacia === 'abajo') return [...v].reverse().find((x) => x <= peso + 1e-9) ?? v[0] ?? 0;
    return v.find((x) => x >= peso - 1e-9) ?? v[v.length - 1] ?? peso;
  }
  const paso = cfg > 0 ? cfg : 2.5;
  const f = hacia === 'abajo' ? Math.floor : Math.ceil;
  return r2(Math.max(0, f(peso / paso + (hacia === 'abajo' ? 1e-9 : -1e-9)) * paso));
}

/**
 * R12 (libro 1.4, G107) · Cuánto subir cuando toca: el salto que se adapta al peso. Al subir, la próxima vez se vuelve
 * a la parte baja del rango; el salto es el que deja la misma fuerza estimada (R11, Epley con la reserva) haciendo
 * repMin en vez de repMax, redondeado hacia abajo a lo que exista, y como poco un escalón. Con poco peso sale un
 * escalón; con mucho, varios (prensa 180 kg 10-12 con escalón 2,5 → 187,5).
 */
export function pesoDeSubida(peso, { repMin, repMax, tipo, escalon }) {
  const r = rirObjetivo(tipo);
  const rir = (r.min + r.max) / 2;
  const objetivo = peso * (1 + (repMax + rir) / 30) / (1 + (repMin + rir) / 30);
  const nuevo = redondearAEscalon(objetivo, escalon, 'abajo');
  return nuevo > peso + 1e-9 ? nuevo : siguienteEscalon(peso, escalon, +1);
}

/**
 * R12 · Doble progresión. Entrada: lo que se hizo la última vez con ese ejercicio.
 * @param {{peso:number, series:{reps:number, rir:number}[], repMin:number, repMax:number,
 *          tipo:'multi'|'aislamiento', escalon:number|number[]}} p
 * @returns {{accion:'subir'|'mantener'|'bajar', peso:number, reps:number[], rir:{min,max}}}
 *   reps = repeticiones objetivo para cada serie de la próxima vez.
 */
export function proximaVez({ peso, series, repMin, repMax, tipo, escalon }) {
  const rir = rirObjetivo(tipo);
  if (!series?.length) return { accion: 'mantener', peso, reps: [], rir };
  // 1) Todas las series en el tope del rango, con el RIR objetivo o con más margen → siguiente escalón y parte baja del rango.
  const todasArriba = series.every((s) => s.reps >= repMax && s.rir >= rir.min);
  if (todasArriba) {
    const nuevo = pesoDeSubida(peso, { repMin, repMax, tipo, escalon });
    if (nuevo > peso) return { accion: 'subir', peso: nuevo, reps: series.map(() => repMin), rir };
  }
  // 3) RIR 0 sin llegar a la parte baja del rango → un escalón menos.
  const fallo = series.some((s) => s.rir === 0 && s.reps < repMin);
  if (fallo) {
    const nuevo = siguienteEscalon(peso, escalon, -1);
    return { accion: 'bajar', peso: nuevo, reps: series.map(() => repMin), rir };
  }
  // 2) Si no, mismo peso y una repetición más en la serie que se quedó más corta.
  const reps = series.map((s) => Math.min(Math.max(s.reps, repMin), repMax));
  let peor = 0;
  reps.forEach((r, i) => { if (r < reps[peor]) peor = i; });
  if (reps[peor] < repMax) reps[peor] += 1;
  return { accion: 'mantener', peso, reps, rir };
}

/**
 * R12 · Estancamiento: la e1RM (la mejor de cada sesión) no mejora en 3 sesiones seguidas de ese ejercicio.
 * @param {number[]} e1rmPorSesion de la más antigua a la más reciente.
 */
export function estancado(e1rmPorSesion, ventana = 3) {
  if (e1rmPorSesion.length < ventana + 1) return false;
  const antes = Math.max(...e1rmPorSesion.slice(0, -ventana));
  const ultimas = Math.max(...e1rmPorSesion.slice(-ventana));
  return ultimas <= antes + 1e-9;
}

export { e1rm };
