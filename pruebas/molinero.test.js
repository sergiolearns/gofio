// Libro de reglas 1.5 (La brega): R28 Arrimar, R29 Lo que queda, R30 Tostar, los ánimos y las leyes de la piedra.
// Además de los casos, PRUEBAS DE PROPIEDADES: miles de moliendas inventadas al azar (con semilla fija, para que se
// puedan repetir) y en todas se comprueba que las leyes se cumplen. Así no hace falta prever cada caso a mano.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../js/cerebro/index.js';

// Azar con semilla (mulberry32): las mismas moliendas cada vez que se corre la prueba.
function azar(semilla) {
  let a = semilla >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const elige = (r, l) => l[Math.floor(r() * l.length)];
const ESCALONES = [1, 2, 2.5, 5, [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22.5, 25, 27.5, 30, 32.5, 35, 37.5, 40]];

test('R28 · el ejemplo de Sergio: propone 45 y 67,5; haces 80 → directo a la de trabajo', () => {
  const base = { trabajo: 90, escalon: 2.5, tipo: 'multi', repsObjetivo: 9 };
  const a = G.arrimar(base);
  assert.deepEqual(a.piedras, [{ peso: 45, reps: 8 }, { peso: 67.5, reps: 4 }]);
  const b = G.arrimar({ ...base, hechas: [{ peso: 80, reps: 8 }] });
  assert.deepEqual(b.piedras, []); assert.equal(b.vasFuerte, true);
});
test('R28 · con 100 de trabajo y 80 hecho, la siguiente piedra por encima de 80 (82,5 × 2) y luego la de trabajo', () => {
  const b = G.arrimar({ trabajo: 100, escalon: 2.5, tipo: 'multi', repsObjetivo: 9, hechas: [{ peso: 80, reps: 8 }] });
  assert.deepEqual(b.piedras, [{ peso: 82.5, reps: 2 }]); assert.equal(b.vasFuerte, true);
});
test('R28 · cuántas piedras: ligero, ninguna; 10 o más reps o aislamiento, una; multi, dos; pesado, tres', () => {
  assert.equal(G.arrimar({ trabajo: 8, escalon: 2.5, tipo: 'multi', repsObjetivo: 8 }).piedras.length, 0);
  assert.equal(G.arrimar({ trabajo: 30, escalon: 2.5, tipo: 'aislamiento', repsObjetivo: 12 }).piedras.length, 1);
  assert.equal(G.arrimar({ trabajo: 100, escalon: 2.5, tipo: 'multi', repsObjetivo: 9 }).piedras.length, 2);
  assert.deepEqual(G.arrimar({ trabajo: 100, escalon: 2.5, tipo: 'multi', repsObjetivo: 8 }).piedras, [{ peso: 50, reps: 8 }, { peso: 70, reps: 4 }, { peso: 87.5, reps: 2 }]);
});
test('R28 · tu jeito: si 2 de las 3 últimas arrimaste igual, ese es tu estilo; si no arrimas, no te lo propone', () => {
  const h = [{ trabajo: 180, piedras: [{ peso: 90 }, { peso: 135 }, { peso: 160 }] }, { trabajo: 175, piedras: [{ peso: 87.5 }, { peso: 130 }, { peso: 155 }] }, { trabajo: 170, piedras: [{ peso: 85 }] }];
  const e = G.estiloArrimar(h);
  assert.equal(e.n, 3);
  assert.equal(G.arrimar({ trabajo: 180, escalon: 2.5, tipo: 'multi', repsObjetivo: 12, estilo: e }).piedras.length, 3);
  assert.deepEqual(G.estiloArrimar([{ trabajo: 30, piedras: [] }, { trabajo: 30, piedras: [] }]), { n: 0, fracs: [] });
  assert.equal(G.estiloArrimar([{ trabajo: 30, piedras: [{ peso: 15 }] }]), null);
});
test('R28 · con lastre poco, una sin lastre (G109)', () => {
  assert.deepEqual(G.arrimar({ trabajo: 2, escalon: 2.5, lastre: true }).piedras, [{ peso: 0, reps: 5 }]);
});

test('R29 · margen: sobra mucho y estás arriba del rango → +1 escalón; sobra mucho → una más; corto → −1', () => {
  const b = { repsObjetivo: 12, repMin: 10, repMax: 12, tipo: 'multi', escalon: 2.5 };
  assert.deepEqual(G.siguienteSerie({ ...b, hecha: { peso: 180, reps: 13, rir: 4 } }).senal, 'sube');
  assert.equal(G.siguienteSerie({ ...b, hecha: { peso: 180, reps: 13, rir: 4 } }).peso, 182.5);
  assert.equal(G.siguienteSerie({ ...b, hecha: { peso: 180, reps: 12, rir: 4 } }).senal, 'igual'); // margen 2: igual
  { const x = G.siguienteSerie({ ...b, repsObjetivo: 10, hecha: { peso: 180, reps: 11, rir: 4 } }); assert.deepEqual([x.peso, x.reps, x.senal, x.margen], [180, 12, 'mas', 3]); }
  assert.equal(G.siguienteSerie({ ...b, hecha: { peso: 180, reps: 9, rir: 0 } }).senal, 'baja');
  assert.equal(G.siguienteSerie({ ...b, hecha: { peso: 180, reps: 12, rir: 2 } }).senal, 'igual');
});
test('R29 · ley 7: no sube si pasaría de un 10 % sobre tu mejor fuerza reciente', () => {
  const r = G.siguienteSerie({ repsObjetivo: 12, repMin: 10, repMax: 12, tipo: 'multi', escalon: 2.5, hecha: { peso: 180, reps: 13, rir: 4 }, mejorReciente: 200 });
  assert.equal(r.peso, 180);
});

test('Ánimos · nunca de otro grupo: en pierna, nada de brazos; en bisagra, «Encadera»', () => {
  assert.ok(!G.animosDe('prensa', 'soltar').includes('Suelta los brazos.'));
  assert.ok(G.animosDe('peso-muerto-rumano', 'moliendo').includes('Encadera.'));
  assert.ok(G.animosDe('press-militar-maquina', 'moliendo').includes('Pulseo: la piedra arriba.'));
  assert.ok(G.animosDe('curl-alterno', 'moliendo').includes('¡Fuerte brazo!'));
  for (const e of G.EJERCICIOS) for (const m of ['moliendo', 'soltar']) assert.ok(G.animosDe(e.id, m).length >= 2, `${e.id} ${m}`);
  const r = azar(7);
  for (let k = 0; k < 200; k++) { const a = G.animo('prensa', 'moliendo', { azar: r, evitar: 'Canillas firmes.' }); assert.notEqual(a, 'Canillas firmes.'); }
});

test('R30 · Tostar: seis movimientos de las zonas del día, 5-8 minutos', () => {
  const empujes = G.tostar([{ ej: 'press-inclinado-mancuernas', series: 4 }, { ej: 'fondos-lastrados', series: 3 }, { ej: 'laterales-mancuernas', series: 4 }, { ej: 'press-frances-polea', series: 3 }]);
  assert.equal(empujes.length, 6);
  assert.ok(empujes.every((m) => ['hombros', 'escapulas', 'empuje', 'columna', 'brazos'].includes(m.zona)), JSON.stringify(empujes.map((m) => m.zona)));
  const pierna = G.tostar([{ ej: 'prensa', series: 3 }, { ej: 'peso-muerto-rumano', series: 3 }, { ej: 'gemelos-prensa', series: 3 }]);
  assert.ok(pierna.some((m) => m.zona === 'tobillos') && pierna.some((m) => m.zona === 'caderas'));
  for (const l of [empujes, pierna]) { const min = G.minutosTostar(l); assert.ok(min >= 5 && min <= 8, `${min} min`); }
  assert.ok(G.tostar([{ ej: 'prensa', series: 3 }, { ej: 'peso-muerto-rumano', series: 3 }], 'polea').some((m) => /banda/i.test(m.nombre)));
  // Calentar no es entrenar (G118): ningún movimiento es un press, un jalón, un remo ni lleva carga de barra.
  for (const modo of ['cuerpo', 'polea']) for (const m of G.tostar([{ ej: 'press-inclinado-mancuernas', series: 4 }, { ej: 'prensa', series: 3 }, { ej: 'jalon-pecho', series: 3 }], modo)) {
    assert.doesNotMatch(m.nombre, /press|jal[oó]n|remo|barra vac|peso muerto/i, m.nombre); assert.ok(m.como?.length > 10, m.id);
  }
  assert.equal(G.zonasDichas([{ zona: 'hombros' }, { zona: 'brazos' }]), 'Hombros, codos y muñecas');
});

// ── Propiedades: las leyes de la piedra en miles de moliendas al azar ──
test('Leyes 1 y 2 (Arrimar) en 4000 moliendas al azar: suben, no bajan de lo levantado, no pasan del de trabajo, menos reps al subir, como mucho 3', () => {
  const r = azar(20261117);
  for (let k = 0; k < 4000; k++) {
    const escalon = elige(r, ESCALONES);
    const trabajo = G.redondearAEscalon(5 + r() * 295, escalon, 'abajo');
    const base = { trabajo, escalon, tipo: elige(r, ['multi', 'aislamiento']), repsObjetivo: elige(r, [6, 8, 10, 12, 15]), lastre: r() < 0.1 };
    if (r() < 0.3) base.estilo = G.estiloArrimar([{ trabajo, piedras: [{ peso: trabajo * (0.3 + r() * 0.3) }, { peso: trabajo * (0.6 + r() * 0.3) }] }, { trabajo, piedras: [{ peso: trabajo * 0.5 }, { peso: trabajo * 0.8 }] }]);
    const hechas = [];
    for (let paso = 0; paso < 4; paso++) {
      const { piedras } = G.arrimar({ ...base, hechas });
      const maxHecho = hechas.length ? Math.max(...hechas.map((h) => h.peso)) : -Infinity;
      const ultimaReps = hechas.at(-1)?.reps;
      assert.ok(hechas.length + piedras.length <= G.ARRIMAR_TOPE || piedras.length === 0, `tope ${JSON.stringify({ base, hechas, piedras })}`);
      piedras.forEach((p, j) => {
        if (!base.lastre || trabajo >= 2 * G.escalonMinimo(escalon)) {
          assert.ok(p.peso < trabajo, `ley 1, no pasa del de trabajo ${JSON.stringify({ base, hechas, p })}`);
          assert.ok(p.peso > maxHecho || (p.peso === maxHecho && false) || !hechas.length, `ley 1, no baja de lo levantado ${JSON.stringify({ base, hechas, p })}`);
        }
        if (j > 0) { assert.ok(p.peso > piedras[j - 1].peso, 'ley 1, suben'); assert.ok(p.reps <= piedras[j - 1].reps, 'ley 2'); }
        if (ultimaReps != null && p.peso > maxHecho) assert.ok(p.reps <= Math.max(2, ultimaReps), `ley 2 con lo hecho ${JSON.stringify({ hechas, p })}`);
      });
      if (!piedras.length) break;
      // El usuario hace lo propuesto, o cualquier otra cosa (a veces mucho más, a veces menos).
      const prop = piedras[0];
      const u = r();
      const peso = u < 0.5 ? prop.peso : G.redondearAEscalon(Math.max(0, trabajo * r() * 1.2), escalon, 'abajo');
      hechas.push({ peso, reps: Math.max(1, Math.round(prop.reps + (r() - 0.5) * 6)) });
    }
  }
});

test('Leyes 3, 4 y 7 (Lo que queda, v1.7) en 5000 series al azar: sube como mucho un escalón, baja solo si no llegas y como mucho un 25 %, nunca más de un 10 % sobre lo mejor', () => {
  const r = azar(1715);
  for (let k = 0; k < 5000; k++) {
    const escalon = elige(r, ESCALONES);
    const repMin = elige(r, [6, 8, 10, 12]); const repMax = repMin + elige(r, [2, 3, 5]);
    const tipo = elige(r, ['multi', 'aislamiento']);
    const peso = G.redondearAEscalon(2 + r() * 250, escalon, 'abajo');
    if (!(peso > 0)) continue;
    const hecha = { peso, reps: 1 + Math.floor(r() * (repMax + 6)), rir: Math.floor(r() * 5) };
    const repsObjetivo = repMin + Math.floor(r() * (repMax - repMin + 1));
    const mejorReciente = r() < 0.5 ? 0 : G.e1rm(peso, repMax, 2) * (0.8 + r() * 0.4);
    const s = G.siguienteSerie({ hecha, repsObjetivo, repMin, repMax, tipo, escalon, mejorReciente });
    if (s.peso > peso + 1e-6) assert.ok(Math.abs(s.peso - G.siguienteEscalon(peso, escalon, +1)) < 1e-6, `ley 4 (sube) ${JSON.stringify({ hecha, s })}`);
    if (s.peso < peso - 1e-6) {
      assert.ok(s.peso >= G.redondearAEscalon(peso * 0.75, escalon, 'arriba') - 1e-6 || s.peso >= peso * 0.75 - 1e-6, `ley 4 (baja) ${JSON.stringify({ hecha, s })}`);
      const ro = G.rirObjetivo(tipo);
      const ideal = G.e1rm(peso, hecha.reps, Math.min(4, hecha.rir)) * (1 - G.FATIGA_SERIE) / (1 + (repsObjetivo + (ro.min + ro.max) / 2) / 30);
      assert.ok(ideal < peso, `ley 3 ${JSON.stringify({ hecha, s })}`);
    }
    if (s.peso > peso + 1e-6 && mejorReciente > 0) assert.ok(G.e1rm(s.peso, s.reps, G.rirObjetivo(tipo).min) <= G.TOPE_SEGURIDAD * mejorReciente + 1e-6, 'ley 7');
    assert.ok(s.reps >= repMin && s.reps <= repMax, `reps en el rango ${JSON.stringify({ hecha, s, repMin, repMax })}`);
  }
});

test('R29 v1.7 (G134) · no es lo mismo 7 que 4 al fallo: cuanto más corto, más baja (hack 100 kg, 8-10)', () => {
  const b = { repsObjetivo: 8, repMin: 8, repMax: 10, tipo: 'multi', escalon: { base: 0, paso: 5 } };
  const p = (reps) => G.siguienteSerie({ ...b, hecha: { peso: 100, reps, rir: 0 } }).peso;
  assert.equal(p(10), 100);           // 10 al fallo: las 8 con reserva, sigue
  assert.ok(p(8) < 100);              // 8 al fallo: la siguiente no llega
  assert.ok(p(7) <= p(8) && p(4) < p(7), `${p(8)} ${p(7)} ${p(4)}`);
  assert.ok(p(4) >= 75);              // tope: un 25 %
  // Con reserva no se baja aunque te pararas antes (te quedaba).
  assert.equal(G.siguienteSerie({ ...b, hecha: { peso: 100, reps: 7, rir: 3 } }).peso, 100);
});
test('R29 v1.7 · la fatiga de hoy cuenta: si la serie anterior cayó mucho, la siguiente baja más', () => {
  const b = { repsObjetivo: 8, repMin: 8, repMax: 10, tipo: 'multi', escalon: 2.5 };
  const sin = G.siguienteSerie({ ...b, hecha: { peso: 80, reps: 7, rir: 0 } }).peso;
  const con = G.siguienteSerie({ ...b, hecha: { peso: 80, reps: 7, rir: 0 }, anteriores: [{ peso: 80, reps: 10, rir: 1 }] }).peso;
  assert.ok(con <= sin);
});
test('R29 v1.7 · «Vas cayendo»: bajas el peso en cada serie y aun así no llegas', () => {
  const o = { repMin: 8, repsObjetivo: 8 };
  assert.ok(G.vasCayendo([{ peso: 120, reps: 6, rir: 0 }, { peso: 110, reps: 6, rir: 0 }, { peso: 100, reps: 7, rir: 0 }], o));
  assert.ok(!G.vasCayendo([{ peso: 100, reps: 9, rir: 1 }, { peso: 100, reps: 8, rir: 1 }, { peso: 95, reps: 8, rir: 1 }], o));
});
test('R12 (G134) · si cambiaste el peso entre series, la próxima vez se empieza por lo que dice la primera', () => {
  const r = G.proximaVez({ peso: 100, series: [{ peso: 120, reps: 6, rir: 0 }, { peso: 110, reps: 6, rir: 0 }, { peso: 100, reps: 7, rir: 0 }, { peso: 100, reps: 4, rir: 0 }], repMin: 8, repMax: 10, tipo: 'multi', escalon: { base: 0, paso: 5 } });
  assert.ok(r.mixto && r.peso < 120 && r.peso >= 100, JSON.stringify(r));
  assert.equal(r.peso, 105); // 120 × 6 al fallo ≈ 144 de fuerza → 8 con 2 de reserva ≈ 108 → 105
});
