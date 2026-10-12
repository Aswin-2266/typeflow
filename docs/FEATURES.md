# Features

## Test modes

| Mode | Behaviour | Parameters |
|---|---|---|
| **time** | Type until the clock runs out; words refill indefinitely | 15 / 30 / 60 / 120 s |
| **words** | Fixed word count | 10 / 25 / 50 / 100 |
| **quote** | A quotation with attribution shown on completion | short / medium / long / all |
| **zen** | Free typing with no target text; counts up | — |
| **custom** | Your own pasted text | — |

## Modifiers

| Modifier | Effect |
|---|---|
| **punctuation** | Adds commas, periods, quotes, brackets, hyphens; capitalises sentence starts |
| **numbers** | Mixes 1–4 digit numeric tokens into the stream (~1 word in 5) |
| **blind mode** | Hides all correctness feedback until the test ends |
| **stop on error** | `letter` rejects wrong characters; `word` blocks advancing past a bad word |
| **confidence mode** | `on` locks completed words; `max` disables backspace entirely |
| **lazy mode** | Accepts plain letters for accented ones (`e` matches `é`) |
| **focus mode** | Fades all chrome while typing |

## Live feedback

- Per-character colouring: correct, incorrect, extra, missed
- Red underline on words left with errors
- Live WPM and accuracy (each independently toggleable)
- Countdown (time mode) or `n/total` progress (word/quote/custom)
- Timer styles: `text`, `bar`, `mini`

## Caret

Five styles — `off`, `line`, `block`, `outline`, `underline` — with optional
smooth animation between characters. The caret holds solid while typing and
resumes blinking after 800 ms of inactivity.

## Results screen

- Large WPM and accuracy figures
- WPM-over-time chart with a dashed raw-WPM line and error markers
- Test type, raw WPM, character breakdown (`correct/incorrect/extra/missed`),
  consistency, and duration
- "New personal best" badge when applicable
- `next test` (new words) and `repeat` (same words) actions

## Statistics

- Lifetime aggregates: tests completed, time typing, average WPM, highest WPM,
  average accuracy
- Personal bests per `(mode, mode2, language)` grouping
- Last 50 tests in a sortable table
- Clear-all with confirmation

## Themes

Twelve original palettes across three variants:

| Variant | Themes |
|---|---|
| dark | carbon, midnight, ember, moss, plum, slate, sand, ocean |
| light | paper, linen |
| contrast | mono, terminal |

Each is a set of CSS custom properties written to `:root`, so switching is
instant with no stylesheet reload. The theme picker previews each palette in
its own colours, and the browser chrome colour follows the active theme.

## Command line

`Esc` or `Ctrl+Shift+P` opens a fuzzy-searchable palette covering every
setting — modes, durations, themes, caret styles, toggles, font size,
navigation, and clearing history.

The matcher scores subsequences, weighting consecutive hits and word-boundary
hits, so `thm` ranks `change theme...` highly. Navigate with arrows or Tab;
`Enter` runs; `Esc` closes and restores focus.

## Keyboard

| Shortcut | Action |
|---|---|
| any printable key | Type |
| `Backspace` | Delete a character |
| `Ctrl+Backspace` | Delete the whole word |
| `Tab` then `Enter` | Restart |
| `Esc` / `Ctrl+Shift+P` | Command line |

Input is captured at the document level, so typing starts immediately on page
load with no click needed. Browser and OS shortcuts (`Ctrl`/`Cmd`/`Alt`
combinations) are never swallowed.

## Sound

Optional keystroke clicks synthesised with the Web Audio API — a triangle
oscillator with a steep exponential decay and slight random detune, so
repeated keys do not sound mechanical. No audio files are bundled. Three
volume levels.

## Accessibility

- Semantic landmarks, ARIA labels, and `aria-pressed` on toggles
- Visible focus rings throughout
- `prefers-reduced-motion` disables animations and transitions
- Live regions for toasts
- Full keyboard operation; focus is trapped in the command line and restored
  on close

## Persistence

Settings and up to 1000 results are stored in `localStorage` and survive
reloads. Persisted config is validated key-by-key on load, so a corrupt or
outdated payload degrades to defaults rather than breaking the app. When the
API is running, results are mirrored to it on a best-effort basis.

## Responsive

Single-column layout below 768 px, reduced test font size, stacked results
grid, and a touch path that focuses a hidden input so mobile keyboards work.

---

## Not implemented

See `docs/ROADMAP.md` for detail.

- Accounts, login, cloud sync
- Leaderboards, multiplayer
- Languages beyond English
- Custom themes in the UI
- PWA / offline install
