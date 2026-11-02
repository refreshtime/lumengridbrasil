const puppeteer = require('puppeteer');
const path = require('path');
const BASE = '/Users/Hingrid/Documents/LUMENGRID/INSTAGRAM LUMENGRID/POSTS COM IMAGENS - GPT';
const OUT = path.join(BASE, 'capturas');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--allow-file-access-from-files', '--disable-web-security', '--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 2 });
  await page.goto('file://' + path.join(BASE, 'post15_como_trabalhamos.html'), { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(900);

  for (let i = 1; i <= 7; i++) {
    if (i > 1) {
      await page.keyboard.press('ArrowRight');
      await sleep(650);
    }
    const el = await page.$('body > div');
    await el.screenshot({ path: path.join(OUT, 'post15_como_trabalhamos_slide' + String(i).padStart(2, '0') + '.png') });
    console.log('✓ slide' + String(i).padStart(2, '0'));
  }

  await browser.close();
  console.log('Pronto!');
})();
