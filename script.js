/* ==========================================================
   Conto alla rovescia di Natale: logica
   Vanilla JS, zero dipendenze.
   ========================================================== */

/* ----------------------------------------------------------
   CONFIG: modifica SOLO questo blocco per personalizzare.
   ---------------------------------------------------------- */
const CONFIG = {
  // Data e ora di sblocco, formato ISO con fuso orario.
  //   Inverno (CET): "+01:00"  ->  25 dicembre a mezzanotte = "2026-12-25T00:00:00+01:00"
  // TEMPORANEO (anteprima su telefono): data nel passato = pagina già sbloccata. RIPRISTINARE a "2026-12-25T00:00:00+01:00" prima di mandare il link!
  unlockDate: "2026-11-01T00:00:00+01:00",

  // Da quando "parte" la barra di progresso (di solito il giorno in cui invii il link).
  startDate: "2026-11-19T00:00:00+01:00",

  // Effetto di sfondo: "snow" (neve leggera) | "stars" (particelle dorate) | "none"
  ambientEffect: "snow",

  // Usa l'ora del server invece di quella del telefono, così cambiare l'orologio
  // del dispositivo non anticipa lo sblocco. (Se offline, usa l'ora del telefono.)
  useServerTime: true,

  // Tutti i testi. "\n" = a capo.
  texts: {
    lockedTitle: "Manca poco a Natale…",
    lockedSubtitle: "Qualcosa di speciale ti aspetta.\nTorna a mezzanotte del 25 dicembre!",
    unlockPrefix: "Si sblocca il",          // + "25 dicembre alle 00:00"
  },

  // Il biglietto che compare dopo la mezzanotte del 25 dicembre.
  card: {
    title: "Buon Natale",
    to: "amore mio",
    paragraphs: [
      "Ogni giorno con te è un regalo, ma a Natale volevo regalarti qualcosa di speciale: del tempo, tutto nostro, solo per noi due.",
      "Quando farai la valigia per la nostra vacanza, ricordati di mettere dentro costume, ciabatte e asciugamano: ci aspettano 2 ore di spa privata, tutta per noi, lontano da tutto.",
    ],
    closing: "Ti amo sempre di più.",
  },
};

/* ----------------------------------------------------------
   Da qui in poi non serve modificare nulla.
   ---------------------------------------------------------- */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const endMs = new Date(CONFIG.unlockDate).getTime();
  let startMs = new Date(CONFIG.startDate).getTime();
  if (!Number.isFinite(endMs)) throw new Error("CONFIG.unlockDate non valida: " + CONFIG.unlockDate);
  if (!Number.isFinite(startMs) || startMs >= endMs) startMs = endMs - 30 * 86400000;

  /* ---------- Ora affidabile ---------- */
  let clockOffset = 0;                       // ora server - ora telefono
  const nowMs = () => Date.now() + clockOffset;

  function syncClock() {
    if (!CONFIG.useServerTime || !window.fetch) return Promise.resolve();
    const ctl = window.AbortController ? new AbortController() : null;
    const to = setTimeout(() => ctl && ctl.abort(), 2500);
    const t0 = Date.now();
    return fetch(location.pathname + "?_=" + t0, { method: "HEAD", cache: "no-store", signal: ctl && ctl.signal })
      .then((res) => {
        const h = res.headers.get("date");
        const server = h ? new Date(h).getTime() : NaN;
        if (Number.isFinite(server)) clockOffset = server - (t0 + Date.now()) / 2;
      })
      .catch(() => {})                       // file:// o offline: si usa l'ora del telefono
      .then(() => clearTimeout(to));
  }

  /* ---------- Testi ---------- */
  const T = CONFIG.texts;
  $("lockedTitle").textContent = T.lockedTitle;
  $("lockedSubtitle").textContent = T.lockedSubtitle;
  const C = CONFIG.card;
  $("cardTitle").textContent = C.title;
  $("cardTo").textContent = C.to;
  $("cardClosing").textContent = C.closing;
  C.paragraphs.forEach((t) => { const p = document.createElement("p"); p.textContent = t; $("cardText").appendChild(p); });

  // "Si sblocca il 25 dicembre alle 00:00" (sempre in ora italiana)
  (function () {
    const p = new Intl.DateTimeFormat("it-IT", {
      timeZone: "Europe/Rome", day: "numeric", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date(endMs)).reduce((a, x) => ((a[x.type] = x.value), a), {});
    const thisYear = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", year: "numeric" }).format(new Date());
    $("unlockLabel").textContent =
      `${T.unlockPrefix} ${p.day} ${p.month}${p.year !== thisYear ? " " + p.year : ""} alle ${p.hour}:${p.minute}`;
  })();

  /* ---------- Luci di Natale ---------- */
  (function () {
    const box = $("lights");
    const colors = ["#ff5a5f", "#ffd978", "#4fd18b", "#6ab7ff"];
    const n = Math.max(8, Math.min(18, Math.floor(window.innerWidth / 26)));
    for (let i = 0; i < n; i++) {
      const b = document.createElement("i");
      b.className = "bulb";
      b.style.setProperty("--c", colors[i % colors.length]);
      b.style.setProperty("--d", ((i * 0.37) % 2.4).toFixed(2) + "s");
      box.appendChild(b);
    }
  })();

  /* ---------- Countdown ---------- */
  const el = { d: $("cd-days"), h: $("cd-hours"), m: $("cd-minutes"), s: $("cd-seconds"), bar: $("progressBar") };
  const last = {};
  const pad = (n) => String(n).padStart(2, "0");
  const setText = (k, v) => { if (last[k] !== v) { last[k] = v; el[k].textContent = v; } };

  function render(remaining) {
    const total = Math.max(0, Math.ceil(remaining / 1000));
    setText("d", pad(Math.floor(total / 86400)));
    setText("h", pad(Math.floor((total % 86400) / 3600)));
    setText("m", pad(Math.floor((total % 3600) / 60)));
    setText("s", pad(total % 60));
    const pct = Math.min(100, Math.max(0, ((nowMs() - startMs) / (endMs - startMs)) * 100));
    el.bar.style.width = pct.toFixed(2) + "%";
  }


  /* ---------- Stati ---------- */
  const lockedEl = $("locked"), unlockedEl = $("unlocked");
  let unlocked = false, timer = null;

  function unlock(animated) {
    if (unlocked) return;
    unlocked = true;
    clearTimeout(timer);
    const show = () => {
      lockedEl.hidden = true;
      unlockedEl.hidden = false;
      if (animated && !reduceMotion) {
        unlockedEl.classList.add("entering");
        void unlockedEl.offsetWidth;         // reflow: fa partire la transizione
        unlockedEl.classList.remove("entering");
      }
      startConfetti();
    };
    if (animated && !reduceMotion) { lockedEl.classList.add("leaving"); setTimeout(show, 650); }
    else show();
  }

  function tick() {
    const remaining = endMs - nowMs();
    if (remaining <= 0) { render(0); unlock(true); return; }
    render(remaining);
    timer = setTimeout(tick, (remaining % 1000) + 20);   // riallinea allo scatto del secondo
  }

  /* ---------- Canvas ---------- */
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  function fitCanvas(c) {
    const w = window.innerWidth, h = window.innerHeight;
    c.width = Math.round(w * DPR); c.height = Math.round(h * DPR);
    const ctx = c.getContext("2d"); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    return { ctx, w, h };
  }

  /* ---------- Sfondo ambientale (neve / stelle) ---------- */
  const fxCanvas = $("fx");
  let fx = null, flakes = [], fxRunning = false, fxLast = 0;

  function newParticle(snow, anywhere) {
    return {
      x: Math.random() * fx.w,
      y: anywhere ? Math.random() * fx.h : (snow ? -10 : fx.h + 10),
      r: snow ? 1 + Math.random() * 2.4 : 0.6 + Math.random() * 1.6,
      vy: snow ? 14 + Math.random() * 26 : -(3 + Math.random() * 8),
      sway: 8 + Math.random() * 16,
      ph: Math.random() * 6.28,
      tw: 0.6 + Math.random() * 1.4,
    };
  }

  function initAmbient() {
    const mode = CONFIG.ambientEffect;
    if (reduceMotion || (mode !== "snow" && mode !== "stars")) { fxCanvas.style.display = "none"; return; }
    fx = fitCanvas(fxCanvas);
    const count = Math.min(70, Math.round((fx.w * fx.h) / 14000));   // poche particelle: batteria
    flakes = Array.from({ length: count }, () => newParticle(mode === "snow", true));
    startAmbient();
  }

  function drawAmbient(ts) {
    if (!fxRunning) return;
    requestAnimationFrame(drawAmbient);
    if (ts - fxLast < 33) return;                        // ~30 fps bastano
    const dt = Math.min((ts - fxLast) / 1000, 0.1); fxLast = ts;
    const snow = CONFIG.ambientEffect === "snow", ctx = fx.ctx;
    ctx.clearRect(0, 0, fx.w, fx.h);
    for (const p of flakes) {
      p.ph += dt * p.tw; p.y += p.vy * dt; p.x += Math.sin(p.ph) * p.sway * dt;
      if (snow && p.y > fx.h + 10) Object.assign(p, newParticle(true, false));
      if (!snow && p.y < -10) { p.y = fx.h + 10; p.x = Math.random() * fx.w; }
      if (p.x < -10) p.x = fx.w + 10; else if (p.x > fx.w + 10) p.x = -10;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832);
      if (snow) ctx.fillStyle = "rgba(255,255,255,.75)";
      else {
        ctx.fillStyle = `rgba(255,214,140,${(0.25 + 0.65 * (0.5 + 0.5 * Math.sin(p.ph * 2))).toFixed(2)})`;
        ctx.shadowColor = "rgba(255,200,110,.8)"; ctx.shadowBlur = 6;
      }
      ctx.fill(); ctx.shadowBlur = 0;
    }
  }
  function startAmbient() { if (!fxRunning) { fxRunning = true; fxLast = performance.now(); requestAnimationFrame(drawAmbient); } }

  /* ---------- Coriandoli (allo scadere) ---------- */
  const COLORS = ["#ffe2a8", "#f2c27b", "#ff5a5f", "#4fd18b", "#fff6ec", "#d6303f"];
  const CF_SPAWN_MS = 2600, CF_MAX_MS = 7500;

  function startConfetti() {
    if (reduceMotion) return;
    const cf = fitCanvas($("confetti")), bits = [];
    const spawn = (n) => {
      for (let i = 0; i < n; i++) {
        const left = i % 2 === 0;
        const ang = (left ? -62 : -118) * Math.PI / 180 + (Math.random() - .5) * .6;
        const sp = 420 + Math.random() * 520;
        bits.push({ x: cf.w * (left ? .08 : .92), y: cf.h * .72, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
          w: 5 + Math.random() * 6, h: 3 + Math.random() * 5, rot: Math.random() * 6.28, vr: (Math.random() - .5) * 12,
          c: COLORS[(Math.random() * COLORS.length) | 0], round: Math.random() < .25 });
      }
    };
    const burst = Math.min(90, Math.round(cf.w / 5));
    spawn(burst);
    const t0 = performance.now(); let prev = t0, second = false;
    requestAnimationFrame(function loop(ts) {
      const dt = Math.min((ts - prev) / 1000, 0.05); prev = ts;
      const el = ts - t0, ctx = cf.ctx;
      if (!second && el > 900) { second = true; spawn(Math.round(burst * .6)); }
      ctx.clearRect(0, 0, cf.w, cf.h);
      ctx.globalAlpha = el > CF_MAX_MS - 1200 ? Math.max(0, (CF_MAX_MS - el) / 1200) : 1;   // fine morbida
      let alive = 0;
      for (const b of bits) {
        b.vy += 520 * dt; b.vx *= 1 - .9 * dt; b.vy *= 1 - .55 * dt;
        b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.vr * dt;
        if (b.y > cf.h + 20) continue;
        alive++;
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot); ctx.fillStyle = b.c;
        if (b.round) { ctx.beginPath(); ctx.arc(0, 0, b.w / 2.2, 0, 6.2832); ctx.fill(); }
        else ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      if (el > CF_MAX_MS || (el > CF_SPAWN_MS && !alive)) { ctx.clearRect(0, 0, cf.w, cf.h); return; }
      requestAnimationFrame(loop);
    });
  }

  /* ---------- Avvio ---------- */
  initAmbient();
  syncClock().then(() => {
    if (endMs <= nowMs()) unlock(false);     // pagina aperta dopo la data: sbloccata subito
    else tick();
  });

  // Dopo la sospensione di Safari/WhatsApp riallinea subito il timer
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { fxRunning = false; return; }
    if (fx) startAmbient();
    if (!unlocked && last.s !== undefined) { clearTimeout(timer); tick(); }
  });

  let rz;
  window.addEventListener("resize", () => {
    clearTimeout(rz);
    rz = setTimeout(() => { if (fx) fx = fitCanvas(fxCanvas); }, 200);
  });
})();
