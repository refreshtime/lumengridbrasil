/**
 * LUMENGRID — Importação Google Sheets → Supabase (PostgreSQL)
 *
 * Uso:
 *   node import-sheets.js              # importa tudo
 *   node import-sheets.js --backup-only # só faz backup JSON local
 *   node import-sheets.js --sheet crm  # importa só uma planilha
 *
 * Pré-requisitos:
 *   1. Copiar .env.example → .env e preencher
 *   2. Baixar JSON da Service Account do Google Cloud → google-service-account.json
 *   3. npm install
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Configuração ─────────────────────────────────────────────────────────────

const DRY_RUN    = process.env.DRY_RUN === 'true';
const BACKUP_DIR = join(__dirname, process.env.BACKUP_DIR || '../BACKUPS');
const TODAY      = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const BACKUP_SUBDIR = join(BACKUP_DIR, `sheets_${TODAY}`);

const SHEET_IDS = {
  crm:       process.env.SHEET_ID_CRM,
  fin:       process.env.SHEET_ID_FIN,
  contratos: process.env.SHEET_ID_CONTRATOS,
  parceiros: process.env.SHEET_ID_PARCEIROS,
  leads:     process.env.SHEET_ID_LEADS,
  checklist: process.env.SHEET_ID_CHECKLIST,
  videos:    process.env.SHEET_ID_VIDEOS,
};

// Quais planilhas importar (definido pelo --sheet arg ou todas)
const targetArg  = process.argv.find((a, i) => process.argv[i-1] === '--sheet');
const TARGETS    = targetArg ? [targetArg] : Object.keys(SHEET_IDS).filter(k => SHEET_IDS[k]);
const BACKUP_ONLY = process.argv.includes('--backup-only');

// ── Clientes ──────────────────────────────────────────────────────────────────

function buildSheetsClient() {
  const keyFile = process.env.GOOGLE_SA_KEY_FILE
    ? join(__dirname, process.env.GOOGLE_SA_KEY_FILE)
    : null;
  const keyJson  = process.env.GOOGLE_SA_JSON
    ? JSON.parse(process.env.GOOGLE_SA_JSON)
    : null;

  if (!keyFile && !keyJson) {
    throw new Error(
      'Configure GOOGLE_SA_KEY_FILE ou GOOGLE_SA_JSON no .env\n' +
      'Guia: console.cloud.google.com → IAM → Service Accounts → Keys'
    );
  }

  const auth = new google.auth.GoogleAuth({
    ...(keyFile ? { keyFile } : { credentials: keyJson }),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  return google.sheets({ version: 'v4', auth });
}

function buildSupabaseClient() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    throw new Error('Configure SUPABASE_URL e SUPABASE_SERVICE_KEY no .env');
  }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
}

// ── Utilitários ───────────────────────────────────────────────────────────────

function saveBackup(name, data) {
  if (!existsSync(BACKUP_SUBDIR)) mkdirSync(BACKUP_SUBDIR, { recursive: true });
  const path = join(BACKUP_SUBDIR, `${name}.json`);
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`  💾 Backup salvo: ${path}`);
}

async function readSheet(sheets, spreadsheetId, range = '!A:ZZ') {
  if (!spreadsheetId) return [];
  try {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    return res.data.values || [];
  } catch (err) {
    console.warn(`  ⚠️  Erro ao ler sheet ${spreadsheetId}: ${err.message}`);
    return [];
  }
}

async function readAllTabs(sheets, spreadsheetId) {
  if (!spreadsheetId) return {};
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const tabs = meta.data.sheets.map(s => s.properties.title);
    const result = {};
    for (const tab of tabs) {
      const rows = await readSheet(sheets, spreadsheetId, `${tab}!A:ZZ`);
      result[tab] = rows;
    }
    return result;
  } catch (err) {
    console.warn(`  ⚠️  Erro ao listar abas ${spreadsheetId}: ${err.message}`);
    return {};
  }
}

function rowsToObjects(rows) {
  if (!rows || rows.length < 2) return [];
  const [headers, ...data] = rows;
  return data.map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
    return obj;
  });
}

function parseDate(val) {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function parseNum(val) {
  if (val === '' || val == null) return null;
  const n = parseFloat(String(val).replace(/[R$\s.]/g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
}

// ── Importadores por planilha ─────────────────────────────────────────────────

async function importCRM(sheets, supabase) {
  console.log('\n📋 Importando CRM...');
  const tabs = await readAllTabs(sheets, SHEET_IDS.crm);

  // Tab CRM_Dados → leads
  const crmData = tabs['CRM_Dados'] || [];
  const leads   = rowsToObjects(crmData);

  saveBackup('crm_leads', leads);
  if (BACKUP_ONLY) return { leads: leads.length };

  let ok = 0, fail = 0;
  for (const raw of leads) {
    // O CRM guarda dados como JSON blob em algumas células — tenta parsear
    let extra = {};
    try { extra = typeof raw.json_data === 'string' ? JSON.parse(raw.json_data) : {}; } catch {}

    const row = {
      nome:      raw['Nome'] || raw['nome'] || extra.nome || '',
      telefone:  String(raw['Telefone'] || raw['tel'] || extra.tel || ''),
      email:     raw['E-mail'] || raw['email'] || extra.email || null,
      cidade:    raw['Cidade'] || raw['cidade'] || extra.cidade || null,
      kwh:       parseNum(raw['kWh'] || extra.kwh),
      sistema:   raw['Sistema'] || extra.sistema || null,
      origem:    raw['Origem'] || extra.origem || null,
      responsavel: raw['Responsável'] || extra.responsavel || null,
      stage:     raw['Stage'] || raw['Etapa'] || extra.stage || 'Novo Lead',
      kwp:       parseNum(raw['kWp'] || extra.kwp),
      valor_projeto: parseNum(raw['Valor'] || extra.valor_projeto),
      parceiro:  raw['Parceiro'] || extra.parceiro || null,
      raw_json:  raw,
    };

    if (!row.nome) { fail++; continue; }

    if (!DRY_RUN) {
      const { error } = await supabase.from('leads').upsert(row, {
        onConflict: 'nome,telefone',
        ignoreDuplicates: false,
      });
      if (error) { console.warn(`  ⚠️  lead "${row.nome}":`, error.message); fail++; }
      else ok++;
    } else {
      ok++;
    }
  }

  console.log(`  ✅ Leads: ${ok} importados, ${fail} erros`);
  return { leads: ok };
}

async function importFinanceiro(sheets, supabase) {
  console.log('\n💰 Importando Financeiro...');
  const tabs = await readAllTabs(sheets, SHEET_IDS.fin);

  // Tenta abas conhecidas
  const lancamentos = rowsToObjects(tabs['Lancamentos'] || tabs['Lançamentos'] || []);
  const receitas    = rowsToObjects(tabs['Fin_Receitas'] || tabs['Receitas'] || []);
  const despesas    = rowsToObjects(tabs['Fin_Despesas'] || tabs['Despesas'] || []);

  saveBackup('fin_lancamentos', lancamentos);
  saveBackup('fin_receitas', receitas);
  saveBackup('fin_despesas', despesas);
  if (BACKUP_ONLY) return { lancamentos: lancamentos.length, receitas: receitas.length, despesas: despesas.length };

  let ok = 0, fail = 0;

  const toInsert = [
    ...lancamentos.map(r => ({ tipo: 'previsao', raw: r })),
    ...receitas.map(r => ({ tipo: 'receita', raw: r })),
    ...despesas.map(r => ({ tipo: 'despesa', raw: r })),
  ];

  for (const { tipo, raw } of toInsert) {
    const desc = raw['Descrição'] || raw['Descricao'] || raw['Cliente'] || raw['Cliente/Fornecedor'] || '(sem descrição)';
    const row = {
      tipo,
      situacao:           raw['Situação'] || raw['Status'] || 'Em aberto',
      descricao:          desc,
      cliente_fornecedor: raw['Cliente/Fornecedor'] || raw['Cliente'] || null,
      categoria:          raw['Categoria'] || null,
      grupo_dre:          raw['Grupo DRE'] || null,
      num_contrato:       raw['Nº Contrato'] || raw['Projeto ID'] || null,
      data_emissao:       parseDate(raw['Data Emissão'] || raw['Data']),
      data_competencia:   parseDate(raw['Data Competência'] || raw['Mês Competência'] || raw['Data']),
      data_vencimento:    parseDate(raw['Data Vencimento'] || raw['Data Venc.']),
      valor_previsto:     parseNum(raw['Valor Previsto (R$)'] || raw['Valor (R$)'] || raw['Valor Total'] || raw['Valor Bruto']),
      parcela:            parseInt(raw['Parcela']) || null,
      qtd_parcelas:       parseInt(raw['Qtd Parcelas']) || null,
      forma_pagamento:    raw['Forma Prevista'] || raw['Forma Pagamento'] || raw['Método'] || null,
      conta:              raw['Conta Prevista'] || raw['Conta'] || null,
      observacoes:        raw['Observações'] || raw['Observação'] || null,
      criado_por:         raw['Criado por'] || raw['Lançado por'] || null,
      ativo:              raw['Ativo'] !== 'FALSE',
      raw_json:           raw,
    };

    if (!DRY_RUN) {
      const { error } = await supabase.from('financial_entries').insert(row);
      if (error) { console.warn(`  ⚠️  lançamento "${desc}":`, error.message); fail++; }
      else ok++;
    } else {
      ok++;
    }
  }

  console.log(`  ✅ Lançamentos: ${ok} importados, ${fail} erros`);
  return { lancamentos: ok };
}

async function importContratos(sheets, supabase) {
  console.log('\n📄 Importando Contratos...');
  const tabs = await readAllTabs(sheets, SHEET_IDS.contratos);
  const rows = rowsToObjects(tabs['Contratos'] || tabs['Sheet1'] || Object.values(tabs)[0] || []);

  saveBackup('contratos', rows);
  if (BACKUP_ONLY) return { contratos: rows.length };

  let ok = 0, fail = 0;
  for (const raw of rows) {
    const row = {
      num_contrato:    raw['Nº Contrato'] || raw['ID'] || null,
      data_emissao:    parseDate(raw['Data'] || raw['Data Emissão']),
      cliente:         raw['Cliente'] || '',
      cpf_cnpj:        raw['CPF/CNPJ'] || null,
      telefone:        String(raw['Telefone'] || ''),
      email:           raw['E-mail'] || null,
      tipo_sistema:    raw['Tipo'] || null,
      kvp:             parseNum(raw['kVp'] || raw['kWp']),
      valor_total:     parseNum(raw['Valor Total (R$)'] || raw['Valor']),
      forma_pagamento: raw['Forma Pagamento'] || raw['Condições'] || null,
      consultor:       raw['Consultor'] || null,
      status:          raw['Status'] || 'Emitido',
      raw_json:        raw,
    };

    if (!row.cliente) { fail++; continue; }

    if (!DRY_RUN) {
      const { error } = await supabase.from('contracts').upsert(row, {
        onConflict: 'num_contrato',
        ignoreDuplicates: false,
      });
      if (error) { console.warn(`  ⚠️  contrato "${row.num_contrato}":`, error.message); fail++; }
      else ok++;
    } else {
      ok++;
    }
  }

  console.log(`  ✅ Contratos: ${ok} importados, ${fail} erros`);
  return { contratos: ok };
}

async function importParceiros(sheets, supabase) {
  console.log('\n🤝 Importando Parceiros...');
  const tabs = await readAllTabs(sheets, SHEET_IDS.parceiros);

  // Cada aba pode ser um parceiro diferente
  let totalOk = 0, totalFail = 0;

  for (const [tabName, tabRows] of Object.entries(tabs)) {
    const rows = rowsToObjects(tabRows);
    saveBackup(`parceiro_${tabName}`, rows);
    if (BACKUP_ONLY) continue;

    // Busca ou cria o parceiro
    const { data: partnerArr } = await supabase
      .from('partners')
      .select('id')
      .ilike('nome', tabName)
      .limit(1);

    let partnerId = partnerArr?.[0]?.id;
    if (!partnerId) {
      const { data: created } = await supabase
        .from('partners')
        .insert({ nome: tabName, slug: tabName.toLowerCase() })
        .select('id')
        .single();
      partnerId = created?.id;
    }
    if (!partnerId) { console.warn(`  ⚠️  Não encontrou partner "${tabName}"`); continue; }

    for (const raw of rows) {
      const row = {
        partner_id:         partnerId,
        nome:               raw['Nome'] || raw['Cliente'] || '',
        telefone:           String(raw['Telefone'] || ''),
        email:              raw['E-mail'] || null,
        endereco:           raw['Endereço'] || null,
        cidade:             raw['Cidade'] || null,
        data_indicacao:     parseDate(raw['Data Indicação'] || raw['Data']),
        status:             raw['Status'] || 'Novo',
        kwp:                parseNum(raw['kWp']),
        valor_projeto:      parseNum(raw['Valor Projeto']),
        custo_equipamento:  parseNum(raw['Custo Equipamento']),
        custo_instalacao:   parseNum(raw['Custo Instalação']),
        margem_liquida:     parseNum(raw['Margem Líquida']),
        pct_comissao:       parseNum(raw['% Comissão']),
        comissao_estimada:  parseNum(raw['Comissão Estimada']),
        comissao_paga:      parseNum(raw['Comissão Paga']) || 0,
        observacoes:        raw['Observações'] || null,
        raw_json:           raw,
      };

      if (!row.nome) { totalFail++; continue; }

      if (!DRY_RUN) {
        const { error } = await supabase.from('partner_referrals').insert(row);
        if (error) { console.warn(`  ⚠️  referral "${row.nome}":`, error.message); totalFail++; }
        else totalOk++;
      } else {
        totalOk++;
      }
    }
  }

  console.log(`  ✅ Indicações: ${totalOk} importadas, ${totalFail} erros`);
  return { indicacoes: totalOk };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('════════════════════════════════════════════════════════');
  console.log(' LUMENGRID — Migração Google Sheets → Supabase');
  console.log(`  Data: ${new Date().toLocaleString('pt-BR')}`);
  console.log(`  Modo: ${DRY_RUN ? 'DRY RUN (sem escrita no banco)' : 'PRODUÇÃO'}`);
  console.log(`  Targets: ${TARGETS.join(', ')}`);
  if (BACKUP_ONLY) console.log('  ⚠️  Modo --backup-only: apenas salva JSONs locais');
  console.log('════════════════════════════════════════════════════════');

  let sheets, supabase;
  try {
    sheets   = buildSheetsClient();
    supabase = BACKUP_ONLY ? null : buildSupabaseClient();
  } catch (err) {
    console.error('\n❌ Erro de configuração:', err.message);
    process.exit(1);
  }

  const results = {};

  for (const target of TARGETS) {
    switch (target) {
      case 'crm':       results.crm       = await importCRM(sheets, supabase); break;
      case 'fin':       results.fin       = await importFinanceiro(sheets, supabase); break;
      case 'contratos': results.contratos = await importContratos(sheets, supabase); break;
      case 'parceiros': results.parceiros = await importParceiros(sheets, supabase); break;
      default: console.warn(`\n⚠️  Target desconhecido: ${target}`);
    }
  }

  console.log('\n════════════════════════════════════════════════════════');
  console.log(' RESUMO');
  console.log('────────────────────────────────────────────────────────');
  console.log(JSON.stringify(results, null, 2));
  console.log('\n📁 Backups JSON salvos em:', BACKUP_SUBDIR);
  console.log('✅ Migração concluída!');
  console.log('\nPróximo passo: node validate.js');
}

main().catch(err => {
  console.error('\n❌ Erro fatal:', err);
  process.exit(1);
});
