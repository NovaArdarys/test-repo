import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const SCAN_DIRS = ["packages", "src"];
const EXTENSIONS = [".ts", ".tsx", ".js"];
const INDEX_FILES = ["index.ts", "index.tsx", "index.js"];

const ALIASES: Record<string, string> = {
  "@": path.join(ROOT, "packages"),
};

function isExternalImport(p: string) {
  return !p.startsWith(".") && !p.startsWith("/");
}

function resolveAlias(importPath: string): string | null {
  for (const alias in ALIASES) {
    if (importPath.startsWith(alias + "/")) {
      return path.join(
        ALIASES[alias] ?? "",
        importPath.replace(alias + "/", "")
      );
    }
  }
  return null;
}

function resolveFile(base: string): boolean {
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return true;

  for (const ext of EXTENSIONS) {
    if (fs.existsSync(base + ext)) return true;
  }

  if (fs.existsSync(base) && fs.statSync(base).isDirectory()) {
    for (const idx of INDEX_FILES) {
      if (fs.existsSync(path.join(base, idx))) return true;
    }
  }

  return false;
}

function scanFile(filePath: string, errors: string[]) {
  const content = fs.readFileSync(filePath, "utf8");

  const importRegex =
    /import\s+.*?from\s+["'](.+?)["']|require\(["'](.+?)["']\)/g;

  let match;
  while ((match = importRegex.exec(content))) {
    const importPath = match[1] || match[2];
    if (!importPath || isExternalImport(importPath)) continue;

    let resolved: string;

    if (importPath.startsWith(".")) {
      resolved = path.resolve(path.dirname(filePath), importPath);
    } else {
      const aliasResolved = resolveAlias(importPath);
      if (!aliasResolved) continue;
      resolved = aliasResolved;
    }

    if (!resolveFile(resolved)) {
      errors.push(
        `❌ Missing import\nFile: ${filePath}\nImport: ${importPath}\n`
      );
    }
  }
}

function walk(dir: string, errors: string[]) {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);

    if (entry === "node_modules" || entry.startsWith(".")) continue;

    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      walk(fullPath, errors);
    } else if (EXTENSIONS.some((e) => fullPath.endsWith(e))) {
      scanFile(fullPath, errors);
    }
  }
}

function main() {
  const errors: string[] = [];

  for (const dir of SCAN_DIRS) {
    walk(path.join(ROOT, dir), errors);
  }

  if (errors.length) {
    console.error("🚨 Import errors found:\n");
    errors.forEach((e) => console.error(e));
    process.exit(1);
  }

  console.log("✅ All imports are valid");
}

main();
