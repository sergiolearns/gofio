// Primer arranque: portada → objetivo → tu semana → rutina (la tuya o la que propone Gofio, R25) → datos → pesos.
// También: «Instálala» (abierta en Safari) y los huecos honestos de lo que llega más adelante.
import * as G from '../cerebro/index.js';
import { ajuste, ponerAjuste } from '../logica.js';
import { pedirPersistencia } from '../datos.js';
import { el, esc, icono, vibrar, grano, escalonar, pop, avisar, cuandoRevelada, reduceMovimiento } from '../ui.js';
import { empezarSesion, planDeHoy } from '../logica.js';
import { aMoler } from '../amoler.js';
import { formularioCargas, guardarCargas, importarCopia } from './ajustes.js';

const TOTAL = 5;
// G75 · El progreso se cuenta con granos: los pasos hechos, llenos; el de ahora cae a su hueco.
const progresoGranos = (paso) => `<div class="pasos-arranque" role="img" aria-label="Paso ${paso} de ${TOTAL}">${Array.from({ length: TOTAL }, (_, i) => grano(i < paso, i === paso - 1 ? 'cae' : '')).join('')}</div>`;
// Cabecera de cada paso: «‹ Atrás» (al inicio, o a Ajustes si vienes de ahí) y los granos de progreso (G53).
let desdeAjustesActual = false;
const progreso = (paso) => `<div class="cabeza-paso"><button class="volver" type="button" data-atras>${icono('atras')}${paso === 1 ? (desdeAjustesActual ? 'Ajustes' : 'Inicio') : 'Atrás'}</button>${progresoGranos(paso)}</div>`;
// La opción elegida lleva su grano lleno (G75).
const marca = `<span class="grano-el" aria-hidden="true">${grano(false)}</span>`;
const rutinaGofio = () => G.proponerRutina({ dias: ajuste('diasDisponibles') ?? 3, minutos: ajuste('minutos'), objetivo: ajuste('objetivo') });

export function bienvenidaPantalla({ paso = 0, desdeAjustes = false } = {}, nav) {
  const perfil = ajuste('perfil');
  desdeAjustesActual = desdeAjustes;
  const siguiente = (n) => nav.ir('bienvenida', { paso: n, desdeAjustes }, { modo: 'empuja' });
  let cuerpo = '';

  if (paso === 0) {
    cuerpo = `<div class="bienvenida-disco" aria-hidden="true"><img src="iconos/disco-millo.svg" alt="" width="740" height="740"></div>
      <div class="portada-pie">
        <img class="bienvenida-logo" src="iconos/gofio-logo-oscuro.svg" alt="Gofio" width="184" height="75">
        <h1 class="titular bienvenida-lema">La fuerza<br><span>se muele.</span></h1>
        <div class="portada-granos" role="img" aria-label="Siete granos de millo: tres llenos">${Array.from({ length: 7 }, (_, i) => grano(i < 3)).join('')}</div>
        <div class="portada-acciones">
          <button class="boton" type="button" data-sig>Empezar</button>
          <p class="legal">Sin cuenta. Todo se queda en tu móvil.</p>
          <button class="enlace" type="button" data-importar>Tengo una copia</button>
        </div>
      </div>`;
  } else if (paso === 1) {
    const actual = ajuste('objetivo');
    cuerpo = `<div class="paso-bienvenida col">${progreso(1)}
      <h1 class="titular grande" style="margin-top:18px">¿A qué vienes?</h1>
      <div class="elecciones" role="radiogroup" aria-label="Objetivo">${Object.entries(G.OBJETIVOS).map(([id, o]) => `
        <button class="tarjeta-eleccion" type="button" role="radio" aria-checked="${id === actual}" data-objetivo="${id}">${marca}<span><b>${o.nombre}</b><span class="d">${o.texto}</span></span></button>`).join('')}</div>
      <p class="etiqueta" style="margin-top:12px">Lo cambias cuando quieras.</p>
      <div class="relleno" style="min-height:20px"></div>
      <div class="pie-fijo"><button class="boton" type="button" data-sig>Seguir</button></div></div>`;
  } else if (paso === 2) {
    const dias = ajuste('diasDisponibles') ?? 3, min = ajuste('minutos');
    cuerpo = `<div class="paso-bienvenida col">${progreso(2)}
      <h1 class="titular grande" style="margin-top:18px">¿Cuánto puedes venir?</h1>
      <p class="fuerte" style="margin-top:22px">Días a la semana</p>
      <div class="fila-opciones" role="radiogroup" aria-label="Días a la semana">${[1, 2, 3, 4, 5, 6].map((d) => `<button class="chip" type="button" role="radio" aria-pressed="${d === dias}" aria-checked="${d === dias}" data-dias="${d}">${d}</button>`).join('')}</div>
      <p class="fuerte" style="margin-top:22px">Minutos por sesión</p>
      <div class="fila-opciones" role="radiogroup" aria-label="Minutos por sesión">${[45, 60, 75, 90].map((m) => `<button class="chip" type="button" role="radio" aria-pressed="${m === min}" aria-checked="${m === min}" data-min="${m}">${m}</button>`).join('')}</div>
      <p class="etiqueta" style="margin-top:16px">¿Una semana vienes menos? Se reajusta sola.</p>
      <div class="relleno" style="min-height:20px"></div>
      <div class="pie-fijo"><button class="boton" type="button" data-sig>Seguir</button></div></div>`;
  } else if (paso === 3) {
    const actual = ajuste('plantilla');
    const propuesta = rutinaGofio();
    const eleccion = actual.propuesta ? 'gofio' : 'tuya';
    const vista = vistaRutina(eleccion === 'gofio' ? propuesta : actual);
    cuerpo = `<div class="paso-bienvenida col">${progreso(3)}
      <h1 class="titular grande" style="margin-top:18px">Tu rutina.</h1>
      <div class="elecciones" role="radiogroup" aria-label="Rutina">
        <button class="tarjeta-eleccion" type="button" role="radio" aria-checked="${eleccion === 'gofio'}" data-rutina="gofio">${marca}<span><b>Que me la arme Gofio</b><span class="d">${esc(G.REPARTOS[Math.min(6, Math.max(1, ajuste('diasDisponibles') ?? 3))].nombre)} · ${propuesta.dias.length} ${propuesta.dias.length === 1 ? 'día' : 'días'} · ${propuesta.minutos} min</span></span></button>
        <button class="tarjeta-eleccion" type="button" role="radio" aria-checked="${eleccion === 'tuya'}" data-rutina="tuya">${marca}<span><b>La mía</b><span class="d">${esc(G.PLANTILLA_SERGIO.nombre.replace('Rutina de Sergio · ', ''))}: ${G.PLANTILLA_SERGIO.dias.map((d) => esc(d.nombre)).join(', ')}</span></span></button>
      </div>
      <div class="vista-rutina" data-vista>${vista}</div>
      <div class="relleno" style="min-height:20px"></div>
      <div class="pie-fijo"><button class="boton" type="button" data-sig>${desdeAjustes ? 'Guardar' : 'Seguir'}</button></div></div>`;
  } else if (paso === 4) {
    cuerpo = `<div class="paso-bienvenida col">${progreso(4)}
      <h1 class="titular grande" style="margin-top:18px">Sobre ti.</h1>
      <p class="texto-2" style="margin-top:10px">Opcional. Para la comida, que llega pronto.</p>
      <div class="tarjeta" style="margin-top:16px">
        <label class="fila"><span class="que">Peso<small>kg</small></span><input class="campo" data-perfil="peso" inputmode="decimal" value="${perfil.peso ?? ''}"></label>
        <label class="fila"><span class="que">Altura<small>cm</small></span><input class="campo" data-perfil="altura" inputmode="numeric" value="${perfil.altura ?? ''}"></label>
        <label class="fila"><span class="que">Edad</span><input class="campo" data-perfil="edad" inputmode="numeric" value="${perfil.edad ?? ''}"></label>
      </div>
      <div class="relleno" style="min-height:20px"></div>
      <div class="pie-fijo"><button class="boton" type="button" data-sig>Seguir</button></div></div>`;
  } else {
    cuerpo = `<div class="paso-bienvenida col">${progreso(5)}
      <h1 class="titular grande" style="margin-top:18px">¿Sabes tus pesos?</h1>
      <p class="texto-2" style="margin-top:10px">Pon los que sepas. El resto, en la primera serie.</p>
      <div class="tarjeta" style="margin-top:8px">${formularioCargas()}</div>
      <div style="height:20px"></div>
      <div class="pie-fijo"><button class="boton" type="button" data-sig data-son="none">A moler</button></div></div>`;
  }

  const nodo = el(`<section class="bienvenida">${cuerpo}</section>`);
  if (paso > 0) nodo.classList.add('con-pie');

  // Elegir con tarjetas y chips: la selección se mueve con un pop.
  const marcar = (sel, b) => { nodo.querySelectorAll(sel).forEach((x) => { x.setAttribute('aria-checked', String(x === b)); x.setAttribute('aria-pressed', String(x === b)); }); pop(b, 1.04); vibrar(); };
  nodo.querySelectorAll('[data-objetivo]').forEach((b) => b.addEventListener('click', () => { marcar('[data-objetivo]', b); ponerAjuste('objetivo', b.dataset.objetivo); }));
  nodo.querySelectorAll('[data-dias]').forEach((b) => b.addEventListener('click', () => { marcar('[data-dias]', b); ponerAjuste('diasDisponibles', Number(b.dataset.dias)); }));
  nodo.querySelectorAll('[data-min]').forEach((b) => b.addEventListener('click', () => { marcar('[data-min]', b); ponerAjuste('minutos', Number(b.dataset.min)); }));
  let rutina = paso === 3 ? (ajuste('plantilla').propuesta ? 'gofio' : 'tuya') : null;
  nodo.querySelectorAll('[data-rutina]').forEach((b) => b.addEventListener('click', () => {
    marcar('[data-rutina]', b); rutina = b.dataset.rutina;
    const v = nodo.querySelector('[data-vista]');
    v.innerHTML = vistaRutina(rutina === 'gofio' ? rutinaGofio() : G.PLANTILLA_SERGIO);
    escalonar(v.children, { retraso: 30, desde: 0 });
  }));
  nodo.querySelector('[data-importar]')?.addEventListener('click', () => importarCopia(async () => { await ponerAjuste('inicioHecho', true); nav.ir('hoy', {}, { modo: 'pestana' }); }));

  nodo.querySelector('[data-atras]')?.addEventListener('click', () => { vibrar(); nav.volver(); });

  nodo.querySelector('[data-sig]').onclick = async () => {
    vibrar();
    if (paso === 3) {
      await ponerAjuste('plantilla', rutina === 'gofio' ? rutinaGofio() : null);
      if (desdeAjustes) { avisar('Rutina lista.'); nav.ir('ajustes', {}, { modo: 'pestana' }); return; }
    }
    if (paso === 4) {
      const p = {}; nodo.querySelectorAll('[data-perfil]').forEach((i) => { const v = parseFloat(i.value.replace(',', '.')); if (Number.isFinite(v)) p[i.dataset.perfil] = v; });
      await ponerAjuste('perfil', p);
    }
    if (paso === 5) {
      await guardarCargas(nodo);
      await ponerAjuste('inicioHecho', true);
      pedirPersistencia();
      // «A moler» arranca su animación la primera vez (concepto: primer arranque · 5) y abre la primera serie de hoy.
      // Si aún no estás en el gimnasio, «‹ Hoy» vuelve a casa y la molienda vacía se deshace sola.
      const plan = planDeHoy();
      const s = await empezarSesion({ diaId: plan.diaId, nombre: plan.nombre, ejercicios: plan.ejercicios, modo: plan.tipo === 'combinada' ? 'combinada' : 'normal' });
      nav.ir('hoy', { mantener: s.id }, { modo: 'pestana', sinAnimacion: true });
      await aMoler({ total: s.plan.reduce((a, x) => a + x.series, 0), alCambiar: () => nav.ir('serie', { sesionId: s.id, i: 0 }, { sinAnimacion: true }) });
      return;
    }
    siguiente(paso + 1);
  };
  return {
    nodo, pestana: null, sinGesto: paso === 0, cinta: paso !== 0,
    alEntrar() {
      // G75 · El disco de la portada sigue el giro que trae la muela de la cortinilla y frena largo, sin parón.
      const disco = nodo.querySelector('.bienvenida-disco img');
      if (disco && !reduceMovimiento()) {
        disco.animate([{ transform: 'rotate(-70deg)' }, { transform: 'rotate(0deg)' }], { duration: 1600, easing: 'cubic-bezier(.16,1,.3,1)' });
        cuandoRevelada(() => escalonar(nodo.querySelectorAll('.portada-pie > *, .portada-granos .grano'), { desde: 120, retraso: 50 }));
      }
      escalonar(nodo.querySelectorAll('.tarjeta-eleccion, .fila-opciones .chip, .vista-rutina > *, .tarjeta .fila')); },
  };
}

/** Vista previa de una rutina: los días con sus ejercicios y cuánto suma cada músculo. */
function vistaRutina(p) {
  const r = G.porQueRutina(p);
  const prin = ['pecho', 'dorsal', 'hombro-lateral', 'biceps', 'triceps', 'cuadriceps', 'isquios'].map((m) => r.volumen[m]);
  const min = Math.min(...prin), max = Math.max(...prin);
  const n = (x) => String(x).replace('.', ',');
  return `${p.dias.map((d) => `<p><b>${esc(d.nombre)}</b> · ${d.ejercicios.map((e) => esc(G.ejercicio(e.ej).nombre)).join(', ')}</p>`).join('')}
    <p class="texto-2" style="margin-top:10px">${n(min)} a ${n(max)} series por músculo a la semana · ~${Math.max(...r.porSesion) * 3} min por sesión</p>`;
}

export function instalarPantalla(_, nav) {
  const nodo = el(`<section class="instalar">
    <div class="relleno"></div>
    <img src="iconos/gofio-logo-oscuro.svg" alt="Gofio" width="180" height="74" style="width:180px">
    <h1 class="titular grande" style="margin-top:22px">Instálala.</h1>
    <p style="margin-top:12px;color:var(--piedra)">Así funciona sin internet y guarda tus datos.</p>
    <ol>
      <li>Toca ${icono('compartir')} <b>Compartir</b>.</li>
      <li><b>Añadir a pantalla de inicio</b>.</li>
      <li>Ábrela desde el icono.</li>
    </ol>
    <div class="relleno"></div>
    <button class="enlace" type="button" data-seguir style="color:var(--piedra);font-weight:500">Seguir en Safari</button>
  </section>`);
  nodo.querySelector('[data-seguir]').onclick = () => {
    sessionStorage.setItem('gofio-seguir-safari', '1');
    nav.ir(ajuste('inicioHecho') ? 'hoy' : 'bienvenida', {}, { modo: 'pestana' });
  };
  return { nodo, pestana: null, sinGesto: true, alEntrar() { escalonar(nodo.querySelectorAll('li')); } };
}

// Los huecos honestos (lienzo: Huecos.dc.html; G86): su icono en grande, una frase con voz de Gofio y en qué versión llegan.
const DIBUJO = {
  progreso: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#3A3531" d="M3 9.5L12 3l9 6.5v2.6L12 5.6l-9 6.5zM3 14.7l9-6.5l9 6.5v2.6l-9-6.5l-9 6.5z"/><path class="sube" fill="#E3A62B" d="M3 19.9l9-6.5l9 6.5V22.5l-9-6.5l-9 6.5z"/></svg>`,
  comida: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#1B1917" d="M2.5 5h19v2.2h-19zM4 8.4h16c0 4.2-3.6 7.4-8 7.4s-8-3.2-8-7.4z"/><g fill="#B8422E"><circle class="piedra" cx="6" cy="19.7" r="2.2"/><circle class="piedra" cx="12" cy="19.7" r="2.2"/><circle class="piedra" cx="18" cy="19.7" r="2.2"/></g></svg>`,
};
const hueco = (pestana, titulo, frase, texto, version) => () => {
  const clara = pestana === 'comida';
  const nodo = el(`<section class="hueco-pantalla"><h1 class="titular grande">${titulo}</h1>
    <div class="hueco-dibujo">${DIBUJO[pestana]}</div>
    <div class="hueco-texto"><h2 class="titular" style="color:var(--${clara ? 'almagre' : 'millo'})">${frase}</h2><p>${texto}</p><small>${version}</small></div></section>`);
  return {
    nodo, pestana, clara,
    alEntrar() {
      escalonar(nodo.querySelectorAll('.hueco-texto > *'), { desde: 120, retraso: 80 });
      if (reduceMovimiento()) return;
      // Progreso: el último ángulo sube una vez. Comida: las tres piedras se encienden de una en una.
      nodo.querySelector('.sube')?.animate([{ transform: 'translateY(4px)', opacity: 0 }, { transform: 'translateY(-1.5px)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }], { duration: 700, delay: 250, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
      nodo.querySelectorAll('.piedra').forEach((p, k) => p.animate([{ opacity: 0.15 }, { opacity: 1 }], { duration: 300, delay: 300 + k * 220, easing: 'ease-out', fill: 'backwards' }));
    },
  };
};
export const progresoPantalla = hueco('progreso', 'Progreso', 'Aún moliendo.', 'Aquí verás cómo le coges el jeito a cada ejercicio: tu fuerza, con su gráfica. Las series de hoy ya cuentan.', 'Llega con la v0.2 · Progresión.');
export const comidaPantalla = hueco('comida', 'Comida', 'Al fuego, pronto.', 'Tu peso, lo que comes y lo que gastas de verdad. Sin números inventados mientras tanto.', 'Llega con la v0.3 · Comida y peso.');
