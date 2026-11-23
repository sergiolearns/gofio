// Catálogo de ejercicios: la tabla de músculos de cada uno (R9), su patrón de movimiento (R22),
// si es multiarticular o de aislamiento (R11, R21) y el material, que decide el escalón de carga (R12).
// R9: 1 = músculo principal (serie directa); 0,5 = músculo que ayuda (serie indirecta).
// carga (máquinas, G123): 'discos' si se carga con discos a los dos lados; si no, placas. Se cambia en la libreta
// («Se carga con»), así una misma máquina vale para los dos tipos y no se duplican ejercicios.

const E = (id, nombre, patron, tipo, equipo, musculos, extra = {}) =>
  ({ id, nombre, patron, tipo, equipo, musculos, ...extra });

export const EJERCICIOS = [
  // Tirón vertical
  E('dominadas-lastradas', 'Dominadas lastradas', 'tiron-vertical', 'multi', 'lastre', { dorsal: 1, biceps: 0.5 }, { lastre: true }),
  E('jalon-pecho', 'Jalón al pecho', 'tiron-vertical', 'multi', 'polea', { dorsal: 1, biceps: 0.5 }),
  E('jalon-estrecho-neutro', 'Jalón estrecho neutro', 'tiron-vertical', 'multi', 'polea', { dorsal: 1, biceps: 0.5 }),
  // Tirón horizontal
  E('remo-maquina-pecho', 'Remo en máquina con apoyo', 'tiron-horizontal', 'multi', 'maquina', { dorsal: 1, biceps: 0.5, 'hombro-posterior': 0.5 }, { carga: 'discos' }),
  E('remo-t-apoyo', 'Remo en T con apoyo en el pecho', 'tiron-horizontal', 'multi', 'maquina', { dorsal: 1, biceps: 0.5, 'hombro-posterior': 0.5 }, { carga: 'discos' }),
  E('remo-barra', 'Remo con barra', 'tiron-horizontal', 'multi', 'barra', { dorsal: 1, biceps: 0.5, 'hombro-posterior': 0.5 }),
  E('remo-polea-sentado', 'Remo en polea sentado', 'tiron-horizontal', 'multi', 'polea', { dorsal: 1, biceps: 0.5, 'hombro-posterior': 0.5 }),
  E('remo-mancuerna', 'Remo con mancuerna', 'tiron-horizontal', 'multi', 'mancuernas', { dorsal: 1, biceps: 0.5, 'hombro-posterior': 0.5 }),
  // Empujes
  E('press-inclinado-mancuernas', 'Press inclinado con mancuernas', 'empuje-inclinado', 'multi', 'mancuernas', { pecho: 1, triceps: 0.5, 'hombro-anterior': 0.5 }),
  E('press-convergente', 'Press en máquina convergente', 'empuje-inclinado', 'multi', 'maquina', { pecho: 1, triceps: 0.5, 'hombro-anterior': 0.5 }),
  E('press-smith-inclinado', 'Press inclinado en Smith', 'empuje-inclinado', 'multi', 'smith', { pecho: 1, triceps: 0.5, 'hombro-anterior': 0.5 }),
  E('fondos-lastrados', 'Fondos lastrados', 'empuje-horizontal', 'multi', 'lastre', { pecho: 1, triceps: 0.5, 'hombro-anterior': 0.5 }, { lastre: true }),
  E('press-plano-mancuernas', 'Press plano con mancuernas', 'empuje-horizontal', 'multi', 'mancuernas', { pecho: 1, triceps: 0.5, 'hombro-anterior': 0.5 }),
  E('press-banca', 'Press de banca', 'empuje-horizontal', 'multi', 'barra', { pecho: 1, triceps: 0.5, 'hombro-anterior': 0.5 }),
  E('press-militar-maquina', 'Press militar en máquina', 'empuje-vertical', 'multi', 'maquina', { 'hombro-anterior': 1, 'hombro-lateral': 0.5, triceps: 0.5 }),
  E('press-militar-mancuernas', 'Press militar con mancuernas', 'empuje-vertical', 'multi', 'mancuernas', { 'hombro-anterior': 1, 'hombro-lateral': 0.5, triceps: 0.5 }),
  // Pierna
  E('sentadilla-hack', 'Sentadilla hack', 'sentadilla', 'multi', 'maquina', { cuadriceps: 1, gluteo: 0.5 }, { carga: 'discos' }),
  E('sentadilla-smith', 'Sentadilla en Smith', 'sentadilla', 'multi', 'smith', { cuadriceps: 1, gluteo: 0.5 }),
  E('prensa', 'Prensa, pies bajos', 'sentadilla', 'multi', 'maquina', { cuadriceps: 1, gluteo: 0.5 }, { carga: 'discos' }),
  E('sentadilla-bulgara', 'Sentadilla búlgara', 'sentadilla', 'multi', 'mancuernas', { cuadriceps: 1, gluteo: 0.5 }),
  E('peso-muerto-rumano', 'Peso muerto rumano', 'bisagra', 'multi', 'barra', { isquios: 1, gluteo: 0.5 }),
  E('peso-muerto-rumano-mancuernas', 'Peso muerto rumano con mancuernas', 'bisagra', 'multi', 'mancuernas', { isquios: 1, gluteo: 0.5 }),
  E('curl-femoral-tumbado', 'Curl femoral tumbado', 'flexion-rodilla', 'aislamiento', 'maquina', { isquios: 1 }),
  E('curl-femoral-sentado', 'Curl femoral sentado', 'flexion-rodilla', 'aislamiento', 'maquina', { isquios: 1 }),
  E('extension-cuadriceps', 'Extensión de cuádriceps', 'extension-rodilla', 'aislamiento', 'maquina', { cuadriceps: 1 }),
  E('extension-cuadriceps-unilateral', 'Extensión de cuádriceps a una pierna', 'extension-rodilla', 'aislamiento', 'maquina', { cuadriceps: 1 }, { unilateral: true }),
  E('gemelos-prensa', 'Gemelos en prensa', 'gemelo', 'aislamiento', 'maquina', { gemelos: 1 }, { carga: 'discos' }),
  E('gemelos-de-pie', 'Gemelos de pie', 'gemelo', 'aislamiento', 'maquina', { gemelos: 1 }),
  // Hombro aislado
  E('laterales-polea', 'Elevación lateral en polea', 'elevacion-lateral', 'aislamiento', 'polea', { 'hombro-lateral': 1 }, { unilateral: true }),
  E('laterales-mancuernas', 'Elevaciones laterales', 'elevacion-lateral', 'aislamiento', 'mancuernas', { 'hombro-lateral': 1 }),
  E('pajaros-mancuernas', 'Pájaros con mancuernas', 'hombro-posterior', 'aislamiento', 'mancuernas', { 'hombro-posterior': 1 }),
  E('peck-deck-inverso', 'Peck-deck inverso', 'hombro-posterior', 'aislamiento', 'maquina', { 'hombro-posterior': 1 }),
  // Pecho y dorsal aislados
  E('cruces-polea-baja', 'Cruces en polea baja', 'aperturas', 'aislamiento', 'polea', { pecho: 1 }),
  E('aperturas-maquina', 'Aperturas en máquina', 'aperturas', 'aislamiento', 'maquina', { pecho: 1 }),
  E('pullover-polea', 'Pullover en polea alta', 'pullover', 'aislamiento', 'polea', { dorsal: 1 }),
  E('jalon-brazos-rectos', 'Jalón con brazos rectos', 'pullover', 'aislamiento', 'polea', { dorsal: 1 }),
  E('pullover-mancuerna', 'Pullover con mancuerna', 'pullover', 'aislamiento', 'mancuernas', { dorsal: 1 }),
  // Brazos
  E('curl-alterno', 'Curl alterno con mancuernas', 'curl', 'aislamiento', 'mancuernas', { biceps: 1 }),
  E('curl-predicador', 'Curl predicador', 'curl', 'aislamiento', 'maquina', { biceps: 1 }),
  E('curl-declinado', 'Curl declinado', 'curl', 'aislamiento', 'mancuernas', { biceps: 1 }),
  E('curl-polea', 'Curl en polea', 'curl', 'aislamiento', 'polea', { biceps: 1 }),
  E('extension-triceps-cuerda', 'Extensión de tríceps con cuerda', 'extension-triceps', 'aislamiento', 'polea', { triceps: 1 }),
  E('press-frances', 'Press francés', 'extension-triceps', 'aislamiento', 'barra', { triceps: 1 }, { barra: 'z' }),
  E('press-frances-polea', 'Press francés en polea', 'extension-triceps', 'aislamiento', 'polea', { triceps: 1 }),
  // Abdomen
  E('crunch-polea', 'Crunch en polea', 'flexion-tronco', 'aislamiento', 'polea', { abdomen: 1 }),
  E('crunch-maquina', 'Crunch en máquina', 'flexion-tronco', 'aislamiento', 'maquina', { abdomen: 1 }),
  E('elevaciones-piernas', 'Elevaciones de piernas colgado', 'flexion-tronco', 'aislamiento', 'lastre', { abdomen: 1 }),
];

export const CATALOGO = Object.fromEntries(EJERCICIOS.map((e) => [e.id, e]));

/** Ejercicio por id; lanza un error claro si no existe (evita contar series en silencio a nadie). */
export function ejercicio(id, catalogo = CATALOGO) {
  const e = catalogo[id];
  if (!e) throw new Error(`Ejercicio desconocido: ${id}`);
  return e;
}
