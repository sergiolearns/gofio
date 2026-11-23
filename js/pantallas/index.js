// Registro de pantallas: cada una devuelve {nodo, clara?, pestana?, alEntrar?, alSalir?, sinGesto?}.
import { hoyPantalla } from './hoy.js';
import { seriePantalla, descansoPantalla } from './serie.js';
import { tostarPantalla } from './tostar.js';
import { hechoPantalla } from './hecho.js';
import { semanaPantalla } from './semana.js';
import { ajustesPantalla } from './ajustes.js';
import { bienvenidaPantalla, instalarPantalla } from './bienvenida.js';
import { comidaPantalla } from './comida.js';
import { pesoPantalla } from './peso.js';
import { ollaPantalla } from './olla.js';
import { escanearPantalla } from './escanear.js';
import { misCosasPantalla } from './miscosas.js';
import { progresoPantalla, ejercicioPantalla } from './progreso.js';

export const PANTALLAS = {
  hoy: hoyPantalla, tostar: tostarPantalla, serie: seriePantalla, descanso: descansoPantalla, hecho: hechoPantalla,
  semana: semanaPantalla, ajustes: ajustesPantalla, bienvenida: bienvenidaPantalla, instalar: instalarPantalla,
  progreso: progresoPantalla, ejercicio: ejercicioPantalla, comida: comidaPantalla,
  peso: pesoPantalla, olla: ollaPantalla, escanear: escanearPantalla, miscosas: misCosasPantalla,
};
