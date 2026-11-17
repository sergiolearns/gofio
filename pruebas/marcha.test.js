// Libro de reglas 1.4: el salto que se adapta (R12), calentamiento (R26), al fallo (R27) y añadir sobre la marcha.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../js/cerebro/index.js';

test('R12 (1.4) · el salto se adapta al peso: con poco, un escalón; con mucho, varios', () => {
  assert.equal(G.pesoDeSubida(92.5, { repMin: 8, repMax: 10, tipo: 'multi', escalon: 2.5 }), 95);
  assert.equal(G.pesoDeSubida(180, { repMin: 10, repMax: 12, tipo: 'multi', escalon: 2.5 }), 187.5);
  assert.equal(G.pesoDeSubida(180, { repMin: 10, repMax: 12, tipo: 'multi', escalon: 5 }), 185);
  assert.equal(G.pesoDeSubida(10, { repMin: 10, repMax: 15, tipo: 'aislamiento', escalon: 2 }), 12); // como poco, un escalón
  assert.equal(G.pesoDeSubida(20, { repMin: 8, repMax: 10, tipo: 'multi', escalon: [10, 12, 14, 16, 18, 20, 22.5, 25] }), 22.5);
});

test('R12 (1.4) · proximaVez usa el salto adaptado', () => {
  const r = G.proximaVez({ peso: 180, repMin: 10, repMax: 12, tipo: 'multi', escalon: 2.5, series: [{ reps: 12, rir: 2 }, { reps: 12, rir: 1 }] });
  assert.equal(r.accion, 'subir'); assert.equal(r.peso, 187.5); assert.deepEqual(r.reps, [10, 10]);
});

test('R26 · calentamiento: 50 % × 8 y 75 % × 4, a tu escalón', () => {
  assert.deepEqual(G.calentamiento(28, 2), [{ peso: 14, reps: 8 }, { peso: 20, reps: 4 }]);
  assert.deepEqual(G.calentamiento(100, 2.5), [{ peso: 50, reps: 8 }, { peso: 75, reps: 4 }]);
  assert.deepEqual(G.calentamiento(10, 2), [{ peso: 4, reps: 8 }, { peso: 6, reps: 4 }]);
  assert.deepEqual(G.calentamiento(4, 2.5), [{ peso: 2.5, reps: 4 }]); // con muy poco peso, solo la que no sale a 0
  assert.deepEqual(G.calentamiento(6, 2.5), [{ peso: 2.5, reps: 8 }]); // si dos salen iguales, una
  assert.deepEqual(G.calentamiento(0, 2.5), []);
  assert.deepEqual(G.calentamiento(null, 2.5), []);
});

test('R26 · con lastre ligero o sin lastre, la ligera es con tu peso (G109)', () => {
  assert.deepEqual(G.calentamiento(2, 2.5, { lastre: true }), [{ peso: 0, reps: 5 }]);
  assert.deepEqual(G.calentamiento(0, 2.5, { lastre: true }), [{ peso: 0, reps: 3 }]);
  assert.deepEqual(G.calentamiento(20, 2.5, { lastre: true }), [{ peso: 10, reps: 8 }, { peso: 15, reps: 4 }]);
});

test('R27 · al fallo: mejor visto en aislamiento y máquinas que en libres pesados', () => {
  assert.equal(G.falloBienVisto('laterales-polea'), true);
  assert.equal(G.falloBienVisto('sentadilla-hack'), true);
  assert.equal(G.falloBienVisto('peso-muerto-rumano'), false);
  assert.deepEqual(G.RIR_AL_FALLO, { min: 0, max: 0 });
});

test('Añadir · rango por defecto de R25 y grupos por músculo principal', () => {
  assert.deepEqual(G.slotNuevo('press-banca'), { ej: 'press-banca', series: 3, repMin: 8, repMax: 10, anadido: true });
  assert.deepEqual(G.slotNuevo('aperturas-maquina'), { ej: 'aperturas-maquina', series: 3, repMin: 10, repMax: 15, anadido: true });
  const pecho = G.ejerciciosDeGrupo('pecho', ['press-banca']).map((e) => e.id);
  assert.ok(pecho.includes('aperturas-maquina')); assert.ok(!pecho.includes('press-banca')); assert.ok(!pecho.includes('curl-alterno'));
});

test('R10 · avisa (no impide) si un músculo pasa de 11 en la sesión', () => {
  const plan = [{ ej: 'press-inclinado-mancuernas', series: 4 }, { ej: 'press-convergente', series: 4 }];
  assert.deepEqual(G.avisoTope(plan, G.slotNuevo('aperturas-maquina')), [{ musculo: 'pecho', antes: 8, despues: 11 }].filter((x) => x.despues > 11));
  const mas = [...plan, { ej: 'fondos-lastrados', series: 1 }];
  assert.deepEqual(G.avisoTope(mas, G.slotNuevo('aperturas-maquina')), [{ musculo: 'pecho', antes: 9, despues: 12 }]);
});
