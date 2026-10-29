import { ARABIC_FONTS, FONTS_URL, paletteCss } from '@grill/shared';

import { rtl } from '../i18n';

/**
 * The web layer of the look: the cream and charcoal palettes as CSS variables, fire gradients, glass, grain, the slow
 * heat behind every screen (warm light by day, ember glow and smoke at night) and the sunset wipe between the two.
 * Elements opt in with `fx('…')` (a data attribute), so React Native's own styles stay untouched.
 */

const NOISE =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

const CSS = `
${paletteCss()}
html,body,#root{background:var(--gp-bg);}
html{transition:background-color .6s ease;}
body{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility;overscroll-behavior:none;}
::selection{background:var(--gp-flame);color:#FFF6EC;}
*{scrollbar-width:none;-webkit-tap-highlight-color:transparent;}
*::-webkit-scrollbar{width:0;height:0;display:none;}
:focus-visible{outline:2px solid var(--gp-flame);outline-offset:3px;border-radius:12px;}

/* the sunset wipe: the new look grows as a circle from where the guest tapped (or from the sun's corner) */
::view-transition-old(root),::view-transition-new(root){animation:none;mix-blend-mode:normal;}
::view-transition-new(root){animation:gpReveal .9s cubic-bezier(.65,0,.25,1) both;}
@keyframes gpReveal{from{clip-path:circle(0 at var(--gp-wipe-x,90%) var(--gp-wipe-y,6%))}to{clip-path:circle(150% at var(--gp-wipe-x,90%) var(--gp-wipe-y,6%))}}

[data-fx~="glass"]{-webkit-backdrop-filter:blur(18px) saturate(150%);backdrop-filter:blur(18px) saturate(150%);background-color:var(--gp-glass)!important;}
[data-fx~="glass-strong"]{-webkit-backdrop-filter:blur(26px) saturate(170%);backdrop-filter:blur(26px) saturate(170%);background-color:var(--gp-glass)!important;
  box-shadow:0 18px 40px -16px rgba(20,8,2,.35),inset 0 1px 0 rgba(255,240,220,.12);}
[data-fx~="grain"]{position:relative;}
[data-fx~="grain"]::after{content:"";position:absolute;inset:0;background-image:${NOISE};opacity:.06;mix-blend-mode:overlay;pointer-events:none;border-radius:inherit;}
[data-theme="night"] [data-fx~="grain"]::after{opacity:.09;}

/* the heat behind every page */
[data-fx~="heat"]{overflow:hidden;background-color:var(--gp-bg);}
[data-fx~="heat"]::before,[data-fx~="heat"]::after{content:"";position:absolute;pointer-events:none;will-change:transform;}
[data-fx~="heat"]::before{left:-40%;top:-25%;width:150%;height:80%;
  background:radial-gradient(closest-side,rgba(255,196,140,.55),rgba(255,196,140,0) 70%) 0% 0%/60% 70% no-repeat,
             radial-gradient(closest-side,rgba(255,226,190,.7),rgba(255,226,190,0) 72%) 100% 30%/55% 60% no-repeat;
  animation:gpDriftA 28s ease-in-out infinite alternate;}
[data-fx~="heat"]::after{left:-25%;bottom:-30%;width:150%;height:80%;
  background:radial-gradient(closest-side,rgba(238,94,28,.16),rgba(238,94,28,0) 72%) 20% 90%/60% 70% no-repeat,
             radial-gradient(closest-side,rgba(201,138,30,.18),rgba(201,138,30,0) 70%) 90% 70%/50% 60% no-repeat;
  animation:gpDriftB 34s ease-in-out infinite alternate;}
[data-theme="night"] [data-fx~="heat"]::before{
  background:radial-gradient(closest-side,rgba(255,110,40,.10),rgba(255,110,40,0) 70%) 0% 0%/60% 70% no-repeat,
             radial-gradient(closest-side,rgba(120,70,50,.18),rgba(120,70,50,0) 72%) 100% 30%/55% 60% no-repeat;}
[data-theme="night"] [data-fx~="heat"]::after{bottom:-38%;
  background:radial-gradient(closest-side,rgba(255,90,30,.42),rgba(255,90,30,0) 70%) 25% 100%/70% 70% no-repeat,
             radial-gradient(closest-side,rgba(255,170,60,.22),rgba(255,170,60,0) 70%) 85% 85%/55% 60% no-repeat;
  animation:gpDriftB 22s ease-in-out infinite alternate,gpBreathe 4.5s ease-in-out infinite;}
[data-fx~="smoke"]{position:absolute;inset:0;overflow:hidden;pointer-events:none;}
[data-fx~="smoke"]::before{content:"";position:absolute;left:-30%;top:10%;width:160%;height:60%;opacity:.35;filter:blur(30px);
  background:radial-gradient(closest-side,rgba(120,100,90,.35),transparent 70%) 10% 40%/40% 60% no-repeat,radial-gradient(closest-side,rgba(140,120,110,.3),transparent 70%) 70% 20%/45% 70% no-repeat;
  animation:gpSmoke 40s linear infinite;}
[data-theme="day"] [data-fx~="smoke"]::before{opacity:.18;}
@keyframes gpDriftA{0%{transform:translate3d(0,0,0) scale(1)}50%{transform:translate3d(7%,5%,0) scale(1.06)}100%{transform:translate3d(12%,-3%,0) scale(1.02)}}
@keyframes gpDriftB{0%{transform:translate3d(0,0,0)}50%{transform:translate3d(-8%,-4%,0) scale(1.08)}100%{transform:translate3d(5%,-8%,0)}}
@keyframes gpBreathe{0%,100%{opacity:1}50%{opacity:.78}}
@keyframes gpSmoke{0%{transform:translate3d(-10%,10%,0)}100%{transform:translate3d(10%,-25%,0)}}

/* fire */
[data-fx~="ink-fire"]{background-image:linear-gradient(100deg,var(--gp-gold) 0%,var(--gp-ember) 45%,var(--gp-flame) 100%);
  -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;}
[data-fx~="dye-fire"]{background-image:linear-gradient(120deg,var(--gp-ember) 0%,var(--gp-flame) 70%);}
[data-fx~="dye-coal"]{background-image:linear-gradient(160deg,#2A1E19 0%,#120C0A 100%);}
[data-fx~="glow"]{box-shadow:0 10px 30px -10px rgba(255,75,43,.55),0 0 0 1px rgba(255,140,60,.15);}
[data-theme="day"] [data-fx~="glow"]{box-shadow:0 10px 26px -12px rgba(212,45,23,.45);}
[data-fx~="flicker"]{animation:gpFlicker 2.6s ease-in-out infinite;transform-origin:50% 100%;}
@keyframes gpFlicker{0%,100%{transform:scale(1,1)}25%{transform:scale(.97,1.04)}50%{transform:scale(1.02,.97)}75%{transform:scale(.98,1.03)}}

[data-fx~="sheen"]{overflow:hidden;position:relative;}
[data-fx~="sheen"]::after{content:"";position:absolute;top:-20%;bottom:-20%;width:40%;left:-60%;transform:skewX(-20deg);
  background:linear-gradient(90deg,transparent,rgba(255,240,220,.35),transparent);animation:gpSheen 5s cubic-bezier(.4,0,.2,1) infinite;pointer-events:none;}
@keyframes gpSheen{0%,70%{left:-60%}100%{left:130%}}

[data-fx~="pulse"]{animation:gpPulse 1.8s ease-out infinite;}
@keyframes gpPulse{0%{box-shadow:0 0 0 0 rgba(47,138,76,.5)}80%,100%{box-shadow:0 0 0 8px rgba(47,138,76,0)}}
[data-fx~="pulse-red"]{animation:gpPulseRed 1.5s ease-out infinite;}
@keyframes gpPulseRed{0%{box-shadow:0 0 0 0 rgba(255,75,43,.6)}80%,100%{box-shadow:0 0 0 10px rgba(255,75,43,0)}}
[data-fx~="float"]{animation:gpFloat 6s ease-in-out infinite;}
@keyframes gpFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
[data-fx~="spin"]{animation:gpSpin 1.1s linear infinite;}
@keyframes gpSpin{to{transform:rotate(360deg)}}
[data-fx~="marquee"]{display:flex;width:max-content;animation:gpMarquee 38s linear infinite;}
@keyframes gpMarquee{to{transform:translateX(-50%)}}
[dir="rtl"] [data-fx~="marquee"]{animation-direction:reverse;}
[data-fx~="rise"]{animation:gpRise .7s cubic-bezier(.2,.9,.25,1.1) both;}
@keyframes gpRise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
[data-fx~="typing"] span{display:inline-block;animation:gpDot 1.2s ease-in-out infinite;}
[data-fx~="typing"] span:nth-child(2){animation-delay:.15s}[data-fx~="typing"] span:nth-child(3){animation-delay:.3s}
@keyframes gpDot{0%,60%,100%{opacity:.25;transform:none}30%{opacity:1;transform:translateY(-3px)}}

[data-fx~="lift"]{transition:transform .35s cubic-bezier(.2,.9,.25,1.15),box-shadow .35s ease;}
@media (hover:hover){[data-fx~="lift"]:hover{transform:translateY(-3px);}}
[data-fx~="photo"] img{transition:transform 1.2s cubic-bezier(.2,.8,.2,1);}
@media (hover:hover){[data-fx~="lift"]:hover [data-fx~="photo"] img{transform:scale(1.05);}}
[data-fx~="pointer"]{cursor:pointer;}
[data-fx~="tabular"]{font-variant-numeric:tabular-nums;}
[data-fx~="balance"]{text-wrap:balance;}
[data-fx~="nosel"]{user-select:none;-webkit-user-select:none;}
[data-fx~="fade-b"]{-webkit-mask-image:linear-gradient(180deg,#000 55%,transparent);mask-image:linear-gradient(180deg,#000 55%,transparent);}
[data-fx~="shade"]{background-image:linear-gradient(180deg,rgba(17,12,10,0) 30%,rgba(17,12,10,.86) 100%);}
[data-fx~="cctv"]{background-image:repeating-linear-gradient(0deg,rgba(0,0,0,.14) 0 1px,transparent 1px 3px);mix-blend-mode:multiply;}
canvas{display:block;}

@media (prefers-reduced-motion:reduce){
  [data-fx~="heat"]::before,[data-fx~="heat"]::after,[data-fx~="smoke"]::before,[data-fx~="sheen"]::after,[data-fx~="float"],[data-fx~="pulse"],[data-fx~="pulse-red"],[data-fx~="flicker"],[data-fx~="marquee"]{animation:none!important;}
  ::view-transition-new(root){animation:none;}
}
`;

let installed = false;

/** Adds the fonts and the stylesheet to the page once. */
export function installWebStyles() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  for (const href of ['https://fonts.googleapis.com', 'https://fonts.gstatic.com']) {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = href;
    if (href.includes('gstatic')) link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  }
  const fonts = document.createElement('link');
  fonts.rel = 'stylesheet';
  fonts.href = rtl() ? `${FONTS_URL}${ARABIC_FONTS}` : FONTS_URL;
  document.head.appendChild(fonts);
  const style = document.createElement('style');
  style.id = 'grill-fx';
  style.textContent = CSS;
  document.head.appendChild(style);
}

/** Resolves when the display font is ready (or after a short wait), so the intro never flashes a fallback font. */
export function fontsReady(timeout = 1600): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return Promise.resolve();
  const load = Promise.all([
    document.fonts.load('900 48px "Big Shoulders Display"'),
    document.fonts.load('italic 500 24px "Fraunces"'),
    document.fonts.load('500 16px "Geist"'),
  ]).then(() => undefined);
  return Promise.race([load, new Promise<void>((resolve) => setTimeout(resolve, timeout))]).catch(() => undefined);
}
