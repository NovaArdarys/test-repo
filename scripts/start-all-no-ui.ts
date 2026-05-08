import { spawn } from "child_process";
import colors from "picocolors";

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

const colorList = [
  colors.cyan,
  colors.green,
  colors.magenta,
  colors.yellow,
  colors.blue,
  colors.red,
  colors.white,
];
const colorMap: Record<string, (str: string) => string> = {};
services.forEach((name, i) => {
  colorMap[name] = colorList[i % colorList.length] as any;
});

services.forEach((name) => {
  const proc = spawn("bun", ["dev"], {
    cwd: `packages/${name}`,
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
  });

  const colorize = colorMap[name]!;
  const prefix = colorize(`[${name}]`);

  proc.stdout.on("data", (data) => {
    process.stdout.write(`${prefix} ${data}`);
  });

  proc.stderr.on("data", (data) => {
    const message = data.toString();
    // Ignore common non-error messages
    if (
      message.includes("bun run --hot") || 
      message.includes("does not require a password, but a password was supplied")
    ) {
      process.stdout.write(`${prefix} ${message}`);
      return;
    }
    process.stderr.write(colorize(`[${name} ERROR] ${message}`));
  });

  proc.on("exit", (code) => {
    const msg = code === 0
      ? colors.gray(`🟢 ${name} exited normally`)
      : colors.red(`❌ ${name} crashed (code ${code})`);
    console.log(msg);
  });
});

console.log(colors.bold(colors.green("🚀 All services started!")));
