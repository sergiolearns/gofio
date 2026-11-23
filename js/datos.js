// Datos de Gofio: todo en el móvil (IndexedDB), nunca en un servidor. Exportar e importar una copia JSON.
const NOMBRE = 'gofio';
const VERSION_BD = 2;
export const ESQUEMA = 2; // versión del formato de la copia (2: la comida y el peso, v0.3)
const ALMACENES = ['ajustes', 'sesiones', 'series', 'notas', 'pesos', 'comidas', 'alimentos', 'ollas', 'dias'];

let bd = null;
function abrir() {
  if (bd) return Promise.resolve(bd);
  return new Promise((ok, mal) => {
    const pet = indexedDB.open(NOMBRE, VERSION_BD);
    pet.onupgradeneeded = () => {
      const b = pet.result;
      if (!b.objectStoreNames.contains('ajustes')) b.createObjectStore('ajustes', { keyPath: 'clave' });
      if (!b.objectStoreNames.contains('sesiones')) b.createObjectStore('sesiones', { keyPath: 'id' }).createIndex('fecha', 'fecha');
      if (!b.objectStoreNames.contains('series')) {
        const s = b.createObjectStore('series', { keyPath: 'id' });
        s.createIndex('sesionId', 'sesionId'); s.createIndex('ejercicioId', 'ejercicioId'); s.createIndex('fecha', 'fecha');
      }
      if (!b.objectStoreNames.contains('notas')) b.createObjectStore('notas', { keyPath: 'ejercicioId' });
      // v0.3 · Comida y peso
      if (!b.objectStoreNames.contains('pesos')) b.createObjectStore('pesos', { keyPath: 'id' }).createIndex('fecha', 'fecha');
      if (!b.objectStoreNames.contains('comidas')) b.createObjectStore('comidas', { keyPath: 'id' }).createIndex('fecha', 'fecha');
      if (!b.objectStoreNames.contains('alimentos')) b.createObjectStore('alimentos', { keyPath: 'id' });
      if (!b.objectStoreNames.contains('ollas')) b.createObjectStore('ollas', { keyPath: 'id' });
      if (!b.objectStoreNames.contains('dias')) b.createObjectStore('dias', { keyPath: 'fecha' });
    };
    pet.onsuccess = () => { bd = pet.result; ok(bd); };
    pet.onerror = () => mal(pet.error);
  });
}
const prom = (pet) => new Promise((ok, mal) => { pet.onsuccess = () => ok(pet.result); pet.onerror = () => mal(pet.error); });
async function tx(almacen, modo, fn) {
  const b = await abrir();
  return new Promise((ok, mal) => {
    const t = b.transaction(almacen, modo);
    const r = fn(t.objectStore(almacen));
    t.oncomplete = () => ok(r);
    t.onerror = () => mal(t.error);
    t.onabort = () => mal(t.error);
  });
}

export const todo = async (almacen) => prom((await abrir()).transaction(almacen).objectStore(almacen).getAll());
export const guardar = (almacen, obj) => tx(almacen, 'readwrite', (s) => { s.put(obj); });
export const borrar = (almacen, clave) => tx(almacen, 'readwrite', (s) => { s.delete(clave); });
export const id = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

/** Carga todo en memoria al arrancar (son pocos KB): la app trabaja sobre `estado` y escribe cada cambio. */
export async function cargar() {
  const [ajustes, sesiones, series, notas, pesos, comidas, alimentos, ollas, dias] = await Promise.all(ALMACENES.map(todo));
  return {
    ajustes: Object.fromEntries(ajustes.map((a) => [a.clave, a.valor])),
    sesiones: sesiones.sort((a, b) => a.inicio - b.inicio),
    series: series.sort((a, b) => a.ts - b.ts),
    notas: Object.fromEntries(notas.map((n) => [n.ejercicioId, n])),
    pesos: pesos.sort((a, b) => a.ts - b.ts),
    comidas: comidas.sort((a, b) => a.ts - b.ts),
    alimentos: alimentos.sort((a, b) => a.ts - b.ts),
    ollas: ollas.sort((a, b) => a.ts - b.ts),
    dias: Object.fromEntries(dias.map((d) => [d.fecha, d])),
  };
}
export const ponerAjuste = (clave, valor) => guardar('ajustes', { clave, valor });

/** Pide al navegador que no borre los datos (en Safari puede decir que no: por eso existe la copia). */
export async function pedirPersistencia() {
  try { return navigator.storage?.persist ? await navigator.storage.persist() : false; } catch { return false; }
}

/** Copia completa. */
export async function exportar() {
  const datos = {};
  for (const a of ALMACENES) datos[a] = await todo(a);
  return { app: 'gofio', esquema: ESQUEMA, exportado: new Date().toISOString(), datos };
}

/** Lee una copia y dice qué trae, sin tocar nada todavía. */
export function leerCopia(texto) {
  let c;
  try { c = JSON.parse(texto); } catch { throw new Error('El archivo no es una copia de Gofio (no es JSON).'); }
  if (c?.app !== 'gofio' || !c.datos) throw new Error('El archivo no es una copia de Gofio.');
  if (c.esquema > ESQUEMA) throw new Error('La copia es de una versión de Gofio más nueva. Actualiza la app primero.');
  const ses = (c.datos.sesiones ?? []).filter((s) => s.estado === 'hecha');
  const fechas = ses.map((s) => s.fecha).sort();
  return { copia: c, resumen: { sesiones: ses.length, series: (c.datos.series ?? []).length, pesos: (c.datos.pesos ?? []).length, comidas: (c.datos.comidas ?? []).length, desde: fechas[0] ?? null, hasta: fechas.at(-1) ?? null, exportado: c.exportado, esquema: c.esquema ?? 1 } };
}

/** Sustituye todos los datos por los de la copia. */
export async function importar(copia) {
  const b = await abrir();
  await new Promise((ok, mal) => {
    const t = b.transaction(ALMACENES, 'readwrite');
    for (const a of ALMACENES) {
      const s = t.objectStore(a); s.clear();
      for (const obj of copia.datos[a] ?? []) s.put(obj);
    }
    t.oncomplete = ok; t.onerror = () => mal(t.error);
  });
}

export async function borrarTodo() {
  const b = await abrir();
  await new Promise((ok, mal) => {
    const t = b.transaction(ALMACENES, 'readwrite');
    for (const a of ALMACENES) t.objectStore(a).clear();
    t.oncomplete = ok; t.onerror = () => mal(t.error);
  });
}
