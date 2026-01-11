import fs from "fs";
import path from "path";

/* ================================
 * CONFIG
 * ================================ */

const ROOT = process.cwd();

// prefix yang mau discan
const TARGET_PREFIXES = ["@/validators"];

const SCAN_DIRS = ["packages", "src"];
const EXTENSIONS = [".ts", ".tsx", ".js"];

/* ================================
 * UTIL
 * ================================ */

function findServiceRoot(filePath: string): string | null {
  const parts = filePath.split(path.sep);
  const idx = parts.indexOf("packages");

  if (idx === -1) return null;

  const serviceName = parts[idx + 1];
  if (!serviceName) return null;

  return path.join(ROOT, "packages", serviceName, "src");
}

function resolveImport(filePath: string, importPath: string): string | null {
  if (!importPath.startsWith("@/")) return null;

  const serviceRoot = findServiceRoot(filePath);
  if (!serviceRoot) return null;

  return path.join(serviceRoot, importPath.replace("@/", ""));
}

/* ================================
 * SCAN FILE
 * ================================ */

function scanFile(filePath: string, results: string[]) {
  const content = fs.readFileSync(filePath, "utf8");

  const importRegex =
    /import\s+.*?from\s+["'](.+?)["']|require\(["'](.+?)["']\)/g;

  let match: RegExpExecArray | null;

  while ((match = importRegex.exec(content))) {
    const importPath = match[1] || match[2];
    if (!importPath) continue;

    const matchedPrefix = TARGET_PREFIXES.find((p) =>
      importPath.startsWith(p)
    );
    if (!matchedPrefix) continue;

    const resolved = resolveImport(filePath, importPath);

    results.push(
      `File     : ${filePath}
Import   : ${importPath}
Resolved : ${resolved ?? "(cannot resolve)"}
`
    );
  }
}

function walk(dir: string, results: string[]) {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;

    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      walk(fullPath, results);
    } else if (EXTENSIONS.some((e) => fullPath.endsWith(e))) {
      scanFile(fullPath, results);
    }
  }
}

/* ================================
 * MAIN
 * ================================ */

function main() {
  const results: string[] = [];

  for (const dir of SCAN_DIRS) {
    walk(path.join(ROOT, dir), results);
  }

  if (!results.length) {
    console.log("ℹ️ No matching imports found");
    return;
  }

  console.log("\n📦 Import usage report\n");
  results.forEach((r) => console.log(r));
}

main();
