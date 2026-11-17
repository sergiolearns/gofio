// Service worker de Gofio: guarda la app para que funcione sin conexión (en el sótano del gimnasio).
// Al publicar una versión nueva se cambia VERSION; la app avisa y el usuario decide cuándo actualizar.
const VERSION = 'gofio-0.2.6';
const ARCHIVOS = [
  './', 'index.html', 'manifest.webmanifest',
  'css/variables.css', 'css/app.css',
  'letras/bricolage-grotesque-latin.woff2', 'letras/hanken-grotesk-latin.woff2',
  'iconos/apple-touch-icon.png', 'iconos/favicon-32.png', 'iconos/icono.svg', 'iconos/icono-192.png', 'iconos/icono-512.png',
  'iconos/icono-maskable-192.png', 'iconos/icono-maskable-512.png',
  'iconos/disco-millo.svg', 'iconos/disco-negro.svg', 'iconos/disco-negro-solo-gofio.svg', 'iconos/disco-sello-almagre.svg', 'iconos/gofio-logo-oscuro.svg', 'iconos/gofio-logo-claro.svg',
  'css/alma.css', 'js/app.js', 'js/datos.js', 'js/logica.js', 'js/ui.js', 'js/sonidos.js', 'js/avisos.js', 'js/amoler.js',
  'js/pantallas/index.js', 'js/pantallas/hoy.js', 'js/pantallas/serie.js', 'js/pantallas/hecho.js', 'js/pantallas/semana.js',
  'js/pantallas/ajustes.js', 'js/pantallas/bienvenida.js', 'js/pantallas/progreso.js',
  'js/cerebro/index.js', 'js/cerebro/musculos.js', 'js/cerebro/fechas.js', 'js/cerebro/ejercicios.js', 'js/cerebro/plantilla.js',
  'js/cerebro/volumen.js', 'js/cerebro/esfuerzo.js', 'js/cerebro/progresion.js', 'js/cerebro/vuelta.js', 'js/cerebro/planificador.js',
  'js/cerebro/dia-malo.js', 'js/cerebro/sustituciones.js', 'js/cerebro/constancia.js', 'js/cerebro/generador.js', 'js/cerebro/fuerza.js',
];
self.addEventListener('install', (e) => {
  // Cada archivo, pedido de nuevo a la red y no a la caché del navegador: GitHub Pages deja los archivos 10 minutos en
  // caché y, sin esto, una versión nueva podía guardarse con piezas de la anterior (G97).
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ARCHIVOS.map((u) => new Request(u, { cache: 'reload' })))));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('gofio-') && k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', (e) => { if (e.data === 'saltar') self.skipWaiting(); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // La página (index.html), G99: al volver a la app tras un rato, iOS a veces la recarga y todo lo que tarde la página en
  // llegar se ve en negro (con la barra millo arriba). Así que sale al momento la guardada, que ya trae la cortinilla, y
  // la de la red se guarda para la próxima vez. Si no hay guardada (la primera vez), de la red. Las versiones nuevas
  // siguen poniéndose solas al abrir (G93): la página nueva llega con su service worker nuevo.
  if (e.request.mode === 'navigate') {
    const red = fetch(e.request, { cache: 'no-cache' }).then((r) => {
      if (r.ok) { const copia = r.clone(); caches.open(VERSION).then((c) => c.put('index.html', copia)); }
      return r;
    });
    e.waitUntil(red.catch(() => {}));
    e.respondWith(caches.match('index.html').then((r) => r || red).catch(() => red));
    return;
  }
  // El resto, primero lo guardado (rápido y sin conexión en el sótano del gimnasio).
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});

// ── Avisos del descanso (G90): el servidor solo manda el texto; el aviso lo enseña la app. Suena el de iOS. ──
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { titulo: e.data?.text?.() }; }
  e.waitUntil(self.registration.showNotification(d.titulo || 'Gofio', {
    body: d.cuerpo || '', tag: 'gofio-descanso', renotify: true,
    icon: 'iconos/icono-192.png', badge: 'iconos/icono-192.png', data: { url: './' },
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ws) => {
    const w = ws.find((c) => 'focus' in c);
    return w ? w.focus() : self.clients.openWindow('./');
  }));
});
