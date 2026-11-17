// Pruebas del servidor de avisos: el móvil (simulado) descifra lo que cifra el servidor y la firma VAPID es válida.
// node --test servidor-avisos/prueba.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cifrar, firmarVapid, generarClaves, b64url, deB64url } from './src/webpush.js';

const te = new TextEncoder();
const unir = (...xs) => { const o = new Uint8Array(xs.reduce((a, x) => a + x.length, 0)); let i = 0; for (const x of xs) { o.set(x, i); i += x.length; } return o; };
async function hkdf(sal, ikm, info, n) { const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']); return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: sal, info }, k, n * 8)); }

// Lo que hace el navegador al recibir el aviso (RFC 8291, del lado del agente de usuario).
async function descifrar(cuerpo, uaPar, auth) {
  const sal = cuerpo.slice(0, 16), idlen = cuerpo[20], asPublica = cuerpo.slice(21, 21 + idlen), cifrado = cuerpo.slice(21 + idlen);
  const uaPublica = new Uint8Array(await crypto.subtle.exportKey('raw', uaPar.publicKey));
  const as = await crypto.subtle.importKey('raw', asPublica, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const compartido = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: as }, uaPar.privateKey, 256));
  const ikm = await hkdf(auth, compartido, unir(te.encode('WebPush: info\0'), uaPublica, asPublica), 32);
  const cek = await hkdf(sal, ikm, te.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(sal, ikm, te.encode('Content-Encoding: nonce\0'), 12);
  const k = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
  const claro = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, k, cifrado));
  assert.equal(claro.at(-1), 2);
  return new TextDecoder().decode(claro.slice(0, -1));
}

test('el móvil descifra el aviso (RFC 8291)', async () => {
  const ua = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const auth = crypto.getRandomValues(new Uint8Array(16));
  const p256dh = b64url(await crypto.subtle.exportKey('raw', ua.publicKey));
  const msg = JSON.stringify({ titulo: 'Embúllate.', cuerpo: 'Te toca la serie 2 de prensa: 180 × 12.' });
  const cuerpo = await cifrar(te.encode(msg), p256dh, b64url(auth));
  assert.equal(await descifrar(cuerpo, ua, auth), msg);
});

test('la firma VAPID se verifica con la clave pública', async () => {
  const c = await generarClaves();
  const jwt = await firmarVapid('https://web.push.apple.com', 'https://gofio.sergiolearns.com', c);
  const [h, p, f] = jwt.split('.');
  const pub = await crypto.subtle.importKey('raw', deB64url(c.publica), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  assert.ok(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pub, deB64url(f), te.encode(`${h}.${p}`)));
  const carga = JSON.parse(new TextDecoder().decode(deB64url(p)));
  assert.equal(carga.aud, 'https://web.push.apple.com');
  assert.ok(carga.exp > Date.now() / 1000);
  assert.equal(deB64url(c.publica).length, 65);
});
