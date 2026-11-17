// «La serie: el terrero» (lienzo: Serie.dc.html y SerieDos.dc.html; G78, G105: «Ahora» y «¿Cómo fue?») y «El descanso» (Descanso.dc.html; G79).
// Basalto, números grandes y pocas palabras. Guardar una serie: los números se hacen grano, el grano vuela a su hueco
// y la muela del descanso llega rodando (storyboard y prototipo v5). Sonidos: G83.
import * as G from '../cerebro/index.js';
import { estado, prescripcion, seriesDelHueco, siguienteHueco, guardarSerie, borrarSerie, guardarSesion, terminarSesion,
  escalonDe, descansoDe, ponerNota } from '../logica.js';
import { el, esc, kg, mmss, icono, grano, granos, ajustarTitulo, hoja, pedirNumero, vibrar, reduceMovimiento, escalonar, pop } from '../ui.js';
import * as S from '../sonidos.js';
import { descansoEnCurso } from '../avisos.js';
import { aLaBrega } from '../amoler.js';

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

export function seriePantalla({ sesionId, i = 0 }, nav) {
  const s = sesionPorId(sesionId);
  if (!s) return { nodo: el('<section><p>Esta sesión ya no existe.</p></section>') };
  if (s.actual !== i) { s.actual = i; guardarSesion(s); }
  const slot = s.plan[i];
  const ej = G.ejercicio(slot.ej);
  const hechas = seriesDelHueco(s, i);
  const n = hechas.length;                // índice de la serie que toca
  const p = prescripcion(slot);
  const total = slot.series;
  const ultimaHoy = hechas.at(-1);
  let peso = ultimaHoy?.peso ?? p.peso;
  let reps = p.reps[Math.min(n, p.reps.length - 1)] ?? slot.repMin;
  let rir = null;   // G105: la reserva no viene marcada; la eliges al acabar la serie
  const repsMeta = reps, pesoMeta = peso;
  const escalon = escalonDe(slot.ej);
  const lastre = !!ej.lastre;
  const aviso = avisoDe(p, slot, n);
  const record = mejorAntes(slot.ej, s.id);
  const restoTotal = s.plan.reduce((acc, _, k) => acc + Math.max(0, s.plan[k].series - seriesDelHueco(s, k).length), 0);
  const esUltima = restoTotal === 1;

  // G105 · Dos momentos en la misma pantalla: «Ahora» (lo que toca, en grande) y, al tocar «Hecha», «¿Cómo fue?».
  const rep = rango(slot.repMin, slot.repMax);
  const unidad = lastre ? 'kg de lastre' : 'kg';
  const ahoraNumeros = peso == null
    ? `<b class="titular ahora-texto">Un peso que te deje ${rep}</b><p class="ahora-pista">El peso que pongas lo apuntas al acabar.</p>`
    : `<b class="cifra ahora-peso num" data-ahora-peso>${kg(peso)}</b><span class="unidad">${unidad}</span>
       <b class="cifra ahora-reps num" data-ahora-reps><i class="por" aria-hidden="true">×</i>${reps}</b><span class="unidad">reps</span>`;
  const nodo = el(`<section class="serie" data-momento="ahora" aria-labelledby="titulo-serie">
    <div class="serie-cabeza">
      <button class="volver" type="button" data-volver>${icono('atras')}Hoy</button>
      ${granos(n, total, -1, { ahora: true, clase: 'millo-tenue' })}
    </div>
    <h1 class="titular serie-titulo ahora-solo" id="titulo-serie">${esc(ej.nombre)}</h1>
    <button class="aviso-serie ahora-solo" type="button" data-aviso aria-label="${esc(aviso.texto)}. Ver por qué">${icono(aviso.icono)}<span data-aviso-txt>${esc(aviso.corto)}</span></button>
    <div class="ahora ahora-solo" data-ahora>
      <span class="ahora-etiqueta">Ahora</span>
      ${ahoraNumeros}
      <span class="ahora-deja">${deja(p.rir).replace(/^d/, 'D')}</span>
    </div>
    <div class="como-cabeza como-solo">
      <h2 class="titular">¿Cómo fue?</h2>
      <p>${esc(ej.nombre)} · si cambió algo, tócalo</p>
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
      <div class="rir" role="group" aria-labelledby="rir-t">
        <h3 class="titular" id="rir-t">¿Cuántas te quedaban?</h3>
        <div class="rir-botones">${G.BOTONES_RIR.map((v) => `<button type="button" data-rir="${v}" data-son="none" aria-pressed="false">${v === 4 ? '4+' : v}</button>`).join('')}</div>
        <div class="rir-pie"><span>al fallo</span><span>sobrado</span></div>
      </div>
    </div>
    <div class="relleno"></div>
    <div class="como-pie como-solo">
      <p data-como-pista>${esUltima ? 'Tocas una y se guarda: la última.' : 'Tocas una y se guarda: empieza el descanso.'}</p>
      <button class="enlace" type="button" data-aun-no>‹ Aún no la he hecho</button>
    </div>
    <div class="serie-herramientas ahora-solo">
      <button class="chip" type="button" data-cambiar>${icono('cambiar')}Cambiar</button>
      <button class="chip" type="button" data-nota>${icono('nota')}Nota</button>
      <button class="chip" type="button" data-lista>${icono('lista')}Ejercicios</button>
      <button class="chip" type="button" data-terminar>${icono('fin')}Terminar</button>
      ${n > 0 ? '<button class="chip" type="button" data-deshacer>Borrar la última</button>' : ''}
    </div>
    <button class="boton boton-guardar boton-hecha ahora-solo" type="button" data-hecha data-son="none">${icono('check')}Hecha</button>
  </section>`);

  const vPeso = nodo.querySelector('[data-v-peso]');
  const vReps = nodo.querySelector('[data-v-reps]');
  const av = nodo.querySelector('[data-aviso]');
  const avTxt = nodo.querySelector('[data-aviso-txt]');
  const bote = (x) => { if (!reduceMovimiento()) x.animate([{ transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 180, easing: 'cubic-bezier(.22,1,.36,1)' }); };
  // «¡Fuerte marca!» (G78): si lo que vas a guardar supera tu mejor fuerza estimada en este ejercicio (R11).
  let marca = false;
  function mirarMarca() {
    vReps.classList.toggle('cambiado', reps !== repsMeta); vPeso.classList.toggle('cambiado', pesoMeta != null && peso !== pesoMeta);
    const ahora = peso != null && record > 0 && G.e1rm(peso, reps, rir ?? 0) > record + 0.01;
    if (ahora) avTxt.textContent = `¡Fuerte marca! ${kg(peso)} × ${reps}`;
    if (ahora === marca) return;
    marca = ahora;
    av.classList.toggle('marca', marca); vReps.classList.toggle('marca', marca);
    av.querySelector('svg').outerHTML = icono(marca ? 'marca' : aviso.icono);
    if (!marca) avTxt.textContent = aviso.texto;
    else if (!reduceMovimiento()) av.animate([{ transform: 'scale(.94)' }, { transform: 'scale(1.04)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'cubic-bezier(.34,1.56,.64,1)' });
  }
  const pintarPeso = () => { vPeso.textContent = peso == null ? '—' : kg(peso); bote(vPeso); mirarMarca(); };

  nodo.querySelector('[data-volver]').onclick = () => nav.volver();
  nodo.querySelectorAll('[data-peso]').forEach((b) => b.addEventListener('click', () => {
    const dir = Number(b.dataset.peso);
    // −/+ siempre suman o restan el escalón de tu gym; sin peso aún, arrancan en uno de partida (G53).
    if (peso == null) peso = PESO_DE_PARTIDA[lastre ? 'lastre' : ej.equipo] ?? 10;
    else peso = Math.max(0, G.siguienteEscalon(peso, escalon, dir));
    pintarPeso(); vibrar();
  }));
  async function escribirPeso() {
    const v = await pedirNumero({ titulo: lastre ? 'Lastre' : 'Peso', sub: lastre ? 'Kilos extra (0 sin lastre).' : ej.equipo === 'mancuernas' ? 'Kilos de cada mancuerna.' : 'Kilos en total.', valor: peso ?? '' });
    if (v != null) { peso = v; pintarPeso(); }
  }
  nodo.querySelector('[data-escribir-peso]').onclick = escribirPeso;
  nodo.querySelectorAll('[data-reps]').forEach((b) => b.addEventListener('click', () => {
    reps = Math.max(0, Math.min(60, reps + Number(b.dataset.reps))); vReps.textContent = reps; bote(vReps); mirarMarca();
  }));
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
  // «Hecha» → «¿Cómo fue?»: los números grandes bajan y encogen hasta los contadores (FLIP, solo transform y opacity).
  const ahoraPeso = nodo.querySelector('[data-ahora-peso]'), ahoraReps = nodo.querySelector('[data-ahora-reps]');
  function aMomento(m) {
    const desdeP = ahoraPeso?.getBoundingClientRect(), desdeR = ahoraReps?.getBoundingClientRect();
    nodo.dataset.momento = m;
    nodo.scrollTop = 0;
    if (reduceMovimiento()) return;
    const curva = 'cubic-bezier(.22,1,.36,1)';
    if (m === 'como') {
      const flip = (desde, hacia) => {
        if (!desde || !hacia || !desde.height) return;
        const r = hacia.getBoundingClientRect();
        const dx = desde.left + desde.width / 2 - (r.left + r.width / 2), dy = desde.top + desde.height / 2 - (r.top + r.height / 2);
        hacia.animate([{ transform: `translate(${dx}px,${dy}px) scale(${desde.height / r.height})` }, { transform: 'none' }], { duration: 480, easing: curva });
      };
      flip(desdeP, vPeso); flip(desdeR, vReps);
      const aparece = (els, desde, y = 10) => els.forEach((x, k) => x.animate([{ opacity: 0, transform: `translateY(${y}px)` }, { opacity: 1, transform: 'none' }], { duration: 360, delay: desde + k * 40, easing: curva, fill: 'backwards' }));
      aparece([...nodo.querySelectorAll('.como-cabeza > *')], 0, -10);
      aparece([...nodo.querySelectorAll('.contador .redondo, .contador .unidad')], 200, 0);
      aparece([nodo.querySelector('.rir h3'), ...nodo.querySelectorAll('.rir-botones button'), nodo.querySelector('.rir-pie')], 260, 16);
      aparece([...nodo.querySelectorAll('.como-pie > *')], 420, 8);
    } else {
      escalonar(nodo.querySelectorAll('.serie-titulo, .aviso-serie, .ahora > *, .serie-herramientas, .boton-hecha'), { desde: 0, retraso: 35 });
    }
  }
  nodo.querySelector('[data-hecha]').onclick = () => { vibrar(); S.toque('piedra'); aMomento('como'); };
  nodo.querySelector('[data-aun-no]').onclick = () => { S.toque(-1); aMomento('ahora'); };
  // El historial y el porqué, al tocar el aviso (G78).
  av.onclick = () => {
    const nota = estado.notas[slot.ej]?.texto;
    const { nodo: h } = hoja(`<h2>${esc(ej.nombre)}</h2><p class="sub">${esc(porqueDe(p, slot))}</p>
      <ul class="opciones">
        <li><button type="button" tabindex="-1"><span class="que"><b class="num">${p.otraVez ? `${kg(p.otraVez.peso)} kg × ${p.otraVez.series.map((x) => x.reps).join(' · ')}` : 'Aún nada'}</b><span>La última vez</span></span></button></li>
        <li><button type="button" tabindex="-1"><span class="que"><b class="num">${rango(slot.repMin, slot.repMax)} reps · ${deja(p.rir)}</b><span>Lo que toca</span></span></button></li>
        ${slot.original ? `<li><button type="button" tabindex="-1"><span class="que"><b>${esc(G.ejercicio(slot.original).nombre)}</b><span>Hoy lo cambias por este</span></span></button></li>` : ''}
        ${nota ? `<li><button type="button" tabindex="-1"><span class="que"><b>${esc(nota)}</b><span>Tu nota</span></span></button></li>` : ''}
      </ul>`);
    escalonar(h.querySelectorAll('.opciones li'), { desde: 120, retraso: 40 });
  };

  async function guardar() {
    if (guardando) return;
    if (peso == null) { await escribirPeso(); if (peso == null) { nodo.querySelectorAll('[data-rir]').forEach((x) => x.setAttribute('aria-pressed', 'false')); return; } }
    guardando = true;
    vibrar();
    S.suena('guardar');
    if (marca) S.suena('marca', 0.45);
    const fueMarca = marca;
    if (fueMarca) {   // «¡Fuerte marca!» en el pie, un momento, antes de que vuele el grano
      const pista = nodo.querySelector('[data-como-pista]');
      pista.innerHTML = `${icono('marca')}¡Fuerte marca! ${esc(kg(peso))} × ${reps}`; pista.classList.add('marca');
      if (!reduceMovimiento()) pista.animate([{ transform: 'scale(.9)', opacity: 0 }, { transform: 'scale(1.04)', opacity: 1 }, { transform: 'none', opacity: 1 }], { duration: 340, easing: 'cubic-bezier(.34,1.56,.64,1)' });
      await espera(520);
    }
    // Storyboard «guardar serie»: los números se hacen grano, el grano vuela a su hueco y cae con un destello.
    const vuelo = hacerseGrano(nodo.querySelector('[data-numeros]'), nodo.querySelectorAll('.serie-cabeza .grano')[n]);
    await guardarSerie(s, i, { peso, reps, rir });
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
    const ok = await confirmarHoja({ titulo: '¿Borrar la última?', texto: `${kg(ultimaHoy.peso)} kg × ${ultimaHoy.reps}, te quedaban ${ultimaHoy.rir === 4 ? '4 o más' : ultimaHoy.rir}.`, si: 'Borrar', no: 'Dejarla' });
    if (ok) { await borrarSerie(ultimaHoy); nav.refrescar(); }
  });
  nodo.querySelector('[data-nota]').onclick = () => {
    const nota = estado.notas[slot.ej]?.texto;
    const { nodo: h, cerrar } = hoja(`<h2>Nota</h2><p class="sub">${esc(ej.nombre)}: asiento, agarre, máquina…</p>
      <textarea aria-label="Nota" maxlength="400" enterkeyhint="done">${esc(nota ?? '')}</textarea><div class="botones"><button class="boton" type="button">Guardar</button></div>`);
    h.querySelector('.boton').onclick = async () => { await ponerNota(slot.ej, h.querySelector('textarea').value); cerrar(); };
  };
  // «Otra maña» (R22): lo del mismo patrón primero, luego lo que comparte músculo.
  nodo.querySelector('[data-cambiar]').onclick = () => {
    const sust = G.sustitutos(slot.original ?? slot.ej);
    const lista = [...sust.filter((x) => x.id !== slot.ej), ...(slot.original ? [{ ...G.ejercicio(slot.original), vuelta: true }] : [])];
    const { nodo: h, cerrar } = hoja(`<h2>Otra maña</h2><p class="sub">¿Máquina ocupada? Mismo trabajo, mismas series y reps.</p>
      <ul class="opciones">${lista.map((x) => `<li><button type="button" data-ej="${x.id}"><span class="que"><b>${esc(x.vuelta ? 'El de tu rutina' : x.nombre)}</b><span>${x.vuelta ? esc(x.nombre) : x.mismoPatron ? 'Mismo movimiento' : 'Mismo músculo'}</span></span>${icono('sigue', 'class="flecha-der"')}</button></li>`).join('')}</ul>`);
    escalonar(h.querySelectorAll('.opciones li'), { desde: 120, retraso: 30 });
    h.querySelectorAll('[data-ej]').forEach((b) => b.addEventListener('click', async () => {
      slot.original = slot.original ?? slot.ej;
      slot.ej = b.dataset.ej;
      if (slot.ej === slot.original) delete slot.original;
      await guardarSesion(s); cerrar(); vibrar(); nav.refrescar();
    }));
  };
  nodo.querySelector('[data-lista]').onclick = () => {
    const { nodo: h, cerrar } = hoja(`<h2>${esc(s.nombre)}</h2><ul class="opciones">${s.plan.map((x, k) => {
      const hh = seriesDelHueco(s, k).length;
      return `<li><button type="button" data-k="${k}"><span class="que"><b>${esc(G.ejercicio(x.ej).nombre)}</b><span>${hh} de ${x.series}</span></span>${granos(hh, x.series, -1, { clase: 'millo-tenue' })}</button></li>`;
    }).join('')}</ul>`);
    escalonar(h.querySelectorAll('.opciones li'), { desde: 120, retraso: 30 });
    h.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => { cerrar(); nav.reemplazar('serie', { sesionId: s.id, i: Number(b.dataset.k) }); }));
  };
  // «Chacho, ¿lo dejas aquí?» (G78)
  nodo.querySelector('[data-terminar]').onclick = async () => {
    const hay = estado.series.some((x) => x.sesionId === s.id);
    const hechasSes = estado.series.filter((x) => x.sesionId === s.id).length;
    const totalSes = s.plan.reduce((a, x) => a + x.series, 0);
    const ok = await confirmarHoja({
      titulo: 'Chacho, ¿lo dejas aquí?', texto: hay ? 'Lo que falte se queda. La semana se reajusta sola.' : 'No has guardado ninguna serie: no cuenta.',
      extra: `<div class="granos-sesion" role="img" aria-label="${hechasSes} de ${totalSes} series">${Array.from({ length: totalSes }, (_, k) => grano(k < hechasSes)).join('')}</div>`,
      si: 'Sí, a casa', no: 'Sigo moliendo',
    });
    if (!ok) return;
    const r = await terminarSesion(s); mantenerEncendida(false);
    if (r) nav.reemplazar('hecho', { sesionId: s.id }); else nav.ir('hoy', {}, { modo: 'pestana' });
  };

  return {
    nodo, pestana: null,
    alEntrar() { mantenerEncendida(true); requestAnimationFrame(() => ajustarTitulo(nodo.querySelector('.serie-titulo'), { max: 42, min: 30, lineas: 2, alto: 0.95 })); },
  };
}

/** Hoja de sí/no con la voz de Gofio (los dos botones grandes del lienzo). */
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

// ── El descanso: soltar, mirar la siguiente y reanimarse (G79) ────────────────────
const F1 = ['Respira.', 'Suelta los brazos.', 'Agua y aire.', 'Despacio se muele fino.'];
const F3 = ['Embúllate.', 'Arriba, que vuelve la piedra.', 'Al terrero.'];
let ultimaFrase = '';
/** Una frase al azar, nunca la misma dos veces seguidas. */
const elige = (l) => { let f; do { f = l[Math.floor(Math.random() * l.length)]; } while (f === ultimaFrase && l.length > 1); ultimaFrase = f; return f; };

export function descansoPantalla(params, nav) {
  const { sesionId } = params;
  const s = sesionPorId(sesionId);
  const d = s?.descanso;
  if (!s || !d) return seriePantalla({ sesionId, i: s?.actual ?? 0 }, nav);
  const desde = s.plan[d.desde], sig = s.plan[d.siguiente];
  const mismo = d.siguiente === d.desde;
  const hechasDesde = seriesDelHueco(s, d.desde);
  const hechasSig = seriesDelHueco(s, d.siguiente).length;
  const pSig = prescripcion(sig);
  const ultima = hechasDesde.at(-1);
  const pesoSig = (mismo ? ultima?.peso : seriesDelHueco(s, d.siguiente).at(-1)?.peso) ?? pSig.peso;
  const repsSig = pSig.reps[Math.min(hechasSig, pSig.reps.length - 1)] ?? sig.repMin;
  const nombreSig = G.ejercicio(sig.ej).nombre;
  const queSig = `${pesoSig != null ? `${kg(pesoSig)} × ` : ''}${repsSig}`;
  const lineaSig = `${mismo ? `Serie ${hechasSig + 1}` : esc(nombreSig)} · <b class="cifra">${queSig}</b>`;
  // Las frases del segundo tramo, solo si son verdad (concepto, sección 2).
  const F2 = ['La siguiente, con jeito.'];
  if (mismo && ultima && pesoSig === ultima.peso) F2.push('Misma maña, mismo peso.');
  if (mismo && ultima && ultima.rir >= 1 && ultima.rir <= 3) F2.push(`${ultima.rir === 1 ? 'Te quedaba 1' : `Te quedaban ${ultima.rir}`}. Busca lo mismo.`);
  if (mismo && ultima) {
    const record = mejorAntes(sig.ej, s.id);
    if (record > 0 && G.e1rm(ultima.peso, ultima.reps, ultima.rir) <= record && G.e1rm(ultima.peso, ultima.reps + 1, ultima.rir) > record) F2.push('Un fisco más y es marca.');
  }

  const nodo = el(`<section class="descanso" aria-labelledby="titulo-descanso">
    <div class="luz" aria-hidden="true"></div>
    <h1 class="oculto" id="titulo-descanso">Descanso</h1>
    <div class="serie-cabeza">
      <button class="volver" type="button" data-volver>${icono('atras')}Hoy</button>
      ${granos(hechasDesde.length, desde.series, -1, { clase: 'millo-tenue' })}
    </div>
    <div class="muela-descanso" aria-hidden="true"><img src="iconos/disco-millo.svg" alt="" width="300" height="300" draggable="false"></div>
    <p class="cifra descanso-reloj num" data-reloj role="timer" aria-label="Tiempo de descanso">${mmss(d.total)}</p>
    <p class="titular descanso-frase suelta" data-frase aria-live="polite"></p>
    <p class="descanso-sig" data-sig></p>
    <div class="puntos" data-puntos aria-hidden="true"><span></span><span></span><span></span></div>
    <div class="relleno"></div>
    <div class="descanso-pie">
      <button class="redondo cifra" type="button" data-mas data-son="aire" aria-label="Treinta segundos más">+30</button>
      <button class="boton" type="button" data-ya data-son="piedra">Empezar serie ${hechasSig + 1}</button>
    </div>
  </section>`);

  const muela = nodo.querySelector('.muela-descanso');
  const reloj = nodo.querySelector('[data-reloj]');
  const frase = nodo.querySelector('[data-frase]');
  const lsig = nodo.querySelector('[data-sig]');
  const puntos = nodo.querySelector('[data-puntos]');
  const quieto = reduceMovimiento();
  let tramo = -1, raf = 0, ultimoSeg = -1, acabado = false;

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
    if (t === 0) { ponFrase(elige(F1), 'suelta'); lsig.innerHTML = ''; }
    if (t === 1) { ponFrase(elige(F2)); lsig.innerHTML = lineaSig; lsig.className = 'descanso-sig'; }
    if (t === 2) { ponFrase(elige(F3)); lsig.innerHTML = ''; S.suena('sube', 0, Math.max(1, quedan)); }
    avisoServidor();
  }
  // Para los avisos si sales de la app (G79): la frase de la reanimación y la siguiente serie.
  function avisoServidor() {
    descansoEnCurso({ hasta: d.hasta, frase: F3[0], siguiente: `Te toca ${mismo ? `la serie ${hechasSig + 1} de ${G.ejercicio(sig.ej).nombre.toLowerCase()}` : nombreSig.toLowerCase()}: ${queSig}.` });
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
  // G96 · Al llegar a cero ya no hay que tocar nada: tambor, «¡A LA BREGA!» y la serie entra sola.
  // Si la app no está a la vista (has salido), se espera a que vuelvas para hacerlo.
  function fin() {
    if (acabado) return; acabado = true;
    S.ambienteOff(); S.pararReanima();
    reloj.textContent = '0:00'; puntos.style.opacity = 0;
    descansoEnCurso(null);
    const ir = async () => {
      if (!nodo.isConnected) return;
      S.suena('tambor'); vibrar();
      delete s.descanso; await guardarSesion(s);
      await aLaBrega({ hechas: hechasSig, total: sig.series, alCambiar: () => nav.reemplazar('serie', { sesionId: s.id, i: d.siguiente }, { sinAnimacion: true }) });
    };
    if (document.hidden) document.addEventListener('visibilitychange', function vuelta() { if (!document.hidden) { document.removeEventListener('visibilitychange', vuelta); ir(); } });
    else ir();
  }
  const parar = () => { cancelAnimationFrame(raf); S.ambienteOff(); S.pararReanima(); descansoEnCurso(null); };

  nodo.querySelector('[data-volver]').onclick = () => nav.volver();
  nodo.querySelector('[data-mas]').onclick = async () => {
    S.pararReanima();
    d.hasta += 30000; d.total += 30;
    if (acabado) return;
    if (tramo === 2 && (d.hasta - Date.now()) / 1000 > 10) tramo = -1;
    vibrar(); await guardarSesion(s); avisoServidor();
  };
  nodo.querySelector('[data-ya]').onclick = async () => {
    parar(); vibrar(); delete s.descanso; await guardarSesion(s);
    nav.reemplazar('serie', { sesionId: s.id, i: d.siguiente });
  };
  return {
    nodo, pestana: null,
    alEntrar(o = {}) {
      mantenerEncendida(true); cancelAnimationFrame(raf);
      if (d.hasta > Date.now()) setTimeout(() => S.ambienteOn(), 500);
      raf = requestAnimationFrame(cuadro);
      if (params.entrada && !o.refresco) {
        params.entrada = false;
        S.suena('rodar');
        // La muela llega rodando desde la derecha y frena largo en el centro (storyboard, 600-1000 ms).
        if (!quieto) muela.animate([{ translate: '120vw 0', rotate: '540deg' }, { translate: '0 0', rotate: '0deg' }], { duration: 520, easing: 'cubic-bezier(.22,1,.36,1)' });
      }
    },
    alSalir() { parar(); },
  };
}
