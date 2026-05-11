# Green PFM Phase II — Feasibility Study Website

Single-page mission report for the AFD Green PFM Phase II Feasibility Study, Rwanda (May 2026).  
Author: Yoan Raih, consultant · Expertise France.

---

## File structure

```
/index.html           — main app (HTML + CSS + JS, single file)
/data/
  donors.json         — donor mapping data (map + matrix)
  dlis.json           — 11 DLI cards (Policy Reform Matrix)
  resources.json      — 36 bibliography entries
  agenda.json         — mission agenda (online + in-person meetings)
/dsfr-v1.14.4/        — DSFR design system (local, no CDN)
```

---

## Password

Default password: `greenpfm2026`

The JS gate validates against a SHA-256 hash and uses `sessionStorage` to persist the session within the browser tab. **This is a friction layer, not a security layer.** Always pair with platform-level protection in production (see below).

---

## Deploying on Vercel

```bash
npm i -g vercel   # install Vercel CLI if needed
cd my-greenpfm-website
vercel deploy
```

**Enable true password protection:**  
Vercel Pro / Enterprise plans support native Password Protection.  
Go to: Project → Settings → Deployment Protection → Enable Password Protection.  
This adds HTTP Basic Auth before the JS even loads.

---

## Deploying on Netlify

1. Drag and drop the `my-greenpfm-website/` folder onto [app.netlify.com](https://app.netlify.com).
2. Or use the CLI:
   ```bash
   npm i -g netlify-cli
   cd my-greenpfm-website
   netlify deploy --prod
   ```

**Enable true password protection:**  
Netlify Pro plan: Site settings → Access control → Password protection.  
Adds a server-side gate before any content is served.

---

## Security note

The client-side SHA-256 password gate in `index.html` prevents casual access by requiring a password before rendering the page. It does **not** prevent a determined user from reading the source code or JSON files directly. For an internal AFD / Expertise France audience behind a Vercel or Netlify password gate, this layered approach is appropriate. Do not use this site to share classified or legally sensitive material.

---

## Editing content

All content is data-driven:

| What to edit | File |
|---|---|
| DLI cards (trigger, rationale, scoring, budget) | `data/dlis.json` |
| Donor mapping (institutions, interventions, coordination) | `data/donors.json` |
| Bibliography | `data/resources.json` |
| Mission agenda | `data/agenda.json` |

No build step required — edit JSON, save, refresh browser.
