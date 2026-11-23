// Cambiar el orden de una lista arrastrando (G124-G125): manteniendo pulsada cualquier fila (o al momento desde la
// agarradera de tres granos), la fila sube, sigue al dedo y las demás se apartan; al soltar, se guarda el orden.
// Convive con deslizar a los lados (G100): si el dedo se mueve antes de la espera, es desplazar o deslizar, no arrastrar.
import { vibrar, reduceMovimiento } from './ui.js';
import * as S from './sonidos.js';

const ESPERA = 320; // ms manteniendo pulsado (⚪ diseño de Gofio: lo que tarda iOS en sus listas)

/**
 * @param {HTMLElement} lista  el <ul>; sus hijos directos son las filas
 * @param {{alSoltar:(filas:HTMLElement[])=>void, puede?:(li:HTMLElement)=>boolean}} o
 */
export function reordenable(lista, { alSoltar, puede = () => true }) {
  let d = null, ini = null, t = 0;
  const filas = () => [...lista.children].filter((x) => x.tagName === 'LI');
  const hueco = () => parseFloat(getComputedStyle(lista).rowGap) || 0;

  function empezar(li, y) {
    const fs = filas();
    d = { li, y0: y, fs, desde: fs.indexOf(li), a: fs.indexOf(li), paso: li.offsetHeight + hueco() };
    li.dataset.reordenando = '1'; li.dataset.arrastre = '1';
    li.classList.add('arrastrada');
    vibrar(); S.toque('pop');
    if (!reduceMovimiento()) li.style.transform = 'scale(1.03)';
  }
  function mover(y) {
    const dy = y - d.y0;
    d.li.style.transform = `translateY(${dy}px) scale(1.03)`;
    const a = Math.max(0, Math.min(d.fs.length - 1, d.desde + Math.round(dy / d.paso)));
    if (a !== d.a) { d.a = a; S.toque(0); vibrar(); }
    d.fs.forEach((x, j) => {
      if (x === d.li) return;
      const m = d.desde < a ? (j > d.desde && j <= a ? -d.paso : 0) : (j < d.desde && j >= a ? d.paso : 0);
      x.style.transform = m ? `translateY(${m}px)` : '';
    });
  }
  function soltar() {
    const { li, fs, desde, a } = d; d = null;
    li.classList.remove('arrastrada');
    fs.forEach((x) => { x.style.transform = ''; });
    delete li.dataset.reordenando;
    setTimeout(() => { delete li.dataset.arrastre; }, 80);   // el clic que llega al soltar no abre nada
    if (a === desde) return;
    const nueva = [...fs]; nueva.splice(desde, 1); nueva.splice(a, 0, li);
    nueva.forEach((x) => lista.append(x));
    if (!reduceMovimiento()) li.animate([{ transform: 'scale(1.04)' }, { transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    S.toque('piedra'); vibrar();
    alSoltar(nueva);
  }
  const fila = (e) => { const li = e.target.closest('li'); return li && li.parentElement === lista && puede(li) ? li : null; };
  const cancelar = () => { clearTimeout(t); ini = null; };

  if ('ontouchstart' in window) {
    lista.addEventListener('touchstart', (e) => {
      const li = fila(e); if (!li || e.touches.length !== 1) return;
      const { clientX: x, clientY: y } = e.touches[0];
      if (e.target.closest('[data-agarre]')) { empezar(li, y); return; }
      ini = { li, x, y };
      t = setTimeout(() => { if (ini) { empezar(ini.li, ini.y); ini = null; } }, ESPERA);
    }, { passive: true });
    lista.addEventListener('touchmove', (e) => {
      const p = e.touches[0];
      if (d) { if (e.cancelable) e.preventDefault(); mover(p.clientY); return; }
      if (ini && (Math.abs(p.clientX - ini.x) > 8 || Math.abs(p.clientY - ini.y) > 8)) cancelar();
    }, { passive: false });
    lista.addEventListener('touchend', () => { cancelar(); if (d) soltar(); });
    lista.addEventListener('touchcancel', () => { cancelar(); if (d) soltar(); });
    lista.addEventListener('contextmenu', (e) => { if (d || ini) e.preventDefault(); });
  } else {
    let id = null;
    lista.addEventListener('pointerdown', (e) => {
      const li = fila(e); if (!li || e.button !== 0) return;
      id = e.pointerId;
      if (e.target.closest('[data-agarre]')) { e.preventDefault(); try { li.setPointerCapture(id); } catch { /* */ } empezar(li, e.clientY); return; }
      ini = { li, x: e.clientX, y: e.clientY };
      t = setTimeout(() => { if (ini) { try { ini.li.setPointerCapture(id); } catch { /* */ } empezar(ini.li, ini.y); ini = null; } }, ESPERA);
    });
    lista.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      if (d) { e.preventDefault(); mover(e.clientY); return; }
      if (ini && (Math.abs(e.clientX - ini.x) > 8 || Math.abs(e.clientY - ini.y) > 8)) cancelar();
    });
    const fin = (e) => { if (e.pointerId !== id) return; cancelar(); if (d) soltar(); id = null; };
    lista.addEventListener('pointerup', fin);
    lista.addEventListener('pointercancel', fin);
  }
}
