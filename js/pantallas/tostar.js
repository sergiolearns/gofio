// «Tostar» (La brega, R30, G115-G117; lienzo: tablero 15, TostarArrimar). Antes de moler, el grano se tostaba en el
// tostador, un plato de barro, removiéndolo con un palo (El Museo Canario; CACT Lanzarote). Aquí, la movilidad del día:
// seis movimientos dinámicos para las articulaciones de lo que toca, con el cuerpo o en la polea. Opcional: viene
// encendido, se salta con un toque y, si lo saltas tres moliendas seguidas, Gofio pregunta una vez si lo deja de proponer.
// Regla del vistazo (G116): nombre y dosis, nada más. El porqué, en la libreta.
import * as G from '../cerebro/index.js';
import { estado, guardarSesion, siguienteHueco, seriesDelHueco, ajuste, ponerAjuste } from '../logica.js';
import { el, esc, icono, grano, hoja, vibrar, reduceMovimiento, escalonar, pop, selloTri, avisar } from '../ui.js';
import * as S from '../sonidos.js';
import { mantenerEncendida } from './serie.js';
import { abrirLibreta } from './libreta.js';

const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const GRANO_D = 'M0 -82C55 -82 72 -22 64 22C56 64 29 82 0 82C-29 82 -56 64 -64 22C-72 -22 -55 -82 0 -82Z';
// Los granos del tostador, en tres filas para que haya fondo: x, y, giro, tamaño, fila (0 = al fondo, 2 = delante).
// Los de delante quedan medio tapados por el borde del plato: así se ve que están dentro (Sergio: «tienes que darle
// un poco de profundidad»).
const EN_EL_PLATO = [
  [58, 43, -30, 0.062, 0], [76, 42, 15, 0.062, 0], [96, 41, -8, 0.062, 0], [116, 41, 30, 0.062, 0], [136, 42, -22, 0.062, 0], [153, 43, 10, 0.062, 0],
  [48, 48, 20, 0.07, 1], [68, 48, -40, 0.07, 1], [88, 47, 5, 0.07, 1], [108, 47, -15, 0.07, 1], [128, 47, 35, 0.07, 1], [148, 48, -5, 0.07, 1], [166, 49, 25, 0.07, 1],
  [60, 54, -12, 0.078, 2], [82, 55, 28, 0.078, 2], [104, 55, -30, 0.078, 2], [126, 55, 8, 0.078, 2], [148, 54, -20, 0.078, 2],
];

/**
 * El tostador, con fondo: el plato por detrás y su pared de dentro en sombra, los granos en tres filas, el palo que
 * remueve y, por delante, el labio del plato, que tapa la parte de abajo de los granos y del palo.
 */
function tostadorSVG() {
  const gr = EN_EL_PLATO.map(([x, y, r, e, f], k) => `<g transform="translate(${x} ${y})"><g class="tg tg-${f}" data-k="${k}"><path d="${GRANO_D}" transform="rotate(${r}) scale(${e})"/></g></g>`).join('');
  return `<svg class="tostador" viewBox="0 0 210 100" aria-hidden="true">
    <defs>
      <linearGradient id="tt-barro" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C44D35"/><stop offset="1" stop-color="#93321F"/></linearGradient>
      <radialGradient id="tt-hondo" cx=".5" cy=".75" r=".75"><stop offset="0" stop-color="#8E3423"/><stop offset="1" stop-color="#4E1A11"/></radialGradient>
    </defs>
    <ellipse class="tt-sombra" cx="105" cy="93" rx="70" ry="5"/>
    <g class="tt-humo"><path d="M84 24c-4-6 4-10 0-16"/><path d="M108 20c-4-6 4-10 0-16"/><path d="M130 24c-4-6 4-10 0-16"/></g>
    <g class="tt-cuerpo">
    <path class="tt-plato" d="M14 46A91 12 0 0 1 196 46Q186 86 105 88Q24 86 14 46Z"/>
    <ellipse class="tt-dentro" cx="105" cy="46" rx="91" ry="12" fill="url(#tt-hondo)"/>
    <path class="tt-pared" d="M14 46A91 12 0 0 1 196 46A91 7 0 0 0 14 46Z"/>
    <path class="tt-borde-atras" d="M14 46A91 12 0 0 1 196 46"/>
    <g class="tt-granos">${gr}</g>
    <g class="tt-palo"><path d="M146 52L186 4"/></g>
    <path class="tt-labio" d="M14 46A91 12 0 0 0 196 46Q186 86 105 88Q24 86 14 46Z" fill="url(#tt-barro)"/>
    <path class="tt-brillo" d="M30 66Q60 80 100 81"/>
    <path class="tt-borde" d="M14 46A91 12 0 0 0 196 46"/>
    </g>
  </svg>`;
}

export function tostarPantalla(params, nav) {
  const { sesionId } = params;
  const s = estado.sesiones.find((x) => x.id === sesionId);
  if (!s) return { nodo: el('<section><p>Esta sesión ya no existe.</p></section>') };
  const i = Math.max(0, siguienteHueco(s, s.actual ?? 0));
  let modo = ajuste('tostarModo') === 'polea' ? 'polea' : 'cuerpo';
  let lista = G.tostar(s.plan.map((x) => ({ ej: x.ej, series: x.series })), modo);
  const hechos = new Set(s.tostados ?? []);
  const quieto = reduceMovimiento();

  const fila = (m) => `<li data-id="${m.id}"><button type="button" class="tt-fila" data-son="none" aria-pressed="false">
      <span class="tt-marca">${selloTri('tt-sello')}${grano('ahora')}<span class="tt-aro"></span></span>
      <span class="tt-nombre">${esc(m.nombre)}</span><b class="cifra tt-cuenta num" aria-hidden="true"></b><span class="tt-dosis">${esc(m.dosis)}</span></button></li>`;
  const nodo = el(`<section class="tostar" aria-labelledby="titulo-tostar">
    <div class="serie-cabeza">
      <button class="volver" type="button" data-volver>${icono('atras')}Hoy</button>
      <button class="libreta-boton" type="button" data-libreta aria-label="Por qué tostar">${icono('libreta')}</button>
    </div>
    <div class="tostar-cabeza">
      <div class="tostador-caja">${tostadorSVG()}</div>
      <h1 class="titular tostar-titulo" id="titulo-tostar">Tostar</h1>
      <p class="tostar-sub" data-sub></p>
    </div>
    <div class="segmentado" role="radiogroup" aria-label="Con qué">
      <button type="button" role="radio" data-modo="cuerpo" aria-checked="${modo === 'cuerpo'}" data-son="0">Con el cuerpo</button>
      <button type="button" role="radio" data-modo="polea" aria-checked="${modo === 'polea'}" data-son="0">Con polea o banda</button>
      <span class="seg-fondo" aria-hidden="true"></span>
    </div>
    <ul class="tostar-lista" data-lista></ul>
    ${ajuste('pistaTostar') ? '' : '<p class="tostar-pista" data-pista>Toca cada uno al hacerlo.</p>'}
    <div class="relleno"></div>
    <div class="tostar-pie">
      <button class="tostar-saltar" type="button" data-saltar>Saltar<br>por hoy</button>
      <button class="boton boton-guardar boton-tostado" type="button" data-tostado data-son="none">${selloTri('st-boton')}Ya está tostado</button>
    </div>
  </section>`);

  const ul = nodo.querySelector('[data-lista]');
  const sub = nodo.querySelector('[data-sub]');
  const seg = nodo.querySelector('.segmentado');
  let actual = null, desde = Date.now(), raf = 0, ultimoSeg = -1;

  function pintarSub() { sub.innerHTML = `<b>${esc(G.zonasDichas(lista))}</b> · ${G.minutosTostar(lista)} min`; }
  function marcarActual() {
    actual = lista.find((m) => !hechos.has(m.id))?.id ?? null;
    ul.querySelectorAll('li').forEach((li) => {
      const id = li.dataset.id, b = li.querySelector('button');
      li.classList.toggle('tt-hecho', hechos.has(id)); li.classList.toggle('tt-ahora', id === actual);
      b.setAttribute('aria-pressed', String(hechos.has(id)));
      b.setAttribute('aria-label', `${li.querySelector('.tt-nombre').textContent}, ${li.querySelector('.tt-dosis').textContent}${hechos.has(id) ? ', hecho' : ''}`);
    });
    desde = Date.now(); ultimoSeg = -1;
    nodo.querySelector('[data-tostado]').classList.toggle('listo', lista.every((m) => hechos.has(m.id)));
  }
  function pintarLista(animar = false) {
    ul.innerHTML = lista.map(fila).join('');
    ul.querySelectorAll('li').forEach((li) => li.querySelector('button').addEventListener('click', () => sellar(li)));
    marcarActual(); pintarSub();
    if (animar) escalonar(ul.querySelectorAll('li'), { desde: 0, retraso: 40 });
  }
  // La cuenta del que toca (sube, en millo): para los «30 s» y los «20 s» sin mirar el reloj.
  function cuadro() {
    const t = (Date.now() - desde) / 1000;
    const seg = Math.floor(t);
    if (seg !== ultimoSeg) {
      ultimoSeg = seg;
      ul.querySelectorAll('.tt-cuenta').forEach((c) => { c.textContent = ''; });
      const c = ul.querySelector('li.tt-ahora .tt-cuenta'); if (c) c.textContent = mmss(seg);
    }
    raf = requestAnimationFrame(cuadro);
  }

  // ── El tostador se mueve (G118): el palo remueve en círculo por dentro del plato y los granos se mueven porque el
  // palo los empuja al pasar (los que tiene delante se apartan, ruedan y dan un saltito); el plato cede un poco con
  // cada empujón. De vez en cuando un grano salta solo, del calor. Todo en una vuelta de 2 s que se repite.
  const VUELTA = 2000, PASOS = 40;
  const C = { x: 105, y: 49 }, PUNTA = { rx: 34, ry: 5.5 }, MANO = { x: 150, y: 2, rx: 26, ry: 3 };
  const O = { x: 186, y: 4 }, V0 = { x: -40, y: 48 };                    // el palo dibujado: de la punta (146, 52) a la mano
  const L0 = Math.hypot(V0.x, V0.y), A0 = Math.atan2(V0.y, V0.x);
  const envolver = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const anims = [];
  let pops = 0;
  function tostando() {
    if (quieto) return;
    const fases = Array.from({ length: PASOS + 1 }, (_, k) => (k / PASOS) * 2 * Math.PI);
    // El palo, rígido: la punta da la vuelta por dentro del plato y la mano, arriba, casi la misma vuelta; así el palo
    // apenas cambia de largo (solo lo que da la perspectiva) y se ve que es la mano la que remueve.
    const palo = nodo.querySelector('.tt-palo');
    anims.push(palo.animate(fases.map((f) => {
      const T = { x: C.x + PUNTA.rx * Math.cos(f), y: C.y + PUNTA.ry * Math.sin(f) };
      const H = { x: MANO.x + MANO.rx * Math.cos(f), y: MANO.y + MANO.ry * Math.sin(f) };
      const d = { x: T.x - H.x, y: T.y - H.y };
      const giro = (Math.atan2(d.y, d.x) - A0) * 180 / Math.PI, esc = Math.hypot(d.x, d.y) / L0;
      return { transform: `translate(${(H.x - O.x).toFixed(2)}px,${(H.y - O.y).toFixed(2)}px) rotate(${giro.toFixed(2)}deg) scale(${esc.toFixed(3)})` };
    }), { duration: VUELTA, iterations: Infinity, easing: 'linear' }));
    // El plato cede con el empujón: se desplaza y se inclina un pelo hacia donde va la punta.
    anims.push(nodo.querySelector('.tt-cuerpo').animate(fases.map((f) => ({
      transform: `translate(${(-1.1 * Math.sin(f)).toFixed(2)}px,${(0.35 * Math.cos(f)).toFixed(2)}px) rotate(${(0.9 * Math.cos(f)).toFixed(2)}deg)`,
    })), { duration: VUELTA, iterations: Infinity, easing: 'linear' }));
    // Cada grano: cuánto lo empuja la punta según lo cerca que pase (por delante de él y a su misma distancia del centro).
    nodo.querySelectorAll('.tt-granos > g').forEach((g) => {
      const [x, y] = (g.getAttribute('transform').match(/[-\d.]+/g) ?? [0, 0]).map(Number);
      const tg = g.querySelector('.tg');
      const fila = tg.classList.contains('tg-0') ? 0 : tg.classList.contains('tg-1') ? 1 : 2;
      const u = (x - C.x) / 62, v = (y - C.y) / 7, th = Math.atan2(v, u), r = Math.hypot(u, v);
      const cerca = Math.exp(-(((r - 0.58) / 0.5) ** 2));
      const salto = [1.2, 2.6, 3.4][fila], lado = Math.sign(Math.cos(th)) || 1;
      anims.push(tg.animate(fases.map((f) => {
        const d = envolver(th - f);                                   // > 0: el grano está por delante del palo
        const m = cerca * Math.exp(-(((d - 0.32) / 0.5) ** 2));       // 0..1: el empujón
        const dx = 6 * m * -Math.sin(th), dy = 6 * m * Math.cos(th) * 0.3 - salto * m * m;
        return { transform: `translate(${dx.toFixed(2)}px,${dy.toFixed(2)}px) rotate(${(lado * 80 * m).toFixed(1)}deg)` };
      }), { duration: VUELTA, iterations: Infinity, easing: 'linear' }));
    });
    nodo.querySelectorAll('.tt-humo path').forEach((h, k) => anims.push(h.animate([
      { transform: 'translateY(6px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 0.5, offset: 0.4 }, { transform: 'translateY(-10px)', opacity: 0 },
    ], { duration: 2400, delay: k * 800, iterations: Infinity, easing: 'ease-out' })));
    // Del calor, cada poco un grano de delante salta solo y cae en el plato.
    const delante = [...nodo.querySelectorAll('.tg-1, .tg-2')];
    pops = setInterval(() => {
      if (document.hidden || !delante.length) return;
      const g = delante[Math.floor(Math.random() * delante.length)], alto = 9 + Math.random() * 6, gira = (Math.random() < 0.5 ? -1 : 1) * (200 + Math.random() * 160);
      g.animate([{ transform: 'translate(0,0) rotate(0deg)' }, { transform: `translate(${(Math.random() * 6 - 3).toFixed(1)}px,-${alto.toFixed(1)}px) rotate(${gira / 2}deg)`, offset: 0.45, easing: 'cubic-bezier(.4,0,1,1)' }, { transform: `translate(0,0) rotate(${gira}deg)` }],
        { duration: 520, easing: 'cubic-bezier(0,0,.6,1)', composite: 'add' });
    }, 1900);
  }
  // Al sellar: un golpe de muñeca. El plato sube y se inclina, y los granos, un instante después (inercia), vuelan y caen.
  function estallido(fuerte = 1) {
    if (quieto) return;
    nodo.querySelector('.tt-cuerpo').animate([{ transform: 'translate(0,0) rotate(0deg)' }, { transform: `translate(-2px,-${(4 * fuerte).toFixed(1)}px) rotate(-${(2.2 * fuerte).toFixed(1)}deg)`, offset: 0.3 }, { transform: 'translate(0,0) rotate(0deg)' }],
      { duration: 420, easing: 'cubic-bezier(.3,.7,.4,1)', composite: 'add' });
    nodo.querySelectorAll('.tg').forEach((g, k) => {
      const fila = g.classList.contains('tg-0') ? 0 : g.classList.contains('tg-1') ? 1 : 2;
      const dx = (k % 5 - 2) * 1.4 * fuerte, alto = ([7, 11, 15][fila] + (k * 29 % 5)) * fuerte, giro = (k % 2 ? 1 : -1) * (150 + k * 13 % 90);
      g.animate([{ transform: 'translate(0,0) rotate(0deg)' }, { transform: `translate(${dx}px,-${alto}px) rotate(${giro / 2}deg)`, offset: 0.45, easing: 'cubic-bezier(.4,0,1,1)' }, { transform: `translate(0,0) rotate(${giro}deg)` }],
        { duration: 560, delay: 70 + k * 12, easing: 'cubic-bezier(0,0,.6,1)', composite: 'add' });
    });
  }
  // El crepitar del grano: solo un rato (al entrar y al sellar), para que no canse en 6 minutos.
  let tCrep = 0;
  function crepitar(ms) { clearTimeout(tCrep); S.tostarOn(); tCrep = setTimeout(() => S.tostarOff(), ms); }

  async function sellar(li) {
    const id = li.dataset.id;
    if (hechos.has(id)) {
      hechos.delete(id); S.toque(-1); vibrar();
    } else {
      hechos.add(id); S.suena('punado'); vibrar(); estallido(); crepitar(900);
      const sello = li.querySelector('.tt-sello');
      if (!quieto) sello.animate([{ transform: 'scale(1.8) rotate(-60deg)', opacity: 0 }, { transform: 'scale(.92) rotate(6deg)', opacity: 1, offset: 0.65 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.2,.9,.3,1.15)' });
      if (!ajuste('pistaTostar')) { ponerAjuste('pistaTostar', true); nodo.querySelector('[data-pista]')?.remove(); }
    }
    s.tostados = [...hechos]; guardarSesion(s);
    marcarActual();
    // El siguiente se asoma: un empujoncito hacia la derecha, como quien pasa la página.
    const sig = ul.querySelector('li.tt-ahora');
    if (sig && hechos.has(id) && !quieto) sig.animate([{ transform: 'translateX(-8px)', opacity: 0.6 }, { transform: 'none', opacity: 1 }], { duration: 280, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    if (lista.every((m) => hechos.has(m.id))) pop(nodo.querySelector('[data-tostado]'), 1.05);
  }

  // Con el cuerpo / en la polea: la lista cambia (lo ya hecho, si sigue, se queda hecho).
  function colocarFondo(animar) {
    const b = seg.querySelector('[aria-checked="true"]'), f = seg.querySelector('.seg-fondo');
    const r = b.getBoundingClientRect(), rs = seg.getBoundingClientRect();
    if (!r.width) return;
    const x = r.left - rs.left;
    if (animar && !quieto) f.animate([{ transform: f.style.transform || 'none', width: f.style.width }, { transform: `translateX(${x}px)`, width: `${r.width}px` }], { duration: 260, easing: 'cubic-bezier(.22,1,.36,1)' });
    f.style.transform = `translateX(${x}px)`; f.style.width = `${r.width}px`;
  }
  seg.querySelectorAll('[data-modo]').forEach((b) => b.addEventListener('click', async () => {
    if (b.dataset.modo === modo) return;
    modo = b.dataset.modo; ponerAjuste('tostarModo', modo);
    seg.querySelectorAll('[data-modo]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    colocarFondo(true);
    if (!quieto) await ul.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(4px)' }], { duration: 140, fill: 'forwards' }).finished;
    lista = G.tostar(s.plan.map((x) => ({ ej: x.ej, series: x.series })), modo);
    pintarLista(false);
    if (!quieto) ul.animate([{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' });
    estallido(0.6);
  }));

  const aLaSerie = (dur = 260) => nav.reemplazar('serie', { sesionId: s.id, i, anima: true }, { duracion: dur });
  nodo.querySelector('[data-volver]').onclick = () => nav.volver();
  nodo.querySelector('[data-libreta]').onclick = () => abrirLibreta({ ejId: s.plan[i].ej, porque: [
    '<b>Tostar (R30):</b> antes de moler, el grano se tostaba en el tostador. Aquí, 5-8 minutos de movimientos para las articulaciones de lo que toca hoy.',
    'Movimientos que se mueven, no estiramientos quietos: quieto, menos de 60 s por músculo, que más resta fuerza (Behm y cols. 2016).',
    'Es opcional: lo que más prepara para levantar son las piedras de arrimar, antes de cada ejercicio.',
    ...lista.map((m) => `<b>${esc(m.nombre)}</b> · ${esc(m.dosis)}. ${esc(m.como ?? '')}`),
  ], pestana: 'porque' });
  // «Ya está tostado»: el grano salta por última vez y a moler.
  nodo.querySelector('[data-tostado]').onclick = async (e) => {
    const b = e.currentTarget; if (b.dataset.va) return; b.dataset.va = '1';
    s.tostado = true; await guardarSesion(s); await ponerAjuste('tostarSaltos', 0);
    S.suena('tostado'); vibrar(); estallido(1.6); S.tostarOff();
    if (!quieto) {
      const st = b.querySelector('.st-boton');
      st.animate([{ transform: 'scale(1.6) rotate(-90deg)' }, { transform: 'scale(.9) rotate(8deg)', offset: 0.6 }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,.9,.3,1.15)' });
      await espera(520);
    }
    aLaSerie();
  };
  // «Saltar por hoy». Tres moliendas seguidas sin tostar: pregunta una vez si lo deja de proponer.
  nodo.querySelector('[data-saltar]').onclick = async () => {
    s.tostado = 'saltado'; await guardarSesion(s);
    const saltos = (ajuste('tostarSaltos') ?? 0) + 1;
    await ponerAjuste('tostarSaltos', saltos);
    if (saltos >= 3 && !ajuste('tostarPreguntado')) {
      await ponerAjuste('tostarPreguntado', true);
      const resp = await new Promise((ok) => {
        const { nodo: h, cerrar } = hoja(`<h2>¿Dejo de proponerte tostar?</h2><p class="sub">Llevas tres moliendas saltándotelo. Se vuelve a encender en Ajustes.</p>
          <div class="botones"><button class="boton" type="button" data-no-mas>Sí, sin tostar</button><button class="boton plano grande" type="button" data-sigue>Sigue proponiéndolo</button></div>`,
        { alCerrar: (v) => ok(v ?? null) });
        h.querySelector('[data-no-mas]').onclick = () => cerrar(true);
        h.querySelector('[data-sigue]').onclick = () => cerrar(false);
      });
      if (resp) { await ponerAjuste('tostar', false); avisar('Tostar, apagado. Está en Ajustes.'); }
      if (resp === false) await ponerAjuste('tostarSaltos', 0);
      await espera(240);
    }
    S.toque('barrido');
    aLaSerie(240);
  };

  pintarLista(false);
  return {
    nodo, pestana: null,
    alEntrar(o = {}) {
      mantenerEncendida(true);
      requestAnimationFrame(() => colocarFondo(false));
      cancelAnimationFrame(raf); raf = requestAnimationFrame(cuadro);
      if (o.refresco) return;
      tostando(); crepitar(2600);
      if (!quieto) {
        nodo.querySelector('.tostador-caja').animate([{ opacity: 0, transform: 'translateY(16px) scale(.92)' }, { opacity: 1, transform: 'none' }], { duration: 480, easing: 'cubic-bezier(.34,1.3,.64,1)', fill: 'backwards' });
        escalonar(nodo.querySelectorAll('.tostar-titulo, .tostar-sub, .segmentado, .tostar-lista li, .tostar-pista, .tostar-saltar, .boton-tostado'), { desde: 160, retraso: 35 });
      }
    },
    alSalir() { cancelAnimationFrame(raf); anims.forEach((a) => a.cancel()); clearInterval(pops); clearTimeout(tCrep); S.tostarOff(); },
  };
}

/** ¿Toca tostar antes de esta molienda? Encendido (viene así), sin hacer ni saltar aún y sin ninguna serie guardada. */
export function tocaTostar(s) {
  return ajuste('tostar') !== false && !s.tostado && !s.plan.some((_, k) => seriesDelHueco(s, k).length > 0);
}
