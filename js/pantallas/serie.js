// «Registrar una serie» (con una mano y sudando) y «Descanso» (la muela da una vuelta).
import * as G from '../cerebro/index.js';
import { estado, prescripcion, seriesDelHueco, siguienteHueco, guardarSerie, borrarSerie, guardarSesion, terminarSesion,
  escalonDe, descansoDe, ponerNota } from '../logica.js';
import { el, esc, kg, mmss, icono, granos, ajustarTitulo, hoja, pedirNumero, confirmar, vibrar, reduceMovimiento, estallidoGranos, escalonar, pop } from '../ui.js';

const sesionPorId = (id) => estado.sesiones.find((s) => s.id === id);
const rango = (a, b) => (a === b ? `${a}` : `${a}-${b}`);
const textoRir = (r) => (r.min === r.max ? `deja ${r.min}` : r.min === 0 ? `al fallo o deja ${r.max}` : `deja ${r.min}-${r.max}`);

// ── Wake Lock: la pantalla no se apaga durante la sesión (si iOS lo permite) ──
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

/** Peso con el que arrancan −/+ si aún no hay ninguno (barra olímpica vacía, mancuerna ligera…). No es una sugerencia. */
const PESO_DE_PARTIDA = { barra: 20, smith: 20, mancuernas: 10, maquina: 20, polea: 10, lastre: 0 };

export function seriePantalla({ sesionId, i = 0, nueva = -1 }, nav) {
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
  // Precarga: lo de la serie anterior de hoy; si no, la sugerencia de R12 (+R14, R21).
  let peso = ultimaHoy?.peso ?? p.peso;
  let reps = p.reps[Math.min(n, p.reps.length - 1)] ?? slot.repMin;
  let rir = ultimaHoy?.rir ?? p.rir.max;
  const escalon = escalonDe(slot.ej);
  const lastre = !!ej.lastre;
  const otraVez = p.otraVez ? `${kg(p.otraVez.peso)} kg × ${p.otraVez.series.map((x) => x.reps).join(' · ')}` : null;
  const sug = sugerencia(p, slot);
  const restoTotal = s.plan.reduce((acc, _, k) => acc + Math.max(0, s.plan[k].series - seriesDelHueco(s, k).length), 0);
  const esUltima = restoTotal === 1;
  const nota = estado.notas[slot.ej]?.texto;

  const nodo = el(`<section aria-labelledby="titulo-serie">
    <div class="serie-cabeza">
      <button class="volver" type="button" data-volver>${icono('atras')}Hoy</button>
      <div style="display:flex;align-items:center;gap:10px">${granos(n, total, nueva)}<span class="etiqueta num">serie ${Math.min(n + 1, total)} de ${total}</span></div>
    </div>
    <h1 class="titular grande serie-titulo" id="titulo-serie">${esc(ej.nombre)}</h1>
    <p class="serie-sub">${rango(slot.repMin, slot.repMax)} reps · ${textoRir(p.rir)}${slot.original ? ` · en lugar de ${esc(G.ejercicio(slot.original).nombre.toLowerCase())}` : ''}</p>
    ${otraVez ? `<p class="serie-otra-vez">Última vez: <b class="num">${otraVez}</b></p>` : ''}
    ${sug ? `<div class="sugerencia"><span class="flecha">${icono(sug.icono)}</span><span>${esc(sug.texto)}</span></div>` : ''}
    <div class="paso">
      <button class="redondo" type="button" data-peso="-1" aria-label="Menos peso">${icono('menos', 'width="26" height="26"')}</button>
      <div class="valor"><button type="button" data-escribir-peso aria-label="Escribir el peso"><span class="cifra peso num" data-v-peso>${peso == null ? '—' : kg(peso)}</span></button><span class="unidad">${lastre ? 'kg de lastre' : 'kg'}</span></div>
      <button class="redondo" type="button" data-peso="1" aria-label="Más peso">${icono('mas', 'width="26" height="26"')}</button>
    </div>
    <div class="paso" style="margin-top:6px">
      <button class="redondo" type="button" data-reps="-1" aria-label="Una repetición menos">${icono('menos', 'width="26" height="26"')}</button>
      <div class="valor"><span class="cifra reps num" data-v-reps>${reps}</span><span class="unidad">reps</span></div>
      <button class="redondo" type="button" data-reps="1" aria-label="Una repetición más">${icono('mas', 'width="26" height="26"')}</button>
    </div>
    <div class="rir" role="group" aria-labelledby="rir-t">
      <h3 id="rir-t">¿Cuántas te quedaban?</h3>
      <div class="rir-botones">${G.BOTONES_RIR.map((v) => `<button type="button" data-rir="${v}" aria-pressed="${v === Math.min(4, rir)}">${v === 4 ? '4+' : v}</button>`).join('')}</div>
      <div class="rir-pie"><span>al fallo</span><span>sobrado</span></div>
    </div>
    ${nota ? `<p class="nota-ejercicio">${esc(nota)}</p>` : ''}
    <div class="serie-herramientas">
      <button class="chip" type="button" data-cambiar>${icono('cambiar', 'width="18" height="18"')}Cambiar</button>
      <button class="chip" type="button" data-nota>${icono('nota', 'width="18" height="18"')}Nota</button>
      <button class="chip" type="button" data-lista>${icono('lista', 'width="18" height="18"')}Ejercicios</button>
      ${n > 0 ? `<button class="chip" type="button" data-deshacer>Borrar última</button>` : ''}
      <button class="chip" type="button" data-terminar>${icono('fin', 'width="18" height="18"')}Terminar</button>
    </div>
    <div class="relleno"></div>
    <button class="boton boton-guardar" type="button" data-guardar>${esUltima ? 'Guardar y terminar' : 'Guardar serie'}${esUltima ? '' : `<span class="lado">${mmss(descansoDe(slot.ej))}</span>`}</button>
  </section>`);

  const vPeso = nodo.querySelector('[data-v-peso]');
  const vReps = nodo.querySelector('[data-v-reps]');
  const animar = (nodoV, dir) => { if (reduceMovimiento()) return; nodoV.classList.remove('sube', 'baja'); void nodoV.offsetWidth; nodoV.classList.add(dir > 0 ? 'sube' : 'baja'); };
  const pintarPeso = (dir) => { vPeso.textContent = peso == null ? '—' : kg(peso); animar(vPeso, dir); };

  nodo.querySelector('[data-volver]').onclick = () => nav.volver();
  nodo.querySelectorAll('[data-peso]').forEach((b) => b.addEventListener('click', async () => {
    const dir = Number(b.dataset.peso);
    // −/+ siempre suman o restan el escalón de tu gym. Sin peso aún, arrancan en uno de partida según el material;
    // el teclado solo sale al tocar el número (G53).
    if (peso == null) { peso = PESO_DE_PARTIDA[lastre ? 'lastre' : ej.equipo] ?? 10; pintarPeso(dir); vibrar(); return; }
    peso = Math.max(0, G.siguienteEscalon(peso, escalon, dir)); pintarPeso(dir); vibrar();
  }));
  async function escribirPeso() {
    const v = await pedirNumero({ titulo: lastre ? 'Lastre' : 'Peso', sub: lastre ? 'Kilos extra (0 sin lastre).' : ej.equipo === 'mancuernas' ? 'Kilos de cada mancuerna.' : 'Kilos en total.', valor: peso ?? '' });
    if (v != null) { const d = peso == null ? 1 : Math.sign(v - peso); peso = v; pintarPeso(d); }
  }
  nodo.querySelector('[data-escribir-peso]').onclick = escribirPeso;
  nodo.querySelectorAll('[data-reps]').forEach((b) => b.addEventListener('click', () => {
    const d = Number(b.dataset.reps); reps = Math.max(0, Math.min(60, reps + d)); vReps.textContent = reps; animar(vReps, d);
  }));
  nodo.querySelectorAll('[data-rir]').forEach((b) => b.addEventListener('click', () => {
    rir = Number(b.dataset.rir);
    nodo.querySelectorAll('[data-rir]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    pop(b, 1.1); vibrar();
  }));

  nodo.querySelector('[data-guardar]').onclick = async () => {
    if (peso == null) { await escribirPeso(); if (peso == null) return; }
    vibrar();
    estallidoGranos(nodo.querySelector('[data-guardar]'));
    await guardarSerie(s, i, { peso, reps, rir });
    await new Promise((ok) => setTimeout(ok, reduceMovimiento() ? 0 : 160));
    const sigMismo = seriesDelHueco(s, i).length < slot.series ? i : -1;
    const sig = sigMismo >= 0 ? i : siguienteHueco(s, (i + 1) % s.plan.length);
    if (sig === -1) {
      await terminarSesion(s); mantenerEncendida(false);
      nav.reemplazar('hecho', { sesionId: s.id });
      return;
    }
    s.descanso = { hasta: Date.now() + descansoDe(slot.ej) * 1000, total: descansoDe(slot.ej), siguiente: sig, desde: i };
    await guardarSesion(s);
    nav.reemplazar('descanso', { sesionId: s.id });
  };

  nodo.querySelector('[data-deshacer]')?.addEventListener('click', async () => {
    const ok = await confirmar({ titulo: '¿Borrar la última?', texto: `${kg(ultimaHoy.peso)} kg × ${ultimaHoy.reps}, te quedaban ${ultimaHoy.rir === 4 ? '4 o más' : ultimaHoy.rir}.`, si: 'Borrar', peligro: true });
    if (ok) { await borrarSerie(ultimaHoy); nav.refrescar(); }
  });
  nodo.querySelector('[data-nota]').onclick = () => {
    const { nodo: h, cerrar } = hoja(`<h2>Nota</h2><p class="sub">${esc(ej.nombre)}: asiento, agarre, máquina…</p>
      <textarea aria-label="Nota" maxlength="400" enterkeyhint="done">${esc(nota ?? '')}</textarea><div class="botones"><button class="boton" type="button">Guardar</button></div>`);
    h.querySelector('.boton').onclick = async () => { await ponerNota(slot.ej, h.querySelector('textarea').value); cerrar(); nav.refrescar(); };
  };
  nodo.querySelector('[data-cambiar]').onclick = () => {
    const sust = G.sustitutos(slot.original ?? slot.ej);
    const lista = [...(slot.original ? [{ ...G.ejercicio(slot.original), mismoPatron: true, vuelta: true }] : []), ...sust.filter((x) => x.id !== slot.ej)];
    const { nodo: h, cerrar } = hoja(`<h2>Cambiar ejercicio</h2><p class="sub">¿Máquina ocupada? Mismas series y reps.</p>
      <ul class="opciones">${lista.map((x) => `<li><button type="button" data-ej="${x.id}"><span class="que"><b>${esc(x.nombre)}</b><span>${x.vuelta ? 'El de tu rutina' : x.mismoPatron ? 'Mismo movimiento' : 'Mismo músculo'}</span></span></button></li>`).join('')}</ul>`);
    escalonar(h.querySelectorAll('.opciones li'), { desde: 120, retraso: 30 });
    h.querySelectorAll('[data-ej]').forEach((b) => b.addEventListener('click', async () => {
      const nuevo = b.dataset.ej;
      slot.original = slot.original ?? slot.ej;
      slot.ej = nuevo;
      if (slot.ej === slot.original) delete slot.original;
      await guardarSesion(s); cerrar(); vibrar(); nav.refrescar();
    }));
  };
  nodo.querySelector('[data-lista]').onclick = () => {
    const { nodo: h, cerrar } = hoja(`<h2>${esc(s.nombre)}</h2><ul class="opciones">${s.plan.map((x, k) => {
      const hh = seriesDelHueco(s, k).length;
      return `<li><button type="button" data-k="${k}"><span class="que"><b>${esc(G.ejercicio(x.ej).nombre)}</b><span>${hh} de ${x.series}</span></span>${granos(hh, x.series)}</button></li>`;
    }).join('')}</ul>`);
    escalonar(h.querySelectorAll('.opciones li'), { desde: 120, retraso: 30 });
    h.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => { cerrar(); nav.reemplazar('serie', { sesionId: s.id, i: Number(b.dataset.k) }); }));
  };
  nodo.querySelector('[data-terminar]').onclick = async () => {
    const hay = estado.series.some((x) => x.sesionId === s.id);
    const ok = await confirmar({ titulo: '¿Terminar ya?', texto: hay ? 'Lo que falte se queda. La semana se reajusta sola.' : 'No has guardado nada: no cuenta.', si: 'Terminar' });
    if (!ok) return;
    const r = await terminarSesion(s); mantenerEncendida(false);
    if (r) nav.reemplazar('hecho', { sesionId: s.id }); else nav.volver();
  };

  return {
    nodo, pestana: null,
    alEntrar() { mantenerEncendida(true); requestAnimationFrame(() => ajustarTitulo(nodo.querySelector('.serie-titulo'), { max: 44, min: 30, lineas: 2, alto: 1 })); },
  };
}

/** R12 · La sugerencia de la próxima vez, en una frase. */
function sugerencia(p, slot) {
  if (p.vuelta === 'larga') return { icono: 'baja', texto: `Semana de vuelta: ${p.peso != null ? `${kg(p.peso)} kg, ` : ''}${p.series} series, sin apurar.` };
  if (slot.diaMalo) return { icono: 'igual', texto: 'Día malo: tu peso, 2 series, sin apurar.' };
  switch (p.accion) {
    case 'subir': return { icono: 'sube', texto: `Sube a ${kg(p.peso)} kg. Llegaste a ${slot.repMax} en todas.` };
    case 'bajar': return { icono: 'baja', texto: `Baja a ${kg(p.peso)} kg y recupera reps.` };
    case 'mantener': return { icono: 'igual', texto: `Mismo peso. Busca ${p.reps.join(' · ')}.` };
    case 'inicial': return { icono: 'igual', texto: `Empiezas con ${kg(p.peso)} kg.` };
    case 'primera': return { icono: 'info', texto: `Primera vez: un peso que te deje ${rango(slot.repMin, slot.repMax)} reps con margen.` };
    default: return null;
  }
}

// ── Descanso ───────────────────────────────────────────────────
export function descansoPantalla({ sesionId }, nav) {
  const s = sesionPorId(sesionId);
  const d = s?.descanso;
  if (!s || !d) return seriePantalla({ sesionId, i: s?.actual ?? 0 }, nav);
  const desde = s.plan[d.desde], sig = s.plan[d.siguiente];
  const hechasDesde = seriesDelHueco(s, d.desde).length;
  const hechasSig = seriesDelHueco(s, d.siguiente).length;
  const pSig = prescripcion(sig);
  const ultima = seriesDelHueco(s, d.siguiente).at(-1);
  const pesoSig = ultima?.peso ?? pSig.peso;
  const mismo = d.siguiente === d.desde;
  const R = 158, C = 2 * Math.PI * R;

  const nodo = el(`<section aria-labelledby="titulo-descanso">
    <div class="serie-cabeza">
      <button class="volver" type="button" data-volver>${icono('atras')}Hoy</button>
      ${granos(hechasDesde, desde.series, hechasDesde - 1)}
    </div>
    <h1 class="titular grande" id="titulo-descanso" style="margin-top:12px">Descanso</h1>
    <p class="serie-sub">${esc(G.ejercicio(desde.ej).nombre)} · ${hechasDesde} de ${desde.series}</p>
    <div class="descanso-disco" role="timer" aria-label="Tiempo de descanso">
      <svg class="anillo" viewBox="0 0 328 328" aria-hidden="true"><circle class="pista" cx="164" cy="164" r="${R}"/><circle class="hecho" cx="164" cy="164" r="${R}" stroke-dasharray="${C}" stroke-dashoffset="${C}"/></svg>
      <img src="iconos/disco-millo.svg" alt="" width="300" height="300" draggable="false">
    </div>
    <p class="cifra descanso-tiempo num" data-tiempo aria-live="off">${mmss(d.total)}</p>
    <p class="etiqueta" data-respira style="text-align:center;margin-top:6px">Respira.</p>
    <div class="relleno"></div>
    <div class="descanso-pie">
      <button class="redondo" type="button" data-mas style="font-size:20px">+30 s</button>
      <p class="siguiente">${mismo ? `Siguiente: serie ${hechasSig + 1}` : `Siguiente: <b>${esc(G.ejercicio(sig.ej).nombre)}</b>`}<br><b class="num">${pesoSig != null ? `${kg(pesoSig)} kg × ` : ''}${rango(sig.repMin, sig.repMax)}</b></p>
    </div>
    <button class="boton" type="button" data-ya style="margin-top:14px">${mismo ? `Empezar serie ${hechasSig + 1}` : 'Vamos'}</button>
  </section>`);

  const img = nodo.querySelector('img');
  const anillo = nodo.querySelector('.anillo .hecho');
  const tiempo = nodo.querySelector('[data-tiempo]');
  let angulo = null, raf = 0, avisado = false;
  const quieto = reduceMovimiento();
  function cuadro() {
    const total = d.total * 1000;
    const quedan = Math.max(0, d.hasta - Date.now());
    const f = 1 - quedan / total;
    const objetivo = 360 * f;
    // La muela sigue al tiempo; si se añaden 30 s se coloca sola, sin saltos.
    angulo = angulo == null ? objetivo : angulo + (objetivo - angulo) * 0.18;
    if (!quieto) img.style.transform = `rotate(${angulo}deg)`;
    anillo.style.strokeDashoffset = String(C * (1 - Math.min(1, f)));
    tiempo.textContent = mmss(quedan / 1000);
    if (quedan <= 0 && !avisado) { avisado = true; tiempo.classList.add('listo'); nodo.querySelector('[data-respira]').textContent = '¡Dale!'; pop(nodo.querySelector('[data-ya]'), 1.05); vibrar(); }
    raf = requestAnimationFrame(cuadro);
  }
  nodo.querySelector('[data-volver]').onclick = () => nav.volver();
  nodo.querySelector('[data-mas]').onclick = async () => {
    d.hasta += 30000; d.total += 30; avisado = false; tiempo.classList.remove('listo'); vibrar();
    nodo.querySelector('[data-respira]').textContent = 'Respira.';
    await guardarSesion(s);
  };
  nodo.querySelector('[data-ya]').onclick = async () => {
    vibrar(); delete s.descanso; await guardarSesion(s);
    nav.reemplazar('serie', { sesionId: s.id, i: d.siguiente });
  };
  return {
    nodo, pestana: null,
    alEntrar() { mantenerEncendida(true); cancelAnimationFrame(raf); raf = requestAnimationFrame(cuadro); },
    alSalir() { cancelAnimationFrame(raf); },
  };
}
