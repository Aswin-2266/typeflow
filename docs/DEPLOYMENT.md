# Deploy the frontend and API as two Vercel projects

This guide deploys one Git repository as two Vercel projects. `typeflow-web` serves the Vite frontend. `typeflow-api` serves the Express application through Vercel Functions.

## Deployment plan

- **Content type**: How-to
- **Goal**: Configure and deploy both applications from `Aswin-2266/typeflow`
- **Audience**: Repository owners with access to GitHub and Vercel
- **Prerequisites**: A pushed `master` branch and a Vercel account
- **Open question**: Choose a database before treating API data as durable

## Understand the repository structure

Each Vercel project uses a separate workspace as its root directory:

```text
apps/
├── web/                 # Vite frontend
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
└── api/                 # Express API
    ├── api/             # Vercel Function entry points
    ├── src/             # App, routes, local server, store
    ├── package.json
    └── vercel.json
packages/
└── shared/              # ts-rest and Zod API contract
```

Both projects install dependencies from the repository root because npm workspaces link `@typeflow/shared` into each application.

## Deploy the API project

Deploy the API first because the frontend needs its generated domain.

### Import the repository

1. Open the [Vercel new project page](https://vercel.com/new)
2. Select `Aswin-2266/typeflow`
3. Click **Import**
4. Enter the fields below

### Enter the API project fields

| Vercel field | Value |
|---|---|
| **Project Name** | `typeflow-api` |
| **Framework Preset** | `Other` |
| **Root Directory** | `apps/api` |
| **Build Command** | `npm run build` |
| **Output Directory** | Leave empty |
| **Install Command** | `npm install` |
| **Development Command** | `npm run dev` |
| **Node.js Version** | `20.x` |
| **Production Branch** | `master` |

Do not set a `PORT` variable. Vercel invokes the exported Express application as a function and does not use `app.listen()`.

### Enter the initial API environment variable

Add this variable before the first deployment:

| Name | Value | Environments |
|---|---|---|
| `FRONTEND_URLS` | `http://localhost:5173` | Production, Preview, Development |

The first value permits local frontend development. You will replace it after Vercel assigns the frontend domain.

### Deploy and verify the API

Click **Deploy**, then copy the production domain. It should resemble `https://typeflow-api.vercel.app`.

Verify these routes in a browser or terminal:

```bash
curl https://typeflow-api.vercel.app/health
curl "https://typeflow-api.vercel.app/api/results?limit=10&offset=0"
```

The health route returns `{"status":"ok","uptime":...}`. The results route returns `{"results":[],"total":0}` before any results exist.

## Deploy the frontend project

Import the same repository again and configure the Vite workspace.

### Import the repository again

1. Open the [Vercel new project page](https://vercel.com/new)
2. Select `Aswin-2266/typeflow`
3. Click **Import**
4. Enter the fields below

### Enter the frontend project fields

| Vercel field | Value |
|---|---|
| **Project Name** | `typeflow-web` |
| **Framework Preset** | `Vite` |
| **Root Directory** | `apps/web` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |
| **Development Command** | `npm run dev` |
| **Node.js Version** | `20.x` |
| **Production Branch** | `master` |

### Enter the frontend environment variable

Use the API domain from the previous deployment. Do not append `/api` or a trailing slash.

| Name | Value | Environments |
|---|---|---|
| `VITE_API_URL` | `https://typeflow-api.vercel.app` | Production, Preview, Development |

Vite embeds this value during the build. Redeploy the frontend after changing it.

### Deploy and copy the frontend domain

Click **Deploy**, then copy the production domain. It should resemble `https://typeflow-web.vercel.app`.

## Restrict API access to the frontend

Return to the `typeflow-api` project after Vercel assigns the frontend domain.

1. Open **Settings**
2. Open **Environment Variables**
3. Edit `FRONTEND_URLS`
4. Enter the comma-separated value below
5. Redeploy the API

```text
http://localhost:5173,https://typeflow-web.vercel.app
```

Use exact origins with no trailing slash. Add a custom frontend domain to the same comma-separated value when needed.

For example:

```text
http://localhost:5173,https://typeflow-web.vercel.app,https://typeflow.example.com
```

## Verify the connected deployment

Test the browser and network connection after both deployments finish:

1. Open `https://typeflow-web.vercel.app`
2. Complete a typing test
3. Open browser developer tools
4. Select **Network**
5. Confirm `POST https://typeflow-api.vercel.app/api/results` returns `201`
6. Open the statistics page and confirm the local result appears

Check the API directly:

```bash
curl "https://typeflow-api.vercel.app/api/results?limit=10&offset=0"
```

A browser result remains available through `localStorage` if API synchronization fails.

## Configure custom domains

Use separate domains when you add a domain to Vercel:

| Application | Recommended domain |
|---|---|
| Frontend | `https://typeflow.example.com` |
| API | `https://api.typeflow.example.com` |

Update the frontend variable:

```text
VITE_API_URL=https://api.typeflow.example.com
```

Update the API variable:

```text
FRONTEND_URLS=https://typeflow.example.com
```

Redeploy both projects after changing build-time or runtime environment variables.

## Handle preview deployments

Vercel creates a different frontend origin for each preview deployment. The API rejects origins that do not appear in `FRONTEND_URLS`.

Use one of these approaches:

- Add a stable preview domain to `FRONTEND_URLS`
- Test previews against local browser storage without API synchronization
- Add an authenticated preview-origin policy before allowing wildcard domains

Do not allow every `*.vercel.app` origin in production. That pattern includes projects you do not control.

## Understand API storage limits

`MemoryResultStore` stores data inside one function instance. Vercel can replace or scale that instance at any time, so API results can disappear between requests or deployments.

The browser remains functional because `localStorage` is the primary result store. Add Neon, Supabase, MongoDB Atlas, or another managed database before using server-side history.

## Troubleshoot deployment failures

Use this table to map common failures to their fixes:

| Symptom | Cause | Fix |
|---|---|---|
| Frontend build cannot resolve `@typeflow/shared` | Vercel did not install from the workspace lock file | Keep **Root Directory** as `apps/web` and **Install Command** as `npm install` |
| API build cannot resolve `@typeflow/shared` | API workspace dependencies were not linked | Keep **Root Directory** as `apps/api` and redeploy without skipping install |
| API route returns `404` | The catch-all function did not deploy | Confirm `apps/api/api/[...path].ts` exists in the deployed commit |
| Browser reports a Cross-Origin Resource Sharing error | `FRONTEND_URLS` lacks the exact frontend origin | Add the origin without a trailing slash and redeploy the API |
| Frontend sends requests to its own domain | `VITE_API_URL` is missing | Add the API origin and redeploy the frontend |
| API results disappear | The in-memory function instance changed | Add a persistent database implementation |
| Local API calls fail | The API process is not running | Run `npm run dev:all` from the repository root |

## Use the complete field reference

Copy these values when creating the projects.

### `typeflow-api`

```text
Repository:          Aswin-2266/typeflow
Production Branch:   master
Framework Preset:    Other
Root Directory:      apps/api
Install Command:     npm install
Build Command:       npm run build
Output Directory:    (empty)
Development Command: npm run dev
Node.js Version:     20.x
Environment:
  FRONTEND_URLS=http://localhost:5173,https://typeflow-web.vercel.app
```

### `typeflow-web`

```text
Repository:          Aswin-2266/typeflow
Production Branch:   master
Framework Preset:    Vite
Root Directory:      apps/web
Install Command:     npm install
Build Command:       npm run build
Output Directory:    dist
Development Command: npm run dev
Node.js Version:     20.x
Environment:
  VITE_API_URL=https://typeflow-api.vercel.app
```
