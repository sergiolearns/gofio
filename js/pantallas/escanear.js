// Escanear (tablero 20, G; G127): el código de barras se lee en el teléfono (zxing-wasm, MIT) y solo ese número viaja a
// Open Food Facts. Una línea almagre barre el visor; al leerlo, las esquinas se cierran y sube la tarjeta.
import { el, esc, icono, avisar, vibrar } from '../ui.js';
import * as S from '../sonidos.js';
import * as C from '../comida/cocina.js';
import { racion, nuevoAlimento } from './comida.js';

let zxing = null;
async function lector() {
  if (zxing) return zxing;
  const Z = await import('../../vendor/zxing/reader/index.js');
  Z.prepareZXingModule({ overrides: { locateFile: (p) => new URL(`../../vendor/zxing/${p}`, import.meta.url).href }, fireImmediately: true });
  zxing = Z;
  return Z;
}

export function escanearPantalla(params = {}, nav) {
  const nodo = el(`<section class="c-escaner">
    <video playsinline muted autoplay></video><div class="c-visor"></div><div class="c-linea"></div>
    <div class="c-arriba"><button class="c-volver" type="button" data-volver>${icono('atras')}Comida</button><span style="font-weight:700">Escanear</span><span style="width:70px"></span></div>
    <p class="c-ayuda" data-ayuda>Apunta al código de barras</p>
    <form class="c-manual" data-manual><input inputmode="numeric" autocomplete="off" placeholder="O escribe el número" aria-label="Número del código de barras"><button type="submit">Buscar</button></form>
    <div class="c-tarjeta-off" data-tarjeta></div></section>`);
  const video = nodo.querySelector('video');
  const ayuda = nodo.querySelector('[data-ayuda]');
  const tarjeta = nodo.querySelector('[data-tarjeta]');
  let flujo = null, vivo = true, ocupado = false, timer = null;
  const lienzo = document.createElement('canvas');
  const ctx = lienzo.getContext('2d', { willReadFrequently: true });

  async function empezar() {
    try {
      flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      if (!vivo) { parar(); return; }
      video.srcObject = flujo; await video.play().catch(() => {});
      await lector();
      mirar();
    } catch {
      ayuda.textContent = 'Sin cámara: escribe el número de debajo de las barras.';
    }
  }
  async function mirar() {
    if (!vivo || ocupado) return;
    if (video.readyState >= 2 && video.videoWidth) {
      // Solo la franja del visor, en pequeño: rápido y en el teléfono.
      const w = video.videoWidth, h = video.videoHeight;
      const cw = Math.min(w, 960), ch = Math.round(cw * 0.5);
      const sx = (w - cw) / 2, sy = Math.max(0, h * 0.38 - ch / 2);
      lienzo.width = cw; lienzo.height = ch;
      ctx.drawImage(video, sx, sy, cw, ch, 0, 0, cw, ch);
      try {
        const r = await zxing.readBarcodes(ctx.getImageData(0, 0, cw, ch), { formats: ['EAN13', 'EAN8', 'UPCA', 'UPCE'], tryHarder: true, maxNumberOfSymbols: 1 });
        if (r.length && r[0].text) { leido(r[0].text); return; }
      } catch { /* sigue mirando */ }
    }
    timer = setTimeout(mirar, 220);
  }
  async function leido(codigo) {
    if (ocupado) return;
    ocupado = true; clearTimeout(timer);
    S.suena('leido'); vibrar();
    nodo.querySelector('.c-visor').classList.add('leido');
    ayuda.textContent = 'Buscando…';
    let a = null;
    try { a = await C.buscarCodigo(codigo); } catch { a = undefined; }
    if (a === undefined) {
      mostrar(`<span class="c-et">Sin conexión</span><h4 style="margin-top:6px">No se pudo preguntar</h4><p style="margin:4px 0 0;color:var(--tierra);font-size:14px">Prueba con conexión o apúntalo con tus números.</p>`,
        [['Con tus números', () => { cerrar(); nuevoAlimento({ alGuardar: apuntar }); }], ['Otro', otro]]);
    } else if (!a) {
      mostrar(`<span class="c-et">${esc(codigo)}</span><h4 style="margin-top:6px">No está en Open Food Facts</h4><p style="margin:4px 0 0;color:var(--tierra);font-size:14px">Hazle una foto a la etiqueta o pon sus números.</p>`,
        [['Foto de la etiqueta', () => { cerrar(); import('../comida/etiqueta.js').then((m) => m.fotoEtiqueta({ codigo, alGuardar: apuntar })); }], ['Otro', otro]]);
    } else {
      mostrar(`<span class="c-et">${a.yaEra ? 'Ya lo tenías' : 'Encontrado'}</span><h4 style="margin-top:6px">${esc(a.nombre)}</h4>${a.marca ? `<p style="margin:2px 0 0;color:var(--tierra);font-size:13px">${esc(a.marca)}</p>` : ''}
        <p style="margin:4px 0 0;color:var(--tierra);font-size:14px">Por 100 g: <b style="color:var(--basalto)">${C.sinNumeros() ? '' : `${Math.round(a.por100.kcal)} kcal · `}${Math.round(a.por100.prot * 10) / 10} g de proteína</b></p>
        ${a.fuente === 'off' ? '<p style="margin:8px 0 0;font-size:11.5px;color:var(--tierra)">Datos de Open Food Facts (ODbL). Solo viajó el código.</p>' : ''}`,
        [['Usar', async () => { const x = a.yaEra ? a : await C.guardarAlimento(a); cerrar(); apuntar({ ...x, mio: true }); }], ['Otro', otro]]);
    }
  }
  function mostrar(html, botones) {
    tarjeta.innerHTML = `${html}<div style="display:grid;grid-template-columns:1fr auto;gap:10px;margin-top:12px">${botones.map(([t], k) => `<button type="button" data-b="${k}" ${k === 0 ? 'class="boton" style="width:100%;min-height:56px;font-size:22px;margin:0"' : 'style="min-height:56px;padding:0 20px;border-radius:16px;background:var(--harina-2);font-weight:700;font-size:15px;color:var(--basalto)"'}>${esc(t)}</button>`).join('')}</div>`;
    tarjeta.querySelectorAll('[data-b]').forEach((b) => b.addEventListener('click', botones[Number(b.dataset.b)][1]));
    tarjeta.classList.add('visible'); ayuda.textContent = ''; nodo.querySelector('[data-manual]').hidden = true;
  }
  function otro() {
    tarjeta.classList.remove('visible'); nodo.querySelector('.c-visor').classList.remove('leido');
    ayuda.textContent = 'Apunta al código de barras'; nodo.querySelector('[data-manual]').hidden = false; ocupado = false; mirar();
  }
  const apuntar = (a) => racion(a, { fecha: params.fecha, momento: params.momento, alApuntar: () => nav.refrescar() });
  function parar() { vivo = false; clearTimeout(timer); flujo?.getTracks().forEach((t) => t.stop()); flujo = null; }
  function cerrar() { parar(); nav.volver(); }
  nodo.querySelector('[data-volver]').addEventListener('click', cerrar);
  nodo.querySelector('[data-manual]').addEventListener('submit', (e) => {
    e.preventDefault(); const v = e.currentTarget.querySelector('input').value.replace(/\D/g, '');
    if (v.length >= 8) leido(v); else avisar('El número tiene 8 o 13 cifras.');
  });
  return { nodo, alEntrar: empezar, alSalir: parar, sinGesto: false };
}
