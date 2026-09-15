// Build: src/custom.css -> custom.css (minified, must fit Kagi's 40000-char cap).
// Non-destructive: never writes back over the source.
// Run: node build.js   (needs `npm i` in ./test for clean-css)
import CleanCSS from './test/node_modules/clean-css/index.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, 'src', 'custom.css');
const OUT = path.join(__dirname, 'custom.css');
const CAP = 40000; // Kagi Settings > Appearance > Custom CSS hard limit

const source = fs.readFileSync(SRC, 'utf8');
const { styles, errors, warnings } = new CleanCSS({
    level: { 1: { all: true }, 2: { all: true, restructureRules: true } },
}).minify(source);

if (errors.length) {
    console.error(errors.join('\n'));
    process.exit(1);
}
for (const w of warnings) console.warn(`warning: ${w}`);

const out = styles.trim() + '\n';
if (out.length > CAP) {
    console.error(`FAIL: ${out.length} chars, ${out.length - CAP} over Kagi's ${CAP} cap. Not written.`);
    process.exit(1);
}
fs.writeFileSync(OUT, out);
console.log(`custom.css: ${source.length} -> ${out.length} chars (${CAP - out.length} to spare)`);
