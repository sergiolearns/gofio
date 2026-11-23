// Piezas de la comida (tableros 20 y 21): la pella, los granos de la proteína, la chispa y la gráfica del peso.
import { grano, reduceMovimiento } from '../ui.js';
import * as S from '../sonidos.js';

let n = 0;
// La pella: gofio amasado, una bola irregular que se llena de millo tostado con lo que comes.
const PELLA = 'M66 6C98 4 126 24 128 60C130 96 104 120 66 120C30 121 4 100 4 64C3 30 30 8 66 6Z';
const nivel = (frac) => 124 - 118 * Math.min(1, Math.max(0, frac));
export function pella(frac, num, sub) {
  const id = 'p' + (++n).toString(36);
  const y = nivel(frac);
  return `<div class="c-bola" role="img" aria-label="${num} ${sub}" data-frac="${frac}"><svg viewBox="-8 -4 148 150" width="132" height="134" aria-hidden="true">
    <defs><clipPath id="${id}c"><path d="${PELLA}"/></clipPath>
    <radialGradient id="${id}v" cx=".35" cy=".28" r=".85"><stop offset="0" stop-color="#FFF6E2" stop-opacity=".7"/><stop offset=".45" stop-color="#FFF6E2" stop-opacity="0"/><stop offset="1" stop-color="#5A3A14" stop-opacity=".45"/></radialGradient>
    <linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C44D35"/><stop offset="1" stop-color="#93321F"/></linearGradient></defs>
    <ellipse cx="66" cy="141" rx="64" ry="5" fill="#000" opacity=".18"/>
    <path d="M2 124A64 9 0 0 1 130 124Q126 138 66 139Q6 138 2 124Z" fill="url(#${id}b)"/>
    <ellipse cx="66" cy="124" rx="64" ry="9" fill="#7E2A1A"/><ellipse cx="66" cy="124" rx="56" ry="6" fill="#4E1A11"/>
    <g class="c-masa" style="transform-origin:66px 124px;transform-box:view-box"><g transform="translate(66 124) scale(.9 .88) translate(-66 -122)">
    <path d="${PELLA}" fill="#E6D2A8"/>
    <g clip-path="url(#${id}c)"><path class="c-fill" style="transform:translateY(${y - 124}px)" d="M-10 124Q33 117 66 124T142 124V270H-10Z" fill="#D4922B"/></g>
    <path d="${PELLA}" fill="url(#${id}v)"/>
    <g fill="#9A7440" opacity=".5"><circle cx="40" cy="38" r="2"/><circle cx="92" cy="30" r="1.6"/><circle cx="104" cy="70" r="2"/><circle cx="30" cy="84" r="1.6"/></g></g></g>
    <g class="c-caen" fill="#D4922B"></g>
  </svg><div class="c-num"><b>${num}</b><small>${sub}</small></div></div>`;
}
/** La pella se amasa: se aplasta un pelín y vuelve, el millo sube con una ola y caen unos granos (650 ms). */
export function amasar(bola, deFrac, aFrac) {
  if (!bola) return;
  const fill = bola.querySelector('.c-fill');
  const y0 = nivel(deFrac) - 124, y1 = nivel(aFrac) - 124;
  S.suena('masa');
  if (reduceMovimiento()) { fill.style.transform = `translateY(${y1}px)`; return; }
  bola.querySelector('.c-masa').animate([{ transform: 'scale(1,1)' }, { transform: 'scale(1.05,.92)', offset: 0.3 }, { transform: 'scale(.98,1.03)', offset: 0.65 }, { transform: 'scale(1,1)' }], { duration: 650, easing: 'ease-out' });
  fill.animate([{ transform: `translateY(${y0}px)` }, { transform: `translateY(${y1}px)` }], { duration: 650, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' })
    .finished.then(() => { fill.style.transform = `translateY(${y1}px)`; }).catch(() => {});
  const caen = bola.querySelector('.c-caen');
  for (let k = 0; k < 5; k++) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    const x = 40 + Math.random() * 52;
    g.setAttribute('cx', x); g.setAttribute('cy', 0); g.setAttribute('rx', 2.6); g.setAttribute('ry', 3.6);
    caen.append(g);
    g.animate([{ transform: 'translateY(-10px)', opacity: 0 }, { transform: 'translateY(10px)', opacity: 1, offset: 0.2 }, { transform: `translateY(${30 + Math.random() * 14}px)`, opacity: 1, offset: 0.8 }, { transform: `translateY(${34 + Math.random() * 14}px)`, opacity: 0 }],
      { duration: 620, delay: 60 + k * 50, easing: 'ease-in', fill: 'backwards' }).finished.then(() => g.remove()).catch(() => g.remove());
  }
}

/** La proteína en 10 granos: cada décima parte del objetivo es un grano. */
export const granos10 = (frac) => `<div class="c-granos" aria-hidden="true">${Array.from({ length: 10 }, (_, k) => grano(k < Math.min(10, Math.floor(frac * 10 + 1e-9)))).join('')}</div>`;
/** Los granos nuevos caen a su hueco y rebotan; al llegar al objetivo, los diez saltan a la vez. */
export function caerGranos(cont, deFrac, aFrac) {
  if (!cont) return;
  const de = Math.min(10, Math.floor(deFrac * 10 + 1e-9)), a = Math.min(10, Math.floor(aFrac * 10 + 1e-9));
  const gs = [...cont.querySelectorAll('.grano')];
  if (a <= de) return;
  gs.forEach((g, k) => { if (k >= de && k < a) g.outerHTML = grano(true); });
  const nuevos = [...cont.querySelectorAll('.grano')].slice(de, a);
  if (reduceMovimiento()) return;
  nuevos.forEach((g, k) => {
    g.animate([{ transform: 'translateY(-26px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1, offset: 0.6 }, { transform: 'translateY(-5px)', offset: 0.8 }, { transform: 'translateY(0)' }], { duration: 420, delay: 250 + k * 120, easing: 'ease-in', fill: 'backwards' });
    S.suena('granoProt', (250 + k * 120 + 250) / 1000);
  });
  if (a === 10 && de < 10) {
    const t = 250 + nuevos.length * 120 + 300;
    [...cont.querySelectorAll('.grano')].forEach((g) => g.animate([{ transform: 'none' }, { transform: 'translateY(-9px)' }, { transform: 'none' }], { duration: 380, delay: t, easing: 'cubic-bezier(.34,1.56,.64,1)' }));
  }
}

/** La chispa: 21 días de pesajes (puntos) y la tendencia (línea millo). */
export function chispa(puntos, w = 170, h = 56) {
  if (puntos.length < 2) return `<svg class="c-chispa" viewBox="0 0 ${w} ${h}" aria-hidden="true"></svg>`;
  const xs = puntos.map((_, i) => 6 + i * (w - 12) / (puntos.length - 1));
  const vals = puntos.flatMap((p) => [p.kg, p.tendencia]);
  const mn = Math.min(...vals) - 0.3, mx = Math.max(...vals) + 0.3;
  const Y = (v) => h - 4 - (v - mn) / (mx - mn) * (h - 8);
  return `<svg class="c-chispa" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
    ${puntos.map((p, i) => `<circle cx="${xs[i]}" cy="${Y(p.kg)}" r="2.4" fill="#BBA987"/>`).join('')}
    <polyline fill="none" stroke="#D4922B" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${puntos.map((p, i) => `${xs[i]},${Y(p.tendencia)}`).join(' ')}"/>
    <circle cx="${xs.at(-1)}" cy="${Y(puntos.at(-1).tendencia)}" r="4.5" fill="#1B1917"/></svg>`;
}

/** La gráfica de Tu peso: puntos, tendencia y la franja de la recomposición (R6) desde la tendencia de hace 21 días. */
export function graficaPeso(puntos, { franja = null, w = 360, h = 190 } = {}) {
  if (!puntos.length) return '';
  const xs = puntos.map((_, i) => 14 + (puntos.length === 1 ? (w - 28) / 2 : i * (w - 28) / (puntos.length - 1)));
  const vals = puntos.flatMap((p) => [p.kg, p.tendencia]);
  if (franja) vals.push(franja.de, franja.a);
  const mn = Math.min(...vals) - 0.3, mx = Math.max(...vals) + 0.3;
  const Y = (v) => h - 10 - (v - mn) / (mx - mn) * (h - 20);
  const banda = franja ? `<path d="M14 ${Y(franja.inicio)} L${w - 14} ${Y(franja.a)} L${w - 14} ${Y(franja.de)} Z" fill="#F1E6D2"/>` : '';
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" aria-hidden="true">${banda}
    ${puntos.map((p, i) => `<circle cx="${xs[i]}" cy="${Y(p.kg)}" r="3.4" fill="#BBA987"/>`).join('')}
    <polyline class="c-linea-peso" fill="none" stroke="#D4922B" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="${puntos.map((p, i) => `${xs[i]},${Y(p.tendencia)}`).join(' ')}"/>
    <circle class="c-punto-peso" cx="${xs.at(-1)}" cy="${Y(puntos.at(-1).tendencia)}" r="6" fill="#1B1917"/></svg>`;
}
