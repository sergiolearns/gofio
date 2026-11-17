// Ajustes: copia de seguridad (exportar e importar), escalones de carga, cómo entreno, mis datos, rutina y créditos.
import * as G from '../cerebro/index.js';
import * as D from '../datos.js';
import { estado, ajuste, ponerAjuste, arrancar, DESCANSO_POR_DEFECTO } from '../logica.js';
import { el, esc, kg, mmss, icono, hoja, confirmar, avisar, vibrar, escalonar, pedirNumero } from '../ui.js';
import * as S from '../sonidos.js';
import { SERVIDOR, avisosPosibles, avisosActivos, encenderAvisos, apagarAvisos } from '../avisos.js';

const NOMBRE_EQUIPO = { barra: 'Barra', smith: 'Smith', mancuernas: 'Mancuernas', maquina: 'Máquinas', polea: 'Poleas', lastre: 'Lastre' };
export const VERSION = '0.1.12';

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
  avisar('Al zurrón.');
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
        titulo: '¿Importar esta copia?',
        texto: `${resumen.sesiones} sesiones y ${resumen.series} series${resumen.desde ? ` (${resumen.desde} – ${resumen.hasta})` : ''}. Sustituye lo que hay ahora.`,
        si: 'Importar', peligro: true,
      });
      if (!ok) return;
      await D.importar(copia); await arrancar();
      avisar('Copia importada'); alTerminar?.();
    } catch (e) { avisar(e.message || 'Ese archivo no vale'); }
  };
  input.click();
}

const leerEscalon = (t) => {
  const xs = String(t).split(/[;\s]+|,(?=\s)/).map((x) => parseFloat(x.replace(',', '.'))).filter((x) => Number.isFinite(x) && x >= 0);
  if (!xs.length) return null;
  return xs.length === 1 ? xs[0] : [...new Set(xs)].sort((a, b) => a - b);
};
const verEscalon = (v) => (Array.isArray(v) ? v.map(kg).join('; ') : kg(v));

/** G63 · La app instalada antes de la 0.1.7 conserva la barra translúcida (iOS la guarda al instalar). */
export const instalacionVieja = () => !!navigator.standalone && (window.gofioPantalla?.arriba ?? 0) > 0;

export function ajustesPantalla(_, nav) {
  const esc_ = ajuste('escalones');
  const desc = ajuste('descanso');
  const dps = ajuste('diasPorSemana');
  const ultima = ajuste('ultimaCopia');
  const plantilla = ajuste('plantilla');
  const nSes = estado.sesiones.filter((s) => s.estado === 'hecha').length;
  const objetivo = G.OBJETIVOS[ajuste('objetivo')]?.nombre ?? 'Recomposición';
  const haceCopia = ultima ? G.diasEntre(ultima.slice(0, 10), G.hoyLocal()) : null;
  const copiaTxt = haceCopia == null ? 'sin copia aún' : haceCopia === 0 ? 'copia de hoy' : haceCopia === 1 ? 'copia de ayer' : `copia hace ${haceCopia} días`;
  const sonidos = ajuste('sonidos') !== false, tictac = ajuste('tictac') !== false;
  const avisosOn = avisosActivos();
  const avisosSub = !SERVIDOR ? 'Pronto: falta montar el servidor' : !avisosPosibles() ? 'Solo con la app instalada en el iPhone' : 'Si sales, te aviso al acabar';
  const interruptor = (dato, on, extra = '') => `<span class="interruptor"><input type="checkbox" role="switch" ${dato} ${on ? 'checked' : ''} ${extra}><i></i></span>`;
  const resumenEsc = `Mancuernas ${verEscalon(esc_.mancuernas)} · discos ${verEscalon(esc_.barra)}`;

  const nodo = el(`<section class="ajustes" aria-labelledby="titulo-ajustes">
    <h1 class="titular grande" id="titulo-ajustes">Ajustes</h1>
${instalacionVieja() ? `
    <div class="grupo"><h2>Falta un paso</h2><div class="tarjeta">
      <div class="fila"><span class="que">Vuelve a instalar Gofio<small>Tu iPhone guardó cómo se veía la app al instalarla. Para que llegue al borde de abajo:<br>1. Guarda una copia (en «El zurrón»).<br>2. Quita Gofio de la pantalla de inicio.<br>3. En Safari, abre gofio.sergiolearns.com. Si sale «Hay versión nueva», toca «Actualizar».<br>4. Compartir → Añadir a pantalla de inicio.<br>5. Ábrela y toca «Tengo una copia».</small></span></div>
    </div></div>` : ''}

    <div class="grupo"><h2>Tu plan</h2><div class="tarjeta">
      <button class="fila tocable" type="button" data-plan style="width:100%;text-align:left"><span class="que">${esc(plantilla.propuesta ? 'La rutina de Gofio' : 'Tu rutina')}<small>${esc(objetivo)} · ${plantilla.dias.length} días · ${plantilla.dias.map((d) => esc(d.nombre)).join(', ')}</small></span><span class="enlace">Cambiar</span></button>
    </div></div>

    <div class="grupo"><h2>El zurrón</h2><div class="tarjeta">
      <div class="fila" style="border:0;padding-bottom:4px"><span class="que">Todo vive solo en este móvil<small>${nSes} ${nSes === 1 ? 'molienda' : 'moliendas'} · ${copiaTxt}</small></span></div>
      <div class="botones-zurron"><button class="boton oscuro" type="button" data-exportar>Guardar copia</button><button class="boton harina" type="button" data-importar>Importar</button></div>
      <label class="fila"><span class="que">Recuérdamelo los domingos</span>${interruptor('data-recordatorio', ajuste('recordatorio'))}</label>
    </div></div>

    <div class="grupo"><h2>Sonidos</h2><div class="tarjeta">
      <label class="fila"><span class="que">Sonidos<small>Piedra, madera y aire. Solo en lo importante.</small></span>${interruptor('data-sonidos', sonidos)}</label>
      <label class="fila"><span class="que">Tic-tac en el descanso<small>Reloj y la muela de fondo, muy bajo</small></span>${interruptor('data-tictac', tictac, sonidos ? '' : 'disabled')}</label>
      <label class="fila"><span class="que">Avisos al salir del descanso<small data-avisos-sub>${esc(avisosSub)}</small></span>${interruptor('data-avisos', avisosOn, avisosPosibles() ? '' : 'disabled')}</label>
    </div></div>

    <div class="grupo"><h2>Entreno</h2><div class="tarjeta">
      <label class="fila"><span class="que">Días por semana<small>Auto = tu media</small></span><span class="valor-caja"><span data-dps-v>${dps ?? 'Auto'}</span>
        <select data-dps aria-label="Días por semana">${['auto', 1, 2, 3, 4, 5, 6].map((v) => `<option value="${v}" ${String(dps ?? 'auto') === String(v) ? 'selected' : ''}>${v === 'auto' ? 'Auto' : v}</option>`).join('')}</select></span></label>
      <button class="fila tocable" type="button" data-min style="width:100%;text-align:left"><span class="que">Minutos por sesión</span><span class="valor-caja">${ajuste('minutos')}</span></button>
      <button class="fila tocable" type="button" data-desc="multi" style="width:100%;text-align:left"><span class="que">Descanso largo<small>Ejercicios grandes</small></span><span class="valor-caja">${mmss(desc.multi)}</span></button>
      <button class="fila tocable" type="button" data-desc="aislamiento" style="width:100%;text-align:left"><span class="que">Descanso corto<small>Ejercicios pequeños</small></span><span class="valor-caja">${mmss(desc.aislamiento)}</span></button>
      <button class="fila tocable" type="button" data-escalones style="width:100%;text-align:left"><span class="que">Escalones del gimnasio<small>${esc(resumenEsc)}</small></span><span class="valor-caja">Ver</span></button>
      <button class="fila tocable" type="button" data-cargas style="width:100%;text-align:left"><span class="que">Pesos de partida<small>${Object.keys(ajuste('cargasIniciales')).length} con peso · el resto, en la primera serie</small></span><span class="valor-caja">Ver</span></button>
    </div></div>

    <div class="grupo"><h2>Sobre ti</h2><div class="tarjeta">
      <button class="fila tocable" type="button" data-perfil style="width:100%;text-align:left"><span class="que">Peso, altura y edad<small>Para la comida, que llega pronto</small></span><span class="enlace">Editar</span></button>
    </div></div>

    <div class="grupo"><h2>Pantalla</h2><div class="tarjeta">
      <div class="fila"><span class="que">Reducir movimiento<small>Lo decide tu iPhone${matchMedia('(prefers-reduced-motion: reduce)').matches ? ' · ahora, sí' : ''}</small></span></div>
      <div class="fila"><span class="que">Medidas<small data-medidas></small></span></div>
    </div></div>

    <div class="pie-ajustes">
      <button class="enlace" type="button" data-borrar>Borrar todo</button>
      <p>Gofio ${VERSION} · Hecho en Canarias</p>
      <button class="enlace" type="button" data-version style="font-size:14px">Buscar versión nueva</button>
    </div>
    <p class="legal">App de bienestar, no médica. Si notas dolor en el pecho, mareo fuerte o dolor en una articulación, para y consulta. Letras: Bricolage Grotesque y Hanken Grotesk (licencia OFL). <a href="https://sergiolearns.com" target="_blank" rel="noopener">Hecho por Sergio Learns</a>.</p>
  </section>`);

  const $ = (q) => nodo.querySelector(q);
  $('[data-exportar]').onclick = async () => { vibrar(); await exportarCopia(); nav.refrescar(); };
  $('[data-importar]').onclick = () => importarCopia(() => nav.ir('hoy', {}, { modo: 'pestana' }));
  $('[data-recordatorio]').onchange = (e) => { vibrar(); ponerAjuste('recordatorio', e.target.checked); };
  $('[data-sonidos]').onchange = async (e) => {
    vibrar(); await ponerAjuste('sonidos', e.target.checked);
    S.configurar({ sonidos: e.target.checked, tictacDescanso: ajuste('tictac') !== false });
    $('[data-tictac]').disabled = !e.target.checked;
    if (e.target.checked) S.toque(1);
  };
  $('[data-tictac]').onchange = async (e) => { vibrar(); await ponerAjuste('tictac', e.target.checked); S.configurar({ sonidos: ajuste('sonidos') !== false, tictacDescanso: e.target.checked }); };
  $('[data-avisos]').onchange = async (e) => {
    vibrar();
    if (e.target.checked) {
      const fallo = await encenderAvisos();
      if (fallo) { e.target.checked = false; avisar(fallo); } else avisar('Te aviso al acabar cada descanso.');
    } else await apagarAvisos();
  };
  $('[data-dps]').onchange = (e) => { ponerAjuste('diasPorSemana', e.target.value === 'auto' ? null : Number(e.target.value)); $('[data-dps-v]').textContent = e.target.value === 'auto' ? 'Auto' : e.target.value; };
  $('[data-min]').onclick = async () => {
    const v = await pedirNumero({ titulo: 'Minutos por sesión', sub: 'Lo que sueles tener, de 15 a 180.', valor: ajuste('minutos'), unidad: 'min', decimal: false });
    if (v >= 15 && v <= 180) { await ponerAjuste('minutos', Math.round(v)); nav.refrescar(); }
  };
  nodo.querySelectorAll('[data-desc]').forEach((b) => b.addEventListener('click', () => elegirDescanso(b.dataset.desc, () => nav.refrescar())));
  $('[data-escalones]').onclick = () => editarEscalones(() => nav.refrescar());
  $('[data-cargas]').onclick = () => editarCargas(() => nav.refrescar());
  $('[data-perfil]').onclick = () => editarPerfil();
  $('[data-version]').onclick = async (e) => {
    e.currentTarget.textContent = 'Buscando…';
    const hay = await window.gofioBuscarVersion?.();
    e.currentTarget.textContent = hay ? 'Actualizando…' : 'Ya tienes la última';
  };
  $('[data-plan]').onclick = () => nav.ir('bienvenida', { paso: 1, desdeAjustes: true });
  $('[data-borrar]').onclick = async () => {
    const ok = await confirmar({ titulo: '¿Borrar todo?', texto: 'Sesiones, series, notas y ajustes de este móvil. Sin nada en el zurrón, no hay vuelta atrás.', si: 'Borrar todo', peligro: true });
    if (!ok) return;
    await D.borrarTodo(); await arrancar(); nav.ir('bienvenida', {}, { modo: 'pestana' });
  };
  // G61 · Medidas de la pantalla, por si algo no encaja: con una captura de esta línea se ve qué hace iOS.
  const med = nodo.querySelector('[data-medidas]');
  const cs = getComputedStyle(document.documentElement);
  const ar = window.gofioPantalla?.arriba;
  const barra = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')?.content;
  med.textContent = `${screen.width} × ${screen.height} · falta ${cs.getPropertyValue('--falta').trim() || '0px'}`.replace('px', ' px')
    + (navigator.standalone ? ` · barra ${ar > 0 ? 'translúcida' : 'opaca'}` : ` · en Safari · al instalar, barra ${barra === 'default' ? 'opaca' : 'translúcida'}`);
  return { nodo, clara: true, pestana: 'ajustes', alEntrar({ refresco } = {}) { if (!refresco) escalonar(nodo.querySelectorAll('.grupo, .pie-ajustes'), { desde: 40, retraso: 50 }); } };
}

/** Descanso largo o corto (R24): por defecto 2:30 y 1:30; nunca menos de 60 s. */
function elegirDescanso(clave, alTerminar) {
  const actual = ajuste('descanso')[clave];
  const opciones = [60, 90, 120, 150, 180, 210, 240];
  const { nodo, cerrar } = hoja(`<h2>${clave === 'multi' ? 'Descanso largo' : 'Descanso corto'}</h2><p class="sub">${clave === 'multi' ? 'Ejercicios grandes. Gofio propone 2:30.' : 'Ejercicios pequeños. Gofio propone 1:30.'}</p>
    <div class="fila-opciones" style="flex-wrap:wrap">${opciones.map((v) => `<button class="chip" type="button" data-v="${v}" aria-pressed="${v === actual}" style="flex:1 0 22%">${mmss(v)}</button>`).join('')}</div>`, { clara: true });
  nodo.querySelectorAll('[data-v]').forEach((b) => b.addEventListener('click', async () => {
    await ponerAjuste('descanso', { ...ajuste('descanso'), [clave]: Number(b.dataset.v) }); vibrar(); cerrar(); alTerminar?.();
  }));
}
/** Escalones de carga del gimnasio (R12): un salto fijo o la lista de pesos que existen. */
function editarEscalones(alTerminar) {
  const e = ajuste('escalones');
  const { nodo, cerrar } = hoja(`<h2>Escalones del gimnasio</h2><p class="sub">Salto fijo (2,5) o la lista de pesos que hay (10; 12; 14). Cuando toca subir, Gofio salta al siguiente que exista.</p>
    <div>${Object.keys(G.ESCALONES_POR_DEFECTO).map((k) => `<label class="fila"><span class="que">${NOMBRE_EQUIPO[k]}</span><input class="campo" data-esc="${k}" inputmode="text" value="${esc(verEscalon(e[k]))}"></label>`).join('')}</div>
    <div class="botones"><button class="boton" type="button">Guardar</button></div>`, { clara: true });
  nodo.querySelector('.boton').onclick = async () => {
    const nuevo = { ...(estado.ajustes.escalones ?? {}) };
    nodo.querySelectorAll('[data-esc]').forEach((i) => { const v = leerEscalon(i.value); if (v != null) nuevo[i.dataset.esc] = v; });
    await ponerAjuste('escalones', nuevo); cerrar(); alTerminar?.();
  };
}
/** Peso, altura y edad (para la comida, v0.3). Opcional. */
function editarPerfil() {
  const perfil = ajuste('perfil');
  const { nodo, cerrar } = hoja(`<h2>Sobre ti</h2><p class="sub">Opcional. Para la comida, que llega pronto.</p>
    <div><label class="fila"><span class="que">Peso<small>kg</small></span><input class="campo" data-perfil="peso" inputmode="decimal" value="${perfil.peso ?? ''}"></label>
    <label class="fila"><span class="que">Altura<small>cm</small></span><input class="campo" data-perfil="altura" inputmode="numeric" value="${perfil.altura ?? ''}"></label>
    <label class="fila"><span class="que">Edad</span><input class="campo" data-perfil="edad" inputmode="numeric" value="${perfil.edad ?? ''}"></label></div>
    <div class="botones"><button class="boton" type="button">Guardar</button></div>`, { clara: true });
  nodo.querySelector('.boton').onclick = async () => {
    const p = {}; nodo.querySelectorAll('[data-perfil]').forEach((i) => { const v = parseFloat(i.value.replace(',', '.')); if (Number.isFinite(v)) p[i.dataset.perfil] = v; });
    await ponerAjuste('perfil', p); cerrar(); avisar('Guardado.');
  };
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
  const { nodo, cerrar } = hoja(`<h2>Pesos de partida</h2><p class="sub">Solo los que sepas. Luego manda lo que hagas.</p>
    <div>${formularioCargas()}</div><div class="botones"><button class="boton" type="button">Guardar</button></div>`);
  nodo.querySelector('.boton').onclick = async () => { await guardarCargas(nodo); cerrar(); alTerminar?.(); };
}
export { mmss };
