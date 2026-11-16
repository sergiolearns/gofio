// Service worker de Gofio: guarda la app para que funcione sin conexión (en el sótano del gimnasio).
// Al publicar una versión nueva se cambia VERSION; la app avisa y el usuario decide cuándo actualizar.
const VERSION = 'gofio-0.1.9';
const ARCHIVOS = [
  './', 'index.html', 'manifest.webmanifest',
  'css/variables.css', 'css/app.css',
  'letras/bricolage-grotesque-latin.woff2', 'letras/hanken-grotesk-latin.woff2',
  'iconos/apple-touch-icon.png', 'iconos/favicon-32.png', 'iconos/icono.svg', 'iconos/icono-192.png', 'iconos/icono-512.png',
  'iconos/icono-maskable-192.png', 'iconos/icono-maskable-512.png',
  'iconos/disco-millo.svg', 'iconos/disco-negro.svg', 'iconos/disco-negro-solo-gofio.svg', 'iconos/disco-sello-almagre.svg', 'iconos/gofio-logo-oscuro.svg', 'iconos/gofio-logo-claro.svg',
  'js/app.js', 'js/datos.js', 'js/logica.js', 'js/ui.js',
  'js/pantallas/index.js', 'js/pantallas/hoy.js', 'js/pantallas/serie.js', 'js/pantallas/hecho.js', 'js/pantallas/semana.js',
  'js/pantallas/ajustes.js', 'js/pantallas/bienvenida.js',
  'js/cerebro/index.js', 'js/cerebro/musculos.js', 'js/cerebro/fechas.js', 'js/cerebro/ejercicios.js', 'js/cerebro/plantilla.js',
  'js/cerebro/volumen.js', 'js/cerebro/esfuerzo.js', 'js/cerebro/progresion.js', 'js/cerebro/vuelta.js', 'js/cerebro/planificador.js',
  'js/cerebro/dia-malo.js', 'js/cerebro/sustituciones.js', 'js/cerebro/constancia.js', 'js/cerebro/generador.js',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ARCHIVOS)));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('gofio-') && k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', (e) => { if (e.data === 'saltar') self.skipWaiting(); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // La página (index.html), primero de la red: así lo que se instala desde Safari es siempre lo último (G63; iOS
  // guarda la barra de estado y la imagen de arranque al instalar). Sin conexión, la guardada.
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request, { cache: 'no-cache' }).catch(() => caches.match('index.html')));
    return;
  }
  // El resto, primero lo guardado (rápido y sin conexión en el sótano del gimnasio).
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
