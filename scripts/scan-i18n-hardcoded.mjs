import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const roots = ["src"];
const extensions = new Set([".ts", ".tsx"]);
const ignoredPathParts = new Set(["node_modules", "dist", ".git", "src\\i18n", "src/i18n"]);

const hasLetters = (value) => /[A-Za-zÀ-ÿ]/u.test(value);
const literalJsxText = (line) => line.replace(/\{[^{}]*\}/g, "");

const jsxTextPattern = (tagName, name) => ({
  name,
  test: (line) => {
    const match = line.match(new RegExp(`<${tagName}\\b.*>([^<]*)<\\/${tagName}>`));
    return Boolean(match && hasLetters(literalJsxText(match[1])));
  },
});

const patterns = [
  {
    name: "toast",
    test: (line) =>
      /toast\.(success|error|info|warning|message)\s*\(\s*["'`]/.test(line) &&
      hasLetters(line),
  },
  {
    name: "placeholder",
    test: (line) => {
      const match = line.match(/placeholder\s*=\s*["']([^"']*)["']/);
      return Boolean(match && hasLetters(match[1]));
    },
  },
  {
    name: "aria-label",
    test: (line) => {
      const match = line.match(/aria-label\s*=\s*["']([^"']*)["']/);
      return Boolean(match && hasLetters(match[1]));
    },
  },
  jsxTextPattern("DialogTitle", "dialog-title"),
  jsxTextPattern("CardTitle", "card-title"),
  jsxTextPattern("Button", "button-text"),
  {
    name: "confirm",
    test: (line) => /confirm\s*\(\s*["'`]/.test(line) && hasLetters(line),
  },
  {
    name: "error",
    test: (line) => /new Error\s*\(\s*["'`]/.test(line) && hasLetters(line),
  },
];

const isIgnored = (path) => {
  const normalized = path.replaceAll("/", "\\");
  return [...ignoredPathParts].some((part) => normalized.includes(part));
};

const walk = (dir) => {
  const entries = readdirSync(dir);
  return entries.flatMap((entry) => {
    const path = join(dir, entry);
    if (isIgnored(path)) return [];
    const stat = statSync(path);
    if (stat.isDirectory()) return walk(path);
    if (!extensions.has(extname(path))) return [];
    return [path];
  });
};

const matches = [];

for (const root of roots) {
  for (const file of walk(root)) {
    const content = readFileSync(file, "utf8");
    content.split(/\r?\n/).forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("//")) return;

      for (const pattern of patterns) {
        if (pattern.test(line)) {
          matches.push({
            file: relative(process.cwd(), file),
            line: index + 1,
            pattern: pattern.name,
            text: trimmed,
          });
          break;
        }
      }
    });
  }
}

if (matches.length === 0) {
  console.log("No obvious hardcoded UI strings found.");
  process.exit(0);
}

console.log(`Found ${matches.length} possible hardcoded UI strings:\n`);
for (const match of matches) {
  console.log(`${match.file}:${match.line} [${match.pattern}] ${match.text}`);
}

process.exitCode = 1;
