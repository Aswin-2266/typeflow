# Design Decisions

Each entry records a decision, the alternatives considered, and the reasoning.

---

## 1. Clean-room reimplementation, not a port

**Decision.** Write original code implementing the same feature set, rather
than copying or adapting upstream source.

**Context.** Monkeytype is **GPL-3.0**. Copying its source — even with edits —
would place this project under GPL-3.0 and require distributing the full
corresponding source under those terms.

**Alternatives.**
- *Fork and modify* — inherits GPL obligations the user did not choose, and
  the user explicitly asked not to clone.
- *Copy selectively* — still a derivative work. The "minor changes" route is
  not a licensing workaround.

**Consequence.** Original code under MIT. Behaviour is equivalent where it is
functional (WPM formulas, state machine semantics); creative assets
(themes, quote database, word lists) are original or public domain.

> **Functional vs creative.** WPM = chars/5 × 60/sec is a factual formula and
> not protectable. A hand-curated collection of 100 themes is creative
> expression and is not reproduced.

---

## 2. No UI framework

**Decision.** Direct DOM manipulation for the typing surface.

**Context.** The surface re-renders on every keystroke — up to ~12/sec. The
change is always tiny and statically known: one character's state, plus caret
position.

**Alternatives.**
- *React* — a VDOM diff over the word list per keystroke does work to discover
  what we already know. `key`-based reconciliation over hundreds of spans is
  pure overhead here.
- *Solid* — fine-grained reactivity would suit this well. Rejected only to
  avoid a framework dependency for one screen; it is the strongest candidate
  if the UI is ever migrated.

**Consequence.** Manual state-to-DOM synchronisation. Mitigated by keeping all
state in observable stores and treating the DOM as a pure projection.

---

## 3. Engine is DOM-free

**Decision.** `engine/` imports no DOM types and renders nothing.

**Reasoning.** The engine holds all the subtle logic — missed characters,
word re-entry, confidence mode, completion rules. Coupling that to the DOM
would make it testable only through a rendered fixture.

**Consequence.** 31 engine tests run with no DOM. The renderer is replaceable
without touching typing logic.

---

## 4. Cumulative WPM, instantaneous raw

**Decision.** Per-second samples record cumulative `wpm` and instantaneous
`raw`.

**Reasoning.** They serve different purposes. Cumulative WPM is stable and
suits a live display. Consistency measures *variation between intervals* — a
cumulative figure smooths away precisely the signal being measured.

---

## 5. Exponential consistency mapping

**Decision.** `consistency = 100 × e^(−CV)`.

**Alternatives.**
- *Linear* (`100 × (1 − CV)`) — clips at zero for CV >= 1, which real erratic
  typists reach, collapsing distinct performances to the same score.
- *Raw CV* — unbounded and inverted; worse is higher.

**Consequence.** Smooth decay across the full range, always within 0–100.

---

## 6. `missed` excluded from accuracy

**Decision.** Accuracy denominator is `correct + incorrect + extra`.

**Reasoning.** Missed characters were never keyed. The word is already marked
as containing errors; counting the skipped characters again double-penalises
the same mistake. Including them also makes accuracy depend on word *length*
rather than performance.

---

## 7. Shared contract over hand-written types

**Decision.** ts-rest + Zod in `packages/shared/src/contract.ts`, imported by both sides.

**Reasoning.** One definition produces client types, server types, and runtime
validation. The common failure mode of hand-written types — server changes a
field, client types still claim the old shape, failure appears at runtime —
becomes a compile error.

**Cost.** Two dependencies and a small amount of generic ceremony. Worth it at
the network boundary.

---

## 8. Interface-based persistence

**Decision.** Handlers depend on `ResultStore`; the concrete store is
constructed in `apps/api/src/app.ts`.

**Reasoning.** The user chose a stub backend explicitly intended to be
swappable. Dependency inversion makes "swappable later" a one-line change
rather than a refactor.

---

## 9. localStorage is authoritative, server is a mirror

**Decision.** Results are written locally first; server sync is fire-and-forget.

**Reasoning.** With no authentication, the server cannot attribute results to a
user, so it cannot be the source of truth. Making the UI depend on it would
mean a dead API breaks the app.

**Consequence.** The frontend is fully functional standalone. Inverts cleanly
once auth exists.

---

## 10. Per-key config validation on load

**Decision.** Each config key has a validator; invalid keys are dropped
individually on load.

**Alternatives.**
- *Trust localStorage* — a stale or hand-edited payload can put the app in an
  unrenderable state with no recovery path short of clearing storage.
- *All-or-nothing validation* — one bad key discards every other preference.

**Consequence.** Graceful degradation per key, and schema evolution is free —
removed keys are simply ignored.

---

## 11. Synthesised audio, no sample files

**Decision.** Web Audio oscillator instead of bundled audio assets.

**Reasoning.** Zero binary assets, zero network fetch, zero playback latency —
which matters when clicks must track fast typing. The `AudioContext` is created
lazily because browsers block it outside a user gesture.

---

## 12. Document-level keyboard capture

**Decision.** Listen on `document`, not a focused input.

**Reasoning.** Typing must begin immediately on page load with no click. A
focused `<input>` would require one, and would surface a text cursor and
native selection behaviour that conflict with the custom caret.

**Consequence.** Careful filtering is required so browser/OS shortcuts are
never swallowed. A hidden input is retained solely for touch devices, which do
not emit usable `keydown` events.

---

## 13. Original and public-domain text only

**Decision.** The quote corpus contains only pre-1929 works, US Government
works, traditional proverbs, and prose written for this project.

**Note.** During development two entries drifted into paraphrases of
copyrighted modern fiction and were replaced with original prose before
completion. Paraphrasing a distinctive passage is not a workaround — the
safeguard is to write original text or use verifiably public-domain sources.

---

## 14. Agent skills: official sources only

**Decision.** Seven skills are installed, drawn only from `anthropics/skills`
and `vercel-labs/agent-skills`. Three third-party skills that appeared in the
same recommendation list — UI/UX Pro Max, TasteSkill, and Impeccable — were
not installed.

**Reasoning.** A skill is executable instruction content loaded into the
agent's context with full project access. That makes provenance a security
property, not a preference. The two chosen sources are maintained by the
vendors behind the agent and the deployment platform; all seven skills passed
the CLI's bundled scans (Gen, Socket, Snyk).

The excluded three are unaffiliated repositories. Two carry star counts that
are implausibly high for their age and narrow scope — verified as genuine API
values rather than a parsing artifact, but anomalous enough to warrant review
before granting context access. For the third, Impeccable, no authoritative
repository could be identified at all; installing an unverified namesake is
precisely the supply-chain mistake to avoid.

**Consequence.** Smaller skill set, higher confidence. Any of the three can be
added on request after inspecting its `SKILL.md` via `--list`.

**Note on published instructions.** The commonly cited install command,
`npx skills add anthropics/claude-code --skill frontend-design`, is wrong:
that repo holds the CLI and contains no skills. The correct source is
`anthropics/skills`. This was verified against the GitHub API rather than
trusted, and is documented in `SKILLS.md`.

---

## 15. Local Node 22 for the skills CLI

**Decision.** Node 22.21.1 was installed to `~/.local/node22` rather than
upgrading or replacing the system Node 20.5.1.

**Reasoning.** `skills@1.7.2` requires Node >= 22.20.0 and crashes on Node 20.
The application, its build, and its tests all run correctly on Node 20, so
changing the system runtime would introduce risk for a tooling-only need.

**Consequence.** `skills` commands must be prefixed with
`export PATH=$HOME/.local/node22/bin:$PATH`. The application toolchain is
untouched and the whole change is reversible by deleting one directory.
