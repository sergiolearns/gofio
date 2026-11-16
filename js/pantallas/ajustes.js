// Ajustes: copia de seguridad (exportar e importar), escalones de carga, cómo entreno, mis datos, rutina y créditos.
import * as G from '../cerebro/index.js';
import * as D from '../datos.js';
import { estado, ajuste, ponerAjuste, arrancar, DESCANSO_POR_DEFECTO } from '../logica.js';
import { el, esc, kg, mmss, icono, hoja, confirmar, avisar, vibrar } from '../ui.js';

const NOMBRE_EQUIPO = { barra: 'Barra', smith: 'Smith', mancuernas: 'Mancuernas (cada una)', maquina: 'Máquinas', polea: 'Poleas', lastre: 'Lastre' };
const VERSION = '0.1.0';

/** Exporta la copia completa: hoja de Compartir en el iPhone (Archivos, iCloud…) o descarga. */
export async function exportarCopia() {
  const copia = await D.exportar();
  const nombre = `gofio-${G.hoyLocal()}.json`;
  const blob = new Blob([JSON.stringify(copia, null, 1)], { type: 'application/json' });
  const archivo = new File([blob], nombre, { type: 'application/json' });
  let hecho = false;
  try {
    if (navigator.canShare?.({ files: [archivo] })) { await navigator.share({ files: [archivo], title: 'Copia de Gofio' }); hecho = true; }
  } catch (e) { if (e?.name === 'AbortError') return false; }
  if (!hecho) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre;
    document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  await ponerAjuste('ultimaCopia', new Date().toISOString());
  avisar('Copia guardada');
  return true;
}

/** Importa una copia: enseña lo que trae antes de sustituir nada. */
export function importarCopia(alTerminar) {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'application/json,.json';
  input.onchange = async () => {
    const f = input.files?.[0]; if (!f) return;
    try {
      const { copia, resumen } = D.leerCopia(await f.text());
      const ok = await confirmar({
        titulo: 'Importar copia',
        texto: `Trae ${resumen.sesiones} sesiones y ${resumen.series} series${resumen.desde ? `, del ${resumen.desde} al ${resumen.hasta}` : ''}. Sustituye todo lo que hay ahora en este móvil.`,
        si: 'Importar', peligro: true,
      });
      if (!ok) return;
      await D.importar(copia); await arrancar();
      avisar('Copia importada'); alTerminar?.();
    } catch (e) { avisar(e.message || 'No se pudo leer el archivo'); }
  };
  input.click();
}

const leerEscalon = (t) => {
  const xs = String(t).split(/[;\s]+|,(?=\s)/).map((x) => parseFloat(x.replace(',', '.'))).filter((x) => Number.isFinite(x) && x >= 0);
  if (!xs.length) return null;
  return xs.length === 1 ? xs[0] : [...new Set(xs)].sort((a, b) => a - b);
};
const verEscalon = (v) => (Array.isArray(v) ? v.map(kg).join('; ') : kg(v));

export function ajustesPantalla(_, nav) {
  const esc_ = ajuste('escalones');
  const perfil = ajuste('perfil');
  const desc = ajuste('descanso');
  const dps = ajuste('diasPorSemana');
  const ultima = ajuste('ultimaCopia');
  const plantilla = ajuste('plantilla');
  const nSes = estado.sesiones.filter((s) => s.estado === 'hecha').length;

  const nodo = el(`<section aria-labelledby="titulo-ajustes">
    <h1 class="titular grande" id="titulo-ajustes" style="margin-top:8px">Ajustes</h1>

    <div class="grupo"><h2>Copia de seguridad</h2><div class="tarjeta">
      <div class="fila"><span class="que">Tus datos viven solo en este móvil<small>${nSes} sesiones · ${ultima ? `última copia: ${new Date(ultima).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}` : 'aún sin copia'}</small></span></div>
      <div class="fila"><button class="boton plano" type="button" data-exportar style="font-size:20px">${icono('compartir', 'width="20" height="20"')}Guardar copia</button></div>
      <div class="fila"><button class="boton plano" type="button" data-importar style="font-size:20px">Importar una copia</button></div>
      <label class="fila"><span class="que">Recordármelo los domingos<small>En «Mi semana», con un toque</small></span><input type="checkbox" data-recordatorio ${ajuste('recordatorio') ? 'checked' : ''} switch style="width:24px;height:24px;accent-color:var(--almagre)"></label>
    </div></div>

    <div class="grupo"><h2>Cómo entreno</h2><div class="tarjeta">
      <label class="fila"><span class="que">Días por semana<small>Para el planificador (R15). «Auto» = tu media de las últimas 4 semanas</small></span>
        <select class="campo" data-dps style="width:96px">${['auto', 1, 2, 3, 4, 5, 6].map((v) => `<option value="${v}" ${String(dps ?? 'auto') === String(v) ? 'selected' : ''}>${v === 'auto' ? 'Auto' : v}</option>`).join('')}</select></label>
      <label class="fila"><span class="que">Minutos por sesión<small>Para la sesión combinada (≈ 3 min por serie)</small></span><input class="campo" data-min inputmode="numeric" value="${ajuste('minutos')}"></label>
      <label class="fila"><span class="que">Descanso en multiarticulares<small>Segundos (R24; por defecto ${DESCANSO_POR_DEFECTO.multi})</small></span><input class="campo" data-desc="multi" inputmode="numeric" value="${desc.multi}"></label>
      <label class="fila"><span class="que">Descanso en aislamiento<small>Segundos (R24; por defecto ${DESCANSO_POR_DEFECTO.aislamiento})</small></span><input class="campo" data-desc="aislamiento" inputmode="numeric" value="${desc.aislamiento}"></label>
    </div></div>

    <div class="grupo"><h2>Escalones de carga de tu gimnasio</h2><div class="tarjeta">
      ${Object.keys(G.ESCALONES_POR_DEFECTO).map((k) => `<label class="fila"><span class="que">${NOMBRE_EQUIPO[k]}<small>Un número = paso fijo; varios con «;» = los pesos que hay</small></span><input class="campo" data-esc="${k}" inputmode="text" value="${esc(verEscalon(esc_[k]))}"></label>`).join('')}
    </div><p class="etiqueta" style="margin-top:8px">Cuando toca subir (R12), Gofio salta al siguiente peso que existe de verdad.</p></div>

    <div class="grupo"><h2>Cargas de partida</h2><div class="tarjeta">
      <div class="fila"><span class="que">${Object.keys(ajuste('cargasIniciales')).length} ejercicios con carga<small>Lo que no tenga carga te lo pido en la primera serie</small></span><button class="enlace" type="button" data-cargas>Editar</button></div>
    </div></div>

    <div class="grupo"><h2>Mis datos</h2><div class="tarjeta">
      <label class="fila"><span class="que">Peso<small>kg · se usará en la v0.3</small></span><input class="campo" data-perfil="peso" inputmode="decimal" value="${perfil.peso ?? ''}"></label>
      <label class="fila"><span class="que">Altura<small>cm</small></span><input class="campo" data-perfil="altura" inputmode="numeric" value="${perfil.altura ?? ''}"></label>
      <label class="fila"><span class="que">Edad</span><input class="campo" data-perfil="edad" inputmode="numeric" value="${perfil.edad ?? ''}"></label>
    </div></div>

    <div class="grupo"><h2>Tu rutina (plantilla ideal)</h2><div class="tarjeta">
      ${plantilla.dias.map((d) => `<div class="fila"><span class="que">${esc(d.nombre)}<small>${d.ejercicios.map((e) => esc(G.ejercicio(e.ej).nombre)).join(' · ')}</small></span></div>`).join('')}
    </div><p class="etiqueta" style="margin-top:8px">Editarla llega en la v1.0. Para cambiar un ejercicio en el día, «Cambiar» en la serie.</p></div>

    <div class="creditos">
      <p>Gofio ${VERSION} · Proyecto personal. Es una app de bienestar: no diagnostica ni trata nada. Ante dolor en el pecho, mareo fuerte o dolor articular agudo, para y consulta a un profesional (R8).</p>
      <p style="margin-top:8px">Cada número sale del libro de reglas, con su fuente. Letras: Bricolage Grotesque y Hanken Grotesk, licencia SIL Open Font License 1.1, incluidas en la app.</p>
      <a class="firma" href="https://sergiolearns.com" target="_blank" rel="noopener">hecho por Sergio Learns</a>
    </div>
    <button class="enlace" type="button" data-borrar style="margin-top:18px;align-self:flex-start">Borrar todos los datos de este móvil</button>
  </section>`);

  const $ = (s) => nodo.querySelector(s);
  $('[data-exportar]').onclick = async () => { vibrar(); await exportarCopia(); nav.refrescar(); };
  $('[data-importar]').onclick = () => importarCopia(() => nav.ir('hoy', {}, { modo: 'pestana' }));
  $('[data-recordatorio]').onchange = (e) => ponerAjuste('recordatorio', e.target.checked);
  $('[data-dps]').onchange = (e) => ponerAjuste('diasPorSemana', e.target.value === 'auto' ? null : Number(e.target.value));
  $('[data-min]').onchange = (e) => { const v = parseInt(e.target.value, 10); if (v >= 15 && v <= 180) ponerAjuste('minutos', v); else e.target.value = ajuste('minutos'); };
  nodo.querySelectorAll('[data-desc]').forEach((i) => i.addEventListener('change', () => {
    const v = parseInt(i.value, 10);
    if (v >= 30 && v <= 600) ponerAjuste('descanso', { ...ajuste('descanso'), [i.dataset.desc]: v }); else i.value = ajuste('descanso')[i.dataset.desc];
  }));
  nodo.querySelectorAll('[data-esc]').forEach((i) => i.addEventListener('change', () => {
    const v = leerEscalon(i.value);
    if (v == null) { i.value = verEscalon(ajuste('escalones')[i.dataset.esc]); return; }
    ponerAjuste('escalones', { ...(estado.ajustes.escalones ?? {}), [i.dataset.esc]: v }); i.value = verEscalon(v);
  }));
  nodo.querySelectorAll('[data-perfil]').forEach((i) => i.addEventListener('change', () => {
    const v = parseFloat(i.value.replace(',', '.'));
    ponerAjuste('perfil', { ...ajuste('perfil'), [i.dataset.perfil]: Number.isFinite(v) ? v : undefined });
  }));
  $('[data-cargas]').onclick = () => editarCargas(() => nav.refrescar());
  $('[data-borrar]').onclick = async () => {
    const ok = await confirmar({ titulo: 'Borrar todo', texto: 'Se borran sesiones, series, notas y ajustes de este móvil. Si no tienes copia, no hay vuelta atrás.', si: 'Borrar todo', peligro: true });
    if (!ok) return;
    await D.borrarTodo(); await arrancar(); nav.ir('bienvenida', {}, { modo: 'pestana' });
  };
  return { nodo, clara: true, pestana: 'ajustes' };
}

/** Editor de cargas de partida (también lo usa la bienvenida). */
export function formularioCargas() {
  const cargas = ajuste('cargasIniciales');
  const plantilla = ajuste('plantilla');
  const vistos = new Set();
  return plantilla.dias.map((d) => `<h3 style="font-size:13px;font-weight:700;margin:16px 0 4px;color:inherit;opacity:.75">${esc(d.nombre)}</h3>` + d.ejercicios.filter((e) => !vistos.has(e.ej) && vistos.add(e.ej)).map((e) => {
    const ej = G.ejercicio(e.ej);
    return `<label class="fila"><span class="que">${esc(ej.nombre)}<small>${ej.lastre ? 'kg de lastre' : ej.equipo === 'mancuernas' ? 'kg cada mancuerna' : 'kg'}</small></span><input class="campo" data-carga="${e.ej}" inputmode="decimal" placeholder="—" value="${cargas[e.ej] ?? ''}"></label>`;
  }).join('')).join('');
}
export async function guardarCargas(nodo) {
  const c = {};
  nodo.querySelectorAll('[data-carga]').forEach((i) => { const v = parseFloat(i.value.replace(',', '.')); if (Number.isFinite(v) && v >= 0) c[i.dataset.carga] = v; });
  await ponerAjuste('cargasIniciales', c);
}
function editarCargas(alTerminar) {
  const { nodo, cerrar } = hoja(`<h2>Cargas de partida</h2><p class="sub">Solo las que sepas. Se usan la primera vez; después manda tu historial (R12).</p>
    <div>${formularioCargas()}</div><div class="botones"><button class="boton" type="button">Guardar</button></div>`);
  nodo.querySelector('.boton').onclick = async () => { await guardarCargas(nodo); cerrar(); alTerminar?.(); };
}
export { mmss };
