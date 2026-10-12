# Typing Engine

The engine is the most behaviour-dense part of the app. This document explains
the model, the formulas, and the edge cases that drove design decisions.

## The character model

The test is a `TypedWord[]`. Each word holds a `TypedChar[]`, and each
character carries one of five states:

| State | Meaning |
|---|---|
| `pending` | Not yet reached |
| `correct` | Typed and matched |
| `incorrect` | Typed and did not match |
| `extra` | Typed beyond the word's end (an insertion) |
| `missed` | Skipped — the user pressed space before reaching it |

Two cursors locate the caret: `wordIndex` (which word) and `charIndex` (which
character within it).

### Why `extra` and `missed` are distinct

Both represent "the user did not type this word correctly", but they behave
differently:

- **`extra`** characters were *keyed*. They cost time and count against
  accuracy. They are appended to the `chars` array, growing it beyond the
  target length.
- **`missed`** characters were *never keyed*. They cost nothing and do not
  count against accuracy — penalising them would double-count, since the
  word is already marked as containing errors.

Collapsing these into one state produces accuracy figures that disagree with
every other typing test.

## Statistics

### Words per minute

The industry convention is that one "word" equals five characters, including
spaces. This makes WPM comparable across languages with different average word
lengths.

```
net WPM = (correct characters / 5) × (60 / seconds)
raw WPM = (all keystrokes      / 5) × (60 / seconds)
```

`countCorrectWithSpaces()` adds `completedWords - 1` to the correct-character
count: *n* completed words implies *n−1* interior spaces were successfully
keyed, and those are real keystrokes.

### Accuracy

```
accuracy = correct / (correct + incorrect + extra) × 100
```

`missed` is deliberately excluded from the denominator, per the reasoning
above.

### Consistency

Consistency measures the *evenness* of typing rhythm, derived from the
coefficient of variation of per-second raw WPM:

```
CV          = stddev(raw samples) / mean(raw samples)
consistency = 100 × e^(−CV)
```

The exponential mapping is chosen over a linear one because a linear scale
clips hard at zero for erratic typists, discarding information. The
exponential decays smoothly and keeps the whole range meaningful.

Fewer than two samples cannot express variation, so the function returns 100.

### Sampling: cumulative vs instantaneous

Each per-second sample records both figures, and they are computed
differently on purpose:

- `wpm` is **cumulative** — total correct characters over total elapsed time.
  This is what the live counter shows, and it is stable rather than jittery.
- `raw` is **instantaneous** — keystrokes in *that one second* only.
  Consistency needs per-interval variation; a cumulative figure smooths away
  exactly the signal being measured.

## Modifier semantics

### `stopOnError`

| Value | Behaviour |
|---|---|
| `off` | Errors are recorded; typing continues |
| `letter` | A wrong character is **rejected** — state and cursor unchanged |
| `word` | Space will not advance while the current word has any error |

`letter` mode writes the character, checks it, then rolls back state and
cursor if wrong. The write-then-rollback keeps the comparison logic in one
place rather than duplicating it.

### `confidenceMode`

| Value | Behaviour |
|---|---|
| `off` | Backspace works normally, including back into previous words |
| `on` | Backspace works within the current word only |
| `max` | Backspace is fully disabled |

### Returning to a previous word

Even with `confidenceMode: off`, returning is only permitted if the previous
word was left **imperfect**. There is nothing to fix in a perfectly typed
word, and allowing re-entry would let a user corrupt an already-correct word.

On re-entry the engine:
1. Clears `completed`
2. Pops trailing `extra` characters
3. Restores `missed` characters to `pending`
4. Places the caret at the first `pending` slot

### `lazyMode`

Compares characters after Unicode NFD normalisation with diacritics stripped,
so `e` matches `é`. Implemented via `\p{Diacritic}` with the `u` flag.

## Completion rules

| Mode | Finishes when |
|---|---|
| `time` | Elapsed >= configured duration |
| `words`, `quote`, `custom` | Final word submitted, **or** final word fully correct |
| `zen` | Never automatically — the user ends it |

The "final word fully correct" rule exists so the user need not press a
trailing space to end a test. If the last word is wrong, a space is still
required — that keeps the option of correcting it.

### Time-mode refill

Time mode buffers 120 words up front and appends 60 more whenever fewer than
25 remain. A 120 WPM typist produces ~240 words in two minutes, so a fixed
buffer would run out. Refill happens on word advance, never mid-word.

## Discarded tests

A test that finishes with zero typed characters is discarded rather than
recorded. Otherwise, tabbing away during a time test would write a 0 WPM
result and corrupt the user's averages.

## Event model

```ts
type EngineEvent =
  | { type: "start" }
  | { type: "input" }
  | { type: "wordAdvance"; index: number }
  | { type: "tick"; elapsed: number; remaining: number | null }
  | { type: "finish"; result: TestResultInput }
  | { type: "restart" };
```

`engine.on(listener)` returns an unsubscribe function. Listeners are stored in
a `Set`, so double-subscription is a no-op.

## Testing approach

All 31 engine tests use `seedWords()` to install a fixed word list, bypassing
random generation entirely. Tests assert on observable state
(`engine.wordIndex`, character states) rather than internals, so they survive
refactors of the engine's private methods.
