// «Mi semana»: constancia (R23), series por músculo con su franja (R9) y los entrenos de la semana.
import * as G from '../cerebro/index.js';
import { estado, ajuste, hoy, sesionesHechas, seriesHechas, seriesDe, resumen, ponerAjuste } from '../logica.js';
import { el, esc, kg, num, sierra, hoja, granos, reduceMovimiento } from '../ui.js';
import { exportarCopia } from './ajustes.js';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const diaMes = (f) => `${Number(f.slice(8))} de ${MESES[Number(f.slice(5, 7)) - 1]}`;
const ESCALA = 24; // series que caben en la barra
const SUJETO = { pecho: 'El pecho va', dorsal: 'La espalda va', 'hombro-anterior': 'El hombro anterior va', 'hombro-lateral': 'El hombro lateral va',
  'hombro-posterior': 'El hombro posterior va', biceps: 'El bíceps va', triceps: 'El tríceps va', cuadriceps: 'La pierna va',
  isquios: 'La pierna va', gluteo: 'El glúteo va', gemelos: 'Los gemelos van', abdomen: 'El abdomen va' };

export function semanaPantalla(_, nav) {
  const fecha = hoy();
  const lunes = G.lunesDe(fecha), domingo = G.sumarDias(lunes, 6);
  const hechas = sesionesHechas();
  const estaSemana = hechas.filter((s) => s.fecha >= lunes && s.fecha <= domingo);
  const dias = new Set(estaSemana.map((s) => s.fecha)).size;
  const c = G.constancia(hechas.map((s) => s.fecha), fecha);
  const vol = G.volumen(seriesHechas().filter((s) => s.fecha >= lunes && s.fecha <= domingo).map((s) => ({ ejercicioId: s.ejercicioId })));
  const objetivo = G.volumenPlantilla(ajuste('plantilla'));

  // Titular: los días y, si es tarde en la semana, lo que va más corto (en lenguaje llano; sin juicios).
  const NUM = ['Ningún día', 'Un día', 'Dos días', 'Tres días', 'Cuatro días', 'Cinco días', 'Seis días', 'Siete días'];
  let corto = null, peor = 0;
  for (const m of G.IDS_MUSCULOS) {
    const d = objetivo[m] > 0 ? 1 - vol[m] / objetivo[m] : 0;
    if (d > peor) { peor = d; corto = m; }
  }
  const tarde = G.diaSemana(fecha) >= 3;
  const linea2 = dias === 0 ? 'Aún puede sumar. Nada roto.' : tarde && corto && peor >= 0.5 ? `${SUJETO[corto]} por detrás.` : 'Va sumando.';
  const titular = `${NUM[dias] ?? `${dias} días`} esta semana.`;

  // Recordatorio de copia: los domingos, o si la última tiene más de 7 días (06-tecnica.md, punto 4).
  const ultima = ajuste('ultimaCopia');
  const diasCopia = ultima ? G.diasEntre(ultima.slice(0, 10), fecha) : Infinity;
  const recordar = ajuste('recordatorio') && hechas.length > 0 && ((G.diaSemana(fecha) === 6 && diasCopia > 0) || diasCopia > 7);

  const max = Math.max(1, ...c.semanas.map((x) => x.dias));
  const constancia = c.semanas.map((w, k) => {
    const actual = k === c.semanas.length - 1;
    const g = w.dias ? Array.from({ length: w.dias }, () => '<span class="g"></span>').join('') : '<span class="vacio"></span>';
    return `<div class="col${actual ? ' actual' : ''}" title="Semana del ${diaMes(w.lunes)}">${g}</div>`;
  }).join('');

  const barras = G.MUSCULOS.map(([m, nombre]) => {
    const v = vol[m], o = objetivo[m];
    const bajo = G.diaSemana(fecha) === 6 && v < G.MINIMO_EFICAZ;
    return `<li><span>${esc(nombre)}</span>
      <div class="barra" aria-hidden="true"><span class="franja" style="left:${G.FRANJA.min / ESCALA * 100}%;width:${(G.FRANJA.max - G.FRANJA.min) / ESCALA * 100}%"></span>
      <span class="valor${bajo ? ' bajo' : ''}" style="width:${Math.min(100, v / ESCALA * 100)}%"></span>
      ${o > 0 ? `<span class="objetivo" style="left:calc(${Math.min(100, o / ESCALA * 100)}% - 1px)"></span>` : ''}</div>
      <span class="cifra-barra">${num(v)}</span></li>`;
  }).join('');
  const tablaAccesible = G.MUSCULOS.map(([m, n]) => `${n}: ${num(vol[m])} de ${num(objetivo[m])}`).join('; ');

  const filasSesiones = estaSemana.slice().reverse().map((s) => {
    const r = resumen(s);
    return `<li><button type="button" data-ses="${s.id}"><span class="dia">${cap(G.NOMBRE_DIA[G.diaSemana(s.fecha)].slice(0, 3))} ${Number(s.fecha.slice(8))}</span><span class="que">${esc(s.nombre)}</span><span class="cuanto">${r.series} series · ${r.minutos} min</span></button></li>`;
  }).join('');

  const nodo = el(`<section aria-labelledby="titulo-semana">
    <div class="semana-encabezado">
      <p class="etiqueta">Del ${Number(lunes.slice(8))}${lunes.slice(5, 7) === domingo.slice(5, 7) ? '' : ` de ${MESES[Number(lunes.slice(5, 7)) - 1]}`} al ${diaMes(domingo)}</p>
      <h1 class="titular grande" id="titulo-semana">${esc(titular)}<br>${esc(linea2)}</h1>
    </div>
    ${sierra()}
    ${recordar ? `<div class="recordatorio"><span>¿Guardamos copia de la semana?</span><button class="chip" type="button" data-copia>Guardar</button></div>` : ''}
    <div class="fila-titulo"><h2>Constancia</h2><span class="etiqueta">un grano por día entrenado</span></div>
    <div class="constancia" role="img" aria-label="Días entrenados en las últimas 8 semanas: ${c.semanas.map((w) => w.dias).join(', ')}">${constancia}</div>
    <div class="constancia-pie" aria-hidden="true">${c.semanas.map((w) => `<span>${w.dias}</span>`).join('')}</div>
    <p class="etiqueta" style="margin-top:8px">${c.conEntreno} de ${c.total} semanas con entreno. Faltar una no borra nada.</p>
    ${sierra()}
    <div class="fila-titulo"><h2>Series por músculo</h2><span class="etiqueta">franja de 10 a 20</span></div>
    <ul class="barras" role="img" aria-label="Series por músculo esta semana: ${tablaAccesible}">${barras}</ul>
    <div class="leyenda"><span><i style="width:16px;height:8px;background:var(--harina-2)"></i>franja útil (R9)</span><span><i style="width:2px;height:12px;background:var(--tierra)"></i>lo que pide tu rutina</span><span>Cuenta fraccional: 1 serie directa, 0,5 si ayuda</span></div>
    ${sierra()}
    <div class="fila-titulo"><h2>Entrenos de la semana</h2></div>
    ${filasSesiones ? `<ul class="lista-sesiones">${filasSesiones}</ul>` : '<p class="texto-2" style="font-size:15px">Todavía ninguno. Cuando quieras, en «Hoy» está lo que toca.</p>'}
    ${sierra()}
    <div class="fila-titulo"><h2>Peso, comida y pasos</h2></div>
    <p class="hueco">Llegan en la v0.3 (peso y comida) y la v0.4 (pasos). Hasta entonces aquí no hay números: Gofio no se inventa datos.</p>
  </section>`);

  nodo.querySelector('[data-copia]')?.addEventListener('click', async () => { await exportarCopia(); nav.refrescar(); });
  nodo.querySelectorAll('[data-ses]').forEach((b) => b.addEventListener('click', () => detalle(b.dataset.ses, nav)));

  return {
    nodo, clara: true, pestana: 'semana',
    alEntrar({ refresco } = {}) {
      if (refresco || reduceMovimiento()) return;
      nodo.querySelectorAll('.barra .valor').forEach((b, k) => b.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 520, delay: 60 + k * 30, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' }));
      nodo.querySelectorAll('.constancia .g').forEach((g, k) => g.animate([{ transform: 'translateY(-10px) scale(.4)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 360, delay: 40 + k * 22, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' }));
    },
  };
}

function detalle(id, nav) {
  const s = estado.sesiones.find((x) => x.id === id);
  const ss = seriesDe(id);
  const porEj = [...new Set(ss.map((x) => x.ejercicioId))].map((ej) => {
    const xs = ss.filter((x) => x.ejercicioId === ej);
    return `<li style="padding:10px 0;border-bottom:1px solid var(--harina-2)"><b>${esc(G.ejercicio(ej).nombre)}</b> ${granos(xs.length, xs.length)}
      <span class="sub num" style="display:block">${xs.map((x) => `${kg(x.peso)} × ${x.reps} (RIR ${x.rir === 4 ? '4+' : x.rir})`).join(' · ')}</span></li>`;
  }).join('');
  const r = resumen(s);
  const { nodo } = hoja(`<h2>${esc(s.nombre)}</h2><p class="sub">${r.series} series · ${r.minutos} min</p><ul class="opciones">${porEj}</ul>
    <div class="botones"><button class="boton plano" type="button" data-ver>Ver el resumen</button></div>`, { clara: true });
  nodo.querySelector('[data-ver]').onclick = () => { document.querySelector('.hoja-fondo')?.click(); nav.ir('hecho', { sesionId: id, soloVer: true }); };
}

const cap = (t) => t[0].toUpperCase() + t.slice(1);
export { ponerAjuste };
