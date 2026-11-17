// Piezas de interfaz: iconos dibujados (geometría de pintadera), granos, sierra, hojas, avisos y ajuste de títulos.

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const kg = (x) => (x == null || Number.isNaN(x) ? '—' : (Math.round(x * 100) / 100).toLocaleString('es-ES', { maximumFractionDigits: 2 }));
export const num = (x, d = 1) => (Math.round(x * 10 ** d) / 10 ** d).toLocaleString('es-ES', { maximumFractionDigits: d });
export const mmss = (s) => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
export const reduceMovimiento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Crea un elemento a partir de HTML. */
export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

// Iconos propios de El alma (G86): formas llenas con vaciados, como un sello en barro, en rejilla de 24.
// Los `path` son los del tablero de iconos del lienzo (identidad/alma/lienzo/Iconos.dc.html), copiados tal cual.
const I = {
  hoy: '<path fill-rule="evenodd" d="M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20zM12 9a3 3 0 1 1 0 6a3 3 0 1 1 0-6zM17.4 13.4a1.5 1.5 0 1 1 0 3a1.5 1.5 0 1 1 0-3z"/>',
  semana: '<path fill-rule="evenodd" d="M1 19.5L4.6 7l3.6 12.5zM3.6 17.5h2L4.6 14zM8.4 19.5L12 5l3.6 14.5zM15.8 19.5L19.4 7L23 19.5zM18.4 17.5h2l-1-3.5z"/>',
  progreso: '<path d="M3 9.5L12 3l9 6.5v2.6L12 5.6l-9 6.5zM3 14.7l9-6.5l9 6.5v2.6l-9-6.5l-9 6.5zM3 19.9l9-6.5l9 6.5V22.5l-9-6.5l-9 6.5z"/>',
  comida: '<path d="M2.5 5h19v2.2h-19zM4 8.4h16c0 4.2-3.6 7.4-8 7.4s-8-3.2-8-7.4zM6 17.5a2.2 2.2 0 1 1 0 4.4a2.2 2.2 0 1 1 0-4.4zM12 17.5a2.2 2.2 0 1 1 0 4.4a2.2 2.2 0 1 1 0-4.4zM18 17.5a2.2 2.2 0 1 1 0 4.4a2.2 2.2 0 1 1 0-4.4z"/>',
  ajustes: '<path d="M2 5h20v2H2zM5 9.5L8 3.5l3 6zM2 11h20v2H2zM13 15.5l3-6l3 6zM2 17h20v2H2zM7 21.5l3-6l3 6z"/>',
  cambiar: '<path d="M2.5 9L9 3.5v11zM8.5 7.5H21v3H8.5zM21.5 15L15 20.5v-11zM3 13.5h12.5v3H3z"/>',
  nota: '<path fill-rule="evenodd" d="M4 3h14l2 18H5zM8 7h8v2H8zM8 11h7v2H8zM8 15h5v2H8z"/>',
  lista: '<path d="M5 7.8a3 4.2 0 1 0 0 8.4a3 4.2 0 1 0 0-8.4zM12 7.8a3 4.2 0 1 0 0 8.4a3 4.2 0 1 0 0-8.4zM19 7.8a3 4.2 0 1 0 0 8.4a3 4.2 0 1 0 0-8.4z"/>',
  fin: '<path fill-rule="evenodd" d="M3 3h18v18H3zM5.5 18.5L18.5 5.5v13z"/>',
  igual: '<path d="M4 8h16v3H4zm0 5h16v3H4z"/>',
  sube: '<path d="M12 4l8 14H4z"/>',
  baja: '<path d="M12 20L4 6h16z"/>', // «sube» al revés
  marca: '<path d="M12 9.5c3 0 4 3.3 3.6 5.7c-.4 2.3-1.9 4.3-3.6 4.3s-3.2-2-3.6-4.3C8 12.8 9 9.5 12 9.5zM4 9L6 3l2 6zM10 6.5L12 1l2 5.5zM16 9l2-6l2 6z"/>',
  malo: '<path fill-rule="evenodd" d="M12 2.5c5.5 0 7.2 6 6.4 10.4C17.6 17.2 14.9 21.5 12 21.5s-5.6-4.3-6.4-8.6C4.8 8.5 6.5 2.5 12 2.5zM12 4.6c-3.8 0-5.1 4.4-4.4 8c.6 3.3 2.6 6.8 4.4 6.8z"/>',
  otro: '<path fill-rule="evenodd" d="M1.5 20L7.5 6l6 14zM14.5 20l4-10l4 10zM16.8 18.2h3.4l-1.7-4.2z"/>',
  mas30: '<path fill-rule="evenodd" d="M12 6a6 6 0 1 0 0 12a6 6 0 1 0 0-12zM12 10.4a1.6 1.6 0 1 1 0 3.2a1.6 1.6 0 1 1 0-3.2zM12 1.5a10.5 10.5 0 0 1 10.4 9h-2.2A8.4 8.4 0 0 0 12 3.6z"/>',
  zurron: '<path d="M8 3h8l-1.5 3H9.5zM6.5 7.5h11c2 2 3.5 5 3.5 8c0 3.3-2.7 5.5-6 5.5H9c-3.3 0-6-2.2-6-5.5c0-3 1.5-6 3.5-8z"/>',
  sonido: '<path d="M3 13l12-9c3 1.5 5.5 4 6 7.5l-3 1.5l1 3l-3 1l.5 3l-3.5.5L12 22l-2-3l-3 .5l-1-3.5z"/>',
  atras: '<path d="M15.5 3.5L7 12l8.5 8.5l1.8-1.8L10.6 12l6.7-6.7z"/>',
  mas: '<path d="M10.6 3h2.8v7.6H21v2.8h-7.6V21h-2.8v-7.6H3v-2.8h7.6z"/>',
  menos: '<path d="M3 10.6h18v2.8H3z"/>', // la barra gruesa de «+ / −»
  sigue: '<path d="M8.5 3.5L17 12l-8.5 8.5l-1.8-1.8L13.4 12L6.7 5.3z"/>', // «atrás» al revés (filas que abren algo)
  // Del sistema: se tienen que reconocer (G86: el botón de compartir de iOS no se toca).
  compartir: '<path d="M12 2l4.6 4.6l-1.4 1.4L13 5.8V15h-2V5.8L8.8 8L7.4 6.6zM5 10h3v2H7v8h10v-8h-1v-2h3v12H5z"/>',
  check: '<path d="M9.5 16.2L4.8 11.5l-1.6 1.6l6.3 6.3L21 7.9l-1.6-1.6z"/>',
};
I.info = I.igual; I.vuelta = I.hoy; I.copia = I.zurron;
export const icono = (n, extra = '') => `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" ${extra}>${I[n]}</svg>`;

/** Un grano de millo. estado: true = lleno (serie hecha), false = por llenar, 'ahora' = la serie de ahora (late). */
export const grano = (estado, clase = '') => {
  const st = estado === 'ahora' ? 'ahora' : estado ? 'lleno' : 'vacio';
  return `<svg class="grano ${clase}${st === 'ahora' ? ' late' : ''}" viewBox="-80 -92 160 184" aria-hidden="true"><path class="${st}" transform="rotate(-14)" d="M0 -82C55 -82 72 -22 64 22C56 64 29 82 0 82C-29 82 -56 64 -64 22C-72 -22 -55 -82 0 -82Z"/></svg>`;
};
/** Fila de granos: `hechas` llenos; con `ahora`, el siguiente late (la serie que toca). */
export const granos = (hechas, total, nueva = -1, { ahora = false, clase = '' } = {}) =>
  `<div class="granos ${clase}" role="img" aria-label="${hechas} de ${total} series">${Array.from({ length: total }, (_, i) => grano(i < hechas ? true : ahora && i === hechas ? 'ahora' : false, i === nueva ? 'cae' : '')).join('')}</div>`;

/** Separador de dientes de sierra (Cueva Pintada). */
export const sierra = () =>
  '<svg class="sierra" width="100%" height="10" aria-hidden="true"><defs><pattern id="ps" width="12" height="10" patternUnits="userSpaceOnUse"><path d="M0 10L6 2L12 10Z" fill="currentColor"/></pattern></defs><rect width="100%" height="10" fill="url(#ps)"/></svg>';

/** Triángulo de un día de la semana: lleno = entrenado, almagre = hoy, contorno = pendiente. */
export const triangulo = (estado) => estado === 'contorno'
  ? '<svg width="22" height="20" viewBox="0 0 22 20" aria-hidden="true"><path d="M3.6 17L11 3.9L18.4 17z" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>'
  : `<svg width="22" height="20" viewBox="0 0 22 20" aria-hidden="true"><path d="M2 18L11 2l9 16z" fill="${estado === 'hoy' ? 'var(--almagre)' : 'currentColor'}"/></svg>`;

/**
 * Ajusta un título gigante para que quepa en `lineas` líneas sin partir palabras
 * (aguanta «Pierna B + brazo»). Mide con la letra ya cargada.
 */
export function ajustarTitulo(nodo, { max = 132, min = 48, lineas = 2, alto = 0.88 } = {}) {
  let t = max;
  nodo.style.fontSize = t + 'px';
  const cabe = () => nodo.scrollWidth <= nodo.clientWidth + 1 && nodo.offsetHeight <= t * alto * lineas + 4;
  while (t > min && !cabe()) { t -= 4; nodo.style.fontSize = t + 'px'; }
}

/** Respuesta háptica: vibrate donde exista; en iOS 18+ el truco del interruptor (un clic en un <input switch>). */
let interruptor;
export function vibrar() {
  if (navigator.vibrate) { navigator.vibrate(12); return; }
  try {
    if (!interruptor) {
      const l = document.createElement('label');
      l.style.cssText = 'position:fixed;left:-99px;top:0;opacity:0;pointer-events:none';
      l.innerHTML = '<input type="checkbox" switch tabindex="-1" aria-hidden="true">';
      document.body.append(l); interruptor = l;
    }
    interruptor.click();
  } catch { /* sin háptica: no pasa nada */ }
}

// ── Aviso flotante ─────────────────────────────────────────────
let tAviso;
export function avisar(texto, accion) {
  const a = document.getElementById('aviso');
  a.innerHTML = `<span>${esc(texto)}</span>${accion ? `<button type="button">${esc(accion.texto)}</button>` : ''}`;
  a.hidden = false;
  if (accion) a.querySelector('button').onclick = () => { ocultar(); accion.hacer(); };
  requestAnimationFrame(() => a.classList.add('visible'));
  clearTimeout(tAviso);
  const ocultar = () => { a.classList.remove('visible'); setTimeout(() => { a.hidden = true; }, 420); };
  if (!accion?.fijo) tAviso = setTimeout(ocultar, accion ? 8000 : 2800);
}

// ── Hojas que suben desde abajo (con arrastre para cerrar) ─────
export function hoja(contenido, { clara = false, alCerrar } = {}) {
  const capa = document.getElementById('capa-hojas');
  const fondo = el('<div class="hoja-fondo"></div>');
  const h = el(`<section class="hoja${clara ? ' clara' : ''}" role="dialog" aria-modal="true"><div class="asa" aria-hidden="true"></div></section>`);
  if (typeof contenido === 'string') h.insertAdjacentHTML('beforeend', contenido); else h.append(contenido);
  capa.append(fondo, h);
  requestAnimationFrame(() => requestAnimationFrame(() => { fondo.classList.add('visible'); h.classList.add('visible'); }));
  let cerrada = false;
  const cerrar = (dato) => {
    if (cerrada) return; cerrada = true;
    h.style.transition = ''; h.style.transform = '';
    fondo.classList.remove('visible'); h.classList.remove('visible');
    setTimeout(() => { fondo.remove(); h.remove(); }, 430);
    alCerrar?.(dato);
  };
  fondo.addEventListener('click', () => cerrar());
  // Arrastrar hacia abajo desde el asa o con la hoja arriba del todo: sigue al dedo 1:1 y respeta la velocidad al soltar.
  let y0 = null, t0 = 0, dy = 0;
  h.addEventListener('pointerdown', (e) => {
    if (e.target.closest('input,textarea,select,button') && !e.target.closest('.asa')) return;
    if (h.scrollTop > 0 && !e.target.closest('.asa')) return;
    y0 = e.clientY; t0 = performance.now(); dy = 0; h.style.transition = 'none';
  });
  h.addEventListener('pointermove', (e) => {
    if (y0 == null) return;
    dy = Math.max(0, e.clientY - y0);
    if (dy > 4) h.style.transform = `translateY(${dy}px)`;
  });
  const soltar = () => {
    if (y0 == null) return;
    const v = dy / Math.max(1, performance.now() - t0);
    y0 = null; h.style.transition = '';
    if (dy > h.offsetHeight * 0.3 || v > 0.6) cerrar(); else h.style.transform = '';
  };
  h.addEventListener('pointerup', soltar); h.addEventListener('pointercancel', soltar);
  const foco = h.querySelector('input,textarea,button:not(.asa)');
  setTimeout(() => foco?.focus({ preventScroll: true }), 450);
  return { nodo: h, cerrar };
}

/** Pregunta un número en una hoja (teclado decimal del iPhone). */
export function pedirNumero({ titulo, sub = '', valor = '', unidad = 'kg', decimal = true }) {
  return new Promise((ok) => {
    const { nodo, cerrar } = hoja(`<h2>${esc(titulo)}</h2>${sub ? `<p class="sub">${esc(sub)}</p>` : ''}
      <form class="botones"><input class="campo ancho cifra" style="height:64px;font-size:40px;text-align:center" inputmode="${decimal ? 'decimal' : 'numeric'}" enterkeyhint="done" autocomplete="off" value="${valor === '' || valor == null ? '' : String(valor).replace('.', ',')}" aria-label="${esc(titulo)} (${unidad})">
      <button class="boton" type="submit">Listo</button></form>`, { alCerrar: (v) => ok(v ?? null) });
    nodo.querySelector('form').onsubmit = (e) => {
      e.preventDefault();
      const v = parseFloat(nodo.querySelector('input').value.replace(',', '.'));
      cerrar(Number.isFinite(v) && v >= 0 ? v : null);
    };
  });
}

/** Confirmación en una hoja. */
export function confirmar({ titulo, texto, si = 'Sí', no = 'Cancelar', peligro = false }) {
  return new Promise((ok) => {
    const { nodo, cerrar } = hoja(`<h2>${esc(titulo)}</h2><p class="sub">${esc(texto)}</p>
      <div class="botones"><button class="boton${peligro ? '' : ' millo'}" data-si>${esc(si)}</button><button class="boton plano" data-no>${esc(no)}</button></div>`,
    { alCerrar: (v) => ok(!!v) });
    nodo.querySelector('[data-si]').onclick = () => cerrar(true);
    nodo.querySelector('[data-no]').onclick = () => cerrar(false);
  });
}

/** Cuenta hacia arriba un número (resumen final). */
export function contar(nodo, hasta, ms = 700) {
  if (reduceMovimiento()) { nodo.textContent = hasta; return; }
  const t0 = performance.now();
  const paso = (t) => {
    const p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 3);
    nodo.textContent = Math.round(hasta * e);
    if (p < 1) requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}

// ── Todo lo que se toca responde (G49) ─────────────────────────
// Onda que sale desde el dedo: como una piedra en el agua. Sin ella con «Reducir movimiento».
export const TOCABLES = '.boton, .chip, .redondo, .rir-botones button, .opciones button, .lista-sesiones button, .lista-ejercicios li, .pestanas a, .tarjeta-eleccion, .icono-boton, .fila.tocable, .tocable, .fila-fuerza, .opciones-como button';
document.addEventListener('pointerdown', (e) => {
  const t = e.target.closest(TOCABLES);
  if (!t || reduceMovimiento() || t.disabled) return;
  const r = t.getBoundingClientRect();
  const lado = Math.hypot(Math.max(e.clientX - r.left, r.right - e.clientX), Math.max(e.clientY - r.top, r.bottom - e.clientY)) * 2;
  const o = document.createElement('span');
  o.className = 'onda';
  o.style.cssText = `width:${lado}px;height:${lado}px;left:${e.clientX - r.left - lado / 2}px;top:${e.clientY - r.top - lado / 2}px`;
  t.append(o);
  const a = o.animate([{ transform: 'scale(0)', opacity: 0.32 }, { transform: 'scale(1)', opacity: 0 }], { duration: 560, easing: 'cubic-bezier(.22,1,.36,1)' });
  a.onfinish = () => o.remove();
}, { passive: true });

/** Granos de millo que saltan desde un botón (al guardar una serie). */
export function estallidoGranos(boton, n = 9) {
  if (reduceMovimiento()) return;
  const r = boton.getBoundingClientRect();
  const capa = document.createElement('div');
  capa.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:70';
  document.body.append(capa);
  const x0 = r.left + r.width / 2, y0 = r.top + r.height / 2;
  for (let i = 0; i < n; i++) {
    const g = document.createElement('div');
    g.innerHTML = grano(true);
    g.style.cssText = `position:absolute;left:${x0 - 8}px;top:${y0 - 11}px;width:16px;height:22px`;
    capa.append(g);
    const ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.95;
    const dist = 70 + Math.random() * 90;
    const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist;
    const giro = (Math.random() - 0.5) * 540;
    g.animate([
      { transform: 'translate(0,0) rotate(0deg) scale(.4)', opacity: 1 },
      { transform: `translate(${dx * 0.7}px,${dy}px) rotate(${giro / 2}deg) scale(1.1)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${dx}px,${dy + 90}px) rotate(${giro}deg) scale(.8)`, opacity: 0 },
    ], { duration: 820 + Math.random() * 200, easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' });
  }
  setTimeout(() => capa.remove(), 1200);
}

/** Entrada escalonada de una lista (filas que suben y aparecen). */
export function escalonar(nodos, { retraso = 40, desde = 60 } = {}) {
  if (reduceMovimiento()) return;
  [...nodos].forEach((n, i) => n.animate(
    [{ transform: 'translateY(12px)', opacity: 0 }, { transform: 'none', opacity: 1 }],
    { duration: 420, delay: desde + i * retraso, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }));
}

/** Un «pop» corto (selección, pestaña nueva). */
export function pop(n, escala = 1.14) {
  if (reduceMovimiento() || !n) return;
  n.animate([{ transform: 'scale(1)' }, { transform: `scale(${escala})` }, { transform: 'scale(1)' }], { duration: 320, easing: 'cubic-bezier(.34,1.56,.64,1)' });
}

/** Ejecuta algo cuando la cortinilla ya se ha ido (para que las animaciones de entrada se vean, no detrás). */
export function cuandoRevelada(fn) {
  if (window.gofioRevelada) fn(); else window.addEventListener('gofio:revelada', fn, { once: true });
}
