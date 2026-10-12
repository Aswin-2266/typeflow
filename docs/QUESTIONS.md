# Questions & Answers

Decisions confirmed with you before implementation, plus open questions that
need answers before the next phase.

---

## Answered

### 1. Scope of the recreation

> How much of the Monkeytype stack should be recreated?

**Answer: Frontend + stubbed backend** — Express / ts-rest / Zod with an
in-memory store, swappable later.

*Effect.* The full stack requires Firebase, MongoDB, and Redis credentials you
would have to provision. The chosen scope runs with zero external services
while keeping the API contract real, so a persistent backend drops in without
rewriting client code.

---

### 2. Build tooling

> Upstream uses pnpm + Turborepo, but only npm is available here.

**Original answer: Single package. Current answer: npm workspaces.** The frontend,
API, and shared contract now live in `apps/web`, `apps/api`, and
`packages/shared`.

*Effect.* Vercel can import the same repository twice and deploy each app from
its own root directory. npm still manages one lock file and links the shared
contract locally.

---

### 3. Word lists and quotes

> Upstream ships ~50 language files and a large GPL-licensed quote database.

**Answer: English 200/1k common-word lists + public-domain quotes.**

*Effect.* The 200 most frequent English words (frequency ordering is factual,
not creative) plus a corpus of pre-1929 works, US Government works, traditional
proverbs, and original prose. The generation *system* matches upstream; the
content is independent.

---

### 4. Theme count

> Upstream ships ~100 bespoke themes.

**Answer: ~12 original themes** across dark, light, and high-contrast.

*Effect.* The theme engine is architecturally identical — CSS custom properties
written to `:root`. Twelve original palettes demonstrate the full range.
Adding more is a single array entry.

---

## Open — needed before the next phase

### Q1. Authentication provider

Accounts are the main gap. Which direction?

| Option | Tradeoff |
|---|---|
| Firebase Auth | Matches upstream; needs a Google Cloud project |
| Auth.js / NextAuth | Provider-agnostic; more wiring |
| Email + password, self-hosted | No third party; you own password security |
| Keep it local-only | Zero complexity; no cross-device sync |

**Blocks:** cloud sync, leaderboards, per-user result partitioning.

---

### Q2. Database

If persistence moves beyond the in-memory stub:

- **MongoDB** — matches upstream; document shape maps directly to `TestResult`
- **PostgreSQL** — stronger querying for leaderboards and aggregates
- **SQLite** — zero-config, file-backed; good for single-instance deployment

**Note:** `ResultStore` is already the seam. Any of these is a new class plus
one changed line.

---

### Q3. Additional languages

Which, if any? Each needs a frequency-ordered word list. Non-Latin scripts
(Cyrillic, Greek) work with the current engine; CJK would need input-method
handling the engine does not currently have.

---

### Q4. Deployment target

Static hosting (Netlify, Vercel, GitHub Pages) works today for the frontend
alone. A container or Node host is needed if the API ships. Which do you want
CI configured for?

---

### Q5. Pixel-fidelity priority

The layout, type scale, caret behaviour, and interaction model follow
Monkeytype closely. The **palettes are deliberately original** — the upstream
theme collection is creative work under GPL.

Is matching the *structure and feel* what you wanted, or do you specifically
want the default colour scheme to look closer to monkeytype's? I can tune the
default theme's neutrals toward that look while keeping the palettes original.

---

### Q6. Test history limit

Currently 1000 results in `localStorage` (roughly 1–2 MB with samples).
Options: lower the cap, drop per-second samples for older results, or move
history to the server once auth exists.

---

## How to answer

Reply in chat, or edit this file and tell me to re-read it.
