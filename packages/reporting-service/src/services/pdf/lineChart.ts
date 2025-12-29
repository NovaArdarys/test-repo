import { createCanvas } from "@napi-rs/canvas";
import Chart from "chart.js/auto";

const width = 600;
const height = 300;

export async function renderLineChart(
  labels: string[],
  values: number[]
): Promise<Buffer> {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  new Chart(ctx as any, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Total Porsi Dimasak",
          data: values,
          borderColor: "#f97316",
          backgroundColor: "rgba(249,115,22,0.2)",
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: { beginAtZero: true },
      },
    },
  });

  return canvas.toBuffer("image/png");
}
