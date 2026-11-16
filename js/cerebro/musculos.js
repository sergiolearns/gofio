// Los músculos que cuenta Gofio (R9). El orden es el de «Mi semana».
export const MUSCULOS = [
  ['pecho', 'Pecho'], ['dorsal', 'Espalda'], ['hombro-anterior', 'Hombro ant.'],
  ['hombro-lateral', 'Hombro lat.'], ['hombro-posterior', 'Hombro post.'],
  ['biceps', 'Bíceps'], ['triceps', 'Tríceps'], ['cuadriceps', 'Cuádriceps'],
  ['isquios', 'Isquios'], ['gluteo', 'Glúteo'], ['gemelos', 'Gemelos'], ['abdomen', 'Abdomen'],
];
export const NOMBRE_MUSCULO = Object.fromEntries(MUSCULOS);
export const IDS_MUSCULOS = MUSCULOS.map(([id]) => id);
