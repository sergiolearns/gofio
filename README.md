# Gofio

**Gofio** es una app de entrenamiento (y, más adelante, de comida) con base científica, hecha en Canarias. Dice qué toca hoy en el gimnasio, con cuánto peso y cuántas repeticiones, y lo recalcula con lo que pasa de verdad: si una semana solo vas dos días, te arma esos dos días lo mejor posible.

Es un **proyecto personal** de [Sergio Learns](https://sergiolearns.com), hecho para su propio uso y documentado como una serie de artículos. Sergio dirige y es el sujeto de prueba; el código lo escribe Claude (Anthropic) con él.

> **No es una app médica.** Gofio es una herramienta de bienestar: no diagnostica ni trata nada. Ante dolor en el pecho, mareo fuerte o dolor articular agudo, para y consulta a un profesional.

## Dónde se abre

**https://gofio.sergiolearns.com** · en el iPhone: ábrela en Safari → Compartir → «Añadir a pantalla de inicio», y úsala desde el icono.

- Sin cuenta ni contraseña. **Los datos se quedan en el móvil** (IndexedDB); este repositorio solo tiene código.
- Funciona **sin conexión** (service worker).
- La copia de seguridad es un archivo JSON que exportas tú desde Ajustes.

## Qué hace la v0.1 · «Retomar»

- **Hoy:** qué sesión toca y por qué, según lo que le falta a cada músculo esta semana y lo que entrenaste ayer (semana flexible). «Otro día» para elegir tú.
- **Vuelta tras días sin ir**, **modo «día malo»** (sesión corta) y **sustituciones** si una máquina está ocupada.
- **Registrar una serie** con una mano: peso, repeticiones y repeticiones en reserva precargados, con la sugerencia de la próxima vez (doble progresión).
- **Descanso** con un cronómetro que es la muela del molino dando una vuelta.
- **Mi semana:** constancia (semanas con entreno, sin rachas que se pongan a cero) y series por músculo con su franja.

## v0.1.10 · «El alma»

La app ya cuenta su historia: **casa → fuerza → casa**. Cada entreno es una molienda: sales de casa con el millo, lo mueles a fuerza de piedra y vuelves hecho gofio. Iconos propios (formas llenas, como un sello en barro), voz canaria con palabras del *Diccionario histórico del español de Canarias*, la muela de «Hoy» que gira y rueda en «A moler», el descanso en tres tramos con reanimación y «Mi semana» como una era. Los sonidos (piedra, madera, aire y eco) los hace la propia app con Web Audio, sin grabaciones.

**Avisos del descanso** (opcionales): si sales de la app a mitad de un descanso, un pequeño servidor en [`servidor-avisos/`](servidor-avisos/) (Cloudflare Workers, plan gratuito) te avisa al acabar. Solo recibe la dirección de avisos del móvil y la hora y el texto del aviso, y lo borra al enviarlo.

## Cada número, con su porqué

El «cerebro» está en [`js/cerebro/`](js/cerebro/): una función por regla, con el número de la regla en un comentario, y sus pruebas en [`pruebas/`](pruebas/). Las reglas salen de estudios (Pelland y cols. 2026 para el volumen, Robinson y cols. 2024 para el esfuerzo, Plotkin y cols. 2022 para la progresión, Ogasawara y cols. 2011-2013 para la vuelta, Bickel y cols. 2011, Kassiano y cols. 2022, Lally y cols. 2010, Singer y cols. 2024…); lo que no tiene estudio detrás está marcado como diseño de Gofio.

```bash
node --test "pruebas/*.test.js"   # o: npm test  (Node 20 o más)
```

Sin framework ni compilación: HTML, CSS y JavaScript tal cual. Para probarla en local, sirve la carpeta con cualquier servidor estático (`python3 -m http.server`).

## Licencias

- **Letras:** [Bricolage Grotesque](https://github.com/ateliertriay/bricolage) y [Hanken Grotesk](https://github.com/marcologous/hanken-grotesk), con licencia **SIL Open Font License 1.1** (textos en [`letras/`](letras/)). Van dentro de la app; no se piden a Google ni a nadie.
- **Datos de alimentos** ([`datos/alimentos.json`](datos/alimentos.json), desde la v0.3): AESAN/BEDCA, *Base de Datos Española de Composición de Alimentos* v1.0 (2010), www.bedca.net (uso personal y no comercial, citando la fuente); ICBF, *Tabla de Composición de Alimentos Colombianos* (TCAC 2018), una selección de 39 alimentos; USDA, *FoodData Central*, SR Legacy (2018), dominio público (CC0). Los productos del súper, de [Open Food Facts](https://world.openfoodfacts.org): los que se venden en España van en [`datos/super-*.json`](datos/), una base derivada que se publica con la misma licencia, **ODbL** (base) y DbCL (contenidos), sacada de su volcado CSV con [`herramientas/off-espana.py`](herramientas/off-espana.py). Por internet, solo viaja el código de barras o lo que escribes en el buscador. En la app: Ajustes → «De dónde salen los números».
- **Lector de códigos de barras:** [zxing-wasm](https://github.com/Sec-ant/zxing-wasm) (MIT), en [`vendor/zxing/`](vendor/zxing/).
- **Lector de etiquetas:** [tesseract.js](https://github.com/naptha/tesseract.js) y tesseract.js-core (Apache-2.0) con el modelo en español de [tessdata](https://github.com/tesseract-ocr/tessdata_best) (Apache-2.0), en [`vendor/tesseract/`](vendor/tesseract/). Todo se ejecuta en el teléfono.
- **Código e identidad de Gofio** (logo, disco, iconos): © 2026 Sergio Alejandro Medina Ospina. Licencia del código por decidir.
