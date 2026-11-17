// Web Push con WebCrypto, sin librerías: cifrado «aes128gcm» (RFC 8188 + RFC 8291) y firma VAPID ES256 (RFC 8292).
// Funciona igual en Cloudflare Workers y en Node 20+ (las pruebas lo descifran como lo haría el móvil).
const te = new TextEncoder();
export const b64url = (b) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const deB64url = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const unir = (...xs) => { const n = xs.reduce((a, x) => a + x.length, 0); const o = new Uint8Array(n); let i = 0; for (const x of xs) { o.set(x, i); i += x.length; } return o; };

async function hkdf(sal, ikm, info, largo) {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: sal, info }, k, largo * 8));
}

/** Par de claves VAPID (P-256). La pública va en crudo (65 bytes) y en base64url, como la pide el navegador. */
export async function generarClaves() {
  const par = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const publica = b64url(await crypto.subtle.exportKey('raw', par.publicKey));
  const privada = await crypto.subtle.exportKey('jwk', par.privateKey);
  return { publica, privada };
}

/** VAPID: un JWT ES256 con la audiencia (el origen del servicio de avisos), caducidad de 12 h y el sujeto. */
export async function firmarVapid(aud, sub, { privada }) {
  const cab = b64url(te.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const carga = b64url(te.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub })));
  const k = await crypto.subtle.importKey('jwk', privada, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const firma = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, k, te.encode(`${cab}.${carga}`)); // ya en r‖s (64 bytes)
  return `${cab}.${carga}.${b64url(firma)}`;
}

/** RFC 8291: cifra el mensaje para la suscripción (p256dh y auth en base64url). Devuelve el cuerpo «aes128gcm». */
export async function cifrar(mensaje, p256dh, auth, { sal = crypto.getRandomValues(new Uint8Array(16)), parLocal = null } = {}) {
  const uaPublica = deB64url(p256dh);
  const secreto = deB64url(auth);
  const local = parLocal ?? await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublica = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey));
  const ua = await crypto.subtle.importKey('raw', uaPublica, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const compartido = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: ua }, local.privateKey, 256));
  const ikm = await hkdf(secreto, compartido, unir(te.encode('WebPush: info\0'), uaPublica, asPublica), 32);
  const cek = await hkdf(sal, ikm, te.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(sal, ikm, te.encode('Content-Encoding: nonce\0'), 12);
  const clave = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const relleno = unir(mensaje, new Uint8Array([2]));        // delimitador del último registro
  const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, clave, relleno));
  const rs = new Uint8Array(4); new DataView(rs.buffer).setUint32(0, 4096);
  return unir(sal, rs, new Uint8Array([asPublica.length]), asPublica, cifrado);
}
