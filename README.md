# typeflow

A minimalistic, highly customizable typing test. Measure words per minute,
accuracy, and consistency across five test modes, with themes, a command
palette, and local result history.

Built as a **clean-room recreation** of the Monkeytype feature set — original
code, original assets. See [Licensing](#licensing) below.

---

## Quick start

```bash
npm install
npm run dev:all
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API | http://localhost:3005 |

The frontend runs standalone — the API is optional.

---

## Features

**Modes** — time (15/30/60/120s), words (10/25/50/100), quote, zen, custom

**Modifiers** — punctuation, numbers, blind mode, stop-on-error, confidence
mode, lazy mode, focus mode

**Feedback** — live WPM and accuracy, per-character colouring, five caret
styles with smooth motion, optional synthesised keystroke audio

**Results** — WPM-over-time chart with raw-WPM overlay and error markers,
character breakdown, consistency, personal-best detection

**Customisation** — 12 original themes, adjustable font size and family,
fuzzy-searchable command palette (`Esc` or `Ctrl+Shift+P`) covering every
setting

**Statistics** — lifetime aggregates, personal bests per mode, last 50 tests

Full detail in [`docs/FEATURES.md`](docs/FEATURES.md).

---

## Keyboard

| Shortcut | Action |
|---|---|
| any printable key | Type |
| `Backspace` | Delete a character |
| `Ctrl+Backspace` | Delete the whole word |
| `Tab` then `Enter` | Restart |
| `Esc` / `Ctrl+Shift+P` | Command line |

Typing begins immediately on page load — no click required.

---

## Stack

TypeScript (strict) · Vite · SCSS · Chart.js · Express · ts-rest · Zod ·
Vitest

The UI uses **no framework**. A typing test re-renders on every keystroke, and
the change is always tiny and statically known, so the renderer patches only
the affected word and moves the caret with a CSS transform. Reasoning in
[`docs/TECH_STACK.md`](docs/TECH_STACK.md).

---

## Architecture

```
src/engine/     state machine, statistics, text generation  (no DOM)
src/state/      observable stores, localStorage persistence
src/ui/         controller, renderer, command line, pages
src/themes/     palettes → CSS custom properties
shared/         ts-rest + Zod contract — imported by client AND server
server/         Express host, route handlers, swappable store
```

The engine is **DOM-free**: it imports no DOM types and renders nothing. It
owns state and emits events. This is what makes 31 of the 65 tests runnable
with no DOM fixture, and what would let the UI be swapped for a framework
without touching typing logic.

Details in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Frontend dev server |
| `npm run server` | API with auto-reload |
| `npm run dev:all` | Both |
| `npm run build` | Typecheck + production bundle |
| `npm test` | Run tests |
| `npm run typecheck` | `tsc --noEmit` |

---

## Status

```
typecheck   clean
tests       65 passed
build       213 KB JS (73 KB gzip) · 15 KB CSS
```

---

## Documentation

| Document | Contents |
|---|---|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Layers, data flow, render optimisation, state ownership |
| [TYPING_ENGINE.md](docs/TYPING_ENGINE.md) | Character model, WPM/accuracy/consistency formulas, edge cases |
| [TECH_STACK.md](docs/TECH_STACK.md) | Technology choices and deviations from upstream |
| [API.md](docs/API.md) | Endpoint reference with curl examples |
| [SETUP.md](docs/SETUP.md) | Install, scripts, extending, troubleshooting |
| [FEATURES.md](docs/FEATURES.md) | Complete feature inventory |
| [THEMING.md](docs/THEMING.md) | Colour roles and authoring themes |
| [DECISIONS.md](docs/DECISIONS.md) | 13 design decisions with alternatives considered |
| [QUESTIONS.md](docs/QUESTIONS.md) | Confirmed decisions and open questions |
| [ROADMAP.md](docs/ROADMAP.md) | Shipped, planned, and out of scope |

---

## Licensing

This project is **MIT licensed** and contains no upstream code.

[Monkeytype](https://github.com/monkeytypegame/monkeytype) is **GPL-3.0**.
Copying or adapting its source — including with modifications — would make
this a derivative work subject to GPL-3.0 terms.

The distinction applied throughout:

- **Functional elements are reimplemented.** WPM as characters ÷ 5 × 60 ÷
  seconds is a factual formula, not protectable expression. State-machine
  semantics for typing behaviour are likewise functional.
- **Creative assets are original.** The ~100 upstream themes, the curated quote
  database, and the language word-lists are creative work and are **not**
  reproduced. This project ships 12 original palettes, a corpus of
  public-domain and original prose, and an independently compiled frequency
  word list.

The quote corpus contains only works published before 1929, US Government
works, traditional proverbs, and prose written for this project.

---

## Not implemented

Accounts, cloud sync, leaderboards, multiplayer, and languages beyond English.
The `ResultStore` interface in `server/store/memoryStore.ts` is the designed
seam for persistent storage — see [`docs/ROADMAP.md`](docs/ROADMAP.md).
