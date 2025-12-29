import { ChartJSNodeCanvas } from "chartjs-node-canvas";

const width = 600;
const height = 300;

const canvas = new ChartJSNodeCanvas({ width, height });

export async function renderPieChart(
  labels: string[],
  values: number[]
): Promise<Buffer> {
  return canvas.renderToBuffer({
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: ["#2dd4bf", "#fb923c", "#60a5fa"],
        },
      ],
    },
    options: {
      plugins: { legend: { display: false } },
    },
  });
}
