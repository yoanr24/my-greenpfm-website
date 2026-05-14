# Green PFM II — Feasibility Study Website

Static, password-gated single-page website presenting the AFD Green PFM Phase II feasibility study mission findings (Rwanda, May 2026).

---

## File structure

```
/index.html           ← Single-page app (all tabs, CSS, JS)
/fonts/               ← Marianne font files (optional — currently loaded from CDN)
/data/
  agenda.json         ← Mission meetings (online / in_person / post_mission)
  donors.json         ← Donor mapping (2 institutions, interventions, DP coordination)
  dlis.json           ← 13 DLI cards with scoring, rationale, TA, timelines
  resources.json      ← 36 curated bibliography entries (5 sections)
  notes/              ← Drop PDF meeting notes here (see below)
```

---

## Access

**Password:** `greenpfm2026`

> The JS gate is a friction layer only — not a security layer. For production, also enable platform-level protection (see deployment below).

---

## Deploy on Vercel (recommended)

1. Push this folder to a GitHub repository.
2. Go to [vercel.com](https://vercel.com) → **New Project** → import the repo.
3. Click **Deploy** (no build settings needed — it's a static site).
4. For true password protection, add **Vercel Password Protection**:
   - Go to Project Settings → Security → Password Protection.
   - Set a password (this requires a Vercel Pro plan).
5. Share the Vercel URL with your team.

---

## Deploy on Netlify

1. Go to [netlify.com](https://netlify.com) → **Sites** → **Add new site** → **Deploy manually**.
2. Drag and drop this entire folder onto the upload area.
3. For password protection:
   - Go to Site configuration → Access control → Password protection.
   - Requires Netlify Pro plan.

---

## Update data — day-to-day workflow

All content is driven by the four JSON files in `/data/`. Edit them directly (or via the Excel templates if using `regenerate_json.py`), then redeploy.

### Agenda updates
Edit `data/agenda.json`. The three arrays are:
- `online` — preparatory online meetings
- `in_person` — Kigali in-person meetings
- `post_mission` — post-mission follow-up (currently empty)

### Add a meeting note PDF
1. Export the meeting note as a PDF.
2. Drop the PDF file into `data/notes/` — e.g. `Meeting_Notes_BNR_Strategy.pdf`.
3. In `data/agenda.json`, find the corresponding meeting entry and set:
   ```json
   "note_pdf": "Meeting_Notes_BNR_Strategy.pdf"
   ```
4. Redeploy. The "⬇ Download meeting notes (PDF)" button will now appear when the card is expanded.

### Update a DLI
Edit the relevant entry in `data/dlis.json`. All fields are rendered faithfully — no code changes needed.

### Add a resource
Add an object to the appropriate section array in `data/resources.json`. Set `"access": "public"` and provide a `"url"` to show the "Open ↗" button. Leave `"url": ""` or omit for internal documents.

---

## Marianne font

The site loads Marianne (French Republic typeface) from the official DSFR CDN:
```
https://unpkg.com/@gouvfr/dsfr@1.14.4/dist/fonts/
```
If you want to self-host the fonts (for offline use or faster loading):

1. Download the `.woff2` and `.woff` files from:
   https://github.com/GouvernementFR/dsfr/tree/main/public/fonts
2. Place them in `/fonts/`:
   - `Marianne-Regular.woff2` / `Marianne-Regular.woff`
   - `Marianne-Medium.woff2` / `Marianne-Medium.woff`
   - `Marianne-Bold.woff2` / `Marianne-Bold.woff`
3. In `index.html`, update the `@font-face` `src:` URLs to point to `/fonts/Marianne-Regular.woff2` etc.

---

## Security note

The JS SHA-256 password gate prevents casual access but is **not** a security layer — the hash is visible to anyone with browser DevTools. For a genuinely confidential deployment, enable platform-level password protection (Vercel or Netlify, as described above) in addition to the JS gate.
