import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const sourceRoot = path.join(root, "apps/web/src");
const moduleRoot = path.join(sourceRoot, "modules");
const moduleNames = new Set(["belief", "markets", "intelligence", "thesis"]);
const sourceExtensions = new Set([".ts", ".tsx"]);
const importPattern = /(?:import|export)\s+(?:type\s+)?(?:[^"']*?\s+from\s+)?["']([^"']+)["']/g;

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(absolute);
    return sourceExtensions.has(path.extname(entry.name)) ? [absolute] : [];
  }));
  return nested.flat();
}

function moduleFor(file) {
  const relative = path.relative(moduleRoot, file);
  if (relative.startsWith("..")) return null;
  return relative.split(path.sep)[0];
}

function inspectImport(file, specifier) {
  const owner = moduleFor(file);
  const publicMatch = specifier.match(/^@\/modules\/([^/]+)(\/.*)?$/);

  if (publicMatch && !moduleNames.has(publicMatch[1])) {
    return `references unknown module "${publicMatch[1]}"`;
  }

  if (!owner && publicMatch?.[2]) {
    return `bypasses the ${publicMatch[1]} public API; import from "@/modules/${publicMatch[1]}"`;
  }

  if (owner && /^@\/(app|components|features|hooks)\//.test(specifier)) {
    return `domain module ${owner} depends on presentation code`;
  }

  if (owner && specifier === "@/lib/api/service") {
    return `domain module ${owner} depends on the service composition root`;
  }

  if (owner && publicMatch && publicMatch[1] === owner) {
    return `module ${owner} imports through its own public barrel; use a relative internal import`;
  }

  return null;
}

const errors = [];
for (const file of await walk(sourceRoot)) {
  const source = await readFile(file, "utf8");
  for (const match of source.matchAll(importPattern)) {
    const problem = inspectImport(file, match[1]);
    if (problem) {
      errors.push(`${path.relative(root, file)}: ${problem} (${match[1]})`);
    }
  }
}

if (errors.length > 0) {
  console.error("SignalOS module boundary check failed:\n");
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log("SignalOS module boundaries are valid.");
