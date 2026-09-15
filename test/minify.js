// DEPRECATED: superseded by ../build.js, which reads src/custom.css and writes
// custom.css. This script minified custom.css IN PLACE, which is how the readable
// source was lost in commit 72a2f56. Do not run it.
// Lossless CSS minifier for custom.css.
// Strips comments + whitespace, shortens hex. Safe with calc() and url().
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '..', 'custom.css');

let css = fs.readFileSync(SRC, 'utf8');
const orig = css.length;

// 1) Strip /* ... */ comments.
css = css.replace(/\/\*[\s\S]*?\*\//g, '');
// 2) Collapse all whitespace runs to a single space.
css = css.replace(/\s+/g, ' ');
// 3) Trim spaces around safe punctuation only (NOT +, -, >, ~, / — those matter in calc/media).
css = css.replace(/\s*([{};,])\s*/g, '$1');
// 4) Trim space after `:` in declarations (between selector and value). Leaving `:` in pseudo-classes
//    untouched because there's never a space there. Strips both sides safely.
css = css.replace(/\s*:\s*/g, ':');
// 5) Drop trailing semicolon before `}`.
css = css.replace(/;}/g, '}');
// 6) Shorten 6-digit hex to 3-digit where the components are pairs.
css = css.replace(/#([0-9a-fA-F])\1([0-9a-fA-F])\2([0-9a-fA-F])\3\b/g, '#$1$2$3');
// 7) Newline after each `}` so the file is still skimmable.
css = css.replace(/}/g, '}\n');
// 8) Trim leading/trailing whitespace.
css = css.trim() + '\n';

fs.writeFileSync(SRC, css);
const now = css.length;
console.log(`Minified: ${orig} -> ${now} chars (${(100 * (1 - now / orig)).toFixed(1)}% smaller)`);
if (now > 40000) console.log(`WARNING: still ${now - 40000} over Kagi's 40000 cap.`);
