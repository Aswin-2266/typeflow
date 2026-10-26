/**
 * Server-side plausibility checks for submitted results.
 *
 * The contract schema only validates shape. These checks reject payloads
 * whose numbers cannot have come from the typing engine, e.g. 400 WPM or an
 * accuracy that does not match the character tallies.
 *
 * Tolerances are deliberately generous: the engine rounds every figure to
 * two decimals, and net WPM counts inter-word spaces while raw WPM does not,
 * so net WPM can legitimately exceed raw WPM.
 */

import type { TestResultInput } from "./contract"

/** Well above the human world record (~305 WPM sustained). */
export const MAX_PLAUSIBLE_WPM = 350
/** Longest configurable test is 7200s; allow slack for zen/custom. */
export const MAX_PLAUSIBLE_DURATION = 3 * 60 * 60

/** Tests shorter than this are exempt from the absolute WPM cap. */
export const MIN_CAPPED_DURATION = 2

const CHARS_PER_WORD = 5

function nearlyEqual(actual: number, expected: number, relative: number, absolute: number): boolean {
  return Math.abs(actual - expected) <= Math.max(absolute, Math.abs(expected) * relative)
}

/** Returns a human-readable reason when implausible, or `null` when acceptable. */
export function checkResultPlausibility(result: TestResultInput): string | null {
  const { chars, duration, wpm, raw, accuracy, samples } = result

  if (duration <= 0 || duration > MAX_PLAUSIBLE_DURATION) {
    return "duration is out of range"
  }
  // Very short tests (e.g. a one-word test) legitimately produce extreme WPM
  // figures from the engine, so the absolute cap only applies to real runs.
  // Leaderboards should additionally require a minimum duration.
  if (duration >= MIN_CAPPED_DURATION && (wpm > MAX_PLAUSIBLE_WPM || raw > MAX_PLAUSIBLE_WPM)) {
    return "wpm exceeds the plausible maximum"
  }

  const typed = chars.correct + chars.incorrect + chars.extra
  const perMinute = 60 / duration

  // Raw WPM is derived directly from typed characters and duration.
  const expectedRaw = (typed / CHARS_PER_WORD) * perMinute
  // `duration` is rounded to 0.01s, so allow for that on very short tests.
  if (!nearlyEqual(raw, expectedRaw, 0.02 + 0.005 / duration, 1)) {
    return "raw wpm does not match character counts"
  }

  // Net WPM adds one space per completed word, which is never more than one
  // per character slot in the test.
  const maxNetChars = chars.correct + typed + chars.missed + 1
  if (wpm > (maxNetChars / CHARS_PER_WORD) * perMinute + 1) {
    return "wpm does not match character counts"
  }

  const expectedAccuracy = typed === 0 ? 100 : (chars.correct / typed) * 100
  if (!nearlyEqual(accuracy, expectedAccuracy, 0, 0.5)) {
    return "accuracy does not match character counts"
  }

  // One sample per elapsed second.
  if (samples.length > Math.ceil(duration) + 1) {
    return "too many samples for the test duration"
  }
  if (samples.some((s) => s.second > Math.ceil(duration) + 1)) {
    return "sample timestamps exceed the test duration"
  }

  return null
}
