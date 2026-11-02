const puppeteer = require('puppeteer');
const path = require('path');
const BASE = '/Users/Hingrid/Documents/LUMENGRID/INSTAGRAM LUMENGRID/POSTS COM IMAGENS - GPT';
const OUT = path.join(BASE, 'capturas');
(async () => {
  const b = await puppeteer.launch({ headless: true, args: ['--allow-file-access-from-files', '--disable-web-security', '--no-sandbox'] });
  const p = await b.newPage();
  await p.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 2 });
  await p.goto('file://' + path.join(BASE, 'post12_casa_inteligente - TROCAR FOTO.html'), { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 900));
  const el = await p.$('body > div');
  await el.screenshot({ path: path.join(OUT, 'post12_casa_inteligente.png') });
  await b.close();
  console.log('✓ post12_casa_inteligente.png');
})();
