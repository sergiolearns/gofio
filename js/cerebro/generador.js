// R25 · Proponer una rutina según los días, los minutos y el objetivo (libro v1.2).
import { IDS_MUSCULOS } from './musculos.js';
import { CATALOGO, ejercicio } from './ejercicios.js';
import { volumen, TOPE_SESION } from './volumen.js';

export const OBJETIVOS = {
  recomposicion: { nombre: 'Recomposición', texto: 'Ganar músculo y perder grasa a la vez, sin prisa' },
  'perder-grasa': { nombre: 'Perder grasa', texto: 'Bajar de peso conservando el músculo' },
  'ganar-musculo': { nombre: 'Ganar músculo', texto: 'Subir de peso despacio para crecer' },
  fuerza: { nombre: 'Fuerza', texto: 'Mover más peso en los ejercicios básicos' },
};

// Días de entreno de cada reparto: [ejercicio, series base] en su orden (multiarticulares primero).
// Las series base están pensadas para ~75 min (≈ 25 series) y se escalan con los minutos.
const D = (nombre, items) => ({ nombre, items });
const DIAS = {
  fbA: D('Cuerpo completo A', [['sentadilla-hack', 3], ['press-banca', 3], ['remo-maquina-pecho', 3], ['peso-muerto-rumano', 3], ['press-militar-maquina', 2], ['laterales-mancuernas', 3], ['curl-alterno', 2], ['extension-triceps-cuerda', 2], ['gemelos-prensa', 2]]),
  fbB: D('Cuerpo completo B', [['prensa', 3], ['press-inclinado-mancuernas', 3], ['jalon-pecho', 3], ['curl-femoral-sentado', 3], ['extension-cuadriceps', 2], ['laterales-polea', 3], ['pajaros-mancuernas', 2], ['curl-predicador', 2], ['crunch-polea', 2]]),
  fbC: D('Cuerpo completo C', [['sentadilla-bulgara', 3], ['press-convergente', 3], ['remo-barra', 3], ['curl-femoral-tumbado', 3], ['fondos-lastrados', 2], ['laterales-mancuernas', 3], ['press-frances-polea', 2], ['curl-declinado', 2], ['gemelos-de-pie', 2]]),
  torsoA: D('Torso A', [['dominadas-lastradas', 3], ['press-inclinado-mancuernas', 4], ['remo-maquina-pecho', 3], ['laterales-polea', 4], ['curl-alterno', 3], ['extension-triceps-cuerda', 3]]),
  piernaA: D('Pierna A', [['sentadilla-hack', 4], ['peso-muerto-rumano', 3], ['prensa', 3], ['curl-femoral-tumbado', 3], ['gemelos-prensa', 4], ['crunch-polea', 2]]),
  torsoB: D('Torso B', [['press-convergente', 4], ['remo-barra', 3], ['jalon-estrecho-neutro', 3], ['press-militar-maquina', 3], ['pajaros-mancuernas', 3], ['press-frances-polea', 3], ['curl-predicador', 3]]),
  piernaB: D('Pierna B', [['sentadilla-bulgara', 3], ['extension-cuadriceps', 3], ['curl-femoral-sentado', 3], ['peso-muerto-rumano-mancuernas', 3], ['gemelos-de-pie', 3], ['crunch-polea', 3]]),
  brazos: D('Brazos y hombro', [['press-militar-maquina', 3], ['laterales-mancuernas', 4], ['pajaros-mancuernas', 3], ['curl-declinado', 3], ['press-frances', 3], ['curl-polea', 2], ['extension-triceps-cuerda', 2]]),
  empujesA: D('Empujes A', [['press-banca', 4], ['press-inclinado-mancuernas', 3], ['press-militar-maquina', 3], ['laterales-mancuernas', 4], ['extension-triceps-cuerda', 3]]),
  jalonesA: D('Jalones A', [['dominadas-lastradas', 3], ['remo-barra', 3], ['jalon-estrecho-neutro', 3], ['pajaros-mancuernas', 3], ['curl-predicador', 3]]),
  empujesB: D('Empujes B', [['press-convergente', 4], ['fondos-lastrados', 3], ['laterales-polea', 4], ['cruces-polea-baja', 3], ['press-frances-polea', 3]]),
  jalonesB: D('Jalones B', [['jalon-pecho', 3], ['remo-maquina-pecho', 3], ['pullover-polea', 3], ['peck-deck-inverso', 3], ['curl-declinado', 3], ['crunch-polea', 3]]),
};
// R25 · El reparto según los días (a igual volumen la frecuencia apenas importa: Pelland y cols. 2026).
export const REPARTOS = {
  1: { nombre: 'Cuerpo completo', dias: ['fbA'] },
  2: { nombre: 'Cuerpo completo A/B', dias: ['fbA', 'fbB'] },
  3: { nombre: 'Cuerpo completo A/B/C', dias: ['fbA', 'fbB', 'fbC'] },
  4: { nombre: 'Torso y pierna', dias: ['torsoA', 'piernaA', 'torsoB', 'piernaB'] },
  5: { nombre: 'Torso y pierna + brazos', dias: ['torsoA', 'piernaA', 'torsoB', 'piernaB', 'brazos'] },
  6: { nombre: 'Empujes, jalones y pierna', dias: ['empujesA', 'jalonesA', 'piernaA', 'empujesB', 'jalonesB', 'piernaB'] },
};

/** R25 · Repeticiones según el objetivo (R11: la hipertrofia es parecida en 5-30 cerca del fallo; la fuerza prefiere cargas altas). */
function rangos(ej, posicion, objetivo) {
  const e = ejercicio(ej);
  if (e.tipo === 'multi') {
    if (objetivo === 'fuerza' && posicion < 2) return [4, 6];
    return posicion === 0 ? [6, 8] : [8, 10];
  }
  return e.lastre ? [8, 12] : [10, 15];
}

/**
 * R25 · Propone una plantilla.
 * 1) Reparto según los días (1-6). 2) Series de cada día escaladas a los minutos (≈ 3 min por serie, R15.7),
 * entre 2 y 5 por ejercicio. 3) Ningún músculo pasa de ~11 fraccionales por sesión (R10).
 * 4) Repeticiones según el objetivo. El objetivo de comida (R3-R6) no cambia el entreno.
 */
export function proponerRutina({ dias = 3, minutos = 75, objetivo = 'recomposicion' } = {}, catalogo = CATALOGO) {
  const d = Math.max(1, Math.min(6, Math.round(dias)));
  const reparto = REPARTOS[d];
  const tope = Math.max(8, Math.floor(minutos / 3));
  const construidos = reparto.dias.map((clave) => construirDia(DIAS[clave], tope, catalogo));
  equilibrar(construidos, d, tope, catalogo);
  const plantilla = {
    id: `gofio-${d}-dias-${minutos}`, nombre: `Propuesta de Gofio · ${reparto.nombre}`, minutos, objetivo, propuesta: true,
    dias: construidos.map((items, k) => ({
      id: `g${k + 1}`, nombre: DIAS[reparto.dias[k]].nombre,
      ejercicios: items.map(([ej, n], pos) => { const [a, b] = rangos(ej, pos, objetivo); return { ej, series: n, repMin: a, repMax: b }; }),
    })),
  };
  return plantilla;
}

/** Un día: series base escaladas al tiempo, sin pasar de ~11 por músculo (R10). Devuelve [[ej, series], …]. */
function construirDia(base, tope, catalogo) {
  const sumaBase = base.items.reduce((s, [, n]) => s + n, 0);
  const f = Math.min(1.25, tope / sumaBase);
  const items = base.items.map(([ej, n]) => [ej, Math.max(2, Math.min(5, Math.round(n * f)))]);
  // Si sigue sin caber en el tiempo, fuera los últimos ejercicios (los de aislamiento van al final).
  while (items.reduce((s, [, n]) => s + n, 0) > tope && items.length > 3) items.pop();
  recortarR10(items, catalogo);
  return items;
}
function recortarR10(items, catalogo) {
  for (;;) {
    const v = volumen(items.map(([ej, n]) => ({ ej, series: n })), catalogo);
    const exceso = IDS_MUSCULOS.find((m) => v[m] > TOPE_SESION);
    if (!exceso) return;
    const i = items.map(([ej], j) => [j, ejercicio(ej, catalogo).musculos[exceso] ?? 0]).filter(([, w]) => w > 0).sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
    items[i][1] -= 1;
    if (items[i][1] < 2) items.splice(i, 1);
  }
}

// R25 · Mínimos semanales que busca la propuesta (R9): la franja (10) con 3 días o más; con menos días, lo que cabe.
const PRINCIPALES = ['pecho', 'dorsal', 'hombro-lateral', 'biceps', 'triceps', 'cuadriceps', 'isquios'];
const objetivoSemanal = (m, d) => (PRINCIPALES.includes(m) ? (d >= 3 ? 10 : d === 2 ? 7 : 4) : (d >= 3 ? 6 : d === 2 ? 4 : 2));
const TECHO = 20; // R9: por encima de 20 cada serie rinde poco

/**
 * R25 · Equilibrado: sube una serie al músculo más atrasado frente a su mínimo (en el ejercicio que más le da,
 * en un día con tiempo y sin pasar de R10) y quita series a lo que pase de 20. Nunca más de 5 series por ejercicio.
 */
function equilibrar(dias, d, tope, catalogo) {
  const semana = () => volumen(dias.flatMap((items) => items.map(([ej, n]) => ({ ej, series: n }))), catalogo);
  const cabeEnR10 = (items, j) => {
    const prueba = items.map(([ej, n], k) => ({ ej, series: n + (k === j ? 1 : 0) }));
    return !IDS_MUSCULOS.some((m) => volumen(prueba, catalogo)[m] > TOPE_SESION);
  };
  for (let vuelta = 0; vuelta < 80; vuelta++) {
    const v = semana();
    // 1) Recortar lo que pasa de 20.
    const alto = IDS_MUSCULOS.find((m) => v[m] > TECHO);
    if (alto) {
      let mejor = null;
      dias.forEach((items, di) => items.forEach(([ej, n], j) => {
        const w = ejercicio(ej, catalogo).musculos[alto] ?? 0;
        if (w > 0 && n > 2 && (!mejor || w > mejor.w || (w === mejor.w && n > mejor.n))) mejor = { di, j, w, n };
      }));
      if (mejor) { dias[mejor.di][mejor.j][1] -= 1; continue; }
    }
    // 2) Subir al más atrasado.
    const falta = IDS_MUSCULOS.map((m) => [m, objetivoSemanal(m, d) - v[m]]).filter(([, x]) => x > 0).sort((a, b) => b[1] - a[1]);
    let hecho = false;
    for (const [m] of falta) {
      let mejor = null;
      dias.forEach((items, di) => {
        const total = items.reduce((s, [, n]) => s + n, 0);
        if (total >= tope) return;
        items.forEach(([ej, n], j) => {
          const w = ejercicio(ej, catalogo).musculos[m] ?? 0;
          if (w === 1 && n < 5 && cabeEnR10(items, j) && (!mejor || n < mejor.n)) mejor = { di, j, n };
        });
      });
      if (mejor) { dias[mejor.di][mejor.j][1] += 1; hecho = true; break; }
      // Sin tiempo libre: se cambia una serie de algo que va sobrado (2 o más por encima de su mínimo) en ese mismo día.
      let cambio = null;
      dias.forEach((items, di) => items.forEach(([ej, n], j) => {
        if (cambio || (ejercicio(ej, catalogo).musculos[m] ?? 0) !== 1 || n >= 5) return;
        const donante = items.findIndex(([ej2, n2], k) => k !== j && n2 > 2
          && (ejercicio(ej2, catalogo).musculos[m] ?? 0) === 0
          && Object.entries(ejercicio(ej2, catalogo).musculos).filter(([, f]) => f === 1).every(([mm]) => v[mm] - 1 >= objetivoSemanal(mm, d) + 1));
        if (donante >= 0) {
          const prueba = items.map((x) => [...x]); prueba[j][1] += 1; prueba[donante][1] -= 1;
          if (!IDS_MUSCULOS.some((mm) => volumen(prueba.map(([e, k]) => ({ ej: e, series: k })), catalogo)[mm] > TOPE_SESION)) cambio = { di, j, donante };
        }
      }));
      if (cambio) { dias[cambio.di][cambio.j][1] += 1; dias[cambio.di][cambio.donante][1] -= 1; hecho = true; break; }
      // Si ningún ejercicio puede darle más, se añade uno de aislamiento para ese músculo en el día con más tiempo libre.
      const extra = Object.values(catalogo).find((e) => e.tipo === 'aislamiento' && e.musculos[m] === 1 && Object.keys(e.musculos).length === 1);
      if (!extra) continue;
      const libres = dias.map((items, di) => [di, tope - items.reduce((s, [, n]) => s + n, 0)])
        .filter(([di, libre]) => libre >= 2 && !dias[di].some(([ej]) => ejercicio(ej, catalogo).patron === extra.patron))
        .sort((a, b) => b[1] - a[1]);
      if (libres.length) { dias[libres[0][0]].push([extra.id, 2]); hecho = true; break; }
    }
    if (!hecho) return;
  }
}

/** R25 · El porqué de la propuesta, en datos (la app lo pone en palabras). */
export function porQueRutina(plantilla, catalogo = CATALOGO) {
  const v = volumen(plantilla.dias.flatMap((x) => x.ejercicios), catalogo);
  const porSesion = plantilla.dias.map((x) => x.ejercicios.reduce((s, e) => s + e.series, 0));
  const vecesPorMusculo = Object.fromEntries(IDS_MUSCULOS.map((m) => [m, plantilla.dias.filter((x) => volumen(x.ejercicios, catalogo)[m] > 0).length]));
  return { volumen: v, porSesion, vecesPorMusculo };
}
