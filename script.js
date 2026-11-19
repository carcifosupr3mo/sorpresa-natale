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
  unlockDate: "2026-12-25T00:00:00+01:00",

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
    unlockedTitle: "Buon Natale!",
    unlockedMessage: "È arrivato il momento…\nHo pensato a una cosa per noi due: scaricala qui sotto.",
    buttonText: "Scarica il tuo regalo",
    viewText: "Non parte il download? Aprilo nel browser",
  },

  // Il PDF viene CREATO dal telefono solo allo sblocco: sul server non esiste nessun file
  // da scoprire in anticipo. Modifica qui sotto il contenuto.
  pdf: {
    fileName: "Il-Tuo-Biglietto-di-Natale.pdf",
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
  $("unlockedTitle").textContent = T.unlockedTitle;
  $("unlockedMessage").textContent = T.unlockedMessage;
  $("pdfDownload").textContent = T.buttonText;
  $("pdfView").textContent = T.viewText;

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


  /* ---------- Generatore PDF (nessuna libreria, nessun file sul server) ---------- */
  function buildPdf(P) {
    const W = 595, H = 842, c = [];
    const f = (n) => +n.toFixed(2);
    const rgb = (h) => [1, 3, 5].map((i) => f(parseInt(h.substr(i, 2), 16) / 255)).join(" ");
    const fill = (h) => c.push(rgb(h) + " rg");
    const stroke = (h, w) => c.push(rgb(h) + " RG " + w + " w");
    const FONTS = {
      F1: ["Helvetica", "normal", "Helvetica, Arial, sans-serif"],
      F3: ["Times-Italic", "italic", "'Times New Roman', Times, serif"],
      F4: ["Times-Bold", "bold", "'Times New Roman', Times, serif"],
      F5: ["Times-BoldItalic", "italic bold", "'Times New Roman', Times, serif"],
    };
    // Codifica WinAnsi (accenti italiani ok): niente caratteri oltre Latin-1
    const latin1 = (t) => String(t)
      .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
      .replace(/[–—]/g, "-").replace(/…/g, "...")
      .replace(/[^\x00-\xFF]/g, "?");
    const esc = (t) => t.replace(/([\\()])/g, "\\$1");
    const mctx = document.createElement("canvas").getContext("2d");
    const measure = (t, font, size) => {
      mctx.font = `${FONTS[font][1]} ${size}px ${FONTS[font][2]}`;
      return mctx.measureText(t).width;
    };
    const text = (t, x, y, font, size, color, align) => {
      t = latin1(t);
      const w = measure(t, font, size);
      const x0 = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
      c.push(`BT /${font} ${size} Tf ${rgb(color)} rg ${f(x0)} ${f(y)} Td (${esc(t)}) Tj ET`);
      return w;
    };
    const wrap = (t, font, size, maxW) => {
      const out = []; let line = "";
      for (const w of latin1(t).split(/\s+/)) {
        const test = line ? line + " " + w : w;
        if (line && measure(test, font, size) > maxW) { out.push(line); line = w; } else line = test;
      }
      if (line) out.push(line);
      return out;
    };

    /* --- forme --- */
    const K = 0.5523;
    const circle = (x, y, r) => c.push(
      `${f(x + r)} ${f(y)} m ${f(x + r)} ${f(y + K * r)} ${f(x + K * r)} ${f(y + r)} ${f(x)} ${f(y + r)} c ` +
      `${f(x - K * r)} ${f(y + r)} ${f(x - r)} ${f(y + K * r)} ${f(x - r)} ${f(y)} c ` +
      `${f(x - r)} ${f(y - K * r)} ${f(x - K * r)} ${f(y - r)} ${f(x)} ${f(y - r)} c ` +
      `${f(x + K * r)} ${f(y - r)} ${f(x + r)} ${f(y - K * r)} ${f(x + r)} ${f(y)} c h`);
    const roundRect = (x, y, w, h, r) => {
      const k = r * K;
      c.push(`${x + r} ${y} m ${x + w - r} ${y} l ${x + w - r + k} ${y} ${x + w} ${y + r - k} ${x + w} ${y + r} c ` +
        `${x + w} ${y + h - r} l ${x + w} ${y + h - r + k} ${x + w - r + k} ${y + h} ${x + w - r} ${y + h} c ` +
        `${x + r} ${y + h} l ${x + r - k} ${y + h} ${x} ${y + h - r + k} ${x} ${y + h - r} c ` +
        `${x} ${y + r} l ${x} ${y + r - k} ${x + r - k} ${y} ${x + r} ${y} c h`);
    };
    const poly = (pts) => c.push(pts.map((p, i) => `${f(p[0])} ${f(p[1])} ${i ? "l" : "m"}`).join(" ") + " h");
    const star = (cx, cy, R, r, n) => poly(Array.from({ length: n * 2 }, (_, i) => {
      const a = Math.PI / 2 + (i * Math.PI) / n, rad = i % 2 ? r : R;
      return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad];
    }));
    const heart = (cx, cy, s, color) => {
      fill(color);
      c.push(`${f(cx)} ${f(cy - s)} m ${f(cx - s * 1.25)} ${f(cy - s * 0.1)} ${f(cx - s * 0.95)} ${f(cy + s * 0.95)} ${f(cx)} ${f(cy + s * 0.45)} c ` +
             `${f(cx + s * 0.95)} ${f(cy + s * 0.95)} ${f(cx + s * 1.25)} ${f(cy - s * 0.1)} ${f(cx)} ${f(cy - s)} c f`);
    };
    const snowflake = (cx, cy, r, color) => {
      stroke(color, 0.9);
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI) / 3;
        c.push(`${f(cx - Math.cos(a) * r)} ${f(cy - Math.sin(a) * r)} m ${f(cx + Math.cos(a) * r)} ${f(cy + Math.sin(a) * r)} l S`);
      }
    };
    // foglia di agrifoglio ruotata
    const leaf = (x, y, len, ang, color) => {
      const w = len * 0.32, a = (ang * Math.PI) / 180, co = f(Math.cos(a)), si = f(Math.sin(a));
      fill(color);
      c.push(`q ${co} ${si} ${-si} ${co} ${f(x)} ${f(y)} cm 0 0 m ${f(len * .25)} ${f(w)} ${f(len * .7)} ${f(w * 1.1)} ${f(len)} 0 c ` +
             `${f(len * .7)} ${f(-w * 1.1)} ${f(len * .25)} ${f(-w)} 0 0 c f Q`);
    };
    const holly = (x, y, s, ang) => {
      leaf(x, y, 46 * s, ang + 25, "#2f7d4f");
      leaf(x, y, 46 * s, ang - 25, "#256a42");
      leaf(x, y, 40 * s, ang + 90, "#2f7d4f");
      fill("#c0283a"); circle(x, y, 5.2 * s); c.push("f");
      circle(x + 7 * s, y + 3 * s, 4.6 * s); c.push("f");
      circle(x + 2 * s, y - 7 * s, 4.6 * s); c.push("f");
      fill("#ff9aa2"); circle(x - 1.5 * s, y + 1.5 * s, 1.4 * s); c.push("f");
    };
    const bauble = (x, cy, r, color, light) => {
      stroke("#d9b46a", 0.9); c.push(`${x} 792 m ${x} ${f(cy + r + 6)} l S`);
      fill("#d9b46a"); c.push(`${f(x - 4)} ${f(cy + r)} 8 6 re f`);
      fill(color); circle(x, cy, r); c.push("f");
      fill(light); circle(x - r * 0.32, cy + r * 0.34, r * 0.22); c.push("f");
      stroke("#f2c27b", 1.2); c.push(`${f(x - r * 0.93)} ${f(cy - r * 0.2)} m ${f(x - r * 0.4)} ${f(cy - r * 0.55)} ${f(x + r * 0.4)} ${f(cy - r * 0.55)} ${f(x + r * 0.93)} ${f(cy - r * 0.2)} c S`);
    };
    const tree = (x, base, h, wd) => {
      fill("#8a5a3a"); c.push(`${f(x - 3)} ${f(base)} 6 ${f(h * 0.14)} re f`);
      [["#1f6b43", 0, 0.55, 1], ["#2a8355", 0.28, 0.45, 0.78], ["#35996a", 0.52, 0.36, 0.55]].forEach(([col, off, th, ws]) => {
        fill(col);
        const y0 = base + h * 0.12 + h * off, hh = h * (th + 0.1);
        poly([[x - wd * ws, y0], [x + wd * ws, y0], [x, y0 + hh]]); c.push("f");
      });
      fill("#f2c27b"); star(x, base + h + 3, 7, 3, 5); c.push("f");
      fill("#c0283a"); circle(x - wd * 0.28, base + h * 0.3, 2.4); c.push("f");
      fill("#f2c27b"); circle(x + wd * 0.3, base + h * 0.2, 2.4); c.push("f");
    };

    const WINE = "#5b0f1d", RED = "#b3243a", GOLD = "#d9a94f", GOLDL = "#f2c27b", PAPER = "#fff8ee", INK = "#4a1a22";

    /* --- sfondo bordeaux con fiocchi di neve --- */
    fill(WINE); c.push(`0 0 ${W} ${H} re f`);
    [[24, 60], [26, 200], [22, 330], [28, 470], [24, 610], [26, 760], [571, 120], [569, 260], [572, 400], [568, 540], [571, 690], [570, 810],
     [120, 24], [300, 20], [470, 24], [160, 820], [340, 822], [500, 818]]
      .forEach(([x, y]) => snowflake(x, y, 6, "#e8b8c0"));

    /* --- biglietto crema con doppia cornice dorata --- */
    fill(PAPER); roundRect(50, 50, W - 100, H - 100, 22); c.push("f");
    stroke(GOLD, 1.8); roundRect(50, 50, W - 100, H - 100, 22); c.push("S");
    stroke(GOLD, 0.6); roundRect(62, 62, W - 124, H - 124, 15); c.push("S");
    [[110, 690], [485, 160], [480, 700], [120, 150], [300, 560], [215, 275], [390, 280]]
      .forEach(([x, y]) => snowflake(x, y, 5, "#dfe6ee"));

    /* --- decorazioni: agrifoglio negli angoli, palline appese --- */
    holly(88, 750, 1.05, -35); holly(507, 750, 1.05, 215);
    holly(88, 118, 1, 35);     holly(507, 118, 1, 145);
    bauble(235, 735, 17, RED, "#ff8d9a");
    bauble(298, 712, 24, "#2a8355", "#7fd1a3");
    bauble(360, 738, 15, "#d9a94f", "#ffe9b0");

    /* --- titolo --- */
    text(P.title, W / 2, 628, "F5", 60, WINE, "center");
    text(P.to, W / 2, 582, "F5", 34, RED, "center");
    heart(W / 2 - 98, 592, 7, RED); heart(W / 2 + 98, 592, 7, RED);
    stroke(GOLD, 1); c.push(`150 556 m ${W / 2 - 14} 556 l S ${W / 2 + 14} 556 m ${W - 150} 556 l S`);
    fill(GOLD); star(W / 2, 556, 7, 3, 5); c.push("f");

    /* --- messaggio --- */
    let y = 514;
    for (const para of P.paragraphs) {
      for (const ln of wrap(para, "F3", 18.5, 410)) { text(ln, W / 2, y, "F3", 18.5, INK, "center"); y -= 26; }
      y -= 12;
    }
    y -= 10;
    for (const ln of wrap(P.closing, "F5", 31, 390)) { text(ln, W / 2, y, "F5", 31, RED, "center"); y -= 38; }
    heart(W / 2, y - 4, 13, RED);

    /* --- paesaggio innevato in fondo --- */
    fill("#dde6f0"); c.push(`76 70 m 76 86 l 160 ${95} 260 ${80} 340 ${88} c 420 ${96} 490 ${84} ${W - 76} 88 c ${W - 76} 70 l h f`);
    tree(150, 88, 56, 22); tree(215, 90, 74, 28); tree(298, 92, 92, 33); tree(381, 90, 70, 27); tree(446, 88, 52, 21);

    /* --- assemblaggio PDF --- */
    const stream = c.join("\n");
    const fontIds = ["F1", "F3", "F4", "F5"];
    const objs = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [7 0 R] /Count 1 >>",
      ...fontIds.map((k) => `<< /Type /Font /Subtype /Type1 /BaseFont /${FONTS[k][0]} /Encoding /WinAnsiEncoding >>`),
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Contents 8 0 R /Resources << /Font << ` +
        fontIds.map((k, i) => `/${k} ${i + 3} 0 R`).join(" ") + " >> >> >>",
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    ];
    let out = "%PDF-1.4\n"; const offs = [];
    objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
    const xref = out.length;
    out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` +
      offs.map((o) => String(o).padStart(10, "0") + " 00000 n \n").join("") +
      `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    const bytes = new Uint8Array(out.length);
    for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 255;
    return new Blob([bytes], { type: "application/pdf" });
  }

  /* ---------- Stati ---------- */
  const lockedEl = $("locked"), unlockedEl = $("unlocked");
  let unlocked = false, timer = null;

  function unlock(animated) {
    if (unlocked) return;
    unlocked = true;
    clearTimeout(timer);
    // Il PDF nasce solo adesso, direttamente sul telefono
    try {
      const url = URL.createObjectURL(buildPdf(CONFIG.pdf));
      const dl = $("pdfDownload"), vw = $("pdfView");
      dl.href = url; dl.setAttribute("download", CONFIG.pdf.fileName);
      vw.href = url;
    } catch (e) { console.error("PDF non generato", e); $("pdfDownload").hidden = $("pdfView").hidden = true; }
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
