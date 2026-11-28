# Deployment & Operations Runbook

This runbook covers local verification, GitHub CI configuration, Vercel preview/production deployment, smoke testing, rollback, and optional custom subdomain setup.

---

## 1. Local Setup & Pre-Deployment Verification

**Prerequisites:** Node.js `20.x` LTS (or newer `>=20.0.0`) and npm.

```bash
# 1. Clone the repository
git clone https://github.com/krshankar14/ndc-vs-gds-cost-analyzer-public.git
cd ndc-vs-gds-cost-analyzer-public

# 2. Switch to or create the development feature branch
git checkout -b feature/distribution-intelligence-v2

# 3. Install dependencies cleanly from package-lock.json
npm ci

# 4. Run full quality gates
npm run typecheck
npm run lint
npm test
npm run build

# 5. Preview the production bundle locally
npm run preview
```

---

## 2. GitHub Branching, Pull Request & Branch Protection

1. Push the feature branch (never force-push `main`):
   ```bash
   git add .
   git commit -m "feat: upgrade NDC vs GDS simulator to Version 2.0"
   git push -u origin feature/distribution-intelligence-v2
   ```
2. Open a Pull Request into `main` on GitHub.
3. Confirm `.github/workflows/ci.yml` passes all steps (`typecheck`, `lint`, `test`, `build`).
4. **Recommended Account-Level Branch Protection (Manual GitHub UI Steps):**
   - Go to **Settings → Branches → Add branch protection rule** for `main`.
   - Enable **Require a pull request before merging**.
   - Enable **Require status checks to pass before merging** and select `Typecheck, Lint, Test, and Build`.
   - Enable **Do not allow bypassing the above settings** (optional for solo repos).

---

## 3. Importing into Vercel (Separate Project from `curiouskumar.com`)

> **Safety Rule:** Always create a **new, separate Vercel project**. Never deploy over your existing personal website project (`curiouskumar.com`).

1. Sign in to [vercel.com](https://vercel.com) and click **Add New… → Project**.
2. Import **`krshankar14/ndc-vs-gds-cost-analyzer-public`**.
3. Verify project settings (auto-detected via `vercel.json`):
   - **Framework Preset:** `Vite`
   - **Root Directory:** `./` (Repository root)
   - **Install Command:** `npm ci`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Node.js Version:** `20.x` (Project Settings → General → Node.js Version)
   - **Environment Variables:** None required.
4. Click **Deploy**.

---

## 4. Preview Deployments & Production Release

1. Every Pull Request pushed to GitHub automatically triggers a **Vercel Preview Deployment** URL (note: Vercel automatically sets `X-Robots-Tag: noindex` on preview URLs so preview builds are not indexed by search engines).
2. Run the **Smoke Test Checklist** below against the Preview URL.
3. After approval, merge the Pull Request into `main` to trigger the Vercel Production Deployment.
4. Re-run the Smoke Test Checklist on the live production URL.
5. Once your final production URL is confirmed, update `<loc>` in `public/sitemap.xml` and add `<link rel="canonical" href="https://<your-confirmed-url>/" />` in `index.html`.

---

## 5. Post-Deployment Smoke Test Checklist

- [ ] Page loads cleanly with HTTP 200 and zero browser console errors or CSP violations.
- [ ] Styles and bundled fonts (`Plus Jakarta Sans`, `JetBrains Mono`) render cleanly with zero external CDN requests.
- [ ] Switching FSC/LCC presets, Basic/Advanced modes, and GDS Surcharge Treatment updates all 9 KPI cards and 3 charts cleanly.
- [ ] Entering `0` monthly bookings or `0%` migration displays clean status messages (no `NaN` or `Infinity`).
- [ ] **Scenarios** tab creates, duplicates, renames, compares, and resets scenarios accurately.
- [ ] **Sensitivity** tab renders all 4 heatmaps and driver influence bars.
- [ ] **Assumptions** tab exports valid CSV and JSON files, re-imports an exported JSON file, and rejects malformed JSON cleanly.
- [ ] Print / Save PDF produces a clean, sidebar-free executive summary.
- [ ] Security headers (`Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`) appear in network response headers.

---

## 6. Rolling Back a Deployment

If an issue is discovered after releasing to production:
1. Open the project in Vercel → **Deployments**.
2. Locate the last known-good production deployment.
3. Click the **`⋯`** menu → **Instant Rollback** (restores production immediately without rebuilding).
4. Follow up by reverting the commit on GitHub via a new PR into `main`.

---

## 7. Optional Custom Subdomain (Only After Owner Approval)

If you later approve connecting `ndc-analyzer.curiouskumar.com`:
1. In the new Vercel project → **Settings → Domains** → add `ndc-analyzer.curiouskumar.com`.
2. In your DNS provider for `curiouskumar.com`, add the exact `CNAME` record Vercel displays (pointing only the `ndc-analyzer` subdomain—do **not** alter root `@` or `www` records for `curiouskumar.com`).
3. Wait for SSL provisioning, verify HTTPS, and update `public/sitemap.xml` and canonical `<link>` in `index.html`.
