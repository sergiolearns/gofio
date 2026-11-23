// La cocina de Gofio (v0.3): el peso, lo que comes, tus alimentos y tus ollas, sobre el cerebro (R1-R8, R17, R31).
// Todo se guarda en el teléfono (IndexedDB). Lo único que sale es el código de barras hacia Open Food Facts (G127).
import * as G from '../cerebro/index.js';
import * as D from '../datos.js';
import { estado, ajuste, hoy, ponerAjuste } from '../logica.js';

const r0 = Math.round;

// ── El peso ──────────────────────────────────────────────
export const pesajes = () => G.pesajesPorDia(estado.pesos);
export const pesoDe = (fecha) => estado.pesos.filter((p) => p.fecha === fecha).at(-1) ?? null;
export async function apuntarPeso(kg, fecha = hoy()) {
  const viejo = pesoDe(fecha);
  const p = { id: viejo?.id ?? D.id(), fecha, kg: Math.round(kg * 10) / 10, ts: Date.now() };
  estado.pesos = estado.pesos.filter((x) => x.fecha !== fecha).concat(p);
  for (const x of estado.pesos.filter((x) => x.fecha === fecha && x.id !== p.id)) await D.borrar('pesos', x.id);
  await D.guardar('pesos', p);
  return p;
}
export async function borrarPeso(fecha) {
  for (const x of estado.pesos.filter((x) => x.fecha === fecha)) await D.borrar('pesos', x.id);
  estado.pesos = estado.pesos.filter((x) => x.fecha !== fecha);
}
/** Tu peso de verdad (R17): la tendencia de hoy, o el perfil si aún no te has pesado. */
export function pesoAhora() {
  const t = G.tendencia(pesajes());
  return t.at(-1)?.tendencia ?? ajuste('perfil').peso ?? null;
}
export const ritmoAhora = (fecha = hoy()) => G.ritmo(pesajes(), fecha);

// ── Lo que comes ─────────────────────────────────────────
export const comidasDe = (fecha) => estado.comidas.filter((c) => c.fecha === fecha);
export const totalesDe = (fecha) => G.redondear(G.sumar(comidasDe(fecha)));
export const aMedias = (fecha) => !!estado.dias[fecha]?.aMedias;
export async function marcarAMedias(fecha, si) {
  const d = { fecha, aMedias: !!si };
  estado.dias[fecha] = d;
  await D.guardar('dias', d);
}
/** Los días con algo apuntado, para R2. */
export function diasComida() {
  const m = new Map();
  for (const c of estado.comidas) m.set(c.fecha, (m.get(c.fecha) ?? 0) + (c.kcal ?? 0));
  return [...m].map(([fecha, kcal]) => ({ fecha, kcal, aMedias: aMedias(fecha) })).sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
}
/** Apunta algo: guarda los totales de ese momento (si luego cambias el alimento, lo de ayer no cambia). */
export async function apuntar({ fecha = hoy(), momento, ref, nombre, dib, gramos, medida, por100 }) {
  const a = G.aporteDe(por100, gramos);
  const c = { id: D.id(), fecha, momento, ts: Date.now(), ref, nombre, dib, gramos: r0(gramos), medida, por100, kcal: a.kcal, prot: a.prot, hc: a.hc, grasa: a.grasa };
  estado.comidas.push(c); await D.guardar('comidas', c);
  usar(ref);
  return c;
}
export async function cambiarComida(c, { gramos, momento, medida }) {
  if (gramos != null) { Object.assign(c, G.aporteDe(c.por100, gramos)); c.gramos = r0(gramos); }
  if (momento) c.momento = momento;
  if (medida !== undefined) c.medida = medida;
  await D.guardar('comidas', c);
}
export async function borrarComida(c) {
  estado.comidas = estado.comidas.filter((x) => x.id !== c.id);
  await D.borrar('comidas', c.id);
}
// Lo que más usas sale primero (R31, «Cómo se adapta»).
function usar(ref) {
  if (!ref) return;
  const u = { ...(ajuste('usos') ?? {}) }; u[ref] = (u[ref] ?? 0) + 1;
  ponerAjuste('usos', u);
}
export const usos = () => ajuste('usos') ?? {};

// ── Lo que toca: gasto, calorías y proteína ──────────────
export function perfilCompleto() {
  const p = ajuste('perfil');
  return { ...p, peso: pesoAhora() ?? p.peso, sexo: p.sexo ?? 'hombre' };
}
export const gasto = (fecha = hoy()) => G.gastoReal(diasComida(), pesajes(), fecha);
/**
 * Lo del día. Las calorías solo con el gasto real (R2): antes, «come como siempre y apúntalo» (sin números
 * inventados, G47). La proteína (R7) sí desde el primer día, con tu peso.
 */
export function objetivos(fecha = hoy()) {
  const perfil = perfilCompleto();
  const objetivo = ajuste('objetivo');
  const g = gasto(fecha);
  const prot = G.proteina({ peso: perfil.peso, objetivo });
  let kcal = null;
  if (g.listo) {
    const reposo = G.gastoEnReposo(perfil);
    kcal = G.caloriasObjetivo({ gasto: g.kcal, objetivo, peso: perfil.peso, reposo, ritmoPct: ajuste('ritmo') });
    const sube = objetivo === 'perder-grasa' ? G.vigilarRitmo(pesajes(), fecha) : 0;
    if (sube > 0) kcal = { ...kcal, min: kcal.min + sube, max: kcal.max + sube, centro: kcal.centro + sube, subido: sube };
  }
  return { gasto: g, kcal, prot, inicial: G.gastoInicial(perfil), peso: perfil.peso };
}
export const sinNumeros = () => !!ajuste('sinNumeros');

// ── La base de alimentos (BEDCA, TCAC, USDA) ─────────────
let base = null, cargando = null;
const sinTildes = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const FUENTE = { b: 'BEDCA', t: 'TCAC', u: 'USDA', off: 'Open Food Facts', tuyo: 'Tuyo', etiqueta: 'Tu etiqueta', olla: 'Tu olla' };
export function cargarBase() {
  if (base) return Promise.resolve(base);
  if (!cargando) cargando = fetch('datos/alimentos.json').then((r) => r.json()).then((j) => {
    base = {
      fuentes: j.fuentes, tamanos: j.tamanos,
      alimentos: j.alimentos.map(([id, nombre, kcal, prot, hc, grasa, f, dib, tam]) => ({ id, nombre, fuente: f, dib, tam, por100: { kcal, prot, hc, grasa }, clave: sinTildes(nombre) })),
    };
    base.porId = new Map(base.alimentos.map((a) => [a.id, a]));
    return base;
  }).catch((e) => { cargando = null; throw e; });
  return cargando;
}
export const baseCargada = () => base;
// Cómo se dice en casa (Canarias y Colombia) y cómo lo dice BEDCA.
const SINONIMOS = { papa: 'patata', papas: 'patata', guineo: 'platano', banano: 'platano', banana: 'platano', frijol: 'frijol judia', frijoles: 'frijol judia', habichuela: 'judia', millo: 'maiz', jugo: 'zumo', arveja: 'guisante', ahuyama: 'calabaza', durazno: 'melocoton', zapallo: 'calabaza', choclo: 'maiz', batata: 'boniato batata' };
/** Lo tuyo con la misma forma que lo de la base. */
export function misCosas() {
  const mios = estado.alimentos.map((a) => ({ id: a.id, nombre: a.nombre, fuente: a.fuente ?? 'tuyo', dib: a.dib ?? 'tuyo', por100: a.por100, marca: a.marca, clave: sinTildes(a.nombre + ' ' + (a.marca ?? '')), mio: true }));
  const ollas = estado.ollas.map((o) => ({ id: o.id, nombre: o.nombre, fuente: 'olla', dib: o.dib ?? 'olla', por100: porCienDeOlla(o), olla: o, clave: sinTildes(o.nombre), mio: true }));
  return [...ollas, ...mios];
}
export function alimentoPorRef(ref) {
  return misCosas().find((x) => x.id === ref) ?? base?.porId.get(ref) ?? null;
}
/** Busca en tus ollas, tus alimentos y la base. Cada palabra tiene que estar; gana lo que más usas y lo que empieza igual. */
export function buscar(texto, max = 40) {
  const q = sinTildes(texto.trim());
  if (!q) return [];
  const palabras = q.split(/\s+/).map((p) => [p, ...(SINONIMOS[p]?.split(' ') ?? [])]);
  const enteras = palabras.map((alts) => alts.map((p) => new RegExp(`(^|[^a-z])${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`)));
  const todos = [...misCosas(), ...(base?.alimentos ?? [])];
  const u = usos();
  const res = [];
  for (const a of todos) {
    if (!palabras.every((alts) => alts.some((p) => a.clave.includes(p)))) continue;
    const empieza = palabras[0].some((p) => a.clave.startsWith(p));
    const entera = enteras.every((alts) => alts.some((r) => r.test(a.clave)));
    const crudo = /crud|fresc/.test(a.clave) ? 1 : 0;
    res.push({ a, puntos: (a.mio ? 50 : 0) + (u[a.id] ?? 0) * 10 + (empieza ? 20 : 0) + (entera ? 15 : 0) + crudo * 2 - a.clave.length / 20 });
  }
  return res.sort((x, y) => y.puntos - x.puntos).slice(0, max).map((x) => x.a);
}
/** Lo último que apuntaste, sin repetir. */
export function loUltimo(n = 6) {
  const vistos = new Set(), res = [];
  for (const c of [...estado.comidas].reverse()) {
    if (!c.ref || vistos.has(c.ref)) continue;
    vistos.add(c.ref);
    const a = alimentoPorRef(c.ref) ?? { id: c.ref, nombre: c.nombre, dib: c.dib, por100: c.por100, fuente: '' };
    res.push({ a, gramos: c.gramos, medida: c.medida });
    if (res.length >= n) break;
  }
  return res;
}
export const tamanosDe = (a) => (a?.tam && base?.tamanos[a.tam]) || null;

// ── Tus alimentos y tus ollas ────────────────────────────
export async function guardarAlimento(a) {
  const x = { id: a.id ?? D.id(), ts: a.ts ?? Date.now(), dib: 'tuyo', fuente: 'tuyo', ...a };
  estado.alimentos = estado.alimentos.filter((y) => y.id !== x.id).concat(x);
  await D.guardar('alimentos', x);
  return x;
}
export async function borrarAlimento(id) { estado.alimentos = estado.alimentos.filter((y) => y.id !== id); await D.borrar('alimentos', id); }
export function porCienDeOlla(o) {
  const r = G.olla({ ingredientes: o.ingredientes, pesoCocinado: o.pesoCocinado, raciones: o.raciones });
  if (r.por100) return r.por100;
  // Sin pesar: una ración pesa lo crudo ÷ raciones (aprox.); se apunta por raciones, no por gramos.
  if (r.porRacion && r.crudo > 0) return Object.fromEntries(Object.entries(r.total).map(([k, v]) => [k, v * 100 / r.crudo]));
  return { kcal: 0, prot: 0, hc: 0, grasa: 0 };
}
/** Gramos de una ración de una olla sin pesar (para apuntar «1 ración»). */
export const gramosRacion = (o) => (o.raciones > 0 ? o.ingredientes.reduce((s, i) => s + (i.g ?? 0), 0) / o.raciones : null);
export async function guardarOlla(o) {
  const x = { id: o.id ?? D.id(), ts: o.ts ?? Date.now(), dib: 'olla', medidas: [], ...o };
  estado.ollas = estado.ollas.filter((y) => y.id !== x.id).concat(x);
  await D.guardar('ollas', x);
  return x;
}
export async function borrarOlla(id) { estado.ollas = estado.ollas.filter((y) => y.id !== id); await D.borrar('ollas', id); }

// ── Open Food Facts (G127: solo viaja el código) ─────────
export async function buscarCodigo(codigo) {
  const ya = estado.alimentos.find((a) => a.codigo === codigo);
  if (ya) return { ...ya, yaEra: true };
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(codigo)}.json?fields=product_name,product_name_es,brands,nutriments,quantity`;
  const r = await fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer' });
  if (!r.ok) return null;
  const j = await r.json();
  const p = j.product; const n = p?.nutriments;
  if (!p || !n) return null;
  let kcal = n['energy-kcal_100g'];
  if (kcal == null && n['energy-kj_100g'] != null) kcal = G.kJaKcal(n['energy-kj_100g']);
  if (kcal == null && n.energy_100g != null) kcal = G.kJaKcal(n.energy_100g);
  if (kcal == null) return null;
  return {
    nombre: (p.product_name_es || p.product_name || 'Producto').trim(), marca: (p.brands ?? '').split(',')[0].trim() || null, codigo,
    fuente: 'off', dib: 'tuyo',
    por100: { kcal: r0(kcal), prot: n.proteins_100g ?? 0, hc: n.carbohydrates_100g ?? 0, grasa: n.fat_100g ?? 0 },
  };
}

// ── La semana ────────────────────────────────────────────
export function semanaComida(lunes) {
  const dias = Array.from({ length: 7 }, (_, k) => G.sumarDias(lunes, k));
  const o = objetivos();
  const porDia = dias.map((f) => ({ fecha: f, ...totalesDe(f), apuntado: comidasDe(f).length > 0, aMedias: aMedias(f) }));
  const ap = porDia.filter((d) => d.apuntado);
  const pes = pesajes();
  const t = G.tendencia(pes);
  const tendEn = (f) => t.filter((x) => x.fecha <= f).at(-1)?.tendencia ?? null;
  return {
    dias: porDia, apuntados: ap.length,
    protMedia: ap.length ? r0(ap.reduce((s, d) => s + d.prot, 0) / ap.length) : null,
    kcalMedia: ap.length ? r0(ap.reduce((s, d) => s + d.kcal, 0) / ap.length) : null,
    protObjetivo: o.prot?.objetivo ?? null, kcal: o.kcal,
    pesoDesde: tendEn(G.sumarDias(lunes, -1)), pesoHasta: tendEn(dias[6]),
  };
}
