// La comida (v0.3 · Comida y peso; tablero 20, G126): la pella del día, tu peso, lo que comiste por momentos y
// «Apuntar comida». Las hojas: tu peso de hoy, «¿Esmayado?», la ración (por gramos, por medida o por tamaño) y
// tus números. Las cuentas son del cerebro (R1-R8, R17, R31); aquí solo se pintan.
import * as G from '../cerebro/index.js';
import { ajuste, hoy } from '../logica.js';
import { el, esc, num, icono, hoja, avisar, vibrar, pop, escalonar, reduceMovimiento, pedirNumero, confirmar, contar } from '../ui.js';
import * as S from '../sonidos.js';
import * as C from '../comida/cocina.js';
import { dibujo } from '../comida/dibujos.js';
import { pella, amasar, granos10, caerGranos, chispa } from '../comida/piezas.js';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const fechaLarga = (f) => `${DIAS[G.diaSemana(f)]} ${Number(f.slice(8))} de ${MESES[Number(f.slice(5, 7)) - 1]}`;
const miles = (x) => String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const kgTxt = (x) => num(x, 1);
export const EXTRA = {
  codigo: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 4h2v16H3zM6.5 4h1v16h-1zM9 4h2.5v16H9zM13 4h1v16h-1zM15.5 4h2.5v16h-2.5zM19.5 4h1.5v16h-1.5z"/></svg>',
  foto: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M8.5 4h7l1.6 2.5H21v13.5H3V6.5h3.9zM12 9a4.2 4.2 0 1 0 0 8.4A4.2 4.2 0 0 0 12 9z"/></svg>',
  borrar: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5h13v14H8l-6-7zm3.4 3.6L10 10l2 2l-2 2l1.4 1.4l2-2l2 2l1.4-1.4l-2-2l2-2l-1.4-1.4l-2 2z"/></svg>',
};
const IC = (n) => EXTRA[n] ?? icono(n);
const MOMENTO_FRASE = { desayuno: 'el desayuno', almuerzo: 'el almuerzo', cena: 'la cena', entre: 'entre horas' };
const momentoAhora = () => G.momentoPorHora(new Date().getHours());
/** 1, 1½, 2… */
export const cantidadTxt = (x) => { const e = Math.floor(x), m = x - e > 0.25 && x - e < 0.75; return `${e || (m ? '' : '0')}${m ? '½' : ''}`; };

// ── La pantalla ──────────────────────────────────────────
export function comidaPantalla(params = {}, nav) {
  const fecha = params.fecha ?? hoy();
  const esHoy = fecha === hoy();
  const nodo = el('<section class="comida col"></section>');
  let antes = null; // { kcalFrac, protFrac } para animar

  function pintar(animar = false) {
    const sn = C.sinNumeros();
    const t = C.totalesDe(fecha);
    const o = C.objetivos(fecha);
    const g = o.gasto;
    const protMeta = o.prot?.objetivo ?? null;
    const protFrac = protMeta ? t.prot / protMeta : 0;
    const kcalRef = o.kcal?.centro ?? o.inicial?.medio ?? 2600;
    const kcalFrac = t.kcal / kcalRef;
    // El titular: lo que más ayuda ahora, sin regañar nunca.
    let tit;
    if (!esHoy) tit = comidasDia().length ? 'Lo que <em>comiste.</em>' : 'Nada <em>apuntado.</em>';
    else if (sn) tit = protMeta && t.prot >= protMeta ? 'Vas bien de <em>proteína.</em>' : 'A por la <em>proteína.</em>';
    else if (!g.listo) tit = 'Come como siempre <em>y apúntalo.</em>';
    else if (protMeta && t.prot < protMeta) tit = `Faltan <em>${Math.round(protMeta - t.prot)} g</em> de proteína.`;
    else if (o.kcal && t.kcal < o.kcal.min) tit = `Te quedan <em>${miles(o.kcal.centro - t.kcal)} kcal.</em>`;
    else tit = 'Hoy, <em>en tu sitio.</em>';

    const ant = G.sumarDias(fecha, -1), sig = G.sumarDias(fecha, 1);
    const cab = `<p class="c-fecha"><button class="c-dia-flecha" type="button" data-dia="${ant}" aria-label="Día anterior">${icono('atras')}</button>${esHoy ? 'Hoy · ' : ''}${fechaLarga(fecha)}<button class="c-dia-flecha" type="button" data-dia="${sig}" aria-label="Día siguiente" ${esHoy ? 'disabled' : ''}>${icono('sigue')}</button></p><h1 class="c-tit">${tit}</h1>`;

    const prot = `<div class="c-prot"><span class="c-et">Proteína</span>${sn ? '' : `<div class="c-g">${Math.round(t.prot)} <span>${protMeta ? `de ${protMeta} g` : 'g'}</span></div>`}${granos10(protFrac)}${sn ? `<span class="c-macros">${protFrac >= 1 ? 'Llegaste.' : protFrac >= 0.6 ? 'Te queda un buen plato.' : 'Que no falte en la próxima comida.'}</span>` : `<span class="c-macros">Hidratos ${t.hc} g · Grasa ${t.grasa} g</span>`}</div>`;
    const bola = sn ? '' : pella(kcalFrac, miles(t.kcal), o.kcal ? `de ${miles(o.kcal.centro)} kcal` : esHoy ? 'kcal hoy' : 'kcal');
    const pellaCard = `<div class="c-pella">${bola}${prot}</div>`;

    // Mientras Gofio aprende tu gasto (R2): cuántos días lleva.
    let aprende = '';
    if (!g.listo && !sn) {
      const hechos = Math.min(14, Math.max(0, 14 - g.faltanDias));
      aprende = `<div class="c-olla" style="margin-top:12px"><span class="c-et">Tu gasto real</span>
        <p class="c-nota" style="margin:6px 0 0"><b>Aún no hay datos.</b> Gofio lo aprende con tu peso y lo que comes: ${hechos} de 14 días${g.faltanPesajes ? ` y ${10 - g.faltanPesajes} de 10 pesajes` : ''}.</p>
        <div class="c-aprende">${Array.from({ length: 14 }, (_, k) => `<i class="${k < hechos ? 'si' : ''}"></i>`).join('')}</div></div>`;
    } else if (g.listo && !sn && esHoy && o.kcal?.subido) {
      aprende = `<div class="c-olla" style="margin-top:12px"><p class="c-nota" style="margin:0"><b>Bajas más deprisa de lo sano.</b> Gofio te sube ${o.kcal.subido} kcal al día.</p></div>`;
    }
    if (sn && esHoy) {
      const sem = C.semanaComida(G.lunesDe(fecha));
      aprende = `<div class="c-olla" style="margin-top:12px"><span class="c-et">Esta semana</span><p class="c-nota" style="margin:6px 0 2px"><b>Apuntaste ${sem.apuntados} de 7 días.</b> Con eso Gofio ajusta lo tuyo, sin enseñarte números.</p></div>`;
    }

    // Tu peso (R17).
    let peso = '';
    if (!sn) {
      const tend = G.tendencia(C.pesajes());
      const ult = tend.slice(-21);
      const hoyP = C.pesoDe(fecha);
      if (!tend.length) {
        peso = `<button class="c-peso" type="button" data-pesar style="width:100%;text-align:left"><span><span class="c-et">Tu peso</span><div class="c-kg" style="font-size:30px">Pésate <span>al levantarte</span></div><div class="c-sub">Cada mañana, tras ir al baño y antes de comer.</div></span></button>`;
      } else {
        const r = C.ritmoAhora(fecha);
        const ritmo = r.kgSemana == null ? `Sin ritmo aún: ${r.n} de 10 pesajes`
          : `<span class="c-ritmo">${r.estable ? `${icono('igual')}Se mantiene` : r.kgSemana > 0 ? `${icono('sube')}+${num(r.kgSemana, 2)} kg/sem` : `${icono('baja')}${num(r.kgSemana, 2)} kg/sem`}</span>`;
        const t2 = tend.filter((x) => x.fecha <= fecha).at(-1) ?? tend.at(-1);
        peso = `<button class="c-peso" type="button" data-peso style="width:100%;text-align:left"><span><span class="c-et">Tu peso</span><div class="c-kg" data-kg>${kgTxt(t2.tendencia)} <span>kg</span></div><div class="c-sub">${ritmo}${hoyP ? ` · hoy ${kgTxt(hoyP.kg)}` : esHoy ? ' · <b>pésate</b>' : ''}</div></span>${chispa(ult)}</button>`;
      }
    }

    // Lo que comiste, por momentos.
    const cs = comidasDia();
    const mom = G.MOMENTOS.filter((m) => m !== 'entre' || cs.some((c) => c.momento === 'entre')).map((m) => {
      const xs = cs.filter((c) => c.momento === m);
      const tt = G.redondear(G.sumar(xs));
      return `<div class="c-mom"><h3>${G.NOMBRE_MOMENTO[m]} <span>${xs.length && !sn ? `${miles(tt.kcal)} kcal · ${tt.prot} g` : ''}</span></h3>${xs.length ? xs.map((c) => `<button class="c-item" type="button" data-comida="${c.id}"><span class="c-dib">${dibujo(c.dib, { tam: 36 })}</span><span class="c-txt"><b>${esc(c.nombre)}</b><small>${esc(c.medida ?? `${c.gramos} g`)}</small></span>${sn ? '' : `<span class="c-der"><b>${miles(c.kcal)}</b> kcal · ${Math.round(c.prot)} g</span>`}</button>`).join('') : '<div class="c-vacio">Aún nada en el fogal.</div>'}</div>`;
    }).join('');
    const medias = cs.length ? `<button class="c-medias" type="button" data-medias aria-pressed="${C.aMedias(fecha)}"><i>${icono('check')}</i><span>Me dejé algo sin apuntar${C.aMedias(fecha) ? '. Este día no cuenta para tu gasto.' : ''}</span></button>` : '';

    nodo.innerHTML = `${cab}${pellaCard}${aprende}${peso}${mom}${medias}<div class="c-pie"><button class="boton" type="button" data-apuntar data-son="none">${IC('comida')}Apuntar comida</button></div>`;
    conectar();
    if (animar && antes) {
      amasar(nodo.querySelector('.c-bola'), antes.kcalFrac, kcalFrac);
      caerGranos(nodo.querySelector('.c-granos'), antes.protFrac, protFrac);
      const b = nodo.querySelector('.c-bola b'); if (b && !reduceMovimiento()) { const fin = b.textContent; contarMiles(b, antes.kcal, t.kcal, fin); }
    }
    antes = { kcalFrac, protFrac, kcal: t.kcal };
  }
  const comidasDia = () => C.comidasDe(fecha).sort((a, b) => a.ts - b.ts);

  function conectar() {
    nodo.querySelectorAll('[data-dia]').forEach((b) => b.addEventListener('click', () => { vibrar(); nav.reemplazar('comida', { fecha: b.dataset.dia === hoy() ? undefined : b.dataset.dia }, { sinAnimacion: true }); }));
    nodo.querySelector('[data-apuntar]').addEventListener('click', (e) => { pop(e.currentTarget, 1.04); S.toque(0); esmayado({ fecha, alApuntar: () => pintar(true), nav }); });
    nodo.querySelector('[data-pesar]')?.addEventListener('click', () => pesarse({ fecha, alGuardar: () => pintar() }));
    nodo.querySelector('[data-peso]')?.addEventListener('click', () => nav.ir('peso', {}));
    nodo.querySelector('[data-medias]')?.addEventListener('click', async (e) => {
      vibrar(); await C.marcarAMedias(fecha, !C.aMedias(fecha)); pintar();
    });
    nodo.querySelectorAll('[data-comida]').forEach((b) => b.addEventListener('click', () => {
      const c = C.comidasDe(fecha).find((x) => x.id === b.dataset.comida); if (!c) return;
      racion(C.alimentoPorRef(c.ref) ?? { id: c.ref, nombre: c.nombre, dib: c.dib, por100: c.por100, fuente: '' }, { fecha, comida: c, alApuntar: () => pintar(true) });
    }));
  }
  pintar();
  C.cargarBase().catch(() => {});
  return {
    nodo, pestana: 'comida', clara: true,
    alEntrar(o) {
      escalonar(nodo.children, { desde: 40, retraso: 35 });
      // La pestaña Comida (tablero 21): la olla del icono da un saltito, una vez.
      if (!o?.refresco && !reduceMovimiento()) document.querySelector('#pestanas [data-p="comida"] svg')?.animate([{ transform: 'none' }, { transform: 'translateY(-5px)', offset: 0.4 }, { transform: 'translateY(1px)', offset: 0.75 }, { transform: 'none' }], { duration: 420, delay: 120, easing: 'ease-out' });
      if (params.pesar) pesarse({ fecha, alGuardar: () => pintar() });
    },
  };
}
function contarMiles(b, de, a, fin) {
  const t0 = performance.now(), ms = 650;
  const paso = (t) => { const k = Math.min(1, (t - t0) / ms); b.textContent = miles(de + (a - de) * (1 - (1 - k) ** 3)); if (k < 1) requestAnimationFrame(paso); else b.textContent = fin; };
  requestAnimationFrame(paso);
}

// ── Tu peso de hoy (teclado propio: no salta el del sistema) ─────
export function pesarse({ fecha = hoy(), alGuardar } = {}) {
  const previo = C.pesoDe(fecha);
  let txt = previo ? String(previo.kg).replace('.', ',') : '';
  const teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'borrar'];
  const { nodo, cerrar } = hoja(`<h2>Tu peso${fecha === hoy() ? ' de hoy' : ` del ${Number(fecha.slice(8))}`}</h2><p class="sub">Al levantarte, tras ir al baño y antes de comer. Siempre la misma báscula.</p>
    <div class="c-kg-grande"><b class="cifra" data-v></b><span>kg</span></div>
    <div class="c-teclado">${teclas.map((x) => `<button type="button" data-t="${x}" data-son="0" aria-label="${x === 'borrar' ? 'Borrar' : x}">${x === 'borrar' ? IC('borrar') : x}</button>`).join('')}</div>
    <div class="botones"><button class="boton" type="button" data-guardar data-son="none">Guardar</button>${previo ? '<button class="boton plano" type="button" data-quitar>Quitar este pesaje</button>' : ''}</div>`);
  const v = nodo.querySelector('[data-v]');
  const ver = () => { v.textContent = txt || (previo ? '' : '0'); v.classList.toggle('vacio', !txt); if (!txt) v.textContent = '—'; };
  ver();
  nodo.querySelectorAll('[data-t]').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.t; vibrar();
    if (k === 'borrar') txt = txt.slice(0, -1);
    else if (k === ',') { if (!txt.includes(',')) txt = (txt || '0') + ','; }
    else if (txt.length < 6 && !(txt.includes(',') && txt.split(',')[1].length >= 1)) txt += k;
    ver(); if (!reduceMovimiento()) pop(v, 1.04);
  }));
  nodo.querySelector('[data-guardar]').addEventListener('click', async () => {
    const kg = parseFloat(txt.replace(',', '.'));
    if (!(kg >= 25 && kg <= 350)) { avisar('Ese peso no parece bien.'); return; }
    await C.apuntarPeso(kg, fecha);
    S.suena('pesaje'); vibrar();
    cerrar(); alGuardar?.(kg);
  });
  nodo.querySelector('[data-quitar]')?.addEventListener('click', async () => { await C.borrarPeso(fecha); cerrar(); alGuardar?.(null); });
}

// ── ¿Esmayado? (buscar y apuntar) ────────────────────────
/**
 * modo 'comer': apuntar algo del día. modo 'ingrediente': elegir algo para una olla (devuelve el alimento).
 */
export function esmayado({ fecha = hoy(), momento = null, modo = 'comer', alApuntar, alElegir, nav } = {}) {
  const mom = momento ?? momentoAhora();
  const comer = modo === 'comer';
  const fila = (a, sub, der) => `<li data-ref="${esc(a.id)}"><span class="c-dib">${dibujo(a.dib, { tam: 34 })}</span><span><b>${esc(a.nombre)}</b><small>${esc(sub)}</small></span><span class="c-r">${der}</span></li>`;
  const kcalDe = (a, g) => `${Math.round((a.por100.kcal ?? 0) * g / 100)} kcal`;
  const subDe = (a) => [C.FUENTE[a.fuente], a.marca].filter(Boolean).join(' · ');
  const { nodo, cerrar } = hoja(`<h2>${comer ? '¿Esmayado?' : 'Añadir ingrediente'}</h2><p class="sub">${comer ? `Apunta lo que comes. Para ${MOMENTO_FRASE[mom]}.` : 'En crudo, con su peso.'}</p>
    <label class="c-buscar">${icono('lista')}<input type="search" enterkeyhint="search" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="Busca: arroz, pollo, tu olla…" aria-label="Buscar alimento"></label>
    <div data-res></div>
    <div data-inicio>${comer ? `<div class="c-acciones">
      <button class="c-acc" type="button" data-acc="escanear">${IC('codigo')}<span>Escanear<br><small>El código de barras</small></span></button>
      <button class="c-acc" type="button" data-acc="foto">${IC('foto')}<span>Foto de la etiqueta<br><small>Lee la tabla nutricional</small></span></button>
      <button class="c-acc" type="button" data-acc="olla">${IC('comida')}<span>Nueva olla<br><small>Una receta de casa</small></span></button>
      <button class="c-acc" type="button" data-acc="nuevo">${IC('mas')}<span>Nuevo alimento<br><small>Con tus números</small></span></button></div>` : ''}
      <div data-listas></div></div>`);
  nodo.querySelector('.c-buscar input').removeAttribute('autofocus');
  const listas = nodo.querySelector('[data-listas]');
  const pintarListas = () => {
    const ollas = comer ? [...C.misCosas().filter((a) => a.olla)].sort((a, b) => (C.usos()[b.id] ?? 0) - (C.usos()[a.id] ?? 0)).slice(0, 5) : [];
    const ult = C.loUltimo(6).filter((x) => comer || !x.a.olla);
    listas.innerHTML = `${ollas.length ? `<p class="c-h3">Tus ollas</p><ul class="c-lista">${ollas.map((a) => { const m = a.olla.medidas?.[0]; const g = m?.g ?? C.gramosRacion(a.olla) ?? 100; return fila(a, m ? `${m.nombre} · ${Math.round(g)} g` : a.olla.raciones ? '1 ración' : '100 g', kcalDe(a, g)); }).join('')}</ul>` : ''}
      ${ult.length ? `<p class="c-h3">Lo último</p><ul class="c-lista">${ult.map((x) => fila(x.a, [subDe(x.a), x.medida].filter(Boolean).join(' · '), kcalDe(x.a, x.gramos ?? 100))).join('')}</ul>` : comer ? '<p class="c-nada">Busca lo que comiste: está todo BEDCA, comida colombiana de la TCAC y lo que tú añadas.</p>' : ''}`;
  };
  pintarListas();
  const res = nodo.querySelector('[data-res]'), inicio = nodo.querySelector('[data-inicio]');
  const input = nodo.querySelector('.c-buscar input');
  let ultimo = [];
  let enLinea = []; // lo encontrado en Open Food Facts para esta búsqueda
  const pintarRes = () => {
    const q = input.value;
    if (!q.trim()) { res.innerHTML = ''; inicio.hidden = false; return; }
    inicio.hidden = true;
    if (!C.baseCargada()) { res.innerHTML = '<p class="c-nada">Abriendo la despensa…</p>'; C.cargarBase().then(pintarRes).catch(() => { res.innerHTML = '<p class="c-nada">No se pudo abrir la base de alimentos.</p>'; }); return; }
    if (C.SUPER && !C.superCargado() && !cargandoSuper) { cargandoSuper = true; C.cargarSuper().then(() => { cargandoSuper = false; pintarRes(); }).catch(() => { cargandoSuper = 'no'; }); }
    ultimo = [...C.buscar(q), ...enLinea.filter((x) => !C.alimentoPorRef(x.id))];
    const fila2 = (a) => fila(a, subDe(a), `${Math.round(a.por100.kcal)} kcal<br><small>100 g</small>`);
    const cargando = cargandoSuper === true ? '<p class="c-nada" style="padding:8px 0">Trayendo los productos del súper…</p>' : '';
    const enOFF = q.trim().length >= 3 ? `<button class="c-anadir" type="button" data-off style="color:var(--millo)">${icono('lista')}Buscar «${esc(q.trim())}» en Open Food Facts</button><p class="c-nota" style="margin:-6px 0 8px;color:var(--piedra);font-size:12px">Solo viaja lo que has escrito.</p>` : '';
    res.innerHTML = ultimo.length ? `${cargando}<ul class="c-lista">${ultimo.map(fila2).join('')}</ul>${enOFF}<button class="c-anadir" type="button" data-crear>${icono('mas')}Crear «${esc(q.trim())}» con tus números</button>`
      : `${cargando}<p class="c-nada">Nada con «${esc(q)}».</p>${enOFF}<button class="c-anadir" type="button" data-crear>${icono('mas')}Crear «${esc(q.trim())}» con tus números</button>`;
    res.querySelector('[data-crear]')?.addEventListener('click', () => { cerrar(); nuevoAlimento({ nombre: q.trim(), alGuardar: (a) => seguir(a) }); });
    res.querySelector('[data-off]')?.addEventListener('click', async (e) => {
      const b = e.currentTarget; b.disabled = true; b.textContent = 'Buscando en Open Food Facts…'; vibrar();
      try {
        const xs = await C.buscarEnOFF(q);
        enLinea = xs;
        if (!xs.length) { avisar('Open Food Facts no tiene nada con ese nombre.'); }
        pintarRes();
        if (xs.length) S.suena('leido');
      } catch { b.disabled = false; b.textContent = 'Sin conexión o muy seguido. Prueba en un momento.'; }
    });
  };
  let cargandoSuper = false, espera = null;
  input.addEventListener('input', () => { enLinea = []; clearTimeout(espera); espera = setTimeout(pintarRes, 90); });
  const elegir = async (ref) => {
    let a = ultimo.find((x) => x.id === ref) ?? C.alimentoPorRef(ref) ?? C.loUltimo(20).find((x) => x.a.id === ref)?.a;
    if (!a) return;
    // Lo que llega de internet se guarda como tuyo: la próxima vez está sin conexión.
    if (enLinea.includes(a)) { const g = await C.guardarAlimento({ nombre: a.nombre, marca: a.marca, codigo: a.codigo, fuente: 'off', dib: 'envase', por100: a.por100, medidas: a.medidas ?? [] }); a = { ...g, mio: true }; }
    vibrar(); cerrar(); seguir(a);
  };
  const seguir = (a) => {
    if (comer) racion(a, { fecha, momento: mom, alApuntar });
    else alElegir?.(a);
  };
  nodo.addEventListener('click', (e) => {
    const li = e.target.closest('[data-ref]'); if (li) { elegir(li.dataset.ref); return; }
    const acc = e.target.closest('[data-acc]')?.dataset.acc; if (!acc) return;
    cerrar();
    if (acc === 'escanear') nav?.ir('escanear', { fecha, momento: mom });
    else if (acc === 'olla') nav?.ir('olla', {});
    else if (acc === 'nuevo') nuevoAlimento({ alGuardar: (a) => seguir(a) });
    else if (acc === 'foto') import('../comida/etiqueta.js').then((m) => m.fotoEtiqueta({ alGuardar: (a) => seguir(a) }));
  });
}

// ── La ración: por medida, por tamaño o en gramos ────────
export function racion(a, { fecha = hoy(), momento = null, comida = null, alApuntar } = {}) {
  const sn = C.sinNumeros();
  const p = a.por100;
  // Las formas de medir: las de la olla, los tamaños (USDA) o una ración; siempre «Gramos».
  const medidas = [];
  if (a.olla) {
    for (const m of a.olla.medidas ?? []) medidas.push({ id: 'm' + medidas.length, nombre: m.nombre, g: m.g, uno: m.nombre.toLowerCase(), varios: m.nombre.toLowerCase() });
    const gr = C.gramosRacion(a.olla);
    if (!a.olla.pesoCocinado && gr) medidas.push({ id: 'racion', nombre: 'Ración', g: gr, uno: 'ración', varios: 'raciones', sinGramos: true });
  }
  const tam = C.tamanosDe(a);
  // G135 · Tus medidas (las de cualquier alimento, pesadas una vez) y la ración que trae la etiqueta del producto.
  const plural = (u) => (/ón$/.test(u) ? u.replace(/ón$/, 'ones') : /s$/.test(u) ? u : u.split(' ').map((w, k) => (k === 0 || /[aeiouáéíóú]$/.test(w) ? w + 's' : w)).join(' '));
  for (const m of C.medidasDe(a)) medidas.push({ id: 'mm' + medidas.length, nombre: m.nombre, g: m.g, uno: m.nombre.toLowerCase(), varios: plural(m.nombre.toLowerCase()), mia: true });
  if (tam) {
    if (tam.una) medidas.push({ id: 'una', nombre: tam.u[0].toUpperCase() + tam.u.slice(1), g: tam.una, uno: tam.u, varios: plural(tam.u), tam: true });
    else if (tam.tallas) tam.tallas.forEach((t, k) => { const id = ['p', 'm', 'g'][k]; medidas.push({ id, nombre: t[0].toUpperCase() + t.slice(1), g: tam[id], uno: `${tam.u} ${t}`, varios: plural(`${tam.u} ${t}`), tam: true }); });
    else for (const [k, n1, n2] of [['p', 'Pequeña', 'pequeñas'], ['m', 'Mediana', 'medianas'], ['g', 'Grande', 'grandes']]) medidas.push({ id: k, nombre: n1, g: tam[k], uno: n1.toLowerCase(), varios: n2, tam: true });
  }
  const soloRaciones = a.olla && !a.olla.pesoCocinado;
  if (!soloRaciones) medidas.push({ id: 'gramos', nombre: 'Gramos', g: 1 });
  // Lo que había (al editar) o la primera medida.
  let med = medidas[0], cant = 1;
  if (comida) {
    const previa = medidas.find((m) => m.id !== 'gramos' && comida.medida?.includes(m.uno));
    if (previa) { med = previa; cant = Math.round(comida.gramos / previa.g * 2) / 2 || 1; } else { med = medidas.at(-1); cant = comida.gramos; }
  } else if (med.id === 'gramos') cant = 100;
  if (tam && !comida && !tam.una && !medidas.some((m) => m.mia)) { med = medidas.find((m) => m.id === 'm'); }
  let mom = comida?.momento ?? momento ?? momentoAhora();
  const gramos = () => (med.id === 'gramos' ? cant : cant * med.g);
  const medidaTxt = () => (med.id === 'gramos' ? `${Math.round(cant)} g` : `${cantidadTxt(cant)} ${cant === 1 ? med.uno : med.varios}`);
  const fuente = C.FUENTE[a.fuente] ?? '';
  const porRacion = soloRaciones ? G.aporteDe(p, medidas[0].g) : null;
  const { nodo, cerrar } = hoja(`<h2>${esc(a.nombre)}</h2><p class="sub">${fuente ? `${fuente} · ` : ''}${porRacion ? (sn ? `${num(porRacion.prot, 0)} g de proteína por ración` : `${Math.round(porRacion.kcal)} kcal y ${num(porRacion.prot, 0)} g de proteína por ración`) : sn ? `${num(p.prot, 1)} g de proteína por 100 g` : `${Math.round(p.kcal)} kcal y ${num(p.prot, 1)} g de proteína por 100 g`}${tam ? '. ¿No la pesaste? Elige su tamaño.' : ''}</p>
    <div class="c-medidas" role="radiogroup">${medidas.length > 1 ? medidas.map((m) => `<button type="button" data-med="${m.id}" aria-pressed="${m === med}">${esc(m.nombre)}${m.id !== 'gramos' && !m.sinGramos ? ` · ${Math.round(m.g)} g` : ''}</button>`).join('') : ''}${a.olla ? '' : '<button type="button" data-nueva-medida class="c-med-nueva">+ Medida</button>'}</div>
    <div class="contador" style="margin-top:14px"><button class="redondo" type="button" data-menos data-son="-1" aria-label="Menos">${icono('menos')}</button><div class="valor"><button type="button" data-escribir data-son="0" aria-label="Escribir la cantidad"><span class="cifra peso num" data-cant></span></button><span class="unidad" data-uni></span></div><button class="redondo" type="button" data-mas data-son="1" aria-label="Más">${icono('mas')}</button></div>
    <div class="c-res">${sn ? '' : '<span><b data-kcal></b>kcal</span>'}<span class="p"><b data-prot></b>proteína</span></div>
    ${tam && med.tam !== false ? '<p class="c-nota" data-nota-tam style="margin:10px 0 0;color:var(--piedra);text-align:center">Tamaños medios de USDA. Si la pesas, mejor.</p>' : ''}
    <div class="c-momentos">${G.MOMENTOS.map((m) => `<button type="button" data-mom="${m}" aria-pressed="${m === mom}">${G.NOMBRE_MOMENTO[m]}</button>`).join('')}</div>
    <button class="boton" type="button" data-apuntar data-son="none" style="margin-top:16px;width:100%">${comida ? 'Guardar' : 'Apuntar'}</button>
    ${comida ? '<button class="boton plano" type="button" data-quitar style="width:100%">Quitar</button>' : ''}`);
  const ver = () => {
    const g = gramos(); const ap = G.aporteDe(p, g);
    nodo.querySelector('[data-cant]').textContent = med.id === 'gramos' ? Math.round(cant) : cantidadTxt(cant);
    nodo.querySelector('[data-uni]').textContent = med.id === 'gramos' ? 'gramos' : med.sinGramos ? (cant === 1 ? med.uno : med.varios) : `${cant === 1 ? med.uno : med.varios} · ${Math.round(g)} g`;
    const k = nodo.querySelector('[data-kcal]'); if (k) k.textContent = miles(ap.kcal);
    nodo.querySelector('[data-prot]').textContent = `${Math.round(ap.prot)} g`;
    const nt = nodo.querySelector('[data-nota-tam]'); if (nt) nt.hidden = !med.tam;
  };
  ver();
  nodo.querySelectorAll('[data-med]').forEach((b) => b.addEventListener('click', () => {
    const g0 = gramos();
    med = medidas.find((m) => m.id === b.dataset.med);
    cant = med.id === 'gramos' ? Math.round(g0) : Math.max(0.5, Math.round(g0 / med.g * 2) / 2);
    if (med.tam) cant = 1;
    nodo.querySelectorAll('[data-med]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    vibrar(); ver();
  }));
  const paso = () => (med.id === 'gramos' ? (cant < 50 ? 5 : 10) : 0.5);
  nodo.querySelector('[data-menos]').addEventListener('click', () => { cant = Math.max(paso(), cant - paso()); vibrar(); ver(); });
  nodo.querySelector('[data-mas]').addEventListener('click', () => { cant += paso(); vibrar(); ver(); });
  nodo.querySelector('[data-escribir]').addEventListener('click', async () => {
    const v = await pedirNumero({ titulo: med.id === 'gramos' ? 'Gramos' : med.nombre, valor: med.id === 'gramos' ? Math.round(cant) : cant, unidad: med.id === 'gramos' ? 'g' : med.varios });
    if (v != null && v > 0) { cant = med.id === 'gramos' ? Math.round(v) : Math.round(v * 2) / 2 || 0.5; ver(); }
  });
  nodo.querySelector('[data-nueva-medida]')?.addEventListener('click', () => {
    cerrar();
    medidaNueva(a, () => racion(a, { fecha, momento: mom, comida, alApuntar }));
  });
  nodo.querySelectorAll('[data-mom]').forEach((b) => b.addEventListener('click', () => { mom = b.dataset.mom; nodo.querySelectorAll('[data-mom]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); vibrar(); }));
  nodo.querySelector('[data-apuntar]').addEventListener('click', async () => {
    if (comida) await C.cambiarComida(comida, { gramos: gramos(), momento: mom, medida: medidaTxt() });
    else await C.apuntar({ fecha, momento: mom, ref: a.id, nombre: a.nombre, dib: a.dib, gramos: gramos(), medida: medidaTxt(), por100: { kcal: p.kcal ?? 0, prot: p.prot ?? 0, hc: p.hc ?? 0, grasa: p.grasa ?? 0 } });
    vibrar(); cerrar(); alApuntar?.();
  });
  nodo.querySelector('[data-quitar]')?.addEventListener('click', async () => { await C.borrarComida(comida); cerrar(); alApuntar?.(); avisar('Quitado.'); });
}

// ── G135 · Una medida tuya para cualquier alimento: la pesas una vez («una rebanada», «un yogur», «mi taza») ───
export function medidaNueva(a, alGuardar) {
  const { nodo, cerrar } = hoja(`<h2>Una medida tuya</h2><p class="sub">${esc(a.nombre)}. Pésala una vez y la próxima vez solo la tocas.</p>
    <label class="c-campo"><span>Nombre</span><input class="c-texto" data-n placeholder="Una rebanada" autocomplete="off"></label>
    <label class="c-campo"><span>Gramos</span><span class="c-v"><input class="c-v" data-g inputmode="decimal" placeholder="—"><small>g</small></span></label>
    <div class="botones"><button class="boton" type="button" data-ok>Guardar medida</button></div>`, { clara: true });
  nodo.querySelector('[data-ok]').addEventListener('click', async () => {
    const n = nodo.querySelector('[data-n]').value.trim(); const g = parseFloat(nodo.querySelector('[data-g]').value.replace(',', '.'));
    if (!n || !(g > 0)) { avisar('Falta el nombre o los gramos.'); return; }
    await C.guardarMedida(a, { nombre: n, g });
    vibrar(); cerrar(); alGuardar?.();
  });
}

// ── Un alimento con tus números (y lo que lee la etiqueta) ───
export function nuevoAlimento({ nombre = '', valores = null, leidos = null, foto = null, alimento = null, extra = {}, alGuardar } = {}) {
  const v = alimento?.por100 ?? valores ?? {};
  const campo = (k, n, u) => `<label class="c-campo"><span>${n}</span><span class="c-v${leidos?.has(k) ? ' leido' : ''}"><input class="c-v" data-k="${k}" inputmode="decimal" autocomplete="off" value="${v[k] != null ? String(Math.round(v[k] * 10) / 10).replace('.', ',') : ''}" placeholder="—" aria-label="${n}"><small>${u}</small></span></label>`;
  const { nodo, cerrar } = hoja(`<h2>${foto ? '¿Está bien?' : alimento ? 'Tu alimento' : 'Nuevo alimento'}</h2><p class="sub">${foto ? 'Lo ha leído tu teléfono. La foto no sale de él. Revisa los números.' : 'Los números de la etiqueta, por 100 g.'}</p>
    ${foto ?? ''}
    <label class="c-campo"><span>Nombre</span><input class="c-texto" data-nombre autocomplete="off" value="${esc(alimento?.nombre ?? nombre)}" placeholder="Copos de avena"></label>
    ${campo('kcal', 'Energía', 'kcal/100 g')}${campo('prot', 'Proteínas', 'g')}${campo('hc', 'Hidratos', 'g')}${campo('grasa', 'Grasas', 'g')}
    <div class="botones"><button class="boton" type="button" data-guardar data-son="none">Guardar alimento</button></div>`, { clara: true });
  nodo.querySelector('[data-guardar]').addEventListener('click', async () => {
    const n = nodo.querySelector('[data-nombre]').value.trim();
    const x = {}; nodo.querySelectorAll('[data-k]').forEach((i) => { const f = parseFloat(i.value.replace(',', '.')); x[i.dataset.k] = Number.isFinite(f) ? f : null; });
    if (!n) { avisar('Ponle un nombre.'); return; }
    if (x.kcal == null) { avisar('Falta la energía (kcal).'); return; }
    const a = await C.guardarAlimento({ ...(alimento ?? {}), ...extra, nombre: n, fuente: alimento?.fuente ?? (foto ? 'etiqueta' : 'tuyo'), por100: { kcal: x.kcal, prot: x.prot ?? 0, hc: x.hc ?? 0, grasa: x.grasa ?? 0 } });
    S.suena('guardar'); cerrar(); alGuardar?.({ ...a, clave: '', mio: true });
  });
}

// ── De dónde salen los números ───────────────────────────
export function fuentes() {
  hoja(`<h2>De dónde salen los números</h2><div class="c-fuentes">
    <p><b>BEDCA.</b> Base de Datos Española de Composición de Alimentos, de la AESAN (v1.0, 2010). Uso personal y no comercial, citando la fuente. www.bedca.net</p>
    <p><b>TCAC.</b> Tabla de Composición de Alimentos Colombianos, del ICBF (2018): arepas, plátano, yuca, quesos y más. www.icbf.gov.co</p>
    <p><b>USDA FoodData Central.</b> SR Legacy (2018): lo que falta y el peso de los tamaños (una papa mediana, un huevo grande). Dominio público.</p>
    <p><b>Open Food Facts.</b> Los productos del súper que se venden en España (Mercadona, Lidl, Carrefour, Dia, marcas canarias…), dentro de la app y sin conexión. Si algo no está, se busca por internet con un toque o por el código de barras: solo viaja lo que escribes o el código; nada tuyo. Lo rellena la gente: si un número no cuadra, mira la etiqueta. Datos con licencia ODbL.</p>
    <p><b>Las cuentas.</b> Tu gasto sale de lo que comes y de cómo cambia tu peso (6.500 kcal por kilo). La proteína, de tu peso: 1,8 g por kilo (2 si buscas perder grasa). Nunca por debajo de tu gasto en reposo.</p>
    <p>Gofio no es una app médica: no diagnostica ni trata nada.</p></div>`);
}
