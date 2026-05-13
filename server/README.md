# cPanel deploy (Node.js 18)

This `server/` folder is a **standalone Express host** for deploying the
compiled SPA to cPanel. It does NOT replace the TanStack Start app used in
Lovable — the two coexist:

| Concern                          | Where it runs                          |
| -------------------------------- | -------------------------------------- |
| Dashboard / app UI (SPA)         | cPanel (this Express server)           |
| QR redirects `/q/:id`, `/r/:id`  | Lovable deployment (Cloudflare Worker) |
| Tenant resolution by Host        | Lovable deployment                     |
| Scan tracking (`record_qr_scan`) | Lovable deployment                     |
| Supabase (DB / auth)             | Supabase (unchanged)                   |

QRs continue to be generated against your Lovable production domain (or the
tenant's verified `custom_domain`), so scanning a code still hits a real
server-side `302` — that's required for scanner compatibility and analytics.

## Build & deploy

1. Locally (or in cPanel's Node app shell):

   ```bash
   npm install
   npm run build           # produces ./dist
   ```

2. Upload to cPanel:
   - the entire repo (or at least: `dist/`, `server/`, `package.json`, `package-lock.json` / `bun.lockb`)

3. In cPanel → **Setup Node.js App**:
   - Node.js version: **18**
   - Application root: project root
   - Application startup file: `server/index.js`
   - Run `npm install` from the cPanel UI
   - Start command: `npm start`

4. Environment variables to set in cPanel:
   - `PORT` (cPanel injects this automatically)
   - `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` (only needed at build time, not runtime)

## Adding API endpoints

Add files under `server/routes/` and mount them in `server/routes/index.js`.
Keep server-only secrets (e.g. service-role keys) in cPanel env vars and
access them via `process.env.*` inside Express handlers.

## Why we did NOT remove TanStack Start / Workers

The Lovable platform builds and previews this project as a TanStack Start
app. Removing TanStack would break preview, hot reload, and the QR redirect
server handlers (which need server-side `302` + Host-header inspection).
The Express server in this folder is **purely additive** for cPanel hosting.