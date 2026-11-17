// Avisos del descanso si sales de la app (G72, G73, G79, G90). En el iPhone una app web solo puede avisar con
// Web Push, y alguien tiene que mandar el aviso a su hora: un Worker gratuito de Cloudflare (servidor-avisos/).
//
// Qué viaja al servidor, y solo si los avisos están encendidos y sales de la app en mitad de un descanso:
//  · la dirección de avisos que da Apple (un enlace opaco, sin tu nombre) con sus dos claves de cifrado;
//  · la hora de cada aviso (dos como mucho: al salir y al acabar) y su texto («Embúllate.», «Te toca…»).
// Nada más: ni historial, ni pesos guardados, ni comidas. El servidor lo borra al enviarlo o al volver tú a la app.
// Sin servidor (o sin conexión) no pasa nada: el descanso sigue contando igual dentro de la app.
import { ajuste, ponerAjuste } from './logica.js';

/** Dirección del Worker en la cuenta de Cloudflare de Sergio (desplegado el 17 nov 2026; guía en servidor-avisos/LEEME.md). */
export const SERVIDOR = 'https://gofio-avisos.sergio-medina-ospina.workers.dev';

const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const deB64url = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

/** ¿Puede este móvil recibir avisos? En el iPhone, solo con la app instalada en la pantalla de inicio (iOS 16.4+). */
export function avisosPosibles() {
  return !!SERVIDOR && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}
export const avisosActivos = () => avisosPosibles() && ajuste('avisos') === true && Notification.permission === 'granted';

/** Enciende los avisos (tiene que llamarse dentro de un toque: iOS solo pregunta así). Devuelve un texto si no se pudo. */
export async function encenderAvisos() {
  if (!SERVIDOR) return 'Falta montar el servidor de los avisos.';
  if (!avisosPosibles()) return navigator.standalone === false ? 'Abre Gofio desde el icono de la pantalla de inicio.' : 'Este móvil no admite avisos de apps web.';
  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') return 'Sin permiso para avisar. Se cambia en Ajustes del iPhone → Notificaciones → Gofio.';
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const r = await fetch(`${SERVIDOR}/clave`);
      if (!r.ok) throw new Error('clave');
      const { clave } = await r.json();
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: deB64url(clave) });
    }
    await ponerAjuste('avisos', true);
    return null;
  } catch {
    return 'No se pudo hablar con el servidor de los avisos. Prueba con conexión.';
  }
}
export async function apagarAvisos() {
  await ponerAjuste('avisos', false);
  try { const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription(); await sub?.unsubscribe(); } catch { /* da igual */ }
}

async function suscripcion() {
  try { const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription(); return sub ? sub.toJSON() : null; } catch { return null; }
}
// sendBeacon con texto plano: llega aunque iOS congele la app justo después (y no necesita permiso previo del servidor).
function mandar(ruta, datos) {
  const cuerpo = new Blob([JSON.stringify(datos)], { type: 'text/plain' });
  try { if (navigator.sendBeacon?.(`${SERVIDOR}${ruta}`, cuerpo)) return; } catch { /* sigue */ }
  fetch(`${SERVIDOR}${ruta}`, { method: 'POST', body: cuerpo, keepalive: true, mode: 'cors' }).catch(() => {});
}

// El descanso en curso, tal como lo ve la pantalla del descanso (lo pone y lo quita ella).
let descanso = null; // { hasta: ms, frase: '…', siguiente: 'Te toca la serie 2 de prensa: 180 × 12.' }
let programado = false;
let sub = null;
export function descansoEnCurso(d) {
  descanso = d;
  if (!d) { cancelar(); return; }
  if (avisosActivos() && !sub) suscripcion().then((x) => { sub = x; });   // ya a mano antes de salir de la app
}

async function alSalir() {
  if (!descanso || programado || !avisosActivos()) return;
  const quedan = descanso.hasta - Date.now();
  if (quedan < 5000) return;                                   // ya casi está: no hace falta avisar
  sub = sub ?? await suscripcion(); if (!sub) return;
  const m = Math.floor(quedan / 60000), s = Math.round((quedan % 60000) / 1000);
  // G79: dos avisos como mucho. Al salir, cuánto queda; al acabar, la frase de la reanimación y la siguiente serie.
  mandar('/programar', { sub, avisos: [
    { en: Date.now(), titulo: 'Respira.', cuerpo: `Quedan ${m}:${String(s).padStart(2, '0')}. Te aviso al acabar.` },
    { en: descanso.hasta, titulo: descanso.frase || 'Embúllate.', cuerpo: descanso.siguiente || '¡A la brega!' },
  ] });
  programado = true;
}
function cancelar() {
  if (!programado || !sub) return;
  programado = false;
  mandar('/cancelar', { endpoint: sub.endpoint });
}

export function iniciarAvisos() {
  if (!SERVIDOR) return;
  document.addEventListener('visibilitychange', () => { if (document.hidden) alSalir(); else cancelar(); });
  addEventListener('pagehide', () => alSalir());
}
export { b64url };
