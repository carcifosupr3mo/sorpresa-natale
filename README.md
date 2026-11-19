# Conto alla rovescia di Natale 🎄

Pagina statica a tema natalizio con un mega timer che arriva alla mezzanotte del 25 dicembre.
HTML + CSS + JS vanilla: nessuna dipendenza, nessun build step. Pensata per iPhone e per il browser in-app di WhatsApp.

```
index.html   struttura + meta tag (anteprima WhatsApp)
style.css    stile
script.js    CONFIG in cima + logica
```

Dopo mezzanotte compare il messaggio di Natale con i coriandoli e il pulsante **Scarica il tuo regalo**.
Il PDF (buono per 2 ore di SPA) **non è un file sul server**: viene generato dal telefono solo allo sblocco, quindi nessuno può scoprirne l'URL in anticipo.
Non ci sono scorciatoie di test per sbloccare la pagina prima.

Nota: il testo del regalo sta in `script.js`, quindi chi apre "vedi sorgente" del sito lo potrebbe leggere. Per una persona che apre il link da WhatsApp non è un problema reale.

## Configurazione

Apri `script.js`: tutto è nell'oggetto `CONFIG` in cima.

| Campo | Cosa fa |
|---|---|
| `unlockDate` | Data ISO con fuso: `"2026-12-25T00:00:00+01:00"` (inverno `+01:00`) |
| `startDate` | Da quando parte la barra di progresso |
| `ambientEffect` | `"snow"`, `"stars"` oppure `"none"` |
| `useServerTime` | `true`: usa l'ora del server, così cambiare l'orologio del telefono non anticipa nulla |
| `texts` | Testi della pagina (titolo, messaggio di Natale, pulsante). `\n` = a capo |
| `pdf` | Contenuto del PDF: titolo, "2 ORE", dettagli, messaggio, firma, nome del file |

Per vedere lo stato finale in locale, cambia temporaneamente `unlockDate` con una data passata (e rimettila prima del deploy).

## Deploy

**GitHub:** crea un repo (anche privato) e fai push.

**Vercel:** Add New → Project → importa il repo. Framework: *Other*, build command e output directory vuoti → Deploy.

**Cloudflare Pages:** Workers & Pages → Create → Pages → Connect to Git. Build command vuoto, output directory `/`.

## Anteprima WhatsApp

`og:title`, `og:description` e `theme-color` sono già misteriosi e senza spoiler. WhatsApp mette l'anteprima in cache: se cambi i testi, invia il link con `?v=2`.
Per un'immagine, carica un `og.jpg` (circa 1200×630) e decommenta `og:image` in `index.html` con l'URL assoluto.
