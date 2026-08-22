// Captura screenshots das principais telas em desktop e mobile
// Uso: node screenshots.mjs [before|after]

import pw from '/Users/pedrohasimoto/Desktop/Claude/node_modules/playwright/index.js';
import path from 'node:path';
import fs from 'node:fs';
const { chromium } = pw;

const APP_URL = process.env.APP_URL || 'https://einsteinvalid.vercel.app';
const label = process.argv[2] || 'now';
const OUT_DIR = path.resolve(new URL('.', import.meta.url).pathname, `screenshots/${label}`);
fs.mkdirSync(OUT_DIR, { recursive: true });

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 390, height: 844 },
];

// Cenas: (label, prep-fn)
async function prepLogin(page) { /* nada — abre login */ }
async function prepDemo(page) {
  await page.waitForSelector('#login-user', { timeout: 8000 });
  await page.fill('#login-user', 'demo');
  await page.fill('#login-pass', 'demo');
  await page.click('#login-btn');
  await page.waitForFunction(() => !document.getElementById('login-overlay').classList.contains('show'), null, { timeout: 8000 });
  await page.waitForTimeout(1200);
}
async function prepMedico(page) {
  await prepDemo(page);
  // A tab do médico já é a única — não precisa clicar
}
async function prepEscalaAdmin(page) {
  await prepDemo(page);
  // No demo o user é médico, não admin — pulamos escala
}

// scenes: { name, url (query), prep }
const SCENES = [
  { name: '01_login', url: '/?demo=radiologia', prep: prepLogin },
  { name: '02_medico_radio', url: '/?demo=radiologia', prep: prepMedico },
  { name: '03_medico_derma', url: '/?demo=dermatologia', prep: prepMedico },
  { name: '04_medico_eco', url: '/?demo=ecocardiografia', prep: prepMedico },
  { name: '05_medico_endo', url: '/?demo=endoscopia', prep: prepMedico },
];

(async () => {
  console.log(`Salvando em: ${OUT_DIR}`);
  const browser = await chromium.launch();
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
      isMobile: vp.name === 'mobile',
      hasTouch: vp.name === 'mobile',
    });
    for (const s of SCENES) {
      const page = await ctx.newPage();
      await page.goto(`${APP_URL}${s.url}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      try { await s.prep(page); } catch(e){ console.warn(`   (prep falhou em ${s.name}: ${e.message})`); }
      await page.waitForTimeout(500);
      const filename = `${s.name}_${vp.name}.png`;
      await page.screenshot({ path: path.join(OUT_DIR, filename), fullPage: true });
      console.log(`✓ ${filename}`);
      await page.close();
    }
    await ctx.close();
  }
  await browser.close();
})();
