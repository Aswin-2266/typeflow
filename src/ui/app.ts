/**
 * Application controller.
 *
 * Owns the engine instance, routes between pages, binds global keyboard
 * handling, and keeps the DOM in step with config and engine state.
 *
 * Keyboard input is captured at the document level rather than on a focused
 * input element. This is what allows typing to begin immediately on page
 * load with no click required, which is central to the feel of the app.
 */

import { TypingEngine } from "@/engine/engine"
import { configStore } from "@/state/config"
import { resultStore } from "@/state/results"
import { applyTheme } from "@/themes/themeEngine"
import { TestRenderer } from "./renderer"
import { CommandLine, buildCommands } from "./commandLine"
import { SettingsPage } from "./settingsPage"
import { StatsPage, describeMode } from "./statsPage"
import { renderResultsChart, destroyChart } from "./chart"
import { soundManager } from "@/utils/sound"
import { initToasts, toast } from "./toast"
import type { Config, EngineEvent, TestResult } from "@/types"

type Page = "test" | "results" | "stats" | "settings";

/** Keys that should never be treated as test input. */
const IGNORED_KEYS = new Set([
  "Shift", "Control", "Alt", "Meta", "CapsLock", "NumLock", "ScrollLock",
  "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
  "Home", "End", "PageUp", "PageDown", "Insert", "Delete",
  "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",
  "Enter", "Escape", "Tab", "ContextMenu", "Pause", "PrintScreen",
])

export class App {
  private engine: TypingEngine
  private renderer: TestRenderer
  private commandLine: CommandLine
  private settingsPage: SettingsPage
  private statsPage: StatsPage

  private currentPage: Page = "test"
  /** Set when Tab is pressed, so Tab+Enter can restart. */
  private tabPressed = false
  private lastResult: TestResult | null = null

  private el: {
    pages: Record<string, HTMLElement>;
    words: HTMLElement;
    caret: HTMLElement;
    area: HTMLElement;
    liveTimer: HTMLElement;
    liveWpm: HTMLElement;
    liveAcc: HTMLElement;
    progressBar: HTMLElement;
    progressFill: HTMLElement;
    modeOptions: HTMLElement;
    quoteSource: HTMLElement;
    customPanel: HTMLElement;
    customInput: HTMLTextAreaElement;
    keyTip: HTMLElement;
    hiddenInput: HTMLInputElement;
    footerTheme: HTMLElement;
  }

  constructor() {
    this.el = this.queryElements()

    initToasts(this.must<HTMLElement>("#toast-stack"))

    this.engine = new TypingEngine({ ...configStore.get() })
    this.renderer = new TestRenderer(this.engine, {
      words: this.el.words,
      caret: this.el.caret,
      area: this.el.area,
    })

    this.commandLine = new CommandLine(
      this.must<HTMLElement>("#command-line"),
      this.must<HTMLInputElement>("#command-input"),
      this.must<HTMLElement>("#command-list"),
      () =>
        buildCommands({
          restart: () => this.restart(),
          navigate: (page) => this.navigate(page as Page),
          clearHistory: () => this.clearHistory(),
        })
    )

    this.settingsPage = new SettingsPage(this.must<HTMLElement>("#settings-content"))
    this.statsPage = new StatsPage(
      this.must<HTMLElement>("#stats-grid"),
      this.must<HTMLTableElement>("#pb-table"),
      this.must<HTMLTableElement>("#history-table")
    )

    this.bindEngine()
    this.bindConfig()
    this.bindKeyboard()
    this.bindClicks()

    this.applyConfig(configStore.get())
    this.renderer.renderWords()
    this.renderConfigBar()
    this.updateLiveStats()

    // Re-seat the caret when wrapping changes.
    window.addEventListener("resize", () => this.renderer.updateCaret())
  }

  /* ------------------------------------------------------------------ */
  /* DOM helpers                                                         */
  /* ------------------------------------------------------------------ */

  private must<T extends Element>(selector: string): T {
    const el = document.querySelector<T>(selector)
    if (!el) throw new Error(`Required element not found: ${selector}`)
    return el
  }

  private queryElements(): App["el"] {
    const pages: Record<string, HTMLElement> = {}
    for (const el of document.querySelectorAll<HTMLElement>("[data-page]")) {
      const name = el.dataset["page"]
      if (name) pages[name] = el
    }

    return {
      pages,
      words: this.must<HTMLElement>("#words"),
      caret: this.must<HTMLElement>("#caret"),
      area: this.must<HTMLElement>("#typing-area"),
      liveTimer: this.must<HTMLElement>("#live-timer"),
      liveWpm: this.must<HTMLElement>("#live-wpm"),
      liveAcc: this.must<HTMLElement>("#live-acc"),
      progressBar: this.must<HTMLElement>("#progress-bar"),
      progressFill: this.must<HTMLElement>("#progress-fill"),
      modeOptions: this.must<HTMLElement>("#mode-options"),
      quoteSource: this.must<HTMLElement>("#quote-source"),
      customPanel: this.must<HTMLElement>("#custom-text-panel"),
      customInput: this.must<HTMLTextAreaElement>("#custom-text-input"),
      keyTip: this.must<HTMLElement>("#key-tip"),
      hiddenInput: this.must<HTMLInputElement>("#hidden-input"),
      footerTheme: this.must<HTMLElement>("#footer-theme"),
    }
  }

  /* ------------------------------------------------------------------ */
  /* Engine wiring                                                       */
  /* ------------------------------------------------------------------ */

  private bindEngine(): void {
    this.engine.on((event: EngineEvent) => {
      switch (event.type) {
        case "start":
          this.setFocusMode(true)
          break

        case "input":
        case "wordAdvance":
          this.renderer.update()
          this.updateLiveStats()
          break

        case "tick":
          this.updateLiveStats()
          break

        case "finish":
          this.setFocusMode(false)
          this.onFinish(event.result)
          break

        case "restart":
          this.setFocusMode(false)
          this.renderer.renderWords()
          this.updateLiveStats()
          this.updateQuoteSource()
          break
      }
    })
  }

  private onFinish(input: Parameters<typeof resultStore.add>[0]): void {
    // A test with no meaningful input is discarded rather than recorded.
    if (input.chars.correct + input.chars.incorrect === 0) {
      toast("test discarded — nothing was typed")
      this.restart()
      return
    }

    const result = resultStore.add(input)
    this.lastResult = result
    const isPb = resultStore.isPersonalBest(result)

    this.renderResults(result, isPb)
    this.navigate("results")
  }

  private renderResults(result: TestResult, isPb: boolean): void {
    this.setText("#result-wpm", String(Math.round(result.wpm)))
    this.setText("#result-acc", `${Math.round(result.accuracy)}%`)
    this.setText("#result-raw", String(Math.round(result.raw)))
    this.setText("#result-consistency", `${Math.round(result.consistency)}%`)
    this.setText("#result-time", `${Math.round(result.duration)}s`)
    this.setText(
      "#result-type",
      describeMode(result.mode, result.mode2, result.punctuation, result.numbers)
    )
    this.setText(
      "#result-chars",
      `${result.chars.correct}/${result.chars.incorrect}/${result.chars.extra}/${result.chars.missed}`
    )

    const badge = this.must<HTMLElement>("#result-pb")
    badge.hidden = !isPb

    // The chart needs a laid-out canvas, so defer to the next frame.
    requestAnimationFrame(() => {
      const canvas = document.querySelector<HTMLCanvasElement>("#results-chart")
      if (canvas && result.samples.length > 1) {
        renderResultsChart(canvas, result.samples)
      }
    })
  }

  private setText(selector: string, text: string): void {
    const el = document.querySelector(selector)
    if (el) el.textContent = text
  }

  /* ------------------------------------------------------------------ */
  /* Config wiring                                                       */
  /* ------------------------------------------------------------------ */

  private bindConfig(): void {
    configStore.subscribe((config, changedKey) => {
      this.applyConfig(config)
      this.engine.updateConfig({ ...config })
      this.renderConfigBar()

      // Changes that alter the generated text require a fresh test.
      const regenerates: (keyof Config)[] = [
        "mode", "time", "words", "quoteLength", "language",
        "punctuation", "numbers", "customText",
      ]
      if (changedKey && regenerates.includes(changedKey)) {
        this.restart()
      } else {
        this.renderer.updateCaret()
      }
    })
  }

  private applyConfig(config: Readonly<Config>): void {
    const theme = applyTheme(config.theme)
    this.el.footerTheme.textContent = theme.label

    this.renderer.applyConfig(config as Config)

    soundManager.setEnabled(config.soundOnClick)
    soundManager.setVolume(config.soundVolume)

    this.el.keyTip.hidden = !config.showKeyTips
    this.el.customPanel.hidden = config.mode !== "custom"
    if (config.mode === "custom") {
      this.el.customInput.value = config.customText
    }

    this.updateLiveStats()
  }

  /** Dim the interface while a test is in progress. */
  private setFocusMode(active: boolean): void {
    const enabled = configStore.getValue("focusMode")
    document.body.classList.toggle("focus-mode", active && enabled)
  }

  /* ------------------------------------------------------------------ */
  /* Config bar                                                          */
  /* ------------------------------------------------------------------ */

  private renderConfigBar(): void {
    const config = configStore.get()

    for (const btn of document.querySelectorAll<HTMLElement>("[data-mode]")) {
      btn.classList.toggle("is-active", btn.dataset["mode"] === config.mode)
    }

    for (const btn of document.querySelectorAll<HTMLElement>("[data-config]")) {
      const key = btn.dataset["config"] as keyof Config
      const active = Boolean(config[key])
      btn.classList.toggle("is-active", active)
      btn.setAttribute("aria-pressed", String(active))
    }

    this.renderModeOptions(config)
  }

  /** The right-hand segment of the config bar depends on the active mode. */
  private renderModeOptions(config: Readonly<Config>): void {
    const container = this.el.modeOptions
    container.replaceChildren()

    const addButtons = <T extends string | number>(
      values: T[],
      current: T,
      onSelect: (value: T) => void
    ): void => {
      for (const value of values) {
        const btn = document.createElement("button")
        btn.className = `config-btn${value === current ? " is-active" : ""}`
        btn.textContent = String(value)
        btn.addEventListener("click", () => onSelect(value))
        container.appendChild(btn)
      }
    }

    switch (config.mode) {
      case "time":
        addButtons([15, 30, 60, 120], config.time, (v) =>
          configStore.set("time", v)
        )
        break

      case "words":
        addButtons([10, 25, 50, 100], config.words, (v) =>
          configStore.set("words", v)
        )
        break

      case "quote":
        addButtons(
          ["short", "medium", "long", "all"],
          config.quoteLength,
          (v) => configStore.set("quoteLength", v as Config["quoteLength"])
        )
        break

      default:
        // zen and custom have no extra options.
        break
    }
  }

  private updateQuoteSource(): void {
    const quote = this.engine.quote
    if (quote) {
      this.el.quoteSource.hidden = false
      this.el.quoteSource.textContent = `— ${quote.source}`
    } else {
      this.el.quoteSource.hidden = true
    }
  }

  /* ------------------------------------------------------------------ */
  /* Live stats                                                          */
  /* ------------------------------------------------------------------ */

  private updateLiveStats(): void {
    const config = configStore.get()
    const running = this.engine.status === "running"

    // Timer / progress readout
    if (config.mode === "time") {
      const remaining = this.engine.remaining ?? config.time
      this.el.liveTimer.textContent = String(Math.ceil(remaining))
      this.setProgress(1 - remaining / config.time, config)
    } else if (config.mode === "words" || config.mode === "quote" || config.mode === "custom") {
      const total = this.engine.words.length
      const done = this.engine.wordIndex
      this.el.liveTimer.textContent = total > 0 ? `${done}/${total}` : ""
      this.setProgress(total > 0 ? done / total : 0, config)
    } else {
      // Zen mode counts up rather than down.
      this.el.liveTimer.textContent = running
        ? String(Math.floor(this.engine.elapsed))
        : ""
      this.el.progressBar.hidden = true
    }

    this.el.liveWpm.textContent =
      config.showLiveWpm && running ? String(this.engine.liveWpm) : ""
    this.el.liveAcc.textContent =
      config.showLiveAccuracy && running ? `${this.engine.liveAccuracy}%` : ""
  }

  private setProgress(ratio: number, config: Readonly<Config>): void {
    const show = config.timerStyle === "bar"
    this.el.progressBar.hidden = !show
    if (show) {
      const pct = Math.min(Math.max(ratio, 0), 1) * 100
      this.el.progressFill.style.width = `${pct}%`
    }
    // In 'mini' style the numeric readout is de-emphasised.
    this.el.liveTimer.classList.toggle(
      "live-stat--secondary",
      config.timerStyle === "mini"
    )
  }

  /* ------------------------------------------------------------------ */
  /* Keyboard                                                            */
  /* ------------------------------------------------------------------ */

  private bindKeyboard(): void {
    document.addEventListener("keydown", (e) => this.onKeyDown(e))

    // Mobile keyboards do not emit usable keydown events, so mirror the
    // hidden input's value into the engine instead.
    this.el.hiddenInput.addEventListener("input", () => {
      const value = this.el.hiddenInput.value
      this.el.hiddenInput.value = ""
      for (const char of value) this.engine.input(char)
    })

    // Tapping the typing area focuses the hidden input on touch devices.
    this.el.area.addEventListener("click", () => {
      if (window.matchMedia("(pointer: coarse)").matches) {
        this.el.hiddenInput.focus()
      }
    })
  }

  private onKeyDown(e: KeyboardEvent): void {
    // The command line owns all input while it is open.
    if (this.commandLine.isOpen()) return

    // Command line: Esc, or Ctrl+Shift+P.
    if (e.key === "Escape" || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "p")) {
      e.preventDefault()
      this.commandLine.show()
      return
    }

    // Tab arms a restart; Enter confirms it.
    if (e.key === "Tab") {
      e.preventDefault()
      this.tabPressed = true
      return
    }

    if (this.tabPressed) {
      this.tabPressed = false
      if (e.key === "Enter") {
        e.preventDefault()
        this.restart()
        return
      }
    }

    // Typing is only accepted on the test page.
    if (this.currentPage !== "test") return

    // Never swallow browser/OS shortcuts.
    if (e.metaKey || e.altKey) return
    if (e.ctrlKey && e.key !== "Backspace") return

    if (e.key === "Backspace") {
      e.preventDefault()
      this.engine.backspace(e.ctrlKey)
      soundManager.click("key")
      return
    }

    if (IGNORED_KEYS.has(e.key)) return

    if (e.key.length === 1) {
      e.preventDefault()
      this.engine.input(e.key)
      soundManager.click("key")
    }
  }

  /* ------------------------------------------------------------------ */
  /* Clicks                                                              */
  /* ------------------------------------------------------------------ */

  private bindClicks(): void {
    document.addEventListener("click", (e) => {
      const target = e.target as HTMLElement

      const navEl = target.closest<HTMLElement>("[data-nav]")
      if (navEl) {
        e.preventDefault()
        this.navigate(navEl.dataset["nav"] as Page)
        return
      }

      const modeEl = target.closest<HTMLElement>("[data-mode]")
      if (modeEl) {
        configStore.set("mode", modeEl.dataset["mode"] as Config["mode"])
        return
      }

      const configEl = target.closest<HTMLElement>("[data-config]")
      if (configEl) {
        const key = configEl.dataset["config"] as keyof Config
        configStore.set(key, !configStore.getValue(key) as never)
        return
      }

      const actionEl = target.closest<HTMLElement>("[data-action]")
      if (actionEl) {
        this.handleAction(actionEl.dataset["action"] ?? "")
      }
    })
  }

  private handleAction(action: string): void {
    switch (action) {
      case "restart":
        this.restart()
        this.navigate("test")
        break

      case "repeat":
        // Replay the same words rather than generating new ones.
        this.navigate("test")
        this.engine.restart()
        break

      case "command-line":
        this.commandLine.show()
        break

      case "close-command-line":
        this.commandLine.close()
        break

      case "clear-history":
        this.clearHistory()
        break

      case "apply-custom": {
        const text = this.el.customInput.value.trim()
        if (text.length === 0) {
          toast("custom text cannot be empty", "error")
          return
        }
        configStore.set("customText", text)
        toast("custom text applied")
        break
      }
    }
  }

  private clearHistory(): void {
    if (!confirm("Delete all saved results? This cannot be undone.")) return
    resultStore.clear()
    this.statsPage.render()
    toast("history cleared")
  }

  /* ------------------------------------------------------------------ */
  /* Routing                                                             */
  /* ------------------------------------------------------------------ */

  navigate(page: Page): void {
    this.currentPage = page

    for (const [name, el] of Object.entries(this.el.pages)) {
      el.hidden = name !== page
    }

    for (const btn of document.querySelectorAll<HTMLElement>("[data-nav]")) {
      btn.classList.toggle("is-active", btn.dataset["nav"] === page)
    }

    if (page === "stats") this.statsPage.render()
    if (page === "settings") this.settingsPage.render()

    if (page !== "results") destroyChart()

    if (page === "test") {
      this.renderer.updateCaret()
    }
  }

  restart(): void {
    destroyChart()
    this.lastResult = null
    this.engine.restart()
    this.navigate("test")
  }

  /** Exposed for tests and debugging. */
  getLastResult(): TestResult | null {
    return this.lastResult
  }
}
