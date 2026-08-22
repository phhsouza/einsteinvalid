// Grava vídeos demonstrativos do fluxo do médico — um por setor.
// Uso:
//   node record-demo.mjs                    # todos os setores
//   node record-demo.mjs radiologia         # setor específico
//   node record-demo.mjs radiologia dermatologia_checkup   # múltiplos
//
// Gera: output/demo_<setor>.webm

import pw from '/Users/pedrohasimoto/Desktop/Claude/node_modules/playwright/index.js';
const { chromium } = pw;
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_URL = process.env.APP_URL || 'https://einsteinvalid.vercel.app';
const OUT_DIR = path.join(__dirname, 'output');
fs.mkdirSync(OUT_DIR, { recursive: true });

const SETORES = {
  radiologia:        { label: 'Radiologia' },
  dermatologia:      { label: 'Dermatologia' },
  ecocardiografia:   { label: 'Ecocardiografia' },
  clinicos_checkup:  { label: 'Clínicos Check-up' },
  ginecologia:       { label: 'Ginecologia' },
  urologia:          { label: 'Urologia' },
  endoscopia:        { label: 'Endoscopia' },
};

// ── Helpers de overlay ────────────────────────────────
async function caption(page, text, ms = 2600){
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
      arrow.style.cssText = 'position:fixed;font-size:44px;z-index:999998;'
        + 'transition:all 0.35s;pointer-events:none;'
        + 'filter:drop-shadow(0 4px 8px rgba(0,0,0,0.4));opacity:0;';
      arrow.textContent = '👉';
      document.body.appendChild(arrow);
    }
    arrow.style.left = (rect.left - 60) + 'px';
    arrow.style.top = (rect.top + rect.height/2 - 22) + 'px';
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

// ── Cenas comuns ──────────────────────────────────────
async function intro(page, setorLabel){
  await page.waitForSelector('#medico-stats .stat', { timeout: 15000 });
  await caption(page, `EinsteinValid — ${setorLabel}`, 2600);
  await caption(page, 'Sua área para conferir os plantões do mês', 2400);
}

async function showValidacao(page){
  await scrollTo(page, '#medico-validacao-card');
  await pointArrow(page, '#medico-validacao-card', 1200);
  await caption(page, 'Este é o status do seu extrato', 2000);
}

async function showDetalhamento(page){
  await scrollTo(page, '#medico-tbl');
  await caption(page, 'A tabela detalha tudo e calcula o total automaticamente', 2600);
}

async function validarExtrato(page){
  await scrollTo(page, '#medico-validacao-card');
  await pointArrow(page, '.valid-btn', 1200);
  await caption(page, 'Quando terminar, valide o extrato', 2000);
  page.on('dialog', async d => await d.accept());
  await page.click('.valid-btn');
  await page.waitForTimeout(1200);
  await hideOverlays(page);
  await scrollTo(page, '#medico-validacao-card');
  await caption(page, 'Extrato validado! O admin é notificado.', 2800);
}

// ── Cenas específicas por tipo ─────────────────────────
async function scenaRadiologia(page){
  await scrollTo(page, '#medico-noturnos-title');
  await caption(page, 'Confira os plantões noturnos do mês', 2200);
  await pointArrow(page, '#medico-noturnos .not-row:nth-child(1) input[type="checkbox"]', 1200);
  await page.click('#medico-noturnos .not-row:nth-child(1) input[type="checkbox"]');
  await caption(page, 'Marque os que foram acionados', 2000);
  await page.click('#medico-noturnos .not-row:nth-child(3) input[type="checkbox"]');
  await page.waitForTimeout(500);
  await pointArrow(page, '#medico-noturnos .not-row:nth-child(1) .not-prt input', 1200);
  const prtInp = await page.$('#medico-noturnos .not-row:nth-child(1) .not-prt input');
  if(prtInp){
    await prtInp.click();
    await page.keyboard.type('123456', { delay: 80 });
    await page.keyboard.press('Tab');
  }
  await caption(page, 'Registre o número do PRT quando houver', 2200);
}

async function scenaDermato(page){
  await scrollTo(page, '#medico-noturnos-title');
  await caption(page, 'Cada plantão vale 4h por padrão', 2200);
  await pointArrow(page, '#medico-noturnos .not-row:nth-child(1) input[type="checkbox"]', 1200);
  await page.click('#medico-noturnos .not-row:nth-child(1) input[type="checkbox"]');
  await caption(page, 'Marque "6h" nos plantões estendidos', 2400);
  await page.click('#medico-noturnos .not-row:nth-child(3) input[type="checkbox"]');
  await page.waitForTimeout(600);
}

async function scenaHoraExtras(page, ms = 2200){
  await scrollTo(page, '#medico-noturnos-title');
  await caption(page, 'Cada plantão vem com a duração padrão do setor', 2400);
  await pointArrow(page, '#medico-noturnos .not-row:nth-child(1) .he-btn:last-child', 1400);
  await caption(page, 'Adicione horas extras clicando em +', 2200);
  // clica 2 vezes no + do primeiro
  await page.click('#medico-noturnos .not-row:nth-child(1) .he-btn:last-child');
  await page.waitForTimeout(400);
  await page.click('#medico-noturnos .not-row:nth-child(1) .he-btn:last-child');
  await page.waitForTimeout(500);
  // clica 1 vez no + do terceiro
  await page.click('#medico-noturnos .not-row:nth-child(3) .he-btn:last-child');
  await page.waitForTimeout(500);
  await caption(page, 'Cada clique adiciona 0,5h · o total atualiza', ms);
}

async function scenaProdutividade(page, valorLabel){
  await scrollTo(page, '#medico-prod-card');
  await caption(page, `Registre exames extras (${valorLabel})`, 2400);
  await pointArrow(page, '#prod-prt', 1200);
  const dataInp = await page.$('#prod-data');
  if(dataInp){
    // já vem preenchido com hoje
  }
  const prtInp = await page.$('#prod-prt');
  if(prtInp){
    await prtInp.click();
    await page.keyboard.type('987654', { delay: 80 });
  }
  await pointArrow(page, '.prod-btn', 1000);
  await page.click('.prod-btn');
  await page.waitForTimeout(700);
  await caption(page, 'O valor entra automaticamente no seu total', 2400);
}

// ── Orquestração por setor ─────────────────────────────
async function recordSetor(browser, setorKey, setorLabel){
  console.log(`▶ Gravando ${setorKey}…`);
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 800 } },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto(`${APP_URL}/?demo=${setorKey}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  await intro(page, setorLabel);
  await showValidacao(page);

  const tipo = ({
    radiologia:        'radiologia',
    dermatologia:      'dermatologia',
    ecocardiografia:   'ecocardiografia',
    clinicos_checkup:  'clinicos',
    ginecologia:       'ginecologia',
    urologia:          'urologia',
    endoscopia:        'endoscopia',
  })[setorKey];

  if(tipo === 'radiologia'){
    await scenaRadiologia(page);
  } else if(tipo === 'dermatologia'){
    await scenaDermato(page);
  } else if(tipo === 'ecocardiografia'){
    await scenaHoraExtras(page);
    await scenaProdutividade(page, 'R$ 400 por exame');
  } else if(tipo === 'endoscopia'){
    await scrollTo(page, '#medico-noturnos-title');
    await caption(page, 'Cada período pago vale 6h × R$150', 2400);
    await scenaProdutividade(page, 'R$ 650 por exame');
  } else {
    // clínicos / gineco / uro
    await scenaHoraExtras(page);
  }

  await showDetalhamento(page);
  await validarExtrato(page);

  await page.waitForTimeout(700);
  await context.close();

  // Renomeia o arquivo pra ficar previsível
  const files = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.webm'));
  const latest = files.map(f => ({f, m: fs.statSync(path.join(OUT_DIR, f)).mtimeMs})).sort((a,b)=>b.m-a.m)[0];
  if(latest){
    const finalPath = path.join(OUT_DIR, `demo_${setorKey}.webm`);
    if(fs.existsSync(finalPath)) fs.unlinkSync(finalPath);
    fs.renameSync(path.join(OUT_DIR, latest.f), finalPath);
    const sizeMb = (fs.statSync(finalPath).size / 1024 / 1024).toFixed(2);
    console.log(`✓ ${setorKey}: ${finalPath} (${sizeMb} MB)`);
  }
}

async function run(){
  const args = process.argv.slice(2);
  const targets = args.length ? args.filter(k => SETORES[k]) : Object.keys(SETORES);
  if(!targets.length){
    console.error('Nenhum setor válido informado. Use um destes:');
    Object.keys(SETORES).forEach(k => console.error(`  - ${k}`));
    process.exit(1);
  }

  console.log(`URL base: ${APP_URL}`);
  console.log(`Setores: ${targets.join(', ')}\n`);

  const browser = await chromium.launch({ headless: true });
  for(const setorKey of targets){
    try {
      await recordSetor(browser, setorKey, SETORES[setorKey].label);
    } catch(err){
      console.error(`✗ ${setorKey} falhou: ${err.message}`);
    }
  }
  await browser.close();
  console.log(`\nTodos salvos em: ${OUT_DIR}`);
}

run().catch(err => { console.error(err); process.exit(1); });
