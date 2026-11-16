// «Hoy»: qué toca y por qué (R15), «Otro día», vuelta tras días sin ir (R14) y modo «día malo» (R21).
import * as G from '../cerebro/index.js';
import { estado, ajuste, hoy, planDeHoy, porQue, prescripcion, vueltaHoy, sesionEnCurso, sesionesHechas, empezarSesion, resumen, siguienteHueco } from '../logica.js';
import { el, esc, kg, icono, triangulo, ajustarTitulo, hoja, vibrar } from '../ui.js';

let diaMaloActivo = false;
let eleccion = null; // {fecha, diaId|'combinada'} si el usuario eligió «Otro día»

export function hoyPantalla(_, nav) {
  const fecha = hoy();
  if (eleccion?.fecha !== fecha) eleccion = null;
  const enCurso = sesionEnCurso();
  const hechaHoy = sesionesHechas().filter((s) => s.fecha === fecha).at(-1);
  const mostrarHecho = !!hechaHoy && !enCurso && !eleccion;
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
  const minutos = Math.round(totalSeries * 3 / 5) * 5;

  // La semana en triángulos: lleno = entrenado; almagre = hoy; contorno = sin entreno.
  const lunes = G.lunesDe(fecha);
  const fechasHechas = new Set(sesionesHechas().map((s) => s.fecha));
  const tri = G.LETRA_DIA.map((l, i) => {
    const f = G.sumarDias(lunes, i);
    const est = f === fecha ? 'hoy' : fechasHechas.has(f) ? 'lleno' : 'contorno';
    return `<div class="${f === fecha ? 'hoy' : ''}">${triangulo(est)}${l}</div>`;
  }).join('');
  const entrenados = G.LETRA_DIA.filter((_, i) => fechasHechas.has(G.sumarDias(lunes, i))).length;
  const dNum = Number(fecha.slice(8));

  // Texto del porqué y avisos.
  let porque = eleccion ? 'Elegido por ti. ' + (sesion.diaId === plan.diaId ? 'Coincide con lo que proponía Gofio.' : `Gofio proponía ${plan.nombre.toLowerCase()}.`) : porQue(plan);
  let titulo = sesion.nombre;
  if (mostrarHecho) { titulo = hechaHoy.nombre; porque = 'Molienda hecha hoy.'; }
  const avisoVuelta = vuelta.tipo === 'larga'
    ? `Vuelta tras ${vuelta.dias ?? 'muchos'} días sin venir: esta semana, cargas un 10 % más bajas, dos tercios de las series y 2-3 repeticiones de margen. La segunda semana, normal.`
    : vuelta.tipo === 'media' ? `Llevas ${vuelta.dias} días sin venir: hoy, las cargas de siempre con una repetición más de margen.`
      : vuelta.tipo === 'primera' ? 'Primera molienda con Gofio. Los pesos que no sepas te los pido en la primera serie.' : '';

  const filas = ejercicios.map((e, i) => {
    const p = presc[i]; const ej = G.ejercicio(e.ej);
    const rep = e.repMin === e.repMax ? e.repMin : `${e.repMin}-${e.repMax}`;
    return `<li><span class="nombre">${esc(ej.nombre)}</span><span class="esquema">${p.series} × ${rep}</span>
      <span class="carga cifra num${p.peso == null ? ' vacia' : ''}">${p.peso == null ? '—' : kg(p.peso)}</span></li>`;
  }).join('');

  const nodo = el(`<section class="hoy" aria-labelledby="titulo-hoy">
    <header class="hoy-cabeza">
      <div class="hoy-disco" aria-hidden="true"></div>
      <div class="hoy-arriba">
        <div class="fecha-hoy cifra" aria-label="Hoy, ${G.NOMBRE_DIA[G.diaSemana(fecha)]} ${dNum}">${dNum}</div>
        <div class="semana-triangulos" role="img" aria-label="Esta semana: ${entrenados} ${entrenados === 1 ? 'día entrenado' : 'días entrenados'}">${tri}</div>
      </div>
      <h1 class="titulo-gigante hoy-titulo" id="titulo-hoy">${esc(titulo)}</h1>
      <p class="hoy-por-que">${esc(porque)}</p>
      ${mostrarHecho ? '' : `<p class="hoy-meta">${ejercicios.length} ejercicios · ${totalSeries} series · unos ${minutos} min</p>`}
    </header>
    <div class="hoy-cuerpo">
      ${avisoVuelta && !mostrarHecho ? `<div class="aviso-vuelta">${icono('vuelta')}<p>${esc(avisoVuelta)}</p></div>` : ''}
      ${mostrarHecho ? cuerpoHecho(hechaHoy) : `
      <div class="fila-titulo"><h2>La molienda de hoy${diaMaloActivo ? ' · día malo' : ''}</h2><button class="enlace" data-otro type="button">Otro día</button></div>
      <ul class="lista-ejercicios">${filas}</ul>
      <div class="acciones-hoy">
        <div class="fila-chips"><button class="chip" type="button" data-malo aria-pressed="${diaMaloActivo}">Día malo · sesión corta</button></div>
        ${diaMaloActivo ? '<p class="etiqueta">Los ejercicios clave, 2 series y más margen. Mejor eso que el día en blanco (R21).</p>' : ''}
        <button class="boton" type="button" data-empezar>${enCurso ? 'Seguir la molienda' : 'A moler'}</button>
      </div>`}
    </div>
  </section>`);

  function cuerpoHecho(s) {
    const r = resumen(s);
    return `<div class="fila-titulo"><h2>Hecho hoy</h2></div>
      <p style="font-size:17px;line-height:1.45">${r.series} series en ${r.minutos} min. Lo siguiente lo verás aquí mañana.</p>
      <div class="acciones-hoy"><button class="boton plano" type="button" data-resumen>Ver el resumen</button>
      <button class="enlace" type="button" data-otro>Otra sesión hoy</button></div>`;
  }

  nodo.querySelector('[data-malo]')?.addEventListener('click', () => { diaMaloActivo = !diaMaloActivo; vibrar(); nav.refrescar(); });
  nodo.querySelector('[data-resumen]')?.addEventListener('click', () => nav.ir('hecho', { sesionId: hechaHoy.id, soloVer: true }));
  nodo.querySelectorAll('[data-otro]').forEach((b) => b.addEventListener('click', () => otroDia(plan, nav)));
  nodo.querySelector('[data-empezar]')?.addEventListener('click', async () => {
    vibrar();
    let s = enCurso;
    if (!s) s = await empezarSesion({ diaId: sesion.diaId, nombre: sesion.nombre + (diaMaloActivo ? ' (día malo)' : ''), ejercicios, modo: diaMaloActivo ? 'dia-malo' : sesion.tipo === 'combinada' ? 'combinada' : 'normal' });
    diaMaloActivo = false; eleccion = null;
    const i = Math.max(0, siguienteHueco(s, s.actual ?? 0));
    nav.ir('serie', { sesionId: s.id, i });
  });

  return {
    nodo, pestana: 'hoy',
    alEntrar({ refresco } = {}) {
      requestAnimationFrame(() => { ajustarTitulo(nodo.querySelector('.hoy-titulo'), { max: 132, min: 64, lineas: 2 }); colocarDisco(nodo); });
      if (!refresco && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        nodo.querySelector('.hoy-disco').animate([{ transform: 'rotate(-24deg) scale(.96)' }, { transform: 'none' }], { duration: 900, easing: 'cubic-bezier(.16,1,.3,1)' });
      }
    },
  };
}

/**
 * El disco de millo de «Hoy»: su centro es la fecha y su radio crece lo justo para que todo el texto quede encima.
 * La lista empieza por debajo de la curva, como en el dibujo de D.
 */
function colocarDisco(nodo) {
  const cab = nodo.querySelector('.hoy-cabeza'), disco = nodo.querySelector('.hoy-disco'), fecha = nodo.querySelector('.fecha-hoy');
  const rc = cab.getBoundingClientRect(), rf = fecha.getBoundingClientRect();
  const cx = rf.left + rf.width / 2 - rc.left, cy = rf.top + rf.height / 2 - rc.top;
  let r = 380;
  for (const n of cab.querySelectorAll('.semana-triangulos, .hoy-titulo, .hoy-por-que, .hoy-meta')) {
    const b = n.getBoundingClientRect();
    // Se mide el rectángulo del texto real (el título puede ser más estrecho que su caja).
    const rango = document.createRange(); rango.selectNodeContents(n);
    const t = n.classList.contains('semana-triangulos') ? b : rango.getBoundingClientRect();
    for (const [x, y] of [[t.left, t.top], [t.right, t.top], [t.left, t.bottom], [t.right, t.bottom]]) {
      r = Math.max(r, Math.hypot(x - rc.left - cx, y - rc.top - cy) + 22);
    }
  }
  disco.style.setProperty('--r', `${Math.round(r)}px`);
  disco.style.left = `${cx - r}px`; disco.style.top = `${cy - r}px`;
  const bajo = cy + r - rc.height;
  nodo.querySelector('.hoy-cuerpo').style.marginTop = `${Math.max(0, Math.round(bajo + 6))}px`;
}

function otroDia(plan, nav) {
  const plantilla = ajuste('plantilla');
  const lunes = G.lunesDe(hoy());
  const hechos = new Map(sesionesHechas().filter((s) => s.fecha >= lunes).map((s) => [s.diaId, s.fecha]));
  const opciones = plantilla.dias.map((d) => {
    const marca = d.id === plan.diaId ? 'Propuesto' : hechos.has(d.id) ? `Hecho el ${G.NOMBRE_DIA[G.diaSemana(hechos.get(d.id))]}` : '';
    const series = d.ejercicios.reduce((s, e) => s + e.series, 0);
    return `<li><button type="button" data-dia="${d.id}"><span class="que"><b>${esc(d.nombre)}</b><span>${d.ejercicios.length} ejercicios · ${series} series</span></span><span class="marca">${esc(marca)}</span></button></li>`;
  });
  if (plan.tipo === 'combinada') opciones.unshift(`<li><button type="button" data-dia="combinada"><span class="que"><b>Combinada</b><span>Lo que más falta esta semana, en una sesión</span></span><span class="marca">Propuesta</span></button></li>`);
  const { nodo, cerrar } = hoja(`<h2>Otro día</h2><p class="sub">Elige tú. Gofio solo explica por qué proponía lo suyo.</p><ul class="opciones">${opciones.join('')}</ul>`);
  nodo.querySelectorAll('[data-dia]').forEach((b) => b.addEventListener('click', () => {
    eleccion = { fecha: hoy(), diaId: b.dataset.dia };
    cerrar(); vibrar(); nav.refrescar();
  }));
}

export { estado };
