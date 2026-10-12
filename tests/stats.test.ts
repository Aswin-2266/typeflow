import { describe, it, expect } from "vitest";
import {
  calculateWpm,
  calculateRaw,
  calculateAccuracy,
  calculateConsistency,
  tallyChars,
  countCorrectWithSpaces,
  round,
  CHARS_PER_WORD,
} from "@/engine/stats";
import type { TypedWord, WpmSample } from "@/types";

function word(target: string, states: string[]): TypedWord {
  return {
    target,
    chars: [...target].map((expected, i) => ({
      expected,
      typed: expected,
      state: (states[i] ?? "pending") as TypedWord["chars"][number]["state"],
    })),
    completed: true,
    perfect: states.every((s) => s === "correct"),
  };
}

describe("calculateWpm", () => {
  it("treats five characters as one word", () => {
    // 50 chars in 60s => 10 words in 1 minute => 10 wpm
    expect(calculateWpm(50, 60)).toBe(10);
  });

  it("scales to a full minute from a partial one", () => {
    // 25 chars in 30s => 5 words in half a minute => 10 wpm
    expect(calculateWpm(25, 30)).toBe(10);
  });

  it("returns zero for non-positive durations", () => {
    expect(calculateWpm(100, 0)).toBe(0);
    expect(calculateWpm(100, -5)).toBe(0);
  });

  it("uses the documented characters-per-word constant", () => {
    expect(CHARS_PER_WORD).toBe(5);
  });
});

describe("calculateRaw", () => {
  it("counts every keystroke regardless of correctness", () => {
    expect(calculateRaw(100, 60)).toBe(20);
  });

  it("is never lower than net wpm for the same duration", () => {
    const correct = 40;
    const total = 50;
    expect(calculateRaw(total, 60)).toBeGreaterThan(calculateWpm(correct, 60));
  });
});

describe("calculateAccuracy", () => {
  it("returns 100 when nothing has been typed", () => {
    expect(calculateAccuracy({ correct: 0, incorrect: 0, extra: 0, missed: 0 })).toBe(100);
  });

  it("computes the correct percentage", () => {
    expect(
      calculateAccuracy({ correct: 90, incorrect: 10, extra: 0, missed: 0 })
    ).toBe(90);
  });

  it("counts extra characters against accuracy", () => {
    expect(
      calculateAccuracy({ correct: 90, incorrect: 0, extra: 10, missed: 0 })
    ).toBe(90);
  });

  it("ignores missed characters, which were never keyed", () => {
    expect(
      calculateAccuracy({ correct: 100, incorrect: 0, extra: 0, missed: 50 })
    ).toBe(100);
  });
});

describe("calculateConsistency", () => {
  it("returns 100 for a perfectly even rhythm", () => {
    const samples: WpmSample[] = [1, 2, 3, 4].map((second) => ({
      second,
      wpm: 60,
      raw: 60,
      errors: 0,
    }));
    expect(calculateConsistency(samples)).toBe(100);
  });

  it("returns 100 when there is too little data to vary", () => {
    expect(calculateConsistency([])).toBe(100);
    expect(calculateConsistency([{ second: 1, wpm: 50, raw: 50, errors: 0 }])).toBe(100);
  });

  it("scores an erratic rhythm below a steady one", () => {
    const steady: WpmSample[] = [60, 62, 58, 61].map((raw, i) => ({
      second: i + 1,
      wpm: raw,
      raw,
      errors: 0,
    }));
    const erratic: WpmSample[] = [20, 120, 15, 130].map((raw, i) => ({
      second: i + 1,
      wpm: raw,
      raw,
      errors: 0,
    }));

    expect(calculateConsistency(steady)).toBeGreaterThan(
      calculateConsistency(erratic)
    );
  });

  it("always produces a value within 0-100", () => {
    const wild: WpmSample[] = [1, 500, 2, 400, 3].map((raw, i) => ({
      second: i + 1,
      wpm: raw,
      raw,
      errors: 0,
    }));
    const value = calculateConsistency(wild);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(100);
  });
});

describe("tallyChars", () => {
  it("counts each character state across all words", () => {
    const words = [
      word("abc", ["correct", "correct", "incorrect"]),
      word("de", ["correct", "missed"]),
    ];
    const stats = tallyChars(words);

    expect(stats.correct).toBe(3);
    expect(stats.incorrect).toBe(1);
    expect(stats.missed).toBe(1);
    expect(stats.extra).toBe(0);
  });
});

describe("countCorrectWithSpaces", () => {
  it("adds the interior spaces between completed words", () => {
    const words = [
      word("ab", ["correct", "correct"]),
      word("cd", ["correct", "correct"]),
    ];
    // 4 correct chars + 1 space between two completed words
    expect(countCorrectWithSpaces(words)).toBe(5);
  });

  it("does not add a space for a single word", () => {
    expect(countCorrectWithSpaces([word("ab", ["correct", "correct"])])).toBe(2);
  });
});

describe("round", () => {
  it("rounds to two decimals by default", () => {
    expect(round(1.23456)).toBe(1.23);
  });

  it("honours an explicit precision", () => {
    expect(round(1.23456, 3)).toBe(1.235);
    expect(round(1.9, 0)).toBe(2);
  });
});
