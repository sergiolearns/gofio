// «Sobre la marcha» (libro v1.4, G106): Gofio propone y tú decides. R26 · Calentamiento, R27 · Al fallo y añadir
// ejercicios o series a la sesión (con R10 y R25). Lo que cambias se apunta tal cual: la fuerza estimada (R11) sale de
// cualquier peso, reps y reserva, así que la progresión (R12) sigue funcionando.
import { EJERCICIOS, CATALOGO, ejercicio } from './ejercicios.js';
import { redondearAEscalon } from './progresion.js';
import { volumen, TOPE_SESION } from './volumen.js';

/**
 * R26 · Calentamiento. Dos series ligeras antes de la primera de trabajo: 50 % × 8 y 75 % × 4, redondeadas hacia abajo
 * al escalón (🟠 práctica habitual; la evidencia no es concluyente: Ribeiro y cols. 2021). No cuentan para el volumen
 * (R9), la fuerza (R11) ni la progresión (R12): la app las guarda aparte, en la sesión.
 */
export const CALENTAMIENTO = [{ f: 0.5, reps: 8 }, { f: 0.75, reps: 4 }];
export function calentamiento(peso, escalon, { lastre = false } = {}) {
  // Con lastre, si el lastre es poco (o ninguno), la ligera es sin lastre: con tu peso, pocas y fáciles (G109).
  if (lastre && !(peso >= 2 * (Array.isArray(escalon) ? Math.min(...escalon) : escalon || 2.5))) {
    return peso >= 0 ? [{ peso: 0, reps: peso > 0 ? 5 : 3 }] : [];
  }
  if (!(peso > 0)) return [];
  const out = [];
  for (const { f, reps } of CALENTAMIENTO) {
    const p = redondearAEscalon(peso * f, escalon, 'abajo');
    if (p <= 0 || p >= peso) continue;
    if (out.length && out[out.length - 1].peso === p) continue;
    out.push({ peso: p, reps });
  }
  return out;
}

/**
 * R27 · Al fallo. No hace falta para crecer ni resta (Grgic y cols. 2022; Refalo y cols. 2023): Gofio no lo propone por
 * su cuenta; lo eliges tú, serie a serie. Donde mejor va: en aislamiento o en máquina, polea o Smith (🟠: en libres
 * pesados el fallo es más arriesgado sin alguien que ayude).
 */
export const RIR_AL_FALLO = { min: 0, max: 0 };
export function falloBienVisto(ejId, catalogo = CATALOGO) {
  const e = ejercicio(ejId, catalogo);
  return e.tipo === 'aislamiento' || ['maquina', 'polea', 'smith'].includes(e.equipo);
}

/** R25 · Rango por defecto de un ejercicio que se añade a la sesión: 8-10 los multiarticulares, 10-15 el aislamiento
 *  (8-12 si va con lastre). Tres series (⚪, dentro de las 2-5 de R25). */
export function slotNuevo(ejId, catalogo = CATALOGO) {
  const e = ejercicio(ejId, catalogo);
  const [repMin, repMax] = e.tipo === 'multi' ? [8, 10] : e.lastre ? [8, 12] : [10, 15];
  return { ej: ejId, series: 3, repMin, repMax, anadido: true };
}

/** Los grupos de «A la tolva»: por músculo principal. */
export const GRUPOS = [
  ['pecho', 'Pecho', ['pecho']],
  ['espalda', 'Espalda', ['dorsal']],
  ['hombro', 'Hombro', ['hombro-anterior', 'hombro-lateral', 'hombro-posterior']],
  ['brazos', 'Brazos', ['biceps', 'triceps']],
  ['pierna', 'Pierna', ['cuadriceps', 'isquios', 'gluteo', 'gemelos']],
  ['abdomen', 'Abdomen', ['abdomen']],
];
export function ejerciciosDeGrupo(grupo, excluir = [], lista = EJERCICIOS) {
  const g = GRUPOS.find(([id]) => id === grupo);
  if (!g) return [];
  return lista.filter((e) => !excluir.includes(e.id) && Object.entries(e.musculos).some(([m, f]) => f === 1 && g[2].includes(m)));
}

/**
 * R10 · Si añadir `nuevo` (un slot {ej, series}) a la sesión hace que algún músculo principal suyo pase del tope útil
 * (~11 fraccionales), devuelve cuánto llevaba y cuánto llevaría. Gofio lo dice, no lo impide.
 */
export function avisoTope(plan, nuevo, catalogo = CATALOGO) {
  const antes = volumen(plan, catalogo), despues = volumen([...plan, nuevo], catalogo);
  const principales = Object.entries(ejercicio(nuevo.ej, catalogo).musculos).filter(([, f]) => f === 1).map(([m]) => m);
  return principales.filter((m) => despues[m] > TOPE_SESION).map((m) => ({ musculo: m, antes: antes[m], despues: despues[m] }));
}
