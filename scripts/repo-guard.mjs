import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const ignoredDirs = new Set(["node_modules", ".next", ".git", "coverage", "_developer_pack", "_prod_ready"]);
const textExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".md", ".yaml", ".yml", ".css", ".txt", ".example"]);
const forbiddenPatterns = [
  { regex: /@caroutletgroningen\.nl/gi, label: "oud Caroutlet e-mailadres" },
  { regex: /caroutletgroningen\.nl/gi, label: "oud Caroutlet domein" },
  { regex: /packages\.applied-caas-gateway\d*\.internal\.api\.openai\.org/gi, label: "interne package-registry" },
];
const forbiddenFiles = [".env", ".env.local", ".env.production", ".env.staging"];
const hits = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    const rel = path.relative(root, full);
    if (forbiddenFiles.includes(rel) || forbiddenFiles.includes(entry.name)) {
      hits.push(`${rel}: lokaal secrets-bestand mag niet in repository`);
      continue;
    }
    const ext = path.extname(entry.name);
    if (!textExtensions.has(ext) && !entry.name.startsWith(".env")) continue;
    const content = fs.readFileSync(full, "utf8");
    for (const item of forbiddenPatterns) {
      if (item.regex.test(content)) hits.push(`${rel}: ${item.label}`);
      item.regex.lastIndex = 0;
    }
  }
}

walk(root);

const result = { ok: hits.length === 0, violations: hits };
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
