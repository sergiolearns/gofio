// «Hoy»: la casa, antes de moler (lienzo: Hoy.dc.html; G76, G87-G89). Qué toca y por qué (R15), «Otro día»,
// vuelta tras días sin ir (R14) y modo «día malo» (R21). Arriba, la muela gigante: un círculo de verdad que gira.
import * as G from '../cerebro/index.js';
import { estado, ajuste, hoy, planDeHoy, porQue, prescripcion, vueltaHoy, sesionEnCurso, sesionesHechas, empezarSesion, resumen,
  siguienteHueco, musculoCorto, seriesDe, descartarSesion, descargaActiva, ponerAjuste } from '../logica.js';
import { el, esc, kg, icono, triangulo, grano, granos, ajustarTitulo, hoja, vibrar, escalonar, reduceMovimiento, cuandoRevelada, avisar, contar } from '../ui.js';
import { aMoler } from '../amoler.js';
import { toque } from '../sonidos.js';
import * as S from '../sonidos.js';

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
  // G100 · Lo que quitas o cambias deslizando un ejercicio vale solo para hoy (y para esta sesión).
  const clave = sesion.diaId ?? 'combinada';
  const rt = retoques(fecha, clave);
  const base = aplicarRetoques(sesion.ejercicios, rt);
  const ejercicios = diaMaloActivo ? G.diaMalo(base) : base;
  const editable = !enCurso && !mostrarHecho;
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
  else if (descargaActiva() && vuelta.tipo !== 'larga') { porque = '<b>Semana de descarga.</b>La mitad de series, un 10 % menos y más margen.'; etiqueta += ' · descarga'; }
  else if (vuelta.tipo === 'larga') { porque = `<b>${vuelta.desde ? 'Semana de vuelta.' : '¡Ños, cuánto tiempo!'}</b>Hoy, suave: un 10 % menos y con margen.`; etiqueta += ' · vuelta'; }
  else if (vuelta.tipo === 'media') { porque = '<b>¡Ños, cuánto tiempo!</b>Hoy, tu peso de siempre y algo más de margen.'; etiqueta += ' · vuelta'; }
  else if (vuelta.tipo === 'primera') porque = '<b>Primera molienda.</b>Lo que no sepas, lo apuntas en la primera serie.';
  else if (eleccion) porque = esc(sesion.diaId === plan.diaId ? 'Lo eliges tú. Y Gofio también.' : `Lo eliges tú. Gofio decía ${plan.nombre.toLowerCase()}.`);
  else porque = esc(porQue(plan));
  const titulo = mostrarHecho ? hechaHoy.nombre : sesion.nombre;
  const bajo = mostrarHecho && window.innerHeight < 720;

  const filas = ejercicios.map((e, i) => {
    const p = presc[i]; const ej = G.ejercicio(e.ej);
    const rep = e.repMin === e.repMax ? e.repMin : `${e.repMin}-${e.repMax}`;
    return `<li data-i="${i}" role="button" tabindex="0" aria-label="${esc(ej.nombre)}: ${p.series} series de ${rep}. Ver ficha">${editable ? FONDOS : ''}<div class="fila-mueve"><span class="nombre">${esc(ej.nombre)}</span>
      <span class="der">${granos(0, p.series, -1, { clase: 'millo' })}<span class="rango">${rep}</span><b class="carga cifra num${p.peso == null ? ' vacia' : ''}">${p.accion === 'subir' && !p.descarga && p.vuelta !== 'larga' ? `<i class="sube-peso" title="Hoy sube">${icono('sube')}</i>` : ''}${p.peso == null ? '—' : kg(p.peso)}</b></span></div></li>`;
  }).join('');

  let cabezaTexto, cuerpo;
  if (mostrarHecho) {
    // G110 · «La cuenta de la molienda»: un papel harina con el diente de sierra, ejercicio a ejercicio con sus granos y
    // su mejor serie, el total y el sello estampado (lienzo, tablero 4c, opción B).
    const r = resumen(hechaHoy);
    let manana = '';
    try { const m = G.sumarDias(fecha, 1); manana = planDeHoy(m, Date.parse(m + 'T18:00:00')).nombre.toLowerCase(); } catch { /* sin plan */ }
    cabezaTexto = '<p class="hoy-hecho-1">Hecho gofio. Ahora, a descansar.</p>';
    // «Mañana» va dentro del papel: así nada se escribe nunca encima del borde de la muela (G111). Con poca molienda,
    // el papel se centra en el hueco que queda; con mucha, va justo debajo del texto.
    cuerpo = `<div class="relleno hueco-arriba"></div>${cuentaMolienda(hechaHoy, r, dNum, fecha, manana)}
      <div class="relleno"></div>
      <div class="hoy-pie-hecho"><button class="enlace" type="button" data-resumen>Ver la molienda</button><button class="enlace tenue" type="button" data-otro>Otra molienda</button></div>`;
  } else {
    cabezaTexto = `<p class="hoy-por-que">${porque}</p><p class="hoy-meta">${ejercicios.length} ejercicios · ${totalSeries} series · ~${minutos} min</p>`;
    cuerpo = `<div class="fila-titulo"><h2>${esc(etiqueta)}</h2><button class="enlace" data-otro type="button">Otro día</button></div>
      <ul class="lista-hoy">${filas}</ul>
      <div class="relleno"></div>
      <div class="hoy-pie"><button class="boton" type="button" data-empezar data-son="none">${enCurso ? 'Seguir la molienda' : 'A moler'}</button></div>`;
  }

  const nodo = el(`<section class="hoy" aria-labelledby="titulo-hoy">
    <div class="hoy-muela" aria-hidden="true">${mostrarHecho ? '' : '<i class="hoy-hoyuelo"></i>'}</div>
    <header class="hoy-cabeza">
      <div class="hoy-arriba">
        <div class="fecha-hoy cifra" aria-label="Hoy, ${G.NOMBRE_DIA[G.diaSemana(fecha)]} ${dNum}">${dNum}</div>
        <div class="semana-triangulos" role="img" aria-label="Esta semana: ${entrenados} ${entrenados === 1 ? 'día entrenado' : 'días entrenados'}">${tri}</div>
      </div>
      <h1 class="titulo-gigante hoy-titulo" id="titulo-hoy">${bajo ? esc(titulo) : esc(titulo).replace(' + ', '<br>+ ')}</h1>
      ${cabezaTexto}
    </header>
    <div class="hoy-cuerpo">${cuerpo}</div>
  </section>`);

  // Quitar (a la izquierda) y cambiar (a la derecha), solo para hoy.
  const idBase = (e) => e.original ?? e.ej;
  const quitar = async (i) => {
    if (base.length <= 1) { avisar('Deja al menos uno.'); return false; }
    const id = idBase(ejercicios[i]);
    await ponerRetoques(fecha, clave, { ...rt, quitados: [...rt.quitados, id] });
    toque('aire'); vibrar(); nav.refrescar();
    avisar(`${G.ejercicio(ejercicios[i].ej).nombre}: fuera por hoy`, { texto: 'Deshacer', hacer: async () => {
      const ahora = retoques(fecha, clave);
      await ponerRetoques(fecha, clave, { ...ahora, quitados: ahora.quitados.filter((x) => x !== id) }); nav.refrescar();
    } });
    return true;
  };
  const cambiar = (i) => cambiarHoy(ejercicios[i], ejercicios.map((e) => e.ej), async (nuevo) => {
    const id = idBase(ejercicios[i]); const cambios = { ...rt.cambios };
    if (nuevo === id) delete cambios[id]; else cambios[id] = nuevo;
    await ponerRetoques(fecha, clave, { ...rt, cambios }); vibrar(); nav.refrescar();
  });
  nodo.querySelectorAll('.lista-hoy li').forEach((li) => {
    const i = Number(li.dataset.i);
    const abrir = () => { if (li.dataset.arrastre) return; fichaEjercicio(ejercicios[i], presc[i], editable ? { quitar: () => quitar(i), cambiar: () => cambiar(i) } : null); };
    if (editable) deslizable(li, { quitar: () => quitar(i), cambiar: () => cambiar(i) });
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
      muela: nodo.querySelector('.hoy-muela'), apartar: [...nodo.querySelectorAll('.hoy-cabeza, .hoy-cuerpo'), document.getElementById('pestanas')],
      total, hechas, alCambiar: () => nav.ir('serie', { sesionId: s.id, i }, { sinAnimacion: true }),
    });
  });

  return {
    nodo, pestana: 'hoy', cinta: false,
    alEntrar({ refresco } = {}) {
      requestAnimationFrame(() => {
        // En un iPhone bajo, con la molienda hecha, el título va en una línea para que la cuenta y su sello se vean enteros.
        ajustarTitulo(nodo.querySelector('.hoy-titulo'), bajo ? { max: 64, min: 36, lineas: 1, alto: 0.9 } : { max: 92, min: 56, lineas: 2, alto: 0.86 });
        colocarMuela(nodo, mostrarHecho);
      });
      if (refresco) { escalonar(nodo.querySelectorAll('.lista-hoy li'), { desde: 0, retraso: 35 }); return; }
      if (mostrarHecho) { entraLaCuenta(nodo, hechaHoy); return; }
      const resto = nodo.querySelectorAll('.lista-hoy li, .tarjeta-granos, .hoy-pie > *');
      if (reduceMovimiento()) return;
      // G87 · La muela da un trozo de vuelta y el hoyuelo se desliza por el borde (como piedra).
      // G99 · Primero el hoyuelo (el punto negro) da su trozo de vuelta y, cuando se asienta, entra la lista.
      // Lo de abajo se esconde ya para que no asome mientras gira; todo espera a que se vaya la cortinilla.
      const ocultos = [...resto].map((n) => n.animate([{ opacity: 0 }, { opacity: 0 }], { duration: 1e6 }));
      cuandoRevelada(() => requestAnimationFrame(() => {
        const GIRO = 1100;
        nodo.querySelector('.hoy-muela').animate([{ transform: 'rotate(-16deg)' }, { transform: 'rotate(0deg)' }], { duration: GIRO, easing: 'cubic-bezier(.77,0,.175,1)' });
        ocultos.forEach((a) => a.cancel());
        escalonar(resto, { desde: GIRO - 120, retraso: 45 });
      }));
    },
  };
}

// ── G110 · La cuenta de la molienda y su sello ─────────────────────────────────────
const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const sierra = (abajo) => `<svg class="cuenta-sierra" viewBox="0 0 384 10" preserveAspectRatio="none" aria-hidden="true"><path d="M0 ${abajo ? 0 : 10}${Array.from({ length: 32 }, (_, k) => `L${6 + 12 * k} ${abajo ? 10 : 0}L${12 + 12 * k} ${abajo ? 0 : 10}`).join('')}Z"/></svg>`;
/** El sello de tinta: almagre, borde irregular y algún hueco, la fecha dentro y «HECHO GOFIO · FUERZA DE MOLINO» alrededor. */
function selloTinta(dia, mes) {
  return `<svg class="sello-tinta" viewBox="-100 -100 200 200" role="img" aria-label="Sello: hecho gofio, ${dia} ${mes.toLowerCase()}">
    <defs>
      <filter id="sello-tinta" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7" result="r"/><feDisplacementMap in="SourceGraphic" in2="r" scale="3.2"/></filter>
      <mask id="sello-huecos"><rect x="-100" y="-100" width="200" height="200" fill="#fff"/><g fill="#000" opacity=".55"><circle cx="-52" cy="38" r="2.2"/><circle cx="46" cy="-58" r="1.6"/><circle cx="62" cy="40" r="2.6"/><circle cx="-20" cy="-70" r="1.4"/><circle cx="12" cy="66" r="1.8"/><circle cx="-70" cy="-14" r="1.2"/></g></mask>
      <path id="sello-aro" d="M0 -70a70 70 0 1 1 0 140a70 70 0 1 1 0 -140"/>
    </defs>
    <g filter="url(#sello-tinta)" mask="url(#sello-huecos)">
      <circle r="94" fill="#B8422E"/><circle r="86" fill="none" stroke="#F1E6D2" stroke-width="3"/><circle r="52" fill="none" stroke="#F1E6D2" stroke-width="3"/>
      <text class="sello-aro-txt" fill="#F1E6D2"><textPath href="#sello-aro">HECHO GOFIO · FUERZA DE MOLINO ·</textPath></text>
      <text class="sello-dia" y="12" text-anchor="middle" fill="#F1E6D2">${dia}</text>
      <text class="sello-mes" y="34" text-anchor="middle" fill="#F1E6D2">${mes}</text>
    </g>
  </svg>`;
}
/** Kilos «molidos»: la suma de peso × reps de la sesión. Un dato, no una regla (con lastre cuenta solo el lastre). */
const kilosMolidos = (ss) => Math.round(ss.reduce((a, x) => a + (x.peso ?? 0) * x.reps, 0));
function cuentaMolienda(sesion, r, dia, fecha, manana = '') {
  const ss = seriesDe(sesion.id);
  const porEj = [];
  for (const x of [...ss].sort((a, b) => a.ts - b.ts)) {
    let e = porEj.find((y) => y.ej === x.ejercicioId);
    if (!e) { e = { ej: x.ejercicioId, series: [] }; porEj.push(e); }
    e.series.push(x);
  }
  const lineas = porEj.map((e) => {
    const top = e.series.reduce((a, b) => (G.e1rm(b.peso, b.reps, b.rir) > G.e1rm(a.peso, a.reps, a.rir) ? b : a));
    const marca = r.mejor?.ej === e.ej && r.mejor.marca;
    return `<li><span class="cuenta-nombre">${esc(G.ejercicio(e.ej).nombre)}${marca ? ` <i class="cuenta-marca" title="Marca nueva">${icono('marca')}</i>` : ''}</span>
      <span class="cuenta-granos" aria-label="${e.series.length} ${e.series.length === 1 ? 'serie' : 'series'}">${e.series.map(() => grano(true)).join('')}</span>
      <b class="cifra num">${top.peso ? `${kg(top.peso)} × ` : ''}${top.reps}</b></li>`;
  }).join('');
  const kgs = kilosMolidos(ss);
  const mejor = r.mejor && (r.mejor.marca || r.mejor.delta > 0) ? ` · ${r.mejor.marca ? 'marca en' : 'lo que más subió,'} ${G.ejercicio(r.mejor.ej).nombre.split(',')[0].toLowerCase()}` : '';
  const mes = MESES[Number(fecha.slice(5, 7)) - 1];
  return `<div class="cuenta">
    ${sierra(false)}
    <div class="cuenta-papel">
      <div class="cuenta-cabeza"><span>La molienda de hoy</span><span>${r.minutos} min</span></div>
      <ul class="cuenta-lineas">${lineas}</ul>
      <div class="cuenta-total"><span class="cuenta-etiqueta">Total</span>
        <b class="titular"><span data-contar="${r.series}">${r.series}</span> ${r.series === 1 ? 'grano' : 'granos'}</b>
        <p>${kgs ? `<span data-contar-kg="${kgs}">${kgs.toLocaleString('es-ES')}</span> kg molidos` : ''}${esc(mejor)}</p></div>
      ${manana ? `<p class="cuenta-manana">Mañana, si vienes: <b>${esc(manana)}</b>.</p>` : ''}
      <div class="sello-sitio">${selloTinta(dia, mes)}<i class="aro-tinta" aria-hidden="true"></i></div>
    </div>
    ${sierra(true)}
  </div>`;
}
/** G110 · Cómo entra: la primera vez tras la molienda, el sello se estampa con su golpe; luego las líneas y los números. */
function entraLaCuenta(nodo, sesion) {
  const sitio = nodo.querySelector('.sello-sitio'), sello = sitio?.querySelector('.sello-tinta');
  const lineas = nodo.querySelectorAll('.cuenta-lineas li, .cuenta-total, .cuenta-manana, .hoy-pie-hecho > *');
  let visto = null;
  // Una sola vez por molienda (también entre aperturas de la app).
  try { visto = localStorage.getItem('gofio-sello'); } catch { /* sin almacenamiento */ }
  if (reduceMovimiento() || visto === sesion.id || !sello) return;
  try { localStorage.setItem('gofio-sello', sesion.id); } catch { /* */ }
  // G111 · El sello no se ve hasta que se estampa (antes asomaba quieto un momento y luego caía).
  const tapaSello = sello.animate([{ opacity: 0 }, { opacity: 0 }], { duration: 1e6 });
  const ocultos = [...lineas].map((n) => n.animate([{ opacity: 0 }, { opacity: 0 }], { duration: 1e6 }));
  cuandoRevelada(() => setTimeout(() => {
    ocultos.forEach((a) => a.cancel());
    escalonar(lineas, { desde: 0, retraso: 45 });
    nodo.querySelectorAll('.cuenta-granos .grano').forEach((g, k) => g.animate([{ transform: 'translateY(-10px) rotate(-30deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 300, delay: 120 + k * 22, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' }));
    const n = nodo.querySelector('[data-contar]'); if (n) contar(n, Number(n.dataset.contar), 700);
    const k = nodo.querySelector('[data-contar-kg]');
    if (k) { const hasta = Number(k.dataset.contarKg), t0 = performance.now(); const paso = (t) => { const p = Math.min(1, (t - t0) / 900); k.textContent = Math.round(hasta * (1 - Math.pow(1 - p, 3))).toLocaleString('es-ES'); if (p < 1) requestAnimationFrame(paso); }; requestAnimationFrame(paso); }
    // El golpe del sello: llega grande y ladeado, baja de golpe (tambor y vibración), rebota y deja un aro de tinta.
    // Si el sello queda fuera de la pantalla (iPhone pequeño, molienda larga), se estampa cuando aparece al bajar.
    const estampar = () => {
      tapaSello.cancel();
      sello.animate([
        { transform: 'rotate(-40deg) scale(1.6)', opacity: 0 },
        { transform: 'rotate(-14deg) scale(.93)', opacity: 1, offset: 0.55 },
        { transform: 'rotate(-14deg) scale(1.03)', offset: 0.78 },
        { transform: 'rotate(-14deg) scale(1)', opacity: 1 },
      ], { duration: 560, easing: 'cubic-bezier(.55,0,.2,1)', fill: 'backwards' });
      setTimeout(() => {
        S.suena('tambor'); vibrar();
        sitio.querySelector('.aro-tinta')?.animate([{ transform: 'scale(.8)', opacity: 0.45 }, { transform: 'scale(1.5)', opacity: 0 }], { duration: 520, easing: 'ease-out' });
      }, 300);
    };
    const r0 = sitio.getBoundingClientRect(), alto = nodo.getBoundingClientRect().bottom - 70;
    if (r0.top + r0.height * 0.6 < alto || !('IntersectionObserver' in window)) setTimeout(estampar, 420);
    else {
      const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); setTimeout(estampar, 120); } }, { root: nodo, threshold: 0.8, rootMargin: '0px 0px -90px 0px' });  // sin contar lo que tapan las pestañas
      io.observe(sitio);
    }
  }, 120));
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
  const cuerpo = nodo.querySelector('.hoy-cuerpo');
  // En un iPhone bajo (SE, mini) la lista sube lo justo para que se vea al abrir: nunca más abajo de la mitad.
  // Con la molienda hecha, la cuenta va justo debajo del texto, encima del millo (G110).
  const objetivo = hecho ? 0 : Math.min(MUELA.lista - b, Math.round(nodo.clientHeight * 0.54));
  cuerpo.style.marginTop = '0px';
  const ahora = cuerpo.getBoundingClientRect().top - caja.top + nodo.scrollTop;
  cuerpo.style.marginTop = `${Math.max(0, Math.round(Math.max(objetivo, abajo + 24) - ahora))}px`;
  // Lo que cae encima del millo se escribe en basalto, para que no se pierda (G76: «se pierde con el fondo»).
  for (const t of nodo.querySelectorAll('.hoy-cuerpo .fila-titulo h2, .hoy-cuerpo .fila-titulo .enlace')) {
    const rango = document.createRange(); rango.selectNodeContents(t);
    const q = rango.getBoundingClientRect();
    const y = (q.top + q.bottom) / 2 - caja.top + nodo.scrollTop;
    const dentro = (x) => Math.hypot(x - caja.left - cx, y - cy) < r - 4;
    const a = dentro(q.left), z = dentro(q.right);
    t.classList.toggle('sobre-millo', a && z);
    t.classList.toggle('cruza', a !== z);   // a caballo del borde: va en su pastilla de basalto
  }
}

// ── G100 · Deslizar un ejercicio: a la izquierda se quita (almagre), a la derecha se cambia (millo). Solo para hoy. ──
const FONDOS = `<span class="fondo-accion cambiar" aria-hidden="true">${icono('cambiar')}Cambiar</span><span class="fondo-accion quitar" aria-hidden="true">Quitar${icono('menos')}</span>`;

function retoques(fecha, clave) {
  const r = ajuste('retoquesHoy');
  const x = r?.fecha === fecha ? r.por?.[clave] : null;
  return { quitados: x?.quitados ?? [], cambios: x?.cambios ?? {} };
}
async function ponerRetoques(fecha, clave, valor) {
  const r = ajuste('retoquesHoy');
  const por = r?.fecha === fecha ? { ...r.por } : {};   // lo de otros días se olvida solo
  por[clave] = valor;
  await ponerAjuste('retoquesHoy', { fecha, por });
}
function aplicarRetoques(lista, rt) {
  return lista.filter((e) => !rt.quitados.includes(e.ej))
    .map((e) => (rt.cambios[e.ej] ? { ...e, ej: rt.cambios[e.ej], original: e.ej } : e));
}

/** El gesto: sigue al dedo 1:1; pasado un tercio del ancho, «engancha» (toque y vibración) y al soltar se hace. */
function deslizable(li, { quitar, cambiar }) {
  const mueve = li.querySelector('.fila-mueve');
  const fq = li.querySelector('.fondo-accion.quitar'), fc = li.querySelector('.fondo-accion.cambiar');
  let g = null;
  const poner = (dx) => {
    mueve.style.transform = dx ? `translateX(${dx}px)` : '';
    fq.style.opacity = dx < 0 ? '1' : '0'; fc.style.opacity = dx > 0 ? '1' : '0';
  };
  const volverA0 = (desde) => {
    if (reduceMovimiento()) { poner(0); return; }
    mueve.animate([{ transform: `translateX(${desde}px)` }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.34,1.4,.64,1)' })
      .finished.then(() => poner(0), () => poner(0));
    mueve.style.transform = '';
  };
  // En el iPhone se usan los eventos táctiles (con preventDefault en cuanto el gesto es horizontal, para que la página no
  // se lleve el dedo); con ratón, los de puntero. Mismo gesto en los dos.
  const empezar = (x, y) => { g = { x0: x, y0: y, dx: 0, modo: null, enganche: false }; };
  const mover = (x, y, e) => {
    if (!g) return;
    const dx = x - g.x0, dy = y - g.y0;
    if (!g.modo) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      g.modo = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'h' : 'v';
      if (g.modo === 'h') { li.classList.add('arrastrando'); li.dataset.arrastre = '1'; }
    }
    if (g.modo !== 'h') return;
    if (e.cancelable) e.preventDefault();
    const umbral = li.clientWidth / 3;
    g.dx = Math.abs(dx) > umbral * 1.6 ? Math.sign(dx) * (umbral * 1.6 + (Math.abs(dx) - umbral * 1.6) * 0.35) : dx;  // tira con resistencia
    poner(g.dx);
    const enganche = Math.abs(g.dx) >= umbral;
    if (enganche !== g.enganche) {
      g.enganche = enganche; li.classList.toggle('enganchado', enganche);
      if (enganche) { vibrar(); toque('piedra'); }
    }
  };
  if ('ontouchstart' in window) {
    li.addEventListener('touchstart', (e) => { if (e.touches.length === 1) empezar(e.touches[0].clientX, e.touches[0].clientY); else g = null; }, { passive: true });
    li.addEventListener('touchmove', (e) => { if (e.touches.length === 1) mover(e.touches[0].clientX, e.touches[0].clientY, e); }, { passive: false });
    li.addEventListener('touchend', () => fin());
    li.addEventListener('touchcancel', () => { if (g?.modo === 'h') fin(); else g = null; });
  } else {
    li.addEventListener('pointerdown', (e) => { if (e.button === 0) { empezar(e.clientX, e.clientY); g.id = e.pointerId; } });
    li.addEventListener('pointermove', (e) => {
      if (!g || e.pointerId !== g.id) return;
      const antes = g.modo; mover(e.clientX, e.clientY, e);
      if (!antes && g?.modo === 'h') { try { li.setPointerCapture(e.pointerId); } catch { /* */ } }
    });
    li.addEventListener('pointerup', () => fin());
    li.addEventListener('pointercancel', () => { if (g?.modo === 'h') fin(); else g = null; });
  }
  const fin = async () => {
    if (!g) return;
    const { dx, modo, enganche } = g; g = null;
    li.classList.remove('arrastrando', 'enganchado');
    setTimeout(() => { delete li.dataset.arrastre; }, 60);   // el clic que llega al soltar no abre la ficha
    if (modo !== 'h') return;
    if (enganche && dx < 0) {
      const ancho = li.clientWidth;
      if (!reduceMovimiento()) await mueve.animate([{ transform: `translateX(${dx}px)` }, { transform: `translateX(${-ancho}px)` }], { duration: 200, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' }).finished;
      if (!(await quitar())) { mueve.getAnimations().forEach((a) => a.cancel()); volverA0(dx); }
    } else {
      volverA0(dx);
      if (enganche && dx > 0) cambiar();
    }
  };
}

/** «Cambiar» desde Hoy (R22): lo del mismo movimiento primero, luego lo que comparte músculo. Solo para hoy. */
function cambiarHoy(slot, yaHoy, elegir) {
  const lista = [...G.sustitutos(slot.original ?? slot.ej).filter((x) => x.id !== slot.ej && !yaHoy.includes(x.id)), ...(slot.original ? [{ ...G.ejercicio(slot.original), vuelta: true }] : [])];
  const { nodo: h, cerrar } = hoja(`<h2>Cambiar</h2><p class="sub">${esc(G.ejercicio(slot.ej).nombre)}, solo por hoy. Mismas series y reps.</p>
    <ul class="opciones">${lista.map((x) => `<li><button type="button" data-ej="${x.id}"><span class="que"><b>${esc(x.vuelta ? 'El de tu rutina' : x.nombre)}</b><span>${x.vuelta ? esc(x.nombre) : x.mismoPatron ? 'Mismo movimiento' : 'Mismo músculo'}</span></span>${icono('sigue', 'class="flecha-der"')}</button></li>`).join('')}</ul>`);
  escalonar(h.querySelectorAll('.opciones li'), { desde: 120, retraso: 30 });
  h.querySelectorAll('[data-ej]').forEach((b) => b.addEventListener('click', () => { cerrar(); elegir(b.dataset.ej); }));
}

/** Ficha de un ejercicio de la lista (se abre al tocarlo). Con «Cambiar» y «Quitar de hoy» si aún no has empezado. */
function fichaEjercicio(slot, p, acciones = null) {
  const ej = G.ejercicio(slot.ej);
  const princ = Object.entries(ej.musculos).filter(([, f]) => f === 1).map(([m]) => musculoCorto(m));
  const ayuda = Object.entries(ej.musculos).filter(([, f]) => f < 1).map(([m]) => musculoCorto(m));
  const rep = slot.repMin === slot.repMax ? slot.repMin : `${slot.repMin}-${slot.repMax}`;
  const rir = p.rir.min === p.rir.max ? p.rir.min : `${p.rir.min}-${p.rir.max}`;
  const nota = estado.notas[slot.ej]?.texto;
  const { nodo, cerrar } = hoja(`<h2>${esc(ej.nombre)}</h2><p class="sub">${p.series} × ${rep} · deja ${rir}</p>
    <ul class="opciones">
      <li><button type="button" tabindex="-1"><span class="que"><b class="num">${p.peso == null ? 'Lo pones tú' : `${kg(p.peso)} kg`}</b><span>Hoy</span></span></button></li>
      ${p.otraVez ? `<li><button type="button" tabindex="-1"><span class="que"><b class="num">${kg(p.otraVez.peso)} × ${p.otraVez.series.map((x) => x.reps).join(' · ')}</b><span>La última vez</span></span></button></li>` : ''}
      <li><button type="button" tabindex="-1"><span class="que"><b>${esc(princ.join(', ').replace(/^./, (c) => c.toUpperCase()))}</b><span>${ayuda.length ? `Ayudan: ${esc(ayuda.join(', '))}` : 'Trabaja'}</span></span></button></li>
      ${nota ? `<li><button type="button" tabindex="-1"><span class="que"><b>${esc(nota)}</b><span>Tu nota</span></span></button></li>` : ''}
    </ul>
    ${acciones ? `<div class="ficha-acciones"><button class="boton piedra" type="button" data-cambiar>${icono('cambiar')}Cambiar</button><button class="boton piedra quitar" type="button" data-quitar>Quitar de hoy</button></div>` : ''}`);
  escalonar(nodo.querySelectorAll('.opciones li'), { desde: 120, retraso: 40 });
  if (acciones) {
    nodo.querySelector('[data-cambiar]').onclick = () => { cerrar(); setTimeout(acciones.cambiar, 200); };
    nodo.querySelector('[data-quitar]').onclick = () => { cerrar(); acciones.quitar(); };
  }
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
