#!/usr/bin/env node
/**
 * LumenGrid — Agente de Atualização de Preços
 * =============================================
 * Lê cotações em PDF de /Users/Hingrid/Downloads/Cotações/
 * Extrai: placas, inversor, módulo, preço de equipamento
 * Regra: só atualiza kits-data.js quando preço SUBIU (proteção contra promos)
 * Inteligência: propaga delta por placa para configurações vizinhas
 *
 * USO:
 *   node agente-cotacoes.mjs              → processa arquivos novos
 *   node agente-cotacoes.mjs --todos      → reprocessa todos
 *   node agente-cotacoes.mjs --dry-run    → mostra o que faria, sem salvar
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Caminhos ────────────────────────────────────────────────────────────────
const COTACOES_DIR  = '/Users/Hingrid/Downloads/Cotações';
const KITS_DATA     = path.join(__dirname, '../kits-data.js');
const LOG_FILE      = path.join(__dirname, 'cotacoes-historico.json');
const DRY_RUN       = process.argv.includes('--dry-run');
const REPROCESS_ALL = process.argv.includes('--todos');

// ── API ──────────────────────────────────────────────────────────────────────
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_KEY) {
  console.error('❌  Defina ANTHROPIC_API_KEY no ambiente.');
  process.exit(1);
}
const client = new Anthropic({ apiKey: ANTHROPIC_KEY });

// ── Log de histórico ─────────────────────────────────────────────────────────
function loadLog() {
  if (!fs.existsSync(LOG_FILE)) return { processados: {}, historico: [] };
  try { return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')); }
  catch { return { processados: {}, historico: [] }; }
}

function saveLog(log) {
  if (DRY_RUN) return;
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
}

// ── Lê kits-data.js como texto para edição pontual ──────────────────────────
function loadKitsData() {
  return fs.readFileSync(KITS_DATA, 'utf8');
}

// Extrai o array LG_KITS_OG do arquivo como objeto JS (eval seguro)
function parseKitsFromFile(src) {
  // Executa o arquivo num contexto limpo via node child process
  const code = src + '\nprocess.stdout.write(JSON.stringify({og:window.LG_KITS_OG,hi:window.LG_KITS_HI}));';
  const tmpFile = '/tmp/_lg_kits_eval.cjs';
  // Adapta window.X para global.X
  const adapted = src
    .replace(/window\./g, 'global.')
    .replace(/^/m, 'global.window=global;\n') +
    '\nprocess.stdout.write(JSON.stringify({og:global.LG_KITS_OG,hi:global.LG_KITS_HI}));';
  fs.writeFileSync(tmpFile, adapted);
  const out = execSync(`node ${tmpFile}`).toString();
  return JSON.parse(out);
}

// ── Extrai texto de PDF com Python/pypdf ─────────────────────────────────────
function extractPdfText(pdfPath) {
  const script = `
import pypdf, sys, json
reader = pypdf.PdfReader(sys.argv[1])
pages = []
for p in reader.pages:
    t = p.extract_text()
    if t: pages.append(t)
print(json.dumps({'pages': pages, 'n': len(pages)}))
`;
  const tmpPy = '/tmp/_lg_pdf_extract.py';
  fs.writeFileSync(tmpPy, script);
  try {
    const out = execSync(`python3 ${tmpPy} "${pdfPath.replace(/"/g, '\\"')}"`, {timeout: 30000}).toString();
    return JSON.parse(out);
  } catch(e) {
    return { pages: [], n: 0 };
  }
}

// ── Chama Claude para extrair dados estruturados do PDF ──────────────────────
async function extractKitData(pdfPath, pdfText) {
  const fname = path.basename(pdfPath);
  const prompt = `Você é um extrator de dados de cotações de energia solar da LumenGrid.

ARQUIVO: ${fname}
TEXTO DO PDF:
${pdfText.slice(0, 8000)}

Extraia TODOS os kits/configurações mencionados neste PDF.
Para cada kit, retorne:
- placas: número de placas (inteiro)
- wp: potência da placa em W (ex: 620)
- mod: marca+potência do módulo (ex: "Jinko 620W", "Leapton 600W", "DMEGC 625W", "Ronma 620W")
- inv: modelo do inversor (ex: "GoodWe 5kW", "FoxESS Micro", "Sigenergy 7.5kW", "GoodWe 10kW Híbrido")
- bats: número de baterias (0 se não tiver)
- equip: custo total do EQUIPAMENTO em reais (apenas inversor+módulos+bateria, SEM instalação, SEM homologação)
  - Se o PDF for "Margem de Projeto", procure o campo "EQUIPAMENTOS — INVERSOR + MÓDULOS (R$)"
  - Se for cotação Solfácil "Monte seu kit", use o valor total do kit (preço de compra no distribuidor)
- tipo: "on-grid" ou "hibrido"
- fonte: "margem-projeto" | "solfacil" | "outro"
- confianca: "alta" (campo explícito), "media" (calculado/inferido), "baixa" (estimado)

Retorne JSON válido:
{
  "kits": [
    {"placas":10,"wp":620,"mod":"Jinko 620W","inv":"GoodWe 5kW","bats":0,"equip":11170,"tipo":"on-grid","fonte":"margem-projeto","confianca":"alta"},
    ...
  ],
  "data_cotacao": "YYYY-MM-DD ou null",
  "fornecedor": "nome do fornecedor ou null",
  "observacoes": "qualquer info relevante"
}

Se não conseguir extrair nada confiável, retorne {"kits":[],"observacoes":"motivo"}.
Retorne SOMENTE o JSON, sem markdown.`;

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }]
  });

  try {
    return JSON.parse(response.content[0].text);
  } catch {
    console.warn('  ⚠  Claude retornou JSON inválido:', response.content[0].text.slice(0, 200));
    return { kits: [] };
  }
}

// ── Normaliza nome do inversor para match com kits-data.js ──────────────────
function normalizeInv(inv = '') {
  const v = inv.toLowerCase();
  if (v.includes('foxess') || v.includes('fox') || v.includes('micro')) return 'FoxESS';
  if (v.includes('hoymiles') || v.includes('hoy')) return 'FoxESS'; // micro tbm
  if (v.includes('goodwe') || v.includes('good we')) {
    const m = v.match(/(\d+\.?\d*)\s*kw/);
    const kw = m ? m[1] : '';
    if (v.includes('híbrid') || v.includes('hibrid') || v.includes('hybrid') || v.includes('hibrido'))
      return `GoodWe ${kw}kW Híbrido`;
    return `GoodWe ${kw}kW`;
  }
  if (v.includes('sigenergy') || v.includes('sig') || v.includes('sigenstor')) {
    const m = v.match(/(\d+\.?\d*)\s*kw/);
    return `Sigenergy ${m ? m[1] : ''}kW`;
  }
  return inv;
}

function normalizeMod(mod = '') {
  const v = mod.toLowerCase();
  if (v.includes('jinko')) { const m = mod.match(/\d+/); return `Jinko ${m?m[0]:'620'}W`; }
  if (v.includes('leapton') && v.includes('630')) return 'Leapton 630W';
  if (v.includes('leapton')) return 'Leapton 600W';
  if (v.includes('dmegc')) { const m = mod.match(/\d+/); return `DMEGC ${m?m[0]:'625'}W`; }
  if (v.includes('ronma')) return 'Ronma 620W';
  if (v.includes('osda')) return 'OSDA 710W';
  return mod;
}

// ── Encontra kit atual em kits-data.js ───────────────────────────────────────
function findCurrentKit(kits, placas, modNorm, invNorm) {
  return kits.find(k =>
    k.placas === placas &&
    k.mod === modNorm &&
    k.inv.includes(invNorm.includes('FoxESS') ? 'FoxESS' : invNorm)
  );
}

// ── Propaga delta por placa para kits vizinhos ───────────────────────────────
// Lógica: a variação de equipamento tem componente fixa (inversor) e variável (placa)
// Delta_por_placa ≈ ΔEquip / N_placas (simplificação conservadora)
// Aplica para outros kits do mesmo módulo SE não tiverem cotação própria recente
function propagateDelta(kits, updatedKit, deltaEquip, log, modNorm) {
  const changes = [];
  const deltaPerPlaca = deltaEquip / updatedKit.placas;
  const invFamily = updatedKit.inv.includes('FoxESS') ? 'FoxESS' : 'GoodWe';

  for (const k of kits) {
    // Mesmo módulo + mesmo tipo de inversor + placa diferente
    if (k.mod !== modNorm) continue;
    if (!k.inv.includes(invFamily)) continue;
    if (k.placas === updatedKit.placas) continue; // já foi atualizado
    if (k.equip <= 0) continue;

    // Verifica se esse kit teve cotação própria recente (últimos 30 dias)
    const hasOwnRecent = log.historico.some(h =>
      h.kits?.some(hk =>
        hk.placas === k.placas &&
        normalizeMod(hk.mod) === modNorm &&
        normalizeInv(hk.inv).includes(invFamily) &&
        hk.confianca === 'alta' &&
        new Date(h.data) > new Date(Date.now() - 30 * 86400000)
      )
    );
    if (hasOwnRecent) continue;

    // Aplica delta proporcional ao número de placas
    const deltaForThisKit = Math.round(deltaPerPlaca * k.placas);
    if (deltaForThisKit > 0) {
      changes.push({ kit: k, novoEquip: k.equip + deltaForThisKit, delta: deltaForThisKit, tipo: 'propagado' });
    }
  }
  return changes;
}

// ── Aplica mudança no texto de kits-data.js ──────────────────────────────────
function applyChangeToFile(src, kit, novoEquip) {
  // Encontra a linha do kit pelo id (se tiver) ou pela combinação placas+inv+mod
  const escapedInv = kit.inv.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedMod = kit.mod.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Padrão: {placas:N, inv:'...', mod:'...', equip:VALOR, ...}
  const pattern = new RegExp(
    `(\\{[^}]*placas:${kit.placas}[^}]*inv:'${escapedInv}'[^}]*mod:'${escapedMod}'[^}]*equip:)\\d+`,
    'g'
  );
  const pattern2 = new RegExp(
    `(\\{[^}]*placas:${kit.placas}[^}]*mod:'${escapedMod}'[^}]*inv:'${escapedInv}'[^}]*equip:)\\d+`,
    'g'
  );

  let newSrc = src.replace(pattern, `$1${novoEquip}`);
  if (newSrc === src) {
    newSrc = src.replace(pattern2, `$1${novoEquip}`);
  }
  return newSrc;
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🔍  LumenGrid — Agente de Atualização de Preços');
  console.log('================================================');
  if (DRY_RUN) console.log('⚡  MODO DRY-RUN — nenhuma alteração será salva\n');

  const log = loadLog();
  const files = fs.readdirSync(COTACOES_DIR)
    .filter(f => f.toLowerCase().endsWith('.pdf'))
    .map(f => path.join(COTACOES_DIR, f));

  const toProcess = REPROCESS_ALL
    ? files
    : files.filter(f => !log.processados[path.basename(f)]);

  if (!toProcess.length) {
    console.log('✅  Nenhum arquivo novo para processar.');
    return;
  }

  console.log(`📄  ${toProcess.length} arquivo(s) para processar\n`);

  // Carrega kits atuais
  let kitsDataSrc = loadKitsData();
  let { og: kitsOG, hi: kitsHI } = parseKitsFromFile(kitsDataSrc);

  const todasMudancas = [];
  let arquivosComDados = 0;

  for (const fpath of toProcess) {
    const fname = path.basename(fpath);
    console.log(`\n📋  Processando: ${fname}`);

    // Extrai texto
    const pdfResult = extractPdfText(fpath);
    if (!pdfResult.pages.length) {
      console.log('  ⚠  Sem texto extraível (imagem ou escaneado)');
      log.processados[fname] = { data: new Date().toISOString(), kits: 0, erro: 'sem-texto' };
      continue;
    }

    const fullText = pdfResult.pages.join('\n');
    console.log(`  📖  ${pdfResult.n} página(s) lidas`);

    // Claude extrai dados
    let extracted;
    try {
      extracted = await extractKitData(fpath, fullText);
    } catch(e) {
      console.log(`  ❌  Erro ao chamar API: ${e.message}`);
      log.processados[fname] = { data: new Date().toISOString(), kits: 0, erro: e.message };
      continue;
    }

    if (!extracted.kits?.length) {
      console.log('  ℹ  Nenhum kit identificado. Observação:', extracted.observacoes || '—');
      log.processados[fname] = { data: new Date().toISOString(), kits: 0 };
      continue;
    }

    arquivosComDados++;
    console.log(`  ✅  ${extracted.kits.length} kit(s) identificado(s)${extracted.fornecedor ? ` (${extracted.fornecedor})` : ''}`);

    // Registra no histórico
    log.historico.push({
      arquivo: fname,
      data: new Date().toISOString(),
      fornecedor: extracted.fornecedor,
      kits: extracted.kits,
      observacoes: extracted.observacoes
    });

    // Analisa cada kit extraído
    for (const rawKit of extracted.kits) {
      const modNorm = normalizeMod(rawKit.mod);
      const invNorm = normalizeInv(rawKit.inv);
      const isHibrid = rawKit.tipo === 'hibrido' || rawKit.bats > 0;
      const kitsRef = isHibrid ? kitsHI : kitsOG;

      const atual = findCurrentKit(kitsRef, rawKit.placas, modNorm, invNorm);

      if (!atual) {
        console.log(`  🆕  ${rawKit.placas}pl ${modNorm} ${invNorm}: R$${rawKit.equip.toLocaleString('pt-BR')} — não cadastrado em kits-data.js`);
        continue;
      }

      const diff = rawKit.equip - atual.equip;
      const pct = ((diff / atual.equip) * 100).toFixed(1);

      if (diff <= 0) {
        console.log(`  ↓  ${rawKit.placas}pl ${modNorm} ${invNorm}: R$${rawKit.equip.toLocaleString('pt-BR')} (cotação igual/menor que atual R$${atual.equip.toLocaleString('pt-BR')}) — SEM ATUALIZAÇÃO`);
        continue;
      }

      if (diff > atual.equip * 0.3) {
        console.log(`  ⚠  ${rawKit.placas}pl ${modNorm} ${invNorm}: variação de ${pct}% (R$+${diff.toLocaleString('pt-BR')}) acima de 30% — SUSPEITO, pulando`);
        continue;
      }

      console.log(`  📈  ${rawKit.placas}pl ${modNorm} ${invNorm}: R$${atual.equip.toLocaleString('pt-BR')} → R$${rawKit.equip.toLocaleString('pt-BR')} (+${pct}%)`);

      todasMudancas.push({
        kit: atual, novoEquip: rawKit.equip, delta: diff, tipo: 'direto',
        confianca: rawKit.confianca, arquivo: fname
      });

      // Propaga delta para kits vizinhos do mesmo módulo
      if (rawKit.confianca === 'alta') {
        const propagadas = propagateDelta(kitsRef, atual, diff, log, modNorm);
        for (const p of propagadas) {
          const pctP = ((p.delta / p.kit.equip) * 100).toFixed(1);
          console.log(`  ↗  [propagado] ${p.kit.placas}pl ${modNorm} ${p.kit.inv}: +R$${p.delta.toLocaleString('pt-BR')} (+${pctP}%)`);
          todasMudancas.push({
            kit: p.kit, novoEquip: p.novoEquip, delta: p.delta, tipo: 'propagado',
            confianca: 'media', arquivo: fname
          });
        }
      }
    }

    log.processados[fname] = { data: new Date().toISOString(), kits: extracted.kits.length };
  }

  // ── Aplica todas as mudanças ─────────────────────────────────────────────
  if (!todasMudancas.length) {
    console.log('\n✅  Nenhuma atualização necessária.');
    saveLog(log);
    return;
  }

  // Deduplicar (mesmo kit, fica com o maior equip)
  const seen = new Map();
  for (const m of todasMudancas) {
    const key = `${m.kit.placas}|${m.kit.mod}|${m.kit.inv}`;
    if (!seen.has(key) || m.novoEquip > seen.get(key).novoEquip) {
      seen.set(key, m);
    }
  }
  const mudancasFinais = [...seen.values()];

  console.log(`\n${'='.repeat(50)}`);
  console.log(`📝  RESUMO — ${mudancasFinais.length} atualização(ões)`);
  console.log('='.repeat(50));

  for (const m of mudancasFinais) {
    const icon = m.tipo === 'direto' ? '✅' : '↗ ';
    console.log(`${icon}  ${m.kit.placas}pl ${m.kit.mod} ${m.kit.inv}: ${m.kit.equip} → ${m.novoEquip} (+${m.delta}) [${m.tipo}]`);
  }

  if (!DRY_RUN) {
    // Aplica mudanças no arquivo
    for (const m of mudancasFinais) {
      kitsDataSrc = applyChangeToFile(kitsDataSrc, m.kit, m.novoEquip);
    }
    fs.writeFileSync(KITS_DATA, kitsDataSrc);
    console.log(`\n✅  kits-data.js atualizado.`);

    // Registra mudanças no log
    log.historico.push({
      tipo: 'atualizacao',
      data: new Date().toISOString(),
      mudancas: mudancasFinais.map(m => ({
        placas: m.kit.placas, mod: m.kit.mod, inv: m.kit.inv,
        de: m.kit.equip, para: m.novoEquip, delta: m.delta,
        tipo: m.tipo, arquivo: m.arquivo
      }))
    });
    saveLog(log);

    // Git push automático
    const gitDir = path.dirname(KITS_DATA);
    try {
      execSync(`cd "${gitDir}" && git add kits-data.js migration/cotacoes-historico.json && git commit -m "chore: preços atualizados via agente-cotacoes (${mudancasFinais.length} kits)" && git push`, {stdio: 'inherit'});
      console.log('✅  Publicado no GitHub.');
    } catch(e) {
      console.warn('⚠  Git push falhou — arquivos salvos localmente.');
    }
  } else {
    console.log('\n⚡  [DRY-RUN] Nenhuma alteração aplicada.');
  }
}

main().catch(e => { console.error('Erro fatal:', e); process.exit(1); });
