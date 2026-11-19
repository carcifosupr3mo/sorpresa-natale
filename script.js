/* ==========================================================
   Sorpresa di Natale: logica
   Vanilla JS, zero dipendenze.
   ========================================================== */

/* ----------------------------------------------------------
   CONFIG: modifica SOLO questo blocco per personalizzare.
   ---------------------------------------------------------- */
const CONFIG = {
  // Data e ora di sblocco, formato ISO con fuso orario.
  //   Inverno (CET):  "+01:00"   ->  "2026-12-25T00:00:00+01:00"
  //   Estate (CEST):  "+02:00"   ->  "2026-07-15T18:30:00+02:00"
  unlockDate: "2026-12-25T00:00:00+01:00",

  // Da quando "parte" la barra di progresso (di solito il giorno in cui invii il link).
  // Se lasci vuoto "", la barra parte dal momento in cui apri la pagina la prima volta.
  startDate: "2026-11-19T00:00:00+01:00",

  // Percorso del PDF (file nella stessa cartella di index.html).
  // Consiglio: dagli un nome poco indovinabile, es. "regalo-x7k2q9.pdf" (vedi README).
  pdfUrl: "sorpresa.pdf",

  // Nome del file quando viene scaricato.
  pdfDownloadName: "Il-Tuo-Regalo.pdf",

  // Effetto di sfondo: "snow" (neve leggera) | "stars" (particelle dorate) | "none"
  ambientEffect: "snow",

  // Tutti i testi. "\n" = a capo.
  texts: {
    lockedTitle: "Qualcosa ti sta aspettando",
    lockedSubtitle: "Ho preparato una cosa per te.\nPer ora è ancora ben chiusa…",
    unlockPrefix: "Si sblocca il",          // + "25 dicembre alle 00:00"
    unlockedTitle: "Buon Natale, amore mio!",
    unlockedMessage:
      "Eccolo, il tuo regalo.\nÈ pensato con tutto il cuore, spero ti faccia sorridere.",
    buttonText: "Apri il tuo regalo",
    downloadText: "Problemi con l'anteprima? Scarica il PDF",
  },
};

/* ----------------------------------------------------------
   Da qui in poi non serve modificare nulla.
   ---------------------------------------------------------- */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Modalità di test ---------- */
  const TEST_UNLOCKED = params.get("test") === "1";
  const fakeSeconds = parseInt(params.get("countdown"), 10);
  const FAKE_COUNTDOWN = Number.isFinite(fakeSeconds) && fakeSeconds > 0;

  const now0 = Date.now();
  let endMs = new Date(CONFIG.unlockDate).getTime();
  let startMs = CONFIG.startDate ? new Date(CONFIG.startDate).getTime() : now0;

  if (FAKE_COUNTDOWN) {                 // ?countdown=N -> N secondi da adesso
    endMs = now0 + fakeSeconds * 1000;
    startMs = now0;
  }
  if (!Number.isFinite(endMs)) {
    console.error("CONFIG.unlockDate non valida:", CONFIG.unlockDate);
    endMs = now0 + 1000;
  }
  if (!(startMs < endMs)) startMs = endMs - 24 * 3600 * 1000;

  /* ---------- Testi ---------- */
  const T = CONFIG.texts;
  $("lockedTitle").textContent = T.lockedTitle;
  $("lockedSubtitle").textContent = T.lockedSubtitle;
  $("unlockedTitle").textContent = T.unlockedTitle;
  $("unlockedMessage").textContent = T.unlockedMessage;
  $("pdfOpen").textContent = T.buttonText;
  $("pdfDownload").textContent = T.downloadText;

  // "Si sblocca il 25 dicembre alle 00:00" (sempre in ora italiana, anche se il telefono è altrove)
  function formatUnlockLabel(ms) {
    const d = new Date(ms);
    const parts = new Intl.DateTimeFormat("it-IT", {
      timeZone: "Europe/Rome", day: "numeric", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(d).reduce((a, p) => ((a[p.type] = p.value), a), {});
    const thisYear = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", year: "numeric" }).format(new Date());
    const year = parts.year !== thisYear ? " " + parts.year : "";
    return `${T.unlockPrefix} ${parts.day} ${parts.month}${year} alle ${parts.hour}:${parts.minute}`;
  }
  $("unlockLabel").textContent = FAKE_COUNTDOWN
    ? `${T.unlockPrefix} tra ${fakeSeconds} secondi (modalità test)`
    : formatUnlockLabel(endMs);

  /* ---------- Countdown ---------- */
  const el = {
    d: $("cd-days"), h: $("cd-hours"), m: $("cd-minutes"), s: $("cd-seconds"),
    bar: $("progressBar"),
  };
  const last = { d: "", h: "", m: "", s: "" };
  const pad = (n) => String(n).padStart(2, "0");
  function setText(key, value) {        // aggiorna il DOM solo se cambia
    if (last[key] !== value) { last[key] = value; el[key].textContent = value; }
  }

  function render(remainingMs) {
    const total = Math.max(0, Math.ceil(remainingMs / 1000));
    setText("d", pad(Math.floor(total / 86400)));
    setText("h", pad(Math.floor((total % 86400) / 3600)));
    setText("m", pad(Math.floor((total % 3600) / 60)));
    setText("s", pad(total % 60));
    const pct = Math.min(100, Math.max(0, ((Date.now() - startMs) / (endMs - startMs)) * 100));
    el.bar.style.width = pct.toFixed(2) + "%";
  }

  /* ---------- Stati ---------- */
  const lockedEl = $("locked");
  const unlockedEl = $("unlocked");
  let unlocked = false;
  let timer = null;

  function unlock(animated) {
    if (unlocked) return;
    unlocked = true;
    clearTimeout(timer);

    // Il PDF viene collegato solo ora: il link non è nel markup iniziale.
    $("pdfOpen").href = CONFIG.pdfUrl;
    $("pdfDownload").href = CONFIG.pdfUrl;
    $("pdfDownload").setAttribute("download", CONFIG.pdfDownloadName);

    const show = () => {
      lockedEl.hidden = true;
      unlockedEl.hidden = false;
      if (animated && !reduceMotion) {
        unlockedEl.classList.add("entering");
        void unlockedEl.offsetWidth;    // forza reflow per far partire la transizione
        unlockedEl.classList.remove("entering");
      }
      startConfetti();
    };

    if (animated && !reduceMotion) {
      lockedEl.classList.add("leaving");
      setTimeout(show, 650);
    } else {
      show();
    }
  }

  function tick() {
    const remaining = endMs - Date.now();
    if (remaining <= 0) { render(0); unlock(true); return; }
    render(remaining);
    // Riallinea al prossimo scatto del secondo (i timer su iPhone possono derivare)
    timer = setTimeout(tick, (remaining % 1000) + 20);
  }

  /* ---------- Canvas: utilità ---------- */
  const DPR = Math.min(window.devicePixelRatio || 1, 2);   // limita il carico GPU
  function fitCanvas(c) {
    const w = window.innerWidth, h = window.innerHeight;
    c.width = Math.round(w * DPR); c.height = Math.round(h * DPR);
    return { ctx: c.getContext("2d"), w, h };
  }

  /* ---------- Effetto ambientale (neve / stelle) ---------- */
  const fxCanvas = $("fx");
  let fx = null, flakes = [], fxRunning = false, fxLast = 0;

  function initAmbient() {
    const mode = CONFIG.ambientEffect;
    if (reduceMotion || (mode !== "snow" && mode !== "stars")) { fxCanvas.style.display = "none"; return; }
    fx = fitCanvas(fxCanvas);
    fx.ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    // Poche particelle: proporzionate all'area, con tetto basso per la batteria
    const count = Math.min(70, Math.round((fx.w * fx.h) / 14000));
    flakes = Array.from({ length: count }, () => newParticle(mode, true));
    startAmbient();
  }

  function newParticle(mode, anywhere) {
    const snow = mode === "snow";
    return {
      x: Math.random() * fx.w,
      y: anywhere ? Math.random() * fx.h : (snow ? -10 : Math.random() * fx.h),
      r: snow ? 1 + Math.random() * 2.4 : 0.6 + Math.random() * 1.6,
      vy: snow ? 14 + Math.random() * 26 : -(3 + Math.random() * 8),   // px/s
      sway: 8 + Math.random() * 16,
      ph: Math.random() * Math.PI * 2,
      tw: 0.6 + Math.random() * 1.4,                                   // velocità scintillio
    };
  }

  function drawAmbient(ts) {
    if (!fxRunning) return;
    requestAnimationFrame(drawAmbient);
    if (ts - fxLast < 33) return;                       // ~30 fps bastano e risparmiano batteria
    const dt = Math.min((ts - fxLast) / 1000, 0.1); fxLast = ts;
    const snow = CONFIG.ambientEffect === "snow";
    const ctx = fx.ctx;
    ctx.clearRect(0, 0, fx.w, fx.h);
    for (const p of flakes) {
      p.ph += dt * p.tw;
      p.y += p.vy * dt;
      p.x += Math.sin(p.ph) * p.sway * dt;
      if (snow && p.y > fx.h + 10) Object.assign(p, newParticle("snow", false));
      if (!snow && p.y < -10) { p.y = fx.h + 10; p.x = Math.random() * fx.w; }
      if (p.x < -10) p.x = fx.w + 10; else if (p.x > fx.w + 10) p.x = -10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 6.2832);
      if (snow) {
        ctx.fillStyle = "rgba(255,255,255,.75)";
      } else {
        const a = 0.25 + 0.65 * (0.5 + 0.5 * Math.sin(p.ph * 2));
        ctx.fillStyle = `rgba(255,214,140,${a.toFixed(2)})`;
        ctx.shadowColor = "rgba(255,200,110,.8)"; ctx.shadowBlur = 6;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
  function startAmbient() { if (!fxRunning) { fxRunning = true; fxLast = performance.now(); requestAnimationFrame(drawAmbient); } }
  function stopAmbient() { fxRunning = false; }

  /* ---------- Coriandoli (sblocco) ---------- */
  const cfCanvas = $("confetti");
  const COLORS = ["#ffe2a8", "#f2c27b", "#ff8f7a", "#ffb4a2", "#fff6ec", "#e5989b"];
  let cf = null, bits = [], cfRunning = false, cfLast = 0, cfStart = 0;
  const CF_SPAWN_MS = 2600, CF_MAX_MS = 7500;

  function spawnConfetti(n) {
    for (let i = 0; i < n; i++) {
      const fromLeft = i % 2 === 0;
      const ang = (fromLeft ? -62 : -118) * Math.PI / 180 + (Math.random() - .5) * .6;
      const speed = 420 + Math.random() * 520;
      bits.push({
        x: fromLeft ? cf.w * 0.08 : cf.w * 0.92,
        y: cf.h * 0.72,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        w: 5 + Math.random() * 6, h: 3 + Math.random() * 5,
        rot: Math.random() * 6.28, vr: (Math.random() - .5) * 12,
        c: COLORS[(Math.random() * COLORS.length) | 0],
        round: Math.random() < 0.25,
      });
    }
  }

  function startConfetti() {
    if (reduceMotion) return;
    cf = fitCanvas(cfCanvas);
    cf.ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    bits = [];
    const burst = Math.min(90, Math.round(cf.w / 5));
    spawnConfetti(burst);
    cfStart = cfLast = performance.now();
    cfRunning = true;
    let spawned2 = false;
    requestAnimationFrame(function loop(ts) {
      if (!cfRunning) return;
      const dt = Math.min((ts - cfLast) / 1000, 0.05); cfLast = ts;
      const elapsed = ts - cfStart;
      if (!spawned2 && elapsed > 900) { spawned2 = true; spawnConfetti(Math.round(burst * 0.6)); }
      const ctx = cf.ctx;
      ctx.clearRect(0, 0, cf.w, cf.h);
      // dissolvenza finale dolce
      const fade = elapsed > CF_MAX_MS - 1200 ? Math.max(0, (CF_MAX_MS - elapsed) / 1200) : 1;
      ctx.globalAlpha = fade;
      let alive = 0;
      for (const b of bits) {
        b.vy += 520 * dt;                       // gravità
        b.vx *= 1 - 0.9 * dt; b.vy *= 1 - 0.55 * dt;   // attrito: caduta morbida
        b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.vr * dt;
        if (b.y > cf.h + 20) continue;
        alive++;
        ctx.save();
        ctx.translate(b.x, b.y); ctx.rotate(b.rot);
        ctx.fillStyle = b.c;
        if (b.round) { ctx.beginPath(); ctx.arc(0, 0, b.w / 2.2, 0, 6.2832); ctx.fill(); }
        else ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      if (elapsed > CF_MAX_MS || (elapsed > CF_SPAWN_MS && alive === 0)) {
        cfRunning = false; ctx.clearRect(0, 0, cf.w, cf.h); return;
      }
      requestAnimationFrame(loop);
    });
  }

  /* ---------- Avvio ---------- */
  if (TEST_UNLOCKED || endMs <= Date.now()) {
    unlock(false);                         // pagina aperta dopo la data (o ?test=1): stato sbloccato subito
  } else {
    render(endMs - Date.now());
    tick();
    initAmbient();
  }

  // Sfondo ambientale anche nello stato sbloccato (più discreto), tranne se disattivato
  if (unlocked) initAmbient();

  // Risparmio batteria + precisione: in background ferma l'animazione, al ritorno riallinea
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { stopAmbient(); return; }
    if (fx && fxCanvas.style.display !== "none") startAmbient();
    if (!unlocked) { clearTimeout(timer); tick(); }
  });

  // Rotazione schermo / resize (la barra Safari cambia l'altezza): ridimensiona i canvas
  let rz;
  window.addEventListener("resize", () => {
    clearTimeout(rz);
    rz = setTimeout(() => {
      if (fx) { const keep = flakes; fx = fitCanvas(fxCanvas); fx.ctx.setTransform(DPR, 0, 0, DPR, 0, 0); flakes = keep; }
    }, 200);
  });
})();
