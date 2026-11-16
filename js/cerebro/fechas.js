// Fechas locales como texto 'AAAA-MM-DD'. Las cuentas se hacen en UTC para que el cambio de hora no reste un día.
const DIA = 86400000;
const aUTC = (f) => { const [a, m, d] = f.split('-').map(Number); return Date.UTC(a, m - 1, d); };
const deUTC = (t) => new Date(t).toISOString().slice(0, 10);
export function hoyLocal(ahora = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${ahora.getFullYear()}-${p(ahora.getMonth() + 1)}-${p(ahora.getDate())}`;
}
export const diasEntre = (a, b) => Math.round((aUTC(b) - aUTC(a)) / DIA); // b − a
export const sumarDias = (f, n) => deUTC(aUTC(f) + n * DIA);
export const diaSemana = (f) => (new Date(aUTC(f)).getUTCDay() + 6) % 7; // 0 = lunes … 6 = domingo
export const lunesDe = (f) => sumarDias(f, -diaSemana(f));
export const mismaSemana = (a, b) => lunesDe(a) === lunesDe(b);
export const LETRA_DIA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
export const NOMBRE_DIA = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
