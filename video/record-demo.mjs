// Grava vídeo demonstrativo do fluxo do médico no EinsteinValid.
// Uso: node record-demo.mjs
// Requer Playwright (disponível em /Users/pedrohasimoto/Desktop/Claude/node_modules).
//
// Gera: demo_medico.webm (converta pra MP4 com ffmpeg se necessário).

import { chromium } from '/Users/pedrohasimoto/Desktop/Claude/node_modules/playwright/index.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_URL = process.env.APP_URL || 'https://einsteinvalid.vercel.app/?demo=1';
const OUT_DIR = path.join(__dirname, 'output');
fs.mkdirSync(OUT_DIR, { recursive: true });

// Utilitário: injeta legenda overlay
async function caption(page, text, ms = 3000){
  await page.evaluate((t) => {
    let el = document.getElementById('__caption');
    if(!el){
      el = document.createElement('div');
      el.id = '__caption';
      el.style.cssText = 'position:fixed;bottom:40px;left:50%;transform:translateX(-50%);'
        + 'background:rgba(0,0,0,0.85);color:white;padding:14px 24px;border-radius:12px;'
        + 'font-family:system-ui,sans-serif;font-size:20px;font-weight:600;'
        + 'z-index:999999;box-shadow:0 8px 32px rgba(0,0,0,0.4);'
        + 'transition:opacity 0.3s;opacity:0;pointer-events:none;max-width:80%;text-align:center;';
      document.body.appendChild(el);
    }
    el.textContent = t;
    requestAnimationFrame(() => { el.style.opacity = '1'; });
  }, text);
  await page.waitForTimeout(ms);
  await page.evaluate(() => {
    const el = document.getElementById('__caption');
    if(el) el.style.opacity = '0';
  });
  await page.waitForTimeout(300);
}

// Utilitário: seta apontando pra um elemento
async function pointArrow(page, selector, ms = 2000){
  await page.evaluate(({sel}) => {
    const target = document.querySelector(sel);
    if(!target) return;
    const rect = target.getBoundingClientRect();
    let arrow = document.getElementById('__arrow');
    if(!arrow){
      arrow = document.createElement('div');
      arrow.id = '__arrow';
      arrow.style.cssText = 'position:fixed;font-size:44px;z-index:999998;'
        + 'transition:all 0.35s;pointer-events:none;'
        + 'filter:drop-shadow(0 4px 8px rgba(0,0,0,0.4));opacity:0;';
      arrow.textContent = '👉';
      document.body.appendChild(arrow);
    }
    const x = rect.left - 60;
    const y = rect.top + rect.height/2 - 22;
    arrow.style.left = x + 'px';
    arrow.style.top = y + 'px';
    requestAnimationFrame(() => { arrow.style.opacity = '1'; });
  }, {sel: selector});
  await page.waitForTimeout(ms);
  await page.evaluate(() => {
    const el = document.getElementById('__arrow');
    if(el) el.style.opacity = '0';
  });
  await page.waitForTimeout(200);
}

async function hideOverlays(page){
  await page.evaluate(() => {
    ['__caption','__arrow'].forEach(id => {
      const el = document.getElementById(id);
      if(el) el.style.opacity = '0';
    });
  });
}

const run = async () => {
  console.log(`Recording from: ${APP_URL}`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 800 } },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // 1) Landing / carregamento
  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await caption(page, 'EinsteinValid — Conferência de plantões', 2500);

  // 2) Overview dos stats
  await page.waitForSelector('#medico-stats .stat', { timeout: 10000 });
  await caption(page, 'Aqui você vê o resumo do seu mês', 2500);
  await page.waitForTimeout(600);

  // 3) Card de validação (pendente)
  await pointArrow(page, '#medico-validacao-card', 1600);
  await caption(page, 'Este é o status do seu extrato', 2200);

  // 4) Noturnos
  await page.evaluate(() => document.getElementById('medico-noturnos-title')?.scrollIntoView({behavior:'smooth', block:'center'}));
  await page.waitForTimeout(800);
  await caption(page, 'Confira os seus plantões noturnos', 2200);

  // 5) Marca primeiro acionamento
  await pointArrow(page, '#medico-noturnos .not-row:nth-child(1) input[type="checkbox"]', 1400);
  await page.click('#medico-noturnos .not-row:nth-child(1) input[type="checkbox"]');
  await caption(page, 'Marque os plantões em que foi acionado', 2200);

  // 6) Marca segundo
  await page.click('#medico-noturnos .not-row:nth-child(3) input[type="checkbox"]');
  await page.waitForTimeout(600);

  // 7) Preencher PRT
  await pointArrow(page, '#medico-noturnos .not-row:nth-child(1) .not-prt input', 1400);
  const prtInput = await page.$('#medico-noturnos .not-row:nth-child(1) .not-prt input');
  if(prtInput){
    await prtInput.click();
    await page.keyboard.type('123456', { delay: 90 });
    await page.keyboard.press('Tab');
  }
  await caption(page, 'Registre o número do PRT quando houver', 2400);

  // 8) Rolar até o detalhamento
  await page.evaluate(() => document.getElementById('medico-tbl')?.scrollIntoView({behavior:'smooth', block:'center'}));
  await page.waitForTimeout(700);
  await caption(page, 'A tabela mostra tudo e calcula o total automaticamente', 2600);

  // 9) Rolar até o card de validação
  await page.evaluate(() => document.getElementById('medico-validacao-card')?.scrollIntoView({behavior:'smooth', block:'center'}));
  await page.waitForTimeout(700);

  // 10) Clicar em validar
  await pointArrow(page, '.valid-btn', 1400);
  await caption(page, 'Quando terminar, valide o extrato', 2200);
  // O click de validar dispara confirm() — vamos aceitar
  page.on('dialog', async d => await d.accept());
  await page.click('.valid-btn');
  await page.waitForTimeout(1200);

  // 11) Estado final: extrato validado
  await hideOverlays(page);
  await page.evaluate(() => document.getElementById('medico-validacao-card')?.scrollIntoView({behavior:'smooth', block:'center'}));
  await page.waitForTimeout(500);
  await caption(page, 'Extrato validado — o admin é notificado', 3000);

  // Fim
  await page.waitForTimeout(800);
  await context.close();
  await browser.close();

  // Encontra o arquivo gerado
  const files = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.webm'));
  const latest = files.map(f => ({f, m: fs.statSync(path.join(OUT_DIR, f)).mtimeMs})).sort((a,b)=>b.m-a.m)[0];
  if(latest){
    const finalPath = path.join(OUT_DIR, 'demo_medico.webm');
    fs.renameSync(path.join(OUT_DIR, latest.f), finalPath);
    console.log(`\n✓ Vídeo salvo em: ${finalPath}`);
    console.log(`  Duração aproximada: ${((await fs.promises.stat(finalPath)).size / 1024 / 1024).toFixed(1)} MB`);
    console.log(`\nPara converter para MP4:\n  ffmpeg -i "${finalPath}" -c:v libx264 -pix_fmt yuv420p "${finalPath.replace('.webm','.mp4')}"`);
  }
};

run().catch(err => { console.error(err); process.exit(1); });
