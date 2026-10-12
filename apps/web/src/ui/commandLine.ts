/**
 * Command line.
 *
 * A fuzzy-searchable palette for every setting in the app, reachable with
 * Esc or Ctrl+Shift+P. Commands are declared as data, so adding a setting
 * to the palette requires no changes to the component itself.
 */

import { configStore } from "@/state/config"
import { listThemes } from "@/themes/themeEngine"
import type { Config } from "@/types"

export type Command = {
  id: string;
  label: string;
  /** Shown right-aligned — typically the value this command would set. */
  hint?: string;
  run: () => void;
};

/**
 * Subsequence fuzzy match.
 *
 * Returns a score (higher is better) or -1 for no match. Consecutive
 * character hits and word-boundary hits are weighted up so that typing
 * "thm" ranks "theme" above an incidental match elsewhere.
 */
export function fuzzyScore(query: string, target: string): number {
  if (query === "") return 0

  const q = query.toLowerCase()
  const t = target.toLowerCase()

  let score = 0
  let ti = 0
  let consecutive = 0

  for (const char of q) {
    const found = t.indexOf(char, ti)
    if (found === -1) return -1

    if (found === ti) {
      consecutive++
      score += 5 + consecutive * 2
    } else {
      consecutive = 0
      score += 1
    }

    // Reward matches at the start of a word.
    if (found === 0 || t[found - 1] === " " || t[found - 1] === "-") {
      score += 8
    }

    ti = found + 1
  }

  // Prefer shorter targets when scores are otherwise close.
  return score - target.length * 0.1
}

function toggle(key: keyof Config, label: string): Command[] {
  return [
    {
      id: `${key}-on`,
      label: `${label}...on`,
      run: () => configStore.set(key, true as never),
    },
    {
      id: `${key}-off`,
      label: `${label}...off`,
      run: () => configStore.set(key, false as never),
    },
  ]
}

/** Build the full command list from current app state. */
export function buildCommands(actions: {
  restart: () => void;
  navigate: (page: string) => void;
  clearHistory: () => void;
}): Command[] {
  const commands: Command[] = []

  // Navigation & actions
  commands.push(
    { id: "restart", label: "restart test", run: actions.restart },
    { id: "nav-test", label: "go to test", run: () => actions.navigate("test") },
    { id: "nav-stats", label: "go to statistics", run: () => actions.navigate("stats") },
    { id: "nav-settings", label: "go to settings", run: () => actions.navigate("settings") },
    { id: "clear-history", label: "clear all history", run: actions.clearHistory }
  )

  // Modes
  for (const mode of ["time", "words", "quote", "zen", "custom"] as const) {
    commands.push({
      id: `mode-${mode}`,
      label: `change mode...${mode}`,
      run: () => configStore.set("mode", mode),
    })
  }

  // Time presets
  for (const t of [15, 30, 60, 120]) {
    commands.push({
      id: `time-${t}`,
      label: `change time...${t}`,
      hint: `${t}s`,
      run: () => {
        configStore.patch({ mode: "time", time: t })
      },
    })
  }

  // Word-count presets
  for (const w of [10, 25, 50, 100]) {
    commands.push({
      id: `words-${w}`,
      label: `change word count...${w}`,
      hint: `${w} words`,
      run: () => {
        configStore.patch({ mode: "words", words: w })
      },
    })
  }

  // Themes
  for (const theme of listThemes()) {
    commands.push({
      id: `theme-${theme.name}`,
      label: `change theme...${theme.label}`,
      hint: theme.variant,
      run: () => configStore.set("theme", theme.name),
    })
  }

  // Caret styles
  for (const style of ["off", "line", "block", "outline", "underline"] as const) {
    commands.push({
      id: `caret-${style}`,
      label: `change caret style...${style}`,
      run: () => configStore.set("caretStyle", style),
    })
  }

  // Boolean toggles
  commands.push(
    ...toggle("punctuation", "change punctuation"),
    ...toggle("numbers", "change numbers"),
    ...toggle("blindMode", "change blind mode"),
    ...toggle("lazyMode", "change lazy mode"),
    ...toggle("focusMode", "change focus mode"),
    ...toggle("smoothCaret", "change smooth caret"),
    ...toggle("showLiveWpm", "change live wpm"),
    ...toggle("showLiveAccuracy", "change live accuracy"),
    ...toggle("soundOnClick", "change sound on click")
  )

  // Enumerated settings
  for (const mode of ["off", "word", "letter"] as const) {
    commands.push({
      id: `stop-${mode}`,
      label: `change stop on error...${mode}`,
      run: () => configStore.set("stopOnError", mode),
    })
  }

  for (const mode of ["off", "on", "max"] as const) {
    commands.push({
      id: `confidence-${mode}`,
      label: `change confidence mode...${mode}`,
      run: () => configStore.set("confidenceMode", mode),
    })
  }

  for (const size of [1, 1.25, 1.5, 2, 2.5, 3]) {
    commands.push({
      id: `fontsize-${size}`,
      label: `change font size...${size}`,
      run: () => configStore.set("fontSize", size),
    })
  }

  return commands
}

export class CommandLine {
  private root: HTMLElement
  private input: HTMLInputElement
  private list: HTMLElement

  private commands: Command[] = []
  private filtered: Command[] = []
  private selected = 0
  private open = false

  /** Restores focus to whatever was active before the palette opened. */
  private previousFocus: HTMLElement | null = null

  constructor(
    root: HTMLElement,
    input: HTMLInputElement,
    list: HTMLElement,
    private getCommands: () => Command[]
  ) {
    this.root = root
    this.input = input
    this.list = list

    this.input.addEventListener("input", () => {
      this.selected = 0
      this.filter()
    })

    this.input.addEventListener("keydown", (e) => this.onKeyDown(e))

    this.list.addEventListener("click", (e) => {
      const item = (e.target as HTMLElement).closest<HTMLElement>("[data-index]")
      if (!item) return
      const index = Number(item.dataset["index"])
      this.execute(index)
    })

    this.root
      .querySelector("[data-action='close-command-line']")
      ?.addEventListener("click", () => this.close())
  }

  isOpen(): boolean {
    return this.open
  }

  show(): void {
    this.commands = this.getCommands()
    this.previousFocus = document.activeElement as HTMLElement | null

    this.open = true
    this.root.hidden = false
    this.input.value = ""
    this.selected = 0
    this.filter()
    this.input.focus()
  }

  close(): void {
    if (!this.open) return
    this.open = false
    this.root.hidden = true
    this.previousFocus?.focus()
  }

  toggle(): void {
    this.open ? this.close() : this.show()
  }

  private filter(): void {
    const query = this.input.value.trim()

    if (query === "") {
      this.filtered = this.commands
    } else {
      this.filtered = this.commands
        .map((cmd) => ({ cmd, score: fuzzyScore(query, cmd.label) }))
        .filter((entry) => entry.score >= 0)
        .sort((a, b) => b.score - a.score)
        .map((entry) => entry.cmd)
    }

    this.render()
  }

  private render(): void {
    this.list.replaceChildren()

    if (this.filtered.length === 0) {
      const li = document.createElement("li")
      li.className = "command-item is-empty"
      li.textContent = "No matching commands"
      this.list.appendChild(li)
      return
    }

    const frag = document.createDocumentFragment()

    // Cap the rendered list; the palette is navigated by typing, not scrolling.
    this.filtered.slice(0, 60).forEach((cmd, index) => {
      const li = document.createElement("li")
      li.className = `command-item${index === this.selected ? " is-selected" : ""}`
      li.dataset["index"] = String(index)
      li.setAttribute("role", "option")
      li.setAttribute("aria-selected", String(index === this.selected))

      const label = document.createElement("span")
      label.textContent = cmd.label
      li.appendChild(label)

      if (cmd.hint) {
        const hint = document.createElement("span")
        hint.className = "command-item__value"
        hint.textContent = cmd.hint
        li.appendChild(hint)
      }

      frag.appendChild(li)
    })

    this.list.appendChild(frag)
    this.scrollSelectedIntoView()
  }

  private scrollSelectedIntoView(): void {
    const el = this.list.querySelector<HTMLElement>(".is-selected")
    el?.scrollIntoView({ block: "nearest" })
  }

  private onKeyDown(e: KeyboardEvent): void {
    switch (e.key) {
      case "Escape":
        e.preventDefault()
        this.close()
        break

      case "ArrowDown":
        e.preventDefault()
        this.move(1)
        break

      case "ArrowUp":
        e.preventDefault()
        this.move(-1)
        break

      case "Enter":
        e.preventDefault()
        this.execute(this.selected)
        break

      case "Tab":
        // Trap focus inside the palette.
        e.preventDefault()
        this.move(e.shiftKey ? -1 : 1)
        break
    }
  }

  private move(delta: number): void {
    const max = Math.min(this.filtered.length, 60)
    if (max === 0) return
    this.selected = (this.selected + delta + max) % max
    this.render()
  }

  private execute(index: number): void {
    const cmd = this.filtered[index]
    if (!cmd) return
    this.close()
    cmd.run()
  }
}
