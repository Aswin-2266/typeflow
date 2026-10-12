/**
 * The typing engine.
 *
 * A framework-agnostic state machine. It owns the authoritative test state
 * and emits events; it performs no DOM work of its own. This keeps the
 * engine fully unit-testable and lets the renderer be replaced without
 * touching any typing logic.
 */

import {
  calculateAccuracy,
  calculateConsistency,
  calculateRaw,
  calculateWpm,
  countCorrectWithSpaces,
  round,
  tallyChars,
} from "./stats"
import {
  REFILL_THRESHOLD,
  generateTest,
  generateWords,
  type GeneratedTest,
} from "./generator"
import type {
  Config,
  EngineEvent,
  EngineListener,
  TypedChar,
  TypedWord,
  WpmSample,
} from "@/types"
import type { TestResultInput } from "@shared/contract"

export type EngineStatus = "idle" | "running" | "finished";

/** Strip diacritics so lazy mode can compare base letters only. */
function normalizeLazy(ch: string): string {
  return ch.normalize("NFD").replace(/\p{Diacritic}/gu, "")
}

function makeWord(target: string): TypedWord {
  return {
    target,
    chars: [...target].map(
      (expected): TypedChar => ({ expected, typed: null, state: "pending" })
    ),
    completed: false,
    perfect: false,
  }
}

export class TypingEngine {
  private config: Config
  private listeners = new Set<EngineListener>()

  status: EngineStatus = "idle"
  words: TypedWord[] = []
  quote: GeneratedTest["quote"]

  /** Index of the word currently being typed. */
  wordIndex = 0
  /** Caret position within the active word. */
  charIndex = 0

  /** `performance.now()` at first keystroke. */
  private startTime = 0
  private endTime = 0
  private tickHandle: number | null = null

  /** One sample per elapsed second. */
  samples: WpmSample[] = []
  private lastSampleSecond = 0
  /** Running total of every keystroke, used for raw WPM. */
  private keystrokes = 0
  /** Keystroke count at the previous sample, for per-second deltas. */
  private keystrokesAtLastSample = 0

  constructor(config: Config) {
    this.config = config
    this.reset()
  }

  /* ---------------------------------------------------------------- */
  /* Subscription                                                      */
  /* ---------------------------------------------------------------- */

  on(listener: EngineListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit(event: EngineEvent): void {
    for (const listener of this.listeners) listener(event)
  }

  /* ---------------------------------------------------------------- */
  /* Lifecycle                                                         */
  /* ---------------------------------------------------------------- */

  updateConfig(config: Config): void {
    this.config = config
  }

  getConfig(): Config {
    return this.config
  }

  /** Tear down and regenerate the test from the current config. */
  reset(): void {
    this.stopTimer()

    const generated = generateTest(this.config)
    this.words = generated.words.map(makeWord)
    this.quote = generated.quote

    this.status = "idle"
    this.wordIndex = 0
    this.charIndex = 0
    this.startTime = 0
    this.endTime = 0
    this.samples = []
    this.lastSampleSecond = 0
    this.keystrokes = 0
    this.keystrokesAtLastSample = 0

    this.emit({ type: "restart" })
  }

  /** Regenerate with the same config — distinct from `reset` only in intent. */
  restart(): void {
    this.reset()
  }

  private start(): void {
    if (this.status !== "idle") return
    this.status = "running"
    this.startTime = performance.now()
    this.startTimer()
    this.emit({ type: "start" })
  }

  private startTimer(): void {
    this.stopTimer()
    this.tickHandle = window.setInterval(() => this.tick(), 100)
  }

  private stopTimer(): void {
    if (this.tickHandle !== null) {
      clearInterval(this.tickHandle)
      this.tickHandle = null
    }
  }

  /* ---------------------------------------------------------------- */
  /* Timing                                                            */
  /* ---------------------------------------------------------------- */

  get elapsed(): number {
    if (this.status === "idle") return 0
    const end = this.status === "finished" ? this.endTime : performance.now()
    return (end - this.startTime) / 1000
  }

  get remaining(): number | null {
    if (this.config.mode !== "time") return null
    return Math.max(0, this.config.time - this.elapsed)
  }

  private tick(): void {
    const elapsed = this.elapsed
    const second = Math.floor(elapsed)

    // Emit exactly one sample per whole second crossed.
    if (second > this.lastSampleSecond) {
      for (let s = this.lastSampleSecond + 1; s <= second; s++) {
        this.recordSample(s)
      }
      this.lastSampleSecond = second
    }

    this.emit({ type: "tick", elapsed, remaining: this.remaining })

    if (this.config.mode === "time" && elapsed >= this.config.time) {
      this.finish()
    }
  }

  private recordSample(second: number): void {
    const deltaKeystrokes = this.keystrokes - this.keystrokesAtLastSample
    this.keystrokesAtLastSample = this.keystrokes

    const chars = tallyChars(this.words)

    this.samples.push({
      second,
      // Net WPM is cumulative — it is the figure shown live.
      wpm: round(calculateWpm(countCorrectWithSpaces(this.words), second)),
      // Raw is instantaneous, which is what makes it useful for consistency.
      raw: round(calculateRaw(deltaKeystrokes, 1)),
      errors: chars.incorrect + chars.extra,
    })
  }

  /* ---------------------------------------------------------------- */
  /* Live figures                                                      */
  /* ---------------------------------------------------------------- */

  get liveWpm(): number {
    const seconds = this.elapsed
    if (seconds < 0.5) return 0
    return round(calculateWpm(countCorrectWithSpaces(this.words), seconds), 0)
  }

  get liveAccuracy(): number {
    return round(calculateAccuracy(tallyChars(this.words)), 0)
  }

  /** Words actually completed, for the `words`-mode progress indicator. */
  get completedWords(): number {
    return this.words.filter((w) => w.completed).length
  }

  /* ---------------------------------------------------------------- */
  /* Input handling                                                    */
  /* ---------------------------------------------------------------- */

  /** Feed a single printable character into the engine. */
  input(key: string): void {
    if (this.status === "finished") return
    if (key.length !== 1) return

    if (key === " ") {
      this.handleSpace()
      return
    }

    this.start()

    const word = this.words[this.wordIndex]
    if (!word) return

    this.keystrokes++

    if (this.charIndex < word.chars.length) {
      const slot = word.chars[this.charIndex]!
      const matches = this.compare(key, slot.expected)

      slot.typed = key
      slot.state = matches ? "correct" : "incorrect"

      // stopOnError=letter refuses to advance past a wrong character.
      if (!matches && this.config.stopOnError === "letter") {
        slot.typed = null
        slot.state = "pending"
        this.emit({ type: "input" })
        return
      }

      this.charIndex++
    } else {
      // Typed past the end of the word — record an insertion.
      word.chars.push({ expected: "", typed: key, state: "extra" })
      this.charIndex++
    }

    this.emit({ type: "input" })
    this.checkCompletion()
  }

  /** Compare a typed character against the expected one. */
  private compare(typed: string, expected: string): boolean {
    if (this.config.lazyMode) {
      return normalizeLazy(typed).toLowerCase() === normalizeLazy(expected).toLowerCase()
    }
    return typed === expected
  }

  private handleSpace(): void {
    // A leading space before any input is ignored rather than starting the test.
    if (this.status === "idle" && this.charIndex === 0) return

    this.start()

    const word = this.words[this.wordIndex]
    if (!word) return

    // Ignore a space at the very start of a word — nothing to submit.
    if (this.charIndex === 0) return

    // stopOnError=word blocks advancing while the word is wrong.
    if (this.config.stopOnError === "word" && !this.isWordCorrect(word)) {
      return
    }

    this.keystrokes++

    // Any unreached characters in this word are now permanently missed.
    for (let i = this.charIndex; i < word.chars.length; i++) {
      const slot = word.chars[i]!
      if (slot.state === "pending") slot.state = "missed"
    }

    word.completed = true
    word.perfect = word.chars.every((c) => c.state === "correct")

    this.wordIndex++
    this.charIndex = 0

    this.emit({ type: "wordAdvance", index: this.wordIndex })

    this.refillIfNeeded()
    this.checkCompletion()
  }

  private isWordCorrect(word: TypedWord): boolean {
    if (this.charIndex < word.chars.length) return false
    return word.chars.every((c) => c.state === "correct")
  }

  /** Handle backspace, honouring confidence mode. */
  backspace(ctrl = false): void {
    if (this.status === "finished") return
    if (this.config.confidenceMode === "max") return

    if (this.charIndex === 0) {
      // Crossing back into the previous word is blocked in confidence mode.
      if (this.config.confidenceMode === "on") return
      if (this.wordIndex === 0) return

      const prev = this.words[this.wordIndex - 1]
      if (!prev) return

      // Only allow returning to a word that was left imperfect.
      if (prev.perfect) return

      this.wordIndex--
      prev.completed = false

      // Drop trailing insertions, then restore missed slots to pending.
      while (prev.chars.length > prev.target.length) prev.chars.pop()
      for (const slot of prev.chars) {
        if (slot.state === "missed") slot.state = "pending"
      }

      this.charIndex = prev.chars.findIndex((c) => c.state === "pending")
      if (this.charIndex === -1) this.charIndex = prev.chars.length

      this.emit({ type: "input" })
      return
    }

    const word = this.words[this.wordIndex]
    if (!word) return

    const deleteCount = ctrl ? this.charIndex : 1

    for (let i = 0; i < deleteCount; i++) {
      if (this.charIndex === 0) break
      this.charIndex--

      const slot = word.chars[this.charIndex]
      if (!slot) continue

      if (slot.state === "extra") {
        word.chars.splice(this.charIndex, 1)
      } else {
        slot.typed = null
        slot.state = "pending"
      }
    }

    this.emit({ type: "input" })
  }

  /* ---------------------------------------------------------------- */
  /* Completion                                                        */
  /* ---------------------------------------------------------------- */

  /** Keep an open-ended time test supplied with words. */
  private refillIfNeeded(): void {
    if (this.config.mode !== "time") return
    if (this.words.length - this.wordIndex > REFILL_THRESHOLD) return

    const more = generateWords(60, this.config)
    this.words.push(...more.map(makeWord))
  }

  private checkCompletion(): void {
    if (this.config.mode === "time" || this.config.mode === "zen") return

    // Finished once the final word is submitted.
    if (this.wordIndex >= this.words.length) {
      this.finish()
      return
    }

    // Also finish when the last word is fully typed correctly, so the user
    // need not press a trailing space.
    const isLastWord = this.wordIndex === this.words.length - 1
    if (isLastWord) {
      const word = this.words[this.wordIndex]!
      if (
        this.charIndex === word.chars.length &&
        word.chars.every((c) => c.state === "correct")
      ) {
        this.finish()
      }
    }
  }

  finish(): void {
    if (this.status === "finished") return

    this.stopTimer()
    this.endTime = performance.now()
    this.status = "finished"

    // Close out the word in progress so its stats are counted.
    const current = this.words[this.wordIndex]
    if (current && this.charIndex > 0 && !current.completed) {
      current.completed = true
      current.perfect = current.chars.every((c) => c.state === "correct")
    }

    this.emit({ type: "finish", result: this.buildResult() })
  }

  private buildResult(): TestResultInput {
    const seconds = Math.max(this.elapsed, 0.01)
    const chars = tallyChars(this.words)
    const correct = countCorrectWithSpaces(this.words)
    const total = chars.correct + chars.incorrect + chars.extra

    return {
      wpm: round(calculateWpm(correct, seconds)),
      raw: round(calculateRaw(total, seconds)),
      accuracy: round(calculateAccuracy(chars)),
      consistency: round(calculateConsistency(this.samples)),
      mode: this.config.mode,
      mode2: this.resolveMode2(),
      language: this.config.language,
      duration: round(seconds),
      punctuation: this.config.punctuation,
      numbers: this.config.numbers,
      chars,
      samples: this.samples,
    }
  }

  /** The mode's parameter, as a string — "30" for time, "50" for words, etc. */
  private resolveMode2(): string {
    switch (this.config.mode) {
      case "time":
        return String(this.config.time)
      case "words":
        return String(this.config.words)
      case "quote":
        return this.config.quoteLength
      default:
        return "custom"
    }
  }

  destroy(): void {
    this.stopTimer()
    this.listeners.clear()
  }
}
