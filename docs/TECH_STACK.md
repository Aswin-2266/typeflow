# Technology Stack

## Summary

| Layer | Technology | Why |
|---|---|---|
| Language | TypeScript 5.5 (strict) | Compile-time safety across a stateful engine |
| Build | Vite 5 | Native ESM dev server, fast HMR, Rollup production builds |
| Styles | SCSS (Dart Sass) | Nesting and partials; compiles to CSS custom properties |
| Charts | Chart.js 4 | Small, canvas-based, no framework dependency |
| API contract | ts-rest 3 + Zod 3 | One schema shared by client and server |
| Server | Express 4 | Minimal HTTP host for the contract |
| Tests | Vitest 1 + jsdom | Same transform pipeline as Vite |
| Persistence | `localStorage` + in-memory server store | No external services required |

## UI architecture: no framework

The interface is built with direct DOM manipulation rather than React, Vue, or
Solid. This is a deliberate choice specific to this problem domain.

A typing test re-renders on **every keystroke**, at rates up to ~12 events per
second for a fast typist. The hot path is narrow and well understood: one
character changes state, and the caret moves. A virtual DOM diff over the whole
word list on each keystroke does meaningful work to discover what we already
know statically.

The renderer therefore patches only the affected word's spans and moves the
caret with a CSS `transform`. The result is that typing never triggers a
layout of the full text block.

The tradeoff is that UI state synchronisation is manual. This is mitigated by
keeping all state in two observable stores (`configStore`, `resultStore`) and
treating the DOM strictly as a projection of engine state.

> The upstream project reached the same conclusion for its typing surface, and
> is only now introducing SolidJS for *peripheral* UI (settings panels, modals)
> while the test itself remains direct-DOM.

## Why TypeScript strict mode

`tsconfig.json` enables `strict`, plus `noUncheckedIndexedAccess`.

The engine indexes into arrays constantly (`words[wordIndex]`,
`chars[charIndex]`). Without `noUncheckedIndexedAccess`, TypeScript types these
as always-defined, which is false at the boundaries — exactly where typing-test
bugs live. The flag forces every access to be guarded, which caught several
off-by-one cases during development.

## Why ts-rest + Zod

The contract in `packages/shared/src/contract.ts` is imported by both the browser and the
server. A Zod schema there generates:

1. TypeScript types for both sides
2. Runtime request validation on the server
3. Typed client calls

Changing a field produces a compile error on whichever side has not been
updated. The alternative — hand-written types plus separate validation — allows
the two to drift silently.

## Why Chart.js over D3

The results screen needs exactly one chart: a dual line plot with scatter
overlay. D3 is a visualisation *toolkit* and would mean writing axes, scales,
and tooltips by hand. Chart.js ships those. Components are registered
individually rather than via the `auto` bundle, so only what is used is built.

## Deviations from upstream

| Upstream | Here | Reason |
|---|---|---|
| pnpm + Turborepo monorepo | Single npm package | Only npm available; monorepo overhead unjustified at this size |
| Firebase Auth | None (local-only) | No credentials required to run |
| MongoDB + Redis | In-memory store | Swappable via the `ResultStore` interface |
| ~100 themes | 12 original themes | Upstream themes are GPL-licensed creative work |
| ~50 language files | English 200 | Same reason; the *system* is equivalent |
| OXLint + Stylelint | Prettier only | Reduced tooling surface |

## Runtime requirements

- Node.js >= 20 (`.nvmrc` pins the version)
- A browser with ES2022, CSS custom properties, and Web Audio

No database, no cloud account, no API keys.
