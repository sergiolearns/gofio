// Tu peso (tablero 20, J): la gráfica de 21 días (lo que marcó la báscula y tu peso de verdad, R17), el ritmo con su
// margen y, si recompones, la franja de R6. Debajo, los pesajes: se tocan para corregirlos.
import * as G from '../cerebro/index.js';
import { ajuste, hoy } from '../logica.js';
import { el, num, icono, escalonar, reduceMovimiento } from '../ui.js';
import * as S from '../sonidos.js';
import * as C from '../comida/cocina.js';
import { graficaPeso } from '../comida/piezas.js';
import { pesarse, fechaLarga } from './comida.js';

const kgTxt = (x) => num(x, 1);
const sig = (x, d = 2) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${num(Math.abs(x), d)}`;

export function pesoPantalla(_, nav) {
  const nodo = el('<section class="comida col"></section>');
  function pintar(cae = false) {
    const pes = C.pesajes();
    const tend = G.tendencia(pes);
    const ult = tend.filter((x) => x.fecha >= G.sumarDias(hoy(), -20));
    const r = C.ritmoAhora();
    const objetivo = ajuste('objetivo');
    const recomp = objetivo === 'recomposicion' || objetivo === 'fuerza';
    const t = tend.at(-1);
    let tit = 'Tu <em>peso.</em>';
    if (t) {
      const frase = r.kgSemana == null ? 'aprendiendo.' : r.estable ? 'casi plano.' : r.kgSemana > 0 ? 'subiendo.' : 'bajando.';
      tit = `${kgTxt(t.tendencia)} kg y <em>${frase}</em>`;
    }
    // La franja de R6: de −0,25 % a +0,1 % por semana desde la tendencia de hace 21 días.
    let franja = null;
    if (recomp && ult.length > 1) {
      const ini = ult[0].tendencia, sem = G.diasEntre(ult[0].fecha, ult.at(-1).fecha) / 7;
      franja = { inicio: ini, de: ini * (1 - 0.0025 * sem), a: ini * (1 + 0.001 * sem) };
    }
    let ritmo = '';
    if (r.kgSemana != null) {
      const bien = recomp ? G.enFranjaRecomposicion(r.pctSemana) : objetivo === 'perder-grasa' ? r.kgSemana < 0 && r.pctSemana >= -1 : objetivo === 'ganar-musculo' ? r.kgSemana > 0 : true;
      const msj = recomp ? `Para recomponer: casi plano y la fuerza subiendo. ${bien ? '<b>Vas así.</b>' : r.pctSemana < -0.25 ? '<b>Bajas un poco: come algo más.</b>' : '<b>Subes un poco: nada grave, mira la semana.</b>'}`
        : objetivo === 'perder-grasa' ? (r.pctSemana < -1 ? '<b>Bajas más deprisa de lo sano.</b> Gofio te sube la comida.' : bien ? '<b>Bajando a buen ritmo.</b>' : 'Aún no baja: dale una semana más.')
          : objetivo === 'ganar-musculo' ? (bien ? '<b>Subiendo despacio, como toca.</b>' : 'Aún no sube: dale una semana más.') : '';
      ritmo = `<div class="c-olla"><div class="c-cien"><span><b>${sig(r.kgSemana)}</b>kg por semana</span><span><b>${sig(r.kgSemana - r.margen)} a ${sig(r.kgSemana + r.margen)}</b>con margen</span></div>${msj ? `<p class="c-nota" style="margin:8px 0 2px">${msj}</p>` : ''}</div>`;
    } else if (pes.length) {
      ritmo = `<div class="c-olla"><p class="c-nota" style="margin:0"><b>Sin ritmo aún.</b> Con 10 pesajes en 3 semanas, Gofio te dice hacia dónde vas: llevas ${r.n}.</p></div>`;
    }
    const lista = [...pes].reverse().slice(0, 30).map((p) => `<button class="c-item c-pesaje" type="button" data-fecha="${p.fecha}"><span><b>${p.fecha === hoy() ? 'Hoy' : p.fecha === G.sumarDias(hoy(), -1) ? 'Ayer' : fechaLarga(p.fecha)}</b></span><span class="c-der"><b>${kgTxt(p.kg)}</b> kg</span></button>`).join('');
    nodo.innerHTML = `<button class="c-volver" type="button" data-volver>${icono('atras')}Comida</button>
      <p class="c-fecha" style="margin-top:4px">${ult.length ? `Últimas 3 semanas · ${ult.length} ${ult.length === 1 ? 'pesaje' : 'pesajes'}` : 'Cada mañana, en casa'}</p><h1 class="c-tit">${tit}</h1>
      ${ult.length ? `<div class="c-graf">${graficaPeso(ult, { franja })}<p class="c-nota" style="margin:2px 6px 6px">Puntos: lo que marcó la báscula. Línea: tu peso de verdad.${franja ? ' La franja: recomponer.' : ''}</p></div>` : ''}
      ${ritmo}
      <p class="c-h3" style="color:var(--tierra)">Pesajes</p>${lista || '<p class="c-nada" style="color:var(--tierra)">Aún ninguno.</p>'}
      <div class="c-pie sin-pestanas"><button class="boton" type="button" data-pesar data-son="none">${C.pesoDe(hoy()) ? 'Cambiar el de hoy' : 'Apuntar el de hoy'}</button></div>`;
    nodo.querySelector('[data-volver]').addEventListener('click', () => nav.volver());
    nodo.querySelector('[data-pesar]').addEventListener('click', () => pesarse({ alGuardar: () => pintar(true) }));
    nodo.querySelectorAll('[data-fecha]').forEach((b) => b.addEventListener('click', () => pesarse({ fecha: b.dataset.fecha, alGuardar: () => pintar(true) })));
    // El pesaje cae como una piedra: la línea avanza hasta él y el punto negro se posa (900 ms).
    if (cae && !reduceMovimiento()) {
      const linea = nodo.querySelector('.c-linea-peso'), punto = nodo.querySelector('.c-punto-peso');
      linea?.animate([{ opacity: 0.2 }, { opacity: 1 }], { duration: 600, easing: 'ease-out' });
      punto?.animate([{ transform: 'translateY(-40px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1, offset: 0.6 }, { transform: 'translateY(-4px)', offset: 0.8 }, { transform: 'none' }], { duration: 900, easing: 'ease-in' });
      punto && (punto.style.transformBox = 'fill-box');
    }
  }
  pintar();
  return { nodo, clara: true, alEntrar() { escalonar(nodo.children, { desde: 40, retraso: 35 }); } };
}
