/**
 * LUMENGRID — Auto-Import Google Sheets → Supabase
 *
 * Roda automaticamente via cron (diário).
 * Descobre TODAS as planilhas do Drive de trabalho,
 * classifica pelo nome, e importa só o que é novo ou mudou.
 *
 * Uso:
 *   node auto-import.mjs           # importa tudo que mudou
 *   node auto-import.mjs --force   # reimporta tudo mesmo sem mudança
 *   node auto-import.mjs --dry-run # simula sem escrever no banco
 */

import 'dotenv/config';
import { google }        from 'googleapis';
import { createClient }  from '@supabase/supabase-js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync }    from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FORCE     = process.argv.includes('--force');
const DRY_RUN   = process.argv.includes('--dry-run');

// ── Classificação automática por nome da planilha ────────────────────────────
// Ordem importa: primeira regra que casar ganha.

const CLASSIFIERS = [
  { pattern: /contrato/i,                                              table: 'contracts'           },
  { pattern: /financeiro|receita|despesa|dados estruturados/i,         table: 'financial_entries'   },
  { pattern: /visita/i,                                                table: 'visit_checklists'    },
  { pattern: /homolog|vídeo|video/i,                                   table: 'homologation_records'},
  { pattern: /parceiro/i,                                              table: 'partner_referrals'   },
  { pattern: /precif|kit|equipamento/i,                                table: 'kit_pricing_ongrid'  },
  { pattern: /site/i,                                                  table: 'website_leads'       },
  { pattern: /crm|lead|leads|kelly|prospec|contato|orlando|waleads|sdr|base|retomada|primeiro contato|hub/i, table: 'leads' },
];

function classify(title) {
  for (const { pattern, table } of CLASSIFIERS) {
    if (pattern.test(title)) return table;
  }
  return null; // desconhecida → ignora
}

// ── Auth Google ───────────────────────────────────────────────────────────────

function buildGoogleAuth() {
  // Tenta Service Account primeiro
  const saFile = process.env.GOOGLE_SA_KEY_FILE
    ? join(__dirname, process.env.GOOGLE_SA_KEY_FILE)
    : null;

  if (saFile) {
    try {
      if (existsSync(saFile)) {
        return new google.auth.GoogleAuth({
          keyFile: saFile,
          scopes: [
            'https://www.googleapis.com/auth/spreadsheets.readonly',
            'https://www.googleapis.com/auth/drive.readonly',
          ],
        });
      }
    } catch {}
  }

  // Fallback: OAuth tokens
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error(
      'Configure OAuth:\n' +
      '  1. Adicione GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no .env\n' +
      '  2. Rode: node setup-google-auth.mjs\n'
    );
  }
  if (!process.env.GOOGLE_REFRESH_TOKEN) {
    throw new Error('Rode primeiro: node setup-google-auth.mjs');
  }

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  oauth2.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    access_token:  process.env.GOOGLE_ACCESS_TOKEN  || undefined,
    expiry_date:   process.env.GOOGLE_TOKEN_EXPIRY
                     ? parseInt(process.env.GOOGLE_TOKEN_EXPIRY)
                     : undefined,
  });
  return oauth2;
}

// ── Supabase ──────────────────────────────────────────────────────────────────

function buildSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
}

// ── Lê import log do Supabase ─────────────────────────────────────────────────

async function getImportLog(supabase) {
  const { data } = await supabase.from('sheet_import_log').select('*');
  const map = {};
  for (const row of data || []) map[row.sheet_id] = row;
  return map;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseNum(val) {
  if (val === '' || val == null) return null;
  const n = parseFloat(String(val).replace(/[R$\s.]/g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
}

function parseDate(val) {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function rowsToObjects(rows) {
  if (!rows || rows.length < 2) return [];
  const [headers, ...data] = rows;
  return data
    .filter(r => r.some(c => c !== ''))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { if (h) obj[h.trim()] = row[i] ?? ''; });
      return obj;
    });
}

// ── Importadores por tabela ───────────────────────────────────────────────────

async function importToLeads(supabase, rows) {
  let ok = 0, fail = 0;
  for (const raw of rows) {
    const nome = raw['Nome'] || raw['nome'] || raw['NOME'] || raw['Cliente'] || raw['cliente'] || '';
    if (!nome.trim()) { fail++; continue; }

    const row = {
      nome,
      telefone:      String(raw['Telefone'] || raw['telefone'] || raw['Tel'] || raw['Fone'] || ''),
      email:         raw['E-mail'] || raw['email'] || raw['Email'] || null,
      cidade:        raw['Cidade'] || raw['cidade'] || null,
      kwh:           parseNum(raw['kWh'] || raw['kwh'] || raw['Consumo kWh']),
      sistema:       raw['Sistema'] || raw['sistema'] || null,
      origem:        raw['Origem'] || raw['origem'] || raw['Canal'] || null,
      responsavel:   raw['Responsável'] || raw['Responsavel'] || raw['SDR'] || null,
      stage:         raw['Stage'] || raw['Etapa'] || raw['Status'] || raw['status'] || 'Novo Lead',
      kwp:           parseNum(raw['kWp'] || raw['kwp']),
      valor_projeto: parseNum(raw['Valor'] || raw['Valor Projeto'] || raw['valor_projeto']),
      parceiro:      raw['Parceiro'] || raw['parceiro'] || null,
      raw_json:      raw,
    };

    if (!DRY_RUN) {
      const { error } = await supabase.from('leads').upsert(row, {
        onConflict: 'nome,telefone',
        ignoreDuplicates: true,
      });
      if (error) fail++;
      else ok++;
    } else ok++;
  }
  return { ok, fail };
}

async function importToFinanceiro(supabase, rows, sheetTitle) {
  let ok = 0, fail = 0;
  for (const raw of rows) {
    const desc = raw['Descrição'] || raw['Descricao'] || raw['Cliente'] || raw['Cliente/Fornecedor'] || '';
    if (!desc.trim()) { fail++; continue; }

    // Detecta tipo pelo título da planilha ou pela coluna Tipo
    let tipo = raw['Tipo'] || raw['tipo'] || '';
    if (!['receita','despesa','previsao'].includes(tipo.toLowerCase())) {
      tipo = /despesa/i.test(sheetTitle) ? 'despesa'
           : /receita/i.test(sheetTitle) ? 'receita'
           : 'previsao';
    }

    const row = {
      tipo:               tipo.toLowerCase(),
      situacao:           raw['Situação'] || raw['Status'] || 'Em aberto',
      descricao:          desc,
      cliente_fornecedor: raw['Cliente/Fornecedor'] || raw['Cliente'] || null,
      categoria:          raw['Categoria'] || null,
      grupo_dre:          raw['Grupo DRE'] || null,
      num_contrato:       raw['Nº Contrato'] || raw['Contrato'] || null,
      data_emissao:       parseDate(raw['Data Emissão'] || raw['Data']),
      data_competencia:   parseDate(raw['Data Competência'] || raw['Mês']),
      data_vencimento:    parseDate(raw['Data Vencimento'] || raw['Vencimento']),
      valor_previsto:     parseNum(raw['Valor'] || raw['Valor (R$)'] || raw['Valor Total']),
      forma_pagamento:    raw['Forma Pagamento'] || raw['Método'] || null,
      conta:              raw['Conta'] || null,
      observacoes:        raw['Observações'] || null,
      raw_json:           raw,
    };

    if (!DRY_RUN) {
      const { error } = await supabase.from('financial_entries').insert(row);
      if (error) fail++;
      else ok++;
    } else ok++;
  }
  return { ok, fail };
}

async function importToContracts(supabase, rows) {
  let ok = 0, fail = 0;
  for (const raw of rows) {
    const cliente = raw['Cliente'] || raw['cliente'] || '';
    if (!cliente.trim()) { fail++; continue; }

    const row = {
      num_contrato:    raw['Nº Contrato'] || raw['ID'] || null,
      data_emissao:    parseDate(raw['Data'] || raw['Data Emissão']),
      cliente,
      cpf_cnpj:        raw['CPF/CNPJ'] || null,
      telefone:        String(raw['Telefone'] || ''),
      email:           raw['E-mail'] || null,
      tipo_sistema:    raw['Tipo'] || null,
      kvp:             parseNum(raw['kVp'] || raw['kWp']),
      valor_total:     parseNum(raw['Valor Total'] || raw['Valor']),
      forma_pagamento: raw['Forma Pagamento'] || null,
      consultor:       raw['Consultor'] || null,
      status:          raw['Status'] || 'Emitido',
      raw_json:        raw,
    };

    if (!DRY_RUN) {
      const { error } = await supabase.from('contracts').upsert(row, {
        onConflict: 'num_contrato',
        ignoreDuplicates: true,
      });
      if (error) fail++;
      else ok++;
    } else ok++;
  }
  return { ok, fail };
}

async function importToVisitas(supabase, rows) {
  let ok = 0, fail = 0;
  for (const raw of rows) {
    const cliente = raw['Cliente'] || raw['cliente'] || raw['Nome'] || '';
    if (!cliente.trim()) { fail++; continue; }

    const row = {
      data_visita:  parseDate(raw['Data'] || raw['Data Visita']),
      instalador:   raw['Instalador'] || raw['Técnico'] || null,
      cliente,
      endereco:     raw['Endereço'] || raw['Endereco'] || null,
      cidade_uf:    raw['Cidade'] || raw['Cidade/UF'] || null,
      tipo_projeto: raw['Tipo'] || raw['Sistema'] || null,
      raw_json:     raw,
    };

    if (!DRY_RUN) {
      const { error } = await supabase.from('visit_checklists').insert(row);
      if (error) fail++;
      else ok++;
    } else ok++;
  }
  return { ok, fail };
}

async function importToHomologacao(supabase, rows) {
  let ok = 0, fail = 0;
  for (const raw of rows) {
    const cliente = raw['Cliente'] || raw['Nome'] || '';
    if (!cliente.trim()) { fail++; continue; }

    const row = {
      cliente,
      num_contrato:     raw['Nº Contrato'] || raw['Contrato'] || null,
      distribuidora:    raw['Distribuidora'] || null,
      cidade:           raw['Cidade'] || null,
      status:           raw['Status'] || raw['Etapa'] || null,
      raw_json:         raw,
    };

    if (!DRY_RUN) {
      const { error } = await supabase.from('homologation_records').insert(row);
      if (error) fail++;
      else ok++;
    } else ok++;
  }
  return { ok, fail };
}

// Dispatcher: redireciona para o importador correto
async function importRows(supabase, table, rows, sheetTitle) {
  switch (table) {
    case 'leads':              return importToLeads(supabase, rows);
    case 'financial_entries':  return importToFinanceiro(supabase, rows, sheetTitle);
    case 'contracts':          return importToContracts(supabase, rows);
    case 'visit_checklists':   return importToVisitas(supabase, rows);
    case 'homologation_records': return importToHomologacao(supabase, rows);
    default:
      console.log(`    ⚠️  Tabela "${table}" sem importador definido ainda — pulando`);
      return { ok: 0, fail: 0 };
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log(' LUMENGRID — Auto-Import: Google Sheets → Supabase');
  console.log(` Data: ${new Date().toLocaleString('pt-BR')}`);
  console.log(` Modo: ${DRY_RUN ? 'DRY RUN' : 'PRODUÇÃO'}${FORCE ? ' + FORCE' : ''}`);
  console.log('═══════════════════════════════════════════════════════\n');

  // Auth
  let auth;
  try {
    auth = buildGoogleAuth();
  } catch (err) {
    console.error('❌', err.message);
    process.exit(1);
  }

  const drive    = google.drive({ version: 'v3', auth });
  const sheets   = google.sheets({ version: 'v4', auth });
  const supabase = buildSupabase();

  // Carrega log de importações anteriores
  const importLog = await getImportLog(supabase);

  // Descobre TODAS as planilhas do Drive
  console.log('🔍 Descobrindo planilhas no Google Drive...');
  let allFiles = [];
  let pageToken;
  do {
    const res = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
      fields: 'nextPageToken, files(id, name, modifiedTime)',
      pageSize: 100,
      pageToken,
    });
    allFiles = allFiles.concat(res.data.files || []);
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  console.log(`   ${allFiles.length} planilhas encontradas\n`);

  let totalOk = 0, totalFail = 0, skipped = 0, processed = 0;

  for (const file of allFiles) {
    const table = classify(file.name);

    if (!table) {
      skipped++;
      continue;
    }

    // Verifica se precisa importar (nova ou modificada)
    const log     = importLog[file.id];
    const lastMod = new Date(file.modifiedTime);
    const lastImp = log ? new Date(log.last_imported) : null;

    if (!FORCE && lastImp && lastMod <= lastImp) {
      console.log(`  ⏭  ${file.name} → sem mudanças desde ${lastImp.toLocaleDateString('pt-BR')}`);
      skipped++;
      continue;
    }

    console.log(`  📥 ${file.name}`);
    console.log(`     Tabela: ${table}`);

    processed++;
    let totalRowsOk = 0, totalRowsFail = 0;

    try {
      // Lê todas as abas
      const meta = await sheets.spreadsheets.get({ spreadsheetId: file.id });
      const tabs = meta.data.sheets.map(s => s.properties.title);

      for (const tab of tabs) {
        try {
          const res = await sheets.spreadsheets.values.get({
            spreadsheetId: file.id,
            range: `${tab}!A:ZZ`,
          });
          const rows = rowsToObjects(res.data.values || []);
          if (rows.length === 0) continue;

          const { ok, fail } = await importRows(supabase, table, rows, file.name);
          totalRowsOk   += ok;
          totalRowsFail += fail;

          console.log(`     Aba "${tab}": ${ok} importadas, ${fail} erros`);
        } catch (tabErr) {
          console.warn(`     ⚠️  Aba "${tab}": ${tabErr.message}`);
        }
      }

      totalOk   += totalRowsOk;
      totalFail += totalRowsFail;

      // Atualiza log
      if (!DRY_RUN) {
        await supabase.from('sheet_import_log').upsert({
          sheet_id:     file.id,
          sheet_title:  file.name,
          target_table: table,
          last_modified: file.modifiedTime,
          last_imported: new Date().toISOString(),
          rows_imported: totalRowsOk,
          status:       'ok',
          error_msg:    null,
        }, { onConflict: 'sheet_id' });
      }

    } catch (err) {
      console.error(`  ❌ Erro em "${file.name}": ${err.message}`);
      if (!DRY_RUN) {
        await supabase.from('sheet_import_log').upsert({
          sheet_id:     file.id,
          sheet_title:  file.name,
          target_table: table,
          last_modified: file.modifiedTime,
          last_imported: new Date().toISOString(),
          rows_imported: 0,
          status:       'error',
          error_msg:    err.message,
        }, { onConflict: 'sheet_id' });
      }
    }
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log(` RESUMO`);
  console.log(`   Planilhas processadas: ${processed}`);
  console.log(`   Planilhas ignoradas:   ${skipped} (sem mudanças ou não classificadas)`);
  console.log(`   Linhas importadas:     ${totalOk}`);
  console.log(`   Linhas com erro:       ${totalFail}`);
  console.log('═══════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('\n❌ Erro fatal:', err.message);
  process.exit(1);
});
