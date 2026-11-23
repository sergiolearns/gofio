// Pruebas de la 0.2.21 · Lo que pasa en el gimnasio (G123-G124; libro de reglas 1.6, R12).
// Ejecutar: node --test "pruebas/*.test.js"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../js/cerebro/index.js';
import { estado, ordenDe, siguienteHueco, siguienteTras, hastaAqui, mandarAlFinal, huecoVivo, quedaAlgo } from '../js/logica.js';

const barra = G.escalonDeEjercicio(G.ejercicio('remo-barra'));
const smith = G.escalonDeEjercicio(G.ejercicio('sentadilla-smith'));
const prensa = G.escalonDeEjercicio(G.ejercicio('prensa'));
/** ¿Se monta con discos? (peso − base) / 2 tiene que ser múltiplo del disco más pequeño. */
const seMonta = (w, cfg, disco = 2.5) => w >= cfg.base - 1e-9 && Math.abs(((w - cfg.base) / 2) / disco - Math.round(((w - cfg.base) / 2) / disco)) < 1e-9;

// ── R12 (G123) · Pesos que se montan ─────────────────────────────────────────
test('R12 · barra: base 20 y saltos de 5 (discos de 2,5): nunca 57,5', () => {
  assert.deepEqual(barra, { base: 20, paso: 5 });
  assert.equal(G.siguienteEscalon(55, barra, +1), 60);
  assert.equal(G.siguienteEscalon(57.5, barra, +1), 60);   // si lo escribiste a mano, el + vuelve a lo que se monta
  assert.equal(G.siguienteEscalon(57.5, barra, -1), 55);
  assert.equal(G.redondearAEscalon(57.5, barra), 55);
  assert.equal(G.redondearAEscalon(12, barra), 20);          // por debajo de la barra, la barra sola
  assert.equal(G.siguienteEscalon(20, barra, -1), 20);
});
test('R12 · «por lado»: 70 en barra = 25 por lado; en la Smith y la prensa, la mitad', () => {
  assert.equal(G.porLado(70, barra), 25);
  assert.equal(G.porLado(20, barra), null);
  assert.equal(G.porLado(60, smith), 30);
  assert.equal(G.porLado(180, prensa), 90);
  assert.equal(G.porLado(30, 2.5), null);                     // una polea no va por lados
});
test('R12 · el material decide: discos de 1,25 → saltos de 2,5; barra Z de 10 en el press francés', () => {
  const fina = G.escalonDeEjercicio(G.ejercicio('remo-barra'), { disco: 1.25 });
  assert.deepEqual(fina, { base: 20, paso: 2.5 });
  assert.equal(G.siguienteEscalon(55, fina, +1), 57.5);
  assert.deepEqual(G.escalonDeEjercicio(G.ejercicio('press-frances')), { base: 10, paso: 5 });
});
test('R12 · máquinas: placas de 5 o discos, según «Se carga con»', () => {
  assert.equal(G.escalonDeEjercicio(G.ejercicio('press-convergente')), 5);
  assert.deepEqual(G.escalonDeEjercicio(G.ejercicio('press-convergente'), {}, 'discos'), { base: 0, paso: 5 });
  assert.equal(G.escalonDeEjercicio(G.ejercicio('prensa'), {}, 'placas'), 5);
  assert.equal(G.escalonDeEjercicio(G.ejercicio('prensa'), { placas: 7 }, 'placas'), 7);
  assert.equal(G.ejercicio('remo-t-apoyo').carga, 'discos');
});
test('R12 · propiedad: con discos, todo lo que propone Gofio se monta (subir, bajar, arrimar, calentar, descarga, vuelta)', () => {
  const cfgs = [barra, smith, prensa, G.escalonDeEjercicio(G.ejercicio('press-frances'))];
  let r = 7;
  const azar = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
  for (let k = 0; k < 3000; k++) {
    const cfg = cfgs[k % cfgs.length];
    const w = G.redondearAEscalon(cfg.base + azar() * 250, cfg);
    assert.ok(seMonta(w, cfg), `redondear ${w}`);
    assert.ok(seMonta(G.siguienteEscalon(w, cfg, +1), cfg));
    assert.ok(seMonta(G.siguienteEscalon(w, cfg, -1), cfg));
    const sub = G.pesoDeSubida(w, { repMin: 8, repMax: 10, tipo: 'multi', escalon: cfg });
    assert.ok(seMonta(sub, cfg) && sub > w, `subida ${w} → ${sub}`);
    for (const p of G.arrimar({ trabajo: w, escalon: cfg, tipo: 'multi', repsObjetivo: 8 }).plan) assert.ok(seMonta(p.peso, cfg), `piedra ${p.peso}`);
    for (const p of G.calentamiento(w, cfg)) assert.ok(seMonta(p.peso, cfg), `ligera ${p.peso}`);
    const d = G.aplicarDescarga({ peso: w, reps: [8], rir: { min: 1, max: 2 } }, cfg);
    assert.ok(seMonta(d.peso, cfg), `descarga ${d.peso}`);
    const sig = G.siguienteSerie({ hecha: { peso: w, reps: 10, rir: 3 }, repsObjetivo: 8, repMin: 8, repMax: 10, tipo: 'multi', escalon: cfg });
    assert.ok(seMonta(sig.peso, cfg), `siguiente ${sig.peso}`);
  }
});
test('R12 · los escalones de antes siguen valiendo (número y lista)', () => {
  assert.equal(G.siguienteEscalon(10, 2, +1), 12);
  assert.equal(G.siguienteEscalon(12, [10, 12.5, 15], +1), 12.5);
  assert.equal(G.redondearAEscalon(13, [10, 12.5, 15]), 12.5);
});

// ── G124 · El orden de la molienda, «Luego», «Hasta aquí» y «Quitar por hoy» ──
const sesion = () => ({ id: 'x', plan: [{ ej: 'remo-barra', series: 4 }, { ej: 'jalon-estrecho-neutro', series: 3 }, { ej: 'pullover-polea', series: 3 }] });
const serie = (slot, n) => ({ id: `x-${slot}-${n}`, sesionId: 'x', slot, ts: slot * 10 + n, peso: 50, reps: 8, rir: 2 });

test('G124 · el orden: sin s.orden, el de la rutina; con s.orden, el tuyo y sin perder huecos', () => {
  estado.series = [];
  const s = sesion();
  assert.deepEqual(ordenDe(s), [0, 1, 2]);
  s.orden = [2, 0];
  assert.deepEqual(ordenDe(s), [2, 0, 1]);
  assert.equal(siguienteHueco(s, 2), 2);
  assert.equal(siguienteTras(s, 2), 0);
  assert.equal(siguienteTras(s, 1), 2);
});
test('G124 · «Luego»: la máquina está ocupada y el ejercicio va al final', () => {
  estado.series = [];
  const s = sesion();
  mandarAlFinal(s, 0);
  assert.deepEqual(ordenDe(s), [1, 2, 0]);
  assert.equal(siguienteHueco(s, 1), 1);
});
test('G124 · «Hasta aquí»: 3 de 4 y pasas al siguiente; lo que falta queda apuntado como quitado', () => {
  estado.series = [serie(0, 0), serie(0, 1), serie(0, 2)];
  const s = sesion();
  s.prep = { i: 0, n: 3 };
  hastaAqui(s, 0);
  assert.equal(s.plan[0].series, 3);
  assert.equal(s.plan[0].quitadas, 1);
  assert.equal(s.prep, undefined);
  assert.equal(siguienteHueco(s, 0), 1);
  assert.ok(huecoVivo(s, 0));
});
test('G124 · «Quitar por hoy» sin series: el hueco deja de verse; si no queda nada, la molienda está hecha', () => {
  estado.series = [serie(0, 0), serie(0, 1), serie(0, 2), serie(0, 3), serie(1, 0), serie(1, 1), serie(1, 2)];
  const s = sesion();
  assert.ok(quedaAlgo(s));
  hastaAqui(s, 2);
  assert.equal(huecoVivo(s, 2), false);
  assert.equal(siguienteHueco(s, 0), -1);
  assert.equal(quedaAlgo(s), false);
});
