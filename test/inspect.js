// One-off DOM inspector: dump structure around the yellow "All" pill on the home page.
import { chromium, devices } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USER_DATA_DIR = path.join(__dirname, 'chrome-profile');
const iPhone = devices['iPhone 14'];

const ctx = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: true,
    ...iPhone,
    args: ['--disable-blink-features=AutomationControlled'],
    ignoreDefaultArgs: ['--enable-automation'],
});
const page = ctx.pages()[0] || await ctx.newPage();
await page.goto('https://kagi.com/', { waitUntil: 'domcontentloaded' });
await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

const dump = await page.evaluate(() => {
    const out = [];
    // Find anything that looks like a "lens" / quick-access chip
    const candidates = document.querySelectorAll('[class*="lens"], [class*="quick"], [class*="chip"], [class*="pill"], [class*="filter"], [class*="tab"]');
    const seen = new Set();
    for (const el of candidates) {
        // walk up a couple parents to surface container classes
        let cur = el;
        for (let i = 0; i < 4 && cur; i++) {
            const cls = (cur.className || '').toString();
            if (cls && !seen.has(cls)) {
                seen.add(cls);
                out.push(`${cur.tagName.toLowerCase()}.${cls.replace(/\s+/g, '.')}`);
            }
            cur = cur.parentElement;
        }
    }
    return out.slice(0, 80);
});
console.log(dump.join('\n'));

// Also: find the element backing the yellow "All" chip text
const allInfo = await page.evaluate(() => {
    const els = [...document.querySelectorAll('*')];
    const allEl = els.find((e) => e.children.length === 0 && (e.textContent || '').trim() === 'All');
    if (!allEl) return null;
    const chain = [];
    let cur = allEl;
    for (let i = 0; i < 6 && cur; i++) {
        const style = getComputedStyle(cur);
        chain.push({
            tag: cur.tagName.toLowerCase(),
            cls: (cur.className || '').toString(),
            bg: style.backgroundColor,
            color: style.color,
            border: style.border,
        });
        cur = cur.parentElement;
    }
    return chain;
});
console.log('\n--- ALL chip ancestor chain ---');
console.log(JSON.stringify(allInfo, null, 2));

await ctx.close();
