import { describe, expect, it } from "vitest"
import { parseStoredResults } from "@/state/resultValidation"
import type { TestResult } from "@/types"

const validResult: TestResult = {
  id: "result-1",
  timestamp: 1_700_000_000_000,
  wpm: 80,
  raw: 84,
  accuracy: 97,
  consistency: 92,
  mode: "time",
  mode2: "30",
  language: "english",
  duration: 30,
  punctuation: false,
  numbers: false,
  chars: { correct: 200, incorrect: 4, extra: 0, missed: 1 },
  samples: [{ second: 1, wpm: 80, raw: 84, errors: 1 }],
}

describe("stored result validation", () => {
  it("keeps complete results", () => {
    expect(parseStoredResults([validResult])).toEqual([validResult])
  })

  it("drops partial and malformed history entries", () => {
    expect(
      parseStoredResults([
        validResult,
        { id: "partial", wpm: 100 },
        { ...validResult, accuracy: Number.NaN },
        null,
      ])
    ).toEqual([validResult])
  })

  it("returns an empty history for non-array storage", () => {
    expect(parseStoredResults({ result: validResult })).toEqual([])
  })
})
