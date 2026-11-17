// Los ánimos según lo que mueves (La brega, G115-G116; concepto, sección 5). Cada frase lleva su grupo y su momento:
// en pierna nunca sale «Suelta los brazos». Una interjección como mucho y ninguna frase dos veces seguidas (El alma).
// Palabras canarias con fuente: canillas = piernas (léxico de Pancho Guerra, ULPGC); cuadril = cadera; encaderar = meter
// la cadera en la lucha canaria; «¡fuerte…!» ponderativo (DHECan); pulseo = la piedra sobre la cabeza (Turismo de Gran
// Canaria). Todas validadas por Sergio (G116).
import { CATALOGO } from './ejercicios.js';

const PIERNA = ['sentadilla', 'bisagra', 'flexion-rodilla', 'extension-rodilla', 'gemelo'];
const TIRON = ['tiron-vertical', 'tiron-horizontal', 'pullover', 'hombro-posterior'];
const BRAZO = ['curl', 'extension-triceps'];
const CORE = ['flexion-tronco'];

/** El grupo de un ejercicio: pierna, empuje, tirón, brazo o core. */
export function grupoDe(ejId, catalogo = CATALOGO) {
  const p = catalogo[ejId]?.patron ?? '';
  if (PIERNA.includes(p)) return 'pierna';
  if (TIRON.includes(p)) return 'tiron';
  if (BRAZO.includes(p)) return 'brazo';
  if (CORE.includes(p)) return 'core';
  return 'empuje';
}

// m: 'moliendo' (durante la serie) o 'soltar' (primer tramo del descanso). g: grupos; p: solo esos patrones.
export const ANIMOS = [
  { f: 'Planta los pies. Que suba la piedra.', m: 'moliendo', g: ['pierna'], p: ['sentadilla'] },
  { f: 'Canillas firmes.', m: 'moliendo', g: ['pierna'] },
  { f: 'Encadera.', m: 'moliendo', g: ['pierna'], p: ['bisagra'] },
  { f: 'Pecho arriba, empuja la piedra.', m: 'moliendo', g: ['empuje'], p: ['empuje-inclinado', 'empuje-horizontal'] },
  { f: 'Codos firmes.', m: 'moliendo', g: ['empuje'] },
  { f: 'Pulseo: la piedra arriba.', m: 'moliendo', g: ['empuje'], p: ['empuje-vertical'] },
  { f: 'Tira con la espalda, no con los brazos.', m: 'moliendo', g: ['tiron'], p: ['tiron-vertical', 'tiron-horizontal'] },
  { f: 'Pecho al agarre.', m: 'moliendo', g: ['tiron'], p: ['tiron-vertical', 'tiron-horizontal'] },
  { f: '¡Fuerte brazo!', m: 'moliendo', g: ['brazo'] },
  { f: 'Sin balanceo: con jeito.', m: 'moliendo', g: ['brazo'] },
  { f: 'Al terrero.', m: 'moliendo', g: ['pierna', 'empuje', 'tiron', 'brazo', 'core'] },
  { f: 'Despacio se muele fino.', m: 'moliendo', g: ['pierna', 'empuje', 'tiron', 'brazo', 'core'] },
  { f: 'Sacude las canillas.', m: 'soltar', g: ['pierna'] },
  { f: 'Suelta los cuadriles.', m: 'soltar', g: ['pierna'] },
  { f: 'Camina un poco. Agua.', m: 'soltar', g: ['pierna'] },
  { f: 'Suelta los brazos.', m: 'soltar', g: ['empuje', 'brazo'] },
  { f: 'Hombros abajo. Respira.', m: 'soltar', g: ['empuje'] },
  { f: 'Abre y cierra las manos.', m: 'soltar', g: ['tiron'] },
  { f: 'Suelta el agarre.', m: 'soltar', g: ['tiron'] },
  { f: 'Sacude los brazos.', m: 'soltar', g: ['brazo'] },
  { f: 'Respira.', m: 'soltar', g: ['pierna', 'empuje', 'tiron', 'brazo', 'core'] },
  { f: 'Agua y aire.', m: 'soltar', g: ['pierna', 'empuje', 'tiron', 'brazo', 'core'] },
];
export const ANIMO_ULTIMA = ['Lo que queda en la tolva.', 'La última de esta maña.'];

/** Las frases que valen para un ejercicio y un momento (nunca de otro grupo). */
export function animosDe(ejId, momento, catalogo = CATALOGO) {
  const g = grupoDe(ejId, catalogo);
  const p = catalogo[ejId]?.patron;
  return ANIMOS.filter((a) => a.m === momento && a.g.includes(g) && (!a.p || a.p.includes(p))).map((a) => a.f);
}

/** Una frase al azar para ese ejercicio y momento, que no sea `evitar` (la anterior). Con `ultima`, la de la última serie. */
export function animo(ejId, momento, { ultima = false, evitar = '', azar = Math.random, catalogo = CATALOGO } = {}) {
  const lista = ultima && momento === 'moliendo' ? ANIMO_ULTIMA : animosDe(ejId, momento, catalogo);
  const buenas = lista.filter((f) => f !== evitar);
  const de = buenas.length ? buenas : lista;
  return de[Math.floor(azar() * de.length)] ?? 'Respira.';
}
