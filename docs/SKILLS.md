# Agent Skills

Agent skills are packaged instruction sets that an AI coding agent loads on demand. Each is a
`SKILL.md` file with YAML frontmatter plus optional reference files and scripts. The agent reads
the name and description up front, and pulls in the full body only when a task matches.

This project installs skills with the [`skills`](https://github.com/vercel-labs/skills) CLI
(`skills@1.7.2`, MIT, Vercel Labs).

---

## Installed skills

All seven are installed at **project scope** for the **ZCode** agent, in `--copy` mode.

| Skill | Source | Purpose |
|---|---|---|
| `frontend-design` | `anthropics/skills` | Visual design direction — typography, palette, layout. Avoids templated "AI slop" defaults. |
| `theme-factory` | `anthropics/skills` | Builds cohesive colour/type themes. 10 reference themes bundled. |
| `webapp-testing` | `anthropics/skills` | Playwright-driven browser testing. **Needs setup — see below.** |
| `web-design-guidelines` | `vercel-labs/agent-skills` | Audits UI for accessibility (WCAG) and UX compliance. |
| `vercel-react-best-practices` | `vercel-labs/agent-skills` | React/Next.js performance and architecture rules. |
| `vercel-composition-patterns` | `vercel-labs/agent-skills` | Compound components, render props, reusable API design. |
| `writing-guidelines` | `vercel-labs/agent-skills` | Clear, non-inflated technical prose. |

Every skill passed the CLI's security scan (Gen: safe, Socket: 0 alerts, Snyk: low risk).

### Relevance to this project

`typeflow` is **vanilla TypeScript with no React**. So:

- **Directly useful now:** `frontend-design`, `theme-factory`, `web-design-guidelines`,
  `writing-guidelines`, and `webapp-testing` (once set up).
- **Dormant:** the two `vercel-react-*` skills. They are installed for future use but will not
  trigger on this codebase. They become relevant only if a React/Next.js surface is added.

`theme-factory` and `frontend-design` pair well with the existing 12-theme system in
`src/themes/`, and `web-design-guidelines` is the natural tool for the open accessibility work
in `ROADMAP.md`.

---

## Prerequisite: Node.js >= 22.20.0

The `skills` CLI requires Node 22.20+. This environment ships **Node v20.5.1**, which crashes the
CLI on startup. A local Node 22 was installed at `~/.local/node22` — no system files were changed.

Prefix any `skills` command with it:

```bash
export PATH=$HOME/.local/node22/bin:$PATH
node --version   # v22.21.1
```

The app itself still builds and runs on Node 20. This requirement applies **only** to the
`skills` CLI.

---

## Usage

```bash
export PATH=$HOME/.local/node22/bin:$PATH

npx skills list                  # show installed skills
npx skills find <query>          # search for skills
npx skills update                # update to latest versions
npx skills remove <name>         # remove a skill
```

Skills load automatically when a task matches their description. There is no slash command to
invoke them in ZCode — the agent decides based on context.

### Adding another skill

```bash
export PATH=$HOME/.local/node22/bin:$PATH
npx skills add <owner>/<repo> --skill <name> --agent zcode -y --copy
```

Two gotchas, both learned the hard way:

- **One skill per command.** `--skill a,b,c` is silently ignored and the CLI falls back to
  listing available skills instead of installing. Loop over names instead.
- **Use the canonical name.** Vercel skills are prefixed (`vercel-react-best-practices`, not
  `react-best-practices`). A wrong name reports `skipped`, not an error — always check the
  status in the output.

---

## `webapp-testing` needs setup before use

This skill drives a real Chromium browser via **Python Playwright**, which is not installed:

```
Python 3.8.10
ModuleNotFoundError: No module named 'playwright'
```

To enable it:

```bash
pip3 install playwright
python3 -m playwright install chromium
```

Note that Playwright dropped Python 3.8 support; a newer Python may be required. Until then the
skill is present but inert. The other six skills are pure instruction text and work immediately.

---

## Version control

| Path | Tracked? | Why |
|---|---|---|
| `skills-lock.json` | **committed** | Pins exact content hashes — reproducible installs. |
| `.zcode/skills/` | ignored | Fetched content, not project source. |

Same split as `package-lock.json` versus `node_modules/`. To restore skills on a fresh clone:

```bash
export PATH=$HOME/.local/node22/bin:$PATH
npx skills experimental_install
```

---

## Corrections to the published install instructions

The widely-circulated command for this is **wrong** and will fail:

```bash
npx skills add anthropics/claude-code --skill frontend-design   # ✗ does not work
```

`anthropics/claude-code` is the CLI repo and contains no skills. The correct source is
`anthropics/skills`:

```bash
npx skills add anthropics/skills --skill frontend-design --agent zcode -y --copy   # ✓
```

Some summaries also describe skills as invokable via slash commands such as `/frontend-design`.
That is not how this CLI works — skills are loaded by the agent based on task context.

---

## Skills referenced but not installed

Three third-party skills were considered and deliberately left out:

- **UI/UX Pro Max** (`nextlevelbuilder/ui-ux-pro-max-skill`)
- **TasteSkill** (`Leonxlnx/taste-skill`)
- **Impeccable** — no authoritative repo could be located.

These are unaffiliated third-party repositories, not published by Anthropic or Vercel. Installing
one runs its instructions with full agent context, so provenance matters. They can be added on
request, but should be reviewed first:

```bash
npx skills add <owner>/<repo> --list   # inspect before installing
```

See `DECISIONS.md` §14 for the full reasoning.
