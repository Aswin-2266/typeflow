/**
 * Statistics page.
 *
 * Renders lifetime aggregates, personal bests, and recent test history
 * from the local result store.
 */

import { resultStore } from "@/state/results";
import type { PersonalBest, TestResult } from "@/types";

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Render a duration in seconds as a compact human-readable string. */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${Math.round(seconds % 60)}s`;
}

/** Describe a result's mode in the compact "time 30" / "words 50" form. */
export function describeMode(
  mode: string,
  mode2: string,
  punctuation = false,
  numbers = false
): string {
  let label: string;
  switch (mode) {
    case "time":
      label = `time ${mode2}`;
      break;
    case "words":
      label = `words ${mode2}`;
      break;
    case "quote":
      label = `quote ${mode2}`;
      break;
    default:
      label = mode;
  }

  const modifiers: string[] = [];
  if (punctuation) modifiers.push("punctuation");
  if (numbers) modifiers.push("numbers");

  return modifiers.length > 0 ? `${label} ${modifiers.join(" ")}` : label;
}

export class StatsPage {
  constructor(
    private grid: HTMLElement,
    private pbTable: HTMLTableElement,
    private historyTable: HTMLTableElement
  ) {}

  render(): void {
    this.renderSummary();
    this.renderPersonalBests(resultStore.personalBests());
    this.renderHistory(resultStore.recent(50));
  }

  private renderSummary(): void {
    const stats = resultStore.stats();

    const cards: { label: string; value: string }[] = [
      { label: "tests completed", value: String(stats.testsCompleted) },
      { label: "time typing", value: formatDuration(stats.timeTyping) },
      { label: "average wpm", value: String(Math.round(stats.averageWpm)) },
      { label: "highest wpm", value: String(Math.round(stats.highestWpm)) },
      {
        label: "average accuracy",
        value: `${Math.round(stats.averageAccuracy)}%`,
      },
    ];

    this.grid.replaceChildren();

    for (const card of cards) {
      const el = document.createElement("div");
      el.className = "stat-card";

      const label = document.createElement("div");
      label.className = "stat-card__label";
      label.textContent = card.label;

      const value = document.createElement("div");
      value.className = "stat-card__value";
      value.textContent = card.value;

      el.append(label, value);
      this.grid.appendChild(el);
    }
  }

  private renderPersonalBests(bests: PersonalBest[]): void {
    const tbody = this.pbTable.querySelector("tbody");
    if (!tbody) return;

    tbody.replaceChildren();

    if (bests.length === 0) {
      tbody.appendChild(this.emptyRow(5, "no personal bests yet"));
      return;
    }

    for (const pb of bests) {
      const tr = document.createElement("tr");
      this.addCells(tr, [
        describeMode(pb.mode, pb.mode2),
        String(Math.round(pb.wpm)),
        `${Math.round(pb.accuracy)}%`,
        `${Math.round(pb.consistency)}%`,
        formatDate(pb.timestamp),
      ]);
      tbody.appendChild(tr);
    }
  }

  private renderHistory(results: TestResult[]): void {
    const tbody = this.historyTable.querySelector("tbody");
    if (!tbody) return;

    tbody.replaceChildren();

    if (results.length === 0) {
      tbody.appendChild(this.emptyRow(6, "no tests recorded yet"));
      return;
    }

    for (const r of results) {
      const tr = document.createElement("tr");
      this.addCells(tr, [
        String(Math.round(r.wpm)),
        String(Math.round(r.raw)),
        `${Math.round(r.accuracy)}%`,
        `${Math.round(r.consistency)}%`,
        describeMode(r.mode, r.mode2, r.punctuation, r.numbers),
        formatDate(r.timestamp),
      ]);
      tbody.appendChild(tr);
    }
  }

  private addCells(tr: HTMLTableRowElement, values: string[]): void {
    for (const value of values) {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    }
  }

  private emptyRow(colspan: number, message: string): HTMLTableRowElement {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = colspan;
    td.className = "is-empty";
    td.textContent = message;
    tr.appendChild(td);
    return tr;
  }
}
