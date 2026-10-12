/**
 * In-memory result store.
 *
 * This is the swappable persistence layer. It implements `ResultStore`,
 * which is the only interface the route handlers depend on — replacing it
 * with MongoDB, Postgres, or Firestore means writing one new class and
 * changing one line in `server/index.ts`.
 *
 * Data is not durable across restarts, which is intentional for a stub.
 */

import type {
  PersonalBest,
  TestResult,
  TestResultInput,
  UserStats,
} from "../../shared/contract"

export interface ResultStore {
  list(limit: number, offset: number): Promise<{ results: TestResult[]; total: number }>;
  create(input: TestResultInput): Promise<TestResult>;
  clear(): Promise<number>;
  personalBests(): Promise<PersonalBest[]>;
  stats(): Promise<UserStats>;
}

/** Upper bound on retained results, to keep memory bounded. */
const MAX_RESULTS = 10_000

export class MemoryResultStore implements ResultStore {
  /** Newest first. */
  private results: TestResult[] = []
  private sequence = 0

  async list(
    limit: number,
    offset: number
  ): Promise<{ results: TestResult[]; total: number }> {
    return {
      results: this.results.slice(offset, offset + limit),
      total: this.results.length,
    }
  }

  async create(input: TestResultInput): Promise<TestResult> {
    const result: TestResult = {
      ...input,
      id: `r${(++this.sequence).toString(36)}-${Date.now().toString(36)}`,
      timestamp: Date.now(),
    }

    this.results.unshift(result)
    if (this.results.length > MAX_RESULTS) {
      this.results.length = MAX_RESULTS
    }

    return result
  }

  async clear(): Promise<number> {
    const count = this.results.length
    this.results = []
    return count
  }

  async personalBests(): Promise<PersonalBest[]> {
    const best = new Map<string, PersonalBest>()

    for (const r of this.results) {
      const key = `${r.mode}:${r.mode2}:${r.language}`
      const existing = best.get(key)
      if (!existing || r.wpm > existing.wpm) {
        best.set(key, {
          mode: r.mode,
          mode2: r.mode2,
          language: r.language,
          wpm: r.wpm,
          raw: r.raw,
          accuracy: r.accuracy,
          consistency: r.consistency,
          timestamp: r.timestamp,
        })
      }
    }

    return [...best.values()].sort((a, b) => b.wpm - a.wpm)
  }

  async stats(): Promise<UserStats> {
    const count = this.results.length

    if (count === 0) {
      return {
        testsStarted: 0,
        testsCompleted: 0,
        timeTyping: 0,
        averageWpm: 0,
        averageAccuracy: 0,
        highestWpm: 0,
      }
    }

    const sum = this.results.reduce(
      (acc, r) => ({
        wpm: acc.wpm + r.wpm,
        accuracy: acc.accuracy + r.accuracy,
        duration: acc.duration + r.duration,
      }),
      { wpm: 0, accuracy: 0, duration: 0 }
    )

    return {
      testsStarted: count,
      testsCompleted: count,
      timeTyping: Math.round(sum.duration),
      averageWpm: Math.round((sum.wpm / count) * 100) / 100,
      averageAccuracy: Math.round((sum.accuracy / count) * 100) / 100,
      highestWpm: Math.max(...this.results.map((r) => r.wpm)),
    }
  }
}
