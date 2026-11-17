// R30 · Tostar (La brega, G115; libro de reglas 1.5). Antes de moler, el grano se tostaba en el tostador (El Museo
// Canario; CACT Lanzarote). Aquí, la movilidad del día: opcional, una vez por molienda, 5-8 minutos de movimientos
// DINÁMICOS para las articulaciones de lo que toca, con el cuerpo o en la polea / con banda. Estiramientos quietos, menos
// de 60 s por músculo (Behm y cols. 2016; metaanálisis en red 2023: 7-10 min de dinámico, lo mejor para el salto;
// revisión del tren superior, BJSM). Certeza 🟡: efectos pequeños y poco estudiados en musculación.
import { CATALOGO } from './ejercicios.js';

// zona: de qué parte del cuerpo; polea: la versión con banda o polea (si no hay, la del cuerpo, que también vale).
// Nombres de gimnasio que se reconocen al vuelo (G118: «giros de espalda a cuatro patas» no lo conocía nadie y un press
// en polea «más que calentar es un ejercicio»): movilidad y activación, ligeras, nunca una serie de entrenamiento.
// «como»: cómo se hace, en una línea, para la libreta.
export const MOVIMIENTOS = [
  { id: 'circulos-brazos', zona: 'hombros', nombre: 'Círculos de brazos', dosis: '10 y 10', seg: 40, como: 'Brazos estirados, círculos grandes hacia delante y luego hacia atrás.',
    polea: { nombre: 'Dislocaciones con banda', dosis: '10', como: 'Banda agarrada ancha, brazos estirados: de delante a detrás por encima de la cabeza y vuelta.' } },
  { id: 'rotacion-externa', zona: 'hombros', nombre: 'Rotación externa con banda', dosis: '12 y 12', seg: 50, soloPolea: true, como: 'Codo pegado al costado a 90°, abre el antebrazo hacia fuera, despacio. Con banda o la polea al mínimo.' },
  { id: 'angeles-pared', zona: 'escapulas', nombre: 'Ángeles en la pared', dosis: '10', seg: 45, como: 'Espalda y brazos pegados a la pared, sube y baja los brazos sin despegarlos.',
    polea: { nombre: 'Aperturas con banda', dosis: '15', como: 'Banda delante a la altura del pecho, brazos estirados: ábrela juntando las escápulas.' } },
  { id: 'flexiones-escapulares', zona: 'empuje', nombre: 'Flexiones escapulares', dosis: '10', seg: 40, como: 'En posición de flexión, brazos estirados: junta y separa las escápulas sin doblar los codos.' },
  { id: 'colgarse', zona: 'tiron', nombre: 'Colgarte de la barra', dosis: '20 s', seg: 40, como: 'Agarra la barra de dominadas y cuélgate relajado, respirando.' },
  { id: 'giros-tronco', zona: 'columna', nombre: 'Giros de tronco', dosis: '10 y 10', seg: 40, como: 'De pie, brazos cruzados al pecho: gira el tronco a un lado y al otro sin mover la cadera.' },
  { id: 'gato-camello', zona: 'columna', nombre: 'Gato-camello', dosis: '8', seg: 35, como: 'A cuatro patas: redondea la espalda hacia arriba y luego húndela, despacio.' },
  { id: 'munecas-codos', zona: 'brazos', nombre: 'Círculos de muñecas y codos', dosis: '30 s', seg: 35, como: 'Manos juntas, círculos de muñecas; luego círculos de antebrazo con los codos.' },
  { id: 'circulos-cadera', zona: 'caderas', nombre: 'Círculos de cadera', dosis: '8 y 8', seg: 45, como: 'De pie, manos en la cintura: círculos amplios de cadera hacia un lado y al otro.' },
  { id: 'balanceo-pierna', zona: 'caderas', nombre: 'Balanceos de pierna', dosis: '10 y 10', seg: 50, como: 'Agarrado a algo, balancea una pierna adelante y atrás, sin forzar.' },
  { id: 'sentadilla-sin-peso', zona: 'rodillas', nombre: 'Sentadilla sin peso', dosis: '10', seg: 45, como: 'Lenta y hasta donde llegues cómodo, con los talones en el suelo.' },
  { id: 'movilidad-tobillo', zona: 'tobillos', nombre: 'Movilidad de tobillo', dosis: '10 y 10', seg: 50, como: 'Pie a un palmo de la pared: lleva la rodilla a tocarla sin levantar el talón.' },
  { id: 'buenos-dias', zona: 'isquios', nombre: 'Buenos días sin peso', dosis: '10', seg: 40, como: 'Manos en la nuca, rodillas un poco dobladas: echa la cadera atrás con la espalda recta.' },
  { id: 'puente-gluteo', zona: 'gluteo', nombre: 'Puente de glúteo', dosis: '12', seg: 40, como: 'Boca arriba, pies apoyados: sube la cadera apretando el glúteo y baja despacio.',
    polea: { nombre: 'Pasos laterales con mini banda', dosis: '10 y 10', como: 'Mini banda sobre las rodillas, medio agachado: pasos de lado sin juntar los pies.' } },
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
      const v = modo === 'polea' && m.polea ? { ...m, ...m.polea } : m;
      lista.push({ id: m.id, zona: m.zona, nombre: v.nombre, dosis: v.dosis, seg: m.seg, como: v.como });
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
  caderas: 'caderas', gluteo: 'glúteo', isquios: 'isquios', rodillas: 'rodillas', tobillos: 'tobillos' };
export function zonasDichas(lista) {
  const v = [...new Set(lista.map((m) => NOMBRE_ZONA[m.zona]))].slice(0, 3);
  if (!v.length) return '';
  const t = v.length === 1 ? v[0] : v.at(-1).includes(' y ') ? `${v.slice(0, -1).join(', ')}, ${v.at(-1)}` : `${v.slice(0, -1).join(', ')} y ${v.at(-1)}`;
  return t.charAt(0).toUpperCase() + t.slice(1);
}
