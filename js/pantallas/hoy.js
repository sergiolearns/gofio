// «Hoy»: la casa, antes de moler (lienzo: Hoy.dc.html; G76, G87-G89). Qué toca y por qué (R15), «Otro día»,
// vuelta tras días sin ir (R14) y modo «día malo» (R21). Arriba, la muela gigante: un círculo de verdad que gira.
import * as G from '../cerebro/index.js';
import { estado, ajuste, hoy, planDeHoy, porQue, prescripcion, vueltaHoy, sesionEnCurso, sesionesHechas, empezarSesion, resumen,
  siguienteHueco, musculoCorto, seriesDe, descartarSesion } from '../logica.js';
import { el, esc, kg, icono, triangulo, grano, granos, ajustarTitulo, hoja, vibrar, escalonar, reduceMovimiento } from '../ui.js';
import { aMoler } from '../amoler.js';

let diaMaloActivo = false;
let eleccion = null; // {fecha, diaId|'combinada'} si el usuario eligió «Otro día»

// La muela del lienzo, medida en una pantalla de 430 × 932 con la barra de iOS incluida (G88):
// círculo de 1600 px con el centro en (−80, −250), hoyuelo de 18 px a 765 px del centro y a 37 px del borde derecho.
const MUELA = { r: 800, cx: -80, cy: -250, hoyuelo: 765, margenDerecho: 37, lista: 474, granos: 572 };
const barra = () => window.gofioPantalla?.barra ?? (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--barra')) || 0);

export function hoyPantalla(params = {}, nav) {
  const fecha = hoy();
  if (eleccion?.fecha !== fecha) eleccion = null;
  let enCurso = sesionEnCurso();
  // Una molienda empezada sin ninguna serie guardada no cuenta: se deshace al volver a casa (no se pierde nada).
  const mantener = params.mantener; delete params.mantener;   // la que acaba de abrir el primer arranque
  if (enCurso && enCurso.id !== mantener && !seriesDe(enCurso.id).length && !enCurso.descanso) { descartarSesion(enCurso); enCurso = null; }
  const hechaHoy = sesionesHechas().filter((s) => s.fecha === fecha).at(-1);
  const mostrarHecho = !!hechaHoy && !enCurso && !eleccion && !diaMaloActivo;
  const plan = planDeHoy(fecha);
  const plantilla = ajuste('plantilla');

  // Qué sesión se enseña: la elegida a mano, o la del planificador.
  let sesion = { diaId: plan.diaId, nombre: plan.nombre, ejercicios: plan.ejercicios, tipo: plan.tipo };
  if (eleccion) {
    if (eleccion.diaId === 'combinada' && plan.tipo === 'combinada') sesion = { diaId: null, nombre: 'Combinada', ejercicios: plan.ejercicios, tipo: 'combinada' };
    else if (eleccion.diaId !== 'combinada') { const d = G.diaDe(plantilla, eleccion.diaId); sesion = { diaId: d.id, nombre: d.nombre, ejercicios: d.ejercicios, tipo: 'dia' }; }
  }
  const ejercicios = diaMaloActivo ? G.diaMalo(sesion.ejercicios) : sesion.ejercicios;
  const vuelta = vueltaHoy();
  const presc = ejercicios.map((e) => prescripcion(e, vuelta));
  const totalSeries = presc.reduce((s, p) => s + p.series, 0);
  const minutos = Math.round(totalSeries * 3 / 5) * 5; // R15.7: ≈ 3 minutos por serie con su descanso

  // La semana en triángulos: lleno = entrenado; almagre = hoy; contorno = sin entreno.
  const lunes = G.lunesDe(fecha);
  const fechasHechas = new Set(sesionesHechas().map((s) => s.fecha));
  const tri = G.LETRA_DIA.map((l, i) => {
    const f = G.sumarDias(lunes, i);
    const est = f === fecha ? (fechasHechas.has(f) ? 'lleno' : 'hoy') : fechasHechas.has(f) ? 'lleno' : 'contorno';
    return `<div class="${f === fecha ? 'hoy' : ''}">${triangulo(est)}${l}</div>`;
  }).join('');
  const entrenados = G.LETRA_DIA.filter((_, i) => fechasHechas.has(G.sumarDias(lunes, i))).length;
  const dNum = Number(fecha.slice(8));

  // El porqué, con voz de casa (concepto, sección 2). Una interjección como mucho.
  let porque = '';
  let etiqueta = 'La molienda de hoy';
  if (diaMaloActivo) { porque = 'Día malo: un fisco de lo importante. Cuenta igual.'; etiqueta += ' · día malo'; }
  else if (vuelta.tipo === 'larga') { porque = `<b>${vuelta.desde ? 'Semana de vuelta.' : '¡Ños, cuánto tiempo!'}</b>Hoy, suave: un 10 % menos y con margen.`; etiqueta += ' · vuelta'; }
  else if (vuelta.tipo === 'media') { porque = '<b>¡Ños, cuánto tiempo!</b>Hoy, tu peso de siempre y algo más de margen.'; etiqueta += ' · vuelta'; }
  else if (vuelta.tipo === 'primera') porque = '<b>Primera molienda.</b>Lo que no sepas, lo apuntas en la primera serie.';
  else if (eleccion) porque = esc(sesion.diaId === plan.diaId ? 'Lo eliges tú. Y Gofio también.' : `Lo eliges tú. Gofio decía ${plan.nombre.toLowerCase()}.`);
  else porque = esc(porQue(plan));
  const titulo = mostrarHecho ? hechaHoy.nombre : sesion.nombre;

  const filas = ejercicios.map((e, i) => {
    const p = presc[i]; const ej = G.ejercicio(e.ej);
    const rep = e.repMin === e.repMax ? e.repMin : `${e.repMin}-${e.repMax}`;
    return `<li data-i="${i}" role="button" tabindex="0" aria-label="${esc(ej.nombre)}: ${p.series} series de ${rep}. Ver ficha"><span class="nombre">${esc(ej.nombre)}</span>
      <span class="der">${granos(0, p.series, -1, { clase: 'millo' })}<span class="rango">${rep}</span><b class="carga cifra num${p.peso == null ? ' vacia' : ''}">${p.peso == null ? '—' : kg(p.peso)}</b></span></li>`;
  }).join('');

  let cabezaTexto, cuerpo;
  if (mostrarHecho) {
    const r = resumen(hechaHoy);
    let proxima = '';
    try { const m = G.sumarDias(fecha, 1); proxima = `Mañana, si vienes: ${planDeHoy(m, Date.parse(m + 'T18:00:00')).nombre.toLowerCase()}.`; } catch { /* sin plan */ }
    cabezaTexto = `<p class="hoy-hecho-1">Hecho gofio: ${r.series} ${r.series === 1 ? 'grano' : 'granos'}.</p>${proxima ? `<p class="hoy-hecho-2">${esc(proxima)}</p>` : ''}`;
    cuerpo = `<div class="tarjeta-granos"><div class="rejilla" role="img" aria-label="${r.series} granos: un grano, una serie">${Array.from({ length: r.series }, () => grano(true)).join('')}</div><p>Un grano, una serie.</p></div>
      <div class="relleno"></div>
      <div class="hoy-pie"><button class="boton piedra" type="button" data-resumen>Ver la molienda</button><button class="hoy-otra" type="button" data-otro>Otra molienda</button></div>`;
  } else {
    cabezaTexto = `<p class="hoy-por-que">${porque}</p><p class="hoy-meta">${ejercicios.length} ejercicios · ${totalSeries} series · ~${minutos} min</p>`;
    cuerpo = `<div class="fila-titulo"><h2>${esc(etiqueta)}</h2><button class="enlace" data-otro type="button">Otro día</button></div>
      <ul class="lista-hoy">${filas}</ul>
      <div class="relleno"></div>
      <div class="hoy-pie"><button class="boton" type="button" data-empezar data-son="none">${enCurso ? 'Seguir la molienda' : 'A moler'}</button></div>`;
  }

  const nodo = el(`<section class="hoy" aria-labelledby="titulo-hoy">
    <div class="hoy-muela" aria-hidden="true">${mostrarHecho ? '' : '<i class="hoy-hoyuelo"></i>'}</div>
    ${mostrarHecho ? '<img class="hoy-sello" src="iconos/disco-sello-almagre.svg" alt="" width="190" height="190">' : ''}
    <header class="hoy-cabeza">
      <div class="hoy-arriba">
        <div class="fecha-hoy cifra" aria-label="Hoy, ${G.NOMBRE_DIA[G.diaSemana(fecha)]} ${dNum}">${dNum}</div>
        <div class="semana-triangulos" role="img" aria-label="Esta semana: ${entrenados} ${entrenados === 1 ? 'día entrenado' : 'días entrenados'}">${tri}</div>
      </div>
      <h1 class="titulo-gigante hoy-titulo" id="titulo-hoy">${esc(titulo).replace(' + ', '<br>+ ')}</h1>
      ${cabezaTexto}
    </header>
    <div class="hoy-cuerpo">${cuerpo}</div>
  </section>`);

  nodo.querySelectorAll('.lista-hoy li').forEach((li) => {
    const abrir = () => fichaEjercicio(ejercicios[Number(li.dataset.i)], presc[Number(li.dataset.i)]);
    li.addEventListener('click', abrir);
    li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); } });
  });
  nodo.querySelector('[data-resumen]')?.addEventListener('click', () => nav.ir('hecho', { sesionId: hechaHoy.id, soloVer: true }));
  nodo.querySelectorAll('[data-otro]').forEach((b) => b.addEventListener('click', () => otroDia(plan, nav)));
  nodo.querySelector('[data-empezar]')?.addEventListener('click', async (e) => {
    const boton = e.currentTarget; if (boton.dataset.va) return; boton.dataset.va = '1';
    vibrar();
    let s = enCurso;
    if (!s) s = await empezarSesion({ diaId: sesion.diaId, nombre: sesion.nombre + (diaMaloActivo ? ' (día malo)' : ''), ejercicios, modo: diaMaloActivo ? 'dia-malo' : sesion.tipo === 'combinada' ? 'combinada' : 'normal' });
    diaMaloActivo = false; eleccion = null;
    const i = Math.max(0, siguienteHueco(s, s.actual ?? 0));
    const total = s.plan.reduce((a, x) => a + x.series, 0);
    const hechas = seriesDe(s.id).length;
    if (enCurso) { nav.ir('serie', { sesionId: s.id, i }); return; }
    // «A moler» (G84, G89): la muela de Hoy rueda y crece, cae la pequeña, se abre el ojo y entra la primera serie.
    await aMoler({
      muela: nodo.querySelector('.hoy-muela'), apartar: [...nodo.querySelectorAll('.hoy-cabeza, .hoy-cuerpo, .hoy-sello'), document.getElementById('pestanas')],
      total, hechas, alCambiar: () => nav.ir('serie', { sesionId: s.id, i }, { sinAnimacion: true }),
    });
  });

  return {
    nodo, pestana: 'hoy', cinta: false,
    alEntrar({ refresco } = {}) {
      requestAnimationFrame(() => {
        ajustarTitulo(nodo.querySelector('.hoy-titulo'), { max: 92, min: 56, lineas: 2, alto: 0.86 });
        colocarMuela(nodo, mostrarHecho);
        // G87 · Al entrar, la muela da un trozo de vuelta y el hoyuelo se desliza por el borde (como piedra).
        if (!refresco && !reduceMovimiento()) {
          nodo.querySelector('.hoy-muela').animate([{ transform: 'rotate(-16deg)' }, { transform: 'rotate(0deg)' }], { duration: 1100, easing: 'cubic-bezier(.77,0,.175,1)' });
          const sello = nodo.querySelector('.hoy-sello');
          sello?.animate([{ transform: 'rotate(-60deg) scale(1.3)', opacity: 0 }, { transform: 'rotate(-18deg) scale(1)', opacity: 1 }], { duration: 520, delay: 200, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' });
        }
      });
      if (!refresco) escalonar(nodo.querySelectorAll('.lista-hoy li, .tarjeta-granos, .hoy-pie > *'), { desde: 260, retraso: 40 });
      else escalonar(nodo.querySelectorAll('.lista-hoy li'), { desde: 0, retraso: 35 });
    },
  };
}

/**
 * G88 · La muela gigante se coloca midiendo desde arriba de la pantalla (la barra de iOS cuenta como parte del
 * círculo), así que en la página su centro sube lo que mide la barra. Si un texto largo se saliera del millo, el
 * círculo crece lo justo. La lista va donde el lienzo (474 px desde arriba) o, si no cabe, debajo del texto.
 */
function colocarMuela(nodo, hecho) {
  const b = barra();
  const ancho = nodo.clientWidth;
  const cx = MUELA.cx, cy = MUELA.cy - b;
  const caja = nodo.getBoundingClientRect();
  let r = MUELA.r;
  let abajo = 0;
  for (const n of nodo.querySelectorAll('.hoy-arriba, .hoy-titulo, .hoy-por-que, .hoy-meta, .hoy-hecho-1, .hoy-hecho-2')) {
    const rango = document.createRange(); rango.selectNodeContents(n);
    const t = n.classList.contains('hoy-arriba') ? n.getBoundingClientRect() : rango.getBoundingClientRect();
    for (const [x, y] of [[t.left, t.top], [t.right, t.top], [t.left, t.bottom], [t.right, t.bottom]]) {
      r = Math.max(r, Math.hypot(x - caja.left - cx, y - caja.top + nodo.scrollTop - cy) + 24);
    }
    abajo = Math.max(abajo, t.bottom - caja.top + nodo.scrollTop);
  }
  const muela = nodo.querySelector('.hoy-muela');
  muela.style.width = muela.style.height = `${2 * r}px`;
  muela.style.left = `${cx - r}px`; muela.style.top = `${cy - r}px`;
  // El hoyuelo, en el borde, a 37 px del lado derecho de la pantalla (como en el lienzo).
  const hoyuelo = muela.querySelector('.hoy-hoyuelo');
  if (hoyuelo) {
    const rh = MUELA.hoyuelo * r / MUELA.r;
    const x = Math.min(ancho - MUELA.margenDerecho, cx + rh - 1);
    const ang = Math.acos((x - cx) / rh);
    hoyuelo.style.left = `${r + rh * Math.cos(ang)}px`; hoyuelo.style.top = `${r + rh * Math.sin(ang)}px`;
  }
  const sello = nodo.querySelector('.hoy-sello');
  if (sello) sello.style.top = `${236 - b}px`;
  const cuerpo = nodo.querySelector('.hoy-cuerpo');
  // En un iPhone bajo (SE, mini) la lista sube lo justo para que se vea al abrir: nunca más abajo de la mitad.
  const objetivo = Math.min((hecho ? MUELA.granos : MUELA.lista) - b, Math.round(nodo.clientHeight * (hecho ? 0.6 : 0.54)));
  cuerpo.style.marginTop = '0px';
  const ahora = cuerpo.getBoundingClientRect().top - caja.top + nodo.scrollTop;
  cuerpo.style.marginTop = `${Math.max(0, Math.round(Math.max(objetivo, abajo + 24) - ahora))}px`;
  // Lo que cae encima del millo se escribe en basalto, para que no se pierda (G76: «se pierde con el fondo»).
  for (const t of nodo.querySelectorAll('.hoy-cuerpo .fila-titulo h2, .hoy-cuerpo .fila-titulo .enlace')) {
    const q = t.getBoundingClientRect();
    const x = (q.left + q.right) / 2 - caja.left, y = (q.top + q.bottom) / 2 - caja.top + nodo.scrollTop;
    t.classList.toggle('sobre-millo', Math.hypot(x - cx, y - cy) < r - 4);
  }
}

/** Ficha de un ejercicio de la lista (se abre al tocarlo). */
function fichaEjercicio(slot, p) {
  const ej = G.ejercicio(slot.ej);
  const princ = Object.entries(ej.musculos).filter(([, f]) => f === 1).map(([m]) => musculoCorto(m));
  const ayuda = Object.entries(ej.musculos).filter(([, f]) => f < 1).map(([m]) => musculoCorto(m));
  const rep = slot.repMin === slot.repMax ? slot.repMin : `${slot.repMin}-${slot.repMax}`;
  const rir = p.rir.min === p.rir.max ? p.rir.min : `${p.rir.min}-${p.rir.max}`;
  const nota = estado.notas[slot.ej]?.texto;
  const { nodo } = hoja(`<h2>${esc(ej.nombre)}</h2><p class="sub">${p.series} × ${rep} · deja ${rir}</p>
    <ul class="opciones">
      <li><button type="button" tabindex="-1"><span class="que"><b class="num">${p.peso == null ? 'Lo pones tú' : `${kg(p.peso)} kg`}</b><span>Hoy</span></span></button></li>
      ${p.otraVez ? `<li><button type="button" tabindex="-1"><span class="que"><b class="num">${kg(p.otraVez.peso)} × ${p.otraVez.series.map((x) => x.reps).join(' · ')}</b><span>La última vez</span></span></button></li>` : ''}
      <li><button type="button" tabindex="-1"><span class="que"><b>${esc(princ.join(', ').replace(/^./, (c) => c.toUpperCase()))}</b><span>${ayuda.length ? `Ayudan: ${esc(ayuda.join(', '))}` : 'Trabaja'}</span></span></button></li>
      ${nota ? `<li><button type="button" tabindex="-1"><span class="que"><b>${esc(nota)}</b><span>Tu nota</span></span></button></li>` : ''}
    </ul>`);
  escalonar(nodo.querySelectorAll('.opciones li'), { desde: 120, retraso: 40 });
}

/** «Otro día»: elegir otra sesión de la plantilla, o el día malo (R21). */
function otroDia(plan, nav) {
  const plantilla = ajuste('plantilla');
  const lunes = G.lunesDe(hoy());
  const hechos = new Map(sesionesHechas().filter((s) => s.fecha >= lunes).map((s) => [s.diaId, s.fecha]));
  const opciones = plantilla.dias.map((d) => {
    const marca = d.id === plan.diaId ? 'Toca hoy' : hechos.has(d.id) ? `Hecho el ${G.NOMBRE_DIA[G.diaSemana(hechos.get(d.id))]}` : '';
    const series = d.ejercicios.reduce((s, e) => s + e.series, 0);
    return `<li><button type="button" data-dia="${d.id}"><span class="que"><b>${esc(d.nombre)}</b><span>${d.ejercicios.length} ejercicios · ${series} series</span></span><span class="marca">${esc(marca)}</span></button></li>`;
  });
  if (plan.tipo === 'combinada') opciones.unshift(`<li><button type="button" data-dia="combinada"><span class="que"><b>Combinada</b><span>Lo que más falta, en una</span></span><span class="marca">Toca hoy</span></button></li>`);
  const malo = `<li><button type="button" data-malo><span class="icono-fila">${icono('malo')}</span><span class="que"><b>${diaMaloActivo ? 'Volver a lo normal' : 'Día malo'}</b><span>${diaMaloActivo ? 'La molienda entera' : 'Un fisco de lo importante. Cuenta igual.'}</span></span></button></li>`;
  const { nodo, cerrar } = hoja(`<h2>Otro día</h2><p class="sub">Elige tú.</p><ul class="opciones">${malo}${opciones.join('')}</ul>`);
  escalonar(nodo.querySelectorAll('.opciones li'), { desde: 120, retraso: 35 });
  nodo.querySelector('[data-malo]').addEventListener('click', () => { diaMaloActivo = !diaMaloActivo; cerrar(); vibrar(); nav.refrescar(); });
  nodo.querySelectorAll('[data-dia]').forEach((b) => b.addEventListener('click', () => {
    eleccion = { fecha: hoy(), diaId: b.dataset.dia }; diaMaloActivo = false;
    cerrar(); vibrar(); nav.refrescar();
  }));
}

export { estado };
