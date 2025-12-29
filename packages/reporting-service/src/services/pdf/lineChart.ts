import { ChartJSNodeCanvas } from "chartjs-node-canvas";

const width = 600;
const height = 300;

const canvas = new ChartJSNodeCanvas({ width, height });

export async function renderLineChart(
  labels: string[],
  values: number[]
): Promise<Buffer> {
  return canvas.renderToBuffer({
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
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true },
      },
    },
  });
}