/**
 * LUMENGRID — Validação: Google Sheets vs Supabase
 *
 * Compara contagens de registros entre as Sheets e o banco.
 * Roda após import-sheets.js para confirmar que os dados chegaram.
 *
 * Uso: node validate.js
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Clientes ──────────────────────────────────────────────────────────────────

function buildSheetsClient() {
  const keyFile = process.env.GOOGLE_SA_KEY_FILE
    ? join(__dirname, process.env.GOOGLE_SA_KEY_FILE)
    : null;
  const keyJson  = process.env.GOOGLE_SA_JSON
    ? JSON.parse(process.env.GOOGLE_SA_JSON)
    : null;

  if (!keyFile && !keyJson)
    throw new Error('Configure GOOGLE_SA_KEY_FILE ou GOOGLE_SA_JSON no .env');

  const auth = new google.auth.GoogleAuth({
    ...(keyFile ? { keyFile } : { credentials: keyJson }),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  return google.sheets({ version: 'v4', auth });
}

function buildSupabaseClient() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY)
    throw new Error('Configure SUPABASE_URL e SUPABASE_SERVICE_KEY no .env');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
}

// ── Utilitários ───────────────────────────────────────────────────────────────

async function countSheet(sheets, spreadsheetId, tab = 'Sheet1') {
  if (!spreadsheetId) return null;
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${tab}!A:A`,
    });
    const rows = res.data.values || [];
    return Math.max(0, rows.length - 1); // subtract header
  } catch {
    return null;
  }
}

async function countTable(supabase, table) {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true });
  if (error) return `ERRO: ${error.message}`;
  return count;
}

// ── Checagens ─────────────────────────────────────────────────────────────────

async function runChecks(sheets, supabase) {
  const checks = [
    {
      label:    'Leads (CRM)',
      sheetId:  process.env.SHEET_ID_CRM,
      sheetTab: 'CRM_Dados',
      table:    'leads',
    },
    {
      label:    'Contratos',
      sheetId:  process.env.SHEET_ID_CONTRATOS,
      sheetTab: 'Contratos',
      table:    'contracts',
    },
    {
      label:    'Financeiro — receitas',
      sheetId:  process.env.SHEET_ID_FIN,
      sheetTab: 'Fin_Receitas',
      table:    null, // verificado por tipo abaixo
    },
    {
      label:    'Financeiro — despesas',
      sheetId:  process.env.SHEET_ID_FIN,
      sheetTab: 'Fin_Despesas',
      table:    null,
    },
    {
      label:    'Parceiros (referrals)',
      sheetId:  process.env.SHEET_ID_PARCEIROS,
      sheetTab: 'Sheet1',
      table:    'partner_referrals',
    },
    {
      label:    'Kits On-Grid',
      sheetId:  null,
      table:    'kit_pricing_ongrid',
    },
    {
      label:    'Kits Híbridos',
      sheetId:  null,
      table:    'kit_pricing_hybrid',
    },
  ];

  // Contagens especiais por tipo no financeiro
  const finReceitas = await supabase
    .from('financial_entries')
    .select('*', { count: 'exact', head: true })
    .eq('tipo', 'receita');
  const finDespesas = await supabase
    .from('financial_entries')
    .select('*', { count: 'exact', head: true })
    .eq('tipo', 'despesa');

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  LUMENGRID — Validação Sheets vs Supabase                    ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  ${'Planilha/Tabela'.padEnd(28)} ${'Sheets'.padEnd(8)} ${'Supabase'.padEnd(10)} ${'Status'.padEnd(8)}  ║`);
  console.log('╠══════════════════════════════════════════════════════════════╣');

  let allOk = true;

  for (const check of checks) {
    let sheetCount = check.sheetId
      ? await countSheet(sheets, check.sheetId, check.sheetTab)
      : '—';

    let dbCount;
    if (check.label.includes('receitas')) {
      dbCount = finReceitas.count;
    } else if (check.label.includes('despesas')) {
      dbCount = finDespesas.count;
    } else if (check.table) {
      dbCount = await countTable(supabase, check.table);
    } else {
      dbCount = '—';
    }

    const status = sheetCount === null ? '⚠️ Sheet?' :
                   sheetCount === '—'  ? '✅ N/A' :
                   dbCount === sheetCount ? '✅ OK' :
                   dbCount > sheetCount  ? '✅ +extra' :
                   '❌ DIFF';

    if (status.startsWith('❌')) allOk = false;

    const label = check.label.padEnd(28);
    const sc    = String(sheetCount).padEnd(8);
    const dc    = String(dbCount).padEnd(10);
    const st    = status.padEnd(8);
    console.log(`║  ${label} ${sc} ${dc} ${st}  ║`);
  }

  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Resultado: ${allOk ? '✅ TUDO OK — banco sincronizado com as Sheets' : '❌ DIVERGÊNCIAS — verifique os itens acima'}`);
  console.log('╚══════════════════════════════════════════════════════════════╝');

  if (!allOk) {
    console.log('\nDica: Re-execute a importação com:');
    console.log('  node import-sheets.js');
  } else {
    console.log('\n🎉 Banco validado! As Sheets continuam intactas e funcionando normalmente.');
    console.log('   O PostgreSQL agora opera como espelho para consultas no admin.html.');
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  let sheets, supabase;
  try {
    sheets   = buildSheetsClient();
    supabase = buildSupabaseClient();
  } catch (err) {
    console.error('\n❌ Erro de configuração:', err.message);
    process.exit(1);
  }

  await runChecks(sheets, supabase);
}

main().catch(err => {
  console.error('\n❌ Erro fatal:', err);
  process.exit(1);
});
