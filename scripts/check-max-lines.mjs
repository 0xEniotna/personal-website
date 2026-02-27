import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const MAX_LINES = Number.parseInt(process.env.MAX_FILE_LINES ?? "600", 10);
const ROOT_DIR = process.cwd();
const TARGET_DIRS = ["src", "scripts", "tests", "docs"];
const ALLOWED_EXTENSIONS = new Set([".astro", ".ts", ".js", ".mjs", ".json", ".md", ".css"]);
const EXCLUDED_RELATIVE_PATHS = new Set(["src/content/substack-cache.json"]);

function shouldSkip(fullPath) {
  const relativePath = relative(ROOT_DIR, fullPath).replaceAll("\\", "/");

  if (EXCLUDED_RELATIVE_PATHS.has(relativePath)) {
    return true;
  }

  const extension = extname(fullPath);
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return true;
  }

  return false;
}

function collectFiles(directoryPath, collected = []) {
  if (!statSync(directoryPath).isDirectory()) {
    return collected;
  }

  const entries = readdirSync(directoryPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue;
    }

    const fullPath = join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, collected);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (!shouldSkip(fullPath)) {
      collected.push(fullPath);
    }
  }

  return collected;
}

function countLines(filePath) {
  const content = readFileSync(filePath, "utf-8");
  if (content.length === 0) {
    return 0;
  }

  return content.split(/\r?\n/).length;
}

function main() {
  if (!Number.isFinite(MAX_LINES) || MAX_LINES <= 0) {
    console.error(`[max-lines] Invalid MAX_FILE_LINES value: ${process.env.MAX_FILE_LINES}`);
    process.exit(1);
  }

  const existingDirs = TARGET_DIRS
    .map((dir) => join(ROOT_DIR, dir))
    .filter((dir) => {
      try {
        return statSync(dir).isDirectory();
      } catch {
        return false;
      }
    });

  const files = existingDirs.flatMap((dir) => collectFiles(dir));
  const offenders = [];

  for (const filePath of files) {
    const lines = countLines(filePath);
    if (lines > MAX_LINES) {
      offenders.push({
        path: relative(ROOT_DIR, filePath).replaceAll("\\", "/"),
        lines,
      });
    }
  }

  if (offenders.length > 0) {
    console.error(`[max-lines] Found ${offenders.length} file(s) above ${MAX_LINES} lines:`);
    for (const offender of offenders) {
      console.error(`- ${offender.path}: ${offender.lines} lines`);
    }
    process.exit(1);
  }

  console.log(`[max-lines] OK: ${files.length} files checked, max ${MAX_LINES} lines.`);
}

main();
