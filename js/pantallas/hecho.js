// «Molienda hecha»: de vuelta a casa (lienzo: Hecho.dc.html; G59, G85). Harina, el medio sello por el ojo,
// «Hecho gofio.» y tres datos. Movimiento: el sello cae y se estampa, el título sube, los números cuentan, los granos
// caen escalonados, la sierra se dibuja de izquierda a derecha y «Lo más fino» entra al final. Sonido: G83.
import * as G from '../cerebro/index.js';
import { estado, resumen, planDeHoy, seriesDe } from '../logica.js';
import { el, esc, kg, num, grano, contar, vibrar, reduceMovimiento, escalonar, avisar } from '../ui.js';
import { suena } from '../sonidos.js';

/** R11 · Marcas nuevas de la sesión: ejercicios cuya mejor fuerza estimada supera la de antes. */
export function marcasDe(sesion) {
  const ss = seriesDe(sesion.id);
  const res = [];
  for (const ej of new Set(ss.map((s) => s.ejercicioId))) {
    const mias = ss.filter((s) => s.ejercicioId === ej);
    const t0 = Math.min(...mias.map((s) => s.ts));
    const antes = Math.max(0, ...estado.series.filter((s) => s.ejercicioId === ej && s.sesionId !== sesion.id && s.ts < t0).map((s) => G.e1rm(s.peso, s.reps, s.rir)));
    const top = mias.reduce((a, b) => (G.e1rm(b.peso, b.reps, b.rir) > G.e1rm(a.peso, a.reps, a.rir) ? b : a));
    if (antes > 0 && G.e1rm(top.peso, top.reps, top.rir) > antes + 0.01) res.push({ ej, top, delta: G.e1rm(top.peso, top.reps, top.rir) - antes });
  }
  return res.sort((a, b) => b.delta - a.delta);
}

export function hechoPantalla({ sesionId, soloVer = false }, nav) {
  const s = estado.sesiones.find((x) => x.id === sesionId);
  const r = resumen(s);
  const cuando = new Date(s.inicio).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' });
  const marcas = marcasDe(s);

  // Lo más fino: la marca nueva más grande; si no, lo que más subió la fuerza (R11); si no, en qué se asienta.
  let fino;
  if (marcas.length) {
    const m = marcas[0];
    fino = `${esc(G.ejercicio(m.ej).nombre)}: <b class="cifra">${kg(m.top.peso)} × ${m.top.reps}</b>. ¡Fuerte marca!`;
  } else if (r.mejor) {
    const m = r.mejor; const nombre = esc(G.ejercicio(m.ej).nombre);
    fino = m.delta != null && m.delta > 0.05 ? `${nombre}: <b class="cifra">${kg(m.top.peso)} × ${m.top.reps}</b>. Un fisco más fuerte.`
      : `${nombre}: <b class="cifra">${kg(m.top.peso)} × ${m.top.reps}</b>. Se va asentando.`;
  } else fino = 'Primera vez: ya tienes punto de partida.';
  // La próxima: lo que propondría el planificador mañana (R15), sin datos inventados.
  let proxima = '';
  try { const m = G.sumarDias(s.fecha, 1); proxima = `Mañana, si vienes: ${planDeHoy(m, Date.parse(m + 'T18:00:00')).nombre.toLowerCase()}.`; } catch { /* sin plan */ }
  // Tres datos (G85): granos, minutos y marcas nuevas (si no hay marca, los ejercicios: nunca un «0» que suene a regaño).
  const tercero = marcas.length ? [marcas.length, marcas.length === 1 ? 'marca nueva' : 'marcas nuevas'] : [r.ejercicios, r.ejercicios === 1 ? 'ejercicio' : 'ejercicios'];

  const nodo = el(`<section class="hecho" aria-labelledby="titulo-hecho">
    <img class="sello" src="iconos/disco-sello-almagre.svg" alt="" width="250" height="250" style="transform:rotate(-90deg)">
    <p class="etiqueta">${esc(cuando[0].toUpperCase() + cuando.slice(1))} · ${esc(s.nombre)}</p>
    <h1 class="titulo-gigante hecho-titulo" id="titulo-hecho">Molienda hecha.</h1>
    <p class="titular hecho-lema">Hecho gofio.</p>
    <div class="hecho-cifras">
      <div><span class="cifra" data-n="${r.series}">${r.series}</span><p class="etiqueta">${r.series === 1 ? 'grano' : 'granos'}</p></div>
      <div><span class="cifra" data-n="${r.minutos}">${r.minutos}</span><p class="etiqueta">${r.minutos === 1 ? 'minuto' : 'minutos'}</p></div>
      <div><span class="cifra" data-n="${tercero[0]}">${tercero[0]}</span><p class="etiqueta">${tercero[1]}</p></div>
    </div>
    <div class="hecho-granos" role="img" aria-label="${r.series} granos: un grano, una serie">${Array.from({ length: r.series }, () => grano(true)).join('')}</div>
    <div class="sierra-hecho" aria-hidden="true"><svg width="100%" height="10"><defs><pattern id="ph" width="12" height="10" patternUnits="userSpaceOnUse"><path d="M0 10L6 2L12 10Z" fill="currentColor"/></pattern></defs><rect width="100%" height="10" fill="url(#ph)"/></svg><i></i></div>
    <div class="bloque"><h3>Lo más fino</h3><p>${fino}</p></div>
    ${proxima && !soloVer ? `<div class="bloque"><h3>La próxima</h3><p>${esc(proxima)}</p></div>` : ''}
    <div class="relleno" style="min-height:28px"></div>
    <div class="hecho-pie"><button class="boton oscuro" type="button" data-cerrar data-son="barrido">${soloVer ? 'Volver' : 'A casa'}</button></div>
  </section>`);

  nodo.querySelector('[data-cerrar]').onclick = () => { vibrar(); if (soloVer) nav.volver(); else nav.ir('hoy', {}, { modo: 'pestana' }); };

  return {
    nodo, clara: true, pestana: null, sinGesto: !soloVer,
    alEntrar() {
      const sello = nodo.querySelector('.sello');
      const quieto = reduceMovimiento() || soloVer;
      if (!soloVer) setTimeout(() => suena('hecho'), 260);
      // Si llegó una versión nueva durante el entreno, se ofrece ahora (G93).
      if (!soloVer && window.gofioPendiente) setTimeout(() => { const w = window.gofioPendiente; window.gofioPendiente = null; avisar('Hay versión nueva', { texto: 'Actualizar', fijo: true, hacer: () => w.postMessage('saltar') }); }, 2600);
      nodo.querySelectorAll('[data-n]').forEach((c) => contar(c, Number(c.dataset.n), quieto ? 0 : 900));
      if (quieto) { if (reduceMovimiento() && !soloVer) nodo.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 }); return; }
      // Se aclara a harina; el sello cae (140 ms, la única caída con aceleración) y se asienta con su golpe (220 ms).
      nodo.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 300, easing: 'ease-out' });
      sello.animate([
        { opacity: 0, transform: 'rotate(-130deg) scale(1.7)' },
        { opacity: 1, transform: 'rotate(-96deg) scale(.94)', offset: 0.39 },
        { opacity: 1, transform: 'rotate(-90deg) scale(1)' },
      ], { duration: 360, delay: 460, easing: 'cubic-bezier(.55,0,1,.45)', fill: 'backwards' });
      setTimeout(vibrar, 600);
      nodo.querySelector('.hecho-titulo').animate([{ transform: 'translateY(24px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, delay: 120, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
      nodo.querySelector('.hecho-lema').animate([{ transform: 'translateY(16px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, delay: 260, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
      nodo.querySelectorAll('.hecho-granos .grano').forEach((g, k) => g.animate(
        [{ transform: 'translateY(-14px)', opacity: 0 }, { transform: 'none', opacity: 1 }],
        { duration: 300, delay: 700 + k * 40, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' }));
      const fin = 700 + r.series * 40;
      nodo.querySelector('.sierra-hecho i').animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: 520, delay: fin, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
      escalonar(nodo.querySelectorAll('.bloque, [data-cerrar]'), { desde: fin + 300, retraso: 120 });
    },
  };
}
export { num };
