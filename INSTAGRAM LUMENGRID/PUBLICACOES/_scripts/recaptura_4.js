const puppeteer = require('puppeteer');
const path = require('path');
const BASE = '/Users/Hingrid/Documents/LUMENGRID/INSTAGRAM LUMENGRID/POSTS COM IMAGENS - GPT';
const OUT = path.join(BASE, 'capturas');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const posts = [
  { file: 'post01_manifesto.html',                                name: 'post01_manifesto', type: 'single' },
  { file: 'post04_solucoes.html',                                 name: 'post04_solucoes',  type: 'single' },
  { file: 'post06_apagao OK.html',                                name: 'post06_apagao',    type: 'single' },
  { file: 'Post03_ApagaALuz.dc. - imagem html.html',             name: 'post03_apaga_a_luz', type: 'carousel', slides: 4 },
];

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--allow-file-access-from-files', '--disable-web-security', '--no-sandbox'] });
  for (const post of posts) {
    console.log('→', post.name);
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 2 });
    await page.goto('file://' + path.join(BASE, post.file), { waitUntil: 'networkidle0', timeout: 30000 });
    await sleep(900);
    const root = await page.$('body > div');
    if (post.type === 'single') {
      await root.screenshot({ path: path.join(OUT, post.name + '.png') });
      console.log('  ✓', post.name + '.png');
    } else {
      await root.screenshot({ path: path.join(OUT, post.name + '_slide01.png') });
      console.log('  ✓ slide01');
      for (let i = 2; i <= post.slides; i++) {
        await page.keyboard.press('ArrowRight');
        await sleep(650);
        const el = await page.$('body > div');
        await el.screenshot({ path: path.join(OUT, post.name + '_slide' + String(i).padStart(2, '0') + '.png') });
        console.log('  ✓ slide0' + i);
      }
    }
    await page.close();
  }
  await browser.close();
  console.log('\nPronto!');
})();
