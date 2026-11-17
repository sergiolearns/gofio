// Gofio · servidor de los avisos del descanso (G90). Un Worker gratuito de Cloudflare con un Durable Object por móvil.
// Solo guarda, mientras dura un descanso, la dirección de avisos del móvil (la da Apple: un enlace opaco) y los dos avisos
// (hora y texto). Los manda a su hora con Web Push (RFC 8030, cifrado RFC 8291, VAPID RFC 8292) y los borra.
// Las claves VAPID se generan aquí dentro la primera vez y nunca salen del servidor (la pública sí: la pide la app).
//
// Rutas: GET /clave · POST /programar {sub, avisos:[{en, titulo, cuerpo}]} · POST /cancelar {endpoint}
// Los POST llegan como texto plano (sendBeacon), así no necesitan permiso previo del navegador.

import { DurableObject } from 'cloudflare:workers';
import { cifrar, firmarVapid, generarClaves } from './webpush.js';

const ORIGENES = ['https://gofio.sergiolearns.com', 'http://localhost:8765'];
const SUJETO = 'https://gofio.sergiolearns.com';
const MAX_AVISOS = 2;          // G79: dos como mucho por descanso
const MAX_ADELANTO = 20 * 60e3; // un descanso no pasa de 20 minutos
const MAX_TEXTO = 140;

const cors = (origen) => ({
  'Access-Control-Allow-Origin': ORIGENES.includes(origen) ? origen : ORIGENES[0],
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin',
});
const json = (datos, origen, estado = 200) => new Response(JSON.stringify(datos), { status: estado, headers: { 'Content-Type': 'application/json', ...cors(origen) } });

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const origen = req.headers.get('Origin') || '';
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors(origen) });
    if (req.method === 'GET' && url.pathname === '/clave') {
      const claves = env.AVISOS.get(env.AVISOS.idFromName('claves'));
      return json({ clave: await claves.clavePublica() }, origen);
    }
    if (req.method !== 'POST') return json({ error: 'ruta' }, origen, 404);
    if (origen && !ORIGENES.includes(origen)) return json({ error: 'origen' }, origen, 403);
    let d;
    try { d = JSON.parse(await req.text()); } catch { return json({ error: 'json' }, origen, 400); }
    const endpoint = d?.sub?.endpoint ?? d?.endpoint;
    if (!valido(endpoint)) return json({ error: 'endpoint' }, origen, 400);
    const movil = env.AVISOS.get(env.AVISOS.idFromName('m:' + endpoint));
    if (url.pathname === '/cancelar') { await movil.cancelar(); return json({ ok: true }, origen); }
    if (url.pathname === '/programar') {
      const ahora = Date.now();
      const avisos = (Array.isArray(d.avisos) ? d.avisos : []).slice(0, MAX_AVISOS)
        .filter((a) => Number.isFinite(a?.en) && a.en <= ahora + MAX_ADELANTO && a.en >= ahora - 60e3)
        .map((a) => ({ en: Math.max(a.en, ahora), titulo: String(a.titulo ?? '').slice(0, MAX_TEXTO), cuerpo: String(a.cuerpo ?? '').slice(0, MAX_TEXTO) }));
      const k = d.sub?.keys;
      if (!avisos.length || !k?.p256dh || !k?.auth) return json({ error: 'datos' }, origen, 400);
      await movil.programar({ endpoint, p256dh: k.p256dh, auth: k.auth }, avisos);
      return json({ ok: true }, origen);
    }
    return json({ error: 'ruta' }, origen, 404);
  },
};

// Solo direcciones de los servicios de avisos conocidos (Apple, Google, Mozilla, Microsoft): el servidor no llama a cualquier sitio.
function valido(e) {
  try {
    const u = new URL(e);
    return u.protocol === 'https:' && /(^|\.)(push\.apple\.com|googleapis\.com|push\.services\.mozilla\.com|notify\.windows\.com)$/.test(u.hostname);
  } catch { return false; }
}

export class Avisos extends DurableObject {
  // El objeto «claves» guarda el par VAPID; los demás, uno por móvil, guardan su descanso en curso.
  async clavePublica() {
    let c = await this.ctx.storage.get('vapid');
    if (!c) { c = await generarClaves(); await this.ctx.storage.put('vapid', c); }
    return c.publica;
  }
  async programar(sub, avisos) {
    await this.ctx.storage.put({ sub, avisos });
    await this.ctx.storage.setAlarm(Math.min(...avisos.map((a) => a.en)));
  }
  async cancelar() { await this.ctx.storage.deleteAll(); await this.ctx.storage.deleteAlarm(); }
  async alarm() {
    const sub = await this.ctx.storage.get('sub');
    let avisos = (await this.ctx.storage.get('avisos')) ?? [];
    if (!sub || !avisos.length) { await this.ctx.storage.deleteAll(); return; }
    const ahora = Date.now();
    const toca = avisos.filter((a) => a.en <= ahora + 500);
    avisos = avisos.filter((a) => a.en > ahora + 500);
    const claves = this.env.AVISOS.get(this.env.AVISOS.idFromName('claves'));
    const vapid = await claves.claveCompleta();
    for (const a of toca) {
      let r;
      try { r = await enviar(sub, { titulo: a.titulo, cuerpo: a.cuerpo }, vapid); } catch { continue; } // sin red: ese aviso se pierde, nada más
      if (r.status === 404 || r.status === 410) { await this.ctx.storage.deleteAll(); return; } // el móvil ya no está suscrito
    }
    if (avisos.length) { await this.ctx.storage.put('avisos', avisos); await this.ctx.storage.setAlarm(Math.min(...avisos.map((a) => a.en))); }
    else await this.ctx.storage.deleteAll();   // nada se queda guardado
  }
  async claveCompleta() { await this.clavePublica(); return this.ctx.storage.get('vapid'); }
}

async function enviar(sub, datos, vapid) {
  const cuerpo = await cifrar(new TextEncoder().encode(JSON.stringify(datos)), sub.p256dh, sub.auth);
  const aud = new URL(sub.endpoint).origin;
  const jwt = await firmarVapid(aud, SUJETO, vapid);
  return fetch(sub.endpoint, {
    method: 'POST', body: cuerpo,
    headers: { 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '120', Urgency: 'high',
      Authorization: `vapid t=${jwt}, k=${vapid.publica}` },
  });
}
