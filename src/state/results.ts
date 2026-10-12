/**
 * Result history.
 *
 * Results are written to localStorage so the app is fully functional with
 * no server. When the API is reachable, writes are mirrored to it on a
 * best-effort basis — a failed sync never blocks or breaks the UI.
 */

import type { PersonalBest, TestResult, TestResultInput, UserStats } from "@/types";

const STORAGE_KEY = "typeflow.results";
const MAX_STORED = 1000;
const API_BASE = "/api";

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

class ResultStore {
  private results: TestResult[] = [];
  private listeners = new Set<(results: TestResult[]) => void>();

  constructor() {
    this.load();
  }

  all(): readonly TestResult[] {
    return this.results;
  }

  recent(limit = 10): TestResult[] {
    return this.results.slice(0, limit);
  }

  add(input: TestResultInput): TestResult {
    const result: TestResult = {
      ...input,
      id: makeId(),
      timestamp: Date.now(),
    };

    // Newest first.
    this.results.unshift(result);
    if (this.results.length > MAX_STORED) {
      this.results.length = MAX_STORED;
    }

    this.save();
    this.notify();
    void this.syncToServer(input);

    return result;
  }

  clear(): void {
    this.results = [];
    this.save();
    this.notify();
    void fetch(`${API_BASE}/results`, { method: "DELETE" }).catch(() => {
      /* offline is fine */
    });
  }

  /** True if the given result is a personal best for its mode grouping. */
  isPersonalBest(result: TestResult): boolean {
    const key = `${result.mode}:${result.mode2}:${result.language}`;
    const previous = this.results.filter(
      (r) => r.id !== result.id && `${r.mode}:${r.mode2}:${r.language}` === key
    );
    if (previous.length === 0) return true;
    return result.wpm > Math.max(...previous.map((r) => r.wpm));
  }

  personalBests(): PersonalBest[] {
    const best = new Map<string, PersonalBest>();

    for (const r of this.results) {
      const key = `${r.mode}:${r.mode2}:${r.language}`;
      const existing = best.get(key);
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
        });
      }
    }

    return [...best.values()].sort((a, b) => b.wpm - a.wpm);
  }

  stats(): UserStats {
    const completed = this.results.length;
    if (completed === 0) {
      return {
        testsStarted: 0,
        testsCompleted: 0,
        timeTyping: 0,
        averageWpm: 0,
        averageAccuracy: 0,
        highestWpm: 0,
      };
    }

    const totalWpm = this.results.reduce((a, r) => a + r.wpm, 0);
    const totalAcc = this.results.reduce((a, r) => a + r.accuracy, 0);
    const totalTime = this.results.reduce((a, r) => a + r.duration, 0);

    return {
      testsStarted: completed,
      testsCompleted: completed,
      timeTyping: Math.round(totalTime),
      averageWpm: Math.round((totalWpm / completed) * 100) / 100,
      averageAccuracy: Math.round((totalAcc / completed) * 100) / 100,
      highestWpm: Math.max(...this.results.map((r) => r.wpm)),
    };
  }

  subscribe(listener: (results: TestResult[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) listener(this.results);
  }

  private async syncToServer(input: TestResultInput): Promise<void> {
    try {
      await fetch(`${API_BASE}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
    } catch {
      // The server is optional. Local storage remains the source of truth.
    }
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        this.results = parsed.filter(
          (r): r is TestResult =>
            typeof r === "object" &&
            r !== null &&
            typeof (r as TestResult).wpm === "number" &&
            typeof (r as TestResult).id === "string"
        );
      }
    } catch (err) {
      console.warn("[results] failed to load history", err);
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.results));
    } catch (err) {
      console.warn("[results] failed to persist history", err);
    }
  }
}

export const resultStore = new ResultStore();
