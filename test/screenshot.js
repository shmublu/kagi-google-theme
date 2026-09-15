// Mobile screenshot capture for all theme modes.
// Run: node screenshot.js [query]
// Outputs to ./out/{mode}-{view}.png
//
// Requires ./session-token.txt (your Kagi session token) — or run `node auth.js` once first.
import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USER_DATA_DIR = path.join(__dirname, 'chrome-profile');
const TOKEN_FILE = path.join(__dirname, 'session-token.txt');
const CSS_PATH = path.join(__dirname, '..', 'custom.css');
const OUT_DIR = path.join(__dirname, 'out');

const QUERY = process.argv[2] || 'tomato plant care';

const MODES = [
    { name: 'light',          colorScheme: 'light', contrast: 'no-preference' },
    { name: 'dark',           colorScheme: 'dark',  contrast: 'no-preference' },
    { name: 'contrast',       colorScheme: 'light', contrast: 'more' },
    { name: 'contrast-dark',  colorScheme: 'dark',  contrast: 'more' },
];

const VIEWS = [
    { name: 'home',           url: 'https://kagi.com/' },
    { name: 'results-top',    url: `https://kagi.com/search?q=${encodeURIComponent(QUERY)}`, scroll: 0 },
    { name: 'results-mid',    url: `https://kagi.com/search?q=${encodeURIComponent(QUERY)}`, scroll: 600 },
    { name: 'results-bottom', url: `https://kagi.com/search?q=${encodeURIComponent(QUERY)}`, scroll: 1400 },
    { name: 'results-full',   url: `https://kagi.com/search?q=${encodeURIComponent(QUERY)}`, full: true },
];

const css = await fs.readFile(CSS_PATH, 'utf8');
await fs.mkdir(OUT_DIR, { recursive: true });

// Allow auto-bootstrap from session-token.txt if profile is empty.
let token = null;
try { token = (await fs.readFile(TOKEN_FILE, 'utf8')).trim(); } catch {}
if (token) {
    const m = token.match(/token=([^&\s]+)/);
    if (m) token = m[1];
}

const iPhone = devices['iPhone 14'];

for (const mode of MODES) {
    const ctx = await chromium.launchPersistentContext(USER_DATA_DIR, {
        headless: true,
        ...iPhone,
        colorScheme: mode.colorScheme,
        contrast: mode.contrast,
        args: ['--disable-blink-features=AutomationControlled'],
        ignoreDefaultArgs: ['--enable-automation'],
    });
    const page = ctx.pages()[0] || await ctx.newPage();
    await page.emulateMedia({ colorScheme: mode.colorScheme, contrast: mode.contrast });

    // Bootstrap session via token URL on the first navigation if we have a token.
    if (token) {
        const bootstrap = `https://kagi.com/search?q=hello&token=${encodeURIComponent(token)}`;
        await page.goto(bootstrap, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {});
    }

    for (const view of VIEWS) {
        try {
            await page.goto(view.url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
            await page.addStyleTag({ content: css });
            await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
            if (view.scroll) await page.evaluate((y) => window.scrollTo(0, y), view.scroll);
            await page.waitForTimeout(500);
            const out = path.join(OUT_DIR, `${mode.name}-${view.name}.png`);
            await page.screenshot({ path: out, fullPage: !!view.full });
            console.log(`saved ${out}`);
        } catch (e) {
            console.error(`${mode.name}/${view.name} failed: ${e.message}`);
        }
    }
    await ctx.close();
}

console.log('Done.');
