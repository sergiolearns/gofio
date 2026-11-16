// La plantilla ideal de Sergio (03-mi-rutina.md, con el día 5 de la propuesta A aceptada en G22 y concretada en G36).
// Solo la estructura de la rutina: ninguna carga ni ningún dato corporal (esos viven en el móvil).
// Donde la rutina dice «X o Y», X es el ejercicio de la plantilla e Y queda como sustitución (R22).

const S = (ej, series, repMin, repMax, extra = {}) => ({ ej, series, repMin, repMax, ...extra });

export const PLANTILLA_SERGIO = {
  id: 'sergio-5-dias',
  nombre: 'Rutina de Sergio · 5 días',
  minutos: 75,
  dias: [
    { id: 'd1', nombre: 'Torso', ejercicios: [
      S('dominadas-lastradas', 3, 6, 8),
      S('press-inclinado-mancuernas', 4, 8, 10),
      S('remo-maquina-pecho', 3, 8, 10),
      S('laterales-polea', 4, 12, 15),
      S('curl-alterno', 3, 10, 10, { superserie: 'a' }),
      S('extension-triceps-cuerda', 3, 10, 12, { superserie: 'a' }),
    ] },
    { id: 'd2', nombre: 'Pierna', ejercicios: [
      S('sentadilla-hack', 4, 8, 10),
      S('peso-muerto-rumano', 3, 8, 10),
      S('prensa', 3, 10, 12),
      S('curl-femoral-tumbado', 3, 10, 12),
      S('gemelos-prensa', 4, 12, 15),
    ] },
    { id: 'd3', nombre: 'Empujes', ejercicios: [
      S('press-convergente', 4, 8, 10),
      S('fondos-lastrados', 3, 8, 10),
      S('laterales-mancuernas', 4, 10, 12),
      S('cruces-polea-baja', 3, 12, 15),
      S('press-frances-polea', 3, 8, 10),
    ] },
    { id: 'd4', nombre: 'Jalones', ejercicios: [
      S('remo-barra', 4, 8, 10),
      S('jalon-estrecho-neutro', 3, 10, 12),
      S('pullover-polea', 3, 12, 15),
      S('pajaros-mancuernas', 4, 12, 15),
      S('curl-predicador', 3, 8, 10),
      S('crunch-polea', 3, 15, 15),
    ] },
    { id: 'd5', nombre: 'Pierna B + brazo', ejercicios: [
      S('prensa', 3, 10, 12),
      S('extension-cuadriceps', 3, 12, 15),
      S('curl-femoral-sentado', 3, 10, 12),
      S('press-militar-maquina', 3, 8, 10),
      S('press-frances', 3, 12, 12),
      S('curl-declinado', 3, 12, 12),
    ] },
  ],
};

export const diaDe = (plantilla, id) => plantilla.dias.find((d) => d.id === id);
