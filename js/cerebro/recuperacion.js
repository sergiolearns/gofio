// R15.9 · La recuperación de cada músculo (libro 1.7, G133). Un músculo que trabajaste fuerte como principal necesita
// su descanso antes de volver a ser el principal de un ejercicio, aunque hicieras pocas series.
// Fuente: Sousa, Zourdos, Storey y Helms (2024), J Hum Kinet 91:205-223 (la pierna necesita unas 48-72 h; el tren
// superior, menos; los multiarticulares, lo excéntrico y llegar al fallo alargan la recuperación). Morán-Navarro y
// cols. (2017), Eur J Appl Physiol 117:2387-2399 (llegar al fallo en cada serie retrasa la recuperación 24-48 h).
// Las horas exactas son diseño de Gofio (⚪) dentro de esas franjas.
import { CATALOGO, ejercicio } from './ejercicios.js';
import { IDS_MUSCULOS } from './musculos.js';

const HORA = 3600000;
export const PIERNA = new Set(['cuadriceps', 'isquios', 'gluteo']);
/** Horas de recuperación según la zona y si llegaste cerca del fallo (reserva 0-1). */
export const HORAS = { pierna: { fallo: 72, normal: 48 }, resto: { fallo: 48, normal: 24 } };
/** A partir de cuántas series como principal (o de una al fallo) cuenta como «trabajado fuerte». */
export const SERIES_FUERTES = 2;

/**
 * Para cada músculo: si aún se recupera, hasta cuándo y de qué ejercicio.
 * @param {{ejercicioId:string, ts:number, rir?:number}[]} series series hechas
 * @param {number} ahora marca de tiempo (ms)
 * @returns {Object<string, {recuperando:boolean, hasta:number|null, horas:number, ejercicios:string[], series:number, fallo:boolean}>}
 */
export function recuperacion(series, ahora, catalogo = CATALOGO) {
  const res = Object.fromEntries(IDS_MUSCULOS.map((m) => [m, { recuperando: false, hasta: null, horas: 0, ejercicios: [], series: 0, fallo: false }]));
  const ventana = 72 * HORA;
  const recientes = series.filter((s) => s.ts != null && ahora - s.ts >= 0 && ahora - s.ts < ventana);
  for (const m of IDS_MUSCULOS) {
    const suyas = recientes.filter((s) => (ejercicio(s.ejercicioId, catalogo)?.musculos?.[m] ?? 0) >= 1);
    if (!suyas.length) continue;
    const fallo = suyas.some((s) => (s.rir ?? 2) <= 1);
    if (suyas.length < SERIES_FUERTES && !fallo) continue;
    const h = HORAS[PIERNA.has(m) ? 'pierna' : 'resto'][fallo ? 'fallo' : 'normal'];
    const ultima = Math.max(...suyas.map((s) => s.ts));
    const hasta = ultima + h * HORA;
    if (hasta > ahora) res[m] = { recuperando: true, hasta, horas: Math.ceil((hasta - ahora) / HORA), ejercicios: [...new Set(suyas.map((s) => s.ejercicioId))], series: suyas.length, fallo };
  }
  return res;
}

/** Los músculos principales (factor 1) de un ejercicio que aún se recuperan. */
export function principalesCansados(ejId, rec, catalogo = CATALOGO) {
  const ej = ejercicio(ejId, catalogo);
  return Object.entries(ej?.musculos ?? {}).filter(([m, f]) => f >= 1 && rec[m]?.recuperando).map(([m]) => m);
}
