# PSYCHE.OS v3 · Monochrome Point Cloud

School counsellor case management console. Local-first, pure black, white point cloud, thin HUD typography. No build step. No backend. Open and run.

## Run it
Open `index.html` through a local server (the seed roster loads via `fetch`, which needs http, not `file://`):

    python3 -m http.server 8000

Then visit http://localhost:8000 . First screen is the boot landing, then login, then the console.

## Deploy
Pure static, so any host works.
- Netlify: drag this folder (or a zip of it) onto the Deploys tab. No plugins, so the Next.js conflict that blocked v2 does not apply here.
- GitHub Pages: push the folder to a repo and enable Pages on the branch root.

## What is fully working
- Students CRUD with the v2 schema, search, status and class filters
- Profile with tabs: overview, sessions, assessments, risk
- Session capture
- PHQ-9, GAD-7, SDQ runner with exact v2 scoring bands
- Risk register and 15 safeguarding flags
- Dashboard stats with GSAP count-up, recent records, class distribution
- Printable confidential case summary (5P, deliberately light and serif for paper)
- Local JSON storage with automatic v2 migration (reads the old `psycheos_data` key)
- Audit log, JSON/CSV export, JSON restore, settings
- Offline heuristic helpers (formulation, summary, risk read) that never leave the device
- PWA: installable, offline app shell via service worker

## Scaffolded extension points (not reimplemented this pass)
These exist as clean seams in the code, not finished features: at-rest key-wrapping encryption, the full MSE narrative and 5P formulation editor, parent meeting module, treatment goals, and the Google Sheets assessment import. `AI.remote()` in `js/ai.js` is the hook for a real model and stays off unless a key is set, so nothing is sent anywhere by default.

## Notes
- Login is a local session gate, not real cryptography. The first passphrase you enter becomes the local passphrase.
- Fonts load from Google Fonts. Drop Inter and JetBrains Mono `.woff2` into `assets/fonts/` for full offline typography.
- Student ID format: PSY-YYYY-NNNN, current cohort PSY-2627-XXXX.
