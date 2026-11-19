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
    fileName: "Il-Tuo-Regalo-di-Natale.pdf",
    title: "Buon Natale",
    subtitle: "un regalo pensato per noi due",
    voucherLabel: "BUONO REGALO",
    big: "2 ORE",
    bigSub: "per noi due, nella SPA",
    details: [
      "Lunedì 28 dicembre, dalle 17:30 alle 19:30, in esclusiva all'Hotel Lessinia di Bosco Chiesanuova.",
      "Sauna, bagno vapore, vasca idromassaggio, pediluvio, docce emozionali e zona tisane.",
      "Prima, però, ci aspetta un'altra sorpresa che resterà un segreto fino all'arrivo.",
    ],
    message:
      "Amore, quest'anno volevo regalarci qualcosa che non si può incartare: del tempo, solo per noi due. " +
      "Due ore di calma, di calore e di niente a cui pensare, tutte nostre. Prima ci aspetta una piccola sorpresa, " +
      "poi la SPA, io e te, senza fretta. " +
      "Grazie di essere il regalo più bello che ho.",
    signature: "Con tutto il mio amore",
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
    const W = 595, H = 842;
    const pages = [];                     // { c: [operatori], annots: [{rect, url}] }
    let pg = null, c = null;
    const f = (n) => +n.toFixed(2);
    const rgb = (h) => [1, 3, 5].map((i) => f(parseInt(h.substr(i, 2), 16) / 255)).join(" ");
    const fill = (h) => c.push(rgb(h) + " rg");
    const stroke = (h, w) => c.push(rgb(h) + " RG " + w + " w");
    const FONTS = {
      F1: ["Helvetica", "normal", "Helvetica, Arial, sans-serif"],
      F2: ["Helvetica-Bold", "bold", "Helvetica, Arial, sans-serif"],
      F3: ["Times-Italic", "italic", "'Times New Roman', Times, serif"],
      F4: ["Times-Bold", "bold", "'Times New Roman', Times, serif"],
    };
    // Codifica WinAnsi (accenti italiani ok): niente caratteri oltre Latin-1
    const latin1 = (t) => String(t)
      .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
      .replace(/[–—]/g, "-").replace(/…/g, "...")
      .replace(/[^\x00-\xFF\u20AC]/g, "?");
    const esc = (t) => t.replace(/([\\()])/g, "\\$1");
    const mctx = document.createElement("canvas").getContext("2d");
    const measure = (t, font, size, tc) => {
      const [, style, fam] = FONTS[font];
      mctx.font = `${style} ${size}px ${fam}`;
      return mctx.measureText(t).width + (tc || 0) * t.length;
    };
    const text = (t, x, y, font, size, color, align, tc) => {
      t = latin1(t);
      const w = measure(t, font, size, tc);
      const x0 = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
      c.push(`BT /${font} ${size} Tf ${rgb(color)} rg ${tc || 0} Tc ${f(x0)} ${f(y)} Td (${esc(t.replace(/\u20AC/g, "\x80"))}) Tj ET`);
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
    const poly = (pts) => c.push(pts.map((p, i) => `${f(p[0])} ${f(p[1])} ${i ? "l" : "m"}`).join(" ") + " h");
    const star = (cx, cy, R, r, n) => poly(Array.from({ length: n * 2 }, (_, i) => {
      const a = Math.PI / 2 + (i * Math.PI) / n, rad = i % 2 ? r : R;
      return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad];
    }));
    const roundRect = (x, y, w, h, r) => {
      const k = r * 0.5523;
      c.push(`${x + r} ${y} m ${x + w - r} ${y} l ${x + w - r + k} ${y} ${x + w} ${y + r - k} ${x + w} ${y + r} c ` +
        `${x + w} ${y + h - r} l ${x + w} ${y + h - r + k} ${x + w - r + k} ${y + h} ${x + w - r} ${y + h} c ` +
        `${x + r} ${y + h} l ${x + r - k} ${y + h} ${x} ${y + h - r + k} ${x} ${y + h - r} c ` +
        `${x} ${y + r} l ${x} ${y + r - k} ${x + r - k} ${y} ${x + r} ${y} c h`);
    };
    const link = (x, y, w, h, url) => pg.annots.push({ rect: [x, y, x + w, y + h], url });

    const GREEN = "#0d1a14", RED = "#c0283a", GOLD = "#f2c27b", GOLDS = "#ffe2a8", CREAM = "#fff6ec", DARK = "#1c3a2a", WINE = "#3b0f16";

    function newPage(first) {
      pg = { c: [], annots: [] }; c = pg.c; pages.push(pg);
      fill(GREEN); c.push(`0 0 ${W} ${H} re f`);
      if (first) { fill(WINE); c.push(`0 0 ${W} 110 re f`); }
      stroke(GOLD, 1.6); c.push(`26 26 ${W - 52} ${H - 52} re S`);
      stroke(GOLD, 0.5); c.push(`34 34 ${W - 68} ${H - 68} re S`);
      fill(GOLD);
      (first ? [[80, 790, 7], [515, 782, 5], [62, 600, 4], [535, 640, 6], [74, 190, 5], [525, 200, 7], [300, 62, 4]]
             : [[80, 800, 5], [515, 800, 5]])
        .forEach(([x, y, s]) => { star(x, y, s, s * 0.28, 4); c.push("f"); });
    }

    /* ----- Pagina 1: il regalo ----- */
    newPage(true);
    fill(GOLD); star(W / 2, 772, 17, 7, 5); c.push("f");
    text(P.title, W / 2, 692, "F4", 54, GOLDS, "center");
    text(P.subtitle, W / 2, 660, "F3", 19, CREAM, "center");

    const cx = 70, cw = W - 140, ch = 322, cy = 640 - 20 - ch;
    fill(CREAM); roundRect(cx, cy, cw, ch, 16); c.push("f");
    fill(RED); c.push("q"); roundRect(cx, cy, cw, ch, 16); c.push("W n");
    c.push(`${cx} ${cy + ch - 40} ${cw} 40 re f Q`);
    stroke(GOLD, 2); roundRect(cx, cy, cw, ch, 16); c.push("S");
    text(P.voucherLabel, W / 2, cy + ch - 26, "F2", 13, CREAM, "center", 4);
    text(P.big, W / 2, cy + ch - 118, "F4", 76, RED, "center");
    text(P.bigSub, W / 2, cy + ch - 152, "F3", 24, DARK, "center");
    stroke(GOLD, 1);
    c.push(`${cx + 40} ${cy + ch - 172} m ${W / 2 - 12} ${cy + ch - 172} l S`);
    c.push(`${W / 2 + 12} ${cy + ch - 172} m ${cx + cw - 40} ${cy + ch - 172} l S`);
    fill(GOLD); star(W / 2, cy + ch - 172, 6, 6 * 0.3, 4); c.push("f");
    let y = cy + ch - 196;
    for (const para of P.details) {
      for (const ln of wrap(para, "F1", 12, cw - 60)) { text(ln, W / 2, y, "F1", 12, DARK, "center"); y -= 16.5; }
      y -= 5;
    }

    y = cy - 34;
    for (const ln of wrap(P.message, "F3", 15.5, 410)) { text(ln, W / 2, y, "F3", 15.5, CREAM, "center"); y -= 22; }
    y -= 12;
    text(P.signature, W / 2, y, "F3", 22, GOLD, "center");
    fill(GOLD); star(W / 2, y - 26, 7, 3, 5); c.push("f");

    /* ----- Pagine successive: programma e spese ----- */
    if (P.itinerary || P.costs) newPage(false);
    y = 742;
    const ensure = (h) => { if (y - h < 62) { newPage(false); y = 780; } };
    const X_T = 60, X_L = 140, X_D = 156, MAXW = 372;

    for (const day of P.itinerary || []) {
      ensure(120);
      text(day.day, W / 2, y, "F4", 26, GOLDS, "center");
      text(day.subtitle, W / 2, y - 20, "F3", 15, CREAM, "center");
      y -= 52;
      for (const r of day.rows) {
        const lines = wrap(r.d, "F1", 11, MAXW);
        const h = lines.length * 15 + (r.url ? 15 : 0);
        ensure(h + 19);
        stroke("#6b5a3a", 1); c.push(`${X_L} ${f(y + 13)} m ${X_L} ${f(y - h - 1)} l S`);   // linea del tempo
        if (r.hl) {
          fill(WINE); stroke(GOLD, 1);
          roundRect(46, f(y - h + 3), W - 92, h + 14, 8); c.push("B");
        }
        fill(r.hl ? GOLD : "#8fd4a8"); star(X_L, y + 3.5, 3.6, 1.6, 4); c.push("f");
        text(r.t, X_T, y, "F2", 10.5, GOLD);
        lines.forEach((ln, i) => text(ln, X_D, y - i * 15, r.hl ? "F2" : "F1", 11, CREAM));
        if (r.url) {
          const w = text(r.urlLabel, X_D, y - lines.length * 15, "F1", 10.5, GOLD);
          stroke(GOLD, 0.6); c.push(`${X_D} ${f(y - lines.length * 15 - 2)} m ${f(X_D + w)} ${f(y - lines.length * 15 - 2)} l S`);
          link(X_D, y - lines.length * 15 - 3, w, 13, r.url);
        }
        y -= h + 19;
      }
      y -= 16;
    }

    // Riepilogo spese (pagina dedicata)
    const K = P.costs;
    if (K) {
    newPage(false); y = 690;
    fill(GOLD); star(W / 2, 770, 15, 6, 5); c.push("f");
    text("Riepilogo spese", W / 2, y, "F4", 34, GOLDS, "center");
    text(K.subtitle, W / 2, y - 24, "F3", 17, CREAM, "center");
    y -= 76;
    for (const [label, amount, url] of K.rows) {
      const lines = wrap(label, "F1", 13, 320);
      lines.forEach((ln, i) => text(ln, 64, y - i * 17, "F1", 13, CREAM));
      text(amount, W - 64, y, "F2", 14, GOLD, "right");
      if (url) { link(64, y - 15, 300, 17, url); }
      stroke("#6b5a3a", 0.6);
      const by = y - (lines.length - 1) * 17 - 12;
      c.push(`64 ${f(by)} m ${W - 64} ${f(by)} l S`);
      y = by - 26;
    }
    y -= 6;
    fill(CREAM); roundRect(64, y - 86, W - 128, 100, 16); c.push("f");
    stroke(GOLD, 2); roundRect(64, y - 86, W - 128, 100, 16); c.push("S");
    text("TOTALE", 88, y - 22, "F2", 12, RED, "left", 4);
    text(K.total, W - 88, y - 40, "F4", 40, RED, "right");
    text(K.perPerson, 88, y - 68, "F3", 18, DARK, "left");
    y -= 130;
    for (const ln of wrap(K.note, "F3", 16, 380)) { text(ln, W / 2, y, "F3", 16, CREAM, "center"); y -= 23; }
    fill(GOLD); star(W / 2, y - 14, 9, 4, 5); c.push("f");
    }

    // Assemblaggio PDF
    const objs = [];
    const add = (s) => objs.push(s);
    add("<< /Type /Catalog /Pages 2 0 R >>");
    add(null);                                         // Pages: riempito dopo
    ["F1", "F2", "F3", "F4"].forEach((k) =>
      add(`<< /Type /Font /Subtype /Type1 /BaseFont /${FONTS[k][0]} /Encoding /WinAnsiEncoding >>`));
    const kids = [];
    for (const p of pages) {
      const annotIds = p.annots.map((a) => add(
        `<< /Type /Annot /Subtype /Link /Rect [${a.rect.map(f).join(" ")}] /Border [0 0 0] /A << /S /URI /URI (${esc(latin1(a.url))}) >> >>`));
      const stream = p.c.join("\n");
      const cid = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
      const annots = annotIds.length ? ` /Annots [${annotIds.map((i) => i + " 0 R").join(" ")}]` : "";
      kids.push(add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Contents ${cid} 0 R` +
        ` /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R /F4 6 0 R >> >>${annots} >>`));
    }
    objs[1] = `<< /Type /Pages /Kids [${kids.map((k) => k + " 0 R").join(" ")}] /Count ${kids.length} >>`;

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
