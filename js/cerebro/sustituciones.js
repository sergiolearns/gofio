// R22 · Sustituciones por patrón de movimiento (libro v1.1).
import { CATALOGO, EJERCICIOS, ejercicio } from './ejercicios.js';

/** Parecido entre dos ejercicios según su tabla de músculos (coseno, de 0 a 1). */
function parecido(a, b) {
  const ms = new Set([...Object.keys(a.musculos), ...Object.keys(b.musculos)]);
  let p = 0, na = 0, nb = 0;
  for (const m of ms) { const x = a.musculos[m] ?? 0, y = b.musculos[m] ?? 0; p += x * y; na += x * x; nb += y * y; }
  return na && nb ? p / Math.sqrt(na * nb) : 0;
}

/**
 * R22 · Con qué se puede cambiar un ejercicio si la máquina está ocupada: mismo patrón de movimiento,
 * ordenados por parecido de músculos (el más parecido primero). Las series y repeticiones de la plantilla se mantienen;
 * el peso sale del historial del ejercicio nuevo (o se pide en la primera serie). Detrás van los que comparten
 * músculo principal con otro patrón, marcados con mismoPatron: false.
 */
export function sustitutos(id, lista = EJERCICIOS, catalogo = CATALOGO) {
  const e = ejercicio(id, catalogo);
  const orden = (a, b) => b.parecido - a.parecido || a.nombre.localeCompare(b.nombre, 'es');
  const conParecido = (x) => ({ ...x, parecido: Math.round(parecido(e, x) * 100) / 100 });
  const mismo = lista.filter((x) => x.id !== id && x.patron === e.patron).map((x) => ({ ...conParecido(x), mismoPatron: true })).sort(orden);
  // Después, otros ejercicios con el mismo músculo principal (por si el gimnasio no tiene nada del mismo patrón libre).
  const principales = Object.entries(e.musculos).filter(([, f]) => f === 1).map(([m]) => m);
  const otros = lista.filter((x) => x.id !== id && x.patron !== e.patron && principales.some((m) => x.musculos[m] === 1))
    .map((x) => ({ ...conParecido(x), mismoPatron: false })).sort(orden);
  return [...mismo, ...otros];
}
