# Setup & Development Guide

## Requirements

- **Node.js 20 or newer** (declared in the root `package.json`)
- **npm 9+**

No database, cloud account, or API key is needed.

## Install

```bash
npm install
```

## Run

Both processes together:

```bash
npm run dev:all
```

| Service | URL |
|---|---|
| Frontend (Vite) | http://localhost:5173 |
| API (Express) | http://localhost:3005 |

Or separately:

```bash
npm run dev:web  # frontend only; fully functional without the API
npm run dev:api  # API only
```

The frontend works standalone. `localStorage` is the source of truth; the API
is an optional mirror.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev:web` | Vite development server with hot module replacement |
| `npm run dev:api` | API with auto-reload through tsx |
| `npm run dev:all` | Start both applications |
| `npm run build` | Validate shared and API code, then build the frontend |
| `npm test` | Run the test suite once |
| `npm run typecheck` | Type-check every workspace |
| `npm run format` | Prettier across the repo |

## Project layout

```text
.
├── apps/
│   ├── web/                Vite frontend and 65 Vitest tests
│   └── api/                Express app and Vercel Functions
├── packages/
│   └── shared/             ts-rest and Zod contract
└── docs/                   Project documentation
```

## Verifying the install

```bash
npm run typecheck   # expect: no output
npm test            # expect: 65 passed
npm run build       # expect: dist/ written
```

Check the API:

```bash
curl http://localhost:3005/health
# {"status":"ok","uptime":3}
```

## Adding things

### A theme

Append to `themes` in `apps/web/src/themes/themes.ts`. It appears in the settings grid
and the command palette automatically — no other file changes.

```ts
{
  name: "my-theme",
  label: "my theme",
  variant: "dark",
  colors: {
    bg: "#101014", main: "#7aa2f7", sub: "#4a5168", subAlt: "#181820",
    text: "#e0e2ea", error: "#f7768e", errorExtra: "#8c3f4d",
    colorfulError: "#f7768e",
  },
}
```

### A setting

1. Add the field to `Config` in `apps/web/src/types/index.ts`
2. Add a default in `defaultConfig` (`apps/web/src/state/config.ts`)
3. Add a validator in the same file — **required**, or it will not persist
4. Add a row to the `schema` array in `apps/web/src/ui/settingsPage.ts`

If it changes generated text, add its key to the `regenerates` array in
`App.bindConfig()`.

### A word list

Create `apps/web/src/data/<language>.ts` exporting `string[]`, then reference it in
`apps/web/src/engine/generator.ts`.

## Swapping the persistence layer

Implement the interface in `apps/api/src/store/memoryStore.ts`:

```ts
export class MongoResultStore implements ResultStore {
  async list(limit, offset) { /* … */ }
  async create(input)       { /* … */ }
  async clear()             { /* … */ }
  async personalBests()     { /* … */ }
  async stats()             { /* … */ }
}
```

Then change one line in `apps/api/src/app.ts`:

```ts
const store = new MongoResultStore(db);
```

No route, contract, or client change is required.

## Troubleshooting

**Port already in use** — change `server.port` in `vite.config.ts`, or set
`PORT` for the API. The Vite proxy target must match.

**Settings not persisting** — `localStorage` may be blocked (private browsing,
or a strict cookie policy). The app runs in-memory and logs a warning.

**Sass deprecation warning on build** — comes from Vite's bundled Sass
integration, not from this project's stylesheets. Harmless.

**Chart missing on the results page** — a chart needs at least two per-second
samples, so tests shorter than ~2s render no graph. Expected.
