// La libreta (La brega, G115-G116): en las pantallas de fuerza solo va lo que necesitas sudando; el porqué, aquí, en
// una hoja de harina que abres si quieres. Cuatro pestañas: la otra vez, por qué este peso, la maña y del molino.
import * as G from '../cerebro/index.js';
import { estado, ajuste, ponerAjuste, ultimaVez, historialArrimar } from '../logica.js';
import { hoja, esc, kg, escalonar } from '../ui.js';
import * as S from '../sonidos.js';

/** Datos del molino y de Canarias, cada uno con su fuente (investigacion/gofio-cultura.md e identidad/brega/00-concepto.md). */
export const DEL_MOLINO = [
  ['Antes de moler, el grano se tostaba en un plato de barro: el tostador.', 'El Museo Canario'],
  ['Las pintaderas, sellos de barro con dibujos geométricos, solo se han hallado en Gran Canaria.', 'El Museo Canario'],
  ['En el molino, el alivio sube o baja la piedra para que muela más fino o más gordo.', 'OEPM, patente ES0179427'],
  ['Levantamiento de la piedra: hasta el vientre, el pecho y los hombros. Sobre la cabeza, es el pulseo.', 'Turismo de Gran Canaria'],
  ['La pella, gofio amasado en el zurrón, era la comida del pastor para todo el día.', 'DHECan (RAE)'],
  ['Ñapa: lo que da el vendedor de más, sobre el justo peso.', 'DHECan (RAE)'],
  ['Las moliendas se hacían en las casas y reunían a los jóvenes.', 'Memoria Digital de Canarias (ULPGC)'],
  ['En la lucha canaria, encaderar es meter la cadera para tumbar al contrario.', 'DHECan (RAE)'],
];

const PESTANAS = [['otra', 'La otra vez'], ['porque', 'Por qué'], ['mana', 'La maña'], ['molino', 'Del molino']];

/**
 * Abre la libreta de un ejercicio. `porque` = las frases del porqué (ya escritas por quien la abre: la serie o el
 * descanso), `pestana` = la que se abre primero.
 */
export function abrirLibreta({ ejId, porque = [], pestana = 'porque' }) {
  const ej = G.ejercicio(ejId);
  const uv = ultimaVez(ejId);
  const estilo = G.estiloArrimar(historialArrimar(ejId));
  const nota = estado.notas[ejId]?.texto;
  const k = ((ajuste('molinoVisto') ?? -1) + 1) % DEL_MOLINO.length;
  ponerAjuste('molinoVisto', k);
  const [dato, fuente] = DEL_MOLINO[k];
  const paginas = {
    otra: uv ? `<p class="lb-grande num">${kg(uv.peso)} kg × ${uv.series.map((x) => x.reps).join(' · ')}</p><p>Dejando ${[...new Set(uv.series.map((x) => (x.rir === 4 ? '4 o más' : x.rir)))].join(', ')}. ${esc(uv.fecha ? `El ${uv.fecha.slice(8)}/${uv.fecha.slice(5, 7)}.` : '')}</p>` : '<p>Aún no lo has hecho nunca. Lo que apuntes hoy será la otra vez.</p>',
    porque: [...porque.map((f) => `<p>${f}</p>`),
      estilo?.n > 0 ? `<p><b>Tu jeito:</b> arrimas con ${estilo.n === 1 ? 'una piedra' : `${estilo.n} piedras`}, al ${estilo.fracs.map((f) => Math.round(f * 100)).join(', ').replace(/, (\d+)$/, ' y $1')} %.</p>`
        : estilo?.n === 0 ? '<p><b>Tu jeito:</b> aquí no sueles arrimar, así que Gofio no te lo propone (el botón sigue ahí).</p>' : ''].join(''),
    mana: `${nota ? `<p class="lb-grande">${esc(nota)}</p><p>Tu nota.</p>` : ''}<p>Los consejos de técnica de cada ejercicio, con su fuente, llegan con la v1.1 · Tu rutina.</p>`,
    molino: `<p class="lb-grande">${esc(dato)}</p><p class="lb-fuente">${esc(fuente)}</p>`,
  };
  const { nodo: h } = hoja(`<div class="libreta"><h2>La libreta</h2><p class="sub">${esc(ej.nombre)}</p>
    <div class="lb-pestanas" role="tablist">${PESTANAS.map(([id, t]) => `<button type="button" role="tab" data-p="${id}" aria-selected="${id === pestana}">${t}</button>`).join('')}</div>
    <div class="lb-pagina" role="tabpanel" data-pagina>${paginas[pestana]}</div></div>`, { clara: true });
  const pag = h.querySelector('[data-pagina]');
  h.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => {
    h.querySelectorAll('[data-p]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    pag.innerHTML = paginas[b.dataset.p]; S.toque('pop');
    escalonar(pag.children, { desde: 0, retraso: 40 });
  }));
  escalonar(pag.children, { desde: 140, retraso: 40 });
}
