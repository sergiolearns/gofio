// Leer la tabla nutricional de una etiqueta (R31): del texto que da el OCR a los cuatro números por 100 g. Pura.
/** Saca energía, proteínas, hidratos y grasas (por 100 g) del texto de una etiqueta. Exportada para las pruebas. */
export function leerTabla(texto) {
  const lineas = texto.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const n = (s) => parseFloat(s.replace(',', '.'));
  const numeros = (l) => [...l.replace(/(\d)\s+,\s*(\d)/g, '$1,$2').matchAll(/(\d+(?:[.,]\d+)?)/g)].map((m) => n(m[1]));
  const res = {}, lin = {};
  lineas.forEach((l, k) => {
    const b = l.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (res.kcal == null && /kcal/.test(b)) {
      const m = b.match(/(\d+(?:[.,]\d+)?)\s*kcal/) ?? b.match(/kcal\D{0,6}(\d+(?:[.,]\d+)?)/);
      if (m) { res.kcal = n(m[1]); lin.kcal = k; }
    }
    if (res.kcal == null && res.kj == null && /kj/.test(b)) { const m = b.match(/(\d+(?:[.,]\d+)?)\s*kj/); if (m) { res.kj = n(m[1]); lin.kcal = k; } }
    if (res.prot == null && /prote/.test(b)) { const x = numeros(b); if (x.length) { res.prot = x[0]; lin.prot = k; } }
    if (res.hc == null && /hidratos|carbohidrat|carbono/.test(b) && !/azucar/.test(b.split(/hidratos|carbohidrat|carbono/)[0])) { const x = numeros(b); if (x.length) { res.hc = x[0]; lin.hc = k; } }
    if (res.grasa == null && /grasa|lipido/.test(b) && !/saturad|trans|mono|poli/.test(b)) { const x = numeros(b); if (x.length) { res.grasa = x[0]; lin.grasa = k; } }
  });
  if (res.kcal == null && res.kj != null) res.kcal = Math.round(res.kj / 4.184);
  delete res.kj;
  return { valores: res, lineas, lin };
}

