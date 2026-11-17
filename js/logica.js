// Une el cerebro (las reglas) con los datos guardados: qué toca hoy, cuánto peso, qué viene después.
import * as G from './cerebro/index.js';
import * as D from './datos.js';

export const estado = { ajustes: {}, sesiones: [], series: [], notas: {} };

// R24 · Descanso entre series (libro v1.1): 2:30 en multiarticulares y 1:30 en aislamiento por defecto.
export const DESCANSO_POR_DEFECTO = { multi: 150, aislamiento: 90 };

export const ajuste = (clave) => {
  const a = estado.ajustes;
  switch (clave) {
    case 'plantilla': return a.plantilla ?? G.PLANTILLA_SERGIO;
    case 'escalones': return { ...G.ESCALONES_POR_DEFECTO, ...(a.escalones ?? {}) };
    case 'descanso': return { ...DESCANSO_POR_DEFECTO, ...(a.descanso ?? {}) };
    case 'minutos': return a.minutos ?? 75;
    case 'objetivo': return a.objetivo ?? 'recomposicion';
    case 'diasPorSemana': return a.diasPorSemana ?? null;
    case 'cargasIniciales': return a.cargasIniciales ?? {};
    case 'perfil': return a.perfil ?? {};
    case 'recordatorio': return a.recordatorio ?? true;
    default: return a[clave];
  }
};
export async function ponerAjuste(clave, valor) { estado.ajustes[clave] = valor; await D.ponerAjuste(clave, valor); }

export async function arrancar() { Object.assign(estado, await D.cargar()); }

export const hoy = () => G.hoyLocal();
export const sesionesHechas = () => estado.sesiones.filter((s) => s.estado === 'hecha');
export const sesionEnCurso = () => estado.sesiones.find((s) => s.estado === 'en-curso') ?? null;
export const seriesDe = (sesionId) => estado.series.filter((s) => s.sesionId === sesionId);
const idsHechas = () => new Set(sesionesHechas().map((s) => s.id));
export const seriesHechas = () => { const ids = idsHechas(); return estado.series.filter((s) => ids.has(s.sesionId)); };
export const escalonDe = (ejId) => ajuste('escalones')[G.ejercicio(ejId).equipo] ?? 2.5;
export const descansoDe = (ejId) => ajuste('descanso')[G.ejercicio(ejId).tipo === 'multi' ? 'multi' : 'aislamiento'];

/** La última vez que se hizo un ejercicio (en una sesión terminada): sus series en orden. */
export function ultimaVez(ejId, antesDe = Infinity, { sinDiaMalo = false } = {}) {
  let ids = idsHechas();
  // R21: un día malo lleva más margen a propósito; para progresar (R12) se mira la última sesión normal, si la hay.
  // Lo mismo con la semana de descarga (R13): su −10 % y su margen no hacen subir ni bajar el peso de después.
  if (sinDiaMalo) {
    const normales = new Set(sesionesHechas().filter((x) => x.modo !== 'dia-malo' && x.modo !== 'descarga').map((x) => x.id));
    if (estado.series.some((x) => x.ejercicioId === ejId && normales.has(x.sesionId) && x.ts < antesDe)) ids = normales;
  }
  const s = estado.series.filter((x) => x.ejercicioId === ejId && ids.has(x.sesionId) && x.ts < antesDe);
  if (!s.length) return null;
  const sesionId = s[s.length - 1].sesionId;
  const series = s.filter((x) => x.sesionId === sesionId).sort((a, b) => a.ts - b.ts);
  return { sesionId, fecha: series[0].fecha, peso: series[series.length - 1].peso, series };
}

/** R14 · La vuelta según las fechas de sesiones terminadas. */
export const vueltaHoy = () => G.vuelta(sesionesHechas().map((s) => s.fecha), hoy());

/**
 * La prescripción de un ejercicio: peso, repeticiones de cada serie y RIR objetivo.
 * R12 (doble progresión) sobre la última vez → R14 (vuelta) → R21 (día malo) si toca.
 */
export function prescripcion(slot, vuelta = vueltaHoy()) {
  const ej = G.ejercicio(slot.ej);
  const escalon = escalonDe(slot.ej);
  const uv = ultimaVez(slot.ej, Infinity, { sinDiaMalo: true });
  let p;
  if (uv) {
    const r = G.proximaVez({ peso: uv.peso, series: uv.series, repMin: slot.repMin, repMax: slot.repMax, tipo: ej.tipo, escalon });
    p = { peso: r.peso, accion: r.accion, rir: r.rir, reps: Array.from({ length: slot.series }, (_, i) => r.reps[i] ?? r.reps[r.reps.length - 1] ?? slot.repMin), otraVez: uv };
  } else {
    const inicial = ajuste('cargasIniciales')[slot.ej];
    p = { peso: inicial ?? null, accion: inicial != null ? 'inicial' : 'primera', rir: G.rirObjetivo(ej.tipo), reps: Array(slot.series).fill(slot.repMin), otraVez: null };
  }
  p.series = slot.series;
  let conVuelta = G.aplicarVuelta(p, vuelta, escalon);
  // R13 · Semana de descarga: la mitad de series, −10 % y dos más de margen (no se suma a una vuelta larga, que ya afloja).
  if (descargaActiva() && vuelta.tipo !== 'larga' && !slot.diaMalo) conVuelta = { ...G.aplicarDescarga(conVuelta, escalon), descarga: true };
  if (vuelta.tipo === 'larga' || conVuelta.descarga) conVuelta.reps = conVuelta.reps.slice(0, conVuelta.series);
  if (slot.diaMalo) { conVuelta.rir = slot.rir; conVuelta.series = slot.series; conVuelta.reps = conVuelta.reps.slice(0, slot.series); }
  return { ...conVuelta, vuelta: vuelta.tipo };
}

/** R15 · Qué toca hoy (y el porqué), con la plantilla del usuario. */
export function planDeHoy(fecha = hoy(), ahora = Date.now()) {
  const plantilla = ajuste('plantilla');
  const plan = G.planificar({
    plantilla, series: seriesHechas(), sesiones: sesionesHechas(), hoy: fecha, ahora,
    diasPorSemana: ajuste('diasPorSemana'), diasPorDefecto: ajuste('diasDisponibles') ?? 3, minutos: ajuste('minutos'),
  });
  const ejercicios = plan.tipo === 'combinada' ? plan.ejercicios : G.diaDe(plantilla, plan.diaId).ejercicios;
  return { ...plan, nombre: plan.tipo === 'combinada' ? 'Combinada' : G.diaDe(plantilla, plan.diaId).nombre, ejercicios };
}

// Nombres cortos para hablar de tú a tú.
const CORTO = { pecho: 'pecho', dorsal: 'espalda', 'hombro-anterior': 'hombro', 'hombro-lateral': 'hombro', 'hombro-posterior': 'hombro de atrás',
  biceps: 'bíceps', triceps: 'tríceps', cuadriceps: 'cuádriceps', isquios: 'isquios', gluteo: 'glúteo', gemelos: 'gemelos', abdomen: 'abdomen' };
export const musculoCorto = (m) => CORTO[m] ?? m;

// Lo que va corto, dicho como en casa (El alma: «Te toca: la pierna va corta esta semana.»).
const VA_CORTO = { pecho: 'el pecho va corto', dorsal: 'la espalda va corta', 'hombro-anterior': 'el hombro va corto', 'hombro-lateral': 'el hombro va corto',
  'hombro-posterior': 'el hombro de atrás va corto', biceps: 'el bíceps va corto', triceps: 'el tríceps va corto', cuadriceps: 'la pierna va corta',
  isquios: 'la pierna va corta', gluteo: 'el glúteo va corto', gemelos: 'los gemelos van cortos', abdomen: 'el abdomen va corto' };

/** R15.8 · El porqué en una frase corta. */
export function porQue(plan) {
  const { musculo } = plan.motivo ?? {};
  if (!musculo) return 'Semana hecha. Lo de hoy, de regalo.';
  if (plan.tipo === 'combinada') return 'Última de la semana: lo que más falta, junto.';
  return `Te toca: ${VA_CORTO[musculo] ?? `${musculoCorto(musculo)} va corto`} esta semana.`;
}

/** Empieza una sesión con una lista de ejercicios. */
export async function empezarSesion({ diaId, nombre, ejercicios, modo = 'normal' }) {
  const vuelta = vueltaHoy();
  const s = {
    id: D.id(), fecha: hoy(), diaId, nombre, modo, vuelta: vuelta.tipo, inicio: Date.now(), fin: null, estado: 'en-curso',
    plan: ejercicios.map((e) => ({ ej: e.ej, series: e.series, repMin: e.repMin, repMax: e.repMax, ...(e.diaMalo ? { diaMalo: true, rir: e.rir } : {}) })),
  };
  // La vuelta larga recorta series desde el principio (R14); la descarga, a la mitad (R13).
  if (vuelta.tipo === 'larga') s.plan = s.plan.map((p) => ({ ...p, series: Math.max(1, Math.round(p.series * vuelta.factorSeries)) }));
  else if (descargaActiva() && modo !== 'dia-malo') { s.modo = 'descarga'; s.plan = s.plan.map((p) => ({ ...p, series: Math.max(1, Math.round(p.series / 2)) })); }
  estado.sesiones.push(s);
  await D.guardar('sesiones', s);
  return s;
}
export async function guardarSesion(s) { await D.guardar('sesiones', s); }

/** Series ya hechas en un hueco (slot) de la sesión. */
export const seriesDelHueco = (sesion, i) => seriesDe(sesion.id).filter((x) => x.slot === i).sort((a, b) => a.ts - b.ts);
/** El siguiente hueco con series pendientes, empezando por `desde`. */
export function siguienteHueco(sesion, desde = 0) {
  const n = sesion.plan.length;
  for (let k = 0; k < n; k++) {
    const i = (desde + k) % n;
    if (seriesDelHueco(sesion, i).length < sesion.plan[i].series) return i;
  }
  return -1;
}

export async function guardarSerie(sesion, i, { peso, reps, rir }) {
  const s = { id: D.id(), sesionId: sesion.id, slot: i, ejercicioId: sesion.plan[i].ej, fecha: sesion.fecha, ts: Date.now(), peso, reps, rir };
  estado.series.push(s);
  await D.guardar('series', s);
  return s;
}
export async function borrarSerie(serie) {
  estado.series = estado.series.filter((s) => s.id !== serie.id);
  await D.borrar('series', serie.id);
}

/** Deshace una sesión empezada sin ninguna serie (no cuenta como entreno). */
export async function descartarSesion(sesion) {
  estado.sesiones = estado.sesiones.filter((s) => s.id !== sesion.id);
  await D.borrar('sesiones', sesion.id);
}

export async function terminarSesion(sesion) {
  if (!seriesDe(sesion.id).length) { // sin series: no cuenta como entreno
    estado.sesiones = estado.sesiones.filter((s) => s.id !== sesion.id);
    await D.borrar('sesiones', sesion.id);
    return null;
  }
  sesion.estado = 'hecha'; sesion.fin = Date.now();
  await D.guardar('sesiones', sesion);
  return sesion;
}

export async function ponerNota(ejId, texto) {
  if (!texto?.trim()) { delete estado.notas[ejId]; await D.borrar('notas', ejId); return; }
  const n = { ejercicioId: ejId, texto: texto.trim(), ts: Date.now() };
  estado.notas[ejId] = n; await D.guardar('notas', n);
}

/** Resumen de una sesión terminada (para «Molienda hecha» y «Mi semana»). */
export function resumen(sesion) {
  const ss = seriesDe(sesion.id);
  const minutos = Math.max(1, Math.round(((sesion.fin ?? Date.now()) - sesion.inicio) / 60000));
  const ejercicios = [...new Set(ss.map((s) => s.ejercicioId))];
  // Lo mejor de hoy: la mayor subida de fuerza estimada (R11) frente a la vez anterior.
  let mejor = null;
  for (const ej of ejercicios) {
    const mias = ss.filter((s) => s.ejercicioId === ej);
    const hoyE = G.mejorE1rm(mias);
    const antes = ultimaVez(ej, Math.min(...mias.map((s) => s.ts)));
    const previo = antes ? G.mejorE1rm(antes.series) : null;
    const historico = Math.max(0, ...estado.series.filter((s) => s.ejercicioId === ej && s.sesionId !== sesion.id && s.ts < mias[0].ts).map((s) => G.e1rm(s.peso, s.reps, s.rir)));
    const delta = previo != null ? hoyE - previo : null;
    const marca = historico > 0 && hoyE > historico + 0.01;
    const cand = { ej, hoyE, delta, marca, top: mias.reduce((a, b) => (G.e1rm(b.peso, b.reps, b.rir) > G.e1rm(a.peso, a.reps, a.rir) ? b : a)) };
    if (delta != null && (!mejor || delta > (mejor.delta ?? -Infinity))) mejor = cand;
  }
  return { series: ss.length, minutos, ejercicios: ejercicios.length, mejor, duro: ss.length >= 20 || minutos >= 70 || sesion.modo === 'dia-malo' };
}

// ── v0.2 · Progresión ──────────────────────────────────────────────────────────

/** R13 · ¿Hay una semana de descarga en marcha? (la empieza Sergio desde Progreso; dura 7 días). */
export function descargaActiva(fecha = hoy()) {
  const d = ajuste('descarga');
  return !!d && fecha >= d.desde && fecha <= d.hasta;
}
export async function empezarDescarga() {
  await ponerAjuste('descarga', { desde: hoy(), hasta: G.sumarDias(hoy(), G.DIAS_DESCARGA - 1) });
}
export async function terminarDescarga() { await ponerAjuste('descarga', null); }
export async function apartarDescarga() { await ponerAjuste('descargaApartada', hoy()); }

/** Las sesiones que cuentan para la tendencia de fuerza: las normales (sin día malo ni descarga, como en R12). */
const sesionesNormales = () => new Set(sesionesHechas().filter((x) => x.modo !== 'dia-malo' && x.modo !== 'descarga').map((x) => x.id));

/**
 * R11 + R12 · La fuerza de cada ejercicio hecho en las últimas `semanas` semanas: su serie por sesión, su estado,
 * su fuerza de ahora y cuánto ha cambiado en esa ventana (diseño de Gofio: 6 semanas).
 */
export function fuerzaEjercicios(semanas = 6, fecha = hoy()) {
  const desde = G.sumarDias(fecha, -7 * semanas + 1);
  const normales = sesionesNormales();
  const porEj = new Map();
  for (const s of estado.series) {
    if (!normales.has(s.sesionId)) continue;
    if (!porEj.has(s.ejercicioId)) porEj.set(s.ejercicioId, []);
    porEj.get(s.ejercicioId).push(s);
  }
  const res = [];
  const fechasGym = sesionesHechas().map((x) => x.fecha);
  for (const [ej, xs] of porEj) {
    const todas = G.fuerzaPorSesion(xs);
    const ventana = todas.filter((x) => x.fecha >= desde);
    if (!ventana.length) continue;
    const estadoF = G.estadoFuerza(todas, fechasGym);
    res.push({ ej, sesiones: ventana, todas, estado: estadoF, ahora: ventana.at(-1).e1rm, cambio: ventana.length > 1 ? ventana.at(-1).e1rm - ventana[0].e1rm : null, ultima: ventana.at(-1).fecha });
  }
  // Primero lo que se hizo hace menos.
  return res.sort((a, b) => (a.ultima < b.ultima ? 1 : a.ultima > b.ultima ? -1 : 0));
}

/** R13 · ¿Toca proponer una descarga? (y no si ya está en marcha o se apartó hace menos de una semana). */
export function propuestaDescarga(fuerza = fuerzaEjercicios()) {
  if (descargaActiva()) return null;
  const apartada = ajuste('descargaApartada');
  if (apartada && G.diasEntre(apartada, hoy()) < 7) return null;
  const hechas = sesionesHechas();
  const r = G.senalesDescarga({
    atascados: fuerza.filter((f) => f.estado === 'atascado').length,
    sensaciones: hechas.map((x) => x.sensacion ?? null),
    fechas: hechas.map((x) => x.fecha), hoy: hoy(),
  });
  return r.proponer ? r : null;
}

/** Guarda cómo dejó una molienda (R13.2): 'entero', 'molido' o 'molesta'. */
export async function ponerSensacion(sesion, valor) { sesion.sensacion = valor; await D.guardar('sesiones', sesion); }

/** Una copia editable de la plantilla (la de Sergio vive en el código: se copia a Ajustes al primer cambio). */
const plantillaEditable = () => JSON.parse(JSON.stringify(ajuste('plantilla')));
/** R12 → R22 · Cambia un ejercicio atascado por otro del mismo patrón en toda la plantilla. */
export async function cambiarEnPlantilla(viejo, nuevo) {
  const p = plantillaEditable();
  for (const d of p.dias) for (const e of d.ejercicios) if (e.ej === viejo) e.ej = nuevo;
  await ponerAjuste('plantilla', p);
}
/** R12 · Baja el rango de repeticiones de un ejercicio atascado en toda la plantilla. */
export async function cambiarRango(ej, { repMin, repMax }) {
  const p = plantillaEditable();
  for (const d of p.dias) for (const e of d.ejercicios) if (e.ej === ej) { e.repMin = repMin; e.repMax = repMax; }
  await ponerAjuste('plantilla', p);
}
/** El rango que tiene un ejercicio en la plantilla (el primero que aparece). */
export const rangoEnPlantilla = (ej) => ajuste('plantilla').dias.flatMap((d) => d.ejercicios).find((e) => e.ej === ej) ?? null;
/** El hueco de plantilla de un ejercicio, para pedir su prescripción (R12) desde Progreso. */
export const huecoDe = (ej) => { const e = rangoEnPlantilla(ej); return e ? { ...e } : { ej, series: 3, repMin: 8, repMax: 12 }; };
