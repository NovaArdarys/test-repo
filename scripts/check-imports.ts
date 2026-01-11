import fs from "fs";
import path from "path";

/* ================================
 * CONFIG
 * ================================ */

const ROOT = process.cwd();

const SCAN_DIRS = ["packages", "src"];
const EXTENSIONS = [".ts", ".tsx", ".js"];
const INDEX_FILES = ["index.ts", "index.tsx", "index.js"];

/* ================================
 * UTIL
 * ================================ */

function isExternalImport(p: string) {
  return !p.startsWith(".") && !p.startsWith("@/");
}

/**
 * Find service root:
 * packages/<service-name>/src
 */
function findServiceRoot(filePath: string): string | null {
  const parts = filePath.split(path.sep);
  const idx = parts.indexOf("packages");

  if (idx === -1) return null;
  const serviceName = parts[idx + 1];
  if (!serviceName) return null;

  return path.join(ROOT, "packages", serviceName, "src");
}

/**
 * Resolve import path to absolute FS path (without extension)
 */
function resolveImport(
  filePath: string,
  importPath: string
): string | null {
  // relative import
  if (importPath.startsWith(".")) {
    return path.resolve(path.dirname(filePath), importPath);
  }

  // service-local alias @/
  if (importPath.startsWith("@/")) {
    const serviceRoot = findServiceRoot(filePath);
    if (!serviceRoot) return null;

    return path.join(
      serviceRoot,
      importPath.replace("@/", "")
    );
  }

  return null;
}

/**
 * Check if file or directory (index) exists
 */
function resolveFile(base: string): boolean {
  // exact file
  if (fs.existsSync(base) && fs.statSync(base).isFile()) {
    return true;
  }

  // try extensions
  for (const ext of EXTENSIONS) {
    if (fs.existsSync(base + ext)) {
      return true;
    }
  }

  // directory → index.*
  if (fs.existsSync(base) && fs.statSync(base).isDirectory()) {
    for (const idx of INDEX_FILES) {
      if (fs.existsSync(path.join(base, idx))) {
        return true;
      }
    }
  }

  return false;
}

/* ================================
 * SCAN FILE
 * ================================ */

function scanFile(filePath: string, errors: string[]) {
  const content = fs.readFileSync(filePath, "utf8");

  const importRegex =
    /import\s+.*?from\s+["'](.+?)["']|require\(["'](.+?)["']\)/g;

  let match: RegExpExecArray | null;

  while ((match = importRegex.exec(content))) {
    const importPath = match[1] || match[2];
    if (!importPath) continue;

    if (isExternalImport(importPath)) continue;

    const resolved = resolveImport(filePath, importPath);
    if (!resolved) continue;

    if (!resolveFile(resolved)) {
      errors.push(
        `❌ Missing import
File     : ${filePath}
Import   : ${importPath}
Resolved : ${resolved}
`
      );
    }
  }
}

/* ================================
 * WALK DIRECTORY
 * ================================ */

function walk(dir: string, errors: string[]) {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir)) {
    if (
      entry === "node_modules" ||
      entry.startsWith(".")
    ) {
      continue;
    }

    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      walk(fullPath, errors);
    } else if (EXTENSIONS.some((e) => fullPath.endsWith(e))) {
      scanFile(fullPath, errors);
    }
  }
}

/* ================================
 * MAIN
 * ================================ */

function main() {
  const errors: string[] = [];

  for (const dir of SCAN_DIRS) {
    walk(path.join(ROOT, dir), errors);
  }

  if (errors.length) {
    console.error("\n🚨 Import errors found:\n");
    errors.forEach((e) => console.error(e));
    process.exit(1);
  }

  console.log("✅ All imports are valid");
}

main();
