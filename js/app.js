// Gofio v0.1 · arranque, navegación entre pantallas (con gesto de volver desde el borde) y pestañas.
import { estado, arrancar, ajuste, sesionEnCurso } from './logica.js';
import { pedirPersistencia } from './datos.js';
import { icono, el, avisar, reduceMovimiento, pop } from './ui.js';
import { PANTALLAS } from './pantallas/index.js';

const app = document.getElementById('app');
const nav = document.getElementById('pestanas');
const PESTANAS = [['hoy', 'Hoy'], ['semana', 'Semana'], ['progreso', 'Progreso'], ['comida', 'Comida'], ['ajustes', 'Ajustes']];
const pila = []; // [{nombre, params, nodo}]
const CURVA = 'cubic-bezier(.32,.72,0,1)';

function pintarPestanas(activa, clara) {
  nav.innerHTML = PESTANAS.map(([id, txt]) => `<a href="#${id}" data-p="${id}" ${id === activa ? 'aria-current="page"' : ''}>${icono(id)}${txt}</a>`).join('');
  nav.classList.toggle('clara', !!clara);
}
nav.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-p]'); if (!a) return;
  e.preventDefault();
  if (pila.length === 1 && pila[0].nombre === a.dataset.p) { pila[0].nodo.scrollTo({ top: 0, behavior: reduceMovimiento() ? 'auto' : 'smooth' }); return; }
  ir(a.dataset.p, {}, { modo: 'pestana' });
  pop(nav.querySelector('[aria-current="page"] svg'), 1.25);
});

function montar(nombre, params) {
  const def = PANTALLAS[nombre];
  const r = def(params, { ir, volver, reemplazar, refrescar });
  const nodo = r.nodo;
  nodo.classList.add('pantalla');
  if (r.clara) nodo.classList.add('clara');
  if (r.pestana) nodo.classList.add('con-pestanas');
  return { nombre, params, nodo, r };
}
function aplicarCromo(entrada) {
  const { r } = entrada;
  nav.hidden = false;
  nav.classList.toggle('fuera', !r.pestana);
  if (r.pestana) pintarPestanas(r.pestana, r.clara);
  document.querySelector('meta[name="theme-color"]').content = r.clara ? '#F1E6D2' : '#1B1917';
  entrada.r.alMostrar?.();
}

/** Navega. modo: 'pestana' (cambia de sección), 'empuja' (entra encima), 'reemplaza' (misma altura). */
export function ir(nombre, params = {}, { modo = 'empuja', duracion = 220 } = {}) {
  const nueva = montar(nombre, params);
  const vieja = pila[pila.length - 1];
  if (modo === 'pestana') pila.length = 0; else if (modo === 'reemplaza') pila.pop();
  pila.push(nueva);
  app.append(nueva.nodo);
  aplicarCromo(nueva);
  if (!vieja) { nueva.r.alEntrar?.(); return; }
  const quitar = () => { vieja.r.alSalir?.(); vieja.nodo.remove(); };
  if (reduceMovimiento()) {
    nueva.nodo.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160 }).finished.then(quitar);
  } else if (modo === 'empuja') {
    // Solo transform y opacity (en el iPhone, animar filter en una pantalla entera da tirones y parece que salta).
    const velo = el('<div class="velo"></div>');
    app.insertBefore(velo, nueva.nodo);
    vieja.nodo.style.willChange = nueva.nodo.style.willChange = 'transform';
    vieja.nodo.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-28%)' }], { duration: 440, easing: CURVA, fill: 'forwards' });
    velo.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 440, easing: CURVA, fill: 'forwards' });
    nueva.nodo.style.boxShadow = '-12px 0 30px -12px rgba(0,0,0,.5)';
    nueva.nodo.animate([{ transform: 'translateX(100%)' }, { transform: 'translateX(0)' }], { duration: 440, easing: CURVA }).finished.then(() => { nueva.nodo.style.boxShadow = ''; nueva.nodo.style.willChange = ''; velo.remove(); quitar(); });
  } else {
    // Cambio de pestaña o reemplazo: fundido corto con un leve desplazamiento hacia arriba.
    nueva.nodo.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: duracion, easing: 'cubic-bezier(.22,1,.36,1)' }).finished.then(quitar);
  }
  nueva.r.alEntrar?.();
}

/** Vuelve a la pantalla anterior (la vuelve a pintar para que salga al día). */
export function volver(desde = null) {
  if (pila.length < 2) return;
  const actual = pila.pop();
  const prev = pila.pop();
  const nueva = montar(prev.nombre, prev.params);
  pila.push(nueva);
  app.insertBefore(nueva.nodo, actual.nodo);
  aplicarCromo(nueva);
  const x0 = desde ?? 0;
  const ancho = app.clientWidth;
  if (reduceMovimiento()) { actual.r.alSalir?.(); actual.nodo.remove(); nueva.r.alEntrar?.(); return; }
  const dur = Math.max(180, 400 * (1 - x0 / ancho));
  const velo = el('<div class="velo"></div>');
  app.insertBefore(velo, actual.nodo);
  velo.animate([{ opacity: 1 - x0 / ancho }, { opacity: 0 }], { duration: dur, easing: CURVA, fill: 'forwards' });
  nueva.nodo.animate([{ transform: `translateX(${-28 + 28 * x0 / ancho}%)` }, { transform: 'translateX(0)' }], { duration: dur, easing: CURVA });
  actual.nodo.animate([{ transform: `translateX(${x0}px)` }, { transform: 'translateX(100%)' }], { duration: dur, easing: CURVA, fill: 'forwards' })
    .finished.then(() => { velo.remove(); actual.r.alSalir?.(); actual.nodo.remove(); });
  nueva.r.alEntrar?.();
}
export const reemplazar = (nombre, params, opc = {}) => ir(nombre, params, { modo: 'reemplaza', ...opc });
/** Vuelve a pintar la pantalla actual sin animación (tras guardar algo). */
export function refrescar() {
  const actual = pila[pila.length - 1]; if (!actual) return;
  const nueva = montar(actual.nombre, actual.params);
  const scroll = actual.nodo.scrollTop;
  app.replaceChild(nueva.nodo, actual.nodo);
  pila[pila.length - 1] = nueva;
  nueva.nodo.scrollTop = scroll;
  aplicarCromo(nueva);
  actual.r.alSalir?.();
  nueva.r.alEntrar?.({ refresco: true });
}

// ── Gesto de volver desde el borde izquierdo (como en iOS): sigue al dedo 1:1 y respeta la velocidad ──
let gesto = null;
app.addEventListener('pointerdown', (e) => {
  if (pila.length < 2 || e.clientX > 24 || e.pointerType === 'mouse') return;
  const actual = pila[pila.length - 1];
  if (actual.r.sinGesto) return;
  gesto = { x0: e.clientX, t0: performance.now(), dx: 0, actual, prev: null, id: e.pointerId };
});
app.addEventListener('pointermove', (e) => {
  if (!gesto || e.pointerId !== gesto.id) return;
  gesto.dx = Math.max(0, e.clientX - gesto.x0);
  if (!gesto.prev && gesto.dx > 6) {
    const p = pila[pila.length - 2];
    gesto.prev = montar(p.nombre, p.params);
    app.insertBefore(gesto.prev.nodo, gesto.actual.nodo);
    gesto.actual.nodo.style.boxShadow = '-12px 0 30px -12px rgba(0,0,0,.5)';
    try { app.setPointerCapture(e.pointerId); } catch { /* */ }
  }
  if (gesto.prev) {
    const f = gesto.dx / app.clientWidth;
    gesto.actual.nodo.style.transform = `translateX(${gesto.dx}px)`;
    gesto.prev.nodo.style.transform = `translateX(${-28 + 28 * f}%)`;
    gesto.prev.nodo.style.opacity = String(0.75 + 0.25 * f);
  }
});
function finGesto() {
  if (!gesto) return;
  const g = gesto; gesto = null;
  if (!g.prev) return;
  const v = g.dx / Math.max(1, performance.now() - g.t0);
  const ancho = app.clientWidth;
  g.actual.nodo.style.boxShadow = '';
  if (g.dx > ancho * 0.35 || v > 0.5) {
    g.prev.nodo.remove(); g.prev.nodo.style.transform = ''; g.prev.nodo.style.opacity = '';
    g.actual.nodo.style.transform = '';
    volver(g.dx);
  } else {
    const f = g.dx / ancho;
    g.actual.nodo.animate([{ transform: `translateX(${g.dx}px)` }, { transform: 'translateX(0)' }], { duration: 260, easing: CURVA }).finished.then(() => { g.actual.nodo.style.transform = ''; });
    g.prev.nodo.animate([{ transform: `translateX(${-28 + 28 * f}%)` }, { transform: 'translateX(-28%)' }], { duration: 260, easing: CURVA }).finished.then(() => g.prev.nodo.remove());
    g.actual.nodo.style.transform = '';
  }
}
app.addEventListener('pointerup', finGesto);
app.addEventListener('pointercancel', finGesto);

// ── Service worker: sin conexión y aviso de versión nueva (nunca a mitad de un entreno) ──
function registrarSW() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  navigator.serviceWorker.register('sw.js').then((reg) => {
    const ofrecer = (w) => {
      if (!w || sesionEnCurso()) return;
      avisar('Hay versión nueva', { texto: 'Actualizar', hacer: () => w.postMessage('saltar') });
    };
    if (reg.waiting && navigator.serviceWorker.controller) ofrecer(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) ofrecer(w); });
    });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  }).catch(() => {});
  let recargando = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!recargando) { recargando = true; location.reload(); } });
}

// ── ¿Abierta en Safari en vez de desde el icono? ──
// Excepción consciente a «no mirar el navegador»: el aviso solo tiene sentido en el iPhone/iPad.
const esIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const instalada = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;

/** La cortinilla se queda lo justo para que se vea la animación (≈1,4 s desde que se abre) y se va con un fundido. */
function quitarCortinilla() {
  const c = document.getElementById('cortinilla');
  const revelar = () => { if (window.gofioRevelada) return; window.gofioRevelada = true; window.dispatchEvent(new Event('gofio:revelada')); };
  if (!c) { revelar(); return; }
  if (reduceMovimiento()) {
    c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: 'forwards' }).finished.then(() => c.remove());
    revelar(); return;
  }
  // G58: se ve al menos un momento (es la continuación de la imagen de arranque de iOS) y luego el ojo de la muela
  // se abre: la cortinilla se recorta desde el agujero del disco hacia fuera mientras la muela da un cuarto de vuelta.
  const espera = Math.max(0, 900 - performance.now());
  setTimeout(() => {
    const disco = c.querySelector('.c-disco');
    const r = disco.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const r0 = r.width * 0.12;                                   // el ojo de la muela (120 de 1000 en el SVG)
    const caja = c.getBoundingClientRect();
    const r1 = Math.hypot(Math.max(cx - caja.left, caja.right - cx), Math.max(cy - caja.top, caja.bottom - cy)) + 2;
    const dur = 820, t0 = performance.now();
    const curva = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    c.classList.add('fuera');
    disco.animate([{ transform: 'rotate(0) scale(1)' }, { transform: 'rotate(90deg) scale(1.35)' }], { duration: dur, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' });
    c.querySelector('.c-sub')?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' });
    setTimeout(revelar, 140);
    const paso = (ahora) => {
      const t = Math.min(1, (ahora - t0) / dur);
      const rad = r0 + (r1 - r0) * curva(t);
      const m = `radial-gradient(circle at ${cx}px ${cy}px, transparent ${rad}px, #000 ${rad + 1}px)`;
      c.style.webkitMaskImage = m; c.style.maskImage = m;
      if (t < 1) requestAnimationFrame(paso); else c.remove();
    };
    requestAnimationFrame(paso);
  }, espera);
}

// iOS (app instalada) encoge la pantalla al abrir el teclado y no la devuelve: quedaba una franja negra abajo, la barra
// de pestañas subía y los botones se montaban (G58). Se le obliga a medir de nuevo al cerrarlo.
let altoMax = window.innerHeight;
window.addEventListener('resize', () => { altoMax = Math.max(altoMax, window.innerHeight); });
function curarVentana() {
  window.gofioMedir?.();
  if (altoMax - window.innerHeight <= 4) return;
  const actual = pila[pila.length - 1]; const arriba = actual?.nodo.scrollTop ?? 0;
  app.style.display = 'none'; void app.offsetHeight; app.style.display = '';
  nav.style.display = 'none'; void nav.offsetHeight; nav.style.display = '';
  if (actual) actual.nodo.scrollTop = arriba;
}
document.addEventListener('focusout', (e) => { if (e.target.matches?.('input, textarea')) { setTimeout(curarVentana, 140); setTimeout(curarVentana, 600); } });
document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(curarVentana, 100); });

// iOS mueve la ventana entera al abrir el teclado y a veces no la devuelve: la app quedaba «elevada» (G53).
document.addEventListener('focusin', (e) => {
  if (e.target.matches?.('input, textarea')) setTimeout(() => e.target.scrollIntoView({ block: 'center', behavior: reduceMovimiento() ? 'auto' : 'smooth' }), 320);
});
const devolver = () => setTimeout(() => { if (!document.activeElement?.matches?.('input, textarea, select')) window.scrollTo(0, 0); }, 60);
document.addEventListener('focusout', devolver);
window.visualViewport?.addEventListener('resize', devolver);

async function inicio() {
  try { await document.fonts.ready; } catch { /* */ }
  await arrancar();
  registrarSW();
  const forzar = new URLSearchParams(location.search).get('pantalla'); // solo para pruebas
  if (esIOS && !instalada && !sessionStorage.getItem('gofio-seguir-safari') && !forzar) ir('instalar', {}, { modo: 'pestana' });
  else if (!ajuste('inicioHecho') && !forzar) ir('bienvenida', {}, { modo: 'pestana' });
  else { pedirPersistencia(); ir(forzar && PANTALLAS[forzar] ? forzar : 'hoy', {}, { modo: 'pestana' }); }
  quitarCortinilla();
}
window.addEventListener('hashchange', () => {
  const p = location.hash.slice(1);
  if (PANTALLAS[p] && PESTANAS.some(([id]) => id === p)) ir(p, {}, { modo: 'pestana' });
});
inicio().catch((e) => {
  quitarCortinilla();
  app.append(el(`<section class="pantalla"><h1 class="titular">Algo ha fallado.</h1><p style="margin-top:12px">${String(e?.message ?? e)}</p><p class="texto-2" style="margin-top:12px">Tus datos siguen en el móvil. Cierra y vuelve a abrir.</p></section>`));
  console.error(e);
});
export { estado };
