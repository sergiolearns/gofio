// Pruebas del cerebro de Gofio. Ejecutar desde prototipos/v0.1/:  node --test "pruebas/*.test.js"   (o npm test)
// Cada bloque reproduce los ejemplos de su regla en 05-libro-de-reglas.md (v1.1).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../js/cerebro/index.js';

const P = G.PLANTILLA_SERGIO;
const casi = (a, b, tol = 0.05) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);
/** Series de un día entero de la plantilla, hechas en una fecha y hora. */
const hacer = (diaId, fecha, hora = 18) => {
  const ts = Date.parse(`${fecha}T${String(hora).padStart(2, '0')}:00:00`);
  return G.diaDe(P, diaId).ejercicios.flatMap((e) => Array.from({ length: e.series }, () => ({ ejercicioId: e.ej, fecha, ts })));
};

// ── R9 · Volumen semanal (cuenta fraccional) ────────────────────────────────
test('R9 · press inclinado = pecho 1, tríceps 0,5, hombro anterior 0,5', () => {
  const v = G.aporte('press-inclinado-mancuernas');
  assert.equal(v.pecho, 1); assert.equal(v.triceps, 0.5); assert.equal(v['hombro-anterior'], 0.5); assert.equal(v.dorsal, 0);
});

test('R9 · la plantilla con la propuesta A da los números de la auditoría', () => {
  const v = G.volumenPlantilla(P);
  const esperado = { pecho: 14, dorsal: 16, biceps: 15.5, triceps: 16, 'hombro-lateral': 9.5, 'hombro-anterior': 8.5,
    'hombro-posterior': 7.5, cuadriceps: 13, isquios: 9, gluteo: 6.5, gemelos: 4, abdomen: 3 };
  for (const [m, x] of Object.entries(esperado)) assert.equal(v[m], x, m);
});

test('R9 · lectura frente al mínimo (4) y la franja (10-20)', () => {
  assert.equal(G.estadoVolumen(3), 'bajo-minimo');
  assert.equal(G.estadoVolumen(7), 'bajo');
  assert.equal(G.estadoVolumen(13), 'en-franja');
  assert.equal(G.estadoVolumen(21), 'alto');
});

test('R9 · cada ejercicio de la plantilla está en el catálogo con su tabla de músculos', () => {
  for (const d of P.dias) for (const e of d.ejercicios) assert.ok(Object.keys(G.ejercicio(e.ej).musculos).length > 0, e.ej);
});

// ── R10 · Volumen por sesión ────────────────────────────────────────────────
test('R10 · ningún día de la plantilla pasa de 11 fraccionales por músculo', () => {
  for (const d of P.dias) assert.deepEqual(G.excesosSesion(d.ejercicios), [], d.nombre);
});

test('R10 · detecta una sesión que se pasa', () => {
  const ex = G.excesosSesion([{ ej: 'press-banca', series: 6 }, { ej: 'press-inclinado-mancuernas', series: 6 }]);
  assert.deepEqual(ex.map((x) => x.musculo), ['pecho']);
});

// ── R11 · Esfuerzo y fuerza estimada ───────────────────────────────────────
test('R11 · remo con barra 70 kg × 8 a RIR 2 → e1RM ≈ 93 kg (ejemplo del libro)', () => {
  casi(G.e1rm(70, 8, 2), 93.33, 0.01);
  assert.equal(Math.round(G.e1rm(70, 8, 2)), 93);
});

test('R11 · RIR objetivo: 1-2 multiarticular, 0-1 aislamiento', () => {
  assert.deepEqual(G.rirObjetivo('multi'), { min: 1, max: 2 });
  assert.deepEqual(G.rirObjetivo('aislamiento'), { min: 0, max: 1 });
});

test('R11 · mejor e1RM de varias series', () => {
  casi(G.mejorE1rm([{ peso: 90, reps: 10, rir: 1 }, { peso: 90, reps: 8, rir: 0 }]), 123);
});

// ── R12 · Doble progresión y escalones ─────────────────────────────────────
const base = { peso: 92.5, repMin: 8, repMax: 10, tipo: 'multi', escalon: 2.5 };

test('R12.1 · todas las series en el tope con el RIR objetivo → +2,5 kg y vuelta a 8', () => {
  const r = G.proximaVez({ ...base, series: [{ reps: 10, rir: 2 }, { reps: 10, rir: 1 }, { reps: 10, rir: 1 }] });
  assert.equal(r.accion, 'subir'); assert.equal(r.peso, 95); assert.deepEqual(r.reps, [8, 8, 8]);
});

test('R12.2 · si no, mismo peso y una repetición más en la serie más corta', () => {
  const r = G.proximaVez({ ...base, series: [{ reps: 10, rir: 1 }, { reps: 9, rir: 1 }, { reps: 8, rir: 1 }] });
  assert.equal(r.accion, 'mantener'); assert.equal(r.peso, 92.5); assert.deepEqual(r.reps, [10, 9, 9]);
});

test('R12.2 · en el tope pero sin el margen objetivo (RIR 0 en multiarticular) → no sube aún', () => {
  const r = G.proximaVez({ ...base, series: [{ reps: 10, rir: 0 }, { reps: 10, rir: 1 }] });
  assert.equal(r.accion, 'mantener');
});

test('R12.3 · RIR 0 sin llegar a la parte baja → un escalón menos', () => {
  const r = G.proximaVez({ ...base, series: [{ reps: 6, rir: 0 }, { reps: 8, rir: 1 }] });
  assert.equal(r.accion, 'bajar'); assert.equal(r.peso, 90);
});

test('R12 · escalones configurables: lista de mancuernas reales', () => {
  const lista = [10, 12, 14, 16, 18, 20, 22.5, 25];
  assert.equal(G.siguienteEscalon(20, lista, +1), 22.5);
  assert.equal(G.siguienteEscalon(22.5, lista, -1), 20);
  assert.equal(G.siguienteEscalon(25, lista, +1), 25); // no hay más: se queda
  const r = G.proximaVez({ peso: 20, repMin: 8, repMax: 10, tipo: 'multi', escalon: lista, series: [{ reps: 10, rir: 2 }, { reps: 10, rir: 2 }] });
  assert.equal(r.peso, 22.5);
});

test('R12 · paso fijo de máquina (5 kg) y redondeo al escalón', () => {
  assert.equal(G.siguienteEscalon(180, 5, +1), 185);
  assert.equal(G.redondearAEscalon(99, 2.5), 97.5);
  assert.equal(G.redondearAEscalon(99, [90, 95, 100]), 95);
});

test('R12 · estancamiento: 3 sesiones seguidas sin mejorar la e1RM', () => {
  assert.equal(G.estancado([100, 103, 102, 103, 101]), true);
  assert.equal(G.estancado([100, 103, 102, 104, 101]), false);
  assert.equal(G.estancado([100, 101, 101]), false); // pocas sesiones
});

// ── R14 · Vuelta tras días sin ir ──────────────────────────────────────────
test('R14 · ≤7 días: normal', () => {
  assert.equal(G.vuelta(['2026-11-10'], '2026-11-16').tipo, 'normal');
});

test('R14 · 8-20 días: la primera sesión con RIR +1', () => {
  const v = G.vuelta(['2026-11-01'], '2026-11-16');
  assert.equal(v.tipo, 'media'); assert.equal(v.dias, 15);
  assert.deepEqual(G.aplicarVuelta({ peso: 100, series: 3, rir: { min: 1, max: 2 } }, v, 2.5).rir, { min: 2, max: 3 });
});

test('R14 · 21 días o más: cargas −10 %, dos tercios de las series y RIR 2-3', () => {
  const v = G.vuelta(['2026-10-01'], '2026-11-16');
  assert.equal(v.tipo, 'larga');
  const p = G.aplicarVuelta({ peso: 110, series: 3, rir: { min: 1, max: 2 } }, v, 2.5);
  assert.equal(p.peso, 97.5); // 110 × 0,9 = 99 → escalón de abajo
  assert.equal(p.series, 2);
  assert.deepEqual(p.rir, { min: 2, max: 3 });
});

test('R14 · la vuelta larga dura la primera semana; la segunda, normal', () => {
  const f = ['2026-10-01', '2026-11-16'];
  assert.equal(G.vuelta(f, '2026-11-19').tipo, 'larga');
  assert.equal(G.vuelta([...f, '2026-11-19'], '2026-11-22').tipo, 'larga');
  assert.equal(G.vuelta([...f, '2026-11-19'], '2026-11-24').tipo, 'normal');
});

test('R14 · sin historial: primera vez', () => {
  assert.equal(G.vuelta([], '2026-11-16').tipo, 'primera');
});

// ── R15 · Planificador de la semana flexible ───────────────────────────────
function historial() {
  const ses = [], ser = [];
  const plan = [['2026-10-19', 'd1'], ['2026-10-21', 'd2'], ['2026-10-23', 'd3'], ['2026-10-26', 'd4'], ['2026-10-28', 'd5'],
    ['2026-10-30', 'd1'], ['2026-11-02', 'd2'], ['2026-11-04', 'd3'], ['2026-11-06', 'd4'], ['2026-11-09', 'd5'],
    ['2026-11-11', 'd1'], ['2026-11-13', 'd2']]; // 3 sesiones por semana de media
  for (const [f, d] of plan) { ses.push({ fecha: f, diaId: d }); ser.push(...hacer(d, f)); }
  return { ses, ser };
}

test('R15 · ejemplo del libro: tras el torso del lunes y con 3 días de media, el martes toca Pierna', () => {
  const { ses, ser } = historial();
  ses.push({ fecha: '2026-11-16', diaId: 'd1' }); ser.push(...hacer('d1', '2026-11-16'));
  const r = G.planificar({ plantilla: P, series: ser, sesiones: ses, hoy: '2026-11-17', ahora: Date.parse('2026-11-17T18:00:00') });
  assert.equal(r.quedan, 2);
  assert.equal(r.tipo, 'dia'); assert.equal(r.diaId, 'd2');
  assert.equal(r.motivo.musculo, 'cuadriceps'); assert.equal(r.motivo.faltan, 13);
  assert.equal(r.ayer, 'd1');
});

test('R15 · ejemplo del libro: si el miércoles es la última sesión, combinada de torso sin pasar de 11 por músculo', () => {
  const { ses, ser } = historial();
  for (const [f, d] of [['2026-11-16', 'd1'], ['2026-11-17', 'd2']]) { ses.push({ fecha: f, diaId: d }); ser.push(...hacer(d, f)); }
  const r = G.planificar({ plantilla: P, series: ser, sesiones: ses, hoy: '2026-11-18', ahora: Date.parse('2026-11-18T18:00:00') });
  assert.equal(r.tipo, 'combinada');
  const total = r.ejercicios.reduce((s, e) => s + e.series, 0);
  assert.ok(total <= 25, `series: ${total}`);              // 75 min ≈ 25 series
  assert.deepEqual(G.excesosSesion(r.ejercicios), []);      // R10
  const v = G.volumen(r.ejercicios);
  assert.equal(v.cuadriceps, 0);                            // la pierna está cansada (ayer)
  assert.ok(v.pecho >= 6 && v.dorsal >= 6);                 // lo más atrasado
  const patrones = r.ejercicios.map((e) => G.ejercicio(e.ej).patron);
  assert.equal(new Set(patrones).size, patrones.length);    // sin dos del mismo patrón
});

test('R15.5 · si quedan tantas sesiones como días por hacer, la rotación tal cual', () => {
  const { ses, ser } = historial();
  ses.push({ fecha: '2026-11-16', diaId: 'd3' }); ser.push(...hacer('d3', '2026-11-16'));
  const r = G.planificar({ plantilla: P, series: ser, sesiones: ses, hoy: '2026-11-17', diasPorSemana: 5 });
  assert.equal(r.razon, 'rotacion'); assert.equal(r.diaId, 'd4');
});

test('R15.6 · cuando quedan menos sesiones, gana el día con más deuda relativa', () => {
  const r = G.planificar({ plantilla: P, series: [], sesiones: [{ fecha: '2026-11-09', diaId: 'd2' }], hoy: '2026-11-16', diasPorSemana: 2 });
  assert.equal(r.razon, 'puntuacion');
  assert.ok(r.puntuaciones[r.diaId] >= Math.max(...Object.values(r.puntuaciones)) - 1e-9);
});

test('R15 · sin historial empieza por el día 1', () => {
  const r = G.planificar({ plantilla: P, hoy: '2026-11-16', diasPorSemana: 5 });
  assert.equal(r.diaId, 'd1');
});

test('R15 · frescura: ≥6 fraccionales en las últimas 48 h pesan la mitad', () => {
  const ser = hacer('d1', '2026-11-16', 18);
  const r = G.planificar({ plantilla: P, series: ser, sesiones: [{ fecha: '2026-11-16', diaId: 'd1' }], hoy: '2026-11-17', ahora: Date.parse('2026-11-17T18:00:00') });
  assert.equal(r.frescura.dorsal, 0.5); assert.equal(r.frescura.cuadriceps, 1);
});

// ── R21 · Día malo ─────────────────────────────────────────────────────────
test('R21 · Pierna en día malo: los multiarticulares, 2 series y RIR +2', () => {
  const s = G.diaMalo(G.diaDe(P, 'd2').ejercicios);
  assert.deepEqual(s.map((e) => e.ej), ['sentadilla-hack', 'peso-muerto-rumano', 'prensa']);
  assert.ok(s.every((e) => e.series === 2));
  assert.deepEqual(s[0].rir, { min: 3, max: 4 });
  assert.equal(G.minutosDe(s), 18);
});

test('R21 · un día con un solo multiarticular se completa hasta 2 ejercicios', () => {
  const s = G.diaMalo([{ ej: 'laterales-mancuernas', series: 4 }, { ej: 'press-banca', series: 3 }, { ej: 'curl-polea', series: 3 }]);
  assert.deepEqual(s.map((e) => e.ej), ['press-banca', 'laterales-mancuernas']);
  assert.deepEqual(s[1].rir, { min: 2, max: 3 });
});

// ── R22 · Sustituciones ────────────────────────────────────────────────────
test('R22 · la hack se cambia por otro ejercicio de sentadilla', () => {
  const s = G.sustitutos('sentadilla-hack');
  assert.ok(s.length >= 2);
  assert.ok(s.filter((x) => x.mismoPatron).every((x) => x.patron === 'sentadilla'));
  assert.ok(s.findIndex((x) => !x.mismoPatron) === -1 || s.slice(0, 3).every((x) => x.mismoPatron)); // primero los del mismo patrón
  assert.equal(s[0].parecido, 1);
});

test('R22 · las dominadas se cambian por jalones (tirón vertical)', () => {
  const s = G.sustitutos('dominadas-lastradas').filter((x) => x.mismoPatron);
  assert.deepEqual(s.map((x) => x.id).sort(), ['jalon-estrecho-neutro', 'jalon-pecho']);
});

test('R22 · todo ejercicio de la plantilla tiene al menos un sustituto', () => {
  for (const d of P.dias) for (const e of d.ejercicios) assert.ok(G.sustitutos(e.ej).some((x) => x.mismoPatron), e.ej);
});

// ── R23 · Constancia semanal ───────────────────────────────────────────────
test('R23 · semanas con al menos un entreno, sin rachas: faltar una semana no borra nada', () => {
  const f = ['2026-09-28', '2026-10-06', '2026-10-07', '2026-10-21', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-12', '2026-11-16'];
  const c = G.constancia(f, '2026-11-16');
  assert.equal(c.semanas.length, 8);
  assert.deepEqual(c.semanas.map((s) => s.dias), [1, 2, 0, 1, 0, 3, 1, 1]);
  assert.equal(c.conEntreno, 6);
});

test('R23 · la semana en curso sin entreno aún no cuenta en contra', () => {
  const c = G.constancia(['2026-11-12'], '2026-11-17');
  assert.equal(c.semanas.at(-1).dias, 0);
  assert.equal(c.total, 7);
});

// ── Fechas ─────────────────────────────────────────────────────────────────
test('Fechas · la semana va de lunes a domingo', () => {
  assert.equal(G.lunesDe('2026-11-22'), '2026-11-16');
  assert.equal(G.lunesDe('2026-11-16'), '2026-11-16');
  assert.equal(G.diaSemana('2026-11-22'), 6);
  assert.equal(G.diasEntre('2026-10-24', '2026-10-26'), 2); // cambio de hora de por medio
});
