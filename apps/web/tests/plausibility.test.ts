import { describe, it, expect } from "vitest"
import { checkResultPlausibility } from "@typeflow/shared/plausibility"
import {
  calculateAccuracy,
  calculateRaw,
  calculateWpm,
  round,
} from "@/engine/stats"
import type { CharStats, TestResultInput } from "@/types"

/** Build a result exactly the way `TypingEngine.buildResult` does. */
function engineResult(chars: CharStats, seconds: number, completedWords: number): TestResultInput {
  const total = chars.correct + chars.incorrect + chars.extra
  const correctWithSpaces = chars.correct + Math.max(0, completedWords - 1)
  const samples = Array.from({ length: Math.floor(seconds) }, (_, i) => ({
    second: i + 1,
    wpm: 60,
    raw: 65,
    errors: 0,
  }))

  return {
    wpm: round(calculateWpm(correctWithSpaces, seconds)),
    raw: round(calculateRaw(total, seconds)),
    accuracy: round(calculateAccuracy(chars)),
    consistency: 90,
    mode: "time",
    mode2: "30",
    language: "english",
    duration: round(seconds),
    punctuation: false,
    numbers: false,
    chars,
    samples,
  }
}

describe("checkResultPlausibility — genuine results", () => {
  it("accepts a typical 30s test", () => {
    const r = engineResult({ correct: 200, incorrect: 4, extra: 1, missed: 2 }, 30, 40)
    expect(checkResultPlausibility(r)).toBeNull()
  })

  it("accepts a very short test with a single character", () => {
    const r = engineResult({ correct: 1, incorrect: 0, extra: 0, missed: 0 }, 0.013, 1)
    expect(checkResultPlausibility(r)).toBeNull()
  })

  it("accepts randomized engine-shaped results", () => {
    let seed = 42
    const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31)

    for (let i = 0; i < 2000; i++) {
      const seconds = 0.5 + rand() * 600
      // Up to ~200 WPM gross.
      const typed = Math.floor(rand() * seconds * 17)
      const incorrect = Math.floor(typed * rand() * 0.2)
      const extra = Math.floor((typed - incorrect) * rand() * 0.05)
      const correct = typed - incorrect - extra
      const words = Math.floor(correct / 5)
      const chars = { correct, incorrect, extra, missed: Math.floor(rand() * 10) }

      const r = engineResult(chars, seconds, words)
      expect(checkResultPlausibility(r), JSON.stringify(r)).toBeNull()
    }
  })
})

describe("checkResultPlausibility — real engine output", () => {
  it("accepts a result produced by TypingEngine.finish()", async () => {
    const { TypingEngine } = await import("@/engine/engine")
    const { defaultConfig } = await import("@/state/config")
    const engine = new TypingEngine({ ...defaultConfig, mode: "words", words: 3 })
    let result: TestResultInput | null = null
    engine.on((event) => {
      if (event.type === "finish") result = event.result
    })

    engine.words = ["the", "cat", "sat"].map((target) => ({
      target,
      chars: [...target].map((expected) => ({ expected, typed: null, state: "pending" as const })),
      completed: false,
      perfect: false,
    }))
    engine.wordIndex = 0
    engine.charIndex = 0
    for (const ch of "the cxt sat") engine.input(ch)
    engine.finish()

    expect(result).not.toBeNull()
    expect(checkResultPlausibility(result!)).toBeNull()
  })
})

describe("checkResultPlausibility — forged results", () => {
  const base = engineResult({ correct: 200, incorrect: 4, extra: 0, missed: 0 }, 30, 40)

  it("rejects superhuman wpm", () => {
    expect(checkResultPlausibility({ ...base, wpm: 400, raw: 400 })).toMatch(/plausible maximum/)
  })

  it("rejects wpm inflated beyond the character counts", () => {
    expect(checkResultPlausibility({ ...base, wpm: 200 })).toMatch(/wpm does not match/)
  })

  it("rejects raw wpm that does not match the counts", () => {
    expect(checkResultPlausibility({ ...base, raw: 150 })).toMatch(/raw wpm/)
  })

  it("rejects accuracy that does not match the counts", () => {
    expect(checkResultPlausibility({ ...base, accuracy: 100 })).toMatch(/accuracy/)
  })

  it("rejects zero or excessive durations", () => {
    expect(checkResultPlausibility({ ...base, duration: 0 })).toMatch(/duration/)
    expect(checkResultPlausibility({ ...base, duration: 999_999 })).toMatch(/duration/)
  })

  it("rejects more samples than elapsed seconds", () => {
    const samples = Array.from({ length: 500 }, (_, i) => ({ second: i + 1, wpm: 1, raw: 1, errors: 0 }))
    expect(checkResultPlausibility({ ...base, samples })).toMatch(/samples/)
  })
})
