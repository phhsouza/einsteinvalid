// Grava vídeo demonstrativo da funcionalidade de exames extras globais.
// A demonstração mostra o fluxo completo: médico registra exames durante
// setembro mesmo sem a escala publicada; exames aparecem automaticamente
// no extrato quando o admin faz o upload em outubro.
//
// Uso:
//   node record-exames-demo.mjs
//
// Gera: output/demo_exames_extras.webm

import pw from '/Users/pedrohasimoto/Desktop/Claude/node_modules/playwright/index.js';
const { chromium } = pw;
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_URL = process.env.APP_URL || 'https://einsteinvalid.vercel.app';
const OUT_DIR = path.join(__dirname, 'output');
fs.mkdirSync(OUT_DIR, { recursive: true });

// ── Overlay helpers ────────────────────────────────────────────────────────
async function caption(page, text, ms = 2600){
  await page.evaluate((t) => {
    let el = document.getElementById('__caption');
    if(!el){
      el = document.createElement('div');
      el.id = '__caption';
      el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);'
        + 'background:rgba(0,0,0,0.88);color:white;padding:11px 18px;border-radius:10px;'
        + 'font-family:system-ui,sans-serif;font-size:15px;font-weight:600;line-height:1.35;'
        + 'z-index:999999;box-shadow:0 6px 24px rgba(0,0,0,0.4);'
        + 'transition:opacity 0.3s;opacity:0;pointer-events:none;max-width:88%;text-align:center;';
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
  await page.waitForTimeout(250);
}

async function pointArrow(page, selector, ms = 1500){
  const found = await page.evaluate(({sel}) => {
    const target = document.querySelector(sel);
    if(!target) return false;
    const rect = target.getBoundingClientRect();
    let arrow = document.getElementById('__arrow');
    if(!arrow){
      arrow = document.createElement('div');
      arrow.id = '__arrow';
      arrow.style.cssText = 'position:fixed;font-size:30px;z-index:999998;'
        + 'transition:all 0.35s;pointer-events:none;'
        + 'filter:drop-shadow(0 3px 6px rgba(0,0,0,0.5));opacity:0;';
      arrow.textContent = '👉';
      document.body.appendChild(arrow);
    }
    const arrowSize = 30;
    if(rect.left < arrowSize + 8){
      arrow.textContent = '👇';
      arrow.style.left = (rect.left + rect.width/2 - arrowSize/2) + 'px';
      arrow.style.top = Math.max(4, rect.top - arrowSize - 4) + 'px';
    } else {
      arrow.textContent = '👉';
      arrow.style.left = (rect.left - arrowSize - 6) + 'px';
      arrow.style.top = (rect.top + rect.height/2 - arrowSize/2) + 'px';
    }
    requestAnimationFrame(() => { arrow.style.opacity = '1'; });
    return true;
  }, {sel: selector});
  if(!found) return;
  await page.waitForTimeout(ms);
  await page.evaluate(() => {
    const el = document.getElementById('__arrow');
    if(el) el.style.opacity = '0';
  });
  await page.waitForTimeout(150);
}

async function scrollTo(page, selector){
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if(el) el.scrollIntoView({behavior:'smooth', block:'center'});
  }, selector);
  await page.waitForTimeout(700);
}

async function hideOverlays(page){
  await page.evaluate(() => {
    ['__caption','__arrow'].forEach(id => {
      const el = document.getElementById(id);
      if(el) el.style.opacity = '0';
    });
  });
}

// ── Adiciona um exame extra via formulário ─────────────────────────────────
async function addExame(page, dataIso, prt){
  await scrollTo(page, '#medico-prod-card');

  // Preenche data
  await page.fill('#prod-data', dataIso);
  await page.waitForTimeout(300);

  // Preenche ID do paciente
  const prtEl = await page.$('#prod-prt');
  if(prtEl){
    await prtEl.click({ clickCount: 3 });
    await page.keyboard.type(prt, { delay: 80 });
  }
  await page.waitForTimeout(300);

  // Clica em Adicionar
  await page.click('.prod-btn');
  await page.waitForTimeout(800);
}

// ── Cena principal ─────────────────────────────────────────────────────────
async function recordDemo(){
  console.log('▶ Gravando demo_exames_extras…');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    recordVideo: { dir: OUT_DIR, size: { width: 390, height: 844 } },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  // ── 1. Login ──────────────────────────────────────────────────────────
  await page.goto(`${APP_URL}/?demo=ecocardiografia`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.waitForSelector('#login-overlay.show', { timeout: 10000 });

  await caption(page, 'EinsteinValid — Exames Extras', 2200);
  await caption(page, 'Nova funcionalidade: registre exames a qualquer momento', 2600);

  await pointArrow(page, '#login-user', 900);
  await page.click('#login-user');
  await page.keyboard.type('demo', { delay: 130 });
  await page.waitForTimeout(300);
  await pointArrow(page, '#login-pass', 900);
  await page.click('#login-pass');
  await page.keyboard.type('demo', { delay: 130 });
  await page.waitForTimeout(400);
  await pointArrow(page, '#login-btn', 900);
  await page.click('#login-btn');
  await page.waitForTimeout(1000);

  // ── 2. Tela do médico — contexto ──────────────────────────────────────
  await page.waitForSelector('#medico-stats .stat', { timeout: 15000 });
  await caption(page, 'Você está no extrato de agosto (mês vigente)', 2400);
  await caption(page, 'É início de setembro — a escala de setembro ainda não foi publicada', 2800);

  // Mostra card de validação (status atual)
  await scrollTo(page, '#medico-validacao-card');
  await caption(page, 'A escala de setembro está sendo preparada pelo admin', 2400);

  // ── 3. Seção de exames extras ─────────────────────────────────────────
  await scrollTo(page, '#medico-prod-card');
  await caption(page, 'Mas você já pode registrar os exames extras que realizou em setembro', 2800);

  // Aponta para o campo de data
  await pointArrow(page, '#prod-data', 1200);
  await caption(page, 'Escolha a data em que o exame foi realizado', 2200);

  // ── 4. Adicionar exame 1 — 01/09/2026 ────────────────────────────────
  await scrollTo(page, '#medico-prod-card');
  await caption(page, 'Exame realizado em 1º de setembro', 1800);
  await addExame(page, '2026-09-01', '112233');
  await pointArrow(page, '.prod-list', 1400);
  await caption(page, 'Exame registrado! Salvo com a data de realização.', 2400);

  // ── 5. Adicionar exame 2 — 03/09/2026 ────────────────────────────────
  await caption(page, 'Registre quantos exames quiser ao longo do mês', 2200);
  await addExame(page, '2026-09-03', '445566');
  await page.waitForTimeout(400);
  await addExame(page, '2026-09-10', '778899');
  await page.waitForTimeout(400);

  await scrollTo(page, '#medico-prod-card');
  await caption(page, '3 exames registrados para setembro', 2000);

  // ── 6. Nota sobre extrato de agosto ───────────────────────────────────
  await scrollTo(page, '#medico-tbl');
  await caption(page, 'Os exames de setembro não interferem no extrato de agosto', 2600);
  await caption(page, 'Cada exame fica vinculado à sua data de realização', 2400);

  // ── 7. Explicação do fluxo ────────────────────────────────────────────
  await scrollTo(page, '#medico-stats');
  await caption(page, 'Em 1º de outubro, o admin fará o upload da escala de setembro', 2800);
  await caption(page, 'Os exames de setembro aparecem automaticamente no extrato', 2800);
  await caption(page, 'Sem necessidade de relançar dados retroativamente!', 2600);

  // ── 8. Encerramento ───────────────────────────────────────────────────
  await hideOverlays(page);
  await page.waitForTimeout(800);
  await context.close();
  await browser.close();

  // Renomeia arquivo
  const files = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.webm'));
  const latest = files.map(f => ({f, m: fs.statSync(path.join(OUT_DIR, f)).mtimeMs})).sort((a,b)=>b.m-a.m)[0];
  if(latest){
    const finalPath = path.join(OUT_DIR, 'demo_exames_extras.webm');
    if(fs.existsSync(finalPath)) fs.unlinkSync(finalPath);
    fs.renameSync(path.join(OUT_DIR, latest.f), finalPath);
    const sizeMb = (fs.statSync(finalPath).size / 1024 / 1024).toFixed(2);
    console.log(`✓ demo_exames_extras: ${finalPath} (${sizeMb} MB)`);
  }
}

recordDemo().catch(err => { console.error(err); process.exit(1); });
