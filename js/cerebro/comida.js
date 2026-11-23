// Comida y peso (v0.3, libro 1.6): R1-R8, R17 y R31. Funciones puras: no tocan la app.
import { diasEntre, sumarDias } from './fechas.js';

export const KCAL_POR_KG = 6500;          // R2: densidad del cambio de peso (rango 5.500-7.700)
export const ALFA_TENDENCIA = 0.1;        // R17: media exponencial
export const VENTANA_RITMO = 21;          // R17: días de la recta
export const MIN_PESAJES_RITMO = 10;      // R17: pesajes en esos 21 días
export const VENTANA_GASTO = 28;          // R2 (app, v1.6)
export const MIN_DIAS_GASTO = 14;         // R2
export const MIN_APUNTADOS_GASTO = 10;    // R2
export const MIN_PESAJES_GASTO = 10;      // R2
export const MEZCLA_GASTO = 0.7;          // R2: 70 % nuevo, 30 % anterior
export const kJaKcal = (kj) => kj / 4.184; // R31: BEDCA da kJ

const r0 = (x) => Math.round(x);
const r1 = (x) => Math.round(x * 10) / 10;
const r2 = (x) => Math.round(x * 100) / 100;

/** R1 y R8 · Gasto en reposo (Mifflin-St Jeor). */
export function gastoEnReposo({ peso, altura, edad, sexo = 'hombre' } = {}) {
  if (!(peso > 0 && altura > 0 && edad > 0)) return null;
  return 10 * peso + 6.25 * altura - 5 * edad + (sexo === 'mujer' ? -161 : 5);
}

/** R1 · Gasto inicial: un rango, no un número (PAL 1,55-1,85 para quien entrena 3-5 días). */
export function gastoInicial(perfil, pal = [1.55, 1.85]) {
  const rep = gastoEnReposo(perfil);
  if (rep == null) return null;
  const min = r0(rep * pal[0] / 10) * 10, max = r0(rep * pal[1] / 10) * 10;
  return { reposo: r0(rep), min, max, medio: r0((min + max) / 20) * 10, provisional: true };
}

/** R17 · Un pesaje por día (si hay dos, vale el último), en orden. */
export function pesajesPorDia(pesos) {
  const m = new Map();
  for (const p of [...pesos].sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0))) if (p.kg > 0) m.set(p.fecha, p.kg);
  return [...m].map(([fecha, kg]) => ({ fecha, kg })).sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
}

/** R17 · Tendencia: media exponencial (α 0,1) que arranca en el primer pesaje. */
export function tendencia(pesajes) {
  let t = null;
  return pesajes.map(({ fecha, kg }) => { t = t == null ? kg : t + ALFA_TENDENCIA * (kg - t); return { fecha, kg, tendencia: r2(t) }; });
}

/** Recta de mínimos cuadrados de y frente a x, con el error típico de la pendiente. */
export function recta(puntos) {
  const n = puntos.length;
  if (n < 2) return null;
  const mx = puntos.reduce((s, p) => s + p.x, 0) / n, my = puntos.reduce((s, p) => s + p.y, 0) / n;
  let sxx = 0, sxy = 0;
  for (const p of puntos) { sxx += (p.x - mx) ** 2; sxy += (p.x - mx) * (p.y - my); }
  if (sxx === 0) return null;
  const pendiente = sxy / sxx, corte = my - pendiente * mx;
  let sse = 0;
  for (const p of puntos) sse += (p.y - corte - pendiente * p.x) ** 2;
  const ee = n > 2 ? Math.sqrt(sse / (n - 2) / sxx) : Infinity;
  return { pendiente, corte, ee, n };
}
// t de Student al 95 % (dos colas) para n − 2 grados de libertad.
const T95 = [Infinity, 12.71, 4.30, 3.18, 2.78, 2.57, 2.45, 2.36, 2.31, 2.26, 2.23, 2.20, 2.18, 2.16, 2.14, 2.13, 2.12, 2.11, 2.10, 2.09, 2.09, 2.08, 2.07, 2.07, 2.06, 2.06, 2.06];
const t95 = (gl) => T95[gl] ?? 2.05;

/** Pesajes dentro de [hasta − dias + 1, hasta]. */
const enVentana = (pesajes, hasta, dias) => { const desde = sumarDias(hasta, -dias + 1); return pesajes.filter((p) => p.fecha >= desde && p.fecha <= hasta); };

/**
 * R17 · El ritmo: la pendiente de los pesajes de los últimos 21 días en kg por semana, con su margen al 95 %.
 * null si hay menos de 10 pesajes en esa ventana.
 */
export function ritmo(pesajes, hasta, { dias = VENTANA_RITMO, minimo = MIN_PESAJES_RITMO } = {}) {
  const v = enVentana(pesajes, hasta, dias);
  if (v.length < minimo) return { faltan: minimo - v.length, n: v.length };
  const r = recta(v.map((p) => ({ x: diasEntre(v[0].fecha, p.fecha), y: p.kg })));
  if (!r) return { faltan: 1, n: v.length };
  const peso = v.reduce((s, p) => s + p.kg, 0) / v.length;
  const kgSemana = r.pendiente * 7;
  return { kgSemana: r2(kgSemana), margen: r2(t95(r.n - 2) * r.ee * 7), pctSemana: r2(100 * kgSemana / peso), n: v.length, peso: r1(peso), estable: Math.abs(kgSemana) < 0.1 };
}

/** R31 · Lo que aporta un alimento (valores por 100 g) en unos gramos. */
export function aporteDe(por100, gramos) {
  const f = (gramos ?? 0) / 100;
  return { kcal: (por100.kcal ?? 0) * f, prot: (por100.prot ?? 0) * f, hc: (por100.hc ?? 0) * f, grasa: (por100.grasa ?? 0) * f };
}
export function sumar(xs) {
  const t = { kcal: 0, prot: 0, hc: 0, grasa: 0 };
  for (const x of xs) for (const k in t) t[k] += x[k] ?? 0;
  return t;
}
export const redondear = (t) => ({ kcal: r0(t.kcal), prot: r0(t.prot), hc: r0(t.hc), grasa: r0(t.grasa) });

/**
 * R31 · La olla (G8): la suma de los ingredientes en crudo; por 100 g = suma ÷ peso cocinado × 100
 * (el agua que entra o sale cambia el peso, no las calorías). Sin pesarla: por ración = suma ÷ raciones.
 */
export function olla({ ingredientes, pesoCocinado = null, raciones = null }) {
  const total = sumar(ingredientes.map((i) => aporteDe(i.por100, i.g)));
  const crudo = ingredientes.reduce((s, i) => s + (i.g ?? 0), 0);
  const res = { total, crudo };
  if (pesoCocinado > 0) res.por100 = Object.fromEntries(Object.entries(total).map(([k, v]) => [k, v * 100 / pesoCocinado]));
  if (raciones > 0) res.porRacion = Object.fromEntries(Object.entries(total).map(([k, v]) => [k, v / raciones]));
  return res;
}

/** R31 · Sin pesar: los gramos de un tamaño (pequeña, mediana, grande) de la tabla de USDA. */
export const gramosDeTamano = (tamanos, t) => tamanos?.[t] ?? null;

/**
 * R2 (+ la app, v1.6) · Qué días cuentan: los que tienen algo apuntado y no se marcaron «me dejé algo».
 * diasComida: [{ fecha, kcal, aMedias }]
 */
export const diaCuenta = (d) => d.kcal > 0 && !d.aMedias;

/** R2 · El gasto de una ventana, sin mezclar: null si no llega a los mínimos. */
export function gastoCrudo(diasComida, pesajes, hasta, dias = VENTANA_GASTO) {
  const desde = sumarDias(hasta, -dias + 1);
  const comida = diasComida.filter((d) => d.fecha >= desde && d.fecha <= hasta);
  const cuentan = comida.filter(diaCuenta);
  const pes = pesajes.filter((p) => p.fecha >= desde && p.fecha <= hasta);
  const primero = [comida[0]?.fecha, pes[0]?.fecha].filter(Boolean).sort()[0];
  const largo = primero ? diasEntre(primero, hasta) + 1 : 0;
  const estado = { dias: Math.min(largo, dias), apuntados: cuentan.length, pesajes: pes.length };
  if (largo < MIN_DIAS_GASTO || cuentan.length < MIN_APUNTADOS_GASTO || pes.length < MIN_PESAJES_GASTO) return { ...estado, listo: false };
  const r = recta(pes.map((p) => ({ x: diasEntre(pes[0].fecha, p.fecha), y: p.kg })));
  if (!r) return { ...estado, listo: false };
  const comido = cuentan.reduce((s, d) => s + d.kcal, 0) / cuentan.length;
  return { ...estado, listo: true, comido, pendiente: r.pendiente, kcal: comido - r.pendiente * KCAL_POR_KG };
}

/** R2 · El margen del gasto según los días con datos: ±420 (14), ±230 (21), ±150 (28 o más). */
export function margenGasto(dias) {
  if (dias >= 28) return 150;
  if (dias >= 21) return r0(230 - (dias - 21) * (80 / 7));
  return r0(420 - (Math.max(14, dias) - 14) * (190 / 7));
}

/**
 * R2 · El gasto real: se recalcula cada semana (cada 7 días hacia atrás desde `hasta`) y se mezcla con
 * el anterior (70 % nuevo, 30 % anterior). Sale de los datos, sin guardar nada aparte.
 */
export function gastoReal(diasComida, pesajes, hasta) {
  const ahora = gastoCrudo(diasComida, pesajes, hasta);
  if (!ahora.listo) {
    const faltanDias = Math.max(0, MIN_DIAS_GASTO - ahora.dias, MIN_APUNTADOS_GASTO - ahora.apuntados);
    return { listo: false, ...ahora, faltanDias, faltanPesajes: Math.max(0, MIN_PESAJES_GASTO - ahora.pesajes) };
  }
  const cortes = [];
  for (let f = hasta; ; f = sumarDias(f, -7)) { const g = gastoCrudo(diasComida, pesajes, f); if (!g.listo) break; cortes.unshift(g); if (cortes.length > 52) break; }
  let kcal = null;
  for (const g of cortes) kcal = kcal == null ? g.kcal : MEZCLA_GASTO * g.kcal + (1 - MEZCLA_GASTO) * kcal;
  return { listo: true, kcal: r0(kcal / 10) * 10, margen: margenGasto(ahora.dias), dias: ahora.dias, apuntados: ahora.apuntados, pesajes: ahora.pesajes, semanas: cortes.length };
}

/** R4, R5 · Los ritmos que se ofrecen (% del peso por semana). */
export const RITMOS = { 'perder-grasa': { porDefecto: 0.5, min: 0.25, max: 1 }, 'ganar-musculo': { porDefecto: 0.25, min: 0.1, max: 0.5 } };

/**
 * R3-R6 y R8 · Las calorías del día: una franja juzgada por la media de la semana.
 * gasto: kcal/día (R2, o el medio de R1); objetivo: el de la app; peso: kg en tendencia; reposo: R1.
 */
export function caloriasObjetivo({ gasto, objetivo = 'recomposicion', peso, reposo = null, ritmoPct = null }) {
  if (!(gasto > 0)) return null;
  let min, max, centro, ritmoKg = 0;
  if (objetivo === 'perder-grasa' || objetivo === 'ganar-musculo') {
    const r = RITMOS[objetivo];
    const pct = Math.min(r.max, Math.max(r.min, ritmoPct ?? r.porDefecto));
    ritmoKg = (objetivo === 'perder-grasa' ? -1 : 1) * peso * pct / 100;
    centro = gasto + ritmoKg * KCAL_POR_KG / 7;
    min = centro - 50; max = centro + 50;
  } else {
    // R6: mantenimiento o un déficit pequeño. Fuerza (y lo que no sea déficit ni volumen) también va aquí.
    min = gasto - 100; max = gasto; centro = gasto - 50;
  }
  // R8: déficit como mucho del 25 % del gasto y nunca por debajo del gasto en reposo.
  const suelo = Math.max(gasto * 0.75, reposo ?? 0);
  const limitado = min < suelo;
  min = Math.max(min, suelo); centro = Math.max(centro, suelo); max = Math.max(max, suelo);
  const a10 = (x) => r0(x / 10) * 10;
  return { min: a10(min), max: a10(max), centro: a10(centro), ritmoKg: r2(ritmoKg), limitado };
}

/** R7 · Proteína: mínimo 1,6; objetivo 1,8 (2,0 en déficit); techo 2,2 g/kg; 0,4 g/kg por comida (consejo). */
export function proteina({ peso, objetivo = 'recomposicion' }) {
  if (!(peso > 0)) return null;
  const meta = objetivo === 'perder-grasa' ? 2.0 : 1.8;
  return { min: r0(peso * 1.6), objetivo: r0(peso * meta), techo: r0(peso * 2.2), porComida: r0(peso * 0.4) };
}

/**
 * R8 (4) · Si el ritmo real de pérdida pasa del 1 % por semana dos semanas seguidas, Gofio sube el objetivo
 * lo que sobra y lo dice. Devuelve las kcal que sube (0 si no toca).
 */
export function vigilarRitmo(pesajes, hasta) {
  const a = ritmo(pesajes, hasta), b = ritmo(pesajes, sumarDias(hasta, -7));
  if (a.kgSemana == null || b.kgSemana == null) return 0;
  if (!(a.pctSemana < -1 && b.pctSemana < -1)) return 0;
  const sobra = -a.kgSemana - a.peso * 0.01;
  return r0(sobra * KCAL_POR_KG / 7 / 10) * 10;
}

/** R6 · ¿El peso va dentro de la franja de la recomposición (−0,25 % a +0,1 % por semana)? */
export const enFranjaRecomposicion = (pctSemana) => pctSemana >= -0.25 && pctSemana <= 0.1;

/** El momento de comer por la hora (diseño de Gofio): desayuno hasta las 11, almuerzo 11-17, cena 19-24. */
export const MOMENTOS = ['desayuno', 'almuerzo', 'cena', 'entre'];
export const NOMBRE_MOMENTO = { desayuno: 'Desayuno', almuerzo: 'Almuerzo', cena: 'Cena', entre: 'Entre horas' };
export function momentoPorHora(h) {
  if (h >= 5 && h < 11) return 'desayuno';
  if (h >= 12 && h < 17) return 'almuerzo';
  if (h >= 19 && h < 24) return 'cena';
  return 'entre';
}
