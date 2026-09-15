// One-time auth using your Kagi session token.
// 1) Grab your session link from https://kagi.com/settings/user_details
//    (look for "Session Link" — it ends with ?token=XXXXX).
// 2) Either paste the token into ./session-token.txt, or pass it as an arg:
//    node auth.js <token>
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USER_DATA_DIR = path.join(__dirname, 'chrome-profile');
const TOKEN_FILE = path.join(__dirname, 'session-token.txt');

let token = process.argv[2];
if (!token) {
    try { token = (await fs.readFile(TOKEN_FILE, 'utf8')).trim(); } catch {}
}
if (!token) {
    console.error('No token. Put it in session-token.txt or pass as arg.');
    console.error('Get it from https://kagi.com/settings/user_details (Session Link).');
    process.exit(1);
}
// If user pasted the full URL, extract just the token.
const m = token.match(/token=([^&\s]+)/);
if (m) token = m[1];

const ctx = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'],
    ignoreDefaultArgs: ['--enable-automation'],
});
const page = ctx.pages()[0] || await ctx.newPage();
const bootstrapUrl = `https://kagi.com/search?q=hello&token=${encodeURIComponent(token)}`;
await page.goto(bootstrapUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
// Loading any token-bearing URL sets the kagi_session cookie in this profile.
const cookies = await ctx.cookies();
const kagiCookie = cookies.find((c) => c.name === 'kagi_session');
if (!kagiCookie) {
    console.error('Token did not produce a kagi_session cookie. Is the token valid?');
    await ctx.close();
    process.exit(2);
}
console.log(`Authenticated. Session persisted in ${USER_DATA_DIR}`);
await ctx.close();
