/**
 * Shared ts-rest API contract.
 *
 * This file is the single source of truth for the HTTP surface between the
 * browser client and the server. Both sides import it, so a change to a
 * schema here produces a compile error on whichever side has not been
 * updated — the contract cannot silently drift.
 *
 * The current server implementation is an in-memory stub. Replacing it with
 * a persistent backend (Mongo/Postgres/Firebase) requires no change to this
 * file and no change to any client code.
 */

import { initContract } from "@ts-rest/core"
import { z } from "zod"

const c = initContract()

/* -------------------------------------------------------------------------- */
/* Primitives                                                                  */
/* -------------------------------------------------------------------------- */

export const TestModeSchema = z.enum(["time", "words", "quote", "zen", "custom"])
export type TestMode = z.infer<typeof TestModeSchema>;

export const LanguageSchema = z.string().min(1).max(64)

/** A single sampled point on the WPM-over-time graph (one sample per second). */
export const WpmSampleSchema = z.object({
  second: z.number().int().nonnegative(),
  wpm: z.number().nonnegative(),
  raw: z.number().nonnegative(),
  errors: z.number().int().nonnegative(),
})
export type WpmSample = z.infer<typeof WpmSampleSchema>;

/** Final per-character tallies for a completed test. */
export const CharStatsSchema = z.object({
  correct: z.number().int().nonnegative(),
  incorrect: z.number().int().nonnegative(),
  extra: z.number().int().nonnegative(),
  missed: z.number().int().nonnegative(),
})
export type CharStats = z.infer<typeof CharStatsSchema>;

/* -------------------------------------------------------------------------- */
/* Results                                                                     */
/* -------------------------------------------------------------------------- */

export const TestResultSchema = z.object({
  id: z.string(),
  /** Net WPM: correct characters / 5, normalised to one minute. */
  wpm: z.number().nonnegative(),
  /** Gross WPM, ignoring correctness. */
  raw: z.number().nonnegative(),
  /** Percentage, 0-100. */
  accuracy: z.number().min(0).max(100),
  /** Percentage, 0-100. Derived from the coefficient of variation of raw WPM. */
  consistency: z.number().min(0).max(100),
  mode: TestModeSchema,
  /** e.g. "30" for time mode, "50" for words mode. */
  mode2: z.string(),
  language: LanguageSchema,
  /** Seconds, to two decimal places. */
  duration: z.number().nonnegative(),
  punctuation: z.boolean(),
  numbers: z.boolean(),
  chars: CharStatsSchema,
  samples: z.array(WpmSampleSchema),
  /** Unix epoch milliseconds. */
  timestamp: z.number().int(),
})
export type TestResult = z.infer<typeof TestResultSchema>;

/** Payload accepted when submitting a result; server assigns id + timestamp. */
export const TestResultInputSchema = TestResultSchema.omit({
  id: true,
  timestamp: true,
})
export type TestResultInput = z.infer<typeof TestResultInputSchema>;

/* -------------------------------------------------------------------------- */
/* Personal bests & aggregate stats                                            */
/* -------------------------------------------------------------------------- */

export const PersonalBestSchema = z.object({
  mode: TestModeSchema,
  mode2: z.string(),
  language: LanguageSchema,
  wpm: z.number().nonnegative(),
  raw: z.number().nonnegative(),
  accuracy: z.number().min(0).max(100),
  consistency: z.number().min(0).max(100),
  timestamp: z.number().int(),
})
export type PersonalBest = z.infer<typeof PersonalBestSchema>;

export const UserStatsSchema = z.object({
  testsStarted: z.number().int().nonnegative(),
  testsCompleted: z.number().int().nonnegative(),
  /** Total seconds spent typing across all completed tests. */
  timeTyping: z.number().nonnegative(),
  averageWpm: z.number().nonnegative(),
  averageAccuracy: z.number().min(0).max(100),
  highestWpm: z.number().nonnegative(),
})
export type UserStats = z.infer<typeof UserStatsSchema>;

/* -------------------------------------------------------------------------- */
/* Errors                                                                      */
/* -------------------------------------------------------------------------- */

export const ErrorSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
})

/* -------------------------------------------------------------------------- */
/* Contract                                                                    */
/* -------------------------------------------------------------------------- */

export const contract = c.router(
  {
    health: {
      method: "GET",
      path: "/health",
      responses: {
        200: z.object({ status: z.literal("ok"), uptime: z.number() }),
      },
      summary: "Liveness probe.",
    },

    listResults: {
      method: "GET",
      path: "/results",
      query: z.object({
        limit: z.coerce.number().int().min(1).max(1000).default(100),
        offset: z.coerce.number().int().nonnegative().default(0),
      }),
      responses: {
        200: z.object({
          results: z.array(TestResultSchema),
          total: z.number().int().nonnegative(),
        }),
      },
      summary: "Return saved results, newest first.",
    },

    createResult: {
      method: "POST",
      path: "/results",
      body: TestResultInputSchema,
      responses: {
        201: TestResultSchema,
        400: ErrorSchema,
      },
      summary: "Persist a completed test result.",
    },

    deleteResults: {
      method: "DELETE",
      path: "/results",
      body: z.object({}).optional(),
      responses: {
        200: z.object({ deleted: z.number().int().nonnegative() }),
      },
      summary: "Clear all stored results.",
    },

    personalBests: {
      method: "GET",
      path: "/personal-bests",
      responses: {
        200: z.object({ bests: z.array(PersonalBestSchema) }),
      },
      summary: "Best result per (mode, mode2, language) grouping.",
    },

    stats: {
      method: "GET",
      path: "/stats",
      responses: {
        200: UserStatsSchema,
      },
      summary: "Aggregate lifetime typing statistics.",
    },
  },
  {
    pathPrefix: "/api",
    strictStatusCodes: true,
  }
)

export type Contract = typeof contract;
