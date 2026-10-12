# typeflow

Typeflow is a customizable typing test with five test modes, 12 themes, local result history, and an optional application programming interface (API). The repository uses npm workspaces so you can deploy the frontend and API as separate Vercel projects.

## Run typeflow locally

Install dependencies and start both applications:

```bash
npm install
npm run dev:all
```

| Application | Local URL |
|---|---|
| Frontend | `http://localhost:5173` |
| API | `http://localhost:3005` |

The frontend stores results in browser `localStorage`. API synchronization is optional and never blocks typing.

## Use the workspace structure

```text
apps/
├── web/                 Vite frontend and Vitest tests
└── api/                 Express app and Vercel Functions
packages/
└── shared/              ts-rest and Zod contract
docs/                    Architecture, setup, and deployment guides
```

`apps/web` and `apps/api` import the same `@typeflow/shared` package. A contract change therefore produces a TypeScript error when either application no longer matches it.

## Run repository commands

Run these commands from the repository root:

| Command | Purpose |
|---|---|
| `npm run dev:all` | Start the frontend and API |
| `npm run dev:web` | Start only the frontend |
| `npm run dev:api` | Start only the API |
| `npm run build` | Build or validate all workspaces |
| `npm run typecheck` | Type-check all workspaces |
| `npm run lint` | Lint TypeScript files |
| `npm test` | Run the 65 frontend tests |

## Explore the features

Typeflow includes:

- **Modes**: time, words, quote, zen, and custom
- **Modifiers**: punctuation, numbers, blind mode, stop-on-error, confidence mode, lazy mode, and focus mode
- **Feedback**: live words per minute (WPM), accuracy, character states, five caret styles, and optional keystroke audio
- **Results**: WPM chart, raw WPM overlay, error markers, consistency, and personal bests
- **Customization**: 12 themes, font controls, and a searchable command palette
- **Statistics**: lifetime aggregates, personal bests, and the latest 50 tests

Read [`docs/FEATURES.md`](docs/FEATURES.md) for the complete inventory.

## Deploy both applications

Connect the same GitHub repository to two Vercel projects:

| Vercel project | Root directory | Framework |
|---|---|---|
| `typeflow-web` | `apps/web` | Vite |
| `typeflow-api` | `apps/api` | Other |

Follow [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for every field and environment variable.

## Read the documentation

| Document | Purpose |
|---|---|
| [`ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Understand layers, state ownership, and rendering |
| [`TYPING_ENGINE.md`](docs/TYPING_ENGINE.md) | Review typing states and metric formulas |
| [`TECH_STACK.md`](docs/TECH_STACK.md) | Review technology choices |
| [`API.md`](docs/API.md) | Use the HTTP endpoints |
| [`SETUP.md`](docs/SETUP.md) | Configure local development |
| [`DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Deploy two Vercel projects |
| [`FEATURES.md`](docs/FEATURES.md) | Review shipped features |
| [`THEMING.md`](docs/THEMING.md) | Add or modify themes |
| [`DECISIONS.md`](docs/DECISIONS.md) | Review design decisions |
| [`ROADMAP.md`](docs/ROADMAP.md) | Review planned work |

## Understand licensing

This project uses the MIT license and contains original code and assets. It reimplements functional typing-test behavior without copying Monkeytype source, themes, quotes, or word lists.

[Monkeytype](https://github.com/monkeytypegame/monkeytype) uses the GNU General Public License version 3. See [`LICENSE`](LICENSE) for this project's terms.
