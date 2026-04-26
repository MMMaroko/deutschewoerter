# DE Vocab Trainer

>> Completely prompted - this is not a controller for fuel rods in a nuclear power plant.

Offline German vocabulary trainer for **A1 / A2** level, with translations into **Slovak** and **English**. Pure HTML/CSS/JS, no build step. Designed to be hosted on GitHub Pages or any static host, then installed as a PWA for offline use on phone and desktop.

## File structure

```
index.html      Page shell + all CSS + head <script> stub (error handler, App stub)
data.js         window.VOCAB_LEVELS = { A1: {...}, A2: {...} }; window.VOCAB_VERSION
app.js          IIFE that populates window.App methods (called by inline onclick)
sw.js           Service worker — caches app shell for offline use
manifest.json   PWA manifest (used for "Add to Home Screen")
icon.svg        App icon
```

## Local testing

Open `index.html` directly in a browser via `file://` works on **desktop** but not reliably on Android (Chrome blocks sibling JS file loads from file:// origins). Use a tiny local server instead:

```bash
# from inside the project directory:
python -m http.server 8000
# then open http://localhost:8000
```

## Deploy to GitHub Pages

1. Create a public repo on GitHub, e.g. `deutschewoerter`.
2. Commit and push the contents of this directory to the repo's `main` branch.
   ```bash
   git init
   git add .
   git commit -m "initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/deutschewoerter.git
   git push -u origin main
   ```
3. On the repo page → **Settings → Pages** → *Source*: `Deploy from a branch` → *Branch*: `main` / `/ (root)` → **Save**.
4. Wait ~1 minute. Pages prints a URL like `https://<your-username>.github.io/deutschewoerter/`.
5. Open the URL in any browser. On phone Safari/Chrome → *Share → Add to Home Screen* — the service worker installs and the app is fully offline-capable from then on.

## Updating the deployed app

Edit any file (most likely `data.js`), commit, and push. GitHub Pages re-deploys in ~30 s.

The service worker uses a versioned cache — bump `CACHE = 'a2vocab-vN'` in `sw.js` whenever you push a meaningful change. The `controllerchange` listener in `index.html` forces one automatic page reload as soon as the new SW takes control, so users always see the latest data without manually refreshing.

## How the app works (short)

- **Level switch** A1 / A2 — picks which dataset to learn from.
- **Word type** — Nouns by category, Verbs by category, All nouns/verbs, Adjectives, Adverbs.
- **Show first** — German first or Slovak/English first; the other side is hidden until you tap.
- **Start learning** — random word from the chosen pool, no repeats until the pool is exhausted, then reshuffles.
- **Review list** — all entries in the chosen pool listed as a 3-column DE/SK/EN reference table.
- **Nouns** — colored by gender (m=blue, f=red, n=green, p=yellow plural), with plural ending appended (`die Wahrheit - en`). Genuinely uncountable nouns show `der Lärm —`. Identical-plural nouns (`Lehrer`, `Mädchen`, etc.) show no suffix.
- **Verbs** — Partizip II shown beneath the verb (`h. erzählt`, `s. gegangen`). Separable verbs marked with the dot (`ein·laden`).
- **Kursbuch entries** — words pulled from the Hueber Menschen A2 Kursbuch wordlist and AI-translated are flagged with a small note above the card and a `KB` superscript in the review list.

## Database

`data.js` contains `VOCAB_VERSION` (currently `2026-04-26`). Bump it whenever the data changes; the diag bar reads it on load so you know which version your phone has cached.
