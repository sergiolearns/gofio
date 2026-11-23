// Pruebas de la comida y el peso (libro 1.6): los ejemplos del libro y casos sintéticos con la respuesta conocida.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../js/cerebro/index.js';

const cerca = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} ≉ ${b} (±${tol})`);
const SERGIO = { peso: 78, altura: 182.4, edad: 19, sexo: 'hombre' };

test('R1 · Mifflin-St Jeor: Sergio 1.830 en reposo, 2.840-3.390 con PAL 1,55-1,85 (ejemplo del libro)', () => {
  assert.equal(G.gastoEnReposo(SERGIO), 1830);
  const g = G.gastoInicial(SERGIO);
  assert.equal(g.min, 2840); assert.equal(g.max, 3390); assert.ok(g.provisional);
  cerca(g.medio, 3110, 10);
  assert.equal(G.gastoEnReposo({ peso: 60, altura: 165, edad: 30, sexo: 'mujer' }), 600 + 1031.25 - 150 - 161);
  assert.equal(G.gastoEnReposo({ peso: 78 }), null, 'sin altura ni edad no hay número');
});

test('R17 · un pesaje por día (vale el último) y tendencia con α 0,1', () => {
  const p = G.pesajesPorDia([{ fecha: '2026-11-02', kg: 78.4, ts: 2 }, { fecha: '2026-11-01', kg: 78, ts: 1 }, { fecha: '2026-11-02', kg: 78.2, ts: 3 }]);
  assert.deepEqual(p, [{ fecha: '2026-11-01', kg: 78 }, { fecha: '2026-11-02', kg: 78.2 }]);
  const t = G.tendencia([{ fecha: 'a', kg: 78 }, { fecha: 'b', kg: 79 }, { fecha: 'c', kg: 79 }]);
  assert.deepEqual(t.map((x) => x.tendencia), [78, 78.1, 78.19]);
});

const serie = (desde, n, kg0, porDia, ruido = () => 0) => Array.from({ length: n }, (_, i) => ({ fecha: G.sumarDias(desde, i), kg: kg0 + porDia * i + ruido(i) }));

test('R17 · el ritmo: la recta de 21 días en kg por semana; con menos de 10 pesajes, aún no', () => {
  const p = serie('2026-11-01', 21, 78, -0.05);
  const r = G.ritmo(p, '2026-11-21');
  cerca(r.kgSemana, -0.35, 0.001); assert.equal(r.n, 21); cerca(r.margen, 0, 0.001, 'sin ruido no hay margen');
  cerca(r.pctSemana, -100 * 0.35 / 77.5, 0.01);
  const pocos = G.ritmo(p.filter((_, i) => i % 3 === 0), '2026-11-21');
  assert.equal(pocos.kgSemana, undefined); assert.equal(pocos.faltan, 3);
  // Con ruido, el margen crece y el ritmo sigue cerca.
  const zig = serie('2026-11-01', 21, 78, 0, (i) => (i % 2 ? 0.4 : -0.4));
  const z = G.ritmo(zig, '2026-11-21');
  assert.ok(Math.abs(z.kgSemana) < 0.1 && z.estable && z.margen > 0.05);
});

test('R2 · gasto = lo comido − pendiente × 6.500 (sintético: come 2.800 y pierde 50 g al día → 3.125)', () => {
  const pes = serie('2026-10-01', 28, 80, -0.05);
  const com = pes.map((p) => ({ fecha: p.fecha, kcal: 2800 }));
  const g = G.gastoReal(com, pes, '2026-10-28');
  assert.ok(g.listo); cerca(g.kcal, 3125, 5); assert.equal(g.margen, 150); assert.equal(g.dias, 28);
});

test('R2 · mínimos: 14 días, 10 apuntados y 10 pesajes; antes dice cuánto falta', () => {
  const pes = serie('2026-10-01', 6, 80, 0);
  const com = pes.map((p) => ({ fecha: p.fecha, kcal: 2500 }));
  const g = G.gastoReal(com, pes, '2026-10-06');
  assert.equal(g.listo, false); assert.equal(g.dias, 6); assert.equal(g.faltanDias, 8); assert.equal(g.faltanPesajes, 4);
  const p14 = serie('2026-10-01', 14, 80, 0); const c14 = p14.map((p) => ({ fecha: p.fecha, kcal: 2500 }));
  const g14 = G.gastoReal(c14, p14, '2026-10-14');
  assert.ok(g14.listo); assert.equal(g14.margen, 420); cerca(g14.kcal, 2500, 5);
  assert.equal(G.margenGasto(21), 230); assert.equal(G.margenGasto(40), 150);
});

test('R2 (v1.6) · los días «me dejé algo» no cuentan: no hacen creer que gastas menos', () => {
  const pes = serie('2026-10-01', 28, 80, 0);
  const com = pes.map((p, i) => ({ fecha: p.fecha, kcal: i % 4 === 0 ? 900 : 2700, aMedias: i % 4 === 0 }));
  cerca(G.gastoReal(com, pes, '2026-10-28').kcal, 2700, 5);
  const sinMarcar = com.map((d) => ({ ...d, aMedias: false }));
  assert.ok(G.gastoReal(sinMarcar, pes, '2026-10-28').kcal < 2300, 'sin marcar, el día a medias tira el gasto hacia abajo');
});

test('R2 · se mezcla con el de la semana anterior (70/30): un cambio brusco no salta de golpe', () => {
  const pes = serie('2026-09-01', 42, 80, 0);
  const com = pes.map((p, i) => ({ fecha: p.fecha, kcal: i < 28 ? 2500 : 3000 }));
  const g = G.gastoReal(com, pes, '2026-10-12');
  const crudo = G.gastoCrudo(com, pes, '2026-10-12').kcal;
  assert.ok(g.kcal < crudo - 20 && g.kcal > 2500);
});

test('R3-R5 · déficit 0,5 % ≈ 360 kcal menos; volumen 0,25 % ≈ 180 más; ritmos acotados (ejemplos del libro)', () => {
  const d = G.caloriasObjetivo({ gasto: 3110, objetivo: 'perder-grasa', peso: 78, reposo: 1830 });
  cerca(3110 - d.centro, 360, 10); cerca(d.ritmoKg, -0.39, 0.001);
  const tope = G.caloriasObjetivo({ gasto: 3110, objetivo: 'perder-grasa', peso: 78, ritmoPct: 3 });
  cerca(tope.ritmoKg, -0.78, 0.001, 'más de 1 % no se ofrece');
  const v = G.caloriasObjetivo({ gasto: 3110, objetivo: 'ganar-musculo', peso: 78 });
  cerca(v.centro - 3110, 180, 10); cerca(v.ritmoKg, 0.2, 0.01);
});

test('R6 · recomposición: gasto − 100 a gasto', () => {
  const r = G.caloriasObjetivo({ gasto: 3110, objetivo: 'recomposicion', peso: 78, reposo: 1830 });
  assert.deepEqual([r.min, r.centro, r.max], [3010, 3060, 3110]);
  assert.ok(G.enFranjaRecomposicion(-0.1) && !G.enFranjaRecomposicion(-0.4) && !G.enFranjaRecomposicion(0.2));
});

test('R8 · nunca por debajo del gasto en reposo ni más del 25 % de déficit', () => {
  const bajo = G.caloriasObjetivo({ gasto: 2000, objetivo: 'perder-grasa', peso: 120, reposo: 1900, ritmoPct: 1 });
  assert.ok(bajo.limitado); assert.equal(bajo.min, 1900); assert.ok(bajo.centro >= 1900);
  const p25 = G.caloriasObjetivo({ gasto: 2400, objetivo: 'perder-grasa', peso: 100, reposo: 1000, ritmoPct: 1 });
  assert.equal(p25.min, 1800);
  // Propiedad: con cualquier entrada, el objetivo nunca baja del suelo.
  for (let i = 0; i < 500; i++) {
    const gasto = 1200 + Math.random() * 3000, peso = 40 + Math.random() * 100, reposo = 900 + Math.random() * 1500;
    const o = G.caloriasObjetivo({ gasto, objetivo: ['perder-grasa', 'ganar-musculo', 'recomposicion'][i % 3], peso, reposo, ritmoPct: Math.random() * 2 });
    assert.ok(o.min >= Math.round(Math.max(gasto * 0.75, reposo) / 10) * 10 - 10, JSON.stringify({ gasto, peso, reposo, o }));
  }
});

test('R8 (4) · perder más del 1 % por semana dos semanas seguidas sube el objetivo', () => {
  const rapido = serie('2026-10-01', 35, 80, -0.15);
  assert.ok(G.vigilarRitmo(rapido, '2026-11-04') > 0);
  assert.equal(G.vigilarRitmo(serie('2026-10-01', 35, 80, -0.05), '2026-11-04'), 0);
});

test('R7 · proteína de Sergio: mínimo 125, objetivo 141, 156 en déficit, techo 172, 31 por comida (ejemplo del libro)', () => {
  const p = G.proteina({ peso: 78 });
  cerca(p.min, 125, 1); cerca(p.objetivo, 141, 1); cerca(p.techo, 172, 1); cerca(p.porComida, 31, 1);
  cerca(G.proteina({ peso: 78, objetivo: 'perder-grasa' }).objetivo, 156, 1);
});

test('R31 · la olla: suma en crudo ÷ peso cocinado; o ÷ raciones', () => {
  // 200 g de arroz crudo (BEDCA ≈ 352 kcal/100 g? aquí 350) + 10 g de aceite (900) = 790 kcal; cocido pesa 500 g.
  const o = G.olla({ ingredientes: [{ g: 200, por100: { kcal: 350, prot: 7, hc: 77, grasa: 1 } }, { g: 10, por100: { kcal: 900, grasa: 100 } }], pesoCocinado: 500, raciones: 4 });
  cerca(o.total.kcal, 790, 0.001); cerca(o.por100.kcal, 158, 0.001); cerca(o.porRacion.kcal, 197.5, 0.001);
  cerca(o.por100.grasa, (2 + 10) / 5, 0.001); assert.equal(o.crudo, 210);
  // El agua no cambia las calorías: la misma olla con más caldo pesa más y da menos por 100 g.
  assert.ok(G.olla({ ingredientes: [{ g: 200, por100: { kcal: 350 } }], pesoCocinado: 800 }).por100.kcal < o.por100.kcal);
});

test('R31 · aporte, tamaños y kJ', () => {
  assert.deepEqual(G.redondear(G.aporteDe({ kcal: 226, prot: 26.3, hc: 0, grasa: 13.6 }, 150)), { kcal: 339, prot: 39, hc: 0, grasa: 20 });
  assert.equal(G.gramosDeTamano({ pequena: 170, mediana: 213, grande: 369 }, 'mediana'), 213);
  cerca(G.kJaKcal(946), 226, 0.2);
});

test('El momento por la hora', () => {
  assert.equal(G.momentoPorHora(8), 'desayuno'); assert.equal(G.momentoPorHora(14), 'almuerzo');
  assert.equal(G.momentoPorHora(21), 'cena'); assert.equal(G.momentoPorHora(17), 'entre'); assert.equal(G.momentoPorHora(2), 'entre');
});
