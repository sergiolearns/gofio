// «Molienda hecha»: el resumen al terminar, con el disco en almagre estampado como un sello.
import * as G from '../cerebro/index.js';
import { estado, resumen, planDeHoy, hoy, seriesDe } from '../logica.js';
import { el, esc, kg, num, grano, contar, vibrar, reduceMovimiento, escalonar } from '../ui.js';

export function hechoPantalla({ sesionId, soloVer = false }, nav) {
  const s = estado.sesiones.find((x) => x.id === sesionId);
  const r = resumen(s);
  const fecha = new Date(s.inicio);
  const cuando = fecha.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const ss = seriesDe(s.id);

  let mejor = '';
  if (r.mejor) {
    const m = r.mejor; const nombre = G.ejercicio(m.ej).nombre;
    const sube = m.delta != null && m.delta > 0.05;
    mejor = `${m.marca ? '<p class="fuerte" style="color:var(--almagre)">Marca nueva.</p>' : ''}<p>${esc(nombre)}: ${kg(m.top.peso)} kg × ${m.top.reps}. ${sube
      ? `Fuerza +${num(m.delta)} kg.`
      : 'Igual que la última vez: se asienta.'}</p>`;
  } else {
    mejor = '<p>Primera vez: ya tienes punto de partida.</p>';
  }
  // Lo próximo: lo que propondría el planificador mañana (R15), sin datos inventados.
  let proximo = '';
  try {
    const manana = G.sumarDias(hoy(), 1);
    const plan = planDeHoy(manana, Date.parse(manana + 'T18:00:00'));
    proximo = `${r.duro ? 'Hecho gofio. ' : ''}Mañana, si vienes: ${plan.nombre.toLowerCase()}.`;
  } catch { proximo = r.duro ? 'Hecho gofio.' : ''; }

  const nodo = el(`<section class="hecho" aria-labelledby="titulo-hecho">
    <p class="etiqueta" style="text-transform:none">${esc(cuando[0].toUpperCase() + cuando.slice(1))} · ${esc(s.nombre)}</p>
    <h1 class="titulo-gigante hecho-titulo" id="titulo-hecho">Molienda hecha.</h1>
    <img class="sello" src="iconos/disco-sello-almagre.svg" alt="" width="250" height="250" style="transform:rotate(-90deg)">
    <div class="hecho-cifras">
      <div><span class="cifra" data-n="${r.series}">${r.series}</span><p class="etiqueta">series</p></div>
      <div><span class="cifra" data-n="${r.minutos}">${r.minutos}</span><p class="etiqueta">minutos</p></div>
      <div><span class="cifra" data-n="${r.ejercicios}">${r.ejercicios}</span><p class="etiqueta">ejercicios</p></div>
    </div>
    <div class="hecho-granos" role="img" aria-label="${r.series} series, un grano por serie">${ss.map(() => grano(true)).join('')}</div>
    <p class="etiqueta" style="margin-top:6px">Un grano, una serie.</p>
    <svg class="sierra" width="100%" height="10" aria-hidden="true"><defs><pattern id="ph" width="12" height="10" patternUnits="userSpaceOnUse"><path d="M0 10L6 2L12 10Z" fill="currentColor"/></pattern></defs><rect width="100%" height="10" fill="url(#ph)"/></svg>
    <div class="bloque"><h3>Lo mejor</h3>${mejor}</div>
    ${proximo ? `<div class="bloque"><h3>Lo próximo</h3><p>${esc(proximo)}</p></div>` : ''}
    <div class="relleno" style="min-height:24px"></div>
    <button class="boton oscuro" type="button" data-cerrar>${soloVer ? 'Volver' : 'Listo'}</button>
  </section>`);

  nodo.querySelector('[data-cerrar]').onclick = () => { vibrar(); if (soloVer) nav.volver(); else nav.ir('hoy', {}, { modo: 'pestana' }); };

  return {
    nodo, clara: true, pestana: null, sinGesto: !soloVer,
    alEntrar() {
      const sello = nodo.querySelector('.sello');
      if (!soloVer) { sello.classList.add('estampa'); setTimeout(vibrar, 500); }
      nodo.querySelectorAll('[data-n]').forEach((c) => contar(c, Number(c.dataset.n), soloVer ? 0 : 900));
      escalonar(nodo.querySelectorAll('.bloque'), { desde: soloVer ? 0 : 900, retraso: 120 });
      if (!soloVer && !reduceMovimiento()) {
        nodo.querySelectorAll('.hecho-granos .grano').forEach((g, k) => g.animate(
          [{ transform: 'translateY(-14px) scale(.6)', opacity: 0 }, { transform: 'none', opacity: 1 }],
          { duration: 380, delay: 500 + k * 28, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' }));
      }
    },
  };
}
