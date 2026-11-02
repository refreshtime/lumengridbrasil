/**
 * LUMENGRID — Insersor de linhas (chamado pelo cron do Claude)
 *
 * Recebe via stdin um JSON:
 * { table: "leads", rows: [...], sheetId: "...", sheetTitle: "..." }
 *
 * Uso: echo '{"table":"leads","rows":[...],...}' | node insert-rows.mjs
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

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

const IMPORTERS = {
  leads: async (rows) => {
    let ok = 0, fail = 0;
    for (const raw of rows) {
      const nome = raw['Nome'] || raw['nome'] || raw['NOME'] || raw['Cliente'] || raw['cliente'] || '';
      if (!nome.trim()) { fail++; continue; }
      const { error } = await supabase.from('leads').upsert({
        nome,
        telefone:      String(raw['Telefone'] || raw['telefone'] || raw['Tel'] || ''),
        email:         raw['E-mail'] || raw['email'] || raw['Email'] || null,
        cidade:        raw['Cidade'] || raw['cidade'] || null,
        kwh:           parseNum(raw['kWh'] || raw['kwh'] || raw['Consumo kWh']),
        sistema:       raw['Sistema'] || raw['sistema'] || null,
        origem:        raw['Origem'] || raw['origem'] || raw['Canal'] || null,
        responsavel:   raw['Responsável'] || raw['Responsavel'] || raw['SDR'] || null,
        stage:         raw['Stage'] || raw['Etapa'] || raw['Status'] || 'Novo Lead',
        kwp:           parseNum(raw['kWp'] || raw['kwp']),
        valor_projeto: parseNum(raw['Valor'] || raw['Valor Projeto']),
        parceiro:      raw['Parceiro'] || raw['parceiro'] || null,
        raw_json:      raw,
      }, { onConflict: 'nome,telefone', ignoreDuplicates: true });
      error ? fail++ : ok++;
    }
    return { ok, fail };
  },

  financial_entries: async (rows, sheetTitle = '') => {
    let ok = 0, fail = 0;
    for (const raw of rows) {
      const desc = raw['Descrição'] || raw['Descricao'] || raw['Cliente'] || raw['Cliente/Fornecedor'] || '';
      if (!desc.trim()) { fail++; continue; }
      let tipo = (raw['Tipo'] || '').toLowerCase();
      if (!['receita','despesa','previsao'].includes(tipo)) {
        tipo = /despesa/i.test(sheetTitle) ? 'despesa'
             : /receita/i.test(sheetTitle) ? 'receita' : 'previsao';
      }
      const { error } = await supabase.from('financial_entries').insert({
        tipo, descricao: desc,
        situacao:           raw['Situação'] || raw['Status'] || 'Em aberto',
        cliente_fornecedor: raw['Cliente/Fornecedor'] || raw['Cliente'] || null,
        categoria:          raw['Categoria'] || null,
        num_contrato:       raw['Nº Contrato'] || raw['Contrato'] || null,
        data_emissao:       parseDate(raw['Data Emissão'] || raw['Data']),
        data_competencia:   parseDate(raw['Data Competência'] || raw['Mês']),
        data_vencimento:    parseDate(raw['Data Vencimento'] || raw['Vencimento']),
        valor_previsto:     parseNum(raw['Valor'] || raw['Valor (R$)'] || raw['Valor Total']),
        forma_pagamento:    raw['Forma Pagamento'] || raw['Método'] || null,
        conta:              raw['Conta'] || null,
        observacoes:        raw['Observações'] || null,
        raw_json:           raw,
      });
      error ? fail++ : ok++;
    }
    return { ok, fail };
  },

  contracts: async (rows) => {
    let ok = 0, fail = 0;
    for (const raw of rows) {
      const cliente = raw['Cliente'] || raw['cliente'] || '';
      if (!cliente.trim()) { fail++; continue; }
      const { error } = await supabase.from('contracts').upsert({
        num_contrato:    raw['Nº Contrato'] || raw['ID'] || null,
        data_emissao:    parseDate(raw['Data'] || raw['Data Emissão']),
        cliente,
        cpf_cnpj:        raw['CPF/CNPJ'] || null,
        telefone:        String(raw['Telefone'] || ''),
        tipo_sistema:    raw['Tipo'] || null,
        kvp:             parseNum(raw['kVp'] || raw['kWp']),
        valor_total:     parseNum(raw['Valor Total'] || raw['Valor']),
        forma_pagamento: raw['Forma Pagamento'] || null,
        consultor:       raw['Consultor'] || null,
        status:          raw['Status'] || 'Emitido',
        raw_json:        raw,
      }, { onConflict: 'num_contrato', ignoreDuplicates: true });
      error ? fail++ : ok++;
    }
    return { ok, fail };
  },

  visit_checklists: async (rows) => {
    let ok = 0, fail = 0;
    for (const raw of rows) {
      const cliente = raw['Cliente'] || raw['Nome'] || '';
      if (!cliente.trim()) { fail++; continue; }
      const { error } = await supabase.from('visit_checklists').insert({
        data_visita:  parseDate(raw['Data'] || raw['Data Visita']),
        instalador:   raw['Instalador'] || raw['Técnico'] || null,
        cliente,
        endereco:     raw['Endereço'] || null,
        cidade_uf:    raw['Cidade'] || raw['Cidade/UF'] || null,
        tipo_projeto: raw['Tipo'] || raw['Sistema'] || null,
        raw_json:     raw,
      });
      error ? fail++ : ok++;
    }
    return { ok, fail };
  },

  homologation_records: async (rows) => {
    let ok = 0, fail = 0;
    for (const raw of rows) {
      const cliente = raw['Cliente'] || raw['Nome'] || '';
      if (!cliente.trim()) { fail++; continue; }
      const { error } = await supabase.from('homologation_records').insert({
        cliente,
        num_contrato:  raw['Nº Contrato'] || raw['Contrato'] || null,
        distribuidora: raw['Distribuidora'] || null,
        cidade:        raw['Cidade'] || null,
        status:        raw['Status'] || raw['Etapa'] || null,
        raw_json:      raw,
      });
      error ? fail++ : ok++;
    }
    return { ok, fail };
  },
};

// Lê stdin
let raw = '';
process.stdin.setEncoding('utf8');
for await (const chunk of process.stdin) raw += chunk;

const { table, rows, sheetId, sheetTitle } = JSON.parse(raw);

if (!IMPORTERS[table]) {
  console.log(JSON.stringify({ ok: 0, fail: 0, skipped: true, reason: `Sem importador para "${table}"` }));
  process.exit(0);
}

const result = await IMPORTERS[table](rows, sheetTitle);

// Atualiza import log
await supabase.from('sheet_import_log').upsert({
  sheet_id:     sheetId,
  sheet_title:  sheetTitle,
  target_table: table,
  last_imported: new Date().toISOString(),
  rows_imported: result.ok,
  status:       'ok',
}, { onConflict: 'sheet_id' });

console.log(JSON.stringify(result));
