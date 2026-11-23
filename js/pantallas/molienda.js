// «La molienda de hoy» y corregir una serie (0.2.21, G124; lienzo, tablero 19). Lo que pasa en el gimnasio:
// cambiar el orden («hoy, hombro antes que pierna»), «Luego» si la máquina está ocupada, «Quitar por hoy», ir a otro
// ejercicio y corregir cualquier serie tocando sus granos.
import * as G from '../cerebro/index.js';
import { seriesDelHueco, ordenDe, huecoVivo, siguienteTras, mandarAlFinal, quitarPorHoy, guardarSesion, cambiarSerie, borrarSerie,
  escalonDe } from '../logica.js';
import { hoja, esc, kg, icono, granos, grano, vibrar, escalonar, reduceMovimiento, pedirNumero, avisar } from '../ui.js';
import { deslizable } from './hoy.js';
import * as S from '../sonidos.js';

const AGARRADERA = `<span class="mol-agarre" data-agarre aria-hidden="true">${grano(true)}${grano(true)}${grano(true)}</span>`;
const FONDOS = `<span class="fondo-accion cambiar" aria-hidden="true">${icono('cambiar')}Otra maña</span><span class="fondo-accion quitar" aria-hidden="true">Quitar por hoy${icono('menos')}</span>`;

/**
 * La hoja «La molienda de hoy». `actual` = el hueco que toca (el de ahora o el que viene en el descanso).
 * alElegir(k): ir a ese ejercicio (o ponerlo como el que viene). alQuitado(k): se quitó un hueco. alCambiar(k): otra maña.
 */
export function hojaMolienda(s, { actual, alElegir, alQuitado, alCambiar, alTolva }) {
  const pintar = () => ordenDe(s).filter((k) => huecoVivo(s, k)).map((k) => {
    const slot = s.plan[k];
    const h = seriesDelHueco(s, k).length;
    const hecho = h >= slot.series;
    const ahora = k === actual && !hecho;
    return `<li class="mol-fila${ahora ? ' es-ahora' : ''}${hecho ? ' es-hecho' : ''}" data-k="${k}">${hecho ? '' : FONDOS}
      <div class="fila-mueve">${hecho ? '<span class="mol-agarre vacio" aria-hidden="true"></span>' : AGARRADERA}
        <button class="mol-ir" type="button" data-ir="${k}" ${hecho ? 'disabled' : ''} aria-label="${esc(G.ejercicio(slot.ej).nombre)}: ${h} de ${slot.series}${ahora ? ', ahora' : '. Ir a este'}">
          <b>${esc(G.ejercicio(slot.ej).nombre)}</b>${granos(h, slot.series, -1, { clase: 'millo-tenue' })}</button>
        ${ahora ? '<span class="mol-ahora">Ahora</span><button class="chip mol-luego" type="button" data-luego>Luego</button>' : hecho ? '<span class="mol-hecho">Hecho</span>' : ''}
      </div></li>`;
  }).join('');
  const { nodo: h, cerrar } = hoja(`<div class="hoja-molienda"><h2>La molienda de hoy</h2><p class="sub">Arrastra por los granos para cambiar el orden. Toca uno para ir a él.</p>
    <ul class="mol-lista" data-lista>${pintar()}</ul>
    <button class="boton plano grande tolva-abrir" type="button" data-tolva>${icono('mas')}Añadir ejercicio</button></div>`);
  const ul = h.querySelector('[data-lista]');
  escalonar(ul.querySelectorAll('li'), { desde: 120, retraso: 30 });

  const enganchar = () => {
    ul.querySelectorAll('li').forEach((li) => {
      const k = Number(li.dataset.k);
      li.querySelector('[data-ir]')?.addEventListener('click', () => {
        if (li.dataset.arrastre) return;
        S.toque('barrido'); vibrar(); cerrar(); setTimeout(() => alElegir(k), 200);
      });
      li.querySelector('[data-luego]')?.addEventListener('click', async () => {
        const despues = siguienteTras(s, k);
        if (despues === -1 || despues === k) { avisar('No queda otro: sigue con este.'); return; }
        mandarAlFinal(s, k); await guardarSesion(s);
        S.toque('aire'); vibrar(); cerrar(); setTimeout(() => alElegir(despues, { luego: true }), 200);
      });
      if (li.querySelector('.fondo-accion')) deslizable(li, {
        quitar: async () => {
          quitarPorHoy(s, k); await guardarSesion(s); vibrar();
          li.style.transition = 'none';
          if (!reduceMovimiento()) await li.animate([{ maxHeight: `${li.offsetHeight}px`, opacity: 1 }, { maxHeight: '0px', opacity: 0, marginBottom: '0px' }], { duration: 220, easing: 'ease-out', fill: 'forwards' }).finished;
          li.remove();
          alQuitado?.(k, cerrar);
          return true;
        },
        cambiar: () => { cerrar(); setTimeout(() => alCambiar?.(k), 200); },
      });
      const ag = li.querySelector('[data-agarre]');
      if (ag) arrastrable(li, ag);
    });
  };
  // Arrastrar por la agarradera: la fila sigue al dedo y las demás se apartan; al soltar, se guarda el orden.
  const arrastrable = (li, ag) => {
    let d = null;
    const filas = () => [...ul.querySelectorAll('li')];
    ag.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      try { ag.setPointerCapture(e.pointerId); } catch { /* */ }
      const lista = filas();
      d = { y0: e.clientY, id: e.pointerId, lista, desde: lista.indexOf(li), alto: li.offsetHeight + 8, a: lista.indexOf(li) };
      li.classList.add('arrastrada'); vibrar(); S.toque('pop');
    });
    ag.addEventListener('pointermove', (e) => {
      if (!d || e.pointerId !== d.id) return;
      e.preventDefault();
      const dy = e.clientY - d.y0;
      li.style.transform = `translateY(${dy}px) scale(1.02)`;
      const a = Math.max(0, Math.min(d.lista.length - 1, d.desde + Math.round(dy / d.alto)));
      if (a !== d.a) { d.a = a; S.toque(0); }
      d.lista.forEach((x, j) => {
        if (x === li) return;
        const mueve = d.desde < a ? (j > d.desde && j <= a ? -d.alto : 0) : (j < d.desde && j >= a ? d.alto : 0);
        x.style.transform = mueve ? `translateY(${mueve}px)` : '';
      });
    });
    const soltar = async (e) => {
      if (!d || e.pointerId !== d.id) return;
      const { lista, desde, a } = d; d = null;
      li.classList.remove('arrastrada');
      lista.forEach((x) => { x.style.transform = ''; });
      if (a === desde) return;
      const nueva = [...lista]; nueva.splice(desde, 1); nueva.splice(a, 0, li);
      nueva.forEach((x) => ul.append(x));
      if (!reduceMovimiento()) li.animate([{ transform: 'scale(1.04)' }, { transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.34,1.56,.64,1)' });
      const vivos = nueva.map((x) => Number(x.dataset.k));
      s.orden = [...vivos, ...ordenDe(s).filter((k) => !vivos.includes(k))];
      await guardarSesion(s); vibrar(); S.toque('piedra');
    };
    ag.addEventListener('pointerup', soltar);
    ag.addEventListener('pointercancel', soltar);
  };
  enganchar();
  h.querySelector('[data-tolva]').onclick = () => { cerrar(); setTimeout(() => alTolva?.(), 220); };
  return { cerrar };
}

/** Corregir una serie (tocando los granos de arriba): peso, reps y reserva; o borrarla. */
export function hojaSerie(s, k, n, { alCambiar }) {
  const serie = seriesDelHueco(s, k)[n];
  if (!serie) return;
  const escalon = escalonDe(serie.ejercicioId);
  let { peso, reps, rir } = serie;
  const minis = (que) => [-1, 1].map((dir) => `<button class="redondo" type="button" data-hs="${que}" data-dir="${dir}" data-son="${dir}" aria-label="${que === 'peso' ? (dir > 0 ? 'Sumar el escalón' : 'Restar el escalón') : (dir > 0 ? 'Una rep más' : 'Una rep menos')}">${icono(dir > 0 ? 'mas' : 'menos')}</button>`);
  const [mp, Mp] = minis('peso'), [mr, Mr] = minis('reps');
  const lastre = !!G.ejercicio(serie.ejercicioId).lastre;
  const { nodo: h, cerrar } = hoja(`<div class="hoja-siguiente hoja-serie"><h2>Serie ${n + 1}</h2><p class="sub">${esc(G.ejercicio(serie.ejercicioId).nombre)} · la cambias o la borras.</p>
    <div class="contador">${mp}<div class="valor"><button type="button" data-hs-peso data-son="0" aria-label="Escribir el peso"><span class="cifra peso num" data-hv-peso>${kg(peso)}</span></button><span class="unidad">${lastre ? 'kg de lastre' : 'kg'}</span></div>${Mp}</div>
    <div class="contador">${mr}<div class="valor"><button type="button" data-hs-reps data-son="0" aria-label="Escribir las reps"><span class="cifra reps num" data-hv-reps>${reps}</span></button><span class="unidad">reps</span></div>${Mr}</div>
    <p class="hs-pregunta" id="hs-rir">¿Cuántas te quedaban?</p>
    <div class="hs-rir" role="radiogroup" aria-labelledby="hs-rir">${G.BOTONES_RIR.map((v) => `<button type="button" role="radio" data-r="${v}" data-son="pop" aria-checked="${v === rir}">${v === 4 ? '4+' : v}</button>`).join('')}</div>
    <button class="enlace hs-borrar" type="button" data-borrar>Borrar esta serie</button>
    <button class="boton hs-listo" type="button" data-listo data-son="none">Guardar</button></div>`);
  const vP = h.querySelector('[data-hv-peso]'), vR = h.querySelector('[data-hv-reps]');
  const bote = (x) => { if (!reduceMovimiento()) x.animate([{ transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 180, easing: 'cubic-bezier(.22,1,.36,1)' }); };
  const pintar = (que) => { vP.textContent = kg(peso); vR.textContent = reps; if (que) bote(que === 'peso' ? vP : vR); };
  h.querySelectorAll('[data-hs]').forEach((b) => b.addEventListener('click', () => {
    const dir = Number(b.dataset.dir);
    if (b.dataset.hs === 'peso') peso = Math.max(0, G.siguienteEscalon(peso, escalon, dir)); else reps = Math.max(0, Math.min(60, reps + dir));
    vibrar(); pintar(b.dataset.hs);
  }));
  h.querySelector('[data-hs-peso]').onclick = async () => { const v = await pedirNumero({ titulo: lastre ? 'Lastre' : 'Peso', valor: peso }); if (v != null) { peso = v; pintar('peso'); } };
  h.querySelector('[data-hs-reps]').onclick = async () => { const v = await pedirNumero({ titulo: 'Reps', valor: reps, unidad: 'reps', decimal: false }); if (v != null) { reps = Math.max(0, Math.min(60, Math.round(v))); pintar('reps'); } };
  h.querySelectorAll('[data-r]').forEach((b) => b.addEventListener('click', () => {
    rir = Number(b.dataset.r); vibrar();
    h.querySelectorAll('[data-r]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
  }));
  h.querySelector('[data-listo]').onclick = async () => {
    await cambiarSerie(serie, { peso, reps, rir }); S.toque(0); vibrar(); cerrar(); avisar('Serie cambiada.'); alCambiar?.();
  };
  h.querySelector('[data-borrar]').onclick = async () => {
    await borrarSerie(serie); if (s.prep?.i === k) delete s.prep; await guardarSesion(s);
    S.toque(-1); vibrar(); cerrar(); avisar('Serie borrada.'); alCambiar?.({ borrada: true });
  };
  escalonar(h.querySelectorAll('.hoja-serie > *'), { desde: 80, retraso: 30 });
}

/** El grano tocado: el lleno más cercano al dedo (los granos son pequeños; la pastilla entera se toca). */
export function granoTocado(cont, x) {
  const gs = [...cont.querySelectorAll('.grano')];
  let mejor = -1, dist = Infinity;
  gs.forEach((g, j) => {
    if (!g.querySelector('.lleno') && !g.classList.contains('lleno')) return;
    const r = g.getBoundingClientRect(); const dd = Math.abs(r.left + r.width / 2 - x);
    if (dd < dist) { dist = dd; mejor = j; }
  });
  return mejor;
}
