// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  LUMENGRID CRM — Google Apps Script Backend
//  Cole este código em: script.google.com → Novo Projeto → Colar → Implantar
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ────────────────────────────────────────────────
// CONFIGURAÇÃO — EDITE ANTES DE IMPLANTAR
// ────────────────────────────────────────────────

// ID da sua planilha do Google Sheets (parte da URL: /d/XXXX/edit)
const SHEET_ID = '1LTv6dFRT56533gfPc5elNfxiddsUzgYyLbCLsNykyRQ';

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
    if      (action === 'save_leads')       result = saveLeadsCRM(body.leads);
    else if (action === 'save_lead')        result = saveOneLead(body.lead);
    else if (action === 'save_solicitacao') result = saveSolicitacao(body.solicitacao);
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
    const headers = [
      'ID','Nome','Telefone','E-mail','Cidade','kWh Mensal','Tipo','Telhado','Sistema','Etapa','Responsável','Origem',
      'kWp','Valor Projeto','Custo Equipamento','Custo Instalação','Impostos','Margem Bruta','Pós-Venda (20%)','% Comissão','Comissão Estimada','Lucro Empresa','Parceiro',
      'Criado em','Atualizado em'
    ];
    const rows = leads.map(l => [
      l.id, l.nome, l.telefone, l.email, l.cidade, l.kwh, l.tipo, l.telhado, l.sistema,
      STAGES[l.stage] || l.stage, l.resp, l.origem,
      l.kwp||'', l.valorProjeto||'', l.custoEquipamento||'', l.custoInstalacao||'',
      l.impostos||'', l.margemBruta||'', l.posVenda||'', l.pctComissao||'',
      l.comissaoEstimada||'', l.lucroEmpresa||'', l.parceiro||'',
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
// SOLICITAÇÕES INTERNAS
// ────────────────────────────────────────────────

function saveSolicitacao(sol) {
  // Salvar arquivo no Drive se enviado
  let linkArquivo = sol.link || '';
  if (sol.arquivo && sol.arquivo.base64) {
    try {
      const pasta = obterPastaSolicitacoes();
      const bytes = Utilities.base64Decode(sol.arquivo.base64);
      const blob  = Utilities.newBlob(bytes, sol.arquivo.tipo || 'application/octet-stream', sol.arquivo.nome || 'arquivo');
      const file  = pasta.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      linkArquivo = file.getUrl();
    } catch(e) {
      Logger.log('Erro ao salvar arquivo no Drive: ' + e.message);
    }
  }

  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName('Solicitacoes');
  if (!sheet) {
    sheet = ss.insertSheet('Solicitacoes');
    sheet.getRange(1, 1, 1, 6).setValues([['Data', 'Nome', 'Tipo', 'Urgência', 'Descrição', 'Link / Arquivo']]);
    sheet.getRange(1, 1, 1, 6).setBackground('#F26522').setFontColor('#FFFFFF').setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, 6, [130, 130, 140, 80, 320, 220]);
  }
  sheet.appendRow([
    sol.data || new Date().toLocaleString('pt-BR'),
    sol.nome || '',
    sol.tipo || '',
    sol.urg  || '',
    sol.desc || '',
    linkArquivo
  ]);
  return { ok: true };
}

function obterPastaSolicitacoes() {
  const nomePasta = 'LumenGrid — Solicitações';
  const pastas = DriveApp.getFoldersByName(nomePasta);
  if (pastas.hasNext()) return pastas.next();
  return DriveApp.createFolder(nomePasta);
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
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(ABA_META);
    if (!sheet) { Logger.log('Aba "' + ABA_META + '" não encontrada.'); return; }

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return;

    // Detecta coluna Responsável (coluna E = índice 4), se existir
    const headers = data[0].map(h => String(h).toLowerCase().trim());
    const respColIdx = headers.indexOf('responsável') >= 0
      ? headers.indexOf('responsável')
      : headers.indexOf('responsavel') >= 0
      ? headers.indexOf('responsavel')
      : 4; // coluna E por padrão

    const VENDEDORES_VALIDOS = ['Lucas', 'Giovani', 'Hingrid', 'Comercial Lumen'];

    const crmLeads = getLeadsCRM();
    const existingTels = new Set(crmLeads.map(l => (l.tel||l.telefone||'').replace(/\D/g,'')));
    let added = 0;

    data.slice(1).forEach(row => {
      const nome  = String(row[COLUNAS_META.nome]  || '').trim();
      const tel   = String(row[COLUNAS_META.tel]   || '').trim();
      const email = String(row[COLUNAS_META.email] || '').trim();
      const cidade= String(row[COLUNAS_META.cidade]|| '').trim();
      if (!nome) return;

      const telLimpo = tel.replace(/\D/g,'');
      if (telLimpo && existingTels.has(telLimpo)) return;

      // Lê responsável da coluna E (ou coluna com cabeçalho "Responsável")
      const respRaw = row[respColIdx] ? String(row[respColIdx]).trim() : '';
      const resp = VENDEDORES_VALIDOS.includes(respRaw) ? respRaw : 'Comercial Lumen';

      const lead = {
        id: Utilities.getUuid(),
        nome: nome || 'Lead importado',
        telefone: tel,
        email,
        cidade,
        origem: 'Planilha',
        resp,
        stage: 0,
        subtasks: {},
        history: [{ text: 'Lead importado em lote — responsável: ' + resp, user: 'Sistema', ts: Date.now() }],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        seenBy: [],
      };
      crmLeads.unshift(lead);
      if (telLimpo) existingTels.add(telLimpo);
      added++;
    });

    if (added > 0) {
      saveLeadsCRM(crmLeads);
      Logger.log(added + ' lead(s) importado(s).');
    } else {
      Logger.log('Nenhum lead novo encontrado.');
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
