/**
 * Test text generation.
 *
 * Produces the word sequence for a test given the active config. Handles
 * the punctuation and numbers modifiers, which wrap or replace words in a
 * generated stream.
 */

import { english200 } from "@/data/english-200"
import { quotesByLength, type Quote } from "@/data/quotes"
import type { Config } from "@/types"

/** How many words to generate up front for an open-ended (time) test. */
const TIME_MODE_BUFFER = 120
/** Top-up threshold: regenerate when fewer than this many words remain. */
export const REFILL_THRESHOLD = 25

function pick<T>(list: readonly T[], rng: () => number): T {
  // Non-null assertion is safe: callers always pass a non-empty list.
  return list[Math.floor(rng() * list.length)]!
}

/** Wrap a word in paired punctuation, or append terminal punctuation. */
function punctuate(word: string, rng: () => number, isFirst: boolean): string {
  const roll = rng()

  if (roll < 0.08) return `"${word}"`
  if (roll < 0.14) return `'${word}'`
  if (roll < 0.2) return `(${word})`
  if (roll < 0.26) return `${word},`
  if (roll < 0.32) return `${word}.`
  if (roll < 0.36) return `${word};`
  if (roll < 0.4) return `${word}:`
  if (roll < 0.44) return `${word}!`
  if (roll < 0.48) return `${word}?`
  if (roll < 0.52) return `${word}-${pick(english200, rng)}`

  // Capitalise sentence openings so punctuation mode reads naturally.
  if (isFirst || roll < 0.6) {
    return word.charAt(0).toUpperCase() + word.slice(1)
  }

  return word
}

/** Generate a number token of 1-4 digits. */
function numberToken(rng: () => number): string {
  const digits = 1 + Math.floor(rng() * 4)
  let out = ""
  for (let i = 0; i < digits; i++) {
    out += Math.floor(rng() * 10).toString()
  }
  return out
}

/**
 * Generate `count` words honouring the punctuation/numbers modifiers.
 */
export function generateWords(
  count: number,
  config: Pick<Config, "punctuation" | "numbers">,
  rng: () => number = Math.random
): string[] {
  const out: string[] = []
  let endedSentence = true

  for (let i = 0; i < count; i++) {
    // Numbers replace roughly one word in five when enabled.
    if (config.numbers && rng() < 0.2) {
      out.push(numberToken(rng))
      endedSentence = false
      continue
    }

    let word = pick(english200, rng)

    if (config.punctuation) {
      word = punctuate(word, rng, endedSentence)
      endedSentence = /[.!?]$/.test(word)
    }

    out.push(word)
  }

  return out
}

/** Split arbitrary text into typeable word tokens. */
export function tokenize(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((w) => w.length > 0)
}

export type GeneratedTest = {
  words: string[];
  /** Present only for quote mode, so the UI can attribute the source. */
  quote?: Quote;
};

/**
 * Build the full word list for a test from the active config.
 */
export function generateTest(
  config: Config,
  rng: () => number = Math.random
): GeneratedTest {
  switch (config.mode) {
    case "time":
      // Time mode is open-ended; buffer generously and top up as needed.
      return { words: generateWords(TIME_MODE_BUFFER, config, rng) }

    case "words":
      return { words: generateWords(config.words, config, rng) }

    case "quote": {
      const pool = quotesByLength(config.quoteLength)
      if (pool.length === 0) {
        return { words: generateWords(25, config, rng) }
      }
      const quote = pick(pool, rng)
      return { words: tokenize(quote.text), quote }
    }

    case "custom": {
      const words = tokenize(config.customText)
      return {
        words: words.length > 0 ? words : generateWords(25, config, rng),
      }
    }

    case "zen":
      // Zen mode has no target text; the user types freely until they stop.
      return { words: [] }

    default:
      return { words: generateWords(25, config, rng) }
  }
}
