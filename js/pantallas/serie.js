// «La serie: el terrero» (lienzo: Serie, SerieDos, SobreLaMarcha y La brega, tableros 14-16; G78, G105, G106, G115-G117:
// Arrimar → «¡A la brega!» → Moliendo → «Hecha» → «¿Cómo fue?») y «El descanso» (Descanso y Brega; G79, G115).
// Basalto, números grandes y pocas palabras. Guardar una serie: los números se hacen grano, el grano vuela a su hueco
// y la muela del descanso llega rodando (storyboard y prototipo v5). Sonidos: G83.
import * as G from '../cerebro/index.js';
import { estado, prescripcion, seriesDelHueco, siguienteHueco, guardarSerie, borrarSerie, guardarSesion, terminarSesion,
  escalonDe, descansoDe, ponerNota, musculoCorto, ajuste, ponerAjuste, historialArrimar, mejorReciente } from '../logica.js';
import { el, esc, kg, mmss, icono, grano, granos, ajustarTitulo, hoja, pedirNumero, vibrar, reduceMovimiento, escalonar, pop, avisar,
  pintadera, coronaGranos, piedra, vibrarTambor, encajar } from '../ui.js';
import * as S from '../sonidos.js';
import { descansoEnCurso, molienda } from '../avisos.js';
import { aLaBrega } from '../amoler.js';
import { abrirLibreta } from './libreta.js';

const sesionPorId = (id) => estado.sesiones.find((s) => s.id === id);
const rango = (a, b) => (a === b ? `${a}` : `${a}-${b}`);
const deja = (r) => (r.min === r.max ? `deja ${r.min}` : `deja ${r.min}-${r.max}`);
const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));

// ── Wake Lock: la pantalla no se apaga durante la sesión (si iOS lo permite; falta confirmarlo en su iPhone) ──
let candado = null;
export async function mantenerEncendida(si) {
  try {
    if (si && !candado && navigator.wakeLock) { candado = await navigator.wakeLock.request('screen'); candado.addEventListener('release', () => { candado = null; }); }
    if (!si && candado) { await candado.release(); candado = null; }
  } catch { candado = null; }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && estado.sesiones.some((s) => s.estado === 'en-curso')) mantenerEncendida(true);
});

/** Peso con el que arrancan −/+ si aún no hay ninguno (barra olímpica vacía, mancuerna ligera…). No es una sugerencia (G53). */
const PESO_DE_PARTIDA = { barra: 20, smith: 20, mancuernas: 10, maquina: 20, polea: 10, lastre: 0 };

/** R11 · La mejor fuerza estimada de un ejercicio antes de esta sesión (para saber si hay marca nueva). */
function mejorAntes(ejId, sesionId) {
  return Math.max(0, ...estado.series.filter((x) => x.ejercicioId === ejId && x.sesionId !== sesionId).map((x) => G.e1rm(x.peso, x.reps, x.rir)));
}

/** R12 (+R14, R21) · El aviso único bajo el nombre (G78): objetivo y reserva juntos. */
function avisoDe(p, slot, n) {
  const busca = p.reps[Math.min(n, p.reps.length - 1)] ?? slot.repMin;
  const r = `busca ${busca} · ${deja(p.rir)}`;
  // «corto»: lo que va en «Ahora», donde los números ya están en grande (G105).
  if (slot.diaMalo) return { icono: 'malo', texto: `Día malo · ${r}`, corto: 'Día malo: cuenta igual' };
  if (p.descarga) return { icono: 'baja', texto: `Descarga · ${r}`, corto: 'Semana de descarga' };
  if (p.vuelta === 'larga') return { icono: 'baja', texto: `Vuelta suave · ${r}`, corto: 'Vuelta suave' };
  switch (p.accion) {
    case 'subir': return { icono: 'sube', texto: `Sube a ${kg(p.peso)} · ${r}`, corto: `Sube a ${kg(p.peso)} kg` };
    case 'bajar': return { icono: 'baja', texto: `Baja a ${kg(p.peso)} · ${r}`, corto: `Baja a ${kg(p.peso)} kg` };
    case 'primera': return { icono: 'igual', texto: `Primera vez · ${rango(slot.repMin, slot.repMax)} reps · ${deja(p.rir)}`, corto: 'Primera vez' };
    default: return { icono: 'igual', texto: `Mismo peso · ${r}`, corto: 'Mismo peso' };
  }
}
/** El porqué del aviso, para la hoja que se abre al tocarlo (el historial va ahí, no en la pantalla). */
export function porqueDe(p, slot) {
  if (p.descarga) return `Semana de descarga: ${p.series} ${p.series === 1 ? 'serie' : 'series'}, un 10 % menos y más margen.`;
  if (p.vuelta === 'larga') return `Semana de vuelta: un 10 % menos de peso, ${p.series} ${p.series === 1 ? 'serie' : 'series'} y sin apurar.`;
  if (p.vuelta === 'media') return 'Vuelves tras unos días: tu peso de siempre con una más de margen.';
  if (slot.diaMalo) return 'Día malo: tu peso, 2 series y con margen. Cuenta igual.';
  switch (p.accion) {
    case 'subir': return `Llegaste a ${slot.repMax} en todas: toca subir un escalón y volver a ${slot.repMin}.`;
    case 'bajar': return 'La última vez no llegaste al mínimo: un escalón menos y recuperas reps.';
    case 'mantener': return `Mismo peso y una más donde te quedaste corto: ${p.reps.join(' · ')}.`;
    case 'inicial': return `Empiezas con el peso que pusiste: ${kg(p.peso)} kg.`;
    default: return `Primera vez: un peso que te deje ${rango(slot.repMin, slot.repMax)} reps con margen.`;
  }
}

/** Lo que va en la libreta, en «Por qué», para la serie que toca (la teoría; en pantalla, solo la señal). */
function porqueSerie({ p, slot, arrimando, vasFuerte, piedrasHechas, trabajo, ar }) {
  const f = [];
  if (arrimando || piedrasHechas.length) {
    f.push(`<b>Arrimar la piedra (R28):</b> antes de la primera serie, ${ar.plan.length === 1 ? 'una ligera' : `${ar.plan.length} más ligeras`} hasta el peso de trabajo, ${kg(trabajo)} kg. Al subir el peso, menos reps. No cuentan para nada.`);
    if (vasFuerte) f.push(`<b>¡Vas fuerte!</b> Levantaste ${kg(Math.max(...piedrasHechas.map((x) => x.peso)))} kg: la siguiente piedra ya no puede pesar menos (ley 1) y, como estás cerca del peso de trabajo, toca la de trabajo.`);
  }
  f.push(`<b>${esc(porqueDe(p, slot))}</b>`);
  return f;
}

export function seriePantalla(params, nav) {
  const { sesionId, i = 0, arr, anima = false, pesoTrabajo = null } = params;
  const s = sesionPorId(sesionId);
  if (!s) return { nodo: el('<section><p>Esta sesión ya no existe.</p></section>') };
  if (s.actual !== i) { s.actual = i; guardarSesion(s); }
  const slot = s.plan[i];
  const ej = G.ejercicio(slot.ej);
  const hechas = seriesDelHueco(s, i);
  const n = hechas.length;                // índice de la serie que toca
  const p = prescripcion(slot);
  const total = slot.series;
  const ultimaHueco = hechas.at(-1);
  // El peso de hoy, del mismo ejercicio: si cambiaste de maña a mitad, lo del otro no vale para este.
  const ultimaHoy = hechas.filter((x) => x.ejercicioId === slot.ej).at(-1);
  const escalon = escalonDe(slot.ej);
  const lastre = !!ej.lastre;
  // La siguiente, preparada en el descanso (R29, G115): lo que dejes ahí es lo que sale aquí.
  const prep = s.prep && s.prep.i === i && s.prep.n === n ? s.prep : null;
  // pesoTrabajo: el que dijiste al pedir arrimar sin peso conocido (G108).
  let peso = prep?.peso ?? ultimaHoy?.peso ?? p.peso ?? pesoTrabajo;
  let reps = prep?.reps ?? p.reps[Math.min(n, p.reps.length - 1)] ?? slot.repMin;
  let rir = null;   // G105: la reserva no viene marcada; la eliges al acabar la serie
  let fallo = !!prep?.fallo; // R27 (G106): al fallo, solo esta serie y solo si lo eliges tú
  // Moliendo a medias (iOS recargó la app a mitad de la serie) o pedido desde un aviso («¿Hecha?» abre «¿Cómo fue?»).
  const enMolienda = s.moliendo && s.moliendo.i === i && s.moliendo.n === n ? s.moliendo : null;
  if (enMolienda) { peso = enMolienda.peso; reps = enMolienda.reps; fallo = !!enMolienda.fallo; }
  const momento0 = params.momento ?? (enMolienda ? (window.gofioIr === 'como' ? 'como' : 'moliendo') : 'ahora');
  window.gofioIr = null;
  // R28 · Arrimar (G115): las piedras antes de la primera serie de trabajo, recalculadas con lo que ya levantaste.
  const trabajo = peso;
  const repsTrabajo = reps;
  const piedrasHechas = (s.calentamientos ?? []).filter((c) => c.i === i);
  const estilo = n === 0 ? G.estiloArrimar(historialArrimar(slot.ej, s.id)) : null;
  // Si tu jeito es no arrimar aquí, Gofio no lo propone; pero si lo pides tú («Arrimar»), salen las piedras de siempre.
  const estiloUsado = arr === true && estilo?.n === 0 ? null : estilo;
  const ar = n === 0 && trabajo != null ? G.arrimar({ trabajo, escalon, tipo: ej.tipo, repsObjetivo: repsTrabajo, lastre, hechas: piedrasHechas, estilo: estiloUsado }) : { piedras: [], plan: [], vasFuerte: false };
  const sePuedeArrimar = n === 0 && !piedrasHechas.length && (trabajo == null || G.arrimar({ trabajo, escalon, tipo: ej.tipo, repsObjetivo: repsTrabajo, lastre }).plan.length > 0);
  const saltado = (s.arrimarSaltado ?? []).includes(i);
  const arrimando = momento0 === 'ahora' && n === 0 && !saltado && arr !== false && ar.piedras.length > 0
    && (arr === true || piedrasHechas.length > 0 || estilo?.n !== 0);
  const totalPiedras = piedrasHechas.length + ar.piedras.length;
  if (arrimando) { peso = ar.piedras[0].peso; reps = ar.piedras[0].reps; }
  const vasFuerte = !arrimando && n === 0 && ar.vasFuerte && piedrasHechas.length > 0;
  const repsMeta = reps, pesoMeta = peso;
  const aviso = avisoDe(p, slot, n);
  const record = mejorAntes(slot.ej, s.id);
  const restoTotal = s.plan.reduce((acc, _, k) => acc + Math.max(0, s.plan[k].series - seriesDelHueco(s, k).length), 0);
  const esUltima = restoTotal === 1;
  const ultimaDelEj = n === slot.series - 1;
  const animoTxt = G.animo(slot.ej, 'moliendo', { ultima: ultimaDelEj && n > 0 });

  const rep = rango(slot.repMin, slot.repMax);
  const unidad = lastre ? 'kg de lastre' : 'kg';
  // G106 · En «Ahora» todo se toca: − y + con tu escalón (o una rep), y el número abre el teclado. Solo esta serie.
  const mini = (que, dir) => `<button class="mini" type="button" data-a="${que}" data-dir="${dir}" data-son="${dir}" aria-label="${que === 'peso' ? (dir > 0 ? 'Sumar el escalón' : 'Restar el escalón') : (dir > 0 ? 'Una rep más' : 'Una rep menos')}">${icono(dir > 0 ? 'mas' : 'menos')}</button>`;
  const ahoraNumeros = peso == null
    ? `<b class="titular ahora-texto">Un peso que te deje ${rep}</b><p class="ahora-pista">Lo apuntas al acabar.</p>`
    : `<div class="ahora-fila">${mini('peso', -1)}<button class="ahora-num" type="button" data-escribir-peso-a data-son="0" aria-label="Escribir el peso"><b class="cifra ahora-peso num" data-ahora-peso>${kg(peso)}</b></button>${mini('peso', 1)}</div><span class="unidad">${unidad}</span>
       <div class="ahora-fila">${mini('reps', -1)}<button class="ahora-num" type="button" data-escribir-reps-a data-son="0" aria-label="Escribir las reps"><b class="cifra ahora-reps num" data-ahora-reps><i class="por" aria-hidden="true">×</i><span data-ahora-reps-v>${reps}</span></b></button>${mini('reps', 1)}</div><span class="unidad">reps</span>`;
  const dejaTxt = deja(p.rir).replace(/^d/, 'D');
  // Las piedras de Arrimar, de la chica a la grande (levantamiento de la piedra, Turismo de Gran Canaria).
  const esc_ = (w) => 0.78 + 0.4 * Math.min(1, w / (trabajo || 1));
  const filaPiedras = arrimando ? `<div class="piedras" role="img" aria-label="Arrimar: piedra ${piedrasHechas.length + 1} de ${totalPiedras}, y luego ${kg(trabajo)} kg">
      ${piedrasHechas.map((c) => piedra(kg(c.peso), `× ${c.reps}`, 'hecha', esc_(c.peso))).join('')}
      ${ar.piedras.map((c, k) => piedra(kg(c.peso), `× ${c.reps}`, k === 0 ? 'ahora' : 'luego', esc_(c.peso))).join('')}
      <span class="piedras-flecha" aria-hidden="true">→</span>${piedra(kg(trabajo), `× ${repsTrabajo}`, 'trabajo', 1.18)}</div>` : '';
  const cabezaAviso = arrimando
    ? `<button class="aviso-serie ahora-solo" type="button" data-aviso aria-label="Arrimar: ${totalPiedras} piedras. Ver por qué">${icono('piedra')}<span><b>Arrimar</b> · ${totalPiedras === 1 ? '1 piedra' : `${totalPiedras} piedras`}</span></button>`
    : vasFuerte
      ? `<div class="senal-fuerte ahora-solo"><b class="titular">¡Vas fuerte!</b><span>Directo a la de trabajo.</span><button class="enlace" type="button" data-aviso>¿Por qué?</button></div>`
      : `<button class="aviso-serie ahora-solo" type="button" data-aviso aria-label="${esc(aviso.texto)}. Ver por qué">${icono(aviso.icono)}<span data-aviso-txt>${esc(aviso.corto)}</span></button>`;
  const nodo = el(`<section class="serie${arrimando ? ' arrimando' : ''}" data-momento="${momento0}" aria-labelledby="titulo-serie">
    <div class="serie-cabeza">
      <button class="volver" type="button" data-volver>${icono('atras')}Hoy</button>
      <span class="cabeza-granos">${granos(n, total, -1, { ahora: !arrimando, clase: 'millo-tenue' })}</span>
    </div>
    <h1 class="titular serie-titulo ahora-solo moliendo-tambien" id="titulo-serie">${esc(ej.nombre)}</h1>
    ${cabezaAviso}
    ${filaPiedras}
    <div class="ahora ahora-solo" data-ahora>
      <span class="ahora-etiqueta">${arrimando ? `Piedra ${piedrasHechas.length + 1} de ${totalPiedras}` : 'Ahora'}</span>
      ${ahoraNumeros}
      ${arrimando ? '' : `<p class="ahora-cambio" data-ahora-cambio hidden></p><button class="ahora-deja${fallo ? ' fallo' : ''}" type="button" data-deja data-son="pop" aria-label="Reserva: ${esc(fallo ? 'al fallo' : dejaTxt)}. Cambiar">${esc(fallo ? 'Al fallo' : dejaTxt)}</button>`}
    </div>
    <div class="moliendo moliendo-solo" aria-live="polite">
      <p class="moliendo-que"><b class="cifra num" data-mol-que>${peso == null ? rep : `${kg(peso)} × ${reps}`}</b><span data-mol-deja>${fallo ? 'al fallo' : esc(deja(p.rir))}</span></p>
      <span class="moliendo-etiqueta">Moliendo</span>
      <div class="moliendo-muela" aria-hidden="true"><img src="iconos/disco-millo.svg" alt="" width="240" height="240" draggable="false"></div>
      <p class="titular moliendo-animo" data-animo>${esc(animoTxt)}</p>
      ${ajuste('pistaMoliendo') ? '' : '<p class="moliendo-pista">Apaga el móvil si quieres: al volver, «Hecha».</p>'}
    </div>
    <div class="como-cabeza como-solo">
      <h2 class="titular">¿Cómo fue?</h2>
      <p>${esc(ej.nombre)}</p>
    </div>
    <div class="numeros como-solo" data-numeros>
      <div class="contador">
        <button class="redondo" type="button" data-peso="-1" data-son="-1" aria-label="Restar el escalón">${icono('menos')}</button>
        <div class="valor"><button type="button" data-escribir-peso data-son="0" aria-label="Escribir el peso"><span class="cifra peso num" data-v-peso>${peso == null ? '—' : kg(peso)}</span></button><span class="unidad">${unidad}</span></div>
        <button class="redondo" type="button" data-peso="1" data-son="1" aria-label="Sumar el escalón">${icono('mas')}</button>
      </div>
      <div class="contador">
        <button class="redondo" type="button" data-reps="-1" data-son="-1" aria-label="Una rep menos">${icono('menos')}</button>
        <div class="valor"><span class="cifra reps num" data-v-reps>${reps}</span><span class="unidad">reps</span></div>
        <button class="redondo" type="button" data-reps="1" data-son="1" aria-label="Una rep más">${icono('mas')}</button>
      </div>
      <p class="como-pista" data-como-pista></p>
      <button class="enlace como-aun-no" type="button" data-aun-no>‹ Aún no la he hecho</button>
    </div>
    <div class="pie-fuerza como-solo">
      <div class="pie-chips fila-pregunta"><h3 class="titular" id="rir-t">¿Cuántas te quedaban?</h3></div>
      <div class="fila-accion rir-botones" role="group" aria-labelledby="rir-t">${G.BOTONES_RIR.map((v) => `<button type="button" data-rir="${v}" data-son="none" aria-pressed="false" aria-label="${v === 0 ? '0, al fallo' : v === 4 ? '4 o más, sobrado' : v}"><b>${v === 4 ? '4+' : v}</b>${v === 0 ? '<small>al fallo</small>' : v === 4 ? '<small>sobrado</small>' : ''}</button>`).join('')}</div>
    </div>
    <div class="pie-fuerza moliendo-solo">
      <div class="pie-chips">
        <button class="chip" type="button" data-aun-no-mol>Aún no</button>
        <button class="chip" type="button" data-cambiar>${icono('cambiar')}Otra maña</button>
        <button class="chip" type="button" data-terminar>${icono('fin')}Terminar</button>
      </div>
      <div class="fila-accion"><button class="boton boton-hecha" type="button" data-hecha data-son="none">${icono('check')}Hecha</button></div>
    </div>
    <div class="pie-fuerza ahora-solo">
      <div class="pie-chips">${arrimando ? `
        <button class="chip" type="button" data-saltar-piedras>Saltar las piedras</button>
        <button class="chip" type="button" data-cambiar>${icono('cambiar')}Otra maña</button>
        <button class="chip" type="button" data-terminar>${icono('fin')}Terminar</button>` : `
        ${sePuedeArrimar ? `<button class="chip" type="button" data-arrimar>${icono('piedra')}Arrimar</button>` : ''}
        <button class="chip" type="button" data-una-mas>${icono('grano')}La ñapa</button>
        <button class="chip" type="button" data-cambiar>${icono('cambiar')}Otra maña</button>
        <button class="chip" type="button" data-nota>${icono('nota')}Nota</button>
        <button class="chip" type="button" data-lista>${icono('lista')}Ejercicios</button>
        <button class="chip" type="button" data-terminar>${icono('fin')}Terminar</button>
        ${n > 0 ? '<button class="chip" type="button" data-deshacer>Borrar la última</button>' : ''}`}
      </div>
      <div class="fila-accion">${arrimando
        ? `<button class="boton boton-hecha" type="button" data-hecha-piedra data-son="none">${icono('check')}Hecha</button>`
        : `<button class="boton boton-brega" type="button" data-brega data-son="none">¡A la brega!</button>`}</div>
    </div>
  </section>`);

  const vPeso = nodo.querySelector('[data-v-peso]');
  const vReps = nodo.querySelector('[data-v-reps]');
  const avTxt = nodo.querySelector('[data-aviso-txt]');
  const molQue = nodo.querySelector('[data-mol-que]');
  const bote = (x) => { if (!reduceMovimiento()) x.animate([{ transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 180, easing: 'cubic-bezier(.22,1,.36,1)' }); };
  // «¡Fuerte marca!» (G78): si lo que vas a guardar supera tu mejor fuerza estimada en este ejercicio (R11).
  let marca = false;
  function mirarMarca() {
    vReps.classList.toggle('cambiado', reps !== repsMeta); vPeso.classList.toggle('cambiado', pesoMeta != null && peso !== pesoMeta);
    const ahora = peso != null && record > 0 && G.e1rm(peso, reps, rir ?? 0) > record + 0.01;
    // En «Ahora» y en Moliendo aún no has levantado nada: la marca se celebra al guardar, no antes (G106).
    if (nodo.dataset.momento !== 'como' || ahora === marca) return;
    marca = ahora;
    vReps.classList.toggle('marca', marca);
    const pista = nodo.querySelector('[data-como-pista]');
    pista.innerHTML = marca ? `${icono('marca')}¡Fuerte marca!` : '';
    pista.classList.toggle('marca', marca);
    if (marca && !reduceMovimiento()) pista.animate([{ transform: 'scale(.9)', opacity: 0 }, { transform: 'scale(1.04)', opacity: 1 }, { transform: 'none', opacity: 1 }], { duration: 320, easing: 'cubic-bezier(.34,1.56,.64,1)' });
  }
  const ahoraPesoEl = nodo.querySelector('[data-ahora-peso]'), ahoraRepsV = nodo.querySelector('[data-ahora-reps-v]');
  const cambioEl = nodo.querySelector('[data-ahora-cambio]');
  // La regla del vistazo (G116): lo cambiado, en millo; lo que decía Gofio, tachado al lado. Sin frases.
  function pintarCambio() {
    encajar(ahoraPesoEl); encajar(molQue, { caja: nodo.querySelector('.moliendo') });
    const cp = pesoMeta != null && peso !== pesoMeta, cr = reps !== repsMeta;
    ahoraPesoEl?.classList.toggle('cambiado', cp); nodo.querySelector('[data-ahora-reps]')?.classList.toggle('cambiado', cr);
    if (molQue) molQue.textContent = peso == null ? rep : `${kg(peso)} × ${reps}`;
    if (!cambioEl) return;
    const txt = cp && cr ? `${kg(pesoMeta)} × ${repsMeta}` : cp ? `${kg(pesoMeta)} kg` : cr ? `× ${repsMeta}` : '';
    const antes = !cambioEl.hidden;
    cambioEl.innerHTML = txt ? `Gofio: <s>${esc(txt)}</s>` : ''; cambioEl.hidden = !txt;
    if (txt && !antes && !reduceMovimiento()) cambioEl.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.22,1,.36,1)' });
  }
  const pintarPeso = () => {
    vPeso.textContent = peso == null ? '—' : kg(peso); bote(vPeso);
    if (ahoraPesoEl && peso != null) { ahoraPesoEl.textContent = kg(peso); bote(ahoraPesoEl); }
    pintarCambio(); mirarMarca();
  };
  const pintarReps = () => {
    vReps.textContent = reps; bote(vReps);
    if (ahoraRepsV) { ahoraRepsV.textContent = reps; bote(ahoraRepsV); }
    pintarCambio(); mirarMarca();
  };
  // −/+ : un toque, un escalón (o una rep); mantenido, repite y, al rato, de cuatro en cuatro (G106).
  function pasoPeso(dir, veces = 1) {
    if (peso == null) peso = PESO_DE_PARTIDA[lastre ? 'lastre' : ej.equipo] ?? 10;
    else for (let k = 0; k < veces; k++) peso = Math.max(0, G.siguienteEscalon(peso, escalon, dir));
    pintarPeso();
  }
  function pasoReps(dir, veces = 1) { reps = Math.max(0, Math.min(60, reps + dir * veces)); pintarReps(); }

  nodo.querySelector('[data-volver]').onclick = () => nav.volver();
  nodo.querySelectorAll('[data-peso]').forEach((b) => repetir(b, (v) => pasoPeso(Number(b.dataset.peso), v)));
  nodo.querySelectorAll('[data-a="peso"]').forEach((b) => repetir(b, (v) => pasoPeso(Number(b.dataset.dir), v)));
  nodo.querySelectorAll('[data-a="reps"]').forEach((b) => repetir(b, (v) => pasoReps(Number(b.dataset.dir), v)));
  async function escribirPeso() {
    const v = await pedirNumero({ titulo: lastre ? 'Lastre' : 'Peso', sub: lastre ? 'Kilos extra (0 sin lastre).' : ej.equipo === 'mancuernas' ? 'Kilos de cada mancuerna.' : 'Kilos en total.', valor: peso ?? '' });
    if (v != null) { peso = v; pintarPeso(); }
  }
  nodo.querySelector('[data-escribir-peso]').onclick = escribirPeso;
  nodo.querySelector('[data-escribir-peso-a]')?.addEventListener('click', escribirPeso);
  nodo.querySelector('[data-escribir-reps-a]')?.addEventListener('click', async () => {
    const v = await pedirNumero({ titulo: 'Reps', valor: reps, unidad: 'reps', decimal: false });
    if (v != null) { reps = Math.max(0, Math.min(60, Math.round(v))); pintarReps(); }
  });
  nodo.querySelectorAll('[data-reps]').forEach((b) => repetir(b, (v) => pasoReps(Number(b.dataset.reps), v)));
  // R27 · La píldora de la reserva: deja lo de Gofio o al fallo, solo esta serie.
  const pildora = nodo.querySelector('[data-deja]');
  pildora?.addEventListener('click', () => {
    const nota = G.falloBienVisto(slot.ej) ? 'Donde mejor va: la última, en máquina o aislamiento.' : 'En libres pesados, mejor con alguien que te ayude.';
    const { nodo: h, cerrar } = hoja(`<h2>¿Hasta dónde?</h2><p class="sub">Solo esta serie.</p>
      <ul class="opciones elegir">
        <li><button type="button" data-f="0" aria-pressed="${!fallo}"><span class="que"><b>${esc(dejaTxt)}</b><span>Lo que dice Gofio</span></span></button></li>
        <li><button type="button" data-f="1" aria-pressed="${fallo}"><span class="que"><b>Al fallo</b><span>Hasta que no salga ni un fisco más</span></span></button></li>
      </ul><p class="sub nota-hoja">Al fallo no hace falta para crecer, ni resta. ${nota}</p>`);
    escalonar(h.querySelectorAll('.opciones li'), { desde: 100, retraso: 40 });
    h.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => {
      fallo = b.dataset.f === '1';
      pildora.textContent = fallo ? 'Al fallo' : dejaTxt; pildora.classList.toggle('fallo', fallo);
      pildora.setAttribute('aria-label', `Reserva: ${fallo ? 'al fallo' : dejaTxt}. Cambiar`);
      const md = nodo.querySelector('[data-mol-deja]'); if (md) md.textContent = fallo ? 'al fallo' : deja(p.rir);
      vibrar(); cerrar(); setTimeout(() => pop(pildora, 1.12), 180);
    }));
  });
  let guardando = false;
  // G105 · Tocar la reserva la elige y guarda la serie (dos toques por serie: «Hecha» y la reserva).
  nodo.querySelectorAll('[data-rir]').forEach((b) => b.addEventListener('click', async () => {
    if (guardando) return;
    rir = Number(b.dataset.rir);
    nodo.querySelectorAll('[data-rir]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    if (!reduceMovimiento()) b.animate([{ transform: 'scale(.9)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 240, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    mirarMarca();
    await guardar();
  }));

  // ── Los tiempos de la serie (G115): Ahora → «¡A la brega!» → Moliendo → «Hecha» → «¿Cómo fue?» ──
  const ahoraPeso = nodo.querySelector('[data-ahora-peso]'), ahoraReps = nodo.querySelector('[data-ahora-reps]');
  const muelaMol = nodo.querySelector('.moliendo-muela');
  let giro = null;
  function girarMuela(si) {
    giro?.cancel(); giro = null;
    if (si && !reduceMovimiento()) giro = muelaMol.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 14000, iterations: Infinity });
  }
  async function entrarMolienda() {
    s.moliendo = { i, n, peso, reps, fallo, desde: s.moliendo?.desde ?? Date.now() };
    delete s.prep;
    await guardarSesion(s);
    molienda({ hasta: Date.now() + 180000, titulo: '¿Hecha? Apunta cómo fue.', cuerpo: `${ej.nombre}, serie ${n + 1} · ${peso == null ? rep : `${kg(peso)} × ${reps}`}` });
  }
  async function salirMolienda() {
    molienda(null);
    if (s.moliendo) { delete s.moliendo; await guardarSesion(s); }
  }
  function aMomento(m) {
    const desdeP = ahoraPeso?.getBoundingClientRect(), desdeR = ahoraReps?.getBoundingClientRect();
    const de = nodo.dataset.momento;
    nodo.dataset.momento = m;
    nodo.scrollTop = 0;
    girarMuela(m === 'moliendo');
    if (m === 'moliendo') entrarMolienda(); else if (de === 'moliendo') salirMolienda();
    if (reduceMovimiento()) return;
    const curva = 'cubic-bezier(.22,1,.36,1)';
    nodo.querySelector('[data-rir="0"]')?.classList.toggle('sugerida', m === 'como' && fallo);
    const aparece = (els, desde, y = 10) => els.filter(Boolean).forEach((x, k) => x.animate([{ opacity: 0, transform: `translateY(${y}px)` }, { opacity: 1, transform: 'none' }], { duration: 360, delay: desde + k * 40, easing: curva, fill: 'backwards' }));
    if (m === 'como') {
      const flip = (desde, hacia) => {
        if (!desde || !hacia || !desde.height) return;
        const r = hacia.getBoundingClientRect();
        const dx = desde.left + desde.width / 2 - (r.left + r.width / 2), dy = desde.top + desde.height / 2 - (r.top + r.height / 2);
        hacia.animate([{ transform: `translate(${dx}px,${dy}px) scale(${desde.height / r.height})` }, { transform: 'none' }], { duration: 480, easing: curva });
      };
      if (de === 'ahora') { flip(desdeP, vPeso); flip(desdeR, vReps); } else aparece([vPeso, vReps], 60, 18);
      aparece([...nodo.querySelectorAll('.como-cabeza > *')], 0, -10);
      aparece([...nodo.querySelectorAll('.contador .redondo, .contador .unidad')], 200, 0);
      aparece([nodo.querySelector('.fila-pregunta h3'), ...nodo.querySelectorAll('.rir-botones button')], 260, 16);
      aparece([...nodo.querySelectorAll('.como-pista, .como-aun-no')], 420, 8);
    } else if (m === 'moliendo') {
      aparece([nodo.querySelector('.moliendo-que'), nodo.querySelector('.moliendo-etiqueta')], 0, -8);
      muelaMol.animate([{ opacity: 0, transform: 'scale(.6) rotate(-90deg)' }, { opacity: 1, transform: 'none' }], { duration: 560, easing: 'cubic-bezier(.34,1.3,.64,1)', fill: 'backwards' });
      aparece([nodo.querySelector('.moliendo-animo'), nodo.querySelector('.moliendo-pista'), ...nodo.querySelectorAll('.pie-fuerza.moliendo-solo .chip'), nodo.querySelector('[data-hecha]')], 260, 14);
    } else {
      escalonar(nodo.querySelectorAll('.serie-titulo, .aviso-serie, .senal-fuerte, .piedras, .ahora > *, .pie-fuerza.ahora-solo .chip, .pie-fuerza.ahora-solo .boton'), { desde: 0, retraso: 35 });
    }
  }
  // «¡A la brega!» (G115): la cortinilla de la serie y, detrás, Moliendo.
  nodo.querySelector('[data-brega]')?.addEventListener('click', async (e) => {
    const b = e.currentTarget; if (b.dataset.va) return; b.dataset.va = '1';
    S.suena('tambor'); vibrarTambor();
    await aLaBrega({ hechas: n, total: slot.series, alCambiar: () => { aMomento('moliendo'); S.suena('moliendo', 0.1); } });
    delete b.dataset.va;
  });
  // «Hecha» → «¿Cómo fue?». La primera vez se aprende y la pista de Moliendo ya no vuelve.
  nodo.querySelector('[data-hecha]').onclick = () => {
    S.suena('hecha'); vibrarTambor();
    if (!ajuste('pistaMoliendo')) { ponerAjuste('pistaMoliendo', true); nodo.querySelector('.moliendo-pista')?.remove(); }
    aMomento('como');
  };
  nodo.querySelector('[data-aun-no-mol]').onclick = () => { S.toque(-1); aMomento('ahora'); };
  // «‹ Aún no la he hecho»: si venías de Moliendo, a Moliendo; si no, a «Ahora».
  nodo.querySelector('[data-aun-no]').onclick = () => { S.toque(-1); aMomento(s.moliendo ? 'moliendo' : 'ahora'); };
  // Un aviso «¿Hecha?» tocado con la app ya abierta en Moliendo: a «¿Cómo fue?».
  const alAviso = (e) => {
    if (e.detail !== 'como' || !nodo.isConnected) return;
    if (nodo.dataset.momento === 'moliendo') aMomento('como');
    if (nodo.dataset.momento === 'como') { e.preventDefault(); window.gofioIr = null; }
  };
  window.addEventListener('gofio:ir', alAviso);

  // R28 · Una piedra hecha: se guarda en la sesión (no cuenta) y el molinero recalcula las que quedan.
  nodo.querySelector('[data-hecha-piedra]')?.addEventListener('click', async () => {
    if (guardando) return; guardando = true;
    s.calentamientos = [...(s.calentamientos ?? []), { i, peso, reps, ts: Date.now() }];
    await guardarSesion(s);
    S.suena('piedra', 0, Math.min(1, (peso ?? 0) / (trabajo || 1))); vibrar();
    const ahoraP = nodo.querySelector('.piedra.pd-ahora');
    if (ahoraP && !reduceMovimiento()) {
      ahoraP.classList.replace('pd-ahora', 'pd-hecha');
      await ahoraP.animate([{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-14px) scale(1.12)', offset: 0.45 }, { transform: 'translateY(0) scale(1)' }], { duration: 300, easing: 'cubic-bezier(.34,1.56,.64,1)' }).finished;
    } else await espera(120);
    nav.reemplazar('serie', { sesionId: s.id, i, arr: true, anima: true, pesoTrabajo: trabajo }, { sinAnimacion: true });
  });
  nodo.querySelector('[data-saltar-piedras]')?.addEventListener('click', async () => {
    s.arrimarSaltado = [...new Set([...(s.arrimarSaltado ?? []), i])];
    await guardarSesion(s); S.toque('aire');
    nav.reemplazar('serie', { sesionId: s.id, i, arr: false, anima: true, pesoTrabajo: trabajo }, { sinAnimacion: true });
  });
  nodo.querySelector('[data-arrimar]')?.addEventListener('click', async () => {
    let w = trabajo;
    // Sin peso conocido (primera vez), las piedras salen del que vayas a mover en las de trabajo (G108).
    if (w == null) {
      const v = await pedirNumero({ titulo: '¿Con cuánto vas?', sub: 'El peso de las series de trabajo.', valor: '' });
      if (v == null) return;
      w = v;
      if (!G.arrimar({ trabajo: w, escalon, tipo: ej.tipo, repsObjetivo: repsTrabajo, lastre }).piedras.length) { avisar('Con ese peso no hace falta arrimar.'); return; }
    }
    s.arrimarSaltado = (s.arrimarSaltado ?? []).filter((x) => x !== i);
    await guardarSesion(s);
    S.toque('aire'); nav.reemplazar('serie', { sesionId: s.id, i, arr: true, anima: true, pesoTrabajo: w }, { sinAnimacion: true });
  });
  // «La ñapa» (G115): una serie más, de regalo, para este ejercicio y solo hoy.
  nodo.querySelector('[data-una-mas]')?.addEventListener('click', async () => {
    slot.series += 1; slot.extra = (slot.extra ?? 0) + 1;
    await guardarSesion(s);
    const cab = nodo.querySelector('.serie-cabeza .granos');
    if (cab) cab.outerHTML = granos(n, slot.series, -1, { ahora: true, clase: 'millo-tenue' });
    [...nodo.querySelectorAll('.serie-cabeza .grano')].at(-1)?.classList.add('cae');
    S.suena('punado'); vibrar(); avisoTope();
  });
  function avisoTope() {
    const v = G.volumen(s.plan);
    const m = Object.entries(ej.musculos).find(([, f]) => f === 1)?.[0];
    if (m && v[m] > G.TOPE_SESION) avisar(`${musculoCorto(m).replace(/^./, (c) => c.toUpperCase())}: ya van ${String(v[m]).replace('.', ',')} hoy.`);
  }
  // El porqué y el historial, en la libreta (G115-G116).
  nodo.querySelectorAll('[data-aviso]').forEach((b) => b.addEventListener('click', () => abrirLibreta({
    ejId: slot.ej, porque: porqueSerie({ p, slot, arrimando, vasFuerte, piedrasHechas, trabajo, ar }),
  })));

  async function guardar() {
    if (guardando) return;
    if (peso == null) { await escribirPeso(); if (peso == null) { nodo.querySelectorAll('[data-rir]').forEach((x) => x.setAttribute('aria-pressed', 'false')); return; } }
    guardando = true;
    vibrar();
    S.suena('guardar');
    if (marca) S.suena('marca', 0.45);
    const fueMarca = marca;
    if (fueMarca) await espera(520);
    // Storyboard «guardar serie»: los números se hacen grano, el grano vuela a su hueco y cae con un destello.
    const vuelo = hacerseGrano(nodo.querySelector('[data-numeros]'), nodo.querySelectorAll('.serie-cabeza .grano')[n]);
    molienda(null); delete s.moliendo;
    await guardarSerie(s, i, { peso, reps, rir });
    // R29 · La siguiente del mismo ejercicio, ya preparada con la que acabas de hacer (se cambia en el descanso).
    if (n + 1 < slot.series) {
      const objetivo = p.reps[Math.min(n + 1, p.reps.length - 1)] ?? slot.repMin;
      const r = G.siguienteSerie({ hecha: { peso, reps, rir }, repsObjetivo: objetivo, repMin: slot.repMin, repMax: slot.repMax, tipo: ej.tipo, escalon, mejorReciente: mejorReciente(slot.ej) });
      s.prep = { i, n: n + 1, peso: r.peso, reps: r.reps, fallo: false, senal: r.senal, gofio: { peso: r.peso, reps: r.reps } };
    } else delete s.prep;
    await vuelo;
    const sig = seriesDelHueco(s, i).length < slot.series ? i : siguienteHueco(s, (i + 1) % s.plan.length);
    if (sig === -1) {
      await terminarSesion(s); mantenerEncendida(false);
      nav.reemplazar('hecho', { sesionId: s.id }, { duracion: 380 });
      return;
    }
    s.descanso = { hasta: Date.now() + descansoDe(slot.ej) * 1000, total: descansoDe(slot.ej), siguiente: sig, desde: i, marca: fueMarca };
    await guardarSesion(s);
    nav.reemplazar('descanso', { sesionId: s.id, entrada: true }, { duracion: 240 });
  }

  nodo.querySelector('[data-deshacer]')?.addEventListener('click', async () => {
    const ok = await confirmarHoja({ titulo: '¿Borrar la última?', texto: `${kg(ultimaHueco.peso)} kg × ${ultimaHueco.reps}, te quedaban ${ultimaHueco.rir === 4 ? '4 o más' : ultimaHueco.rir}.`, si: 'Borrar', no: 'Dejarla' });
    if (ok) { await borrarSerie(ultimaHueco); delete s.prep; await guardarSesion(s); nav.refrescar(); }
  });
  const _nota = nodo.querySelector('[data-nota]'); if (_nota) _nota.onclick = () => {
    const nota = estado.notas[slot.ej]?.texto;
    const { nodo: h, cerrar } = hoja(`<h2>Nota</h2><p class="sub">${esc(ej.nombre)}: asiento, agarre, máquina…</p>
      <textarea aria-label="Nota" maxlength="400" enterkeyhint="done">${esc(nota ?? '')}</textarea><div class="botones"><button class="boton" type="button">Guardar</button></div>`);
    h.querySelector('.boton').onclick = async () => { await ponerNota(slot.ej, h.querySelector('textarea').value); cerrar(); };
  };
  // «Otra maña» (R22). En «Ahora» se repinta; en Moliendo, la serie que estabas moliendo era del otro: vuelta a «Ahora».
  const alCambiar = async () => {
    if (nodo.dataset.momento === 'moliendo') { molienda(null); delete s.moliendo; await guardarSesion(s); }
    nav.reemplazar('serie', { sesionId: s.id, i, anima: true }, { sinAnimacion: true });
  };
  nodo.querySelectorAll('[data-cambiar]').forEach((b) => { b.onclick = () => otraMana(s, i, alCambiar); });
  const _lista = nodo.querySelector('[data-lista]'); if (_lista) _lista.onclick = () => {
    const { nodo: h, cerrar } = hoja(`<h2>${esc(s.nombre)}</h2><ul class="opciones">${s.plan.map((x, k) => {
      const hh = seriesDelHueco(s, k).length;
      return `<li><button type="button" data-k="${k}"><span class="que"><b>${esc(G.ejercicio(x.ej).nombre)}</b><span>${hh} de ${x.series}</span></span>${granos(hh, x.series, -1, { clase: 'millo-tenue' })}</button></li>`;
    }).join('')}</ul>
      <button class="boton plano grande tolva-abrir" type="button" data-tolva>${icono('mas')}Añadir ejercicio</button>`);
    escalonar(h.querySelectorAll('.opciones li, .tolva-abrir'), { desde: 120, retraso: 30 });
    h.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => { cerrar(); nav.reemplazar('serie', { sesionId: s.id, i: Number(b.dataset.k) }); }));
    h.querySelector('[data-tolva]').onclick = () => { cerrar(); setTimeout(() => aLaTolva(s, nav), 220); };
  };
  nodo.querySelectorAll('[data-terminar]').forEach((b) => { b.onclick = () => dejarlo(s, nav); });

  return {
    nodo, pestana: null,
    alEntrar() {
      mantenerEncendida(true);
      requestAnimationFrame(() => {
        ajustarTitulo(nodo.querySelector('.serie-titulo'), { max: 42, min: 30, lineas: 2, alto: 0.95 });
        encajar(nodo.querySelector('[data-ahora-peso]')); encajar(molQue, { caja: nodo.querySelector('.moliendo') });
      });
      if (momento0 === 'moliendo') { girarMuela(true); entrarMolienda(); }
      if (anima) escalonar(nodo.querySelectorAll('.aviso-serie, .senal-fuerte, .piedras, .ahora > *, .pie-fuerza.ahora-solo .chip, .pie-fuerza.ahora-solo .boton'), { desde: 0, retraso: 35 });
      if (vasFuerte && !reduceMovimiento()) {
        const sf = nodo.querySelector('.senal-fuerte b');
        sf?.animate([{ transform: 'scale(1.4)', opacity: 0 }, { transform: 'scale(.96)', opacity: 1, offset: 0.7 }, { transform: 'scale(1)', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' });
        S.suena('marca');
      }
    },
    alSalir() { girarMuela(false); window.removeEventListener('gofio:ir', alAviso); },
  };
}

/** −/+ que se mantienen: repiten y, al rato, de cuatro en cuatro (G106: «para el que lo ve claro»). */
function repetir(b, paso) {
  let t = null, k = 0;
  const parar = () => { clearTimeout(t); clearInterval(t); t = null; };
  b.addEventListener('pointerdown', () => {
    parar(); k = 0;
    t = setTimeout(() => { b.dataset.repetido = '1'; t = setInterval(() => { k++; paso(k > 8 ? 4 : 1); S.toque(Number(b.dataset.dir ?? b.dataset.peso ?? b.dataset.reps) > 0 ? 1 : -1); }, 110); }, 420);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => b.addEventListener(ev, parar));
  b.addEventListener('click', (e) => {
    if (b.dataset.repetido) { delete b.dataset.repetido; e.stopImmediatePropagation(); return; }
    paso(1); vibrar();
  });
}

/** Hoja de sí/no con la voz de Gofio (los dos botones grandes del lienzo). */
/** «Otra maña» (R22) para el hueco k: lo del mismo patrón primero, luego lo que comparte músculo. */
export function otraMana(s, k, alCambiar) {
  const slot = s.plan[k];
  const sust = G.sustitutos(slot.original ?? slot.ej);
  const lista = [...sust.filter((x) => x.id !== slot.ej), ...(slot.original ? [{ ...G.ejercicio(slot.original), vuelta: true }] : [])];
  const { nodo: h, cerrar } = hoja(`<h2>Otra maña</h2><p class="sub">¿Máquina ocupada? Mismo trabajo.</p>
    <ul class="opciones">${lista.map((x) => `<li><button type="button" data-ej="${x.id}"><span class="que"><b>${esc(x.vuelta ? 'El de tu rutina' : x.nombre)}</b><span>${x.vuelta ? esc(x.nombre) : x.mismoPatron ? 'Mismo movimiento' : 'Mismo músculo'}</span></span>${icono('sigue', 'class="flecha-der"')}</button></li>`).join('')}</ul>`);
  escalonar(h.querySelectorAll('.opciones li'), { desde: 120, retraso: 30 });
  h.querySelectorAll('[data-ej]').forEach((b) => b.addEventListener('click', async () => {
    slot.original = slot.original ?? slot.ej;
    slot.ej = b.dataset.ej;
    if (slot.ej === slot.original) delete slot.original;
    // Otro ejercicio: lo preparado y las piedras eran del de antes.
    if (s.prep?.i === k) delete s.prep;
    s.calentamientos = (s.calentamientos ?? []).filter((c) => c.i !== k);
    await guardarSesion(s); cerrar(); vibrar(); S.toque('barrido');
    setTimeout(alCambiar, 200);
  }));
}

/** «Chacho, ¿lo dejas aquí?» (G78): terminar la molienda desde cualquier momento (G118). */
export async function dejarlo(s, nav, antes = () => {}) {
  const hay = estado.series.some((x) => x.sesionId === s.id);
  const hechasSes = estado.series.filter((x) => x.sesionId === s.id).length;
  const totalSes = s.plan.reduce((a, x) => a + x.series, 0);
  const ok = await confirmarHoja({
    titulo: 'Chacho, ¿lo dejas aquí?', texto: hay ? 'Lo que falte se queda. La semana se reajusta sola.' : 'No has guardado ninguna serie: no cuenta.',
    extra: `<div class="granos-sesion" role="img" aria-label="${hechasSes} de ${totalSes} series">${Array.from({ length: totalSes }, (_, k) => grano(k < hechasSes)).join('')}</div>`,
    si: 'Sí, a casa', no: 'Sigo moliendo',
  });
  if (!ok) return;
  antes();
  molienda(null); descansoEnCurso(null); delete s.moliendo; delete s.prep; delete s.descanso;
  const r = await terminarSesion(s); mantenerEncendida(false);
  if (r) nav.reemplazar('hecho', { sesionId: s.id }); else nav.ir('hoy', {}, { modo: 'pestana' });
}

function confirmarHoja({ titulo, texto, extra = '', si, no }) {
  return new Promise((ok) => {
    const { nodo, cerrar } = hoja(`<h2>${esc(titulo)}</h2><p class="sub">${esc(texto)}</p>${extra}
      <div class="botones"><button class="boton" data-si data-son="barrido">${esc(si)}</button><button class="boton plano grande" data-no>${esc(no)}</button></div>`,
    { alCerrar: (v) => ok(!!v) });
    nodo.querySelector('[data-si]').onclick = () => cerrar(true);
    nodo.querySelector('[data-no]').onclick = () => cerrar(false);
    if (!reduceMovimiento()) nodo.querySelectorAll('.granos-sesion .grano').forEach((g, k) => g.animate([{ transform: 'translateY(-8px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 260, delay: 200 + k * 25, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' }));
  });
}

/**
 * «A la tolva» (G106): añadir un ejercicio al final de la sesión, por grupo y con su rango (R25). Si un músculo principal
 * pasa de ~11 series ese día (R10), Gofio lo dice, pero no lo impide.
 */
function aLaTolva(s, nav, grupo = 'pecho') {
  const enPlan = s.plan.map((x) => x.ej);
  const lista = G.ejerciciosDeGrupo(grupo, enPlan);
  const filas = lista.map((e) => {
    const nuevo = G.slotNuevo(e.id);
    const princ = Object.entries(e.musculos).filter(([, f]) => f === 1).map(([m]) => musculoCorto(m));
    return `<li><button type="button" data-ej="${e.id}"><span class="que"><b>${esc(e.nombre)}</b><span>${nuevo.series} × ${rango(nuevo.repMin, nuevo.repMax)} · ${esc(princ.join(', '))}</span></span>${icono('mas', 'class="flecha-der"')}</button></li>`;
  }).join('') || '<li class="vacio-tolva">Todo lo de este grupo ya está hoy.</li>';
  // El aviso de R10, para el músculo del grupo que más lleva hoy.
  const g = G.GRUPOS.find(([id]) => id === grupo);
  const v = G.volumen(s.plan);
  const m = g[2].reduce((a, b) => (v[b] > v[a] ? b : a), g[2][0]);
  const nota = v[m] + 3 > G.TOPE_SESION
    ? `<p class="sub nota-hoja">${esc(musculoCorto(m).replace(/^./, (c) => c.toUpperCase()))} ya lleva ${String(v[m]).replace('.', ',')} hoy. Pasado de ${G.TOPE_SESION}, lo que sobra muele poco ese día.</p>` : '';
  const { nodo: h, cerrar } = hoja(`<h2>A la tolva</h2><p class="sub">Va al final de hoy: 3 series, en su rango.</p>
    <div class="fila-chips grupos-tolva">${G.GRUPOS.map(([id, nombre]) => `<button class="chip" type="button" data-g="${id}" aria-pressed="${id === grupo}">${nombre}</button>`).join('')}</div>
    <ul class="opciones">${filas}</ul>${nota}`);
  escalonar(h.querySelectorAll('.opciones li'), { desde: 100, retraso: 30 });
  h.querySelectorAll('[data-g]').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.g === grupo) return;
    cerrar(); S.toque('pop'); setTimeout(() => aLaTolva(s, nav, b.dataset.g), 200);
  }));
  h.querySelectorAll('[data-ej]').forEach((b) => b.addEventListener('click', async () => {
    const nuevo = G.slotNuevo(b.dataset.ej);
    s.plan.push(nuevo);
    await guardarSesion(s);
    cerrar(); S.toque('barrido'); vibrar();
    avisar(`${G.ejercicio(nuevo.ej).nombre}, a la tolva.`, { texto: 'Ir ahora', hacer: () => nav.reemplazar('serie', { sesionId: s.id, i: s.plan.length - 1 }) });
  }));
}

/** Storyboard «guardar serie» (G84): 0-150 ms los números se encogen en un grano; 150-500 ms vuela en arco a su hueco;
 *  500 ms cae con un rebote corto y un destello que se apaga. */
async function hacerseGrano(numeros, hueco) {
  if (!numeros || !hueco || reduceMovimiento()) {
    hueco?.querySelector('path')?.setAttribute('class', 'lleno'); hueco?.classList.remove('late');
    await espera(200); return;
  }
  const r = numeros.getBoundingClientRect();
  const x0 = r.left + r.width / 2, y0 = r.top + 120;
  await numeros.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.3)' }], { duration: 160, easing: 'cubic-bezier(.55,0,1,.45)', fill: 'forwards' }).finished;
  const h = hueco.getBoundingClientRect(), x1 = h.left + h.width / 2, y1 = h.top + h.height / 2;
  const v = document.createElement('div'); v.className = 'volador'; v.innerHTML = grano(true);
  v.style.left = `${x0}px`; v.style.top = `${y0}px`; document.body.append(v);
  const cx = (x0 + x1) / 2 + 30, cy = Math.min(y0, y1) - 80;
  const pts = [];
  for (let k = 0; k <= 12; k++) {
    const t = k / 12, x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1, y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1;
    pts.push({ transform: `translate(${x - x0}px,${y - y0}px) rotate(${t * 220}deg) scale(${1 - t * 0.55})` });
  }
  await v.animate(pts, { duration: 340, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }).finished;
  v.remove();
  hueco.querySelector('path')?.setAttribute('class', 'lleno'); hueco.classList.remove('late');
  hueco.animate([{ transform: 'scale(1.5)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'cubic-bezier(.34,1.56,.64,1)' });
  const d = document.createElement('div'); d.className = 'destello'; d.style.left = `${x1}px`; d.style.top = `${y1}px`; document.body.append(d);
  d.animate([{ opacity: 1, transform: 'scale(.5)' }, { opacity: 0, transform: 'scale(1.6)' }], { duration: 420, easing: 'ease-out' }).finished.then(() => d.remove());
  vibrar();
  await espera(160);
}

// ── El descanso (G79, G115-G117): soltar, preparar la siguiente y reanimarse ──────
const F3 = ['Embúllate.', 'Arriba, que vuelve la piedra.', 'Al terrero.'];
let ultimaFrase = '';
/** Una frase al azar, nunca la misma dos veces seguidas. */
const elige = (l) => { let f; do { f = l[Math.floor(Math.random() * l.length)]; } while (f === ultimaFrase && l.length > 1); ultimaFrase = f; return f; };
/** La señal de la siguiente (R29), con la regla del vistazo: una palabra y una flecha. */
const SENALES = { igual: ['igual', 'Igual'], sube: ['sube', 'Sube'], baja: ['baja', 'Baja'], mas: ['mas', 'Una más'] };
const NG = 24; // granos de la corona

/** El porqué de la señal, para la libreta (la teoría de R29; en pantalla solo va la palabra). */
function porqueSenal(prep, ultima) {
  const qued = ultima ? (ultima.rir === 4 ? '4 o más' : ultima.rir) : null;
  const de = ultima ? `Hiciste ${kg(ultima.peso)} × ${ultima.reps} y te quedaban ${qued}.` : '';
  const t = {
    sube: `<b>Sube (R29):</b> ${de} Te sobró margen y ya estás arriba del rango: un escalón más, sin pasar de un 10 % sobre tu mejor fuerza reciente (ley 7).`,
    mas: `<b>Una más (R29):</b> ${de} Te sobró margen, pero aún no estás arriba del rango: mismo peso y una rep más.`,
    baja: `<b>Baja (R29):</b> ${de} Costó más de lo que tocaba: un escalón menos para que la serie salga con buena técnica.`,
    igual: `<b>Igual (R29):</b> ${de} Fue justo lo que tocaba: repite.`,
  };
  return [t[prep?.senal ?? 'igual'], 'Lo que dejes aquí es lo que sale al empezar. Solo esta serie.'];
}

export function descansoPantalla(params, nav) {
  const { sesionId } = params;
  const s = sesionPorId(sesionId);
  const d = s?.descanso;
  if (!s || !d) return seriePantalla({ sesionId, i: s?.actual ?? 0 }, nav);
  const desde = s.plan[d.desde], sig = s.plan[d.siguiente];
  const ejDesde = G.ejercicio(desde.ej), ejSig = G.ejercicio(sig.ej);
  const hechasDesde = seriesDelHueco(s, d.desde);
  const hechasSig = seriesDelHueco(s, d.siguiente).length;
  const pSig = prescripcion(sig);
  const ultima = hechasDesde.at(-1);
  // El mismo ejercicio (si en el descanso lo cambias por otra maña, ya no: entra su «Ahora», con sus piedras si tocan).
  const mismoHueco = d.siguiente === d.desde;
  const mismo = mismoHueco && (!ultima || ultima.ejercicioId === sig.ej);
  const escSig = escalonDe(sig.ej);
  const lastreSig = !!ejSig.lastre;
  const objetivoSig = pSig.reps[Math.min(hechasSig, pSig.reps.length - 1)] ?? sig.repMin;
  // «Lo molido» (G115): acabas un ejercicio. Resumen, la ñapa y lo que viene.
  const molido = !mismoHueco && hechasDesde.length >= desde.series;

  // R29 · La siguiente del mismo ejercicio, preparada (la dejó guardar(); si no está, se calcula ahora).
  let prep = null;
  if (mismo) {
    prep = s.prep && s.prep.i === d.siguiente && s.prep.n === hechasSig ? s.prep : null;
    if (!prep && ultima) {
      const r = G.siguienteSerie({ hecha: ultima, repsObjetivo: objetivoSig, repMin: sig.repMin, repMax: sig.repMax, tipo: ejSig.tipo, escalon: escSig, mejorReciente: mejorReciente(sig.ej) });
      prep = s.prep = { i: d.siguiente, n: hechasSig, peso: r.peso, reps: r.reps, fallo: false, senal: r.senal, gofio: { peso: r.peso, reps: r.reps } };
      guardarSesion(s);
    }
    if (prep && !prep.gofio) prep.gofio = { peso: prep.peso, reps: prep.reps };
  }
  // Lo que viene, si es otro ejercicio: su peso y, si toca arrimar (R28, con tu jeito), sus piedras.
  const pesoOtro = seriesDelHueco(s, d.siguiente).filter((x) => x.ejercicioId === sig.ej).at(-1)?.peso ?? pSig.peso;
  const arOtro = !mismo && hechasSig === 0 && pesoOtro != null ? (() => {
    const estilo = G.estiloArrimar(historialArrimar(sig.ej, s.id));
    const a = G.arrimar({ trabajo: pesoOtro, escalon: escSig, tipo: ejSig.tipo, repsObjetivo: objetivoSig, lastre: lastreSig, hechas: (s.calentamientos ?? []).filter((c) => c.i === d.siguiente), estilo });
    return estilo?.n === 0 || (s.arrimarSaltado ?? []).includes(d.siguiente) ? { piedras: [] } : a;
  })() : { piedras: [] };
  const queSig = () => (mismo && prep ? `${kg(prep.peso)} × ${prep.reps}` : pesoOtro != null ? `${kg(pesoOtro)} × ${objetivoSig}` : `${objetivoSig} reps`);

  // Las frases del segundo tramo, solo si son verdad (concepto, sección 2).
  const F2 = ['La siguiente, con jeito.'];
  if (mismo && ultima && prep?.senal === 'igual') F2.push('Misma maña, mismo peso.');
  if (mismo && ultima && ultima.rir >= 1 && ultima.rir <= 3 && prep?.senal === 'igual') F2.push(`${ultima.rir === 1 ? 'Te quedaba 1' : `Te quedaban ${ultima.rir}`}. Busca lo mismo.`);
  if (mismo && ultima) {
    const record = mejorAntes(sig.ej, s.id);
    if (record > 0 && G.e1rm(ultima.peso, ultima.reps, ultima.rir) <= record && G.e1rm(ultima.peso, ultima.reps + 1, ultima.rir) > record) F2.push('Un fisco más y es marca.');
  }
  if (!mismo) F2.push('Ve preparando la máquina.');

  // ── Piezas ──
  const muelaHTML = (clase = '') => `<div class="muela-descanso ${clase}" aria-hidden="true">${coronaGranos(NG)}<img src="iconos/disco-millo.svg" alt="" width="300" height="300" draggable="false"></div>`;
  const relojHTML = `<p class="cifra descanso-reloj num" data-reloj role="timer" aria-label="Tiempo de descanso">${mmss(d.total)}</p>`;
  const [senalIco, senalTxt] = SENALES[prep?.senal ?? 'igual'];
  const dejaSig = deja(pSig.rir);
  // G120 · La siguiente, en una línea (la regla del vistazo también en el descanso). Tocarla abre la hoja para cambiarla.
  const lineaSig = prep ? `<button class="linea-sig" type="button" data-linea-sig data-son="0" aria-label="La siguiente: serie ${hechasSig + 1}. Tocar para cambiarla">
      <span class="ls-texto"><span class="ts-etiqueta">La siguiente · serie ${hechasSig + 1}</span>
        <span class="ls-que"><b class="cifra num" data-ls-que>${kg(prep.peso)} × ${prep.reps}</b><span data-ls-deja>${prep.fallo ? 'al fallo' : esc(dejaSig)}</span></span></span>
      <span class="ts-senal senal-${prep.senal}">${icono(senalIco === 'mas' ? 'sube' : senalIco)}${senalTxt}</span>${icono('sigue', 'class="ls-flecha"')}
    </button>` : '';
  const loQueViene = `<div class="lo-que-viene" data-lqv><span class="ts-etiqueta">Lo que viene</span><span class="lqv-fila"><b class="lqv-nombre">${esc(ejSig.nombre)}</b><b class="cifra lqv-que">${esc(queSig())}</b></span></div>`;
  // Lo molido (G120): una tarjeta con dos datos. Si la fuerza sube, cuánto; si no, tu mejor serie de hoy. Y la próxima vez.
  let resumen = '';
  if (molido) {
    const mejor = hechasDesde.reduce((m, x) => (G.e1rm(x.peso, x.reps, x.rir) > G.e1rm(m.peso, m.reps, m.rir) ? x : m), hechasDesde[0]);
    const antes = mejorAntes(desde.ej, s.id);
    const pct = antes > 0 ? Math.round((G.e1rm(mejor.peso, mejor.reps, mejor.rir) / antes - 1) * 100) : null;
    const pesoTrabajo = hechasDesde.at(-1).peso;
    const px = G.proximaVez({ peso: pesoTrabajo, series: hechasDesde.filter((x) => x.peso === pesoTrabajo).map((x) => ({ reps: x.reps, rir: x.rir })), repMin: desde.repMin, repMax: desde.repMax, tipo: ejDesde.tipo, escalon: escalonDe(desde.ej) });
    const proxima = px.accion === 'subir' ? `${icono('sube')}${kg(px.peso)} kg` : px.accion === 'bajar' ? `${icono('baja')}${kg(px.peso)} kg` : `${kg(px.peso)} kg, una más`;
    const dato = pct != null && pct >= 1
      ? `<p class="mol-fuerza">${icono('sube')}+${pct} % de fuerza</p>`
      : `<p class="mol-mejor"><span>Tu mejor serie</span><b class="cifra num">${kg(mejor.peso)} × ${mejor.reps}</b></p>`;
    resumen = `<div class="tarjeta-molido">
      <div><h2 class="titular molido-titulo">Lo molido</h2><p class="molido-ej">${esc(ejDesde.nombre)}</p></div>
      ${dato}
      <p class="mol-proxima"><span>La próxima</span><b>${proxima}</b></p>
    </div>`;
  }
  const chips = molido
    ? `<button class="chip" type="button" data-nyapa data-son="none">${icono('grano')}La ñapa</button>
        <button class="chip" type="button" data-d-cambiar>${icono('cambiar')}Otra maña</button>
        <button class="chip" type="button" data-d-terminar>${icono('fin')}Terminar</button>
        ${ultima ? '<button class="chip" type="button" data-d-borrar>Borrar la última</button>' : ''}`
    : `<button class="chip" type="button" data-d-cambiar>${icono('cambiar')}Otra maña</button>
        <button class="chip" type="button" data-d-terminar>${icono('fin')}Terminar</button>
        ${!mismo && ultima ? '<button class="chip" type="button" data-d-borrar>Borrar la última</button>' : ''}`;

  const nodo = el(`<section class="descanso${molido ? ' lo-molido' : ''}${mismo ? '' : ' otro-ej'}" aria-labelledby="titulo-descanso">
    <div class="luz" aria-hidden="true"></div>
    <h1 class="oculto" id="titulo-descanso">${molido ? 'Lo molido' : 'Descanso'}</h1>
    <div class="serie-cabeza">
      <button class="volver" type="button" data-volver>${icono('atras')}Hoy</button>
      <span class="cabeza-granos">${granos(hechasDesde.length, desde.series, -1, { clase: 'millo-tenue' })}</span>
      <button class="libreta-boton" type="button" data-libreta aria-label="La libreta">${icono('libreta')}</button>
    </div>
    ${muelaHTML()}${relojHTML}
    <p class="titular descanso-frase suelta" data-frase aria-live="polite"></p>
    ${molido ? `${resumen}${loQueViene}` : mismo ? lineaSig : loQueViene}
    <div class="puntos" data-puntos aria-hidden="true"><span></span><span></span><span></span></div>
    <div class="pie-fuerza">
      <div class="pie-chips">
        ${chips}
      </div>
      <div class="fila-accion descanso-accion">
        <button class="boton-pintadera" type="button" data-mas data-son="aire" aria-label="Treinta segundos más">${pintadera('+30')}</button>
        <button class="boton ${mismo ? 'boton-brega' : ''}" type="button" data-ya data-son="none">${mismo ? '¡A la brega!' : 'Al siguiente'}</button>
      </div>
    </div>
  </section>`);

  const muela = nodo.querySelector('.muela-descanso img');
  const cgs = [...nodo.querySelectorAll('.corona-granos .cg')];
  const reloj = nodo.querySelector('[data-reloj]');
  const frase = nodo.querySelector('[data-frase]');
  const puntos = nodo.querySelector('[data-puntos]');
  const linea = nodo.querySelector('[data-linea-sig]');
  const quieto = reduceMovimiento();
  let tramo = -1, raf = 0, ultimoSeg = -1, acabado = false, llenos = -1;

  function ponFrase(f, clase = '') {
    frase.className = `titular descanso-frase ${clase}`;
    if (quieto) { frase.textContent = f; return; }
    frase.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, fill: 'forwards' }).finished.then(() => {
      frase.textContent = f;
      frase.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' });
    });
  }
  function ponTramo(t, quedan) {
    if (t === tramo) return;
    tramo = t;
    nodo.classList.toggle('mira', t === 1); nodo.classList.toggle('reanima', t === 2);
    // Soltar (G115): la frase va con lo que acabas de mover; «Suelta los brazos» no sale tras un día de pierna.
    if (t === 0) { const f = G.animo(desde.ej, 'soltar', { evitar: ultimaFrase }); ultimaFrase = f; ponFrase(f, 'suelta'); }
    if (t === 1) ponFrase(elige(F2));
    if (t === 2) { ponFrase(elige(F3)); S.suena('sube', 0, Math.max(1, quedan)); }
    avisoServidor();
  }
  // Para los avisos si sales de la app (G79): la frase de la reanimación y la siguiente serie.
  function avisoServidor() {
    descansoEnCurso({ hasta: d.hasta, frase: F3[0], siguiente: `Te toca ${mismo ? `la serie ${hechasSig + 1} de ${ejSig.nombre.toLowerCase()}` : ejSig.nombre.toLowerCase()}: ${queSig()}.` });
  }
  // La corona: un grano por cada 1/24 del descanso; se van moliendo y vuelven con +30.
  function pintarCorona(quedan, total) {
    const n = Math.max(0, Math.min(NG, Math.ceil(NG * quedan / total)));
    if (n === llenos) return;
    const antes = llenos; llenos = n;
    cgs.forEach((g, k) => g.classList.toggle('cg-molido', k >= n));
    if (antes > n && antes !== -1 && cgs[n] && !quieto) cgs[n].animate([{ opacity: 1 }, { opacity: 0.15 }, { opacity: 1 }], { duration: 420, easing: 'ease-out' });
  }
  function cuadro() {
    const quedanMs = d.hasta - Date.now();
    const quedan = Math.max(0, quedanMs / 1000);
    const total = d.total;
    const transc = total - quedan;
    ponTramo(quedan <= 10 ? 2 : transc >= total / 3 ? 1 : 0, quedan);
    // La muela: una vuelta en todo el descanso (mide el tiempo, lineal); en los últimos 10 s acelera (G79).
    const extra = quedan < 10 ? 13 * (10 - quedan) ** 2 : 0;
    if (!quieto) muela.style.transform = `rotate(${360 * transc / total + extra}deg)${quedan < 10 && quedan > 0 ? ` scale(${1 + (10 - quedan) * 0.006})` : ''}`;
    pintarCorona(quedan, total);
    const seg = Math.ceil(quedan);
    if (seg !== ultimoSeg) {
      const primero = ultimoSeg === -1;
      ultimoSeg = seg; reloj.textContent = mmss(quedan);
      if (!primero && seg > 3) S.reloj(seg, seg <= 10);
      if (!primero && seg <= 3 && seg >= 1) S.suena('chacara', 0, 0.75 + (3 - seg) * 0.12);
      puntos.style.opacity = seg <= 3 && seg >= 1 ? 1 : 0;
      puntos.querySelectorAll('span').forEach((p, k) => p.classList.toggle('on', seg <= 3 && k < 4 - seg));
    }
    if (quedanMs <= 0) { fin(); return; }
    raf = requestAnimationFrame(cuadro);
  }
  // Empezar: con el mismo ejercicio, tambor, «¡A LA BREGA!» y directo a Moliendo con lo preparado (G115).
  // Con otro, a su «Ahora» (y sus piedras, si tocan).
  async function empezar({ solo = false } = {}) {
    await guardarPrep(true);
    delete s.descanso; await guardarSesion(s);
    if (mismo || solo) {
      S.suena('tambor'); vibrarTambor();
      await aLaBrega({ hechas: hechasSig, total: sig.series, alCambiar: () => nav.reemplazar('serie', { sesionId: s.id, i: d.siguiente, ...(mismo ? { momento: 'moliendo' } : {}) }, { sinAnimacion: true }) });
    } else {
      S.toque('barrido'); vibrar();
      nav.reemplazar('serie', { sesionId: s.id, i: d.siguiente, anima: true }, { duracion: 260 });
    }
  }
  // G96 · Al llegar a cero ya no hay que tocar nada. Si la app no está a la vista (has salido), se espera a que vuelvas.
  function fin() {
    if (acabado) return; acabado = true;
    S.ambienteOff(); S.pararReanima();
    reloj.textContent = '0:00'; puntos.style.opacity = 0; pintarCorona(0, 1);
    descansoEnCurso(null);
    const ir = () => { if (nodo.isConnected) empezar({ solo: true }); };
    if (document.hidden) document.addEventListener('visibilitychange', function vuelta() { if (!document.hidden) { document.removeEventListener('visibilitychange', vuelta); ir(); } });
    else ir();
  }
  const parar = () => { cancelAnimationFrame(raf); S.ambienteOff(); S.pararReanima(); descansoEnCurso(null); };

  // ── La tarjeta de la siguiente (R29, G115): se cambia aquí y la serie sale con eso ──
  let tPrep = 0, sucio = false;
  async function guardarPrep(ya = false) {
    clearTimeout(tPrep);
    if (!sucio) return;
    if (ya) { sucio = false; await guardarSesion(s); return; }
    tPrep = setTimeout(() => { sucio = false; guardarSesion(s); }, 450);
  }
  // La línea de la siguiente: lo cambiado, en millo (lo de Gofio, en la hoja).
  function pintarLinea() {
    if (!linea) return;
    const q = linea.querySelector('[data-ls-que]');
    q.textContent = `${kg(prep.peso)} × ${prep.reps}`;
    q.classList.toggle('cambiado', prep.peso !== prep.gofio.peso || prep.reps !== prep.gofio.reps);
    linea.querySelector('[data-ls-deja]').textContent = prep.fallo ? 'al fallo' : dejaSig;
    encajar(q, { caja: linea.querySelector('.ls-texto') });
  }
  // G120 · La hoja «La siguiente»: peso, reps, deja o al fallo, volver a lo de Gofio y borrar la última. Solo esta serie.
  function hojaSiguiente() {
    const minis = (que) => [-1, 1].map((dir) => `<button class="redondo" type="button" data-hs="${que}" data-dir="${dir}" data-son="${dir}" aria-label="${que === 'peso' ? (dir > 0 ? 'Sumar el escalón' : 'Restar el escalón') : (dir > 0 ? 'Una rep más' : 'Una rep menos')}">${icono(dir > 0 ? 'mas' : 'menos')}</button>`);
    const [mp, Mp] = minis('peso'), [mr, Mr] = minis('reps');
    const { nodo: h, cerrar } = hoja(`<div class="hoja-siguiente"><h2>La siguiente</h2><p class="sub">Serie ${hechasSig + 1} · ${esc(ejSig.nombre)}. Solo esta serie.</p>
      <div class="contador">${mp}<div class="valor"><button type="button" data-hs-peso data-son="0" aria-label="Escribir el peso"><span class="cifra peso num" data-hv-peso></span></button><span class="unidad">${lastreSig ? 'kg de lastre' : 'kg'}</span></div>${Mp}</div>
      <div class="contador">${mr}<div class="valor"><button type="button" data-hs-reps data-son="0" aria-label="Escribir las reps"><span class="cifra reps num" data-hv-reps></span></button><span class="unidad">reps</span></div>${Mr}</div>
      <div class="segmentado hs-deja" role="radiogroup" aria-label="Hasta dónde">
        <button type="button" role="radio" data-hs-fallo="0" data-son="pop">${esc(dejaSig.replace(/^d/, 'D'))}</button>
        <button type="button" role="radio" data-hs-fallo="1" data-son="pop">Al fallo</button><span class="seg-fondo" aria-hidden="true"></span></div>
      <div class="hs-gofio" data-hs-gofio hidden><span data-hs-gofio-txt></span><button class="enlace" type="button" data-hs-volver data-son="-1">${icono('cambiar')}Volver a lo de Gofio</button></div>
      ${ultima ? `<button class="enlace hs-borrar" type="button" data-hs-borrar>Borrar la última (${kg(ultima.peso)} × ${ultima.reps})</button>` : ''}
      <button class="boton hs-listo" type="button" data-hs-listo data-son="none">Listo</button></div>`);
    const vP = h.querySelector('[data-hv-peso]'), vR = h.querySelector('[data-hv-reps]');
    const seg = h.querySelector('.hs-deja'), fondo = seg.querySelector('.seg-fondo');
    const bote = (x) => { if (!quieto) x.animate([{ transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 180, easing: 'cubic-bezier(.22,1,.36,1)' }); };
    const colocar = (animar) => {
      const b = seg.querySelector(`[data-hs-fallo="${prep.fallo ? 1 : 0}"]`);
      seg.querySelectorAll('[data-hs-fallo]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
      const x = b.offsetLeft;
      if (animar && !quieto) fondo.animate([{ transform: fondo.style.transform || 'none' }, { transform: `translateX(${x - 4}px)` }], { duration: 240, easing: 'cubic-bezier(.22,1,.36,1)' });
      fondo.style.transform = `translateX(${x - 4}px)`; fondo.style.width = `${b.offsetWidth}px`;
    };
    const pintar = (que) => {
      vP.textContent = kg(prep.peso); vR.textContent = prep.reps;
      const cp = prep.peso !== prep.gofio.peso, cr = prep.reps !== prep.gofio.reps;
      vP.classList.toggle('cambiado', cp); vR.classList.toggle('cambiado', cr);
      if (que) bote(que === 'peso' ? vP : vR);
      const g = h.querySelector('[data-hs-gofio]'), antes = !g.hidden;
      g.hidden = !(cp || cr);
      h.querySelector('[data-hs-gofio-txt]').innerHTML = `Gofio: <s>${kg(prep.gofio.peso)} × ${prep.gofio.reps}</s>`;
      if (!g.hidden && !antes && !quieto) g.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
      encajar(vP, { caja: vP.closest('.valor') });
      pintarLinea(); sucio = true; guardarPrep(); if (tramo >= 0) avisoServidor();
    };
    const paso = (que, dir, veces = 1) => {
      if (que === 'peso') for (let k = 0; k < veces; k++) prep.peso = Math.max(0, G.siguienteEscalon(prep.peso, escSig, dir));
      else prep.reps = Math.max(1, Math.min(60, prep.reps + dir * veces));
      pintar(que);
    };
    h.querySelectorAll('[data-hs]').forEach((b) => repetir(b, (v) => paso(b.dataset.hs, Number(b.dataset.dir), v)));
    h.querySelector('[data-hs-peso]').onclick = async () => {
      const v = await pedirNumero({ titulo: lastreSig ? 'Lastre' : 'Peso', sub: 'Para la siguiente.', valor: prep.peso });
      if (v != null) { prep.peso = v; pintar('peso'); }
    };
    h.querySelector('[data-hs-reps]').onclick = async () => {
      const v = await pedirNumero({ titulo: 'Reps', sub: 'Para la siguiente.', valor: prep.reps, unidad: 'reps', decimal: false });
      if (v != null) { prep.reps = Math.max(1, Math.min(60, Math.round(v))); pintar('reps'); }
    };
    seg.querySelectorAll('[data-hs-fallo]').forEach((b) => b.addEventListener('click', () => {
      const f = b.dataset.hsFallo === '1'; if (f === prep.fallo) return;
      prep.fallo = f; vibrar(); colocar(true); pintarLinea(); sucio = true; guardarPrep();
    }));
    h.querySelector('[data-hs-volver]').onclick = () => { prep.peso = prep.gofio.peso; prep.reps = prep.gofio.reps; vibrar(); pintar('peso'); };
    h.querySelector('[data-hs-borrar]')?.addEventListener('click', async () => {
      cerrar(); await espera(260);
      const ok = await confirmarHoja({ titulo: '¿Borrar la última?', texto: `${kg(ultima.peso)} kg × ${ultima.reps}, te quedaban ${ultima.rir === 4 ? '4 o más' : ultima.rir}. Vuelves a esa serie.`, si: 'Borrar', no: 'Dejarla' });
      if (ok) borrarUltima();
    });
    h.querySelector('[data-hs-listo]').onclick = () => { S.toque(0); vibrar(); guardarPrep(true); cerrar(); };
    pintar(); requestAnimationFrame(() => colocar(false));
    escalonar(h.querySelectorAll('.hoja-siguiente > *'), { desde: 80, retraso: 30 });
  }
  linea?.addEventListener('click', hojaSiguiente);
  async function borrarUltima() {
    acabado = true; parar();
    await borrarSerie(ultima); delete s.descanso; delete s.prep; await guardarSesion(s);
    nav.reemplazar('serie', { sesionId: s.id, i: d.desde, anima: true }, { duracion: 240 });
  }
  nodo.querySelector('[data-libreta]').onclick = () => abrirLibreta({
    ejId: mismo ? sig.ej : desde.ej,
    porque: mismo ? porqueSenal(prep, ultima) : [`<b>${esc(ejDesde.nombre)}:</b> ${hechasDesde.length} ${hechasDesde.length === 1 ? 'serie' : 'series'} hoy.`],
    pestana: molido ? 'molino' : 'porque',
  });

  // G118 · En mitad del ejercicio: cambiar lo que viene (máquina ocupada), borrar la última si te equivocaste, o terminar.
  nodo.querySelector('[data-d-cambiar]').onclick = () => otraMana(s, d.siguiente, () => { parar(); nav.reemplazar('descanso', { sesionId: s.id }, { sinAnimacion: true }); });
  nodo.querySelector('[data-d-borrar]')?.addEventListener('click', async () => {
    const ok = await confirmarHoja({ titulo: '¿Borrar la última?', texto: `${kg(ultima.peso)} kg × ${ultima.reps}, te quedaban ${ultima.rir === 4 ? '4 o más' : ultima.rir}. Vuelves a esa serie.`, si: 'Borrar', no: 'Dejarla' });
    if (ok) borrarUltima();
  });
  nodo.querySelector('[data-d-terminar]').onclick = () => dejarlo(s, nav, () => { acabado = true; parar(); });

  // «La ñapa» (G115): una serie más de regalo, preparada con la última. El descanso sigue contando.
  nodo.querySelector('[data-nyapa]')?.addEventListener('click', async (e) => {
    const b = e.currentTarget; if (b.dataset.va) return; b.dataset.va = '1';
    desde.series += 1; desde.extra = (desde.extra ?? 0) + 1;
    const pD = prescripcion(desde);
    const r = G.siguienteSerie({ hecha: ultima, repsObjetivo: pD.reps[Math.min(hechasDesde.length, pD.reps.length - 1)] ?? desde.repMin, repMin: desde.repMin, repMax: desde.repMax, tipo: ejDesde.tipo, escalon: escalonDe(desde.ej), mejorReciente: mejorReciente(desde.ej) });
    s.prep = { i: d.desde, n: hechasDesde.length, peso: r.peso, reps: r.reps, fallo: false, senal: r.senal, gofio: { peso: r.peso, reps: r.reps } };
    d.siguiente = d.desde;
    await guardarSesion(s);
    S.suena('punado'); vibrar();
    const v = G.volumen(s.plan);
    const m = Object.entries(ejDesde.musculos).find(([, f]) => f === 1)?.[0];
    if (m && v[m] > G.TOPE_SESION) avisar(`${musculoCorto(m).replace(/^./, (c) => c.toUpperCase())}: ya van ${String(v[m]).replace('.', ',')} hoy.`);
    if (!quieto) await nodo.querySelector('.tarjeta-molido').animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(-10px)' }], { duration: 200, easing: 'ease-in', fill: 'forwards' }).finished;
    parar();
    nav.reemplazar('descanso', { sesionId: s.id, nyapa: true }, { sinAnimacion: true });
  });

  nodo.querySelector('[data-volver]').onclick = async () => { await guardarPrep(true); nav.volver(); };
  // +30 con una pintadera: se estampa (G115) y la corona recupera sus granos.
  const pinta = nodo.querySelector('[data-mas]');
  pinta.onclick = async () => {
    S.pararReanima();
    d.hasta += 30000; d.total += 30;
    if (!quieto) {
      pinta.querySelector('svg').animate([{ transform: 'rotate(0) scale(1)' }, { transform: 'rotate(-24deg) scale(.86)', offset: 0.35 }, { transform: 'rotate(8deg) scale(1.1)', offset: 0.7 }, { transform: 'rotate(0) scale(1)' }], { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)' });
      const h = document.createElement('span'); h.className = 'pt-huella'; pinta.append(h);
      h.animate([{ opacity: 0.7, transform: 'scale(.7)' }, { opacity: 0, transform: 'scale(1.7)' }], { duration: 520, delay: 140, easing: 'ease-out', fill: 'both' }).finished.then(() => h.remove());
    }
    if (acabado) return;
    if (tramo === 2 && (d.hasta - Date.now()) / 1000 > 10) tramo = -1;
    vibrar(); await guardarSesion(s); avisoServidor();
  };
  nodo.querySelector('[data-ya]').onclick = (e) => {
    const b = e.currentTarget; if (b.dataset.va) return; b.dataset.va = '1';
    acabado = true; parar(); empezar();
  };
  return {
    nodo, pestana: null,
    alEntrar(o = {}) {
      mantenerEncendida(true); cancelAnimationFrame(raf);
      requestAnimationFrame(() => { pintarLinea(); nodo.querySelectorAll('.lqv-que, .mol-mejor b, .mol-proxima b').forEach((b) => encajar(b)); });
      if (d.hasta > Date.now()) setTimeout(() => S.ambienteOn(), 500);
      raf = requestAnimationFrame(cuadro);
      if (quieto || o.refresco) return;
      if (params.entrada) {
        params.entrada = false;
        S.suena('rodar');
        // La muela llega rodando desde la derecha y frena largo en el centro (storyboard, 600-1000 ms).
        nodo.querySelector('.muela-descanso').animate([{ translate: '120vw 0', rotate: '540deg' }, { translate: '0 0', rotate: '0deg' }], { duration: 520, easing: 'cubic-bezier(.22,1,.36,1)' });
        cgs.forEach((g, k) => g.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: 380 + k * 14, fill: 'backwards' }));
        escalonar(nodo.querySelectorAll('.tarjeta-molido, .linea-sig, .lo-que-viene, .pie-fuerza .chip, .descanso-accion > *'), { desde: 260, retraso: 45 });
      }
      if (params.nyapa) {
        params.nyapa = false;
        // El grano de regalo cae en su hueco y la tarjeta de la siguiente sube.
        [...nodo.querySelectorAll('.cabeza-granos .grano')].at(-1)?.animate([{ transform: 'translateY(-22px) scale(1.4)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)' });
        escalonar(nodo.querySelectorAll('.linea-sig'), { desde: 60, retraso: 50 });
      }
    },
    alSalir() { parar(); guardarPrep(true); },
  };
}
