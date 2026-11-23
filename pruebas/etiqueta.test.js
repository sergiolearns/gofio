// La lectura de la etiqueta (R31, G127): de un texto como el que da tesseract a los cuatro números.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { leerTabla } from '../js/comida/leer-etiqueta.js';

test('Etiqueta española típica', () => {
  const t = `INFORMACIÓN NUTRICIONAL por 100 g\nValor energético 1629 kJ / 389 kcal\nGrasas 7,0 g\nde las cuales saturadas 1,2 g\nHidratos de carbono 60 g\nde los cuales azúcares 1,1 g\nFibra alimentaria 9,5 g\nProteínas 12,5 g\nSal 0,02 g`;
  assert.deepEqual(leerTabla(t).valores, { kcal: 389, grasa: 7, hc: 60, prot: 12.5 });
});
test('Solo kJ, «lípidos» y «carbohidratos»', () => {
  const t = `Energía 418 kJ\nLípidos 3,2 g\nSaturados 2,1 g\nCarbohidratos 4,7 g\nProteínas 3,1 g`;
  assert.deepEqual(leerTabla(t).valores, { kcal: 100, grasa: 3.2, hc: 4.7, prot: 3.1 });
});
