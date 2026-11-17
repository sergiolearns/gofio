# Gofio · servidor de los avisos del descanso

Si sales de Gofio a mitad de un descanso, este servidor te avisa al acabar (G72, G73, G79, G90). En el iPhone, una app web solo puede avisar con Web Push, y hace falta alguien que mande el aviso a su hora: esto es ese alguien.

## Qué guarda y qué no

- **Solo mientras dura un descanso:** la dirección de avisos de tu móvil (la da Apple; es un enlace opaco, sin tu nombre) con sus dos claves de cifrado, y dos avisos como mucho (hora y texto: «Respira. Quedan 1:30.» y «Embúllate. Te toca la serie 2 de prensa: 180 × 12.»).
- **Lo borra** al enviarlo o en cuanto vuelves a la app.
- **Nunca** recibe tu historial, tus pesos guardados, tu peso corporal ni tus comidas.
- Los avisos van **cifrados** de punta a punta (RFC 8291): Apple los transporta sin poder leerlos.
- Las claves VAPID se generan dentro del servidor la primera vez y no salen de él (la pública, sí: la pide la app).

## Coste

0 €. Plan gratuito de Cloudflare Workers con Durable Objects (SQLite), sin tarjeta. Cada descanso con avisos son unas pocas peticiones; el plan gratuito da 100.000 al día.

## Desplegarlo (lo hace Sergio, unos 5 minutos)

1. Crea una cuenta gratuita en **dash.cloudflare.com** (correo y contraseña; no pide tarjeta para Workers). Las credenciales son tuyas: no las compartas con nadie, tampoco con Claude.
2. En el panel: **Workers & Pages → Create → Import a repository** (o «Connect to Git»). Autoriza a Cloudflare a ver **solo** el repositorio `sergiolearns/gofio`.
3. Configura el proyecto:
   - Nombre: `gofio-avisos`
   - **Root directory / ruta del proyecto: `servidor-avisos`**
   - Comando de despliegue: el que propone (`npx wrangler deploy`).
4. Despliega. Al acabar te da una dirección como `https://gofio-avisos.TU-SUBDOMINIO.workers.dev`. Ábrela con `/clave` al final: si sale `{"clave":"B…"}`, funciona.
5. Pásale esa dirección a Claude: va en `js/avisos.js` (`SERVIDOR`) y se publica una versión nueva de la app.
6. En el iPhone (con la app instalada): Ajustes → Sonidos → **Avisos al salir del descanso**. iOS pregunta si permites avisos: «Permitir».

Cada vez que se publique algo en `servidor-avisos/` en GitHub, Cloudflare lo vuelve a desplegar solo.

## Rutas

| Ruta | Qué hace |
|---|---|
| `GET /clave` | La clave pública VAPID (la app la usa para suscribirse) |
| `POST /programar` | `{sub, avisos:[{en, titulo, cuerpo}]}`: guarda el descanso y pone la alarma |
| `POST /cancelar` | `{endpoint}`: borra el descanso (al volver a la app) |

Los `POST` llegan como texto plano (con `sendBeacon`, que sale aunque iOS congele la app justo después). Solo acepta direcciones de los servicios de avisos de Apple, Google, Mozilla y Microsoft, y la web de Gofio como origen.

## Pruebas

```bash
node --test servidor-avisos/prueba.test.mjs
```

Comprueban que el móvil (simulado) descifra el aviso y que la firma VAPID es válida. El cifrado se contrastó además con la librería de referencia `http_ece`, y el Worker se probó con `wrangler dev` (rutas, validación y alarma).
