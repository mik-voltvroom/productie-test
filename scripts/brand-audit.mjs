import fs from 'node:fs';
import path from 'node:path';

const roots = ['app', 'components', 'lib'];
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.md']);
const violations = [];
const rules = [
  { name: 'legacy Caroutlet reference', re: /caroutlet(?:groningen)?/i },
  { name: 'legacy AUTOMOTIVE lockup', re: /VOLT\s*&\s*VROOM\s+AUTOMOTIVE|AUTOMOTIVE\s*<\/|>\s*AUTOMOTIVE\s*</i },
  { name: 'prohibited neon/red identity color', re: /#(?:ff0000|ff3b30|ff2d55)\b/i },
  { name: 'prohibited glow effect', re: /(?:box-shadow|text-shadow)\s*:[^;]*(?:glow|0\s+0\s+(?:[2-9]\d|\d{3,})px)/i },
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return extensions.has(path.extname(entry.name)) ? [full] : [];
  });
}

const files = roots.flatMap(walk);
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  for (const rule of rules) {
    if (rule.re.test(text)) violations.push(`${file}: ${rule.name}`);
  }
}

if (violations.length) {
  console.error('VV brand audit failed:');
  violations.forEach((v) => console.error(`- ${v}`));
  process.exit(1);
}
console.log(`VV brand audit passed (${files.length} source files checked).`);
