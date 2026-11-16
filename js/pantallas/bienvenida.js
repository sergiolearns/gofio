// Bienvenida y primer arranque · «Ábreme desde el icono» · los huecos honestos de la v0.2 y la v0.3.
import * as G from '../cerebro/index.js';
import { ajuste, ponerAjuste } from '../logica.js';
import { pedirPersistencia } from '../datos.js';
import { el, esc, icono, vibrar } from '../ui.js';
import { formularioCargas, guardarCargas, importarCopia } from './ajustes.js';

export function bienvenidaPantalla({ paso = 0 } = {}, nav) {
  const plantilla = ajuste('plantilla');
  const perfil = ajuste('perfil');
  let cuerpo = '';
  if (paso === 0) {
    cuerpo = `<div class="bienvenida-disco arranca" aria-hidden="true"><img src="iconos/disco-millo.svg" alt="" width="660" height="660"></div>
      <div class="relleno"></div>
      <img class="bienvenida-logo" src="iconos/gofio-logo-oscuro.svg" alt="Gofio" width="220" height="90">
      <p class="titular bienvenida-lema">Entrena y come con cabeza.<br>Cada número, con su porqué.</p>
      <button class="boton" type="button" data-sig style="margin-top:28px">Empezar</button>
      <p class="legal">Sin cuenta ni contraseña. Tus datos se quedan en este móvil.<br><button class="enlace" type="button" data-importar style="font-size:13px;padding:6px 0">Tengo una copia</button></p>`;
  } else if (paso === 1) {
    cuerpo = `<div class="paso-bienvenida" style="display:flex;flex-direction:column;flex:1">
      <p class="etiqueta" style="margin-top:12px">1 de 3</p>
      <h1 class="titular grande" style="margin-top:6px">Tu rutina ya está dentro.</h1>
      <p style="margin-top:12px;font-size:16px;color:var(--piedra)">Es la semana ideal. Gofio la adapta a los días que vayas de verdad: si una semana vas dos, te arma esos dos lo mejor posible.</p>
      <ol class="lista-dias">${plantilla.dias.map((d, i) => `<li><span class="n cifra">${i + 1}</span><span class="d"><b>${esc(d.nombre)}</b><span>${d.ejercicios.map((e) => esc(G.ejercicio(e.ej).nombre)).join(' · ')}</span></span></li>`).join('')}</ol>
      <div class="relleno" style="min-height:20px"></div>
      <button class="boton" type="button" data-sig>Seguir</button></div>`;
  } else if (paso === 2) {
    cuerpo = `<div class="paso-bienvenida" style="display:flex;flex-direction:column;flex:1">
      <p class="etiqueta" style="margin-top:12px">2 de 3 · opcional</p>
      <h1 class="titular grande" style="margin-top:6px">Tus datos.</h1>
      <p style="margin-top:12px;font-size:16px;color:var(--piedra)">Para la comida y el peso (v0.3). Se quedan en el móvil; puedes dejarlos vacíos.</p>
      <div class="tarjeta" style="margin-top:16px">
        <label class="fila"><span class="que">Peso<small>kg</small></span><input class="campo" data-perfil="peso" inputmode="decimal" value="${perfil.peso ?? ''}"></label>
        <label class="fila"><span class="que">Altura<small>cm</small></span><input class="campo" data-perfil="altura" inputmode="numeric" value="${perfil.altura ?? ''}"></label>
        <label class="fila"><span class="que">Edad</span><input class="campo" data-perfil="edad" inputmode="numeric" value="${perfil.edad ?? ''}"></label>
      </div>
      <div class="relleno" style="min-height:20px"></div>
      <button class="boton" type="button" data-sig>Seguir</button></div>`;
  } else {
    cuerpo = `<div class="paso-bienvenida" style="display:flex;flex-direction:column;flex:1">
      <p class="etiqueta" style="margin-top:12px">3 de 3 · opcional</p>
      <h1 class="titular grande" style="margin-top:6px">Cargas de partida.</h1>
      <p style="margin-top:12px;font-size:16px;color:var(--piedra)">Pon solo las que sepas. Lo demás te lo pido en la primera serie.</p>
      <div class="tarjeta" style="margin-top:8px">${formularioCargas()}</div>
      <div style="height:20px"></div>
      <button class="boton" type="button" data-sig>A moler</button></div>`;
  }
  const nodo = el(`<section class="bienvenida">${cuerpo}</section>`);
  if (paso > 0) nodo.style.paddingTop = 'calc(env(safe-area-inset-top, 0px) + 12px)';
  nodo.querySelector('[data-importar]')?.addEventListener('click', () => importarCopia(async () => { await ponerAjuste('inicioHecho', true); nav.ir('hoy', {}, { modo: 'pestana' }); }));
  nodo.querySelector('[data-sig]').onclick = async () => {
    vibrar();
    if (paso === 2) {
      const p = {}; nodo.querySelectorAll('[data-perfil]').forEach((i) => { const v = parseFloat(i.value.replace(',', '.')); if (Number.isFinite(v)) p[i.dataset.perfil] = v; });
      await ponerAjuste('perfil', p);
    }
    if (paso === 3) {
      await guardarCargas(nodo);
      await ponerAjuste('inicioHecho', true);
      pedirPersistencia();
      nav.ir('hoy', {}, { modo: 'pestana' });
      return;
    }
    nav.ir('bienvenida', { paso: paso + 1 }, { modo: 'empuja' });
  };
  return { nodo, pestana: null, sinGesto: paso === 0 };
}

export function instalarPantalla(_, nav) {
  const nodo = el(`<section class="instalar">
    <div class="relleno"></div>
    <img src="iconos/gofio-logo-oscuro.svg" alt="Gofio" width="180" height="74" style="width:180px">
    <h1 class="titular grande" style="margin-top:22px">Ábreme desde el icono.</h1>
    <p style="margin-top:12px;color:var(--piedra)">En Safari Gofio no guarda lo mismo que en la app instalada. Para tenerla como una app, sin conexión y con tus datos:</p>
    <ol>
      <li>Toca ${icono('compartir')} <b>Compartir</b> abajo en Safari.</li>
      <li>Elige <b>Añadir a pantalla de inicio</b>.</li>
      <li>Abre Gofio desde su icono: el disco negro sobre millo.</li>
    </ol>
    <div class="relleno"></div>
    <button class="enlace" type="button" data-seguir style="color:var(--piedra);font-weight:500">Seguir aquí igualmente (los datos de Safari van aparte)</button>
  </section>`);
  nodo.querySelector('[data-seguir]').onclick = () => {
    sessionStorage.setItem('gofio-seguir-safari', '1');
    nav.ir(ajuste('inicioHecho') ? 'hoy' : 'bienvenida', {}, { modo: 'pestana' });
  };
  return { nodo, pestana: null, sinGesto: true };
}

const proximamente = (version, titulo, texto, pestana) => (_, nav) => ({
  nodo: el(`<section><h1 class="titular grande" style="margin-top:8px">${titulo}</h1>
    <div class="proximamente"><p class="version">Llega en la ${version}</p><p>${texto}</p></div></section>`),
  pestana, clara: pestana === 'comida',
});
export const progresoPantalla = proximamente('v0.2', 'Progreso', 'La fuerza estimada de cada ejercicio con su gráfico, los estancamientos y las descargas. Para eso hacen falta unas semanas de series: las que guardes ahora ya cuentan.', 'progreso');
export const comidaPantalla = proximamente('v0.3', 'Comida', 'El peso en tendencia, las recetas de casa (la olla se apunta una vez) y el gasto real. Hasta entonces, aquí no hay números inventados.', 'comida');
