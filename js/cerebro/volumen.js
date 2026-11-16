// R9 · Volumen semanal por músculo (cuenta fraccional) y R10 · Volumen por sesión.
import { IDS_MUSCULOS } from './musculos.js';
import { CATALOGO, ejercicio } from './ejercicios.js';

const vacio = () => Object.fromEntries(IDS_MUSCULOS.map((m) => [m, 0]));
const redondeo = (x) => Math.round(x * 2) / 2; // las cuentas fraccionales van de 0,5 en 0,5

// R9 · Mínimo eficaz y franja objetivo por defecto (series fraccionales por músculo y semana).
export const MINIMO_EFICAZ = 4;
export const FRANJA = { min: 10, max: 20 };
// R10 · Tope útil por músculo y sesión (series fraccionales).
export const TOPE_SESION = 11;

/** R9 · Series fraccionales que da `n` series de un ejercicio: 1 al principal, 0,5 a los que ayudan. */
export function aporte(ejercicioId, n = 1, catalogo = CATALOGO) {
  const v = vacio();
  for (const [m, f] of Object.entries(ejercicio(ejercicioId, catalogo).musculos)) v[m] += f * n;
  return v;
}

/** R9 · Suma la cuenta fraccional de una lista de {ej, series} (un día de plantilla) o de series sueltas {ejercicioId}. */
export function volumen(items, catalogo = CATALOGO) {
  const v = vacio();
  for (const it of items) {
    const id = it.ej ?? it.ejercicioId;
    const n = it.series ?? 1;
    for (const [m, f] of Object.entries(ejercicio(id, catalogo).musculos)) v[m] += f * n;
  }
  for (const m of IDS_MUSCULOS) v[m] = redondeo(v[m]);
  return v;
}

/** R9 · Volumen semanal de la plantilla entera: es el objetivo semanal por músculo que usa R15. */
export function volumenPlantilla(plantilla, catalogo = CATALOGO) {
  return volumen(plantilla.dias.flatMap((d) => d.ejercicios), catalogo);
}

/** R9 · Lectura de un volumen frente al mínimo y la franja (lo que pinta «Mi semana»). */
export function estadoVolumen(v) {
  if (v < MINIMO_EFICAZ) return 'bajo-minimo';
  if (v < FRANJA.min) return 'bajo';
  if (v <= FRANJA.max) return 'en-franja';
  return 'alto';
}

/** R10 · Músculos que una sesión pasa del tope útil (~11 fraccionales). Vacío si todo está bien. */
export function excesosSesion(items, catalogo = CATALOGO) {
  const v = volumen(items, catalogo);
  return Object.entries(v).filter(([, x]) => x > TOPE_SESION).map(([m, x]) => ({ musculo: m, series: x }));
}
