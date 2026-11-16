// R15 · El planificador de la semana flexible (versión 1.1 del libro).
import { IDS_MUSCULOS } from './musculos.js';
import { CATALOGO, ejercicio } from './ejercicios.js';
import { volumen, volumenPlantilla, TOPE_SESION } from './volumen.js';
import { lunesDe, diasEntre, diaSemana, sumarDias } from './fechas.js';

const HORA = 3600000;
const r5 = (x) => Math.round(x * 2) / 2;

/**
 * R15 · Media de sesiones por semana en las últimas 4 semanas completas (para estimar las que quedan).
 * Sin historial, 3 (a medio camino de lo que Sergio dice que va: 1-4). Diseño de Gofio (⚪).
 */
export function mediaSemanal(fechas, hoy, semanas = 4) {
  const lunes = lunesDe(hoy);
  const desde = sumarDias(lunes, -7 * semanas);
  const dias = new Set(fechas.filter((f) => f >= desde && f < lunes));
  if (!fechas.some((f) => f < lunes)) return 3;
  return dias.size / semanas;
}

/**
 * R15 · Qué sesión toca hoy.
 * @param {object} p
 * @param {object} p.plantilla       plantilla ideal (R15.1: define el objetivo semanal por músculo con R9)
 * @param {object[]} p.series        series hechas: {ejercicioId, fecha, ts}
 * @param {object[]} p.sesiones      sesiones hechas: {fecha, diaId}
 * @param {string} p.hoy             'AAAA-MM-DD'
 * @param {number} p.ahora           marca de tiempo (ms) para la frescura de 48 h
 * @param {number|null} p.diasPorSemana  lo que Sergio cree que irá; null = su media (R15.4)
 * @param {number} p.minutos         duración de la sesión (R15.7: ≈ 3 min por serie)
 */
export function planificar({ plantilla, series = [], sesiones = [], hoy, ahora, diasPorSemana = null, minutos, catalogo = CATALOGO }) {
  const lunes = lunesDe(hoy);
  const semana = series.filter((s) => s.fecha >= lunes && s.fecha < hoy);
  const sesSemana = sesiones.filter((s) => s.fecha >= lunes && s.fecha < hoy);
  // 1 · Deuda por músculo = objetivo semanal − series fraccionales ya hechas esta semana.
  const objetivo = volumenPlantilla(plantilla, catalogo);
  const hecho = volumen(semana.map((s) => ({ ejercicioId: s.ejercicioId })), catalogo);
  const deuda = {}, relativa = {};
  for (const m of IDS_MUSCULOS) {
    deuda[m] = Math.max(0, objetivo[m] - hecho[m]);
    relativa[m] = objetivo[m] > 0 ? deuda[m] / objetivo[m] : 0;
  }
  // 2 · Frescura: ≥6 series fraccionales en las últimas 48 h = «cansado» (pesa la mitad).
  const t = ahora ?? Date.parse(hoy + 'T12:00:00');
  const recientes = volumen(series.filter((s) => s.ts != null && t - s.ts < 48 * HORA && t - s.ts >= 0)
    .map((s) => ({ ejercicioId: s.ejercicioId })), catalogo);
  const frescura = Object.fromEntries(IDS_MUSCULOS.map((m) => [m, recientes[m] >= 6 ? 0.5 : 1]));
  // 3 · Puntuación de cada día = Σ min(lo que da ese día, la deuda) × frescura × deuda relativa.
  //     (v1.1: la deuda relativa hace que gane el músculo que va más atrasado, no el que tiene el objetivo más grande.)
  const aporteDia = Object.fromEntries(plantilla.dias.map((d) => [d.id, volumen(d.ejercicios, catalogo)]));
  const puntuar = (ap) => IDS_MUSCULOS.reduce((s, m) => s + Math.min(ap[m], deuda[m]) * frescura[m] * relativa[m], 0);
  const puntuaciones = Object.fromEntries(plantilla.dias.map((d) => [d.id, puntuar(aporteDia[d.id])]));
  // 4 · Sesiones que quedan esta semana (contando la de hoy).
  const hechas = new Set(sesSemana.map((s) => s.fecha)).size;
  const esperadas = diasPorSemana ?? Math.max(1, Math.round(mediaSemanal(sesiones.map((s) => s.fecha), hoy)));
  const diasQuedan = 7 - diaSemana(hoy);
  const quedan = Math.max(1, Math.min(diasQuedan, esperadas - hechas));
  // Días de la plantilla que aún no se han hecho esta semana.
  const hechosIds = new Set(sesSemana.map((s) => s.diaId));
  let pendientes = plantilla.dias.filter((d) => !hechosIds.has(d.id));
  if (!pendientes.length) pendientes = plantilla.dias; // semana completa: se sigue la rotación
  // Rotación: el día que sigue al último que se hizo (de cualquier semana).
  const ultima = [...sesiones].filter((s) => s.fecha < hoy && plantilla.dias.some((d) => d.id === s.diaId))
    .sort((a, b) => (a.fecha < b.fecha ? -1 : 1)).pop();
  const orden = plantilla.dias.map((d) => d.id);
  const desde = ultima ? (orden.indexOf(ultima.diaId) + 1) % orden.length : 0;
  const rotacion = [...orden.slice(desde), ...orden.slice(0, desde)].filter((id) => pendientes.some((d) => d.id === id));
  // Lo que se entrenó ayer (para explicar el porqué).
  const ayer = sesiones.find((s) => diasEntre(s.fecha, hoy) === 1);
  const base = { deuda, objetivo, hecho, frescura, puntuaciones, quedan, esperadas, pendientes: pendientes.map((d) => d.id), ayer: ayer?.diaId ?? null };

  // 5 · Quedan tantas sesiones como días por hacer → el siguiente de la rotación.
  if (quedan >= pendientes.length) {
    return { ...base, tipo: 'dia', diaId: rotacion[0], razon: 'rotacion', motivo: motivo(aporteDia[rotacion[0]], deuda, relativa, frescura) };
  }
  // 6 · Quedan menos → el de más puntuación (a igualdad, el de la rotación).
  const mejor = rotacion.reduce((b, id) => (puntuaciones[id] > puntuaciones[b] + 1e-9 ? id : b), rotacion[0]);
  // 7 · Una sola sesión y deuda grande repartida en varios días → sesión combinada.
  if (quedan === 1 && pendientes.length >= 2) {
    const grandes = IDS_MUSCULOS.filter((m) => relativa[m] >= 0.5 && deuda[m] >= 3);
    const total = grandes.reduce((s, m) => s + deuda[m], 0);
    const cubre = grandes.reduce((s, m) => s + Math.min(aporteDia[mejor][m], deuda[m]), 0);
    if (grandes.length >= 3 && cubre < 0.5 * total) {
      const combinada = sesionCombinada({ pendientes, deuda, relativa, frescura, minutos: minutos ?? plantilla.minutos ?? 75, catalogo });
      return { ...base, tipo: 'combinada', diaId: null, razon: 'combinada', ejercicios: combinada, grandes,
        motivo: motivo(volumen(combinada, catalogo), deuda, relativa, frescura) };
    }
  }
  return { ...base, tipo: 'dia', diaId: mejor, razon: 'puntuacion', motivo: motivo(aporteDia[mejor], deuda, relativa, frescura) };
}

/** R15.8 · El porqué: el músculo al que más ayuda la sesión elegida y cuántas series le faltan. */
function motivo(ap, deuda, relativa, frescura) {
  let m = null, mejor = -1;
  for (const k of IDS_MUSCULOS) {
    const v = Math.min(ap[k], deuda[k]) * frescura[k] * (relativa[k] || 0);
    if (v > mejor) { mejor = v; m = k; }
  }
  return { musculo: mejor > 0 ? m : null, faltan: m ? r5(deuda[m]) : 0 };
}

/**
 * R15.7 · Sesión combinada: los multiarticulares de los músculos más atrasados, hasta llenar el tiempo
 * (≈ 3 min por serie) y sin pasar de ~11 fraccionales por músculo (R10). Si sobra tiempo, aislamiento.
 * No entra un ejercicio cuyos músculos principales estén todos cansados (R15.2), ni dos del mismo patrón.
 */
export function sesionCombinada({ pendientes, deuda, relativa, frescura, minutos = 75, catalogo = CATALOGO }) {
  const maxSeries = Math.floor(minutos / 3);
  const resto = { ...deuda };
  const carga = Object.fromEntries(IDS_MUSCULOS.map((m) => [m, 0]));
  const vistos = new Set();
  const candidatos = pendientes.flatMap((d) => d.ejercicios).filter((e) => !vistos.has(e.ej) && vistos.add(e.ej));
  const elegidos = [];
  let total = 0;
  const ganancia = (e, n) => Object.entries(ejercicio(e.ej, catalogo).musculos)
    .reduce((s, [m, f]) => s + Math.min(f * n, resto[m]) * frescura[m] * (relativa[m] || 0), 0);
  const cabe = (e, n) => Object.entries(ejercicio(e.ej, catalogo).musculos).every(([m, f]) => carga[m] + f * n <= TOPE_SESION + 1e-9);
  for (const tipo of ['multi', 'aislamiento']) {
    for (;;) {
      let best = null;
      for (const e of candidatos) {
        const ej = ejercicio(e.ej, catalogo);
        if (elegidos.some((x) => x.ej === e.ej || ejercicio(x.ej, catalogo).patron === ej.patron) || ej.tipo !== tipo) continue;
        // No se repite como músculo principal uno que está cansado (R15.2).
        if (Object.entries(ej.musculos).filter(([, f]) => f === 1).every(([m]) => frescura[m] < 1)) continue;
        let n = Math.min(e.series, maxSeries - total);
        while (n > 0 && !cabe(e, n)) n--;
        if (n < 2) continue;
        const g = ganancia(e, n) / n; // rendimiento por serie
        if (g > 0 && (!best || g > best.g)) best = { e, n, g };
      }
      if (!best) break;
      elegidos.push({ ...best.e, series: best.n });
      total += best.n;
      for (const [m, f] of Object.entries(ejercicio(best.e.ej, catalogo).musculos)) { carga[m] += f * best.n; resto[m] = Math.max(0, resto[m] - f * best.n); }
      if (total >= maxSeries) break;
    }
  }
  return elegidos;
}
