/**
 * Decodifica base64 CSV → parse → insert no Supabase
 * Uso: node parse-and-insert.mjs <table> <sheetId> <sheetTitle> <base64csv>
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const [,, table, sheetId, sheetTitle, b64] = process.argv;

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
  // tenta dd/mm/yyyy
  const br = val.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

// Parse CSV respeitando aspas
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const parseRow = (line) => {
    const fields = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i+1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (c === ',' && !inQ) {
        fields.push(cur.trim()); cur = '';
      } else cur += c;
    }
    fields.push(cur.trim());
    return fields;
  };

  // Detecta a linha de cabeçalho real pelo maior número de campos conhecidos
  const FIELD_HINTS = ['nome','telefone','celular','cliente','e-mail','email','data','status','stage',
                       'estágio','estagio','kwh','valor','cidade','responsavel','responsável','#'];
  let headerIdx = 0, bestScore = 0;
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const fields = lines[i].split(',').map(f => f.toLowerCase().trim().replace(/^"|"$/g, ''));
    const score = fields.filter(f => FIELD_HINTS.includes(f)).length;
    if (score > bestScore) { bestScore = score; headerIdx = i; }
  }

  const headers = parseRow(lines[headerIdx]);
  return lines.slice(headerIdx + 1)
    .map(l => {
      const vals = parseRow(l);
      const obj = {};
      headers.forEach((h, i) => { if (h) obj[h] = vals[i] ?? ''; });
      return obj;
    })
    .filter(r => Object.values(r).some(v => v !== ''));
}

// Importadores
const IMPORT = {
  contracts: async (rows) => {
    let ok = 0, fail = 0;
    for (const raw of rows) {
      const cliente = raw['Cliente'] || '';
      if (!cliente.trim()) { fail++; continue; }
      const { error } = await supabase.from('contracts').upsert({
        num_contrato:    raw['Nº Contrato'] || raw['N° Contrato'] || null,
        data_emissao:    parseDate(raw['Data Emissão'] || raw['Data']),
        cliente,
        cpf_cnpj:        raw['CPF/CNPJ'] || null,
        telefone:        String(raw['Telefone'] || ''),
        email:           raw['E-mail'] || raw['Email'] || null,
        tipo_sistema:    raw['Tipo Sistema'] || raw['Tipo'] || null,
        kvp:             parseNum(raw['kVp'] || raw['kWp']),
        valor_total:     parseNum(raw['Valor Total (R$)'] || raw['Valor Total'] || raw['Valor']),
        forma_pagamento: raw['Forma Pagamento'] || null,
        consultor:       raw['Consultor'] || null,
        status:          raw['Status'] || 'Gerado',
        raw_json:        raw,
      }, { onConflict: 'num_contrato', ignoreDuplicates: true });
      error ? (console.warn('  warn:', error.message), fail++) : ok++;
    }
    return { ok, fail };
  },

  leads: async (rows) => {
    let ok = 0, fail = 0;
    for (const raw of rows) {
      const nome = raw['Nome'] || raw['nome'] || raw['NOME'] || raw['Cliente'] || raw['cliente']
                || raw['Nome Negócio'] || raw['Nome Negocio'] || raw['Nome / Empresa']
                || raw['Nome Completo'] || raw['name'] || '';
      if (!nome.trim()) { fail++; continue; }
      const tel = String(
        raw['Telefone'] || raw['telefone'] || raw['Tel'] || raw['Fone']
        || raw['Celular'] || raw['celular'] || raw['WhatsApp'] || raw['Whatsapp'] || ''
      );
      try {
        const { error } = await supabase.from('leads').upsert({
          nome: nome.trim(),
          telefone:      tel,
          email:         raw['E-mail'] || raw['email'] || raw['Email'] || null,
          cidade:        raw['Cidade'] || raw['cidade'] || null,
          kwh:           parseNum(raw['kWh'] || raw['kwh'] || raw['Consumo kWh']),
          sistema:       raw['Sistema'] || raw['sistema'] || null,
          origem:        raw['Origem'] || raw['origem'] || raw['Canal'] || raw['Fonte'] || null,
          responsavel:   raw['Responsável'] || raw['Responsavel'] || raw['SDR'] || null,
          stage:         raw['Stage'] || raw['Estágio'] || raw['Estagio'] || raw['Etapa'] || raw['Status'] || raw['status'] || 'Novo Lead',
          kwp:           parseNum(raw['kWp'] || raw['kwp']),
          valor_projeto: parseNum(raw['Valor'] || raw['Montante'] || raw['Valor Projeto'] || raw['valor_projeto']),
          parceiro:      raw['Parceiro'] || raw['parceiro'] || null,
          raw_json:      raw,
        }, { onConflict: 'nome,telefone', ignoreDuplicates: true });
        if (error) { console.warn('  warn:', error.message); fail++; } else ok++;
      } catch (e) { console.warn('  warn:', e.message); fail++; }
    }
    return { ok, fail };
  },

  financial_entries: async (rows) => {
    let ok = 0, fail = 0;
    for (const raw of rows) {
      const desc = raw['Descrição'] || raw['Descricao'] || raw['Cliente'] || raw['Cliente/Fornecedor'] || raw['Descrição/Cliente'] || '';
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
        grupo_dre:          raw['Grupo DRE'] || null,
        num_contrato:       raw['Nº Contrato'] || raw['Contrato'] || null,
        data_emissao:       parseDate(raw['Data Emissão'] || raw['Data']),
        data_competencia:   parseDate(raw['Data Competência'] || raw['Mês'] || raw['Competência']),
        data_vencimento:    parseDate(raw['Data Vencimento'] || raw['Vencimento']),
        valor_previsto:     parseNum(raw['Valor'] || raw['Valor (R$)'] || raw['Valor Total'] || raw['Valor Bruto']),
        forma_pagamento:    raw['Forma Pagamento'] || raw['Forma Prevista'] || raw['Método'] || null,
        conta:              raw['Conta'] || null,
        observacoes:        raw['Observações'] || null,
        raw_json:           raw,
      });
      error ? (console.warn('  warn:', error.message), fail++) : ok++;
    }
    return { ok, fail };
  },

  visit_checklists: async (rows) => {
    let ok = 0, fail = 0;
    for (const raw of rows) {
      const cliente = raw['Cliente / Titular'] || raw['Cliente'] || raw['Nome'] || '';
      if (!cliente.trim()) { fail++; continue; }
      const { error } = await supabase.from('visit_checklists').insert({
        data_visita:  parseDate(raw['Data Vistoria'] || raw['Data'] || raw['Data Visita']),
        instalador:   raw['Responsável / Técnico'] || raw['Instalador'] || null,
        cliente,
        cidade_uf:    raw['Cidade'] || null,
        tipo_projeto: raw['Tipo'] || null,
        raw_json:     raw,
      });
      error ? fail++ : ok++;
    }
    return { ok, fail };
  },

  homologation_records: async (rows) => {
    let ok = 0, fail = 0;
    for (const raw of rows) {
      const cliente = raw['Cliente / Titular'] || raw['Cliente'] || raw['Nome'] || '';
      if (!cliente.trim()) { fail++; continue; }
      const { error } = await supabase.from('homologation_records').insert({
        cliente,
        num_contrato:  raw['Nº Protocolo / OS'] || raw['Nº Contrato'] || null,
        distribuidora: raw['Concessionária / UC'] || raw['Distribuidora'] || null,
        status:        raw['Status da Etapa'] || raw['Status'] || null,
        raw_json:      raw,
      });
      error ? fail++ : ok++;
    }
    return { ok, fail };
  },

  partner_referrals: async (rows) => {
    let ok = 0, fail = 0;
    // Garante parceiro default
    const { data: p } = await supabase.from('partners')
      .upsert({ nome: sheetTitle, slug: sheetTitle.toLowerCase().replace(/\s+/g,'-') }, { onConflict: 'slug', ignoreDuplicates: true })
      .select('id').single();
    const partnerId = p?.id;

    for (const raw of rows) {
      const nome = raw['Nome'] || raw['Cliente'] || '';
      if (!nome.trim()) { fail++; continue; }
      const { error } = await supabase.from('partner_referrals').insert({
        partner_id:        partnerId,
        nome,
        telefone:          String(raw['Telefone'] || ''),
        cidade:            raw['Cidade'] || null,
        status:            raw['Status'] || 'Novo',
        kwp:               parseNum(raw['kWp']),
        valor_projeto:     parseNum(raw['Valor Projeto']),
        pct_comissao:      parseNum(raw['% Comissão']),
        comissao_estimada: parseNum(raw['Comissão Estimada']),
        raw_json:          raw,
      });
      error ? fail++ : ok++;
    }
    return { ok, fail };
  },
};

// Decode base64 → CSV → parse → insert
const csv  = Buffer.from(b64, 'base64').toString('utf-8');
const rows = parseCSV(csv);
console.log(`  ${rows.length} linhas encontradas`);

if (!IMPORT[table]) {
  console.log(`  ⚠️  Sem importador para "${table}" — pulando`);
  process.exit(0);
}

const { ok, fail } = await IMPORT[table](rows);
console.log(`  ✅ ${ok} importadas, ${fail} erros`);

// Atualiza import log
await supabase.from('sheet_import_log').upsert({
  sheet_id:     sheetId,
  sheet_title:  sheetTitle,
  target_table: table,
  last_imported: new Date().toISOString(),
  rows_imported: ok,
  status:       ok > 0 || rows.length === 0 ? 'ok' : 'warn',
}, { onConflict: 'sheet_id' });
