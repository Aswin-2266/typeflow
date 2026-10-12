import { describe, it, expect } from "vitest"
import { generateWords, tokenize, generateTest } from "@/engine/generator"
import { defaultConfig } from "@/state/config"
import type { Config } from "@/types"

/** Deterministic pseudo-random source so generator output is reproducible. */
function seededRng(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

const plain = { punctuation: false, numbers: false }

describe("generateWords", () => {
  it("produces exactly the requested count", () => {
    expect(generateWords(25, plain, seededRng(1))).toHaveLength(25)
    expect(generateWords(1, plain, seededRng(1))).toHaveLength(1)
    expect(generateWords(0, plain, seededRng(1))).toHaveLength(0)
  })

  it("produces only lowercase letters when no modifiers are active", () => {
    const words = generateWords(50, plain, seededRng(7))
    for (const word of words) {
      expect(word).toMatch(/^[a-zA-Z]+$/)
    }
  })

  it("is deterministic for a given seed", () => {
    expect(generateWords(20, plain, seededRng(42))).toEqual(
      generateWords(20, plain, seededRng(42))
    )
  })

  it("introduces punctuation when enabled", () => {
    const words = generateWords(
      200,
      { punctuation: true, numbers: false },
      seededRng(3)
    )
    const hasPunctuation = words.some((w) => /[.,!?;:'"()-]/.test(w))
    expect(hasPunctuation).toBe(true)
  })

  it("introduces digits when numbers are enabled", () => {
    const words = generateWords(
      200,
      { punctuation: false, numbers: true },
      seededRng(5)
    )
    expect(words.some((w) => /\d/.test(w))).toBe(true)
  })

  it("never emits an empty token", () => {
    const words = generateWords(
      300,
      { punctuation: true, numbers: true },
      seededRng(11)
    )
    for (const word of words) {
      expect(word.length).toBeGreaterThan(0)
    }
  })
})

describe("tokenize", () => {
  it("splits on whitespace", () => {
    expect(tokenize("one two three")).toEqual(["one", "two", "three"])
  })

  it("collapses repeated and mixed whitespace", () => {
    expect(tokenize("  one \n\t two   three  ")).toEqual(["one", "two", "three"])
  })

  it("returns an empty array for blank input", () => {
    expect(tokenize("")).toEqual([])
    expect(tokenize("   \n  ")).toEqual([])
  })
})

describe("generateTest", () => {
  const config = (overrides: Partial<Config>): Config => ({
    ...defaultConfig,
    ...overrides,
  })

  it("buffers generously for open-ended time mode", () => {
    const { words } = generateTest(config({ mode: "time", time: 30 }), seededRng(1))
    // Must outlast a fast typist for the full duration.
    expect(words.length).toBeGreaterThanOrEqual(100)
  })

  it("honours the exact word count in words mode", () => {
    const { words } = generateTest(config({ mode: "words", words: 25 }), seededRng(1))
    expect(words).toHaveLength(25)
  })

  it("returns a quote and its attribution in quote mode", () => {
    const result = generateTest(
      config({ mode: "quote", quoteLength: "all" }),
      seededRng(2)
    )
    expect(result.quote).toBeDefined()
    expect(result.quote?.source).toBeTruthy()
    expect(result.words.length).toBeGreaterThan(0)
  })

  it("returns no words for zen mode", () => {
    const { words } = generateTest(config({ mode: "zen" }), seededRng(1))
    expect(words).toEqual([])
  })

  it("uses the supplied custom text", () => {
    const { words } = generateTest(
      config({ mode: "custom", customText: "alpha beta gamma" }),
      seededRng(1)
    )
    expect(words).toEqual(["alpha", "beta", "gamma"])
  })

  it("falls back to generated words when custom text is blank", () => {
    const { words } = generateTest(
      config({ mode: "custom", customText: "   " }),
      seededRng(1)
    )
    expect(words.length).toBeGreaterThan(0)
  })
})
