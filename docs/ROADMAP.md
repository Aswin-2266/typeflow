# Roadmap

Current status and the path forward. Items are ordered by dependency, not
priority.

---

## Shipped

- [x] Typing engine — character states, word advance, backspace, re-entry
- [x] Modes — time, words, quote, zen, custom
- [x] Modifiers — punctuation, numbers, blind, stop-on-error, confidence, lazy
- [x] Statistics — net/raw WPM, accuracy, consistency, per-second sampling
- [x] Caret — five styles, smooth motion, typing pulse
- [x] Results — chart, character breakdown, personal-best detection
- [x] Themes — 12 originals, instant switching, live preview
- [x] Command line — fuzzy search over every setting
- [x] Settings page — schema-driven
- [x] Stats page — aggregates, personal bests, history
- [x] Persistence — validated `localStorage`
- [x] API — ts-rest contract, in-memory store, validation
- [x] Tests — 65 passing
- [x] Accessibility — ARIA, focus management, reduced motion
- [x] Responsive — mobile layout and touch input

---

## Phase 1 — Accounts

**Blocked on:** Q1 and Q2 in `docs/QUESTIONS.md`.

- [ ] Auth provider integration
- [ ] `userId` on `TestResult`; partition all queries
- [ ] Persistent database behind `ResultStore`
- [ ] Migrate local history to the account on first login
- [ ] Invert the sync model — server authoritative, local becomes the cache

> The last item is the significant one. Today `localStorage` is the source of
> truth because the server cannot attribute results to anyone. Once it can,
> that relationship should flip, with local storage as an offline cache.

---

## Phase 2 — Content

- [ ] Additional languages (**blocked on Q3**)
- [ ] Expanded English list (1k, 5k, 10k)
- [ ] Larger quote corpus — public-domain sources only
- [ ] Code-typing mode with language-aware tokenisation
- [ ] Custom theme editor with export/import

---

## Phase 3 — Social

**Depends on Phase 1.**

- [ ] Daily and all-time leaderboards
- [ ] Public profiles
- [ ] Head-to-head races over WebSocket
- [ ] Shareable result cards

---

## Phase 4 — Depth

- [ ] Per-character and per-bigram timing analysis
- [ ] Weak-key detection and targeted drills
- [ ] Progress graphs over weeks and months
- [ ] Session replay from the keystroke log
- [ ] Funbox modifiers

---

## Infrastructure

- [ ] CI — typecheck, test, build on push (**blocked on Q4** for deploy target)
- [ ] Playwright end-to-end tests
- [ ] Lighthouse budget in CI
- [ ] PWA — offline install
- [ ] Error reporting

---

## Known limitations

| Limitation | Impact | Fix |
|---|---|---|
| No auth | No cross-device sync | Phase 1 |
| In-memory server | Data lost on restart | Phase 1 |
| English only | Limited audience | Phase 2 |
| 1000-result cap | Old results dropped | Q6 |
| No IME support | CJK input unsupported | Phase 2 |
| Chart needs 2+ samples | No graph on <2s tests | Acceptable |

---

## Explicitly out of scope

- **Copying upstream themes, quotes, or word lists.** GPL-licensed creative
  work. Equivalent systems are implemented with original content.
- **Advertising integration.** Upstream has it; not replicated.
- **Discord bot.** Separate upstream repository.
