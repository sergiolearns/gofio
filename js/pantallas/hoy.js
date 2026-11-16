// «Hoy»: qué toca y por qué (R15), «Otro día», vuelta tras días sin ir (R14) y modo «día malo» (R21).
import * as G from '../cerebro/index.js';
import { estado, ajuste, hoy, planDeHoy, porQue, prescripcion, vueltaHoy, sesionEnCurso, sesionesHechas, empezarSesion, resumen, siguienteHueco, musculoCorto } from '../logica.js';
import { el, esc, kg, icono, triangulo, ajustarTitulo, hoja, vibrar, escalonar } from '../ui.js';

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
  let porque = eleccion ? (sesion.diaId === plan.diaId ? 'Lo eliges tú. Y Gofio también.' : `Lo eliges tú. Gofio decía ${plan.nombre.toLowerCase()}.`) : porQue(plan);
  let titulo = sesion.nombre;
  if (mostrarHecho) { titulo = hechaHoy.nombre; porque = 'Molienda hecha.'; }
  const avisoVuelta = vuelta.tipo === 'larga'
    ? `Vuelves tras ${vuelta.dias ?? 'muchos'} días. Esta semana, más suave: menos peso y menos series.`
    : vuelta.tipo === 'media' ? `${vuelta.dias} días fuera. Hoy, tu peso de siempre con algo más de margen.`
      : vuelta.tipo === 'primera' ? 'Primera molienda. Los pesos que no sepas, los pones en la primera serie.' : '';

  const filas = ejercicios.map((e, i) => {
    const p = presc[i]; const ej = G.ejercicio(e.ej);
    const rep = e.repMin === e.repMax ? e.repMin : `${e.repMin}-${e.repMax}`;
    return `<li data-i="${i}" role="button" tabindex="0" aria-label="${esc(ej.nombre)}: ver ficha"><span class="nombre">${esc(ej.nombre)}</span><span class="esquema">${p.series} × ${rep}</span>
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
      ${mostrarHecho ? '' : `<p class="hoy-meta">${ejercicios.length} ejercicios · ${totalSeries} series · ~${minutos} min</p>`}
    </header>
    <div class="hoy-cuerpo">
      ${avisoVuelta && !mostrarHecho ? `<div class="aviso-vuelta">${icono('vuelta')}<p>${esc(avisoVuelta)}</p></div>` : ''}
      ${mostrarHecho ? cuerpoHecho(hechaHoy) : `
      <div class="fila-titulo"><h2>La molienda de hoy${diaMaloActivo ? ' · día malo' : ''}</h2><button class="enlace" data-otro type="button">Otro día</button></div>
      <ul class="lista-ejercicios">${filas}</ul>
      <div class="acciones-hoy">
        <div class="fila-chips"><button class="chip" type="button" data-malo aria-pressed="${diaMaloActivo}">Día malo</button></div>
        ${diaMaloActivo ? '<p class="etiqueta">Lo justo: 2 series de lo importante. Mejor que nada.</p>' : ''}
        <button class="boton" type="button" data-empezar>${enCurso ? 'Seguir la molienda' : 'A moler'}</button>
      </div>`}
    </div>
  </section>`);

  function cuerpoHecho(s) {
    const r = resumen(s);
    return `<div class="fila-titulo"><h2>Hoy</h2></div>
      <p style="font-size:17px;line-height:1.45">${r.series} series en ${r.minutos} min. Mañana, más.</p>
      <div class="acciones-hoy"><button class="boton plano" type="button" data-resumen>Ver resumen</button>
      <button class="enlace" type="button" data-otro>Otra sesión</button></div>`;
  }

  nodo.querySelector('[data-malo]')?.addEventListener('click', () => { diaMaloActivo = !diaMaloActivo; vibrar(); nav.refrescar(); });
  nodo.querySelectorAll('.lista-ejercicios li').forEach((li) => {
    const abrir = () => fichaEjercicio(ejercicios[Number(li.dataset.i)], presc[Number(li.dataset.i)]);
    li.addEventListener('click', abrir);
    li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); } });
  });
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
      if (!refresco) escalonar(nodo.querySelectorAll('.lista-ejercicios li, .acciones-hoy > *, .aviso-vuelta'), { desde: 260, retraso: 45 });
      else escalonar(nodo.querySelectorAll('.lista-ejercicios li'), { desde: 0, retraso: 35 });
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
  const { nodo, cerrar } = hoja(`<h2>Otro día</h2><p class="sub">Elige tú.</p><ul class="opciones">${opciones.join('')}</ul>`);
  escalonar(nodo.querySelectorAll('.opciones li'), { desde: 120, retraso: 35 });
  nodo.querySelectorAll('[data-dia]').forEach((b) => b.addEventListener('click', () => {
    eleccion = { fecha: hoy(), diaId: b.dataset.dia };
    cerrar(); vibrar(); nav.refrescar();
  }));
}

export { estado };
