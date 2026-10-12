# Deployment Guide — Vercel & Render

This guide covers deploying **typeflow** as a split deployment:

| Part | Platform | What it is |
|---|---|---|
| Frontend | **Vercel** | Static Vite build (`dist/`) |
| API | **Render** | Express server (`server/index.ts`) |

Every field you must enter in both dashboards is listed verbatim below.

> **The API is optional.** The frontend is fully functional on its own —
> `localStorage` is the source of truth and a failed API call never breaks the
> UI (`src/state/results.ts`). If you only want the typing test live, deploy
> **Vercel only** and skip Part 2 and Part 3 entirely.

---

## Before you start: the one thing that will break

The client calls the API at the **relative path** `/api`:

```ts
// src/state/results.ts
const API_BASE = "/api"
```

There is no `VITE_API_URL` environment variable. The URL is not configurable at
build time. This means that once the frontend is on Vercel and the API is on
Render, **`/api` resolves to Vercel, not Render**, and every API call 404s.

There are two ways to fix this. Pick one before you deploy.

| | Option A — Vercel rewrite (recommended) | Option B — change the code |
|---|---|---|
| What | Vercel proxies `/api/*` to Render | Hardcode/env the Render URL in the client |
| Code change | None | Edit `src/state/results.ts` |
| CORS | Not needed (same origin) | Required (already enabled server-side) |
| Extra latency | One proxy hop | None |

This guide uses **Option A**. It requires no source changes and keeps requests
same-origin. Option B is described in [Appendix B](#appendix-b--option-b-build-time-api-url).

---

## Part 1 — Prerequisites

- The repo is pushed to GitHub: `Aswin-2266/typeflow`
- Node.js `>=20` (declared in `package.json` `engines`) — both platforms honour this
- `npm run build` succeeds locally

Verify before deploying:

```bash
npm ci
npm run build    # expect: dist/ written
```

---

## Part 2 — Render (API) — deploy this first

Deploy the API **first**, because the Vercel rewrite needs the Render URL.

### 2.1 Create the service

Go to **https://dashboard.render.com** → **New** → **Web Service** →
**Build and deploy from a Git repository** → connect `Aswin-2266/typeflow`.

### 2.2 Fields to enter

| Field | Value to enter | Notes |
|---|---|---|
| **Name** | `typeflow-api` | Becomes `typeflow-api.onrender.com` |
| **Project** | *(optional)* | Leave blank |
| **Language** | `Node` | **Not** Docker |
| **Branch** | `master` | This repo's default branch is `master`, not `main` |
| **Region** | `Oregon (US West)` | Pick the one nearest your users |
| **Root Directory** | *(leave blank)* | The server is at the repo root |
| **Build Command** | `npm install --include=dev` | See the warning below |
| **Start Command** | `npx tsx server/index.ts` | See the warning below |
| **Instance Type** | `Free` | Note the spin-down caveat below |

### 2.3 Why those exact build/start commands

Two project-specific traps:

**1. `npm run build` does NOT build the server.** It runs
`tsc --noEmit && vite build` — a typecheck plus a *frontend* bundle. It emits
nothing the API can run. Do not use it as the Render build command.

**2. `tsx` is a devDependency.** The server has no compile step; it is executed
directly by `tsx`. Render sets `NODE_ENV=production`, which makes `npm install`
skip devDependencies, so `tsx` would be missing and the service would crash with
`tsx: not found`.

`npm install --include=dev` forces devDependencies to install, which keeps `tsx`
available. This is the lowest-friction option and requires no code change.

> **Cleaner long-term alternative:** move `tsx` from `devDependencies` to
> `dependencies` in `package.json`, then use the standard `npm install` as the
> build command. See [Appendix A](#appendix-a--production-grade-api-build).

### 2.4 Environment variables

Click **Add Environment Variable** for each:

| Key | Value | Required | Why |
|---|---|---|---|
| `NODE_VERSION` | `20.5.1` | Recommended | Pins the Node major; matches local |
| `PORT` | *(do not set)* | No | **Render injects this automatically** |

**Do not set `PORT` manually.** The server reads it:

```ts
const PORT = Number(process.env["PORT"] ?? 3005)
```

Render assigns a port and sets `PORT` itself. Hardcoding it causes the health
check to fail and the deploy to hang at "in progress".

That is the complete list. The API needs **no database URL, no API key, and no
secrets** — persistence is in-memory (`MemoryResultStore`).

### 2.5 Health check

Under **Advanced**:

| Field | Value |
|---|---|
| **Health Check Path** | `/health` |

This endpoint exists in `server/index.ts` and returns
`{"status":"ok","uptime":…}`. Note it is `/health`, **not** `/api/health`.

### 2.6 Deploy and verify

Click **Create Web Service**. When the log shows `[api] listening on http://0.0.0.0:…`:

```bash
curl https://typeflow-api.onrender.com/health
# {"status":"ok","uptime":3}

curl https://typeflow-api.onrender.com/api/results
# {"results":[],"total":0}
```

**Copy the service URL** (e.g. `https://typeflow-api.onrender.com`). Part 3 needs it.

### 2.7 Two caveats about the free tier

**Spin-down.** Free services sleep after ~15 minutes idle. The next request
takes 50+ seconds to wake. The frontend degrades gracefully — a slow or failed
sync is caught and ignored — so the typing test stays fully usable.

**Data is not durable.** `MemoryResultStore` holds results in a process
variable. Every deploy, restart, and spin-down wipes all server-side results
permanently. This is intentional for a stub. The user's own history survives
because it lives in their browser's `localStorage`. To make server data durable,
implement the `ResultStore` interface against a real database — see
"Swapping the persistence layer" in `SETUP.md`.

---

## Part 3 — Vercel (frontend)

### 3.1 Add the rewrite config

Create `vercel.json` in the repo root, replacing the URL with your Render URL
from step 2.6:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://typeflow-api.onrender.com/api/:path*"
    }
  ]
}
```

This makes the browser's same-origin `/api/...` calls transparently reach
Render. Commit and push it **before** importing the project:

```bash
git add vercel.json
git commit -m "chore: proxy /api to the Render API service"
git push
```

> Skipping this file is the single most common cause of "the site loads but
> results never sync."

### 3.2 Import the project

Go to **https://vercel.com/new** → select `Aswin-2266/typeflow` → **Import**.

### 3.3 Fields to enter

| Field | Value to enter | Notes |
|---|---|---|
| **Project Name** | `typeflow` | Becomes `typeflow.vercel.app` |
| **Framework Preset** | `Vite` | Usually auto-detected |
| **Root Directory** | `./` | Leave as the repo root |
| **Build Command** | `npm run build` | Default; override toggle off |
| **Output Directory** | `dist` | Matches `build.outDir` in `vite.config.ts` |
| **Install Command** | `npm install` | Default |
| **Node.js Version** | `20.x` | Under **Settings → General** |

### 3.4 Environment variables

**None.** Leave this section empty.

The frontend reads no `VITE_*` variables. The only `import.meta.env` usage is
`import.meta.env.DEV` in `src/main.ts`, which Vite sets automatically (`false`
in production builds). Adding variables here has no effect.

### 3.5 Deploy

Click **Deploy**. The build runs `tsc --noEmit && vite build` — note this
**typechecks first**, so any type error fails the deploy. Run `npm run typecheck`
locally first if you are unsure.

---

## Part 4 — Verify the full deployment

1. Open `https://typeflow.vercel.app` — the typing test renders.
2. Complete a test (type a few words, let the timer run out).
3. Open DevTools → **Network** → find the `POST /api/results` request.
   - **201 Created** → the Render proxy works end-to-end.
   - **404** → `vercel.json` is missing, malformed, or was not deployed.
   - **502 / long pending** → Render free instance is waking up; retry in a minute.
4. Confirm persistence:

```bash
curl https://typeflow-api.onrender.com/api/results
# {"results":[{...}],"total":1}
```

5. Reload the page → your result is still in the history (this is `localStorage`,
   and works even if step 3 failed).

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Render: `tsx: not found` | devDependencies skipped under `NODE_ENV=production` | Build command must be `npm install --include=dev` (§2.3) |
| Render: deploy hangs, "in progress" forever | `PORT` was set manually, or health check path wrong | Remove the `PORT` variable; set health check to `/health` |
| Render: `Cannot find module '../shared/contract'` | **Root Directory** was set to `server` | Clear Root Directory — the server imports `../shared/` from the repo root |
| Vercel: build fails on a type error | `npm run build` runs `tsc --noEmit` first | Run `npm run typecheck` locally and fix, or deploy a passing commit |
| Vercel: 404 on all assets | Output Directory wrong | Must be `dist` |
| `POST /api/results` → 404 in production | `vercel.json` missing or not pushed | Add it (§3.1), commit, redeploy |
| API calls 502 then succeed | Free-tier cold start | Expected; upgrade to a paid instance to remove |
| Results vanish from the API after a day | In-memory store wiped on restart | Expected; implement a real `ResultStore` (`SETUP.md`) |
| Results vanish from the *browser* | `localStorage` blocked (private browsing) | App falls back to in-memory and logs a warning |

---

## Appendix A — Production-grade API build

`npm install --include=dev` installs the full toolchain (TypeScript, ESLint,
Vitest, Vite) onto the API server — slower cold starts and a larger image. To
avoid that, make `tsx` a real dependency.

In `package.json`, move `"tsx": "^4.16.0"` from `devDependencies` into
`dependencies`, then use these Render fields instead:

| Field | Value |
|---|---|
| **Build Command** | `npm install` |
| **Start Command** | `npx tsx server/index.ts` |

A stricter option is to precompile to JavaScript and drop `tsx` at runtime, but
that needs a dedicated server tsconfig (the current `tsconfig.json` is set up
for a bundler with `noEmit`), so it is out of scope here.

---

## Appendix B — Option B: build-time API URL

If you would rather call Render directly instead of proxying through Vercel,
change `src/state/results.ts`:

```ts
const API_BASE = import.meta.env["VITE_API_URL"] ?? "/api"
```

Then add this on Vercel (**Settings → Environment Variables**):

| Key | Value | Environments |
|---|---|---|
| `VITE_API_URL` | `https://typeflow-api.onrender.com/api` | Production, Preview, Development |

Notes:

- **Rebuild required.** Vite inlines `import.meta.env` at build time. Changing
  this variable has no effect until you redeploy.
- **CORS applies.** Requests are now cross-origin. The server already runs
  `app.use(cors())` with no allowlist, so it works as-is — but that permits any
  origin. Restrict it before treating this as production-ready:

  ```ts
  app.use(cors({ origin: "https://typeflow.vercel.app" }))
  ```

- Keep the local dev fallback (`?? "/api"`) so the Vite proxy in
  `vite.config.ts` still works when the variable is unset.

---

## Quick reference

**Render**

```
Name:            typeflow-api
Language:        Node
Branch:          master
Root Directory:  (blank)
Build Command:   npm install --include=dev
Start Command:   npx tsx server/index.ts
Health Check:    /health
Env:             NODE_VERSION=20.5.1
                 (never set PORT)
```

**Vercel**

```
Project Name:     typeflow
Framework Preset: Vite
Root Directory:   ./
Build Command:    npm run build
Output Directory: dist
Install Command:  npm install
Node.js Version:  20.x
Env:              (none)
Required file:    vercel.json  → rewrites /api/* to the Render URL
```
