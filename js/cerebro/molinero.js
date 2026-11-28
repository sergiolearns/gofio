// El molinero (La brega, G115-G117; libro de reglas 1.5). El molinero escucha la piedra y va moviendo el alivio: tras
// cada cosa que pasa en la molienda, Gofio vuelve a calcular lo que queda con una sola cuenta y unas leyes que no se
// rompen (comprobadas con pruebas de propiedades en pruebas/molinero.test.js). Funciones puras: no tocan la app.
//
//  · R28 · Arrimar: las series de aproximación antes de la primera de trabajo de cada ejercicio.
//  · R29 · Lo que queda: la siguiente serie de trabajo, con la que acabas de hacer.
//  · Las leyes de la piedra (1-7): concepto de La brega, sección 3.
import { redondearAEscalon, siguienteEscalon, esDiscos } from './progresion.js';
import { rirObjetivo, e1rm } from './esfuerzo.js';

const r2 = (x) => Math.round(x * 100) / 100;
/** El escalón más pequeño del material (para «ligero» y para el lastre). */
export const escalonMinimo = (esc) => (Array.isArray(esc) ? Math.min(...esc.filter((x) => x > 0), 2.5) : esDiscos(esc) ? esc.paso : esc > 0 ? esc : 2.5);

// ── R28 · Arrimar ────────────────────────────────────────────────────────────
export const ARRIMAR_TOPE = 3;      // nunca más de 3 piedras (un estudio pequeño vio que 3 o más bajaban el rendimiento)
export const ARRIMAR_YA = 0.85;     // si una piedra llega al 85 % del peso de trabajo, la siguiente es la de trabajo (⚪)
export const LIGERO_ESCALONES = 4;  // por debajo de 4 escalones de peso de trabajo, no hace falta arrimar (⚪)

/** R28 · Reps de cada piedra según lo cerca que está del peso de trabajo: hasta el 60 %, 8; hasta el 80 %, 4; más, 2. */
export function repsDePiedra(f) {
  if (f <= 0.6 + 1e-9) return 8;
  if (f <= 0.8 + 1e-9) return 4;
  return 2;
}

/** R28 · Las fracciones por defecto: 0-1 si es ligero o de 10 o más reps; 2 en los multiarticulares; 3 si son pesados (≤ 8 reps). */
export function fraccionesPorDefecto({ trabajo, escalon, tipo = 'multi', repsObjetivo = 10 }) {
  if (!(trabajo > 0)) return [];
  if (trabajo < LIGERO_ESCALONES * escalonMinimo(escalon)) return [];
  if (tipo !== 'multi' || repsObjetivo >= 10) return [0.6];
  if (repsObjetivo <= 8) return [0.5, 0.7, 0.88];
  return [0.5, 0.75];
}

/**
 * Tu jeito: el estilo de arrimar de las últimas 3 moliendas con ese ejercicio. `historial` = lo más reciente primero:
 * [{ trabajo, piedras: [{ peso, reps }] }]. Si en 2 de las 3 arrimaste el mismo número de piedras, ese es tu estilo
 * (con la mediana de los porcentajes de cada piedra). Si no hay estilo claro, null y manda R28.
 */
export function estiloArrimar(historial = []) {
  const ult = historial.filter((h) => h && h.trabajo > 0).slice(0, 3);
  if (ult.length < 2) return null;
  const cuenta = {};
  ult.forEach((h) => { const n = Math.min(h.piedras?.length ?? 0, ARRIMAR_TOPE); cuenta[n] = (cuenta[n] ?? 0) + 1; });
  const [n, veces] = Object.entries(cuenta).map(([k, v]) => [Number(k), v]).sort((a, b) => b[1] - a[1] || b[0] - a[0])[0];
  if (veces < 2) return null;
  if (n === 0) return { n: 0, fracs: [] };
  const mismas = ult.filter((h) => Math.min(h.piedras.length, ARRIMAR_TOPE) === n);
  const mediana = (v) => { const s = [...v].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const fracs = Array.from({ length: n }, (_, k) => mediana(mismas.map((h) => Math.min(0.95, h.piedras[k].peso / h.trabajo))));
  // Las fracciones de un estilo también suben (ley 1): si no, se ordenan.
  fracs.sort((a, b) => a - b);
  return { n, fracs: fracs.filter((f) => f > 0) };
}

/**
 * R28 · Las piedras que quedan por arrimar, con lo que ya hiciste hoy en ese ejercicio.
 * @param {{trabajo:number, escalon:number|number[], tipo?:string, repsObjetivo?:number, lastre?:boolean,
 *          hechas?:{peso:number,reps:number}[], estilo?:{n:number,fracs:number[]}|null}} p
 * @returns {{piedras:{peso:number,reps:number}[], plan:{peso:number,reps:number}[], vasFuerte:boolean}}
 *   piedras = las que quedan (puede ser ninguna: toca la de trabajo); plan = las de hoy desde el principio;
 *   vasFuerte = te saltaste piedras porque levantaste más de lo propuesto.
 */
export function arrimar({ trabajo, escalon, tipo = 'multi', repsObjetivo = 10, lastre = false, hechas = [], estilo = null }) {
  const esc = escalonMinimo(escalon);
  // Con lastre poco (o ninguno): una sin lastre, con tu peso (G109).
  if (lastre && !(trabajo >= 2 * esc)) {
    const plan = trabajo >= 0 ? [{ peso: 0, reps: trabajo > 0 ? 5 : 3 }] : [];
    return { piedras: plan.slice(hechas.length), plan, vasFuerte: false };
  }
  if (!(trabajo > 0)) return { piedras: [], plan: [], vasFuerte: false };
  const fracs = estilo ? estilo.fracs : fraccionesPorDefecto({ trabajo, escalon, tipo, repsObjetivo });
  const plan = [];
  for (const f of fracs.slice(0, ARRIMAR_TOPE)) {
    const peso = redondearAEscalon(trabajo * f, escalon, 'abajo');
    if (peso <= 0 || peso >= trabajo) continue;
    if (plan.length && peso <= plan[plan.length - 1].peso) continue;   // ley 1: suben
    plan.push({ peso, reps: repsDePiedra(peso / trabajo) });
  }
  if (!hechas.length) return { piedras: plan, plan, vasFuerte: false };
  // Con lo hecho hoy: ley 1 (no bajar de lo levantado) y ley 2 (más peso, menos reps).
  const maxHecho = Math.max(...hechas.map((h) => h.peso ?? 0));
  const ultima = hechas[hechas.length - 1];
  if (hechas.length >= ARRIMAR_TOPE || maxHecho >= ARRIMAR_YA * trabajo || maxHecho >= trabajo) {
    return { piedras: [], plan, vasFuerte: maxHecho >= ARRIMAR_YA * trabajo && hechas.length < plan.length };
  }
  const tope = Math.max(2, ultima?.reps ?? 8);
  let quedan = plan.slice(hechas.length).filter((p) => p.peso > maxHecho);
  const saltadas = plan.length - hechas.length - quedan.length;
  if (!quedan.length && plan.length > hechas.length) {
    // Las que tocaban ya están por debajo de lo que levantaste: una piedra por encima, si cabe antes del de trabajo.
    const sig = siguienteEscalon(maxHecho, escalon, +1);
    if (sig < trabajo) quedan = [{ peso: sig, reps: repsDePiedra(sig / trabajo) }];
  }
  quedan = quedan.slice(0, ARRIMAR_TOPE - hechas.length).map((p) => ({ peso: p.peso, reps: Math.min(p.reps, tope) }));
  return { piedras: quedan, plan, vasFuerte: saltadas > 0 };
}

// ── R29 · Lo que queda: la siguiente serie de trabajo (libro 1.7, G134) ─────────
export const UMBRAL_MARGEN = 3;   // ⚪ diseño de Gofio: para subir hace falta que sobre mucho
export const TOPE_SEGURIDAD = 1.10; // ley 7: nada por encima de un 10 % sobre tu mejor fuerza estimada reciente
export const FATIGA_SERIE = 0.02;  // ⚪ lo que se pierde de una serie a la siguiente si aún no hay datos de hoy (2 %)
export const FATIGA_MAX = 0.06;    // ⚪ y como mucho, aunque hoy vayas cayendo deprisa (6 %)
export const TOPE_BAJADA = 0.25;   // ⚪ de una serie a otra, Gofio no baja más de un 25 %

export const HOLGURA = 0.025;      // ⚪ si lo ideal queda a menos de un escalón o de un 2,5 %, se deja el peso

/**
 * La fatiga que se espera para la siguiente serie: la mitad de lo que cayó tu fuerza estimada entre las dos últimas
 * series de trabajo de hoy (entre el 1 % y el 6 %); sin una anterior, un 2 %. ⚪ (la caída de repeticiones serie a serie
 * con el mismo peso es lo normal: Willardson y Burkett 2006; Richmond y Godard 2004).
 */
export function fatigaEsperada(hecha, anteriores = []) {
  const prev = anteriores.at(-1);
  if (!prev) return FATIGA_SERIE;
  const a = e1rm(prev.peso, prev.reps, prev.rir ?? 2), b = e1rm(hecha.peso, hecha.reps, hecha.rir ?? 2);
  if (!(a > 0)) return FATIGA_SERIE;
  return Math.min(FATIGA_MAX, Math.max(0.01, (a - b) / a / 2));
}

/**
 * R29 · La siguiente serie del mismo ejercicio, con la que acabas de hacer (v1.7).
 * 1) Tu fuerza de ahora = la fuerza estimada de la serie hecha (Epley con la reserva, R11), menos la fatiga esperada.
 * 2) El peso que toca = el que, con esa fuerza, da las repeticiones objetivo con la reserva objetivo (la del medio).
 *    Así no es lo mismo 7 que 4 al fallo: cuanto más corto te quedaste, más baja. Para bajar, lo que haga falta
 *    (hasta un 25 %); para subir, como mucho un escalón y solo si sobró mucho (margen ≥ 3) estando arriba del rango.
 * @returns {{peso:number, reps:number, senal:'igual'|'sube'|'baja'|'mas', margen:number, fuerza:number}}
 */
export function siguienteSerie({ hecha, repsObjetivo, repMin, repMax, tipo = 'multi', escalon, mejorReciente = 0, anteriores = [] }) {
  const ro = rirObjetivo(tipo);
  const rir = Math.min(4, Math.max(0, hecha.rir ?? ro.max));
  const objetivo = Math.max(repMin, Math.min(repMax, repsObjetivo ?? repMin));
  const margen = hecha.reps + rir - (objetivo + ro.max);
  const fuerza = e1rm(hecha.peso, hecha.reps, rir) * (1 - fatigaEsperada({ ...hecha, rir }, anteriores));
  const ideal = fuerza / (1 + (objetivo + (ro.min + ro.max) / 2) / 30);
  let peso = hecha.peso, reps = objetivo, senal = 'igual';
  if (margen >= UMBRAL_MARGEN) {
    if (hecha.reps >= repMax) { peso = siguienteEscalon(hecha.peso, escalon, +1); senal = 'sube'; }
    else { reps = Math.min(repMax, hecha.reps + 1); senal = 'mas'; }
  } else if (hecha.peso - ideal >= Math.max(escalonMinimo(escalon), HOLGURA * hecha.peso) - 1e-9) {
    // Bajar lo que diga tu fuerza de ahora, redondeado al escalón más cercano, con tope.
    const suelo = redondearAEscalon(hecha.peso * (1 - TOPE_BAJADA), escalon, 'arriba');
    let p = redondearAEscalon(ideal, escalon, 'abajo');
    const arriba = siguienteEscalon(p, escalon, +1);
    if (arriba < hecha.peso && ideal - p > arriba - ideal) p = arriba;
    p = Math.max(p, suelo);
    if (p < hecha.peso - 1e-9) { peso = p; senal = 'baja'; }
  }
  // Ley 7 · Seguridad (R8): nada por encima de un 10 % sobre tu mejor fuerza estimada reciente.
  if (mejorReciente > 0 && peso > hecha.peso) {
    if (e1rm(peso, reps, ro.min) > TOPE_SEGURIDAD * mejorReciente) { peso = hecha.peso; senal = 'igual'; }
  }
  return { peso: r2(peso), reps, senal, margen, fuerza: r2(fuerza) };
}

/**
 * R29 (G134) · «Vas cayendo»: en un ejercicio, dos o más series de trabajo seguidas en las que bajaste el peso y aun así
 * no llegaste a lo que tocaba (por debajo del rango, o al fallo sin llegar a las repeticiones objetivo).
 * Quiere decir que empezaste por encima de lo que puedes mantener hoy.
 */
export function vasCayendo(series, { repMin, repsObjetivo }) {
  if (series.length < 3) return false;
  const obj = repsObjetivo ?? repMin;
  const corta = (s) => s.reps < repMin || ((s.rir ?? 2) === 0 && s.reps < obj);
  let bajadas = 0;
  for (let i = 1; i < series.length; i++) {
    if (series[i].peso < series[i - 1].peso - 1e-9 && corta(series[i])) bajadas++;
  }
  return bajadas >= 2 && corta(series[0]);
}

// ── Las leyes de la piedra (para las pruebas y para «¿Por qué?») ───────────────
export const LEYES = [
  'Arrimar sube: cada piedra pesa lo mismo o más que la última que levantaste hoy en ese ejercicio, y ninguna pasa del peso de trabajo.',
  'Más peso, menos reps: en Arrimar, al subir el peso bajan las repeticiones.',
  'Lo hecho cuenta: nada de lo que propone queda por debajo de lo que ya moviste hoy en ese ejercicio, salvo que lo que hiciste diga que no llegas.',
  'Saltos con tope: para subir, Gofio nunca pasa de un escalón él solo; para bajar, lo que diga tu fuerza de ahora, hasta un 25 %.',
  'Arrimar no cuenta: las piedras no suman volumen, fuerza ni progresión (R26).',
  'Series, solo tú: Gofio no añade series por su cuenta; la ñapa la pides tú.',
  'Seguridad (R8): ningún peso propuesto pasa de un 10 % sobre tu mejor fuerza estimada de las últimas 6 semanas.',
];
