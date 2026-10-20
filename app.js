/* ==========================================================================
   SIS STAR TRAVEL - app.js
   Dependencias locales: GSAP 3.12 + ScrollTrigger, Lenis 1.1 (assets/vendor).
   Si alguna no carga, la página sigue siendo legible y funcional.
   Cada animación comunica algo: jerarquía, historia, retroalimentación o estado.
   ========================================================================== */
(() => {
  'use strict';

  /* ---------- Utilidades ---------- */
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const root = document.documentElement;
  const wrapDeg = (d) => ((((d + 180) % 360) + 360) % 360) - 180;
  const easeInOut = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const debounce = (fn, ms = 160) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const safe = (name, fn) => { try { fn(); } catch (err) { console.error('[Sis Star]', name, err); } };

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGSAP = !!(window.gsap && window.ScrollTrigger);
  const WA_NUMBER = '528135248744';
  const waLink = (text) => 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(text);

  let lenis = null;
  let menuOpen = false;

  /* ==========================================================================
     1. SCROLL SUAVE (Lenis + ScrollTrigger)
     Motivo: el desplazamiento lento y con inercia da sensación de producto premium
     y mantiene sincronizados los pines y las animaciones de scroll.
     ========================================================================== */
  function initSmoothScroll() {
    // sin GSAP o con movimiento reducido: los destinos se recorren con scroll horizontal nativo
    if (!hasGSAP || reduced) root.classList.add('no-pin');
    if (!hasGSAP) return;
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
    if (reduced || typeof Lenis === 'undefined') return;

    lenis = new Lenis({
      duration: 1.3,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: .9,
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop(); // se libera cuando termina el loader
  }

  function scrollToTarget(el) {
    if (lenis) lenis.scrollTo(el, { duration: 1.8, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }

  function initAnchors() {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = $(id);
      if (!target) return;
      e.preventDefault();
      const go = () => { scrollToTarget(target); history.replaceState(null, '', id); };
      if (menuOpen) { closeMenu(); setTimeout(go, 350); } else go();
    });
  }

  /* ==========================================================================
     2. LOADER (progreso real: fuentes + carga de la página)
     ========================================================================== */
  function initLoader(onReveal) {
    const loader = $('#loader');
    if (!loader) { onReveal(); return; }

    const pctEl = $('#ld-pct');
    const barEl = $('#ld-bar');
    const prog = { v: 0 };
    const t0 = performance.now();
    let loaded = document.readyState === 'complete';
    let fontsOk = false;
    let finished = false;

    window.addEventListener('load', () => { loaded = true; });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { fontsOk = true; });
    else fontsOk = true;

    const render = () => {
      pctEl.textContent = Math.round(prog.v);
      barEl.style.transform = 'scaleX(' + (prog.v / 100) + ')';
    };

    const exit = () => {
      if (finished) return;
      finished = true;
      prog.v = 100; render();
      if (!hasGSAP) {
        loader.style.transition = 'opacity .5s';
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 520);
        onReveal();
        return;
      }
      const tl = gsap.timeline({ onComplete: () => loader.remove() });
      tl.to('.ld-core', { scale: .86, opacity: 0, duration: .55, ease: 'power3.in' }, .25)
        .to('.ld-panel--top', { yPercent: -101, duration: 1.2, ease: 'expo.inOut' }, .55)
        .to('.ld-panel--bot', { yPercent: 101, duration: 1.2, ease: 'expo.inOut' }, .55)
        .add(onReveal, .95);
    };

    const tick = (now) => {
      if (finished) return;
      const elapsed = now - t0;
      const ready = loaded && fontsOk;
      const target = ready ? 100 : Math.min(88, (elapsed / 2100) * 88);
      prog.v = lerp(prog.v, target, ready ? .16 : .08);
      if (prog.v > 99.4) prog.v = 100;
      render();
      if ((ready && prog.v >= 100 && elapsed > 1700) || elapsed > 7000) exit();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ==========================================================================
     3. NAVEGACIÓN
     ========================================================================== */
  const burger = $('#burger');
  const menu = $('#menu');

  function openMenu() {
    if (menuOpen) return;
    menuOpen = true;
    menu.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('is-open')));
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Cerrar menú');
    if (lenis) lenis.stop();
    root.style.overflow = 'hidden';
    setTimeout(() => { const first = $('.menu-nav a', menu); if (first && menuOpen) first.focus({ preventScroll: true }); }, 500);
  }
  function closeMenu() {
    if (!menuOpen) return;
    menuOpen = false;
    menu.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Abrir menú');
    root.style.overflow = '';
    if (lenis) lenis.start();
    setTimeout(() => { if (!menuOpen) menu.hidden = true; }, 850);
  }

  function initNav() {
    if (burger && menu) {
      burger.addEventListener('click', () => (menuOpen ? closeMenu() : openMenu()));
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) { closeMenu(); burger.focus(); } });
      window.matchMedia('(min-width: 1024px)').addEventListener('change', (m) => { if (m.matches) closeMenu(); });
    }
    const nav = $('#nav');
    if (!nav) return;
    if (hasGSAP) {
      ScrollTrigger.create({
        start: 0, end: 'max',
        onUpdate: (self) => {
          const y = self.scroll();
          nav.classList.toggle('is-scrolled', y > 40);
          nav.classList.toggle('is-hidden', self.direction === 1 && y > 520 && !menuOpen);
          if (self.direction === -1) nav.classList.remove('is-hidden');
        },
      });
    } else {
      nav.classList.add('is-scrolled');
    }
  }

  function initProgress() {
    if (!hasGSAP || reduced) return;
    gsap.to('#progress i', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .3 } });
  }

  /* ==========================================================================
     4. TEXTO: partir en palabras
     ========================================================================== */
  function splitWords(el, mask) {
    const out = [];
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const w = document.createElement('span');
            if (mask) {
              w.className = 'mw';
              const inner = document.createElement('span');
              inner.textContent = part;
              w.appendChild(inner);
              out.push(inner);
            } else {
              w.className = 'w';
              w.textContent = part;
              out.push(w);
            }
            frag.appendChild(w);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          walk(child);
        }
      });
    };
    walk(el);
    return out;
  }

  /* ==========================================================================
     5. HERO: intro, parallax, partículas y globo
     ========================================================================== */
  let heroIntro = null;

  function buildHeroIntro() {
    if (!hasGSAP || reduced) return;
    heroIntro = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
    heroIntro
      .from('.hero-copy .eyebrow', { y: 26, opacity: 0, duration: 1.1 }, 0)
      .from('.hero-title .ln-i', { yPercent: 118, duration: 1.5, stagger: .13 }, .1)
      .from('.hero-sub', { y: 30, opacity: 0, duration: 1.2 }, .55)
      .from('.hero-cta > *', { y: 30, opacity: 0, duration: 1.1, stagger: .1 }, .7)
      .from('.hero-globe', { scale: .8, opacity: 0, duration: 2.2, ease: 'power3.out' }, .15)
      .from('.globe-chip', { y: 22, opacity: 0, duration: 1.1 }, 1.4);
  }

  function initHeroParallax() {
    if (!hasGSAP || reduced) return;
    gsap.to('.hero-globe', { yPercent: -10, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero-copy', { yPercent: -8, opacity: .25, ease: 'none', scrollTrigger: { trigger: '.hero', start: '35% top', end: 'bottom top', scrub: true } });
  }

  /* ----- Partículas: polvo de estrellas + estrella fugaz (motivo del logo) ----- */
  function initSparks() {
    const canvas = $('#sparks');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dpr = 1, motes = [], stars = [], shoot = null, nextShoot = 3, clock = 0, last = 0, running = false, raf = 0;
    const ptr = { x: -999, y: -999, on: false };

    const seed = () => {
      const small = w < 700;
      motes = Array.from({ length: small ? 18 : 40 }, () => ({
        x: Math.random() * w, y: Math.random() * h, r: 1 + Math.random() * 2.8,
        vy: -(.12 + Math.random() * .34), vx: (Math.random() - .5) * .2, ph: Math.random() * 6.28,
        gold: Math.random() < .34,
      }));
      stars = Array.from({ length: small ? 5 : 9 }, () => ({
        x: Math.random() * w, y: Math.random() * h * .9, s: 5 + Math.random() * 9, ph: Math.random() * 6.28, sp: .8 + Math.random() * 1.5,
      }));
    };
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      if (reduced) draw(0);
    };
    const sparkle = (x, y, s) => {
      ctx.beginPath();
      ctx.moveTo(x, y - s);
      ctx.quadraticCurveTo(x, y, x + s, y);
      ctx.quadraticCurveTo(x, y, x, y + s);
      ctx.quadraticCurveTo(x, y, x - s, y);
      ctx.quadraticCurveTo(x, y, x, y - s);
      ctx.fill();
    };
    const spawnShoot = () => {
      shoot = { x: w * (.55 + Math.random() * .4), y: h * (.04 + Math.random() * .16), vx: -(560 + Math.random() * 220), vy: 200 + Math.random() * 90, life: 0, max: 1.5 };
    };
    const draw = (dt) => {
      ctx.clearRect(0, 0, w, h);
      // polvo
      motes.forEach((m) => {
        m.x += m.vx; m.y += m.vy;
        if (ptr.on) {
          const dx = m.x - ptr.x, dy = m.y - ptr.y, d2 = dx * dx + dy * dy;
          if (d2 < 14400) { const f = (1 - d2 / 14400) * .9; m.x += dx * f * .05; m.y += dy * f * .05; }
        }
        if (m.y < -10) { m.y = h + 10; m.x = Math.random() * w; }
        if (m.x < -10) m.x = w + 10; else if (m.x > w + 10) m.x = -10;
        const a = (.28 + .22 * Math.sin(clock * 1.2 + m.ph)) * (m.gold ? 1.1 : 1);
        ctx.fillStyle = m.gold ? 'rgba(206,150,3,' + a + ')' : 'rgba(0,159,177,' + a + ')';
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.2832); ctx.fill();
      });
      // destellos de 4 puntas
      stars.forEach((s) => {
        const k = .5 + .5 * Math.sin(clock * s.sp + s.ph);
        ctx.fillStyle = 'rgba(240,189,2,' + (.18 + .6 * k) + ')';
        sparkle(s.x, s.y, s.s * (.55 + .5 * k));
      });
      // estrella fugaz
      if (!reduced) {
        nextShoot -= dt;
        if (!shoot && nextShoot <= 0) { spawnShoot(); nextShoot = 6 + Math.random() * 4; }
        if (shoot) {
          shoot.life += dt;
          shoot.x += shoot.vx * dt; shoot.y += shoot.vy * dt;
          const k = shoot.life / shoot.max;
          const len = 190, sp = Math.hypot(shoot.vx, shoot.vy);
          const tx = shoot.x - (shoot.vx / sp) * len, ty = shoot.y - (shoot.vy / sp) * len;
          const g = ctx.createLinearGradient(shoot.x, shoot.y, tx, ty);
          const alpha = Math.sin(Math.PI * clamp(k, 0, 1));
          g.addColorStop(0, 'rgba(240,189,2,' + .95 * alpha + ')');
          g.addColorStop(1, 'rgba(240,189,2,0)');
          ctx.strokeStyle = g; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(shoot.x, shoot.y); ctx.lineTo(tx, ty); ctx.stroke();
          ctx.fillStyle = 'rgba(240,189,2,' + alpha + ')';
          sparkle(shoot.x, shoot.y, 9);
          if (k >= 1) shoot = null;
        }
      }
    };
    const frame = (ts) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(.05, (ts - last) / 1000 || .016);
      last = ts; clock += dt;
      draw(dt);
    };
    const start = () => { if (running || reduced) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

    resize();
    new ResizeObserver(debounce(resize, 120)).observe(canvas);
    if (finePointer) {
      window.addEventListener('pointermove', (e) => {
        const r = canvas.getBoundingClientRect();
        ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; ptr.on = ptr.y > 0 && ptr.y < r.height;
      }, { passive: true });
    }
    new IntersectionObserver(([en]) => (en.isIntersecting && !document.hidden ? start() : stop()), { threshold: 0 }).observe(canvas);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (canvas.getBoundingClientRect().bottom > 0) start(); });
  }

  /* ----- Globo: tierra de puntos, vuelos desde Monterrey a los destinos ----- */
  function initGlobe() {
    const canvas = $('#globe');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const chipDest = $('#globe-dest');
    const D2R = Math.PI / 180;

    // Máscara de tierra 360x180 (1 bit por grado, derivada de Natural Earth, dominio público)
    const bin = atob(LAND_B64);
    const land = new Uint8Array(360 * 180);
    for (let i = 0; i < bin.length; i++) { const b = bin.charCodeAt(i); for (let k = 0; k < 8; k++) land[i * 8 + k] = (b >> (7 - k)) & 1; }
    const isLand = (lon, lat) => {
      const x = (((Math.floor(lon + 180)) % 360) + 360) % 360, y = Math.floor(90 - lat);
      return y >= 0 && y < 180 && land[y * 360 + x] === 1;
    };
    const vec = (lon, lat) => { const a = lon * D2R, b = lat * D2R, c = Math.cos(b); return [c * Math.sin(a), Math.sin(b), c * Math.cos(a)]; };

    // Puntos de tierra en malla hexagonal
    const small = window.innerWidth < 700;
    const step = small ? 3.2 : 2.35;
    const dots = [];
    let row = 0;
    for (let lat = -58; lat <= 84; lat += step, row++) {
      const ls = step / Math.max(Math.cos(lat * D2R), .18);
      for (let lon = -180 + (row % 2 ? ls / 2 : 0); lon < 180; lon += ls) if (isLand(lon, lat)) dots.push(vec(lon, lat));
    }
    const N = dots.length;
    const px = new Float32Array(N), py = new Float32Array(N), lvl = new Int8Array(N);

    // Retícula
    const grat = [];
    for (let lon = -180; lon < 180; lon += 30) { const l = []; for (let lat = -80; lat <= 80; lat += 4) l.push(vec(lon, lat)); grat.push(l); }
    for (let lat = -60; lat <= 60; lat += 30) { const l = []; for (let lon = -180; lon <= 180; lon += 5) l.push(vec(lon, lat)); grat.push(l); }

    // Destinos
    const MTY = { name: 'Monterrey', lon: -100.31, lat: 25.67 };
    const DESTS = [
      { name: 'Madrid', label: 'Europa', lon: -3.7, lat: 40.4 },
      { name: 'Tokio', label: 'Japón', lon: 139.7, lat: 35.7 },
      { name: 'Bangkok', label: 'Tailandia', lon: 100.5, lat: 13.75 },
      { name: 'Toronto', label: 'Canadá', lon: -79.4, lat: 43.7 },
      { name: 'Cartagena', label: 'Colombia', lon: -75.5, lat: 10.4 },
      { name: 'Río', label: 'Brasil', lon: -43.2, lat: -22.9 },
      { name: 'Cusco', label: 'Perú', lon: -71.97, lat: -13.5 },
      { name: 'Cancún', label: 'México', lon: -86.85, lat: 21.16 },
    ];
    const ARC_N = 76;
    const mtyV = vec(MTY.lon, MTY.lat);
    const arcs = DESTS.map((d) => {
      const b = vec(d.lon, d.lat);
      const om = Math.acos(clamp(mtyV[0] * b[0] + mtyV[1] * b[1] + mtyV[2] * b[2], -1, 1));
      const pts = new Float32Array((ARC_N + 1) * 3);
      const height = .05 + .3 * (om / Math.PI);
      for (let i = 0; i <= ARC_N; i++) {
        const t = i / ARC_N, s1 = Math.sin((1 - t) * om) / Math.sin(om), s2 = Math.sin(t * om) / Math.sin(om);
        const lift = 1 + height * Math.sin(Math.PI * t);
        pts[i * 3] = (mtyV[0] * s1 + b[0] * s2) * lift;
        pts[i * 3 + 1] = (mtyV[1] * s1 + b[1] * s2) * lift;
        pts[i * 3 + 2] = (mtyV[2] * s1 + b[2] * s2) * lift;
      }
      return { d, b, pts };
    });
    const PLANE = new Path2D('M185.33,114.21l29.14-27.42.17-.17a32,32,0,0,0-45.26-45.26c0,.06-.11.11-.17.17L141.79,70.67l-83-30.2a8,8,0,0,0-8.39,1.86l-24,24a8,8,0,0,0,1.22,12.31l63.89,42.59L76.69,136H56a8,8,0,0,0-5.65,2.34l-24,24A8,8,0,0,0,29,175.42l36.82,14.73,14.7,36.75.06.16a8,8,0,0,0,13.18,2.47l23.87-23.88A8,8,0,0,0,120,200V179.31l14.76-14.76,42.59,63.89a8,8,0,0,0,12.31,1.22l24-24a8,8,0,0,0,1.86-8.39Zm-.07,97.23-42.59-63.88A8,8,0,0,0,136.8,144c-.27,0-.53,0-.79,0a8,8,0,0,0-5.66,2.35l-24,24A8,8,0,0,0,104,176v20.69L90.93,209.76,79.43,181A8,8,0,0,0,75,176.57l-28.74-11.5L59.32,152H80a8,8,0,0,0,5.66-2.34l24-24a8,8,0,0,0-1.22-12.32L44.56,70.74l13.5-13.49,83.22,30.26a8,8,0,0,0,8.56-2L180.78,52.6A16,16,0,0,1,203.4,75.23l-32.87,30.93a8,8,0,0,0-2,8.56l30.26,83.22Z');

    // Estado
    const STEP = 4.8;
    const cam = { lon: 10, lat: 22, roll: -.2 };
    const target = { lon: -100, lat: 22 };
    const ptr = { x: 0, y: 0 }, ptrS = { x: 0, y: 0 };
    let clock = 0, lastIdx = -1, S = 0, cx = 0, cy = 0, R = 0, dpr = 1, last = 0, running = false, raf = 0;
    let gSphere = null, gAtmo = null, gRim = null, gShade = null;
    const tmp = [0, 0, 0];

    const buildGradients = () => {
      gAtmo = ctx.createRadialGradient(cx, cy, R * .9, cx, cy, R * 1.32);
      gAtmo.addColorStop(0, 'rgba(0,159,177,.5)'); gAtmo.addColorStop(.3, 'rgba(0,159,177,.2)'); gAtmo.addColorStop(1, 'rgba(0,159,177,0)');
      gSphere = ctx.createRadialGradient(cx - R * .36, cy - R * .42, R * .05, cx, cy, R * 1.04);
      gSphere.addColorStop(0, '#1a63d6'); gSphere.addColorStop(.42, '#0c3282'); gSphere.addColorStop(1, '#041436');
      gShade = ctx.createRadialGradient(cx - R * .3, cy - R * .36, R * .15, cx, cy, R);
      gShade.addColorStop(0, 'rgba(255,255,255,.14)'); gShade.addColorStop(.5, 'rgba(255,255,255,0)'); gShade.addColorStop(1, 'rgba(2,8,28,.42)');
      gRim = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
      gRim.addColorStop(0, 'rgba(92,208,221,.85)'); gRim.addColorStop(.5, 'rgba(92,208,221,.12)'); gRim.addColorStop(1, 'rgba(240,189,2,.45)');
    };
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, small ? 1.6 : 2);
      S = r.width;
      canvas.width = Math.round(S * dpr); canvas.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = S / 2; cy = r.height / 2; R = S * .385;
      buildGradients();
      if (reduced) { clock = STEP * DESTS.length; cam.lon = -58; cam.lat = 24; draw(0); }
    };

    // rotación: yaw -> pitch -> roll
    let cyw = 1, syw = 0, cp = 1, sp = 0, cr = 1, sr = 0;
    const setCam = () => {
      const lon0 = (cam.lon + ptrS.x * 11) * D2R, lat0 = (cam.lat - ptrS.y * 8) * D2R;
      cyw = Math.cos(lon0); syw = Math.sin(lon0); cp = Math.cos(lat0); sp = Math.sin(lat0); cr = Math.cos(cam.roll); sr = Math.sin(cam.roll);
    };
    const tf = (x, y, z, o) => {
      const x1 = x * cyw - z * syw, z1 = x * syw + z * cyw;
      const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
      o[0] = x1 * cr - y2 * sr; o[1] = x1 * sr + y2 * cr; o[2] = z2;
    };

    const setTarget = (i) => {
      const d = DESTS[i];
      target.lon = MTY.lon + wrapDeg(d.lon - MTY.lon) / 2;
      target.lat = clamp((MTY.lat + d.lat) / 2 * .8 + 8, 6, 40);
      if (chipDest) {
        if (hasGSAP && !reduced) gsap.fromTo(chipDest, { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: .7, ease: 'expo.out' });
        chipDest.textContent = d.label;
      }
    };

    const draw = (dt) => {
      const idx = Math.floor(clock / STEP) % DESTS.length;
      const lt = clock - Math.floor(clock / STEP) * STEP;
      if (idx !== lastIdx) { lastIdx = idx; setTarget(idx); }

      if (!reduced) {
        const k = 1 - Math.exp(-dt * 1.5);
        cam.lon += wrapDeg(target.lon - cam.lon) * k;
        cam.lat += (target.lat - cam.lat) * k;
        ptrS.x += (ptr.x - ptrS.x) * (1 - Math.exp(-dt * 3));
        ptrS.y += (ptr.y - ptrS.y) * (1 - Math.exp(-dt * 3));
      }
      setCam();
      ctx.clearRect(0, 0, S, canvas.height / dpr);

      // atmósfera + esfera
      ctx.fillStyle = gAtmo; ctx.fillRect(0, 0, S, canvas.height / dpr);
      ctx.fillStyle = gSphere; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.fill();

      // proyectar puntos de tierra
      const dsz = R / 300;
      for (let i = 0; i < N; i++) {
        const v = dots[i];
        tf(v[0], v[1], v[2], tmp);
        px[i] = cx + tmp[0] * R; py[i] = cy - tmp[1] * R;
        lvl[i] = tmp[2] <= 0 ? -1 : Math.min(3, (tmp[2] * 4) | 0);
      }
      // lado trasero, muy tenue (efecto cristal)
      ctx.fillStyle = 'rgba(92,208,221,.09)';
      ctx.beginPath();
      for (let i = 0; i < N; i++) if (lvl[i] < 0) { ctx.moveTo(px[i] + .8 * dsz * 1.4, py[i]); ctx.arc(px[i], py[i], .8 * dsz * 1.4, 0, 6.2832); }
      ctx.fill();

      // retícula
      ctx.strokeStyle = 'rgba(92,208,221,.13)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let g = 0; g < grat.length; g++) {
        const line = grat[g]; let pen = false;
        for (let i = 0; i < line.length; i++) {
          tf(line[i][0], line[i][1], line[i][2], tmp);
          if (tmp[2] > 0) { const x = cx + tmp[0] * R, y = cy - tmp[1] * R; if (pen) ctx.lineTo(x, y); else ctx.moveTo(x, y); pen = true; } else pen = false;
        }
      }
      ctx.stroke();

      // tierra frontal por niveles de profundidad
      const cols = ['rgba(92,208,221,.34)', 'rgba(92,208,221,.62)', 'rgba(110,222,234,.88)', 'rgba(196,246,250,1)'];
      const sizes = [1.0, 1.25, 1.5, 1.7];
      for (let L = 0; L < 4; L++) {
        ctx.fillStyle = cols[L]; ctx.beginPath();
        const rr = sizes[L] * dsz * 1.35;
        for (let i = 0; i < N; i++) if (lvl[i] === L) { ctx.moveTo(px[i] + rr, py[i]); ctx.arc(px[i], py[i], rr, 0, 6.2832); }
        ctx.fill();
      }

      // sombra / brillo de la esfera
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.clip();
      ctx.fillStyle = gShade; ctx.fillRect(cx - R, cy - R, R * 2, R * 2); ctx.restore();

      // vuelos
      const done = Math.floor(clock / STEP);
      for (let k = 2; k >= 0; k--) {
        if (k > done) continue;
        const ai = ((idx - k) % DESTS.length + DESTS.length) % DESTS.length;
        const p = k === 0 ? easeInOut(clamp((lt - .45) / 2.9, 0, 1)) : 1;
        const alpha = k === 0 ? 1 : k === 1 ? lerp(.62, .32, lt / STEP) : lerp(.3, .1, lt / STEP);
        drawArc(arcs[ai], p, alpha, k === 0, dsz);
      }

      // Monterrey (origen)
      marker(mtyV, MTY.name, true, 1, dsz);

      // anillo y borde
      ctx.lineWidth = 1.6; ctx.strokeStyle = gRim; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.stroke();
    };

    const arcPoint = (a, i, o) => { tf(a.pts[i * 3], a.pts[i * 3 + 1], a.pts[i * 3 + 2], o); };
    const visible = (o) => o[2] > 0 || (o[0] * o[0] + o[1] * o[1]) > 1.0;

    const drawArc = (a, p, alpha, active, dsz) => {
      const n = Math.max(1, Math.floor(p * ARC_N));
      const o = [0, 0, 0];
      // trazo punteado completo (guiño a los puntos del logo)
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.setLineDash([.1, 7 * dsz + 3]); ctx.lineWidth = 2.6 * Math.max(dsz * 1.2, .7);
      ctx.strokeStyle = 'rgba(248,217,90,' + (.9 * alpha) + ')';
      ctx.beginPath(); let pen = false;
      for (let i = 0; i <= n; i++) {
        arcPoint(a, i, o);
        if (visible(o)) { const x = cx + o[0] * R, y = cy - o[1] * R; if (pen) ctx.lineTo(x, y); else ctx.moveTo(x, y); pen = true; } else pen = false;
      }
      ctx.stroke(); ctx.setLineDash([]);

      if (active && p > 0) {
        // tramo brillante junto al avión
        const s0 = Math.max(0, n - 16);
        ctx.lineWidth = 2.4; ctx.strokeStyle = 'rgba(240,189,2,.95)'; ctx.beginPath(); pen = false;
        for (let i = s0; i <= n; i++) {
          arcPoint(a, i, o);
          if (visible(o)) { const x = cx + o[0] * R, y = cy - o[1] * R; if (pen) ctx.lineTo(x, y); else ctx.moveTo(x, y); pen = true; } else pen = false;
        }
        ctx.stroke();
        // avión
        const o2 = [0, 0, 0];
        arcPoint(a, n, o); arcPoint(a, Math.max(0, n - 3), o2);
        if (visible(o) && p > .03) {
          const hx = cx + o[0] * R, hy = cy - o[1] * R, bx = cx + o2[0] * R, by = cy - o2[1] * R;
          const ang = Math.atan2(hy - by, hx - bx);
          const sc = Math.max(R / 300 * .13, .07);
          ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang + Math.PI / 4); ctx.scale(sc, sc); ctx.translate(-128, -128);
          ctx.fillStyle = '#F8D95A'; ctx.shadowColor = 'rgba(240,189,2,.9)'; ctx.shadowBlur = 18 / sc * .35;
          ctx.fill(PLANE); ctx.restore();
        }
        if (p >= .995) marker(a.b, a.d.name, false, 1, dsz);
      } else if (alpha > .2) {
        marker(a.b, a.d.name, false, alpha * .7, dsz, true);
      }
    };

    const marker = (v, name, origin, alpha, dsz, quiet) => {
      const o = [0, 0, 0];
      tf(v[0], v[1], v[2], o);
      if (o[2] < .08) return;
      const x = cx + o[0] * R, y = cy - o[1] * R;
      const pulse = (clock * .9 + (origin ? 0 : .5)) % 1;
      const base = Math.max(3.4 * dsz * 1.3, 3);
      if (!quiet) {
        ctx.strokeStyle = (origin ? 'rgba(240,189,2,' : 'rgba(196,246,250,') + (.6 * (1 - pulse) * alpha) + ')';
        ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, base + pulse * base * 3.2, 0, 6.2832); ctx.stroke();
      }
      ctx.fillStyle = origin ? '#F0BD02' : 'rgba(234,246,249,' + alpha + ')';
      ctx.beginPath(); ctx.arc(x, y, base, 0, 6.2832); ctx.fill();
      if (!quiet) {
        ctx.font = '600 ' + Math.round(clamp(R / 21, 11, 14)) + 'px Geist, system-ui, sans-serif';
        ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(4,16,43,.55)';
        ctx.fillText(name, x + base + 9, y + 1.2);
        ctx.fillStyle = origin ? '#F8D95A' : '#EAF6F9';
        ctx.fillText(name, x + base + 8, y);
      }
    };

    const frame = (ts) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(.05, (ts - last) / 1000 || .016);
      last = ts;
      // el recorrido empieza cuando la página se revela (no detrás del loader)
      const d = root.classList.contains('is-ready') ? dt : 0;
      clock += d;
      draw(d);
    };
    const start = () => { if (running || reduced) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

    resize();
    new ResizeObserver(debounce(resize, 120)).observe(canvas.parentElement);
    if (finePointer && !reduced) {
      window.addEventListener('pointermove', (e) => {
        ptr.x = clamp((e.clientX / window.innerWidth - .5) * 2, -1, 1);
        ptr.y = clamp((e.clientY / window.innerHeight - .5) * 2, -1, 1);
      }, { passive: true });
    }
    new IntersectionObserver(([en]) => (en.isIntersecting && !document.hidden ? start() : stop()), { threshold: 0 }).observe(canvas);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (canvas.getBoundingClientRect().bottom > 0) start(); });
  }

  /* ==========================================================================
     6. ANIMACIONES DE SCROLL
     ========================================================================== */
  function initScrollAnimations() {
    if (!hasGSAP || reduced) return;
    const mm = gsap.matchMedia();

    /* Titulares: revelado por palabra (jerarquía: lo primero que se lee) */
    $$('[data-lines]').forEach((h) => {
      const words = splitWords(h, true);
      gsap.set(words, { yPercent: 118 });
      ScrollTrigger.create({
        trigger: h, start: 'top 88%', once: true,
        onEnter: () => gsap.to(words, { yPercent: 0, duration: 1.25, ease: 'expo.out', stagger: .055 }),
      });
    });

    /* Elementos sueltos: entrada escalonada */
    gsap.set('[data-reveal]', { opacity: 0, y: 56 });
    ScrollTrigger.batch('[data-reveal]', {
      start: 'top 90%', once: true,
      onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1.3, ease: 'expo.out', stagger: .1, overwrite: true }),
    });

    /* Manifiesto: cada palabra se enciende al leerla (historia: tú recorres el texto) */
    const manifesto = $('.manifesto-text');
    if (manifesto) {
      const words = splitWords(manifesto, false);
      gsap.set(words, { opacity: .14 });
      gsap.to(words, {
        opacity: 1, ease: 'none', stagger: .12,
        scrollTrigger: { trigger: manifesto, start: 'top 78%', end: 'bottom 48%', scrub: .5 },
      });
    }

    /* Imagen que se abre a pantalla completa */
    mm.add('(min-width: 0px)', () => {
      const stage = $('.expand-stage');
      if (!stage) return;
      const portrait = window.innerWidth < 760;
      const from = portrait ? 'inset(22% 9% 22% 9% round 24px)' : 'inset(15% 30% 15% 30% round 32px)';
      const tl = gsap.timeline({
        scrollTrigger: { trigger: '.expand', start: 'top top', end: '+=170%', scrub: .7, pin: true, anticipatePin: 1, invalidateOnRefresh: true },
      });
      tl.fromTo('.expand-media', { clipPath: from }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', duration: 1 }, 0)
        .fromTo('.expand-media img', { scale: 1.45 }, { scale: 1, ease: 'none', duration: 1 }, 0)
        .fromTo('.expand-word', { scale: .92, opacity: 1 }, { scale: 1.25, opacity: 0, ease: 'none', duration: .75 }, 0)
        .fromTo('.expand-shade', { opacity: 0 }, { opacity: 1, ease: 'none', duration: .45 }, .55)
        .fromTo('.expand-copy > *', { y: 46, opacity: 0 }, { y: 0, opacity: 1, ease: 'power2.out', duration: .35, stagger: .12 }, .72);
    });

    /* Destinos: scroll vertical convertido en recorrido horizontal (solo escritorio) */
    mm.add('(min-width: 900px)', () => {
      const section = $('.dest'), track = $('.dest-track'), viewport = $('.dest-viewport'), bar = $('.dest-progress i');
      if (!section || !track) return;
      const dist = () => Math.max(0, track.scrollWidth + parseFloat(getComputedStyle(viewport).paddingLeft) * 2 - window.innerWidth);
      const tween = gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: {
          trigger: section, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: .8, anticipatePin: 1, invalidateOnRefresh: true,
          onUpdate: (self) => { if (bar) bar.style.transform = 'scaleX(' + self.progress + ')'; },
        },
      });
      $$('.dcard img', track).forEach((img) => {
        gsap.fromTo(img, { xPercent: -4 }, {
          xPercent: 4, ease: 'none',
          scrollTrigger: { trigger: img.closest('.dcard'), containerAnimation: tween, start: 'left right', end: 'right left', scrub: true },
        });
      });
    });

    /* Bodas: los arcos suben a distinta velocidad (profundidad) */
    $$('[data-arch]').forEach((fig, i) => {
      const speed = [5, -8, 11][i] || 0;
      gsap.fromTo(fig, { clipPath: 'inset(100% 0% 0% 0%)' }, {
        clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'expo.out',
        scrollTrigger: { trigger: fig, start: 'top 88%', once: true },
      });
      gsap.fromTo($('img', fig), { scale: 1.3 }, { scale: 1, duration: 2, ease: 'expo.out', scrollTrigger: { trigger: fig, start: 'top 88%', once: true } });
      gsap.fromTo(fig, { yPercent: speed }, { yPercent: -speed, ease: 'none', scrollTrigger: { trigger: '.wed-media', start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    /* Promos: columnas con parallax distinto */
    const factor = window.innerWidth >= 900 ? 220 : 110;
    $$('.promo-item').forEach((item) => {
      const sp = parseFloat(item.dataset.speed) || 1;
      gsap.fromTo(item, { y: (sp - 1) * factor }, {
        y: -(sp - 1) * factor, ease: 'none',
        scrollTrigger: { trigger: '.promo-grid', start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });

    /* Reels: aparición con ligero desfase */
    gsap.from('.reel', {
      y: 80, opacity: 0, duration: 1.4, ease: 'expo.out', stagger: .18,
      scrollTrigger: { trigger: '.reels-stage', start: 'top 85%', once: true },
    });

    /* Formulario y datos de contacto */
    gsap.from('.form-card', { y: 70, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.form-card', start: 'top 88%', once: true } });
    gsap.from('.clist li', { y: 30, opacity: 0, duration: 1, ease: 'expo.out', stagger: .08, scrollTrigger: { trigger: '.clist', start: 'top 88%', once: true } });
  }

  /* ==========================================================================
     7. RUTA DE VUELO (cómo funciona)
     El avión recorre la ruta a medida que lees los pasos: muestra la secuencia del proceso.
     ========================================================================== */
  function initFlow() {
    const body = $('#flow'), svg = $('#flow-svg'), track = $('#flow-track'), draw = $('#flow-draw'), plane = $('#flow-plane');
    if (!body || !svg || !draw) return;
    const icons = $$('.fstep-ic', body);
    let len = 0, progress = 0;

    const build = () => {
      const b = body.getBoundingClientRect();
      if (!b.width) return;
      const wide = window.innerWidth >= 900;
      const pts = icons.map((ic) => { const r = ic.getBoundingClientRect(); return { x: r.left - b.left + r.width / 2, y: r.top - b.top + r.height / 2 }; });
      const list = [{ x: pts[0].x, y: pts[0].y - 70 }];
      pts.forEach((p, i) => {
        if (i > 0 && !wide) list.push({ x: p.x + (i % 2 ? 22 : -2), y: (pts[i - 1].y + p.y) / 2 });
        list.push(p);
      });
      const lp = pts[pts.length - 1];
      list.push({ x: lp.x + (wide ? 90 : 26), y: lp.y + (wide ? 90 : 48) });

      // Catmull-Rom a Bézier cúbica
      let d = 'M' + list[0].x.toFixed(1) + ' ' + list[0].y.toFixed(1);
      for (let i = 0; i < list.length - 1; i++) {
        const p0 = list[i - 1] || list[i], p1 = list[i], p2 = list[i + 1], p3 = list[i + 2] || p2;
        const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
        const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
        d += ' C' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ' ' + c2y.toFixed(1) + ' ' + p2.x.toFixed(1) + ' ' + p2.y.toFixed(1);
      }
      svg.setAttribute('viewBox', '0 0 ' + b.width.toFixed(1) + ' ' + b.height.toFixed(1));
      track.setAttribute('d', d); draw.setAttribute('d', d);
      len = draw.getTotalLength();
      draw.style.strokeDasharray = len;
      update(progress);
    };

    const update = (p) => {
      progress = p;
      draw.style.strokeDashoffset = len * (1 - p);
      if (!hasGSAP || reduced) return;
      const L = len * p, a = draw.getPointAtLength(L), b = draw.getPointAtLength(Math.min(len, L + 3));
      const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI + 45;
      gsap.set(plane, { x: a.x, y: a.y, rotation: ang, opacity: p > .004 ? 1 : 0 });
    };

    build();
    if (reduced || !hasGSAP) { update(1); if (plane) plane.style.display = 'none'; return; }

    ScrollTrigger.create({ trigger: body, start: 'top 68%', end: 'bottom 62%', scrub: .5, onUpdate: (self) => update(self.progress) });
    $$('.fstep').forEach((s) => {
      gsap.from(s, { y: 50, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: s, start: 'top 84%', once: true } });
    });
    window.addEventListener('resize', debounce(() => { build(); }, 200));
    ScrollTrigger.addEventListener('refreshInit', build);
  }

  /* ==========================================================================
     8. PROMOS: lightbox con transición desde la miniatura
     ========================================================================== */
  function initLightbox() {
    const lb = $('#lightbox'), img = $('#lb-img'), title = $('#lb-title'), cta = $('#lb-cta'), close = $('#lb-close');
    if (!lb) return;
    let opener = null;

    const open = async (btn) => {
      const thumb = $('img', btn);
      opener = btn;
      img.width = thumb.naturalWidth || 1000; img.height = thumb.naturalHeight || 1000;
      img.src = thumb.currentSrc || thumb.src; img.alt = thumb.alt;
      title.textContent = btn.dataset.title;
      cta.href = waLink(btn.dataset.msg);
      try { await img.decode(); } catch (_) { /* la imagen ya está en caché */ }
      if (typeof lb.showModal === 'function') lb.showModal(); else lb.setAttribute('open', '');
      if (lenis) lenis.stop();
      if (hasGSAP && !reduced) {
        const a = thumb.getBoundingClientRect(), b = img.getBoundingClientRect();
        gsap.fromTo(img, { x: a.left + a.width / 2 - (b.left + b.width / 2), y: a.top + a.height / 2 - (b.top + b.height / 2), scale: a.width / b.width },
          { x: 0, y: 0, scale: 1, duration: .95, ease: 'expo.out' });
        gsap.fromTo('.lb-bar, .lb-close', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: .7, delay: .3, ease: 'expo.out', stagger: .08 });
      }
    };
    const shut = () => {
      if (!lb.open) return;
      if (hasGSAP && !reduced) gsap.to(lb, { opacity: 0, duration: .28, onComplete: () => { lb.close(); gsap.set(lb, { opacity: 1 }); } });
      else lb.close();
    };

    $$('.promo').forEach((btn) => btn.addEventListener('click', () => open(btn)));
    close.addEventListener('click', shut);
    lb.addEventListener('click', (e) => { if (e.target === lb) shut(); });
    lb.addEventListener('close', () => { if (lenis && !menuOpen) lenis.start(); if (opener) opener.focus({ preventScroll: true }); });
  }

  /* ==========================================================================
     9. REELS: se cargan cerca y solo se reproducen cuando están a la vista
     ========================================================================== */
  function initReels() {
    const figs = $$('[data-reel]');
    if (!figs.length) return;
    const vids = [];
    figs.forEach((fig) => {
      const v = $('video', fig), btn = $('.reel-sound', fig);
      let loaded = false;
      const load = () => { if (loaded) return; loaded = true; v.src = v.dataset.src; v.load(); };
      if (reduced) v.controls = true;
      vids.push(v);

      new IntersectionObserver(([en]) => { if (en.isIntersecting) load(); }, { rootMargin: '600px 0px' }).observe(fig);
      new IntersectionObserver(([en]) => {
        if (en.isIntersecting) { load(); if (!reduced) v.play().catch(() => {}); } else v.pause();
      }, { threshold: .4 }).observe(fig);

      btn.addEventListener('click', () => {
        const unmute = v.muted;
        vids.forEach((o) => { o.muted = true; const b = o.parentElement.querySelector('.reel-sound'); if (b) b.setAttribute('aria-pressed', 'false'); });
        if (unmute) { v.muted = false; btn.setAttribute('aria-pressed', 'true'); if (v.paused) v.play().catch(() => {}); }
      });
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) vids.forEach((v) => v.pause()); });
  }

  /* ==========================================================================
     10. PREGUNTAS FRECUENTES
     ========================================================================== */
  function initFaq() {
    const items = $$('.qa');
    const refresh = debounce(() => hasGSAP && ScrollTrigger.refresh(), 700);
    const setOpen = (qa, open) => {
      const btn = $('button', qa), panel = $('.qa-panel', qa);
      btn.setAttribute('aria-expanded', String(open));
      qa.classList.toggle('is-open', open);
      panel.inert = !open;
    };
    items.forEach((qa, i) => {
      setOpen(qa, i === 0);
      $('button', qa).addEventListener('click', () => {
        const isOpen = qa.classList.contains('is-open');
        items.forEach((o) => setOpen(o, false));
        setOpen(qa, !isOpen);
        refresh();
      });
    });
  }

  /* ==========================================================================
     11. FORMULARIO: valida y abre WhatsApp con el mensaje listo
     ========================================================================== */
  function initForm() {
    const form = $('#wa-form');
    if (!form) return;
    const f = { nombre: $('#f-nombre'), tel: $('#f-tel'), destino: $('#f-destino'), personas: $('#f-personas'), msg: $('#f-msg') };
    const submit = $('#f-submit'), status = $('#f-status');

    const setErr = (input, text) => {
      const el = $('#' + input.id + '-e');
      if (el) el.textContent = text || '';
      input.setAttribute('aria-invalid', text ? 'true' : 'false');
    };
    const rules = {
      nombre: () => (f.nombre.value.trim().length < 2 ? 'Escribe tu nombre para saber cómo llamarte.' : ''),
      tel: () => { const d = f.tel.value.replace(/\D/g, ''); return f.tel.value.trim() && d.length < 10 ? 'Revisa tu teléfono: necesitamos 10 dígitos.' : ''; },
      destino: () => (!f.destino.value ? 'Elige un destino para empezar.' : ''),
    };
    const check = (key) => { const m = rules[key](); setErr(f[key], m); return !m; };
    Object.keys(rules).forEach((k) => {
      f[k].addEventListener('blur', () => check(k));
      f[k].addEventListener('input', () => { if (f[k].getAttribute('aria-invalid') === 'true') check(k); });
    });

    const compose = () => {
      const nombre = f.nombre.value.trim(), dest = f.destino.value, pers = f.personas.value, tel = f.tel.value.trim(), extra = f.msg.value.trim();
      let want;
      if (/^Boda/.test(dest)) want = 'información para una boda o luna de miel';
      else if (dest === 'Otro destino') want = 'cotizar un viaje a otro destino';
      else if (/^Caribe/.test(dest)) want = 'cotizar un viaje todo incluido en el Caribe';
      else want = 'cotizar un viaje a ' + dest;
      return 'Hola Sis Star Travel, soy ' + nombre + '. Quiero ' + want + ' para ' + pers + '.' +
        (extra ? ' ' + extra : '') + (tel ? ' Mi teléfono es ' + tel + '.' : '');
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      status.className = 'form-status'; status.textContent = '';
      const results = Object.keys(rules).map(check);
      if (results.includes(false)) {
        const bad = Object.keys(rules).find((k) => f[k].getAttribute('aria-invalid') === 'true');
        if (bad) f[bad].focus();
        status.textContent = 'Faltan un par de datos para continuar.';
        return;
      }
      const url = waLink(compose());
      submit.classList.add('is-loading');
      status.textContent = 'Preparando tu mensaje...';
      window.open(url, '_blank', 'noopener');
      setTimeout(() => {
        submit.classList.remove('is-loading');
        status.classList.add('is-ok');
        status.innerHTML = '¡Listo! Si WhatsApp no se abrió, <a href="' + url + '" target="_blank" rel="noopener">toca aquí</a>.';
      }, 1100);
    });
  }

  /* ==========================================================================
     12. WHATSAPP FLOTANTE, BOTONES MAGNÉTICOS
     ========================================================================== */
  function initFloat() {
    const wa = $('#wa-float');
    if (!wa) return;
    setTimeout(() => wa.classList.add('is-in'), 400);
    setTimeout(() => { wa.classList.add('show-tip'); setTimeout(() => wa.classList.remove('show-tip'), 5200); }, 9000);
  }

  function initMagnetic() {
    if (!hasGSAP || reduced || !finePointer) return;
    $$('.magnetic').forEach((el) => {
      const xTo = gsap.quickTo(el, 'x', { duration: .7, ease: 'power3' });
      const yTo = gsap.quickTo(el, 'y', { duration: .7, ease: 'power3' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * .22);
        yTo((e.clientY - (r.top + r.height / 2)) * .3);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  /* ==========================================================================
     ARRANQUE
     ========================================================================== */
  const reveal = () => {
    root.classList.add('is-ready');
    if (lenis) lenis.start();
    if (heroIntro) heroIntro.play();
    initFloat();
    if (hasGSAP) setTimeout(() => ScrollTrigger.refresh(), 1600);
  };

  const boot = () => {
    safe('smooth', initSmoothScroll);
    safe('anchors', initAnchors);
    safe('nav', initNav);
    safe('progress', initProgress);
    safe('heroIntro', buildHeroIntro);
    safe('sparks', initSparks);
    safe('globe', initGlobe);
    safe('scroll', initScrollAnimations);
    safe('flow', initFlow);
    safe('heroParallax', initHeroParallax);
    safe('lightbox', initLightbox);
    safe('reels', initReels);
    safe('faq', initFaq);
    safe('form', initForm);
    safe('magnetic', initMagnetic);
    initLoader(() => safe('reveal', reveal));

    window.addEventListener('load', () => { if (hasGSAP) ScrollTrigger.refresh(); });
    if (document.fonts && document.fonts.ready && hasGSAP) document.fonts.ready.then(() => ScrollTrigger.refresh());
  };

  /* ==========================================================================
     DATOS: máscara de tierra 360x180 (1 bit por casilla de 1 grado, base64)
     Fuente: Natural Earth 110m land (dominio público) vía world-atlas.
     ========================================================================== */
  const LAND_B64 = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH///8AAf///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB////n///////+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////7////////wAAAAA/wAADwAAAAAAP4AAAAAAAAAAAAAAAAAAAAAAAAAAA///+A////////AAAAB//wAAAAAAAAAAH8gAAAAAAAAAAAAAAAAAAAAAAAcH3H//w////////+AAAAA/mAAAAAAAAAAAAD4AAAAAAAAAAAAAAAAAAAAAA8YABwP/A////////+AAAAAPGAAAAAAAAAAAAA4AAAAAAAAAAAAAAAAAAAAAD4DB8+f+AP///////8AAAAAAAAAAAAAf4AAAAH/8AAAAAAAAAAAAAAAAAAAAAH/w83/8AAAf/////8AAAAAAAAAAAAH+AAAB////AAAB/kAAAAAAAAAAAAAAMA4AAw/8AAAH/////8AAAAAAAAAAAAeAAAAP///4AAAAAAAAAAAAAAAAAAAAf8AYe+c3gAAD/////4AAAAAAAAAAAB4AAAH/////+HwAGAAAAAAAAAAAAAAA//+4/w//wAAB/////gAAAAAAAAAAADwAHkv///////4Af4AAAAA4AABgAAAA/f/8f4///gAD/////wAAAAAAAAAAAHwAf/////////4///gAAAAAAA//gAAAAH/+A8f//8AB/////wAAAAAAB/gAAAAAfv/////////////8AAAAAB///+P//H//n+D4f+AB/////AAAAAAAf/4AAAA4f//////////////8QP4f///////////////////////////////8AAAP//9gYYAAAAAAAAAAAAAAAAAD///////////////////////////////4AAABzAAAAYAAAAAAAAAAAAAAAAAAH//////////////////////////////gAADjwAAAAgAAAAAAAAAAAAAAAAA8P//////////////////////////////AHgB+AAAAAAAAAAAAAAAAAAAAAAAAwO////////////35//gAP/wAAf8AAAD/9/////////////////////////+AEA////////////DYA/gAP/gAADAAAAH/z/////////////////////////+AAH///////////8AwwPAAD/AAAAAAAB//H/////////////////////////+AAP///////////4AA/gAAB/AAAAAAAB//H//////////////////////3P/AAAf//z////////wAA/4AAAOAAAAAAAB//D7////////////////////+A/4AAAA/7AH///////wAA/4wAAAAAAAAAAB//gb////////////////////+DwAAAAALwAA///////4AA/94AAAAAAAAAYA5+A///////////////////4AAHgAAAAADcAAD//////8AAf/8AAAAAAAAA8AA+C///////////////////wAAfgAAAAAOAAAB///////wAf/+AAAAAAAAA8AO8H///////////////////AAA/gAAAABwAAAA///////+A///AAAAAAAAAcANwH//////////////////+AAB/AAAAACAAAAAf///////z///4AAAAAAAHOAOD///////////////////+AAB+AAAAAAAAAABP///////x///8AAAAAAAPPB//////////////////////6AA8AAAAAAAAAAAD///////5///8AAAAAAAOfz//////////////////////+AA4AAAAAAAAAAAD///////9///8AAAAAAAAfn//////////////////////6AAwAAAAAAAAAAAD///////////sAAAAAAAAcf//////////////////////7AAAAAAAAAAAAAAB/////////+APAAAAAAAAD///////////////////////7AAAAAAAAAAAAAAAX/////////gfgAAAAAAAf///////////////////////yAAAAAAAAAAAAAAAf/////////gfgAAAAAAAH///////////////////////iAAAAAAAAAAAAAAAP/////////5AAAAAAAAAD//////P/x//////////////DAAAAAAAAAAAAAAAP/////////+AAAAAAAAAB/////Hf/B/////////////+AAAAAAAAAAAAAAAAP////////84AAAAAAAAAD//n/+AP+H/////////////8GAAAAAAAAAAAAAAAP////////wgAAAAAAAAH//jz/+AD+H/////////////4HwAAAAAAAAAAAAAAf////////wAAAAAAAAAH/4N4/8AB/B////////////+APAAAAAAAAAAAAAAAP////////wAAAAAAAAAH/4A+f+Ph/g////////////8AIAAAAAAAAAAAAAAAP///////+AAAAAAAAAAH/gMPfP///x///////////v4AMAAAAAAAAAAAAAAAP///////8AAAAAAAAAAH/AMCOP///h//////////+ZwAMAAAAAAAAAAAAAAAH///////4AAAAAAAAAAP/AAGHP///g//////////8B4AYAAAAAAAAAAAAAAAH///////wAAAAAAAAAAH+AAcHH///w//////////+w4A4AAAAAAAAAAAAAAAD///////wAAAAAAAAAAA0f+ACD+//////////////g8D4AAAAAAAAAAAAAAAB///////wAAAAAAAAAAAz/+AAAE//////////////A4f4AAAAAAAAAAAAAAAB///////gAAAAAAAAAAB//+AAAA//////////////Ax/gAAAAAAAAAAAAAAAAP/////+AAAAAAAAAAAD//+AAAB//////////////gD4AAAAAAAAAAAAAAAAAH/////8AAAAAAAAAAAH///4GAB//////////////gDAAAAAAAAAAAAAAAAAAH/////4AAAAAAAAAAAP///8P4z//////////////wDAAAAAAAAAAAAAAAAAACf////4AAAAAAAAAAAP/////////////////////wAAAAAAAAAAAAAAAAAAABf//zgYAAAAAAAAAAAP/////////P///////////wAAAAAAAAAAAAAAAAAAAAv//AAYAAAAAAAAAAA//////////n///////////wAAAAAAAAAAAAAAAAAAAB3/+AAcAAAAAAAAAAB///////9//j///////////gAAAAAAAAAAAAAAAAAAAAT/+AAMgAAAAAAAAAD///////8//wn//////////AAAAAAAAAAAAAAAAAAAAAJ/+AAMAAAAAAAAAAH///////+f/8b//////////AAAAAAAAAAAAAAAAAAAAAM/+AAAgAAAAAAAAAH///////+f/84Af///////+wAAAAAAAAAAAAAAAAAAAAGf8AAAAAAAAAAAAAP////////P//+AP///////4wAAAAAAAAAAAAAAAAAAAAAP8AA/AAAAAAAAAAf////////n///AH///////ggAAAAAAAAAAAAAAAAAAAAAP+A4BgAAAAAAAAAf////////n///AD//+P//8AAAAAAAAAAAAAAAAAAAAAAAP+B4A8AAAAAAAAAf////////j//+AAf/4P/+IAAAAAAAAAAAAAAAgAAAAAAAH/B4AB4AAAAAAAAf////////j//8AAf/wH/8YAAAAAAAAAAAAAAAAAAAAAAAD/nwAj5AAAAAAAAP////////x//4AAf/AD/8QAQAAAAAAAAAAAAAAAAAAAAAA//wAAAAAAAAAAAP////////4//wAAf+AD/+AA4AAAAAAAAAAAAAAAAAAAAAAP/wAAAAAAAAAAAf////////4f+AAAf8AD//AA4AAAAAAAAAAAAAAAAAAAAAAAH/AAAAAAAAAAAf////////8f8AAAP4AAP/gAwAAAAAAAAAAAAAAAAAAAAAAAD/gAAAAAAAAAAf////////+fwAAAPwAAP/gAwAAAAAAAAAAAAAAAAAAAAAAAA/gAAAAAAAAAAf/////////eAAAAPwAAP/wA8AAAAAAAAAAAAAAAAAAAAAAAAHgAAAAAAAAAAf/////////4AAAAHwAAN/gASAAAAAAAAAAAAAAAAAAAAAAAADABoAAAAAAAAP/////////g4AAAHwAAMfgALAAAAAAAAAAAAAAAAAAAAAAAADgP/eAAAAAAAH//////////4AAADwAAIPABOAAAAAAAAAAAAAAAAAAAAAAAAByP/+AAAAAAAD//////////4AAADoAAMEACBAAAAAAAAAAAAAAAAAAAAAAAAA9///AAAAAAAB//////////wAAABMAAMAAAHgAAAAAAAAAAAAAAAAAAAAAAAAM///wAAAAAAB//////////wAAAAMAAGAAAPgAAAAAAAAAAAAAAAAAAAAAAAAA///wAAAAAAAf/////////gAAAAMAADAAMDAAAAAAAAAAAAAAAAAAAAAAAAAA////gAAAAAAP/B///////gAAAAAAADgAeAAAAAAAAAAAAAAAAAAAAAAAAAAA////wAAAAAACAA///////AAAAAAABzwA+AAAAAAAAAAAAAAAAAAAAAAAAAAA////4AAAAAAAAAH/////+AAAAAAAAZwB8AAAAAAAAAAAAAAAAAAAAAAAAAAB////4AAAAAAAAAD/////8AAAAAAAANwH8AAAAAAAAAAAAAAAAAAAAAAAAAAB////8AAAAAAAAAH/////4AAAAAAAAHwf+AYAAAAAAAAAAAAAAAAAAAAAAAAD////8AAAAAAAAAH/////wAAAAAAAAHgf8+YAAAAAAAAAAAAAAAAAAAAAAAAH/////AAAAAAAAAH/////gAAAAAAAADwf9AAgAAAAAAAAAAAAAAAAAAAAAAAH/////4AAAAAAAAH/////AAAAAAAAAD4P54BxAAAAAAAAAAAAAAAAAAAAAAAH//////AAAAAAAAD////+AAAAAAAAAB8P5wA74AAAAAAAAAAAAAAAAAAAAAAH//////4AAAAAAAB////8AAAAAAAAAA8Ax4u//AIAAAAAAAAAAAAAAAAAAAAH//////+AAAAAAAB////8AAAAAAAAAAcABoAH/wYAAAAAAAAAAAAAAAAAAAAH///////gAAAAAAA////4AAAAAAAAAAMABIAA/xyAAAAAAAAAAAAAAAAAAAAH///////gAAAAAAA////4AAAAAAAAAAHkAAAI/9BAAAAAAAAAAAAAAAAAAAAD///////wAAAAAAAf///4AAAAAAAAAAB+AAAA/8AAAAAAAAAAAAAAAAAAAAAB///////gAAAAAAAf///4AAAAAAAAAAADmpgAvMAAAAAAAAAAAAAAAAAAAAAB///////gAAAAAAAf///8AAAAAAAAAAAABiAAAHACAAAAAAAAAAAAAAAAAAAA///////AAAAAAAAf///8AAAAAAAAAAAAAAAAABgBAAAAAAAAAAAAAAAAAAAA//////+AAAAAAAAf///+AAAAAAAAAAAAAAAgCAAAAAAAAAAAAAAAAAAAAAAAf/////8AAAAAAAAf///+AQAAAAAAAAAAAAB+DAAAAAAAAAAAAAAAAAAAAAAAf/////8AAAAAAAA////+AwAAAAAAAAAAAAD8HAAAAAAAAAAAAAAAAAAAAAAAP/////4AAAAAAAA////+AwAAAAAAAAAAAB38HgAAAAAAAAAAAAAAAAAAAAAAH/////4AAAAAAAA////+DwAAAAAAAAAAAD/+HwAADAA/////////////////////////////////////////////////////3/////6AAAAAAAAAAAAAAAAAA/////4AAAAAAAB////wPwAAAAAAAAAAAP///wAAAAGAAAAAAAAAAAAAAAAAAf////4AAAAAAAA////gPgAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAAAP////wAAAAAAAAf//+APgAAAAAAAAAAAf///8AAAAAAAAAAAAAAAAAAAAAAAP////wAAAAAAAAf//+APgAAAAAAAAAAH////+AAIAAAAAAAAAAAAAAAAAAAAP////gAAAAAAAAP//+AfAAAAAAAAAAAf/////AAGAAAAAAAAAAAAAAAAAAAAP////AAAAAAAAAP///AfAAAAAAAAAAA//////gAAAAAAAAAAAAAAAAAAAAAAf///4AAAAAAAAAP///AfAAAAAAAAAAA//////gAAAAAAAAAAAAAAAAAAAAAAf///gAAAAAAAAAP//+AOAAAAAAAAAAB//////wAAAAAAAAAAAAAAAAAAAAAAf///AAAAAAAAAAP//4AEAAAAAAAAAAA//////4AAAAAAAAAAAAAAAAAAAAAAf///AAAAAAAAAAH//4AAAAAAAAAAAAB//////4AAAAAAAAAAAAAAAAAAAAAAf///AAAAAAAAAAH//4AAAAAAAAAAAAA//////4AAAAAAAAAAAAAAAAAAAAAAf//+AAAAAAAAAAD//wAAAAAAAAAAAAA//////8AAAAAAAAAAAAAAAAAAAAAA///8AAAAAAAAAAB//wAAAAAAAAAAAAAf/////8AAAAAAAAAAAAAAAAAAAAAA///8AAAAAAAAAAB//gAAAAAAAAAAAAAf/////4AAAAAAAAAAAAAAAAAAAAAA///4AAAAAAAAAAA//AAAAAAAAAAAAAAf/////4AAAAAAAAAAAAAAAAAAAAAA///wAAAAAAAAAAA/+AAAAAAAAAAAAAAP/AP//4AAAAAAAAAAAAAAAAAAAAAA///gAAAAAAAAAAA/4AAAAAAAAAAAAAAf8AH//wAAAAAAAAAAAAAAAAAAAAAA///AAAAAAAAAAAAcAAAAAAAAAAAAAAAfAAF//gAAAAAAAAAAAAAAAAAAAAAB//4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//gAABgAAAAAAAAAAAAAAAAAB//4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/AAAAgAAAAAAAAAAAAAAAAAD//4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/AAAAwAAAAAAAAAAAAAAAAAD//wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADYAAAA+AAAAAAAAAAAAAAAAAB/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4AAAAAAAAAAAAAAAAAD/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYAAAAAAAAAAAAAAAAAD/gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAAADQAAAAAAAAAAAAAAAAAH/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcAAAHAAAAAAAAAAAAAAAAAAB/gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAOAAAAAAAAAAAAAAAAAAD/gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4AAAAAAAAAAAAAAAAAAH+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4AAAAAAAAAAAAAAAAAAH+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAAAAH/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+AAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH4AwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4AAAAAAAAAAAAAAAAAAH8AAAAGAB4P4Pz+AAAAAAAAAAAAAAAAAAAAAAAAADgAAAAAAAAAAAAAAAAAB//jAAH//////////wAAAAAAAAAAAAAAAAAAAAAAADgAAAAAAAAAAAAAAACA////8Af///////////gAAAAAAAAAAAAAAAAAAAAAA74AAAAAAAAAAAAAAAP3////8D/////////////4AAAAAAAAAAAAAAAAAAAAA/8AAAAAAAAAAB+/////////4f//////////////wAAAAAAAAAAAAAAAAAAAH9+AAAAAAAAf////////////4////////////////4AAAAAAAAAAAAAA8AAAAz+AAAAAAAB//////////////////////////////4AAAAAAAAAADAAB///nj/+AAAAAAAP//////////////////////////////wAAAAAAAA////4Af/////8AAAAAAAP/////////////////////////////8AAAAAAAD/////////////gAAAAAAD//////////////////////////////wAAAAAAAP////////////wAAAAAAf///////////////////////////////wAAAAAD/////////////4AAAAAAD////////////////////////////////wAAAABx/////////////AAAAD8A/////////////////////////////////+AAAAAwD////////////gAAAH+A+///////////////////////////////+AAAAAAAAH////////////gfA/4AA///////////////////////////////+AAAAAAAf//////////////4ADA//////////////////////////////////AAAAAAAH///////////////h////////////////////////////////////4AAAAAAH/////////////////////////////////////////////////////gAAWD///////////////////////////////////////////////////////0AAAAAB8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
