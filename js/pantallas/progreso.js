// «Progreso: le vas cogiendo el jeito» (v0.2; lienzo: Progreso.dc.html; G94). Progreso es fuerza: basalto.
// La fuerza estimada de cada ejercicio (R11) con su línea, su estado (sube, se asienta, atascado: R12), qué hacer si
// se atasca (otra maña, R22, o un rango más bajo, R12) y la descarga propuesta, nunca impuesta (R13).
import * as G from '../cerebro/index.js';
import { estado, ajuste, hoy, fuerzaEjercicios, propuestaDescarga, descargaActiva, empezarDescarga, terminarDescarga, apartarDescarga,
  cambiarEnPlantilla, cambiarRango, rangoEnPlantilla, huecoDe, prescripcion, ponerAjuste } from '../logica.js';
import { el, esc, kg, num, icono, hoja, avisar, vibrar, escalonar, contar, reduceMovimiento } from '../ui.js';
import { porqueDe } from './serie.js';

const GRANO = 'M0 -82C55 -82 72 -22 64 22C56 64 29 82 0 82C-29 82 -56 64 -64 22C-72 -22 -55 -82 0 -82Z';
const ESTADO = { sube: ['sube', 'Sube'], asienta: ['igual', 'Se asienta'], atascado: ['igual', 'Atascado'], nuevo: ['igual', 'Aún sin línea'] };
const SEMANAS = 6; // la ventana de la gráfica (diseño de Gofio)
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fechaCorta = (f) => `${Number(f.slice(8))} ${MESES[Number(f.slice(5, 7)) - 1]}`;

/** La línea pequeña de cada fila: la fuerza de cada molienda, con el último grano. */
function linea(valores, w = 70, h = 24, color = 'var(--millo)') {
  if (valores.length < 2) return `<svg class="linea" width="${w}" height="${h}" aria-hidden="true"></svg>`;
  const lo = Math.min(...valores), hi = Math.max(...valores), rango = hi - lo || 1;
  const pts = valores.map((v, i) => [4 + i * (w - 8) / (valores.length - 1), h - 4 - (v - lo) / rango * (h - 8)]);
  const [x, y] = pts.at(-1);
  return `<svg class="linea" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline points="${pts.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" opacity=".55"/>
    <g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(.075)"><path transform="rotate(-14)" fill="${color}" d="${GRANO}"/></g></svg>`;
}

export function progresoPantalla(_, nav) {
  const fuerza = fuerzaEjercicios(SEMANAS);
  if (!fuerza.length) return vacio();
  const n = (e) => fuerza.filter((f) => f.estado === e).length;
  const propuesta = propuestaDescarga(fuerza);
  const enDescarga = descargaActiva();
  const subtitulo = propuesta ? 'Mucha piedra seguida.' : enDescarga ? 'Semana de aflojar.' : n('sube') ? 'Le vas cogiendo el jeito.' : n('atascado') ? 'Toca darle una vuelta.' : 'Se va asentando.';
  // El primer atascado que esté en tu rutina: su aviso con lo que puedes hacer (R12 → R22 o rango más bajo).
  const atascado = fuerza.find((f) => f.estado === 'atascado' && rangoEnPlantilla(f.ej));
  let avisoAtascado = '';
  if (atascado && !propuesta) {
    const r = rangoEnPlantilla(atascado.ej);
    const bajo = G.rangoMasBajo(r.repMin, r.repMax);
    const textoRango = bajo.repMin === bajo.repMax ? `A ${bajo.repMin} reps` : `A ${bajo.repMin}-${bajo.repMax} reps`;
    avisoAtascado = `<div class="aviso-atascado"><p><b>${esc(G.ejercicio(atascado.ej).nombre)}, atascado.</b> Tres moliendas sin subir. Prueba otra maña o un rango más bajo.</p>
      <div class="botones-fila"><button class="chip millo" type="button" data-mana="${atascado.ej}">${icono('cambiar')}Otra maña</button>
      ${bajo.repMin < r.repMin ? `<button class="chip" type="button" data-rango="${atascado.ej}" data-min="${bajo.repMin}" data-max="${bajo.repMax}">${textoRango}</button>` : ''}</div></div>`;
  }
  // La descarga (R13): cuándo se propone y qué es.
  let tarjetaDescarga = '';
  if (propuesta) {
    const motivos = [];
    if (propuesta.semanas) motivos.push(`llevas ${propuesta.semanasSeguidas} semanas yendo 4 días o más`);
    if (propuesta.atascados) motivos.push(`${n('atascado')} ejercicios atascados`);
    if (propuesta.cansancio) motivos.push('tus dos últimas moliendas te dejaron molido');
    const frase = motivos.length > 1 ? `${motivos.slice(0, -1).join(', ')} y ${motivos.at(-1)}` : motivos[0];
    tarjetaDescarga = `<div class="tarjeta-descarga" data-descarga>
      <b class="titular">¿Una semana de descarga?</b>
      <p>${esc(frase[0].toUpperCase() + frase.slice(1))}.</p>
      <ul><li>Los mismos días</li><li>La mitad de series</li><li>Un 10 % menos de peso</li><li>Dos más de margen</li></ul>
      <p class="corto">De 5 a 7 días. Luego, lo de siempre.</p>
      <div class="botones-fila"><button class="boton oscuro" type="button" data-si-descarga data-son="piedra">Esta semana</button><button class="ahora-no" type="button" data-no-descarga>Ahora no</button></div>
    </div>
    <p class="nota-descarga">Gofio no la pone en el calendario: la propone si se juntan dos de tres cosas (ejercicios atascados, cansancio o molestias varias moliendas seguidas, muchas semanas sin aflojar).</p>`;
  } else if (enDescarga) {
    const d = ajuste('descarga');
    tarjetaDescarga = `<div class="aviso-atascado"><p><b>Semana de descarga hasta el ${G.NOMBRE_DIA[G.diaSemana(d.hasta)]} ${Number(d.hasta.slice(8))}.</b> La mitad de series, un 10 % menos y más margen.</p>
      <div class="botones-fila"><button class="chip" type="button" data-fin-descarga>Terminarla ya</button></div></div>`;
  }

  const filas = fuerza.map((f) => {
    const [ic, txt] = ESTADO[f.estado];
    return `<li><button type="button" data-ej="${f.ej}" class="fila-fuerza ${f.estado}" aria-label="${esc(G.ejercicio(f.ej).nombre)}: ${Math.round(f.ahora)} kg de fuerza estimada, ${txt.toLowerCase()}">
      <span class="nombre">${esc(G.ejercicio(f.ej).nombre)}</span><span class="cubre">${linea(f.sesiones.map((s) => s.e1rm), 70, 24, f.estado === 'atascado' ? 'var(--piedra)' : 'var(--millo)')}<i></i></span>
      <span class="cuanto"><b class="cifra">${Math.round(f.ahora)}</b> kg</span><span class="estado" title="${txt}">${icono(ic)}</span></button></li>`;
  }).join('');
  const chip = (num_, txt, ic, clase) => `<div class="chip-cuenta ${clase}"><span>${icono(ic)}<b class="cifra">${num_}</b></span><small>${txt}</small></div>`;

  const nodo = el(`<section class="progreso" aria-labelledby="titulo-progreso">
    <h1 class="titular grande" id="titulo-progreso">Progreso</h1>
    <p class="titular subtitulo-progreso">${subtitulo}</p>
    <p class="etiqueta">Las últimas ${SEMANAS} semanas, ejercicio a ejercicio.</p>
    ${propuesta ? '' : `<div class="cuentas">${chip(n('sube'), 'suben', 'sube', 'sube')}${chip(n('asienta'), 'se asientan', 'igual', 'asienta')}${chip(n('atascado'), n('atascado') === 1 ? 'atascado' : 'atascados', 'igual', 'atascado')}</div>`}
    ${tarjetaDescarga}${avisoAtascado}
    <div class="fila-titulo"><h2>Tu fuerza</h2><span class="etiqueta">estimada, en kg</span></div>
    <ul class="lista-fuerza">${filas}</ul>
  </section>`);

  nodo.querySelectorAll('[data-ej]').forEach((b) => b.addEventListener('click', () => nav.ir('ejercicio', { ej: b.dataset.ej })));
  nodo.querySelector('[data-si-descarga]')?.addEventListener('click', async () => { vibrar(); await empezarDescarga(); avisar('Semana de descarga. A moler suave.'); nav.refrescar(); });
  nodo.querySelector('[data-no-descarga]')?.addEventListener('click', async () => { await apartarDescarga(); nav.refrescar(); });
  nodo.querySelector('[data-fin-descarga]')?.addEventListener('click', async () => { await terminarDescarga(); avisar('Descarga terminada.'); nav.refrescar(); });
  nodo.querySelector('[data-rango]')?.addEventListener('click', async (e) => {
    const b = e.currentTarget, ej = b.dataset.rango, antes = rangoEnPlantilla(ej);
    const previo = { repMin: antes.repMin, repMax: antes.repMax };
    await cambiarRango(ej, { repMin: Number(b.dataset.min), repMax: Number(b.dataset.max) }); vibrar();
    avisar(`${G.ejercicio(ej).nombre}: ahora ${b.dataset.min}-${b.dataset.max}.`, { texto: 'Deshacer', hacer: async () => { await cambiarRango(ej, previo); nav.refrescar(); } });
    nav.refrescar();
  });
  nodo.querySelector('[data-mana]')?.addEventListener('click', (e) => otraMana(e.currentTarget.dataset.mana, nav));

  return {
    nodo, pestana: 'progreso',
    alEntrar({ refresco } = {}) {
      if (refresco || reduceMovimiento()) return;
      escalonar(nodo.querySelectorAll('.chip-cuenta, .aviso-atascado, .lista-fuerza li'), { desde: 60, retraso: 40 });
      // La línea de cada fila se dibuja de izquierda a derecha; los ▲ de «sube» suben una vez.
      nodo.querySelectorAll('.lista-fuerza .cubre i').forEach((c, k) => c.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: 520, delay: 160 + k * 40, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }));
      nodo.querySelectorAll('.fila-fuerza.sube .estado svg, .chip-cuenta.sube svg').forEach((s, k) => s.animate([{ transform: 'translateY(6px)', opacity: 0 }, { transform: 'translateY(-2px)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }], { duration: 560, delay: 320 + k * 40, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }));
      nodo.querySelector('[data-descarga]')?.animate([{ transform: 'translateY(40px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, delay: 120, easing: 'cubic-bezier(.32,.72,0,1)', fill: 'backwards' });
    },
  };
}

/** R12 → R22 · Otra maña para un ejercicio atascado: cambia en tu rutina, con «Deshacer». */
function otraMana(ej, nav) {
  const lista = G.sustitutos(ej).filter((x) => x.id !== ej);
  const { nodo, cerrar } = hoja(`<h2>Otra maña</h2><p class="sub">${esc(G.ejercicio(ej).nombre)} lleva tres moliendas sin subir. Cámbialo en tu rutina por otro del mismo trabajo.</p>
    <ul class="opciones">${lista.map((x) => `<li><button type="button" data-n="${x.id}"><span class="que"><b>${esc(x.nombre)}</b><span>${x.mismoPatron ? 'Mismo movimiento' : 'Mismo músculo'}</span></span>${icono('sigue', 'class="flecha-der"')}</button></li>`).join('')}</ul>`);
  escalonar(nodo.querySelectorAll('.opciones li'), { desde: 120, retraso: 30 });
  nodo.querySelectorAll('[data-n]').forEach((b) => b.addEventListener('click', async () => {
    await cambiarEnPlantilla(ej, b.dataset.n); cerrar(); vibrar();
    avisar(`Ahora: ${G.ejercicio(b.dataset.n).nombre}.`, { texto: 'Deshacer', hacer: async () => { await cambiarEnPlantilla(b.dataset.n, ej); nav.refrescar(); } });
    nav.refrescar();
  }));
}

/** El hueco honesto mientras no hay datos (G86). */
function vacio() {
  const nodo = el(`<section class="hueco-pantalla"><h1 class="titular grande">Progreso</h1>
    <div class="hueco-dibujo"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#3A3531" d="M3 9.5L12 3l9 6.5v2.6L12 5.6l-9 6.5zM3 14.7l9-6.5l9 6.5v2.6l-9-6.5l-9 6.5z"/><path class="sube" fill="#E3A62B" d="M3 19.9l9-6.5l9 6.5V22.5l-9-6.5l-9 6.5z"/></svg></div>
    <div class="hueco-texto"><h2 class="titular" style="color:var(--millo)">Aún moliendo.</h2><p>Aquí verás cómo le coges el jeito a cada ejercicio: tu fuerza, con su gráfica. Con tu primera molienda ya sale.</p></div></section>`);
  return { nodo, pestana: 'progreso', alEntrar() { escalonar(nodo.querySelectorAll('.hueco-texto > *'), { desde: 120, retraso: 80 }); } };
}

/** «Un ejercicio»: su fuerza en grande, cuánto ha subido, la gráfica, la próxima carga (R12) y las últimas moliendas. */
export function ejercicioPantalla({ ej }, nav) {
  const f = fuerzaEjercicios(SEMANAS).find((x) => x.ej === ej);
  const nombre = G.ejercicio(ej).nombre;
  const ses = f?.sesiones ?? [];
  const ahora = f ? Math.round(f.ahora) : 0;
  const cambio = f?.cambio != null ? Math.round(f.cambio) : null;
  const slot = huecoDe(ej);
  const p = prescripcion(slot);
  const proxima = p.peso != null ? `${kg(p.peso)} × ${p.reps[0] ?? slot.repMin}` : `${slot.repMin}-${slot.repMax} reps`;
  // La gráfica: la fuerza de cada molienda, un grano por punto.
  const W = 340, H = 190;
  let grafica = '';
  if (ses.length) {
    const vals = ses.map((s) => s.e1rm);
    const lo = Math.floor((Math.min(...vals) - 2) / 5) * 5, hi = Math.ceil((Math.max(...vals) + 2) / 5) * 5;
    const px = (i) => (ses.length === 1 ? (W + 16) / 2 : 26 + i * (W - 46) / (ses.length - 1));
    const py = (v) => H - 24 - (v - lo) / (hi - lo || 1) * (H - 50);
    const lineas = [lo, (lo + hi) / 2, hi].map((v) => `<line x1="26" x2="${W - 10}" y1="${py(v).toFixed(1)}" y2="${py(v).toFixed(1)}" stroke="#3A3531"/><text x="0" y="${(py(v) + 4).toFixed(1)}" font-size="10" fill="#A89D8F">${Math.round(v)}</text>`).join('');
    const marcasX = [...new Set([0, Math.floor((ses.length - 1) / 2), ses.length - 1])].map((i) => `<text x="${px(i).toFixed(1)}" y="${H - 4}" text-anchor="middle" font-size="10" fill="#A89D8F">${fechaCorta(ses[i].fecha)}</text>`).join('');
    const puntos = ses.map((s, i) => `<g class="punto" transform="translate(${px(i).toFixed(1)} ${py(s.e1rm).toFixed(1)}) scale(${i === ses.length - 1 ? 0.11 : 0.075})"><path transform="rotate(-14)" fill="#E3A62B" d="${GRANO}"/></g>`).join('');
    grafica = `<svg class="grafica" viewBox="0 0 ${W} ${H}" role="img" aria-label="Fuerza estimada en ${esc(nombre.toLowerCase())}: ${vals.map((v) => Math.round(v)).join(', ')} kg">
      ${lineas}<polyline points="${ses.map((s, i) => `${px(i).toFixed(1)},${py(s.e1rm).toFixed(1)}`).join(' ')}" fill="none" stroke="#E3A62B" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>${puntos}
      <text x="${(px(ses.length - 1) - 8).toFixed(1)}" y="${(py(vals.at(-1)) - 14).toFixed(1)}" text-anchor="middle" class="cifra" font-size="18" fill="#E3A62B">${ahora}</text>${marcasX}</svg>`;
  }
  const ultimas = (f?.todas ?? []).slice(-3).reverse().map((s) => {
    const xs = estado.series.filter((x) => x.sesionId === s.sesionId && x.ejercicioId === ej).sort((a, b) => a.ts - b.ts);
    return `<li><span>${fechaCorta(s.fecha)}</span><b>${kg(xs[0]?.peso)} × ${xs.map((x) => x.reps).join(' · ')}</b></li>`;
  }).join('');
  const chipCambio = cambio == null ? '' : cambio > 0
    ? `<p class="chip-cambio">${icono('sube')}+${cambio} kg en ${SEMANAS} semanas</p>`
    : `<p class="chip-cambio igual">${icono('igual')}${cambio === 0 ? `Igual que hace ${SEMANAS} semanas` : `${cambio} kg en ${SEMANAS} semanas`}</p>`;

  const nodo = el(`<section class="ejercicio" aria-labelledby="titulo-ejercicio">
    <div class="serie-cabeza"><button class="volver" type="button" data-volver>${icono('atras')}Progreso</button></div>
    <h1 class="titular serie-titulo" id="titulo-ejercicio">${esc(nombre)}</h1>
    <div class="fuerza-grande"><b class="cifra" data-n="${ahora}">${ahora}</b><span>kg de fuerza<br>estimada</span></div>
    ${chipCambio}
    ${grafica ? `<div class="tarjeta-grafica">${grafica}</div>` : ''}
    <div class="tarjeta-proxima"><span><small>La próxima</small>${esc(porqueDe(p, slot))}</span><b class="cifra">${proxima}</b></div>
    ${ultimas ? `<h2 class="sub-ejercicio">Las últimas moliendas</h2><ul class="ultimas">${ultimas}</ul>` : ''}
    <p class="nota-fuerza">Fuerza estimada: lo que podrías levantar una vez, calculado con tus series. Sirve para ver si subes; no es para probarlo.</p>
  </section>`);
  nodo.querySelector('[data-volver]').onclick = () => nav.volver();
  return {
    nodo, pestana: null,
    alEntrar() {
      const n = nodo.querySelector('[data-n]');
      contar(n, ahora, reduceMovimiento() ? 0 : 800);
      if (reduceMovimiento()) return;
      // Los granos de la gráfica caen uno a uno.
      nodo.querySelectorAll('.grafica .punto path').forEach((g, k) => g.animate([{ transform: 'translateY(-160px) rotate(-14deg)', opacity: 0 }, { transform: 'rotate(-14deg)', opacity: 1 }], { duration: 420, delay: 200 + k * 70, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' }));
      nodo.querySelector('.grafica polyline')?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay: 200 + ses.length * 70, fill: 'backwards' });
      escalonar(nodo.querySelectorAll('.chip-cambio, .tarjeta-proxima, .sub-ejercicio, .ultimas li'), { desde: 300, retraso: 60 });
    },
  };
}
export { ponerAjuste, hoy, num };
