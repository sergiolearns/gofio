// Registro de pantallas: cada una devuelve {nodo, clara?, pestana?, alEntrar?, alSalir?, sinGesto?}.
import { hoyPantalla } from './hoy.js';
import { seriePantalla, descansoPantalla } from './serie.js';
import { hechoPantalla } from './hecho.js';
import { semanaPantalla } from './semana.js';
import { ajustesPantalla } from './ajustes.js';
import { bienvenidaPantalla, instalarPantalla, progresoPantalla, comidaPantalla } from './bienvenida.js';

export const PANTALLAS = {
  hoy: hoyPantalla, serie: seriePantalla, descanso: descansoPantalla, hecho: hechoPantalla,
  semana: semanaPantalla, ajustes: ajustesPantalla, bienvenida: bienvenidaPantalla, instalar: instalarPantalla,
  progreso: progresoPantalla, comida: comidaPantalla,
};
