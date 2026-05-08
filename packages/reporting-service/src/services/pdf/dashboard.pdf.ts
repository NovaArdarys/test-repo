import { renderLineChart } from "./lineChart";
import { renderPieChart } from "./pieChart";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require("pdfkit");

export async function generateDashboardPdf(data: any): Promise<Buffer> {
  return new Promise(async (resolve) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 40,
      bufferPages: true,
    });

    const buffers: Buffer[] = [];
    doc.on("data", (b: Buffer) => buffers.push(b));
    doc.on("end", () => resolve(Buffer.concat(buffers)));

    const pageWidth = (doc.page?.width || 595.28) - 80;
    let y = 40;

    // Design Tokens
    const colors = {
      primary: "#1e293b", // Slate 800
      secondary: "#64748b", // Slate 500
      accent: "#16a1ff", // Updated Blue
      border: "#e2e8f0", // Slate 200
      headerBg: "#f8fafc", // Slate 50
      rowEven: "#ffffff",
      rowOdd: "#f8fafc",
    };

    doc
      .fontSize(24)
      .font("Helvetica-Bold")
      .fillColor(colors.primary)
      .text("Laporan Dashboard", 40, y);

    y += 32;
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor(colors.secondary)
      .text(`Dihasilkan pada: ${new Date().toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })}`, 40, y);

    y += 25;
    doc.moveTo(40, y).lineTo(40 + pageWidth, y).strokeColor(colors.border).lineWidth(1).stroke();
    y += 30;

    const cardWidth = (pageWidth - 20) / 3;

    drawCard(doc, 40, y, cardWidth, "Total Porsi Dimasak", data.summary.totalPorsi, colors);
    drawCard(doc, 40 + cardWidth + 10, y, cardWidth, "Total Penerima Manfaat", data.summary.totalPenerima, colors);
    drawCard(doc, 40 + (cardWidth + 10) * 2, y, cardWidth, "Laporan Kejadian", data.summary.totalLaporan, colors);

    y += 90;

    sectionTitle(doc, "Visualisasi Data", y, colors);
    y += 35;

    const leftWidth = pageWidth * 0.6;
    const rightWidth = pageWidth * 0.4;

    // ---- Grafik Total Porsi
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fillColor(colors.primary)
      .text("Tren Porsi Dimasak", 40, y);

    const lineLabels = data.charts.portionTrend.map((r: any) => r.date);
    const lineValues = data.charts.portionTrend.map((r: any) => Number(r.total));
    const lineChartImage = await renderLineChart(lineLabels, lineValues);

    doc.image(lineChartImage, 40, y + 20, {
      width: leftWidth - 20,
    });

    const chartBottomY = y + 20 + 170;

    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fillColor(colors.primary)
      .text("Persebaran Wilayah", 40 + leftWidth + 20, y);

    const pieLabels = data.charts.distribution.map((d: any) => d.regionName);
    const pieValues = data.charts.distribution.map((d: any) => d.percentage);
    const pieChartImage = await renderPieChart(pieLabels, pieValues);

    doc.image(pieChartImage, 40 + leftWidth + 30, y + 20, {
      width: rightWidth - 60,
    });

    let legendY = y + 135; // Moved legend up
    doc.fontSize(9).font("Helvetica");

    data.charts.distribution.forEach((d: any) => {
      doc.fillColor(colors.primary).text(`• ${d.regionName}`, 40 + leftWidth + 30, legendY, { continued: true })
        .fillColor(colors.secondary).text(` (${d.percentage}%)`);
      legendY += 15;
    });

    y = Math.max(chartBottomY, legendY) + 20; // Reduced gap from 40 to 20

    y = checkPageBreak(doc, y, 150);
    sectionTitle(doc, "Laporan Kejadian Terbaru", y, colors);
    y += 30;

    const eventX = [40, 75, 250, 340, 420];
    const eventW = [30, 165, 80, 70, 95];
    y = drawGenericTableHeader(doc, y, ["No", "Judul Kejadian", "Tanggal", "Role", "Pelapor"], eventX, eventW, colors);

    data.tables.events.forEach((e: any, i: number) => {
      const bgColor = i % 2 === 0 ? colors.rowEven : colors.rowOdd;
      y = drawGenericTableRow(doc, y, [`${i + 1}`, e.title, e.date, e.role, e.pelapor], eventX, eventW, bgColor, colors);
    });

    y += 40;

    if (data.tables.beneficiaries && data.tables.beneficiaries.length > 0) {
      y = checkPageBreak(doc, y, 150);
      sectionTitle(doc, "Daftar Penerima Manfaat", y, colors);
      y += 30;

      const benX = [40, 75, 220, 380, 475];
      const benW = [30, 135, 150, 85, 45];
      y = drawGenericTableHeader(doc, y, ["No", "Nama", "Alamat", "Dapur", "Porsi"], benX, benW, colors);

      data.tables.beneficiaries.forEach((b: any, i: number) => {
        const bgColor = i % 2 === 0 ? colors.rowEven : colors.rowOdd;
        y = drawGenericTableRow(doc, y, [
          `${i + 1}`,
          b.name,
          b.address,
          b.kitchen ?? "-",
          b.totalPorsi ?? 0
        ], benX, benW, bgColor, colors);
      });

      y += 40;
    }

    if (data.tables.suppliers && data.tables.suppliers.length > 0) {
      y = checkPageBreak(doc, y, 150);
      sectionTitle(doc, "Daftar Supplier", y, colors);
      y += 30;

      const supX = [40, 75, 185, 285, 425];
      const supW = [30, 100, 90, 130, 95];
      y = drawGenericTableHeader(doc, y, ["No", "Nama Supplier", "Telepon", "Alamat", "Bahan"], supX, supW, colors);

      data.tables.suppliers.forEach((s: any, i: number) => {
        const bgColor = i % 2 === 0 ? colors.rowEven : colors.rowOdd;
        y = drawGenericTableRow(doc, y, [
          `${i + 1}`,
          s.name,
          s.phone ?? "-",
          s.address ?? "-",
          s.bahan ?? "-"
        ], supX, supW, bgColor, colors);
      });
    }

    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc
        .fontSize(8)
        .fillColor(colors.secondary)
        .text(
          `Halaman ${i + 1} dari ${pages.count}`,
          40,
          doc.page.height - 30,
          { align: "center", width: pageWidth }
        );
    }

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
  value: number | string,
  colors: any
) {
  const h = 70;
  const safeValue = value ?? 0;

  doc
    .roundedRect(x, y, w, h, 8)
    .fillAndStroke("#ffffff", colors.border);

  doc
    .rect(x, y, 4, h)
    .fill(colors.accent);

  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor(colors.secondary)
    .text(title.toUpperCase(), x + 15, y + 15);

  doc
    .fontSize(22)
    .fillColor(colors.primary)
    .font("Helvetica-Bold")
    .text(String(safeValue), x + 15, y + 32);
}

function sectionTitle(doc: any, title: string, y: number, colors: any) {
  doc
    .fontSize(16)
    .font("Helvetica-Bold")
    .fillColor(colors.primary)
    .text(title, 40, y);

  doc
    .moveTo(40, y + 22)
    .lineTo(70, y + 22)
    .strokeColor(colors.accent)
    .lineWidth(3)
    .stroke();
}

function checkPageBreak(doc: any, y: number, requiredSpace: number): number {
  if (y + requiredSpace > 750) {
    doc.addPage();
    return 40;
  }
  return y;
}

function drawGenericTableHeader(
  doc: any,
  y: number,
  headers: string[],
  xPositions: number[],
  widths: number[],
  colors: any
) {
  const headerHeight = 25;

  // Background
  doc.rect(40, y, 515, headerHeight).fill(colors.accent);

  doc.fontSize(10).font("Helvetica-Bold").fillColor("#ffffff");
  headers.forEach((h, i) => {
    doc.text(h, xPositions[i], y + 7, { width: widths[i], align: "left" });
  });

  return y + headerHeight;
}

function drawGenericTableRow(
  doc: any,
  y: number,
  cols: (string | number)[],
  xPositions: number[],
  widths: number[],
  bgColor: string,
  colors: any
) {
  // 1. Calculate height
  doc.fontSize(9).font("Helvetica");
  let maxHeight = 0;
  cols.forEach((c, i) => {
    const h = doc.heightOfString(String(c ?? "-"), { width: widths[i] });
    if (h > maxHeight) maxHeight = h;
  });

  const verticalPadding = 8;
  const rowHeight = maxHeight + (verticalPadding * 2);

  // 2. Page break check
  if (y + rowHeight > 750) {
    doc.addPage();
    y = 40;
  }

  // 3. Draw background
  doc.rect(40, y, 515, rowHeight).fill(bgColor);

  // 4. Draw text
  doc.fillColor(colors.primary);
  cols.forEach((c, i) => {
    doc.text(String(c ?? "-"), xPositions[i], y + verticalPadding, {
      width: widths[i],
    });
  });

  // 5. Bottom border
  doc.moveTo(40, y + rowHeight).lineTo(555, y + rowHeight).strokeColor(colors.border).lineWidth(0.5).stroke();

  return y + rowHeight;
}