/**
 * Typing statistics.
 *
 * All formulas here follow the long-standing conventions used by typing
 * tests, which in turn derive from the standard typing-industry definition
 * of a "word" as five keystrokes including spaces.
 */

import type { CharStats, TypedWord, WpmSample } from "@/types";

/** The industry-standard number of characters that constitutes one "word". */
export const CHARS_PER_WORD = 5;

/**
 * Net WPM — the headline number.
 *
 * Only correctly typed characters count toward the total, so errors
 * depress this figure directly.
 */
export function calculateWpm(correctChars: number, seconds: number): number {
  if (seconds <= 0) return 0;
  return (correctChars / CHARS_PER_WORD) * (60 / seconds);
}

/**
 * Raw WPM — every keystroke counts, correct or not.
 *
 * The gap between raw and net WPM is a direct measure of error cost.
 */
export function calculateRaw(totalChars: number, seconds: number): number {
  if (seconds <= 0) return 0;
  return (totalChars / CHARS_PER_WORD) * (60 / seconds);
}

/**
 * Accuracy as a percentage of all keystrokes that were correct.
 *
 * Extra characters count against accuracy; missed characters do not, since
 * they were never keyed.
 */
export function calculateAccuracy(stats: CharStats): number {
  const attempted = stats.correct + stats.incorrect + stats.extra;
  if (attempted === 0) return 100;
  return (stats.correct / attempted) * 100;
}

/**
 * Consistency, expressed as a percentage.
 *
 * Computed from the coefficient of variation (stddev / mean) of the
 * per-second raw WPM samples, mapped so that a perfectly even typing
 * rhythm scores 100 and an erratic one trends toward 0.
 *
 * Fewer than two samples cannot express variation, so we return 100.
 */
export function calculateConsistency(samples: WpmSample[]): number {
  const values = samples.map((s) => s.raw).filter((v) => v > 0);
  if (values.length < 2) return 100;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0;

  const variance =
    values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  const stddev = Math.sqrt(variance);
  const cv = stddev / mean;

  // Map CV onto 0-100. The exponential falloff keeps the scale meaningful:
  // a CV of 0 -> 100%, and larger deviations decay smoothly rather than
  // clipping hard at zero.
  return clamp(100 * Math.exp(-cv), 0, 100);
}

/** Tally character outcomes across every word in the test. */
export function tallyChars(words: TypedWord[]): CharStats {
  const stats: CharStats = { correct: 0, incorrect: 0, extra: 0, missed: 0 };

  for (const word of words) {
    for (const char of word.chars) {
      switch (char.state) {
        case "correct":
          stats.correct++;
          break;
        case "incorrect":
          stats.incorrect++;
          break;
        case "extra":
          stats.extra++;
          break;
        case "missed":
          stats.missed++;
          break;
        case "pending":
          break;
      }
    }
  }

  return stats;
}

/**
 * Count correct characters including the spaces between completed words.
 *
 * A space that successfully separates two words is a real keystroke and
 * counts toward WPM, which is why it is folded in here rather than being
 * tracked as a character slot.
 */
export function countCorrectWithSpaces(words: TypedWord[]): number {
  let correct = 0;
  let completedWords = 0;

  for (const word of words) {
    if (word.completed) completedWords++;
    for (const char of word.chars) {
      if (char.state === "correct") correct++;
    }
  }

  // n completed words implies n-1 interior spaces were keyed.
  return correct + Math.max(0, completedWords - 1);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Round to a fixed number of decimal places without floating-point drift. */
export function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
