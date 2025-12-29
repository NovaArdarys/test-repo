import { createCanvas } from "@napi-rs/canvas";
import Chart from "chart.js/auto";

const width = 600;
const height = 300;

export async function renderPieChart(
  labels: string[],
  values: number[]
): Promise<Buffer> {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  new Chart(ctx as any, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: ["#2dd4bf", "#fb923c", "#60a5fa"],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        legend: { display: false },
      },
    },
  });

  return canvas.toBuffer("image/png");
}
