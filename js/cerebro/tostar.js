// R30 · Tostar (La brega, G115; libro de reglas 1.5). Antes de moler, el grano se tostaba en el tostador (El Museo
// Canario; CACT Lanzarote). Aquí, la movilidad del día: opcional, una vez por molienda, 5-8 minutos de movimientos
// DINÁMICOS para las articulaciones de lo que toca, con el cuerpo o en la polea / con banda. Estiramientos quietos, menos
// de 60 s por músculo (Behm y cols. 2016; metaanálisis en red 2023: 7-10 min de dinámico, lo mejor para el salto;
// revisión del tren superior, BJSM). Certeza 🟡: efectos pequeños y poco estudiados en musculación.
import { CATALOGO } from './ejercicios.js';

// zona: de qué parte del cuerpo; cuerpo: sin nada; polea: con polea o banda (si no hay versión, la del cuerpo).
export const MOVIMIENTOS = [
  { id: 'circulos-brazos', zona: 'hombros', nombre: 'Círculos de brazos', dosis: '10 y 10', seg: 40 },
  { id: 'rotacion-externa', zona: 'hombros', nombre: 'Rotación de hombro hacia fuera', dosis: '12 y 12', seg: 50, soloPolea: true },
  { id: 'brazos-pared', zona: 'escapulas', nombre: 'Brazos que suben por la pared', dosis: '10', seg: 45, polea: { nombre: 'Aperturas con banda', dosis: '15' } },
  { id: 'flexiones-escapulas', zona: 'empuje', nombre: 'Flexiones solo de escápulas', dosis: '10', seg: 40, polea: { nombre: 'Press en polea muy ligero', dosis: '15' } },
  { id: 'colgarse', zona: 'tiron', nombre: 'Colgarte de la barra', dosis: '20 s', seg: 40, polea: { nombre: 'Jalón muy ligero, lento', dosis: '15' } },
  { id: 'giros-espalda', zona: 'columna', nombre: 'Giros de espalda a cuatro patas', dosis: '8 y 8', seg: 50 },
  { id: 'gato-camello', zona: 'columna', nombre: 'Lomo arriba, lomo abajo', dosis: '8', seg: 35 },
  { id: 'munecas-codos', zona: 'brazos', nombre: 'Círculos de muñecas y codos', dosis: '30 s', seg: 35 },
  { id: 'circulos-cadera', zona: 'caderas', nombre: 'Círculos de cuadriles, de pie', dosis: '8 y 8', seg: 45 },
  { id: 'balanceo-pierna', zona: 'caderas', nombre: 'Balanceos de pierna', dosis: '10 y 10', seg: 50 },
  { id: 'sentadilla-lenta', zona: 'rodillas', nombre: 'Sentadilla sin peso, lenta', dosis: '10', seg: 45, polea: { nombre: 'Sentadilla con la polea delante, ligera', dosis: '10' } },
  { id: 'rodilla-pared', zona: 'tobillos', nombre: 'Rodilla a la pared', dosis: '10 y 10', seg: 50 },
  { id: 'bisagra-palo', zona: 'isquios', nombre: 'Bisagra con un palo en la espalda', dosis: '10', seg: 40, polea: { nombre: 'Peso muerto rumano con la barra vacía', dosis: '10' } },
  { id: 'puente-gluteo', zona: 'gluteo', nombre: 'Puente de glúteo', dosis: '12', seg: 40 },
];

// Qué zonas pide cada músculo del día (la articulación que más trabaja).
const ZONAS = {
  pecho: ['hombros', 'escapulas', 'empuje', 'columna', 'brazos'],
  'hombro-anterior': ['hombros', 'escapulas', 'empuje', 'brazos'],
  'hombro-lateral': ['hombros', 'escapulas'],
  'hombro-posterior': ['escapulas', 'hombros', 'tiron'],
  triceps: ['brazos', 'hombros'],
  dorsal: ['tiron', 'escapulas', 'columna', 'hombros'],
  biceps: ['brazos', 'tiron'],
  cuadriceps: ['rodillas', 'caderas', 'tobillos'],
  gluteo: ['caderas', 'gluteo', 'rodillas'],
  isquios: ['isquios', 'caderas', 'columna'],
  gemelos: ['tobillos'],
  abdomen: ['columna'],
};
export const TOSTAR_MOVIMIENTOS = 6;

/**
 * R30 · Los movimientos de Tostar para los ejercicios del día. Cada músculo suma a sus zonas según cuánto trabaja hoy
 * (R9: 1 o 0,5 por serie); salen las 6 zonas que más pesan, un movimiento por zona (dos si sobra sitio).
 * @param {{ej:string, series:number}[]} ejercicios
 * @param {'cuerpo'|'polea'} modo
 */
export function tostar(ejercicios, modo = 'cuerpo', catalogo = CATALOGO) {
  const peso = {};
  for (const { ej, series = 3 } of ejercicios) {
    for (const [m, f] of Object.entries(catalogo[ej]?.musculos ?? {})) {
      (ZONAS[m] ?? []).forEach((z, k) => { peso[z] = (peso[z] ?? 0) + series * f * (1 - k * 0.15); });
    }
  }
  const zonas = Object.entries(peso).sort((a, b) => b[1] - a[1]).map(([z]) => z);
  const lista = [];
  const usado = new Set();
  for (const vuelta of [0, 1]) {
    for (const z of zonas) {
      if (lista.length >= TOSTAR_MOVIMIENTOS) break;
      const m = MOVIMIENTOS.filter((x) => x.zona === z && !usado.has(x.id) && (modo === 'polea' || !x.soloPolea))[0];
      if (!m || (vuelta === 0 && lista.some((x) => x.zona === z))) continue;
      usado.add(m.id);
      const v = modo === 'polea' && m.polea ? { ...m, nombre: m.polea.nombre, dosis: m.polea.dosis } : m;
      lista.push({ id: m.id, zona: m.zona, nombre: v.nombre, dosis: v.dosis, seg: m.seg });
    }
  }
  // Las zonas, en un orden que fluye: de arriba abajo y de suelto a específico.
  const orden = ['columna', 'hombros', 'escapulas', 'brazos', 'empuje', 'tiron', 'caderas', 'gluteo', 'isquios', 'rodillas', 'tobillos'];
  return lista.sort((a, b) => orden.indexOf(a.zona) - orden.indexOf(b.zona));
}

/** Los minutos de Tostar (con 10 s entre movimientos), redondeados. */
export const minutosTostar = (lista) => Math.max(1, Math.round(lista.reduce((s, m) => s + m.seg + 10, 0) / 60));

/** Las zonas del día dichas en corto, para la cabecera («Hombros, codos y muñecas»). */
const NOMBRE_ZONA = { hombros: 'hombros', escapulas: 'escápulas', empuje: 'pecho', tiron: 'espalda', columna: 'espalda', brazos: 'codos y muñecas',
  caderas: 'cuadriles', gluteo: 'glúteo', isquios: 'isquios', rodillas: 'rodillas', tobillos: 'tobillos' };
export function zonasDichas(lista) {
  const v = [...new Set(lista.map((m) => NOMBRE_ZONA[m.zona]))].slice(0, 3);
  if (!v.length) return '';
  const t = v.length === 1 ? v[0] : v.at(-1).includes(' y ') ? `${v.slice(0, -1).join(', ')}, ${v.at(-1)}` : `${v.slice(0, -1).join(', ')} y ${v.at(-1)}`;
  return t.charAt(0).toUpperCase() + t.slice(1);
}
