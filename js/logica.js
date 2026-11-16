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
  if (sinDiaMalo) {
    const normales = new Set(sesionesHechas().filter((x) => x.modo !== 'dia-malo').map((x) => x.id));
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
  const conVuelta = G.aplicarVuelta(p, vuelta, escalon);
  if (vuelta.tipo === 'larga') conVuelta.reps = conVuelta.reps.slice(0, conVuelta.series);
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

/** R15.8 · El porqué en una frase corta. */
export function porQue(plan) {
  const plantilla = ajuste('plantilla');
  const ayer = plan.ayer ? G.diaDe(plantilla, plan.ayer)?.nombre?.toLowerCase() : null;
  const { musculo } = plan.motivo ?? {};
  if (!musculo) return 'Semana hecha. Lo de hoy, de regalo.';
  if (plan.tipo === 'combinada') return `Última de la semana: lo que más falta, junto.`;
  const base = `Vas corto de ${musculoCorto(musculo)}.`;
  if (ayer) return `${base} Ayer, ${ayer}.`;
  if (plan.razon === 'rotacion') return `${base} Te toca por orden.`;
  return base;
}

/** Empieza una sesión con una lista de ejercicios. */
export async function empezarSesion({ diaId, nombre, ejercicios, modo = 'normal' }) {
  const vuelta = vueltaHoy();
  const s = {
    id: D.id(), fecha: hoy(), diaId, nombre, modo, vuelta: vuelta.tipo, inicio: Date.now(), fin: null, estado: 'en-curso',
    plan: ejercicios.map((e) => ({ ej: e.ej, series: e.series, repMin: e.repMin, repMax: e.repMax, ...(e.diaMalo ? { diaMalo: true, rir: e.rir } : {}) })),
  };
  // La vuelta larga recorta series desde el principio (R14).
  if (vuelta.tipo === 'larga') s.plan = s.plan.map((p) => ({ ...p, series: Math.max(1, Math.round(p.series * vuelta.factorSeries)) }));
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
