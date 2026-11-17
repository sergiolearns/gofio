// «A moler» (G84, G89; storyboard en el lienzo y prototipo v5): el cambio de casa a fuerza en 1,6 s.
// Lo de encima se aparta, la muela grande de Hoy rueda y crece hasta cubrir la pantalla con el hoyuelo saliendo por
// abajo, cae la muela pequeña, su ojo se abre al basalto mientras da media vuelta y entra «A MOLER» con su golpe.
// Un toque lo salta. Con «Reducir movimiento», un fundido de 200 ms y el mismo sonido. Solo transform y opacity.
import { grano, reduceMovimiento } from './ui.js';
import { suena } from './sonidos.js';

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
let capa = null;
function preparar() {
  if (capa) return capa;
  capa = document.createElement('div');
  capa.id = 'amoler'; capa.setAttribute('aria-hidden', 'true');
  capa.innerHTML = `<div class="am-millo"></div><img class="am-muela" src="iconos/disco-negro-solo-gofio.svg" alt="" width="250" height="250">
    <div class="am-ojo"></div><p class="am-texto titular">A<br><span>MOLER</span></p><div class="am-granos"></div>`;
  document.body.append(capa);
  return capa;
}

/**
 * @param {{muela?:Element, apartar?:NodeList|Element[], total:number, hechas?:number, alCambiar:()=>void}} o
 *   muela: la muela gigante de Hoy (si no la hay, solo la muela pequeña); alCambiar: pinta la primera serie debajo.
 */
export async function aMoler({ muela = null, apartar = [], total, hechas = 0, alCambiar }) {
  const ov = preparar();
  const $ = (s) => ov.querySelector(s);
  const millo = $('.am-millo'), pequena = $('.am-muela'), ojo = $('.am-ojo'), txt = $('.am-texto'), gr = $('.am-granos');
  gr.innerHTML = Array.from({ length: total }, (_, i) => grano(i < hechas)).join('');
  suena('amoler');
  if (reduceMovimiento()) {
    ov.classList.add('va'); ov.style.background = 'var(--basalto)';
    millo.style.opacity = 0; pequena.style.opacity = 0; txt.style.opacity = 1; gr.style.opacity = 1;
    await ov.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: 'forwards' }).finished;
    alCambiar();
    await espera(900);
    await ov.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' }).finished;
    limpiar(); return;
  }
  ov.classList.add('va'); ov.style.opacity = 1;
  const anims = [];
  const A = (el, k, o) => { const a = el.animate(k, { fill: 'both', ...o }); anims.push(a); return a; };
  let cortado = false;
  ov.onclick = () => { cortado = true; anims.forEach((a) => a.finish()); };
  // 0-340 ms · lo de encima se aparta y la muela grande rueda y crece hasta cubrir la pantalla (G89)
  if (muela) A(muela, [{ transform: 'rotate(0deg) scale(1)' }, { transform: 'rotate(28deg) scale(1.9)' }], { duration: 340, easing: 'cubic-bezier(.55,0,1,.45)' });
  [...apartar].forEach((n) => A(n, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(16px)' }], { duration: 160, easing: 'cubic-bezier(.22,1,.36,1)' }));
  A(millo, [{ opacity: 0 }, { opacity: 1 }], { duration: 1, delay: muela ? 330 : 0 });
  // 260-590 ms · cae la muela pequeña
  A(pequena, [{ transform: 'translateY(-70vh) scale(.7) rotate(-20deg)' }, { transform: 'translateY(0) scale(1.06) rotate(0deg)', offset: 0.78 }, { transform: 'translateY(0) scale(1) rotate(0deg)' }],
    { duration: 330, delay: 260, easing: 'cubic-bezier(.55,0,1,.45)' });
  // 700-1150 ms · el ojo se abre al basalto y la muela da media vuelta con inercia
  A(pequena, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(180deg) scale(1.15)' }], { duration: 450, delay: 700, easing: 'cubic-bezier(.77,0,.175,1)', fill: 'forwards' });
  A(ojo, [{ transform: 'scale(0)' }, { transform: 'scale(1)', offset: 0.25 }, { transform: 'scale(22)' }], { duration: 450, delay: 700, easing: 'cubic-bezier(.77,0,.175,1)' });
  // 1200 ms · ¡golpe! «A MOLER» y los granos que vas a moler hoy
  A(txt, [{ opacity: 0, transform: 'scale(1.12)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 160, delay: 1200, easing: 'cubic-bezier(.22,1,.36,1)' });
  A(gr, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 260, delay: 1280, easing: 'cubic-bezier(.22,1,.36,1)' });
  await Promise.all(anims.map((a) => a.finished.catch(() => {})));
  if (!cortado) await espera(300);
  // 1600 ms · la primera serie: fundido corto, los granos suben a la cabecera y queda el terreno
  alCambiar();
  await ov.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, easing: 'ease-out', fill: 'forwards' }).finished;
  anims.forEach((a) => a.cancel());
  limpiar();
}
function limpiar() {
  if (!capa) return;
  capa.getAnimations().forEach((a) => a.cancel());
  capa.classList.remove('va'); capa.onclick = null; capa.removeAttribute('style');
  capa.querySelectorAll('*').forEach((n) => { n.getAnimations().forEach((a) => a.cancel()); n.removeAttribute('style'); });
}

/**
 * «¡A la brega!» (G96): al acabar el descanso ya no hace falta tocar «Empezar serie». Con el golpe de tambor entra
 * «¡A LA BREGA!» de golpe, como «A MOLER», con los granos del ejercicio (el siguiente late) y se pasa sola a la serie.
 * Un toque la salta. Con «Reducir movimiento», un fundido. Solo transform y opacity.
 */
export async function aLaBrega({ hechas = 0, total = 0, alCambiar }) {
  const ov = preparar();
  const $ = (s) => ov.querySelector(s);
  const millo = $('.am-millo'), pequena = $('.am-muela'), ojo = $('.am-ojo'), txt = $('.am-texto'), gr = $('.am-granos');
  const antes = txt.innerHTML;
  txt.innerHTML = '¡A LA<br><span>BREGA!</span>';
  gr.innerHTML = Array.from({ length: total }, (_, i) => grano(i < hechas ? true : i === hechas ? 'ahora' : false)).join('');
  millo.style.opacity = 0; pequena.style.opacity = 0; ojo.style.opacity = 0;
  ov.classList.add('va'); ov.style.background = 'var(--basalto)';
  const fin = () => { txt.innerHTML = antes; limpiar(); };
  if (reduceMovimiento()) {
    txt.style.opacity = 1; gr.style.opacity = 1;
    await ov.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: 'forwards' }).finished;
    alCambiar(); await espera(700);
    await ov.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' }).finished;
    fin(); return;
  }
  const anims = [];
  const A = (el, k, o) => { const a = el.animate(k, { fill: 'both', ...o }); anims.push(a); return a; };
  ov.onclick = () => anims.forEach((a) => a.finish());
  A(ov, [{ opacity: 0 }, { opacity: 1 }], { duration: 120, easing: 'ease-out' });
  A(txt, [{ opacity: 0, transform: 'scale(1.25)' }, { opacity: 1, transform: 'scale(.97)', offset: 0.7 }, { opacity: 1, transform: 'scale(1)' }], { duration: 240, delay: 40, easing: 'cubic-bezier(.55,0,1,.45)' });
  A(gr, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 260, delay: 160, easing: 'cubic-bezier(.22,1,.36,1)' });
  await Promise.all(anims.map((a) => a.finished.catch(() => {})));
  await espera(650);
  alCambiar();
  await ov.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, easing: 'ease-out', fill: 'forwards' }).finished;
  anims.forEach((a) => a.cancel());
  fin();
}
