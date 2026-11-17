// Los sonidos de Gofio (G56, G80-G83): piedra, madera, aire y eco, hechos por la propia app con Web Audio.
// Sin grabaciones ni archivos de terceros. El código de cada sonido es el del prototipo aprobado (v5,
// identidad/alma/prototipo/index.html), copiado tal cual; aquí solo se añaden los interruptores de Ajustes
// y el modo silencio del iPhone.
//
// Modo silencio: en iOS 17+ se pide la sesión de audio «ambient», que respeta el interruptor de silencio y suena
// encima de la música que lleves puesta (no la para). Lo que pase de verdad solo se sabe en el iPhone de Sergio.

let ctx = null, master = null, sala = null;
const ks = {};
let activo = true;   // «Sonidos» en Ajustes
let tictac = true;   // «Tic-tac en el descanso» en Ajustes

/** Lo llama la app al arrancar y al cambiar Ajustes. */
export function configurar({ sonidos = true, tictacDescanso = true } = {}) {
  activo = sonidos; tictac = tictacDescanso;
  if (!activo || !tictac) ambienteOff();
  if (!activo) pararReanima();
}
export const sonidosActivos = () => activo;
export const tictacActivo = () => activo && tictac;

function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    try { if (navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch { /* iOS < 17 */ }
    ctx = new C();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 3; comp.attack.value = 0.01;
    master = ctx.createGain(); master.gain.value = 0.6;
    master.connect(comp); comp.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
// iOS solo deja arrancar el audio dentro de un toque: se despierta en el primero.
document.addEventListener('pointerdown', () => { if (activo) ac(); }, { passive: true });
// Al volver a la app, iOS puede haber dejado el contexto «interrumpido».
document.addEventListener('visibilitychange', () => { if (!document.hidden && ctx && ctx.state !== 'running') ctx.resume().catch(() => {}); });

function ruido(seg, marron = false) {
  const n = Math.floor(ctx.sampleRate * seg), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
  let ult = 0;
  for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; if (marron) { ult = (ult + 0.02 * w) / 1.02; d[i] = ult * 3.5; } else d[i] = w; }
  return b;
}
function env(g, t, a, pico, dec, sostener = 0) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(pico, t + a);
  if (sostener) g.gain.setValueAtTime(pico, t + a + sostener);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + sostener + dec);
}
// La sala de eco: una respuesta de impulso generada por la app (ruido que se apaga en 2,4 s).
function eco() {
  if (sala) return sala;
  const sr = ctx.sampleRate, dur = 2.4, n = Math.floor(sr * dur), imp = ctx.createBuffer(2, n, sr);
  for (let c = 0; c < 2; c++) { const d = imp.getChannelData(c); for (let i = 0; i < n; i++) { const t = i / sr; d[i] = (Math.random() * 2 - 1) * Math.exp(-t * 2.6) * (t < 0.012 ? t / 0.012 : 1); } }
  const conv = ctx.createConvolver(); conv.buffer = imp;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
  const g = ctx.createGain(); g.gain.value = 0.55;
  conv.connect(lp); lp.connect(g); g.connect(master);
  sala = conv; return sala;
}
function envia(nodo, mojado = 0.3, seco = 1) {
  const gs = ctx.createGain(); gs.gain.value = seco; nodo.connect(gs); gs.connect(master);
  if (mojado > 0) { const gm = ctx.createGain(); gm.gain.value = mojado; nodo.connect(gm); gm.connect(eco()); }
}
function filtro(tipo, f, q = 0.7) { const x = ctx.createBiquadFilter(); x.type = tipo; x.frequency.value = f; x.Q.value = q; return x; }

// Golpe grande: sub que cae + cuerpo de piedra + cola grave, con eco
function impacto(t, fuerza = 1, mojado = 0.45) {
  const bus = ctx.createGain(); bus.gain.value = 1; envia(bus, mojado);
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(36, t + 0.4);
  const g = ctx.createGain(); env(g, t, 0.004, 1.0 * fuerza, 0.9); o.connect(g); g.connect(bus); o.start(t); o.stop(t + 1.1);
  const n = ctx.createBufferSource(); n.buffer = ruido(0.4, true);
  const lp = filtro('lowpass', 1100); const ng = ctx.createGain(); env(ng, t, 0.002, 0.9 * fuerza, 0.22);
  n.connect(lp); lp.connect(ng); ng.connect(bus); n.start(t); n.stop(t + 0.4);
  const c = ctx.createBufferSource(); c.buffer = ruido(0.05);
  const bp = filtro('bandpass', 1500, 1.2); const cg = ctx.createGain(); env(cg, t, 0.001, 0.28 * fuerza, 0.04);
  c.connect(bp); bp.connect(cg); cg.connect(bus); c.start(t); c.stop(t + 0.06);
}
// Subida de tensión: aire que se abre + tono grave que sube
function subida(t, dur = 0.65, fuerza = 1) {
  const bus = ctx.createGain(); envia(bus, 0.25);
  const n = ctx.createBufferSource(); n.buffer = ruido(dur + 0.1);
  const bp = filtro('bandpass', 250, 1.4); bp.frequency.setValueAtTime(250, t); bp.frequency.exponentialRampToValueAtTime(2600, t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32 * fuerza, t + dur); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.04);
  n.connect(bp); bp.connect(g); g.connect(bus); n.start(t); n.stop(t + dur + 0.1);
  const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(45, t); o.frequency.exponentialRampToValueAtTime(90, t + dur);
  const lp = filtro('lowpass', 300); const og = ctx.createGain(); og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.22 * fuerza, t + dur); og.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
  o.connect(lp); lp.connect(og); og.connect(bus); o.start(t); o.stop(t + dur + 0.1);
}
// Roce de piedra rodando
function rodar(t, dur = 0.55, fuerza = 1) {
  const n = ctx.createBufferSource(); n.buffer = ruido(dur + 0.2, true);
  const lp = filtro('lowpass', 260);
  const am = ctx.createGain(); am.gain.value = 0.5;
  const lfo = ctx.createOscillator(); lfo.frequency.setValueAtTime(16, t); lfo.frequency.exponentialRampToValueAtTime(5, t + dur);
  const lg = ctx.createGain(); lg.gain.value = 0.45; lfo.connect(lg); lg.connect(am.gain);
  const g = ctx.createGain(); env(g, t, 0.05, 0.9 * fuerza, 0.35, Math.max(0, dur - 0.4));
  n.connect(lp); lp.connect(am); am.connect(g); envia(g, 0.15); n.start(t); n.stop(t + dur + 0.2); lfo.start(t); lfo.stop(t + dur + 0.2);
}
// Roce de grano (al guardar): arena muy corta
function grano(t, fuerza = 1) {
  const n = ctx.createBufferSource(); n.buffer = ruido(0.12);
  const bp = filtro('bandpass', 3200, 0.9); const g = ctx.createGain(); env(g, t, 0.01, 0.16 * fuerza, 0.09);
  n.connect(bp); bp.connect(g); envia(g, 0.1); n.start(t); n.stop(t + 0.13);
}
// Golpe pequeño con peso (el grano llega, empezar serie)
function golpecito(t, f = 170, fuerza = 1) {
  const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f * 1.6, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
  const g = ctx.createGain(); env(g, t, 0.002, 0.55 * fuerza, 0.14); o.connect(g); envia(g, 0.22); o.start(t); o.stop(t + 0.2);
  const n = ctx.createBufferSource(); n.buffer = ruido(0.03); const lp = filtro('lowpass', 1800); const ng = ctx.createGain(); env(ng, t, 0.001, 0.18 * fuerza, 0.025);
  n.connect(lp); lp.connect(ng); ng.connect(master); n.start(t); n.stop(t + 0.04);
}
// Clic de botón: seco y corto (+ más claro, − más oscuro)
function clic(t, dir = 0) {
  const n = ctx.createBufferSource(); n.buffer = ruido(0.02);
  const bp = filtro('bandpass', dir > 0 ? 2300 : dir < 0 ? 1300 : 1800, 2.2);
  const g = ctx.createGain(); env(g, t, 0.0008, 0.38, 0.016); n.connect(bp); bp.connect(g); g.connect(master); n.start(t); n.stop(t + 0.03);
  const o = ctx.createOscillator(); o.frequency.value = dir > 0 ? 260 : dir < 0 ? 180 : 220; const og = ctx.createGain(); env(og, t, 0.001, 0.2, 0.03); o.connect(og); og.connect(master); o.start(t); o.stop(t + 0.05);
}
// Pop suave (elegir la reserva)
function pop(t) { const o = ctx.createOscillator(); o.frequency.setValueAtTime(560, t); o.frequency.exponentialRampToValueAtTime(330, t + 0.06); const g = ctx.createGain(); env(g, t, 0.003, 0.22, 0.07); o.connect(g); envia(g, 0.12); o.start(t); o.stop(t + 0.1); }
// Reloj mecánico: tic agudo y metálico, tac más grave y hueco
function tic(t, fuerza = 1) {
  const n = ctx.createBufferSource(); n.buffer = ruido(0.015);
  const hp = filtro('highpass', 2500); const bp = filtro('bandpass', 4200, 3); const g = ctx.createGain(); env(g, t, 0.0005, 0.22 * fuerza, 0.012);
  n.connect(hp); hp.connect(bp); bp.connect(g); g.connect(master); n.start(t); n.stop(t + 0.02);
  const o = ctx.createOscillator(); o.frequency.value = 3100; const og = ctx.createGain(); env(og, t, 0.0005, 0.04 * fuerza, 0.03); o.connect(og); og.connect(master); o.start(t); o.stop(t + 0.05);
}
function tac(t, fuerza = 1) {
  const n = ctx.createBufferSource(); n.buffer = ruido(0.025);
  const bp = filtro('bandpass', 1050, 4); const g = ctx.createGain(); env(g, t, 0.0008, 0.3 * fuerza, 0.02);
  n.connect(bp); bp.connect(g); g.connect(master); n.start(t); n.stop(t + 0.03);
  const o = ctx.createOscillator(); o.frequency.value = 640; const og = ctx.createGain(); env(og, t, 0.001, 0.07 * fuerza, 0.04); o.connect(og); og.connect(master); o.start(t); o.stop(t + 0.06);
}
// Ambiente del descanso: la muela girando, muy bajo
let ambiente = null;
export function ambienteOn() {
  if (ambiente || !tictacActivo() || !ac()) return;
  const n = ctx.createBufferSource(); n.buffer = ruido(4, true); n.loop = true;
  const lp = filtro('lowpass', 150); const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.07, ctx.currentTime + 1.2);
  n.connect(lp); lp.connect(g); g.connect(master); n.start(); ambiente = { n, g };
}
export function ambienteOff() {
  if (!ambiente || !ctx) return; const { n, g } = ambiente; ambiente = null;
  g.gain.cancelScheduledValues(ctx.currentTime); g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4); n.stop(ctx.currentTime + 0.45);
}
// Barrido (volver a casa)
function barrido(t) { const n = ctx.createBufferSource(); n.buffer = ruido(0.35); const bp = filtro('bandpass', 1400, 1); bp.frequency.setValueAtTime(1400, t); bp.frequency.exponentialRampToValueAtTime(380, t + 0.3); const g = ctx.createGain(); env(g, t, 0.06, 0.14, 0.24); n.connect(bp); bp.connect(g); envia(g, 0.2); n.start(t); n.stop(t + 0.36); }
// Aire corto que sube (+30 s)
function aire(t) { const n = ctx.createBufferSource(); n.buffer = ruido(0.25); const bp = filtro('bandpass', 500, 1.2); bp.frequency.setValueAtTime(500, t); bp.frequency.exponentialRampToValueAtTime(2200, t + 0.2); const g = ctx.createGain(); env(g, t, 0.08, 0.13, 0.12); n.connect(bp); bp.connect(g); envia(g, 0.15); n.start(t); n.stop(t + 0.26); }
// Chácara y tambor: solo en el 3-2-1-ya del descanso (G83)
function chacara(t, fuerza = 1) {
  [0, 0.045].forEach((dt, k) => {
    const src = ctx.createBufferSource(); src.buffer = ruido(0.05);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = k ? 2050 : 2400; bp.Q.value = 5;
    const bp2 = ctx.createBiquadFilter(); bp2.type = 'bandpass'; bp2.frequency.value = 1150; bp2.Q.value = 3;
    const g = ctx.createGain(); env(g, t + dt, 0.001, 0.9 * fuerza * (k ? 0.7 : 1), 0.045);
    src.connect(bp); src.connect(bp2); bp.connect(g); bp2.connect(g); g.connect(master); src.start(t + dt); src.stop(t + dt + 0.06);
    const o = ctx.createOscillator(); o.frequency.value = k ? 1700 : 1950; const og = ctx.createGain(); env(og, t + dt, 0.001, 0.12 * fuerza, 0.035);
    o.connect(og); og.connect(master); o.start(t + dt); o.stop(t + dt + 0.05);
  });
}
function tambor(t, fuerza = 1) {
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(125, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.18);
  const g = ctx.createGain(); env(g, t, 0.003, 1.0 * fuerza, 0.5);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.6);
  const n = ctx.createBufferSource(); n.buffer = ruido(0.08);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
  const ng = ctx.createGain(); env(ng, t, 0.001, 0.45 * fuerza, 0.06);
  n.connect(lp); lp.connect(ng); ng.connect(master); n.start(t); n.stop(t + 0.1);
}
// Reanimación: tensión que sube durante los últimos segundos del descanso (G83: sustituye al timple)
let reanimaNodos = null;
function reanima(t, dur = 10) {
  pararReanima();
  const bus = ctx.createGain(); envia(bus, 0.25);
  const n = ctx.createBufferSource(); n.buffer = ruido(dur + 0.3);
  const bp = filtro('bandpass', 220, 1.2); bp.frequency.setValueAtTime(220, t); bp.frequency.exponentialRampToValueAtTime(1900, t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + dur); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
  n.connect(bp); bp.connect(g); g.connect(bus);
  const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(40, t); o.frequency.exponentialRampToValueAtTime(72, t + dur);
  const lp = filtro('lowpass', 260); const og = ctx.createGain(); og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.12, t + dur); og.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
  o.connect(lp); lp.connect(og); og.connect(bus);
  n.start(t); o.start(t); n.stop(t + dur + 0.2); o.stop(t + dur + 0.2);
  reanimaNodos = { n, o, g, og };
}
export function pararReanima() {
  if (!reanimaNodos || !ctx) return; const { n, o, g, og } = reanimaNodos; reanimaNodos = null; const t = ctx.currentTime;
  [g, og].forEach((x) => { x.gain.cancelScheduledValues(t); x.gain.setValueAtTime(Math.max(x.gain.value, 0.0001), t); x.gain.exponentialRampToValueAtTime(0.0001, t + 0.25); });
  try { n.stop(t + 0.3); o.stop(t + 0.3); } catch { /* ya parado */ }
}

// Los momentos (tabla del concepto, sección 5).
const SON = {
  amoler(t) { rodar(t, 0.42, 0.75); impacto(t + 0.55, 0.55, 0.3); subida(t + 0.58, 0.62); impacto(t + 1.2, 1, 0.55); rodar(t + 1.25, 0.9, 0.6); },
  guardar(t) { grano(t); golpecito(t + 0.5, 170, 1); },
  rodar(t) { rodar(t, 0.55); },
  sube(t, dur = 10) { reanima(t, dur); },
  chacara(t, fuerza = 0.75) { chacara(t, fuerza); },
  tambor(t) { tambor(t, 1); },
  marca(t) { golpecito(t, 120, 0.9); subida(t + 0.02, 0.28, 0.6); impacto(t + 0.3, 0.6, 0.4); },
  hecho(t) { impacto(t + 0.2, 1, 0.6); impacto(t + 0.55, 0.45, 0.5); rodar(t + 0.6, 1.4, 0.7); },
};

/** Un momento: 'amoler', 'guardar', 'rodar', 'sube', 'chacara', 'tambor', 'marca' o 'hecho'. */
export function suena(nombre, retraso = 0, ...extra) {
  if (!activo) return;
  const c = ac(); if (!c) return;
  SON[nombre](c.currentTime + 0.02 + retraso, ...extra);
}
/** Toque de botón (G81-G82): +1 / −1 / 0 clic, 'pop' la reserva, 'piedra' empezar serie, 'aire' +30, 'barrido' volver. */
export function toque(tipo = 0) {
  if (!activo || !ac()) return;
  const t = ctx.currentTime + 0.005;
  if (tipo === 'pop') pop(t); else if (tipo === 'piedra') golpecito(t, 150, 0.8); else if (tipo === 'aire') aire(t); else if (tipo === 'barrido') barrido(t); else clic(t, tipo);
}
/** El reloj del descanso: un tic o un tac por segundo (más marcado en los últimos 10 s). */
export function reloj(segundo, fuerte = false) {
  if (!tictacActivo() || !ac()) return;
  (segundo % 2 ? tic : tac)(ctx.currentTime + 0.01, fuerte ? 1 : 0.6);
}
