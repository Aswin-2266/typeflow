/**
 * Results chart.
 *
 * Renders WPM and raw WPM over the duration of the test, with error
 * markers scattered at the seconds where mistakes occurred.
 *
 * Chart.js is imported with explicit component registration rather than
 * the `auto` bundle, so only the pieces actually used are included in the
 * build.
 */

import {
  Chart,
  LineController,
  ScatterController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
  type ChartDataset,
} from "chart.js";
import type { WpmSample } from "@/types";

Chart.register(
  LineController,
  ScatterController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler
);

/** Read a themed colour from the document root. */
function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Chart.js types a chart by a single dataset kind. This instance mixes
// line and scatter datasets, whose data shapes differ (numbers vs points),
// so the instance is held with Chart.js's own permissive default generics.
let chart: Chart | null = null;

export function renderResultsChart(
  canvas: HTMLCanvasElement,
  samples: WpmSample[]
): void {
  const main = cssVar("--main-color");
  const sub = cssVar("--sub-color");
  const text = cssVar("--text-color");
  const errorColor = cssVar("--colorful-error-color");

  // A chart instance is bound to a canvas; destroy before re-rendering.
  chart?.destroy();

  const labels = samples.map((s) => String(s.second));

  // Place an error marker on the WPM line wherever new errors appeared.
  const errorPoints: { x: number; y: number }[] = [];
  let previousErrors = 0;
  samples.forEach((s, i) => {
    if (s.errors > previousErrors) {
      errorPoints.push({ x: i, y: s.wpm });
    }
    previousErrors = s.errors;
  });

  // The chart mixes two line datasets with one scatter dataset, so the
  // array is typed as the union rather than inferred from the first entry.
  const datasets: ChartDataset<"line" | "scatter", unknown>[] = [
    {
      type: "line",
      label: "wpm",
      data: samples.map((s) => s.wpm),
      borderColor: main,
      backgroundColor: `${main}1a`,
      borderWidth: 2,
      fill: true,
      tension: 0.3,
      pointRadius: 0,
      pointHoverRadius: 4,
      order: 1,
    } as ChartDataset<"line", unknown>,
    {
      type: "line",
      label: "raw",
      data: samples.map((s) => s.raw),
      borderColor: sub,
      borderWidth: 1.5,
      borderDash: [4, 4],
      fill: false,
      tension: 0.3,
      pointRadius: 0,
      pointHoverRadius: 4,
      order: 2,
    } as ChartDataset<"line", unknown>,
    {
      type: "scatter",
      label: "errors",
      data: errorPoints,
      borderColor: errorColor,
      backgroundColor: errorColor,
      pointStyle: "crossRot",
      pointRadius: 5,
      pointBorderWidth: 2,
      order: 0,
    } as ChartDataset<"scatter", unknown>,
  ];

  chart = new Chart(canvas, {
    type: "line",
    // Cast required because the datasets array is heterogeneous; Chart.js
    // supports this at runtime but cannot express it in a single generic.
    data: { labels, datasets } as never,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      scales: {
        x: {
          grid: { color: `${sub}26` },
          ticks: { color: sub, maxTicksLimit: 10 },
          title: { display: false },
        },
        y: {
          beginAtZero: true,
          grid: { color: `${sub}26` },
          ticks: { color: sub, maxTicksLimit: 6 },
        },
      },
      plugins: {
        legend: {
          display: true,
          position: "top",
          align: "end",
          labels: {
            color: sub,
            boxWidth: 12,
            usePointStyle: true,
            font: { size: 11 },
          },
        },
        tooltip: {
          backgroundColor: cssVar("--sub-alt-color"),
          titleColor: text,
          bodyColor: text,
          borderColor: sub,
          borderWidth: 1,
          padding: 10,
          displayColors: true,
        },
      },
    },
  });
}

export function destroyChart(): void {
  chart?.destroy();
  chart = null;
}
