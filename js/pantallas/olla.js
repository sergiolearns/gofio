// La olla (G8, R31; tablero 20, F): una receta de casa. Lo que echaste en crudo con su peso; la olla ya hecha, pesada
// («la pesé») o repartida («da para N raciones»); y tus medidas (un cucharón, un plato), pesadas una vez.
// Al guardarla, la olla al fuego del tablero 21 (en 3/4 y de barro, como el tostador).
import * as G from '../cerebro/index.js';
import { el, esc, num, icono, avisar, vibrar, confirmar, pedirNumero, hoja, reduceMovimiento } from '../ui.js';
import * as S from '../sonidos.js';
import * as C from '../comida/cocina.js';
import { esmayado } from './comida.js';
import { ollaAlFuego } from '../comida/fuego.js';

const miles = (x) => String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const numero = (s) => { let t = String(s).trim(); t = /^\d{1,3}(\.\d{3})+$/.test(t) ? t.replace(/\./g, '') : t.replace(',', '.'); const v = parseFloat(t); return Number.isFinite(v) ? v : null; };

export function ollaPantalla(params = {}, nav) {
  const vieja = params.id ? C.misCosas().find((x) => x.id === params.id)?.olla : null;
  const o = vieja ? structuredClone(vieja) : { nombre: '', ingredientes: [], pesoCocinado: null, raciones: null, medidas: [], modo: 'pesada' };
  o.modo ??= o.pesoCocinado ? 'pesada' : o.raciones ? 'raciones' : 'pesada';
  const nodo = el('<section class="comida col"></section>');

  function pintar() {
    const r = G.olla({ ingredientes: o.ingredientes, pesoCocinado: o.modo === 'pesada' ? o.pesoCocinado : null, raciones: o.modo === 'raciones' ? o.raciones : null });
    const sn = C.sinNumeros();
    let cien = '';
    if (o.ingredientes.length) {
      if (r.por100) {
        const plato = (o.medidas ?? [])[0];
        cien = `<div class="c-cien">${sn ? '' : `<span><b>${Math.round(r.por100.kcal)}</b>kcal/100 g</span>`}<span><b>${num(r.por100.prot, 0)} g</b>proteína/100 g</span>${plato ? `<span><b>${Math.floor(o.pesoCocinado / plato.g)}</b>de «${esc(plato.nombre.toLowerCase())}»</span>` : ''}</div>`;
      } else if (r.porRacion) cien = `<div class="c-cien">${sn ? '' : `<span><b>${Math.round(r.porRacion.kcal)}</b>kcal/ración</span>`}<span><b>${num(r.porRacion.prot, 0)} g</b>proteína/ración</span></div>`;
      else cien = `<p class="c-nota">Pon ${o.modo === 'pesada' ? 'cuánto pesa lo cocinado' : 'cuántas raciones salen'} y Gofio hace la cuenta.</p>`;
    }
    nodo.innerHTML = `<button class="c-volver" type="button" data-volver>${icono('atras')}Comida</button>
      <p class="c-fecha" style="margin-top:4px">${vieja ? 'Tu olla' : 'Nueva olla'}</p>
      <input class="c-nombre" data-nombre placeholder="Sudado de pollo" value="${esc(o.nombre)}" aria-label="Nombre de la olla" autocomplete="off">
      <p class="c-h3" style="color:var(--tierra)">Lo que echaste, en crudo</p>
      ${o.ingredientes.map((i, k) => `<div class="c-ing"><span>${esc(i.nombre)}<small>${esc(C.FUENTE[i.fuente] ?? '')}${sn ? '' : ` · ${miles(i.por100.kcal * i.g / 100)} kcal`} · <button type="button" class="enlace" data-quitar="${k}" style="font-size:12px;color:var(--almagre)">Quitar</button></small></span><input class="c-gr" data-g="${k}" inputmode="decimal" value="${miles(i.g)}" aria-label="Gramos de ${esc(i.nombre)}"></div>`).join('')}
      <button class="c-anadir" type="button" data-anadir>${icono('mas')}Añadir ingrediente</button>
      <div class="c-olla"><span class="c-et">La olla, ya hecha</span>
        <div class="c-seg" role="radiogroup"><button type="button" data-modo="pesada" aria-pressed="${o.modo === 'pesada'}">La pesé</button><button type="button" data-modo="raciones" aria-pressed="${o.modo === 'raciones'}">Da para raciones</button></div>
        ${o.modo === 'pesada' ? `<div class="c-ing"><span>Peso de lo cocinado<small>olla llena − olla vacía, en gramos</small></span><input class="c-gr" data-cocinado inputmode="decimal" value="${o.pesoCocinado ? miles(o.pesoCocinado) : ''}" placeholder="—" aria-label="Peso de lo cocinado"></div>`
          : `<div class="c-ing"><span>Raciones<small>cuántos platos salen</small></span><input class="c-gr" data-raciones inputmode="decimal" value="${o.raciones ?? ''}" placeholder="—" aria-label="Raciones"></div>`}
        <div data-cien>${cien}</div></div>
      ${o.modo === 'pesada' ? `<p class="c-h3" style="color:var(--tierra)">Tus medidas</p>
      ${(o.medidas ?? []).map((m, k) => `<div class="c-ing"><span>${esc(m.nombre)}<small>pesado una vez · <button type="button" class="enlace" data-quitar-m="${k}" style="font-size:12px;color:var(--almagre)">Quitar</button></small></span><input class="c-gr" data-m="${k}" inputmode="decimal" value="${miles(m.g)}" aria-label="Gramos de ${esc(m.nombre)}"></div>`).join('')}
      <button class="c-anadir" type="button" data-medida>${icono('mas')}Medir ${o.medidas?.length ? 'otra' : 'una'} (un cucharón, un plato, un tupper…)</button>` : ''}
      ${vieja ? '<button class="c-anadir" type="button" data-borrar style="color:var(--tierra)">Borrar esta olla</button>' : ''}
      <div class="c-pie sin-pestanas"><button class="boton" type="button" data-guardar data-son="none">Guardar la olla</button></div>`;
    conectar();
  }
  const leer = () => {
    o.nombre = nodo.querySelector('[data-nombre]').value.trim();
    nodo.querySelectorAll('[data-g]').forEach((i) => { const v = numero(i.value); if (v != null) o.ingredientes[i.dataset.g].g = v; });
    nodo.querySelectorAll('[data-m]').forEach((i) => { const v = numero(i.value); if (v != null) o.medidas[i.dataset.m].g = v; });
    const c = nodo.querySelector('[data-cocinado]'); if (c) o.pesoCocinado = numero(c.value);
    const rr = nodo.querySelector('[data-raciones]'); if (rr) o.raciones = numero(rr.value);
  };
  function conectar() {
    nodo.querySelector('[data-volver]').addEventListener('click', () => nav.volver());
    nodo.querySelectorAll('input').forEach((i) => i.addEventListener('change', () => { leer(); if (i.matches('[data-g],[data-cocinado],[data-raciones],[data-m]')) pintarCien(); }));
    nodo.querySelector('[data-anadir]').addEventListener('click', () => {
      leer();
      esmayado({ modo: 'ingrediente', nav, alElegir: async (a) => {
        const g = await pedirNumero({ titulo: a.nombre, sub: 'Gramos, en crudo.', unidad: 'g', decimal: false });
        if (!(g > 0)) return;
        o.ingredientes.push({ ref: a.id, nombre: a.nombre, fuente: a.fuente, g, por100: { ...a.por100 } });
        vibrar(); pintar();
      } });
    });
    nodo.querySelectorAll('[data-quitar]').forEach((b) => b.addEventListener('click', () => { leer(); o.ingredientes.splice(Number(b.dataset.quitar), 1); pintar(); }));
    nodo.querySelectorAll('[data-quitar-m]').forEach((b) => b.addEventListener('click', () => { leer(); o.medidas.splice(Number(b.dataset.quitarM), 1); pintar(); }));
    nodo.querySelectorAll('[data-modo]').forEach((b) => b.addEventListener('click', () => { leer(); o.modo = b.dataset.modo; vibrar(); pintar(); }));
    nodo.querySelector('[data-medida]')?.addEventListener('click', () => { leer(); nuevaMedida((m) => { (o.medidas ??= []).push(m); pintar(); }); });
    nodo.querySelector('[data-borrar]')?.addEventListener('click', async () => {
      if (!(await confirmar({ titulo: '¿Borrar esta olla?', texto: 'Lo que ya apuntaste se queda como estaba.', si: 'Borrar', peligro: true }))) return;
      await C.borrarOlla(vieja.id); nav.volver();
    });
    nodo.querySelector('[data-guardar]').addEventListener('click', guardar);
  }
  function pintarCien() { const n = nodo.querySelector('[data-cien]'); const y = nodo.scrollTop; pintar(); nodo.scrollTop = y; return n; }
  async function guardar() {
    leer();
    if (!o.nombre) { avisar('Ponle nombre a la olla.'); nodo.querySelector('[data-nombre]').focus(); return; }
    if (!o.ingredientes.length) { avisar('Añade lo que echaste.'); return; }
    if (o.modo === 'pesada' && !(o.pesoCocinado > 0)) { avisar('Falta cuánto pesa lo cocinado.'); return; }
    if (o.modo === 'raciones' && !(o.raciones > 0)) { avisar('Falta cuántas raciones salen.'); return; }
    const x = { ...o, pesoCocinado: o.modo === 'pesada' ? o.pesoCocinado : null, raciones: o.modo === 'raciones' ? o.raciones : null };
    if (x.modo === 'raciones') x.medidas = [];
    await C.guardarOlla(x);
    await ollaAlFuego(x.nombre, x.ingredientes.length);
    nav.volver();
  }
  pintar();
  return { nodo, clara: true };
}

function nuevaMedida(alGuardar) {
  const { nodo, cerrar } = hoja(`<h2>Una medida tuya</h2><p class="sub">Pésala una vez llena (sin el cacharro) y ya está.</p>
    <label class="c-campo"><span>Nombre</span><input class="c-texto" data-n placeholder="Un cucharón" autocomplete="off"></label>
    <label class="c-campo"><span>Gramos</span><span class="c-v"><input class="c-v" data-g inputmode="decimal" placeholder="—"><small>g</small></span></label>
    <div class="botones"><button class="boton" type="button" data-ok>Guardar medida</button></div>`, { clara: true });
  nodo.querySelector('[data-ok]').addEventListener('click', () => {
    const n = nodo.querySelector('[data-n]').value.trim(); const g = numero(nodo.querySelector('[data-g]').value);
    if (!n || !(g > 0)) { avisar('Falta el nombre o los gramos.'); return; }
    cerrar(); alGuardar({ nombre: n, g });
  });
}
