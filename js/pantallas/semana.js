// «Mi semana»: la era (lienzo: Semana.dc.html; G85). La semana es el suelo redondo donde se trillaba el grano:
// siete trozos, uno por día, con la muela en el centro y los granos de la semana. Debajo, dos frases, lo molido por
// músculo en granos con la franja 10-20 de R9, la constancia como ocho muelas (R23) y el zurrón.
import * as G from '../cerebro/index.js';
import { estado, ajuste, hoy, sesionesHechas, seriesHechas, seriesDe, resumen } from '../logica.js';
import { el, esc, kg, num, icono, hoja, granos, contar, reduceMovimiento, escalonar } from '../ui.js';
import { exportarCopia } from './ajustes.js';
import { marcasDe } from './hecho.js';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const NUMERO = ['Ninguna molienda', 'Una molienda', 'Dos moliendas', 'Tres moliendas', 'Cuatro moliendas', 'Cinco moliendas', 'Seis moliendas', 'Siete moliendas'];
const CON_ARTICULO = { pecho: 'el pecho', dorsal: 'la espalda', 'hombro-anterior': 'el hombro de delante', 'hombro-lateral': 'el hombro lateral',
  'hombro-posterior': 'el hombro de atrás', biceps: 'el bíceps', triceps: 'el tríceps', cuadriceps: 'el cuádriceps', isquios: 'los isquios',
  gluteo: 'el glúteo', gemelos: 'los gemelos', abdomen: 'el abdomen' };
const GRANO = 'M0 -82C55 -82 72 -22 64 22C56 64 29 82 0 82C-29 82 -56 64 -64 22C-72 -22 -55 -82 0 -82Z';
const HUECOS = 20; // un grano por serie fraccional, hasta 20 (la franja buena de R9 son los huecos 11-20)

/** Un trozo de la era: corona entre r1 y r2, de a0 a a1 grados (0 = arriba, sentido del reloj). */
function trozo(a0, a1, r1 = 66, r2 = 132) {
  const p = (a, r) => { const t = (a - 90) * Math.PI / 180; return `${(150 + r * Math.cos(t)).toFixed(1)} ${(150 + r * Math.sin(t)).toFixed(1)}`; };
  return `M${p(a0, r2)}A${r2} ${r2} 0 0 1 ${p(a1, r2)}L${p(a1, r1)}A${r1} ${r1} 0 0 0 ${p(a0, r1)}Z`;
}
const centroTrozo = (a, r = 99) => { const t = (a - 90) * Math.PI / 180; return [150 + r * Math.cos(t), 150 + r * Math.sin(t)]; };

export function semanaPantalla(_, nav) {
  const fecha = hoy();
  const lunes = G.lunesDe(fecha), domingo = G.sumarDias(lunes, 6);
  const hechas = sesionesHechas();
  const estaSemana = hechas.filter((s) => s.fecha >= lunes && s.fecha <= domingo);
  const seriesSemana = seriesHechas().filter((s) => s.fecha >= lunes && s.fecha <= domingo);
  const vol = G.volumen(seriesSemana.map((s) => ({ ejercicioId: s.ejercicioId })));
  const objetivo = G.volumenPlantilla(ajuste('plantilla'));
  const c = G.constancia(hechas.map((s) => s.fecha), fecha);

  // La era: los granos de cada día (una serie, un grano).
  const dias = G.LETRA_DIA.map((letra, i) => {
    const f = G.sumarDias(lunes, i);
    return { letra, f, granos: seriesSemana.filter((s) => s.fecha === f).length, hoy: f === fecha };
  });
  const totalGranos = seriesSemana.length;
  const ARCO = 360 / 7, HUECO = 4.4;
  const trozos = dias.map((d, i) => {
    const a0 = i * ARCO - ARCO / 2 + HUECO / 2, a1 = a0 + ARCO - HUECO;
    const [tx, ty] = centroTrozo(i * ARCO);
    const lleno = d.granos > 0;
    const color = lleno ? (d.hoy ? 'var(--almagre)' : 'var(--millo)') : 'var(--harina-2)';
    const texto = lleno
      ? `<text x="${tx.toFixed(1)}" y="${(ty + 8).toFixed(1)}" text-anchor="middle" class="cifra" font-size="22" fill="${d.hoy ? '#FFF6E8' : '#1B1917'}">${d.granos}</text>`
      : `<text x="${tx.toFixed(1)}" y="${(ty + 5).toFixed(1)}" text-anchor="middle" font-family="Hanken Grotesk" font-weight="700" font-size="13" fill="#6E6357">${d.letra}</text>`;
    return `<g class="trozo${lleno ? ' tocable' : ''}" data-dia="${d.f}" ${lleno ? 'role="button" tabindex="0"' : ''} aria-label="${G.NOMBRE_DIA[i]}: ${lleno ? `${d.granos} granos` : 'sin molienda'}">
      <path d="${trozo(a0, a1)}" fill="var(--harina-2)"/>${lleno ? `<path class="relleno-trozo" d="${trozo(a0, a1)}" fill="${color}"/>` : ''}${texto}</g>`;
  }).join('');
  const era = `<svg viewBox="0 0 300 300" role="img" aria-label="La era de la semana: ${dias.filter((d) => d.granos).map((d) => `${G.NOMBRE_DIA[dias.indexOf(d)]} ${d.granos} granos`).join(', ') || 'aún sin granos'}">
    ${trozos}
    <g class="centro"><circle cx="150" cy="150" r="56" fill="#1B1917"/><circle cx="150" cy="150" r="49" fill="none" stroke="#E3A62B" stroke-width="2"/>
    <circle cx="150" cy="122" r="3" fill="#E3A62B"/></g>
    <text x="150" y="160" text-anchor="middle" class="cifra" font-size="40" fill="#E3A62B" data-total>${totalGranos}</text>
    <text x="150" y="180" text-anchor="middle" font-family="Hanken Grotesk" font-weight="700" font-size="10" fill="#A89D8F">GRANOS</text></svg>`;

  // Dos frases que dicen lo importante (G85), sin culpa: el puntal (la mayor marca nueva, R11) y lo que va corto (R9).
  let puntal = null;
  for (const s of estaSemana) for (const m of marcasDe(s)) if (!puntal || m.delta > puntal.delta) puntal = m;
  let corto = null, peor = 0;
  for (const m of G.IDS_MUSCULOS) {
    if (!(objetivo[m] > 0)) continue;
    const falta = 1 - vol[m] / objetivo[m];
    if (falta > peor) { peor = falta; corto = m; }
  }
  const frases = [];
  if (puntal) frases.push(`<div class="frase-semana">${icono('marca', 'style="color:var(--almagre)"')}<span><b>Puntal de la semana:</b> ${esc(G.ejercicio(puntal.ej).nombre.toLowerCase())}, ${kg(puntal.top.peso)} × ${puntal.top.reps}.</span></div>`);
  if (estaSemana.length && corto && peor >= 0.5) {
    frases.push(`<div class="frase-semana">${icono('progreso')}<span><b>Va corto:</b> ${CON_ARTICULO[corto]}, ${vol[corto] === 0 ? 'aún a cero' : `${num(vol[corto])} de ${num(objetivo[corto])}`}.</span></div>`);
  }

  // Lo molido por músculo, en granos: llenos = series fraccionales; medio grano si el músculo solo ayuda (R9).
  const orden = G.MUSCULOS.slice().sort((a, b) => vol[b[0]] - vol[a[0]]);
  const filas = orden.map(([m, nombre]) => {
    const v = vol[m];
    const huecos = Array.from({ length: HUECOS }, (_, k) => {
      const est = v >= k + 1 ? 'lleno' : v >= k + 0.5 ? 'medio' : 'vacio';
      const g = est === 'medio'
        ? `<svg class="grano" viewBox="-80 -92 160 184" aria-hidden="true"><defs><clipPath id="mg-${m}"><rect x="-90" y="-100" width="90" height="200"/></clipPath></defs><path class="vacio" transform="rotate(-14)" d="${GRANO}"/><path class="medio" clip-path="url(#mg-${m})" transform="rotate(-14)" d="${GRANO}"/></svg>`
        : `<svg class="grano" viewBox="-80 -92 160 184" aria-hidden="true"><path class="${est}" transform="rotate(-14)" d="${GRANO}"/></svg>`;
      return `<span class="${k >= G.FRANJA.min ? 'franja' : ''}">${g}</span>`;
    }).join('');
    return `<li><span class="m">${esc(nombre)}</span><span class="fila-granos">${huecos}</span><b class="n cifra">${num(v)}</b></li>`;
  }).join('');
  const tablaAccesible = orden.map(([m, n]) => `${n}: ${num(vol[m])}`).join('; ');

  // Constancia (R23): ocho muelas, una por semana; sin rachas.
  const muelas = c.semanas.map((w, k) => {
    const esta = k === c.semanas.length - 1;
    return `<div><b class="cifra${w.dias ? '' : ' vacia'}${esta ? ' esta' : ''}">${w.dias || ''}</b><span>${esta ? 'esta' : k - c.semanas.length + 1}</span></div>`;
  }).join('');

  // El zurrón: los domingos, o si la última copia tiene más de 7 días (06-tecnica.md, punto 4).
  const ultima = ajuste('ultimaCopia');
  const diasCopia = ultima ? G.diasEntre(ultima.slice(0, 10), fecha) : Infinity;
  const recordar = ajuste('recordatorio') && hechas.length > 0 && ((G.diaSemana(fecha) === 6 && diasCopia > 0) || diasCopia > 7);

  const mesL = MESES[Number(lunes.slice(5, 7)) - 1], mesD = MESES[Number(domingo.slice(5, 7)) - 1];
  const nodo = el(`<section class="semana" aria-labelledby="titulo-semana">
    <div class="semana-encabezado">
      <p class="etiqueta">Del ${Number(lunes.slice(8))}${mesL === mesD ? '' : ` de ${mesL}`} al ${Number(domingo.slice(8))} de ${mesD}</p>
      <h1 class="titular" id="titulo-semana">${NUMERO[estaSemana.length] ?? `${estaSemana.length} moliendas`}.<br>${estaSemana.length ? 'Va sumando.' : 'Aún hay tiempo.'}</h1>
    </div>
    <div class="era">${era}</div>
    <p class="era-pie">La era de la semana: cada día, lo que moliste.</p>
    ${frases.length ? `<div class="frases-semana">${frases.join('')}</div>` : ''}
    <div class="molido-cab"><h2>Lo molido por músculo</h2><span>un grano, una serie · <mark>lo bueno ${G.FRANJA.min}-${G.FRANJA.max}</mark></span></div>
    <ul class="molido" role="img" aria-label="Series por músculo esta semana: ${tablaAccesible}">${filas}</ul>
    <p class="molido-pie">Si el músculo solo ayuda, cuenta medio grano.</p>
    <h2 class="constancia-titulo">Constancia</h2>
    <div class="muelas" role="img" aria-label="Días entrenados en las últimas 8 semanas: ${c.semanas.map((w) => w.dias).join(', ')}">${muelas}</div>
    <p class="constancia-pie">${c.conEntreno} de ${c.total} semanas moliendo. Una floja no borra nada.</p>
    ${recordar ? `<div class="zurron-semana"><span>¿Lo guardamos en el zurrón?</span><button type="button" data-copia>Guardar</button></div>` : ''}
  </section>`);

  nodo.querySelector('[data-copia]')?.addEventListener('click', async () => { await exportarCopia(); nav.refrescar(); });
  nodo.querySelectorAll('.trozo.tocable').forEach((t) => {
    const abrir = () => detalleDia(t.dataset.dia, nav);
    t.addEventListener('click', abrir);
    t.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); } });
  });

  return {
    nodo, clara: true, pestana: 'semana',
    alEntrar({ refresco } = {}) {
      const total = nodo.querySelector('[data-total]');
      if (refresco || reduceMovimiento()) { if (!refresco) nodo.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 }); return; }
      // La era se arma trozo a trozo girando (60 ms entre trozos); los días hechos se llenan de millo.
      nodo.querySelectorAll('.trozo').forEach((t, k) => {
        t.animate([{ transform: 'rotate(-40deg) scale(.6)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 520, delay: 80 + k * 60, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
        t.querySelector('.relleno-trozo')?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 360, delay: 520 + k * 60, easing: 'ease-out', fill: 'backwards' });
      });
      // La muela del centro da un cuarto de vuelta mientras el número cuenta.
      nodo.querySelector('.era .centro').animate([{ transform: 'rotate(-90deg)' }, { transform: 'rotate(0deg)' }], { duration: 1100, delay: 200, easing: 'cubic-bezier(.77,0,.175,1)', fill: 'backwards' });
      contarSvg(total, totalGranos, 1100);
      escalonar(nodo.querySelectorAll('.frase-semana'), { desde: 700, retraso: 90 });
      // Lo que está más abajo se anima al entrar en pantalla: las filas se llenan de izquierda a derecha,
      // las ocho muelas llegan rodando desde la derecha y el zurrón late una vez.
      const vista = new IntersectionObserver((xs) => xs.forEach((x) => {
        if (!x.isIntersecting) return; vista.unobserve(x.target);
        if (x.target.classList.contains('molido')) {
          x.target.querySelectorAll('li').forEach((li, f) => li.querySelectorAll('.lleno, .medio').forEach((g, k) => g.closest('svg').animate(
            [{ transform: 'scale(.2)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 260, delay: f * 30 + k * 22, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' })));
        } else if (x.target.classList.contains('muelas')) {
          x.target.querySelectorAll('b').forEach((b, k) => b.animate([{ transform: 'translateX(70px) rotate(200deg)', opacity: 0 }, { transform: 'none', opacity: 1 }],
            { duration: 560, delay: k * 50, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }));
        } else {
          x.target.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.04)' }, { transform: 'scale(1)' }], { duration: 420, delay: 120, easing: 'cubic-bezier(.34,1.56,.64,1)' });
        }
      }), { root: nodo, threshold: 0.25 });
      nodo.querySelectorAll('.molido, .muelas, .zurron-semana').forEach((n) => vista.observe(n));
    },
  };
}

/** Cuenta un número dentro del SVG (como `contar`, pero sobre un <text>). */
function contarSvg(nodo, hasta, ms) { contar(nodo, hasta, ms); }

/** Lo molido un día: sus ejercicios y series (se abre al tocar un trozo de la era). */
function detalleDia(f, nav) {
  const ses = sesionesHechas().filter((s) => s.fecha === f);
  if (!ses.length) return;
  const s = ses.at(-1);
  const ss = ses.flatMap((x) => seriesDe(x.id));
  const porEj = [...new Set(ss.map((x) => x.ejercicioId))].map((ej) => {
    const xs = ss.filter((x) => x.ejercicioId === ej);
    return `<li style="padding:10px 0;border-bottom:1px solid var(--harina-2)"><b>${esc(G.ejercicio(ej).nombre)}</b> ${granos(xs.length, xs.length)}
      <span class="sub num" style="display:block">${xs.map((x) => `${kg(x.peso)} × ${x.reps} (te quedaban ${x.rir === 4 ? '4+' : x.rir})`).join(' · ')}</span></li>`;
  }).join('');
  const r = resumen(s);
  const { nodo } = hoja(`<h2>${esc(ses.map((x) => x.nombre).join(' + '))}</h2><p class="sub">${ss.length} granos · ${r.minutos} min</p><ul class="opciones">${porEj}</ul>
    <div class="botones"><button class="boton plano" type="button" data-ver>Ver la molienda</button></div>`, { clara: true });
  nodo.querySelector('[data-ver]').onclick = () => { document.querySelector('.hoja-fondo')?.click(); nav.ir('hecho', { sesionId: s.id, soloVer: true }); };
}
export { estado };
