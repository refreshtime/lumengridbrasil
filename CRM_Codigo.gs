// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  LUMENGRID CRM — Google Apps Script Backend
//  Cole este código em: script.google.com → Novo Projeto → Colar → Implantar
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ────────────────────────────────────────────────
// CONFIGURAÇÃO — EDITE ANTES DE IMPLANTAR
// ────────────────────────────────────────────────

// ID da sua planilha do Google Sheets (parte da URL: /d/XXXX/edit)
const SHEET_ID = 'COLE_O_ID_DA_PLANILHA_AQUI';

// Nome da aba com os leads do Meta
const ABA_META = 'Leads';

// Nome da aba onde o CRM vai salvar os dados
const ABA_CRM = 'CRM_Dados';

// Mapeamento de colunas da planilha do Meta (índice começa em 0)
const COLUNAS_META = {
  nome:   0,   // Coluna A
  tel:    1,   // Coluna B
  email:  2,   // Coluna C
  cidade: 3,   // Coluna D
};

// ────────────────────────────────────────────────
// ENDPOINT PRINCIPAL
// ────────────────────────────────────────────────

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'leads_meta';
  let result;
  try {
    if      (action === 'leads_meta') result = getLeadsMeta();
    else if (action === 'leads_crm')  result = getLeadsCRM();
    else result = { error: 'Ação desconhecida: ' + action };
  } catch(err) {
    result = { error: err.message };
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let result;
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    if      (action === 'save_leads')  result = saveLeadsCRM(body.leads);
    else if (action === 'save_lead')   result = saveOneLead(body.lead);
    else result = { error: 'Ação desconhecida: ' + action };
  } catch(err) {
    result = { error: err.message };
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ────────────────────────────────────────────────
// FUNÇÕES DE LEITURA
// ────────────────────────────────────────────────

// Retorna leads crus da aba do Meta (para importação)
function getLeadsMeta() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(ABA_META);
  if (!sheet) return { error: 'Aba "' + ABA_META + '" não encontrada.' };
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  const rows = data.slice(1).map(row => ({
    nome:    row[COLUNAS_META.nome]   || '',
    tel:     String(row[COLUNAS_META.tel]   || ''),
    email:   row[COLUNAS_META.email]  || '',
    cidade:  row[COLUNAS_META.cidade] || '',
    origem:  'Meta',
  }));
  return rows;
}

// Retorna dados completos do CRM
function getLeadsCRM() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(ABA_CRM);
  if (!sheet) return [];
  const raw = sheet.getRange(1, 1).getValue();
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

// ────────────────────────────────────────────────
// FUNÇÕES DE ESCRITA
// ────────────────────────────────────────────────

// Salva array completo de leads
function saveLeadsCRM(leads) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(ABA_CRM);
  if (!sheet) sheet = ss.insertSheet(ABA_CRM);
  sheet.clearContents();
  sheet.getRange(1, 1).setValue(JSON.stringify(leads));
  // Também grava em formato legível nas colunas ao lado para visualização
  gravarTabelaLegivel(sheet, leads);
  return { ok: true, count: leads.length };
}

// Atualiza apenas um lead (busca por ID e substitui)
function saveOneLead(lead) {
  const leads = getLeadsCRM();
  const idx = leads.findIndex(l => l.id === lead.id);
  if (idx >= 0) leads[idx] = lead; else leads.unshift(lead);
  return saveLeadsCRM(leads);
}

// Grava os dados em formato tabular a partir da coluna B para visualização
function gravarTabelaLegivel(sheet, leads) {
  try {
    const STAGES = [
      'Lead Novo','Tentando Contato','Elaborar Orçamento','Enviar Orçamento',
      'Proposta Enviada','Negociação','Venda Fechada',
      'Agendar Visita','Estruturação Projeto','Comprar Equipamento',
      'Compra Realizada','Agendar Instalação','Homologação','Projeto Concluído'
    ];
    const headers = ['ID','Nome','Telefone','E-mail','Cidade','kWh','Tipo','Telhado','Sistema','Etapa','Responsável','Origem','Valor','Criado em','Atualizado em'];
    const rows = leads.map(l => [
      l.id, l.nome, l.telefone, l.email, l.cidade, l.kwh, l.tipo, l.telhado, l.sistema,
      STAGES[l.stage] || l.stage, l.resp, l.origem, l.valor,
      l.createdAt ? new Date(l.createdAt).toLocaleString('pt-BR') : '',
      l.updatedAt ? new Date(l.updatedAt).toLocaleString('pt-BR') : '',
    ]);
    sheet.getRange(1, 3, 1, headers.length).setValues([headers]);
    if (rows.length > 0) {
      sheet.getRange(2, 3, rows.length, headers.length).setValues(rows);
    }
  } catch(e) {
    Logger.log('Erro ao gravar tabela: ' + e.message);
  }
}

// ────────────────────────────────────────────────
// TRIGGER — Verifica novos leads no Meta a cada hora
// Execute uma vez para configurar: instalarTrigger()
// ────────────────────────────────────────────────

function instalarTrigger() {
  ScriptApp.newTrigger('verificarNovosLeadsMeta')
    .timeBased()
    .everyHours(1)
    .create();
  Logger.log('Trigger instalado com sucesso!');
}

function verificarNovosLeadsMeta() {
  try {
    const metaLeads = getLeadsMeta();
    const crmLeads = getLeadsCRM();
    const existingTels = new Set(crmLeads.map(l => (l.tel||l.telefone||'').replace(/\D/g,'')));
    let added = 0;
    metaLeads.forEach(m => {
      const tel = String(m.tel||'').replace(/\D/g,'');
      if (tel && existingTels.has(tel)) return;
      const lead = {
        id: Utilities.getUuid(),
        nome: m.nome || 'Lead do Meta',
        telefone: m.tel || '',
        email: m.email || '',
        cidade: m.cidade || '',
        origem: 'Meta',
        resp: 'Comercial Lumen', // padrão — ajuste conforme preferir
        stage: 0,
        subtasks: {},
        history: [{ text: 'Lead importado automaticamente do Meta', user: 'Sistema', ts: Date.now() }],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        seenBy: [],
      };
      crmLeads.unshift(lead);
      if (tel) existingTels.add(tel);
      added++;
    });
    if (added > 0) {
      saveLeadsCRM(crmLeads);
      Logger.log(added + ' novo(s) lead(s) importado(s) do Meta.');
    }
  } catch(e) {
    Logger.log('Erro em verificarNovosLeadsMeta: ' + e.message);
  }
}

// ────────────────────────────────────────────────
// COMO IMPLANTAR
// ────────────────────────────────────────────────
// 1. Acesse script.google.com
// 2. Crie um novo projeto e cole este código
// 3. Edite SHEET_ID com o ID da sua planilha
// 4. Clique em Implantar → Nova implantação
// 5. Tipo: App da Web
// 6. Executar como: Você (sua conta Google)
// 7. Quem tem acesso: Qualquer pessoa (necessário para o CRM acessar)
// 8. Clique em Implantar e copie a URL gerada
// 9. Cole a URL no CRM em Importar → Google Sheets
// 10. Para sincronização automática, execute instalarTrigger() uma vez
