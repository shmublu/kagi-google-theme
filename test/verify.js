// Verifies the custom date range is reachable, with the theme applied.
// Run: node verify.js      (needs a fresh ./session-token.txt)
import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USER_DATA_DIR = path.join(__dirname, 'chrome-profile');
const css = await fs.readFile(path.join(__dirname, '..', 'custom.css'), 'utf8');

let token = null;
try { token = (await fs.readFile(path.join(__dirname, 'session-token.txt'), 'utf8')).trim(); } catch {}
if (token) { const m = token.match(/token=([^&\s]+)/); if (m) token = m[1]; }

const CASES = [
    { name: 'desktop', opts: { viewport: { width: 1280, height: 900 } } },
    { name: 'mobile',  opts: { ...devices['iPhone 14'] } },
];

for (const c of CASES) {
    const ctx = await chromium.launchPersistentContext(USER_DATA_DIR, {
        headless: true, ...c.opts,
        args: ['--disable-blink-features=AutomationControlled'],
        ignoreDefaultArgs: ['--enable-automation'],
    });
    const page = ctx.pages()[0] || await ctx.newPage();
    if (token) await page.goto(`https://kagi.com/search?q=hello&token=${encodeURIComponent(token)}`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.goto('https://kagi.com/search?q=tomato+plant+care', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    if (!page.url().includes('/search')) { console.log(`${c.name}: NOT SIGNED IN (${page.url()}) — refresh session-token.txt`); await ctx.close(); continue; }
    await page.addStyleTag({ content: css });
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});

    const report = await page.evaluate(() => {
        const vis = (el) => { if (!el) return 'absent'; const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
            return `${s.display}/${s.visibility} ${Math.round(r.width)}x${Math.round(r.height)}`; };
        const toggle = document.querySelector('#menu-advanced-search-toggle');
        return {
            advToggle: vis(toggle),
            advChip: vis(toggle && toggle.closest('.filter-item')),
            modal: vis(document.querySelector('.advanced-search-modal')),
            dateInputs: [...document.querySelectorAll('input[type="date"]')].map(vis),
            filterStripOverflow: (() => { const f = document.querySelector('.sidebar-filter-nav-form');
                if (!f) return 'absent'; const s = getComputedStyle(f); return `x:${s.overflowX} y:${s.overflowY}`; })(),
            chips: [...document.querySelectorAll('.sidebar-filter-nav-form .filter-item')].map((e) => e.textContent.trim().slice(0, 24)),
        };
    });
    console.log(`\n=== ${c.name} ===`);
    console.log(JSON.stringify(report, null, 2));

    // Open advanced search and re-check the date fields.
    const opened = await page.evaluate(() => {
        const t = document.querySelector('#menu-advanced-search-toggle');
        if (!t) return 'no toggle';
        t.checked = true; t.dispatchEvent(new Event('change', { bubbles: true }));
        return 'toggled';
    });
    await page.waitForTimeout(600);
    const after = await page.evaluate(() => {
        const vis = (el) => { if (!el) return 'absent'; const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
            return `${s.display}/${s.visibility} ${Math.round(r.width)}x${Math.round(r.height)} color=${s.color} bg=${s.backgroundColor}`; };
        return { open: opened_ = vis(document.querySelector('.advanced-search-modal')),
                 dates: [...document.querySelectorAll('input[type="date"]')].map(vis) };
    });
    console.log(`after ${opened}:`, JSON.stringify(after, null, 2));
    await page.screenshot({ path: path.join(__dirname, 'out', `verify-${c.name}-advanced.png`) });
    await ctx.close();
}
