# Sorpresa di Natale 🎁

Pagina statica con conto alla rovescia che sblocca un PDF a una data e ora precise.
HTML + CSS + JS vanilla: nessuna dipendenza, nessun build step. Pensata per iPhone / browser in-app di WhatsApp.

```
index.html   struttura + meta tag (anteprima WhatsApp)
style.css    stile
script.js    CONFIG in cima + logica
sorpresa.pdf PDF di prova: SOSTITUISCILO con il tuo
```

## 1. Configurazione

Apri `script.js`: tutto ciò che serve è nell'oggetto `CONFIG` in cima.

| Campo | Cosa fa |
|---|---|
| `unlockDate` | Data di sblocco ISO con fuso: `"2026-12-25T00:00:00+01:00"` (inverno `+01:00`, estate `+02:00`) |
| `startDate` | Da quando parte la barra di progresso (di solito il giorno in cui invii il link) |
| `pdfUrl` | Percorso del PDF (stessa cartella di `index.html`) |
| `pdfDownloadName` | Nome del file quando viene scaricato |
| `ambientEffect` | `"snow"`, `"stars"` oppure `"none"` |
| `texts` | Tutti i testi (titolo, dedica, messaggio sbloccato, pulsante…). `\n` = a capo |

Poi:
1. Metti il tuo PDF nella cartella (sovrascrivi `sorpresa.pdf` o cambia `pdfUrl`).
2. Modifica titolo/descrizione dell'anteprima in `index.html` (`og:title`, `og:description`).

## 2. Test

Apri la pagina in locale (doppio clic su `index.html`, oppure `python3 -m http.server`) e prova:

- `index.html?test=1` → stato **sbloccato** subito (con coriandoli e pulsante PDF)
- `index.html?countdown=10` → conto alla rovescia finto di 10 secondi, poi la transizione reale

Controlla anche con l'ora vera: dopo `unlockDate` la pagina si apre direttamente sbloccata.

## 3. Deploy

### GitHub (repo privato)
```bash
git init && git add . && git commit -m "Sorpresa"
git branch -M main
git remote add origin git@github.com:TUO-UTENTE/sorpresa-natale.git
git push -u origin main
```

### Vercel
1. [vercel.com](https://vercel.com) → **Add New → Project** → importa il repo privato.
2. Framework Preset: **Other**. Build command e Output directory: lascia vuoti.
3. **Deploy**. Il link è `https://nome-progetto.vercel.app`.

### Cloudflare Pages
1. Dashboard → **Workers & Pages → Create → Pages → Connect to Git** → scegli il repo.
2. Build command: vuoto. Output directory: `/`.
3. **Save and Deploy**.

(GitHub Pages funziona, ma su repo privato richiede un piano a pagamento.)

## 4. Anteprima WhatsApp

- `og:title`, `og:description` e `theme-color` sono già misteriosi e senza spoiler.
- WhatsApp mette l'anteprima in cache: dopo aver cambiato i testi, invia il link con un parametro diverso (es. `?v=2`).
- Immagine opzionale: crea un `og.jpg` (circa 1200×630), caricalo e decommenta il tag `og:image` in `index.html` con l'**URL assoluto**.

## 5. Nota onesta sulla sicurezza

Il sito è statico: **il blocco è solo lato interfaccia**. Chi conosce l'URL del PDF (o cambia l'orologio del telefono) può aprirlo prima.
Per ridurre il rischio:
- dai al PDF un nome non indovinabile (`regalo-x7k2q9.pdf`) e aggiorna `pdfUrl`;
- il link al PDF non è nel markup iniziale: viene collegato da JS solo allo sblocco;
- la pagina ha `noindex`, quindi i motori di ricerca non la mostrano.

Per un blocco vero servirebbe un server che verifichi l'ora prima di servire il file (es. una funzione serverless): possibile, ma esce dal "solo statico".
