import { describe, it, expect, beforeEach, vi } from "vitest"
import { TypingEngine } from "@/engine/engine"
import { defaultConfig } from "@/state/config"
import type { Config } from "@/types"

function makeEngine(overrides: Partial<Config> = {}): TypingEngine {
  const engine = new TypingEngine({ ...defaultConfig, ...overrides })
  return engine
}

/** Drive a fixed word list into the engine, bypassing random generation. */
function seedWords(engine: TypingEngine, words: string[]): void {
  engine.words = words.map((target) => ({
    target,
    chars: [...target].map((expected) => ({
      expected,
      typed: null,
      state: "pending" as const,
    })),
    completed: false,
    perfect: false,
  }))
  engine.wordIndex = 0
  engine.charIndex = 0
}

function type(engine: TypingEngine, text: string): void {
  for (const char of text) engine.input(char)
}

beforeEach(() => {
  vi.useRealTimers()
})

describe("character input", () => {
  it("marks a matching character correct", () => {
    const engine = makeEngine()
    seedWords(engine, ["cat"])

    engine.input("c")

    expect(engine.words[0]!.chars[0]!.state).toBe("correct")
    expect(engine.charIndex).toBe(1)
  })

  it("marks a mismatched character incorrect but still advances", () => {
    const engine = makeEngine()
    seedWords(engine, ["cat"])

    engine.input("x")

    expect(engine.words[0]!.chars[0]!.state).toBe("incorrect")
    expect(engine.words[0]!.chars[0]!.typed).toBe("x")
    expect(engine.charIndex).toBe(1)
  })

  it("records characters typed past the end of a word as extra", () => {
    const engine = makeEngine()
    seedWords(engine, ["ab"])

    type(engine, "abcd")

    const chars = engine.words[0]!.chars
    expect(chars).toHaveLength(4)
    expect(chars[2]!.state).toBe("extra")
    expect(chars[3]!.state).toBe("extra")
  })

  it("starts the test on the first keystroke", () => {
    const engine = makeEngine()
    seedWords(engine, ["cat"])

    expect(engine.status).toBe("idle")
    engine.input("c")
    expect(engine.status).toBe("running")
  })

  it("ignores multi-character key names", () => {
    const engine = makeEngine()
    seedWords(engine, ["cat"])

    engine.input("Shift")

    expect(engine.charIndex).toBe(0)
    expect(engine.status).toBe("idle")
  })
})

describe("word advance", () => {
  it("advances to the next word on space", () => {
    const engine = makeEngine()
    seedWords(engine, ["ab", "cd"])

    type(engine, "ab ")

    expect(engine.wordIndex).toBe(1)
    expect(engine.charIndex).toBe(0)
    expect(engine.words[0]!.completed).toBe(true)
    expect(engine.words[0]!.perfect).toBe(true)
  })

  it("marks unreached characters as missed when advancing early", () => {
    const engine = makeEngine()
    seedWords(engine, ["abcd", "ef"])

    type(engine, "ab ")

    const chars = engine.words[0]!.chars
    expect(chars[2]!.state).toBe("missed")
    expect(chars[3]!.state).toBe("missed")
  })

  it("ignores a leading space before any input", () => {
    const engine = makeEngine()
    seedWords(engine, ["ab", "cd"])

    engine.input(" ")

    expect(engine.status).toBe("idle")
    expect(engine.wordIndex).toBe(0)
  })

  it("ignores a space at the start of a word", () => {
    const engine = makeEngine()
    seedWords(engine, ["ab", "cd"])

    type(engine, "ab ")
    engine.input(" ")

    expect(engine.wordIndex).toBe(1)
  })
})

describe("backspace", () => {
  it("clears the previous character back to pending", () => {
    const engine = makeEngine()
    seedWords(engine, ["cat"])

    type(engine, "ca")
    engine.backspace()

    expect(engine.charIndex).toBe(1)
    expect(engine.words[0]!.chars[1]!.state).toBe("pending")
    expect(engine.words[0]!.chars[1]!.typed).toBeNull()
  })

  it("removes extra characters entirely", () => {
    const engine = makeEngine()
    seedWords(engine, ["ab"])

    type(engine, "abc")
    expect(engine.words[0]!.chars).toHaveLength(3)

    engine.backspace()
    expect(engine.words[0]!.chars).toHaveLength(2)
  })

  it("deletes the whole word with ctrl", () => {
    const engine = makeEngine()
    seedWords(engine, ["hello"])

    type(engine, "hell")
    engine.backspace(true)

    expect(engine.charIndex).toBe(0)
    expect(engine.words[0]!.chars.every((c) => c.state === "pending")).toBe(true)
  })

  it("returns to a previous word that was left imperfect", () => {
    const engine = makeEngine()
    seedWords(engine, ["abc", "de"])

    type(engine, "ax ")
    expect(engine.wordIndex).toBe(1)

    engine.backspace()

    expect(engine.wordIndex).toBe(0)
    expect(engine.words[0]!.completed).toBe(false)
  })

  it("refuses to return to a perfectly typed word", () => {
    const engine = makeEngine()
    seedWords(engine, ["ab", "cd"])

    type(engine, "ab ")
    engine.backspace()

    expect(engine.wordIndex).toBe(1)
  })

  it("does nothing at the very start of the test", () => {
    const engine = makeEngine()
    seedWords(engine, ["ab"])

    engine.backspace()

    expect(engine.wordIndex).toBe(0)
    expect(engine.charIndex).toBe(0)
  })
})

describe("confidence mode", () => {
  it("off: allows crossing back into the previous word", () => {
    const engine = makeEngine({ confidenceMode: "off" })
    seedWords(engine, ["abc", "de"])

    type(engine, "ax ")
    engine.backspace()

    expect(engine.wordIndex).toBe(0)
  })

  it("on: blocks crossing back but allows in-word backspace", () => {
    const engine = makeEngine({ confidenceMode: "on" })
    seedWords(engine, ["abc", "de"])

    type(engine, "ax ")
    engine.backspace()
    expect(engine.wordIndex).toBe(1)

    type(engine, "d")
    engine.backspace()
    expect(engine.charIndex).toBe(0)
  })

  it("max: blocks backspace entirely", () => {
    const engine = makeEngine({ confidenceMode: "max" })
    seedWords(engine, ["abc"])

    type(engine, "ab")
    engine.backspace()

    expect(engine.charIndex).toBe(2)
  })
})

describe("stop on error", () => {
  it("letter: refuses to accept a wrong character", () => {
    const engine = makeEngine({ stopOnError: "letter" })
    seedWords(engine, ["cat"])

    engine.input("x")

    expect(engine.charIndex).toBe(0)
    expect(engine.words[0]!.chars[0]!.state).toBe("pending")
  })

  it("word: refuses to advance past an incorrect word", () => {
    const engine = makeEngine({ stopOnError: "word" })
    seedWords(engine, ["abc", "de"])

    type(engine, "axc ")

    expect(engine.wordIndex).toBe(0)
  })

  it("word: allows advancing once the word is correct", () => {
    const engine = makeEngine({ stopOnError: "word" })
    seedWords(engine, ["abc", "de"])

    type(engine, "abc ")

    expect(engine.wordIndex).toBe(1)
  })
})

describe("lazy mode", () => {
  it("accepts a plain letter for an accented one", () => {
    const engine = makeEngine({ lazyMode: true })
    seedWords(engine, ["café"])

    type(engine, "cafe")

    expect(engine.words[0]!.chars.every((c) => c.state === "correct")).toBe(true)
  })

  it("rejects the same input when lazy mode is off", () => {
    const engine = makeEngine({ lazyMode: false })
    seedWords(engine, ["café"])

    type(engine, "cafe")

    expect(engine.words[0]!.chars[3]!.state).toBe("incorrect")
  })
})

describe("completion", () => {
  it("finishes when the last word is typed correctly", () => {
    const engine = makeEngine({ mode: "words", words: 2 })
    seedWords(engine, ["ab", "cd"])

    type(engine, "ab cd")

    expect(engine.status).toBe("finished")
  })

  it("finishes when the final space is pressed", () => {
    const engine = makeEngine({ mode: "words", words: 2 })
    seedWords(engine, ["ab", "cd"])

    type(engine, "ab cx ")

    expect(engine.status).toBe("finished")
  })

  it("emits a result with the expected shape", () => {
    const engine = makeEngine({ mode: "words", words: 1 })
    seedWords(engine, ["ab"])

    const finish = vi.fn()
    engine.on((e) => {
      if (e.type === "finish") finish(e.result)
    })

    type(engine, "ab")

    expect(finish).toHaveBeenCalledOnce()
    const result = finish.mock.calls[0]![0]
    expect(result).toMatchObject({
      mode: "words",
      mode2: "1",
      punctuation: false,
      numbers: false,
    })
    expect(result.wpm).toBeGreaterThanOrEqual(0)
    expect(result.accuracy).toBeGreaterThanOrEqual(0)
    expect(result.accuracy).toBeLessThanOrEqual(100)
  })

  it("keeps zen and custom result metadata distinct", () => {
    for (const mode of ["zen", "custom"] as const) {
      const engine = makeEngine({ mode })
      seedWords(engine, ["ab"])
      const finish = vi.fn()
      engine.on((event) => {
        if (event.type === "finish") finish(event.result)
      })

      engine.finish()

      expect(finish).toHaveBeenCalledWith(expect.objectContaining({ mode, mode2: mode }))
    }
  })

  it("does not finish early in time mode", () => {
    const engine = makeEngine({ mode: "time", time: 30 })
    seedWords(engine, ["ab", "cd"])

    type(engine, "ab cd ")

    expect(engine.status).toBe("running")
    engine.destroy()
  })

  it("ignores input after finishing", () => {
    const engine = makeEngine({ mode: "words", words: 1 })
    seedWords(engine, ["ab"])

    type(engine, "ab")
    const before = engine.charIndex
    engine.input("z")

    expect(engine.charIndex).toBe(before)
  })
})

describe("reset", () => {
  it("returns the engine to a clean idle state", () => {
    const engine = makeEngine({ mode: "words", words: 5 })
    seedWords(engine, ["ab", "cd"])

    type(engine, "ab c")
    engine.reset()

    expect(engine.status).toBe("idle")
    expect(engine.wordIndex).toBe(0)
    expect(engine.charIndex).toBe(0)
    expect(engine.samples).toEqual([])
  })

  it("notifies subscribers", () => {
    const engine = makeEngine()
    const listener = vi.fn()
    engine.on(listener)

    engine.reset()

    expect(listener).toHaveBeenCalledWith({ type: "restart" })
  })
})

describe("subscriptions", () => {
  it("stops delivering events after unsubscribe", () => {
    const engine = makeEngine()
    seedWords(engine, ["ab"])

    const listener = vi.fn()
    const unsubscribe = engine.on(listener)

    engine.input("a")
    const callsBefore = listener.mock.calls.length

    unsubscribe()
    engine.input("b")

    expect(listener.mock.calls.length).toBe(callsBefore)
  })
})
