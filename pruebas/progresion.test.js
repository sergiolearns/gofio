// Pruebas de la v0.2 · Progresión (libro de reglas 1.3: R11, R12, R13). Ejecutar: node --test "pruebas/*.test.js"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../js/cerebro/index.js';

const casi = (a, b, tol = 0.05) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);
const ses = (fechas, valores) => fechas.map((fecha, i) => ({ fecha, e1rm: valores[i] }));

// ── R11 · Fuerza estimada por sesión ────────────────────────────────────────
test('R11 · la fuerza de cada sesión es su mejor serie (remo 70 × 8 a RIR 2 ≈ 93 kg, ejemplo del libro)', () => {
  const s = [
    { sesionId: 'a', fecha: '2026-11-03', ts: 1, peso: 70, reps: 8, rir: 2 },
    { sesionId: 'a', fecha: '2026-11-03', ts: 2, peso: 70, reps: 7, rir: 1 },
    { sesionId: 'b', fecha: '2026-11-10', ts: 3, peso: 70, reps: 10, rir: 2 },
  ];
  const f = G.fuerzaPorSesion(s);
  assert.equal(f.length, 2);
  casi(f[0].e1rm, 93.33); assert.equal(f[0].top.reps, 8);
  casi(f[1].e1rm, 98);
});

// ── R12 · Estado: sube, se asienta, atascado ────────────────────────────────
test('R12 · sube: la última sesión supera a todas las anteriores', () => {
  assert.equal(G.estadoFuerza(ses(['2026-10-01', '2026-10-08', '2026-10-15'], [90, 91, 93])), 'sube');
});
test('R12 · atascado: 3 sesiones seguidas sin mejorar la mejor de antes', () => {
  assert.equal(G.estadoFuerza(ses(['2026-10-01', '2026-10-04', '2026-10-07', '2026-10-10'], [93, 92, 93, 91])), 'atascado');
});
test('R12 · antes de marcar atascado, mira si ha faltado mucho (8 días o más sin ir al gimnasio)', () => {
  assert.equal(G.estadoFuerza(ses(['2026-10-01', '2026-10-04', '2026-10-20', '2026-10-23'], [93, 92, 93, 91])), 'asienta');
});
test('R12 · un ejercicio que vuelve cada 9 días no ha «faltado» si fuiste al gimnasio entre medias', () => {
  const ej = ses(['2026-10-01', '2026-10-10', '2026-10-19', '2026-10-28'], [93, 92, 93, 91]);
  const gym = ['2026-10-01', '2026-10-03', '2026-10-06', '2026-10-08', '2026-10-10', '2026-10-13', '2026-10-15', '2026-10-17', '2026-10-19', '2026-10-22', '2026-10-24', '2026-10-26', '2026-10-28'];
  assert.equal(G.estadoFuerza(ej, gym), 'atascado');
});
test('R12 · se asienta: ni sube ni lleva 3 sin mejorar; con una sola sesión, nuevo', () => {
  assert.equal(G.estadoFuerza(ses(['2026-10-01', '2026-10-04', '2026-10-07'], [90, 93, 92])), 'asienta');
  assert.equal(G.estadoFuerza(ses(['2026-10-01'], [90])), 'nuevo');
});
test('R12 · atascado: rango más bajo (8-10 → 6-8; nunca por debajo de 5)', () => {
  assert.deepEqual(G.rangoMasBajo(8, 10), { repMin: 6, repMax: 8 });
  assert.deepEqual(G.rangoMasBajo(6, 8), { repMin: 5, repMax: 7 });
  assert.deepEqual(G.rangoMasBajo(12, 12), { repMin: 10, repMax: 10 });
});

// ── R13 · Descarga propuesta, nunca fija ────────────────────────────────────
const semanasDe4 = (hasta, n) => {           // n semanas terminadas antes de la de `hasta`, 4 días cada una
  const f = []; let lunes = G.sumarDias(G.lunesDe(hasta), -7);
  for (let k = 0; k < n; k++) { for (let d = 0; d < 4; d++) f.push(G.sumarDias(lunes, d)); lunes = G.sumarDias(lunes, -7); }
  return f;
};
test('R13 · una sola señal no basta', () => {
  const r = G.senalesDescarga({ atascados: 2, sensaciones: ['entero', 'entero'], fechas: [], hoy: '2026-11-18' });
  assert.equal(r.atascados, true); assert.equal(r.proponer, false);
});
test('R13 · dos de tres: 2 ejercicios atascados y 7 semanas seguidas a 4 días (como en el lienzo)', () => {
  const r = G.senalesDescarga({ atascados: 2, sensaciones: [], fechas: semanasDe4('2026-11-18', 7), hoy: '2026-11-18' });
  assert.equal(r.semanasSeguidas, 7); assert.equal(r.semanas, true); assert.equal(r.proponer, true);
});
test('R13 · cansancio o molestias en las 2 últimas sesiones + 6 semanas fuertes', () => {
  const r = G.senalesDescarga({ atascados: 0, sensaciones: ['entero', 'molido', 'molesta'], fechas: semanasDe4('2026-11-18', 6), hoy: '2026-11-18' });
  assert.equal(r.cansancio, true); assert.equal(r.proponer, true);
});
test('R13 · 5 semanas fuertes aún no cuentan (el libro dice 6-8)', () => {
  assert.equal(G.semanasSeguidasFuertes(semanasDe4('2026-11-18', 5), '2026-11-18'), 5);
  assert.equal(G.senalesDescarga({ atascados: 2, sensaciones: [], fechas: semanasDe4('2026-11-18', 5), hoy: '2026-11-18' }).proponer, false);
});
test('R13 · la descarga: ≈ la mitad de series, −10 % al escalón de abajo y RIR +2', () => {
  const p = G.aplicarDescarga({ peso: 70, series: 4, rir: { min: 1, max: 2 } }, 2.5);
  assert.equal(p.peso, 62.5); assert.equal(p.series, 2); assert.deepEqual(p.rir, { min: 3, max: 4 });
  const q = G.aplicarDescarga({ peso: 30, series: 3, rir: { min: 0, max: 1 } }, 2.5);
  assert.equal(q.peso, 25);   // 27 → escalón de abajo: 25 assert.equal(q.series, 2); assert.deepEqual(q.rir, { min: 2, max: 3 });
});
