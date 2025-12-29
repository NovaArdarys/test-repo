import { renderLineChart } from "./lineChart";
import { renderPieChart } from "./pieChart";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require("pdfkit");

export async function generateDashboardPdf(data: any): Promise<Buffer> {
  return new Promise(async (resolve) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 40,
    });

    const buffers: Buffer[] = [];
    doc.on("data", (b: Buffer) => buffers.push(b));
    doc.on("end", () => resolve(Buffer.concat(buffers)));

    const pageWidth = doc.page.width - 80;
    let y = 40;

    /* ================= TITLE ================= */
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .text("Laporan Dashboard Dapur", 40, y);

    y += 30;
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#555")
      .text("Ringkasan aktivitas dapur dan distribusi", 40, y);

    y += 30;
    doc.moveTo(40, y).lineTo(555, y).stroke();
    y += 20;

    /* ================= SUMMARY CARDS ================= */
    const cardWidth = (pageWidth - 20) / 3;

    drawCard(doc, 40, y, cardWidth, "Total Porsi Dimasak", data.summary.totalPorsi);
    drawCard(doc, 40 + cardWidth + 10, y, cardWidth, "Total Penerima Manfaat", data.summary.totalPenerima);
    drawCard(doc, 40 + (cardWidth + 10) * 2, y, cardWidth, "Laporan Kejadian", data.summary.totalLaporan);

    y += 80;

    /* ================= SECTION: LAPORAN DAPUR ================= */
    sectionTitle(doc, "Laporan Dapur", y);
    y += 25;

    const leftWidth = pageWidth * 0.6;
    const rightWidth = pageWidth * 0.4;

    // ---- Grafik Total Porsi (text version)
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .text("Grafik Total Porsi (Ringkasan)", 40, y);

    let chartY = y + 20;
    doc.fontSize(10).font("Helvetica");

    const lineLabels = data.charts.portionTrend.map((r: any) => r.date);
    const lineValues = data.charts.portionTrend.map((r: any) => Number(r.total));

    const lineChartImage = await renderLineChart(lineLabels, lineValues);

    doc.image(lineChartImage, 40, y + 20, {
      width: leftWidth - 20,
    });

    const chartBottomY = y + 20 + 260;

    // ---- Persebaran Wilayah
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .text("Persebaran Wilayah", 40 + leftWidth + 20, y);

    let distY = y + 20;
    doc.fontSize(10).font("Helvetica");

    const pieLabels = data.charts.distribution.map((d: any) => d.regionName);
    const pieValues = data.charts.distribution.map((d: any) => d.percentage);

    const pieChartImage = await renderPieChart(pieLabels, pieValues);

    doc.image(pieChartImage, 40 + leftWidth + 30, y + 20, {
      width: rightWidth - 60,
    });

    let legendY = y + 20 + 200;
    doc.fontSize(9).font("Helvetica");

    data.charts.distribution.forEach((d: any) => {
      doc.text(`• ${d.regionName} (${d.percentage}%)`, 40 + leftWidth + 30, legendY);
      legendY += 12;
    });

    y = Math.max(chartBottomY, legendY) + 30;

    /* ================= TABLE: EVENTS ================= */
    sectionTitle(doc, "Laporan Kejadian Terbaru (5)", y);
    y += 20;

    drawTableHeader(doc, y);
    y += 18;

    data.tables.events.forEach((e: any, i: number) => {
      drawTableRow(doc, y, [
        `${i + 1}`,
        e.title,
        e.date,
        e.role,
        e.pelapor,
      ]);
      y += 16;
    });

    doc.end();
  });
}

/* ================= HELPERS ================= */

function drawCard(
  doc: any,
  x: number,
  y: number,
  w: number,
  title: string,
  value: number
) {
  doc
    .roundedRect(x, y, w, 60, 6)
    .stroke("#ddd");

  doc
    .fontSize(10)
    .fillColor("#666")
    .text(title, x + 10, y + 10);

  doc
    .fontSize(20)
    .fillColor("#000")
    .font("Helvetica-Bold")
    .text(String(value), x + 10, y + 28);
}

function sectionTitle(doc: any, title: string, y: number) {
  doc
    .fontSize(14)
    .font("Helvetica-Bold")
    .fillColor("#000")
    .text(title, 40, y);
}

function drawTableHeader(doc: any, y: number) {
  doc.fontSize(10).font("Helvetica-Bold");
  drawTableRow(doc, y, ["No", "Judul", "Tanggal", "Role", "Pelapor"]);
}

function drawTableRow(doc: any, y: number, cols: string[]) {
  const x = [40, 70, 250, 340, 400];
  doc.fontSize(9).font("Helvetica");

  cols.forEach((c, i) => {
    doc.text(c, x[i], y, { width: 120, ellipsis: true });
  });
}