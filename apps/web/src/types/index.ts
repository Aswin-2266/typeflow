/**
 * Client-side domain types.
 *
 * Types that cross the network boundary live in `packages/shared/src/contract.ts` and are
 * re-exported here so UI code has a single import site.
 */

export type {
  TestMode,
  TestResult,
  TestResultInput,
  PersonalBest,
  UserStats,
  WpmSample,
  CharStats,
} from "@typeflow/shared/contract"

/* -------------------------------------------------------------------------- */
/* Character-level model                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The state of a single character slot in the test.
 *
 * - `pending`   not yet reached
 * - `correct`   typed and matched
 * - `incorrect` typed and did not match
 * - `extra`     typed beyond the end of the word (insertion)
 * - `missed`    skipped because the user advanced with space early
 */
export type CharState = "pending" | "correct" | "incorrect" | "extra" | "missed";

export type TypedChar = {
  /** The expected character. Empty string for `extra` slots. */
  expected: string;
  /** What the user actually typed. `null` while pending. */
  typed: string | null;
  state: CharState;
};

export type TypedWord = {
  /** The target word as generated. */
  target: string;
  chars: TypedChar[];
  /** True once the user has advanced past this word. */
  completed: boolean;
  /** True if every char is `correct` and there are no extras/missed. */
  perfect: boolean;
};

/* -------------------------------------------------------------------------- */
/* Configuration                                                               */
/* -------------------------------------------------------------------------- */

export type CaretStyle = "off" | "line" | "block" | "outline" | "underline";
export type ConfidenceMode = "off" | "on" | "max";
export type TimerStyle = "bar" | "text" | "mini";
export type QuoteLength = "short" | "medium" | "long" | "all";

export type Config = {
  mode: import("@typeflow/shared/contract").TestMode;
  /** Seconds for `time` mode. */
  time: number;
  /** Word count for `words` mode. */
  words: number;
  quoteLength: QuoteLength;
  language: string;

  punctuation: boolean;
  numbers: boolean;

  /** Hide correctness feedback entirely while typing. */
  blindMode: boolean;
  /** Abort or halt the test on the first error. */
  stopOnError: "off" | "word" | "letter";
  /** `on` disables backspace within a word; `max` disables it entirely. */
  confidenceMode: ConfidenceMode;
  /** Ignore accents/diacritics when comparing characters. */
  lazyMode: boolean;
  /** Dim everything except the active line while typing. */
  focusMode: boolean;

  caretStyle: CaretStyle;
  smoothCaret: boolean;
  timerStyle: TimerStyle;
  showLiveWpm: boolean;
  showLiveAccuracy: boolean;
  showKeyTips: boolean;

  fontSize: number;
  fontFamily: string;
  theme: string;
  soundOnClick: boolean;
  soundVolume: number;

  /** Custom text for `custom` mode. */
  customText: string;
};

/* -------------------------------------------------------------------------- */
/* Engine events                                                               */
/* -------------------------------------------------------------------------- */

export type EngineEvent =
  | { type: "start" }
  | { type: "input" }
  | { type: "wordAdvance"; index: number }
  | { type: "tick"; elapsed: number; remaining: number | null }
  | { type: "finish"; result: import("@typeflow/shared/contract").TestResultInput }
  | { type: "restart" };

export type EngineListener = (event: EngineEvent) => void;
