// Mis alimentos y ollas (Ajustes → Comida): lo tuyo, para cambiarlo o borrarlo. Lo ya apuntado no cambia.
import { el, esc, icono, confirmar, escalonar } from '../ui.js';
import * as C from '../comida/cocina.js';
import { estado } from '../logica.js';
import { dibujo } from '../comida/dibujos.js';
import { nuevoAlimento } from './comida.js';

export function misCosasPantalla(_, nav) {
  const nodo = el('<section class="comida col"></section>');
  function pintar() {
    const ollas = C.misCosas().filter((a) => a.olla), mios = C.misCosas().filter((a) => !a.olla);
    const fila = (a, sub) => `<li class="c-item" style="border-bottom:1px solid var(--harina-2)"><span class="c-dib">${dibujo(a.dib, { tam: 34 })}</span><button type="button" data-abrir="${esc(a.id)}" style="flex:1;text-align:left;min-width:0"><b>${esc(a.nombre)}</b><small>${esc(sub)}</small></button><button class="c-borrar" type="button" data-borrar="${esc(a.id)}">Borrar</button></li>`;
    nodo.innerHTML = `<button class="c-volver" type="button" data-volver>${icono('atras')}Ajustes</button>
      <h1 class="c-tit" style="margin-top:4px">Lo <em>tuyo.</em></h1>
      <p class="c-h3" style="color:var(--tierra)">Tus ollas</p>${ollas.length ? `<ul class="c-lista c-mios">${ollas.map((a) => fila(a, `${a.olla.ingredientes.length} ingredientes${a.olla.pesoCocinado ? ` · ${Math.round(a.por100.kcal)} kcal/100 g` : a.olla.raciones ? ` · ${a.olla.raciones} raciones` : ''}`)).join('')}</ul>` : '<p class="c-nada" style="color:var(--tierra)">Aún ninguna. Se hacen desde «Apuntar comida».</p>'}
      <p class="c-h3" style="color:var(--tierra)">Tus alimentos</p>${mios.length ? `<ul class="c-lista c-mios">${mios.map((a) => fila(a, `${C.FUENTE[a.fuente] ?? 'Tuyo'}${a.marca ? ` · ${a.marca}` : ''} · ${Math.round(a.por100.kcal)} kcal/100 g`)).join('')}</ul>` : '<p class="c-nada" style="color:var(--tierra)">Aún ninguno.</p>'}`;
    nodo.querySelector('[data-volver]').addEventListener('click', () => nav.volver());
    nodo.querySelectorAll('[data-abrir]').forEach((b) => b.addEventListener('click', () => {
      const a = C.misCosas().find((x) => x.id === b.dataset.abrir); if (!a) return;
      if (a.olla) nav.ir('olla', { id: a.id });
      else nuevoAlimento({ alimento: estado.alimentos.find((x) => x.id === a.id), alGuardar: pintar });
    }));
    nodo.querySelectorAll('[data-borrar]').forEach((b) => b.addEventListener('click', async () => {
      const a = C.misCosas().find((x) => x.id === b.dataset.borrar); if (!a) return;
      if (!(await confirmar({ titulo: `¿Borrar «${a.nombre}»?`, texto: 'Lo que ya apuntaste se queda como estaba.', si: 'Borrar', peligro: true }))) return;
      if (a.olla) await C.borrarOlla(a.id); else await C.borrarAlimento(a.id);
      pintar();
    }));
  }
  pintar();
  return { nodo, clara: true, alEntrar() { escalonar(nodo.children, { desde: 40, retraso: 30 }); }, alMostrar: pintar };
}
