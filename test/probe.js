import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USER_DATA_DIR = path.join(__dirname, 'chrome-profile');
let token = null;
try { token = (await fs.readFile(path.join(__dirname,'session-token.txt'),'utf8')).trim(); } catch {}
if (token) { const m = token.match(/token=([^&\s]+)/); if (m) token = m[1]; }

const ctx = await chromium.launchPersistentContext(USER_DATA_DIR, {
  headless: true, viewport: {width:1280,height:900},
  args:['--disable-blink-features=AutomationControlled'], ignoreDefaultArgs:['--enable-automation'],
});
const page = ctx.pages()[0] || await ctx.newPage();
if (token) await page.goto(`https://kagi.com/search?q=hello&token=${encodeURIComponent(token)}`,{waitUntil:'domcontentloaded'}).catch(()=>{});
await page.goto('https://kagi.com/search?q=tomato+plant+care',{waitUntil:'domcontentloaded',timeout:30000});
await page.waitForLoadState('networkidle',{timeout:10000}).catch(()=>{});
console.log('URL:', page.url());
console.log('TITLE:', await page.title());
const html = await page.evaluate(() => {
  const f = document.querySelector('.sidebar-filter-nav-form');
  return f ? f.outerHTML : 'NO .sidebar-filter-nav-form FOUND; body classes: '+document.body.className;
});
await fs.writeFile(path.join(__dirname,'filterbar.html'), html);
console.log('len', html.length);
console.log(html.slice(0, 3000));
await ctx.close();
