// La foto de la etiqueta (tablero 20, H; G127): la tabla nutricional se lee en el teléfono (tesseract.js, Apache-2.0,
// con el español dentro de la app) y la foto no sale de él. Se carga solo al usarla. Lo leído se confirma a mano.
import { esc, hoja, avisar } from '../ui.js';
import * as S from '../sonidos.js';
import { nuevoAlimento } from '../pantallas/comida.js';

const V = (p) => new URL(`../../vendor/tesseract/${p}`, import.meta.url).href;

import { leerTabla } from './leer-etiqueta.js';

let trabajador = null;
async function ocr(imagen, alProgreso) {
  if (!trabajador) {
    const T = await import(V('tesseract.esm.min.js'));
    const crear = T.createWorker ?? T.default?.createWorker;
    trabajador = await crear('spa', 1, {
      workerPath: V('worker.min.js'), corePath: V('tesseract-core-lstm.wasm.js'), langPath: V('lang'),
      workerBlobURL: false, logger: (m) => { if (m.status === 'recognizing text') alProgreso?.(m.progress); },
    });
  }
  const { data } = await trabajador.recognize(imagen);
  return data.text;
}

/** Abre la cámara (o la fototeca), lee la tabla y enseña la hoja de confirmar. */
export function fotoEtiqueta({ codigo = null, alGuardar } = {}) {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*'; input.setAttribute('capture', 'environment');
  input.style.display = 'none'; document.body.append(input);
  input.addEventListener('change', async () => {
    const f = input.files?.[0]; input.remove();
    if (!f) return;
    const url = URL.createObjectURL(f);
    const { nodo, cerrar } = hoja(`<h2>Leyendo la etiqueta…</h2><p class="sub">En tu teléfono. La foto no sale de él.</p>
      <div class="c-foto"><img src="${url}" alt="Tu foto de la etiqueta"></div>
      <div class="c-leyendo"><i><b data-barra></b></i></div>`);
    const barra = nodo.querySelector('[data-barra]');
    try {
      const texto = await ocr(f, (p) => { barra.style.transform = `scaleX(${p})`; });
      const { valores, lineas, lin } = leerTabla(texto);
      cerrar();
      const n = Object.keys(valores).length;
      for (let k = 0; k < n; k++) S.suena('leido', k * 0.12);
      if (!n) avisar('No pude leer la tabla. Ponla tú.');
      const marcadas = Object.values(lin);
      const foto = `<div class="c-foto" style="background:#fff;color:#444;display:block;padding:6px 10px;font:600 10px/15px monospace;max-height:132px;overflow:hidden">${lineas.slice(0, 12).map((l, k) => `<div style="${marcadas.includes(k) ? 'outline:2px solid var(--millo);border-radius:4px' : ''}">${esc(l)}</div>`).join('')}</div>`;
      setTimeout(() => nuevoAlimento({ valores, leidos: new Set(Object.keys(valores)), foto, extra: codigo ? { codigo } : {}, alGuardar }), 300);
    } catch (e) {
      cerrar(); avisar('No se pudo leer la foto. Ponla tú.');
      setTimeout(() => nuevoAlimento({ extra: codigo ? { codigo } : {}, alGuardar }), 300);
    } finally { URL.revokeObjectURL(url); }
  });
  input.click();
}
export { ocr };
