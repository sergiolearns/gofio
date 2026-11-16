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

// Iconos: trazos rellenos y geometría sencilla (triángulos, círculos), sin emojis ni glifos.
const I = {
  hoy: '<path fill-rule="evenodd" d="M12 2a10 10 0 1 0 0 20a10 10 0 0 0 0-20zm0 7.2a2.8 2.8 0 1 1 0 5.6a2.8 2.8 0 0 1 0-5.6zm5.4 7a1.3 1.3 0 1 1 0 2.6a1.3 1.3 0 0 1 0-2.6z"/>',
  semana: '<path d="M1 19l3.7-12l3.6 12zM8.4 19L12 7l3.6 12zM15.7 19l3.6-12L23 19z"/>',
  progreso: '<path d="M3 10.5L12 3l9 7.5v3.6L12 6.6L3 14.1zM3 17.4L12 9.9l9 7.5V21l-9-7.5L3 21z"/>',
  comida: '<path d="M2 11h20a10 10 0 0 1-20 0z"/><circle cx="12" cy="5.2" r="3"/>',
  ajustes: '<path d="M3 6h9.2a3 3 0 0 1 5.6 0H21v2h-3.2a3 3 0 0 1-5.6 0H3zm0 10h3.2a3 3 0 0 1 5.6 0H21v2h-9.2a3 3 0 0 1-5.6 0H3z"/>',
  atras: '<path d="M15.5 3.5L7 12l8.5 8.5l1.8-1.8L10.6 12l6.7-6.7z"/>',
  cambiar: '<path d="M4 7h12.2l-3-3L14.6 2.6L20 8l-5.4 5.4l-1.4-1.4l3-3H4zm16 10H7.8l3 3l-1.4 1.4L4 16l5.4-5.4l1.4 1.4l-3 3H20z"/>',
  nota: '<path d="M4 3h16v12l-6 6H4zm2 2v14h7v-5h5V5zm2 3h8v2H8zm0 4h5v2H8z"/>',
  lista: '<path d="M3 5h3v3H3zm5 .5h13v2H8zM3 10.5h3v3H3zm5 .5h13v2H8zM3 16h3v3H3zm5 .5h13v2H8z"/>',
  fin: '<path d="M5 3h2v18H5zm3 1h11l-3 5l3 5H8z"/>',
  sube: '<path d="M12 4l8 14H4z"/>',
  igual: '<path d="M4 8h16v3H4zm0 5h16v3H4z"/>',
  baja: '<path d="M12 20L4 6h16z"/>',
  info: '<path fill-rule="evenodd" d="M12 2a10 10 0 1 0 0 20a10 10 0 0 0 0-20zm-1.3 8h2.6v8h-2.6zm1.3-4.6a1.6 1.6 0 1 1 0 3.2a1.6 1.6 0 0 1 0-3.2z"/>',
  vuelta: '<path d="M12 4a8 8 0 1 1-7.4 5H2l3.6-4.6L9.2 9H7.2A5.4 5.4 0 1 0 12 6.6z"/>',
  compartir: '<path d="M12 2l4.6 4.6l-1.4 1.4L13 5.8V15h-2V5.8L8.8 8L7.4 6.6zM5 10h3v2H7v8h10v-8h-1v-2h3v12H5z"/>',
  mas: '<path d="M10.6 3h2.8v7.6H21v2.8h-7.6V21h-2.8v-7.6H3v-2.8h7.6z"/>',
  menos: '<path d="M3 10.6h18v2.8H3z"/>',
  check: '<path d="M9.5 16.2L4.8 11.5l-1.6 1.6l6.3 6.3L21 7.9l-1.6-1.6z"/>',
  copia: '<path d="M12 3l9 5v8l-9 5l-9-5V8zm0 2.3L5.6 8.8L12 12.3l6.4-3.5zM5 10.6v4.2l6 3.3v-4.2zm14 0l-6 3.3v4.2l6-3.3z"/>',
};
export const icono = (n, extra = '') => `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" ${extra}>${I[n]}</svg>`;

/** Un grano de millo (lleno = serie hecha). */
export const grano = (lleno, clase = '') =>
  `<svg class="grano ${clase}" viewBox="-80 -92 160 184" aria-hidden="true"><path class="${lleno ? 'lleno' : 'vacio'}" transform="rotate(-14)" d="M0 -82C55 -82 72 -22 64 22C56 64 29 82 0 82C-29 82 -56 64 -64 22C-72 -22 -55 -82 0 -82Z"/></svg>`;
export const granos = (hechas, total, nueva = -1) =>
  `<div class="granos" role="img" aria-label="${hechas} de ${total} series">${Array.from({ length: total }, (_, i) => grano(i < hechas, i === nueva ? 'cae' : '')).join('')}</div>`;

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
  tAviso = setTimeout(ocultar, accion ? 8000 : 2800);
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
