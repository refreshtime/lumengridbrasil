const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE = __dirname;
const OUT = path.join(BASE, 'capturas');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const SCALE = 2; // 2x resolution → 2160×2700px (ideal para Instagram)

// Lista de posts — post09 excluído (ainda em edição)
const posts = [
  { file: 'post01_manifesto.html',                                          name: 'post01_manifesto',           type: 'single'   },
  { file: 'Post03_ApagaALuz.dc. - imagem html.html',                        name: 'post03_apaga_a_luz',         type: 'carousel', slides: 4 },
  { file: 'post04_solucoes.html',                                            name: 'post04_solucoes',            type: 'single'   },
  { file: 'post04_on_grid_vs_hibrido OK.html',                              name: 'post04_on_grid_vs_hibrido',  type: 'stacked',  slides: 5 },
  { file: 'post05_carro_eletrico_bateria_litio - fazer carrossel html.html', name: 'post05_carro_eletrico',      type: 'carousel', slides: 4 },
  { file: 'post06_apagao OK.html',                                           name: 'post06_apagao',              type: 'single'   },
  { file: 'post07_energia_solar OK.html',                                    name: 'post07_energia_solar',       type: 'single'   },
  { file: 'post08_sistema_hibrido- OK.html',                                 name: 'post08_sistema_hibrido',     type: 'single'   },
  { file: 'post10_bateria_residencial - MUDAR OVERLAY.html',                 name: 'post10_bateria_residencial', type: 'single'   },
  { file: 'post11_wallbox OK.html',                                          name: 'post11_wallbox',             type: 'single'   },
  { file: 'post12_casa_inteligente - TROCAR FOTO.html',                      name: 'post12_casa_inteligente',    type: 'single'   },
  { file: 'post15_como_trabalhamos.html',                                    name: 'post15_como_trabalhamos',    type: 'carousel', slides: 7 },
  { file: 'post_goodwe_inversor.html',                                       name: 'post_goodwe_inversor',       type: 'single'   },
  { file: 'post_indicacao.html',                                             name: 'post_indicacao',             type: 'single'   },
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function captureEl(el, outPath) {
  await el.screenshot({ path: outPath });
  console.log('  ✓', path.basename(outPath));
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--allow-file-access-from-files', '--disable-web-security', '--no-sandbox'],
  });

  for (const post of posts) {
    const fileExists = fs.existsSync(path.join(BASE, post.file));
    if (!fileExists) {
      console.log(`\n⚠ Arquivo não encontrado: ${post.file}`);
      continue;
    }

    console.log(`\n→ ${post.name} [${post.type}]`);
    const url = 'file://' + path.join(BASE, post.file);

    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: SCALE });

    try {
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    } catch {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    }

    await sleep(900); // aguarda fontes e imagens

    if (post.type === 'single') {
      const el = await page.$('body > div');
      await captureEl(el, path.join(OUT, `${post.name}.png`));

    } else if (post.type === 'carousel') {
      // Slide 1 já visível
      let el = await page.$('body > div');
      await captureEl(el, path.join(OUT, `${post.name}_slide01.png`));

      for (let i = 2; i <= post.slides; i++) {
        await page.keyboard.press('ArrowRight');
        await sleep(650); // aguarda transição de 0.45s + margem
        el = await page.$('body > div');
        await captureEl(el, path.join(OUT, `${post.name}_slide${String(i).padStart(2, '0')}.png`));
      }

    } else if (post.type === 'stacked') {
      // Todos os slides renderizados ao mesmo tempo — captura por ID
      for (let i = 1; i <= post.slides; i++) {
        const el = await page.$(`#s${i}`);
        if (!el) { console.log(`  ⚠ #s${i} não encontrado`); continue; }
        await captureEl(el, path.join(OUT, `${post.name}_slide${String(i).padStart(2, '0')}.png`));
      }
    }

    await page.close();
  }

  await browser.close();
  console.log(`\nPronto! ${posts.length} posts capturados em: ${OUT}`);
})();
