# Architecture

## Layer diagram

```
┌──────────────────────────────────────────────────────┐
│  main.ts            boot, error boundary             │
├──────────────────────────────────────────────────────┤
│  ui/app.ts          controller: routing, keyboard,   │
│                     config-bar, live stats           │
├───────────────┬──────────────┬───────────────────────┤
│ ui/renderer   │ ui/command   │ ui/settings, stats,   │
│ (DOM paint)   │ Line         │ chart, toast          │
├───────────────┴──────────────┴───────────────────────┤
│  engine/engine.ts   STATE MACHINE (no DOM)           │
│  engine/stats.ts    WPM / accuracy / consistency     │
│  engine/generator.ts  word + quote generation        │
├──────────────────────────────────────────────────────┤
│  state/config.ts    settings + localStorage          │
│  state/results.ts   history + localStorage + sync    │
│  themes/            palette -> CSS custom properties │
├──────────────────────────────────────────────────────┤
│  shared/contract.ts ts-rest + Zod  ◄── also server   │
└──────────────────────────────────────────────────────┘
                          │ HTTP
┌──────────────────────────────────────────────────────┐
│  server/index.ts    Express host, injects store      │
│  server/routes/     handlers (depend on interface)   │
│  server/store/      MemoryResultStore implements     │
│                     ResultStore  ◄── swap point      │
└──────────────────────────────────────────────────────┘
```

## The central rule: the engine never touches the DOM

`engine/engine.ts` is pure TypeScript. It imports no DOM types, queries no
elements, and renders nothing. It owns the authoritative state and emits
events.

This yields three concrete benefits:

1. **Testability.** All 31 engine tests run with no DOM fixture. They call
   `engine.input("a")` and assert on `engine.words[0].chars[0].state`.
2. **Replaceable UI.** The renderer could become a Solid or React component
   with zero engine changes.
3. **Debuggable state.** State transitions are inspectable without a browser.

The one exception is `window.setInterval` for the test timer, which is
unavoidable for a timed test and is isolated to two private methods.

## Data flow for a single keystroke

```
keydown
  → App.onKeyDown        filters modifiers, shortcuts, ignored keys
  → engine.input(char)   mutates word/char state, may start the test
  → emit {type:"input"}
  → App's engine listener
      → renderer.update()      patches the ONE changed word, moves caret
      → App.updateLiveStats()  refreshes wpm/accuracy/timer readouts
```

Note what does **not** happen: no full re-render, no diff, no reconciliation.

## Render optimisation

`TestRenderer.update()` distinguishes three cases:

| Situation | Action |
|---|---|
| Same word list | Patch active word + previous word only |
| Words appended (time-mode refill) | Append new elements; leave existing untouched |
| Different word list (new test) | Full rebuild |

Identity is tracked with `renderedCount` and `renderedFirstWord`. The caret is
positioned with `transform: translate(x, y)`, which stays on the compositor
and never triggers reflow of the text.

Line scrolling shifts the entire `.words` block by one line height once the
caret reaches the third visible line, giving the familiar three-line window.

## State ownership

| State | Owner | Persistence |
|---|---|---|
| Current test (words, caret, timing) | `TypingEngine` | None — ephemeral |
| Settings | `configStore` | `localStorage` |
| Result history | `resultStore` | `localStorage` + best-effort server |
| Active theme vars | `document.documentElement` | Derived from config |
| Page routing | `App.currentPage` | None |

Both stores are observable. `App` subscribes to `configStore` and
re-derives the DOM; nothing reads settings from the DOM itself.

## Config changes that regenerate the test

Changing `mode`, `time`, `words`, `quoteLength`, `language`, `punctuation`,
`numbers`, or `customText` invalidates the generated text, so `App` restarts
the test. All other settings (theme, caret style, font size) apply in place
without disturbing a test in progress.

This list lives in one place — `App.bindConfig()` — rather than being
scattered across individual setting handlers.

## The persistence swap point

Route handlers in `server/routes/results.ts` depend on the `ResultStore`
**interface**, never on `MemoryResultStore`. The concrete store is constructed
in exactly one place:

```ts
// server/index.ts
const store = new MemoryResultStore();
```

To move to MongoDB: write `MongoResultStore implements ResultStore`, change
that line. No handler, no contract, and no client code changes.

## Error handling philosophy

The app degrades rather than failing:

- `localStorage` unavailable → runs in memory, warns to console
- Server unreachable → local history remains authoritative; sync is fire-and-forget
- Corrupt persisted config → invalid keys dropped individually, defaults used
- Audio blocked → clicks silently skipped
- Fatal boot error → visible message instead of a blank page

A typing test that loses a result is annoying; one that shows a white screen is
broken. The design prefers the former.
