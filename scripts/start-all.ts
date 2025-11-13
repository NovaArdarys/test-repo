import { spawn } from "child_process";
import blessed from "blessed";
import contrib from "blessed-contrib";
import colors from "picocolors";
import pidusage from "pidusage";

// === Services ======================================
const services = [
  "ai-service",
  "auth-service",
  "delivery-service",
  "kitchen-service",
  "log-service",
  "menu-service",
  "notification-service",
  "reporting-service",
  "school-service",
  "storage-service",
  "tracking-service",
  "user-service",
];

// === UI setup ======================================
const screen = blessed.screen({ smartCSR: true, title: "Microservices Dashboard" });
const grid = new contrib.grid({ rows: 12, cols: 12, screen });

// left: services table (3 columns)
const table = grid.set(0, 0, 12, 3, contrib.table, {
  keys: true,
  mouse: true,
  fg: "white",
  label: "Services",
  selectedFg: "white",
  selectedBg: "blue",
  columnWidth: [22, 12, 32], // Service | Status | Info
});

// right top: CPU & RAM
const cpuRamPanel = grid.set(0, 3, 6, 9, contrib.table, {
  fg: "white",
  label: "CPU & RAM Usage",
  columnWidth: [22, 10, 10],
});

// right bottom: LOG (scrollable)
const logPanel = grid.set(6, 3, 6, 9, blessed.box, {
  label: "Service Logs",
  fg: "green",
  tags: true,
  border: "line",
  keys: true,
  vi: true,         // j/k scroll
  mouse: true,      // mouse scroll
  scrollable: true,
  alwaysScroll: true,
  scrollbar: { ch: " ", inverse: true },
});

// === Data stores ===================================
const tableData: [string, string, string][] = services.map((s) => [
  s,
  "🟡 starting…",
  "waiting for logs...",
]);
table.setData({ headers: ["Service", "Status", "Info"], data: tableData });

const tableList = (table as any).rows;

const pidMap: Record<string, number | undefined> = {};
const logBuffers: Record<string, string[]> = {};
const lastErrorLine: Record<string, string> = {};
services.forEach(s => (logBuffers[s] = []));

let selectedService = services[0];

// === Helpers =======================================
function pushToBuffer(service: string, line: string) {
  const buf = logBuffers[service];
  buf.push(line);
  if (buf.length > 500) buf.shift();
}

function updateTableRow(service: string, status: string, info: string) {
  const idx = services.indexOf(service);
  if (idx < 0) return;
  tableData[idx] = [service, status, info];
  table.setData({ headers: ["Service", "Status", "Info"], data: tableData });
  screen.render();
}

function renderBuffer(service: string) {
  logPanel.setContent(logBuffers[service].join("\n"));
  logPanel.setScrollPerc(100);
  screen.render();
}

function safeLog(service: string, text: string, isError = false) {
  const line = isError ? colors.red(text) : text;
  pushToBuffer(service, line);

  // update info field for this service
  const short = text.replace(/\n/g, " ").slice(0, 40);
  if (isError) lastErrorLine[service] = short;

  const status =
    isError ? "🔴 error" : "🟢 running";
  const info =
    isError ? short : short.length ? short : "idle";

  updateTableRow(service, status, info);

  // print to log if selected
  if (service === selectedService) {
    logPanel.pushLine(line);
    logPanel.setScrollPerc(100);
    screen.render();
  }
}

// === Spawn services ======================================
services.forEach((name) => {
  try {
    const proc = spawn("bun", ["dev"], {
      cwd: `packages/${name}`,
      stdio: ["pipe", "pipe", "pipe"],
      shell: true,
    });

    pidMap[name] = proc.pid ?? undefined;

    updateTableRow(name, "🟡 starting…", "waiting...");

    proc.stdout.on("data", (raw: Buffer) => {
      const txt = raw.toString();
      safeLog(name, txt, false);
    });

    proc.stderr.on("data", (raw: Buffer) => {
      const txt = raw.toString();
      safeLog(name, txt, true);
    });

    proc.on("exit", () => {
      updateTableRow(name, "⚪ exited", lastErrorLine[name] || "terminated");
      pidMap[name] = undefined;
    });
  } catch {
    updateTableRow(name, "🔴 error", "failed to spawn");
  }
});

// === CPU / RAM updater ===================================
async function updateCpuRam() {
  const rows: [string, string, string][] = [];

  for (const s of services) {
    const pid = pidMap[s];
    if (!pid) {
      rows.push([s, "-", "-"]);
      continue;
    }

    try {
      const stat = await pidusage(pid);
      rows.push([
        s,
        stat.cpu.toFixed(1) + "%",
        (stat.memory / 1024 / 1024).toFixed(1) + " MB",
      ]);
    } catch {
      rows.push([s, "-", "-"]);
    }
  }

  cpuRamPanel.setData({
    headers: ["Service", "CPU", "RAM"],
    data: rows,
  });

  screen.render();
}
setInterval(updateCpuRam, 1000);

// === Switch log (ENTER or number) ======================
function selectService(idx: number) {
  if (idx < 0 || idx >= services.length) return;
  selectedService = services[idx];
  logPanel.setLabel(`Logs — ${selectedService}`);
  renderBuffer(selectedService);
}

screen.key(["enter"], () => {
  selectService(tableList.selected);
});

// numeric shortcut (1–0)
screen.key(["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"], (k) => {
  const map: Record<string, number> = {
    "1": 0, "2": 1, "3": 2, "4": 3,
    "5": 4, "6": 5, "7": 6, "8": 7,
    "9": 8, "0": 9,
  };
  const idx = map[k];
  tableList.select(idx);
  selectService(idx);
});

// Scroll log manually
screen.key(["pageup"], () => logPanel.scroll(-10));
screen.key(["pagedown"], () => logPanel.scroll(10));
screen.key(["S-up"], () => logPanel.scroll(-1));
screen.key(["S-down"], () => logPanel.scroll(1));

// Arrow navigation for table
screen.key(["up"], () => { tableList.move(-1); tableList.screen.render(); });
screen.key(["down"], () => { tableList.move(1); tableList.screen.render(); });

// Quit
screen.key(["q", "C-c"], () => process.exit(0));

screen.render();
console.log(colors.green("🚀 Dashboard running — ENTER or number keys to switch logs"));
