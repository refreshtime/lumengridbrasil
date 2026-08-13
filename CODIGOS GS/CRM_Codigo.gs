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
  const action   = (e && e.parameter && e.parameter.action)   || 'leads_meta';
  const callback = (e && e.parameter && e.parameter.callback) || '';
  let result;
  try {
    if      (action === 'leads_meta')    result = getLeadsMeta();
    else if (action === 'leads_crm')     result = getLeadsCRM();
    else if (action === 'fin_data')      result = getFinData();
    else if (action === 'save_lead')     result = saveOneLead(JSON.parse(e.parameter.data));
    else if (action === 'save_proposta') result = saveProposta(JSON.parse(e.parameter.data));
    else result = { error: 'Ação desconhecida: ' + action };
  } catch(err) {
    result = { error: err.message };
  }
  const json = JSON.stringify(result);
  // JSONP: evita bloqueio CORS do browser
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let result;
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    if      (action === 'save_leads')        result = saveLeadsCRM(body.leads);
    else if (action === 'save_lead')         result = saveOneLead(body.lead);
    else if (action === 'save_solicitacao')  result = saveSolicitacao(body.solicitacao);
    else if (action === 'upload_doc')        result = uploadDocGAS(body.leadId, body.tipo, body.arquivo, body.user);
    else if (action === 'replace_receitas')  result = saveFinJson('Fin_Receitas',  body.data);
    else if (action === 'replace_despesas')  result = saveFinJson('Fin_Despesas',  body.data);
    else if (action === 'replace_previsoes') result = saveFinJson('Fin_Previsoes', body.data);
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
  const oldStage = idx >= 0 ? leads[idx].stage : -1;
  if (idx >= 0) leads[idx] = lead; else leads.unshift(lead);
  const result = saveLeadsCRM(leads);
  // Ao mover para Venda Fechada, tenta mover docs para pasta do contrato
  if (lead.stage === 6 && oldStage !== 6 && (lead.docs || []).length > 0) {
    tentarMoverDocsParaContrato(lead);
  }
  // Se lead veio de parceiro, espelha atualizações no portal
  if ((lead.origem || '').startsWith('Parceiro — ')) {
    atualizarPortalParceiro(lead);
  }
  return result;
}

// ────────────────────────────────────────────────
// INTEGRAÇÃO GERADOR DE PROPOSTAS → CRM
// Cria ou atualiza um lead quando proposta é gerada
// ────────────────────────────────────────────────

const CONSULTOR_TO_RESP = {
  'lucas':   'Lucas',
  'hingrid': 'Hingrid',
  'giovani': 'Giovani',
  'custom':  'Comercial Lumen'
};

function saveProposta(data) {
  const leads = getLeadsCRM();

  // Dedup por telefone (só dígitos)
  const telLimpo = (data.telefone || '').replace(/\D/g, '');
  let lead = null;
  let updated = false;

  if (telLimpo) {
    lead = leads.find(l => (l.telefone || '').replace(/\D/g, '') === telLimpo);
  }

  const proposta = {
    tipo:       data.tipoSistema || 'Solar',
    kWp:        data.kWp        || 0,
    modQty:     data.modQty     || 0,
    modModel:   data.modModel   || '',
    modPower:   data.modPower   || 0,
    invModel:   data.invModel   || '',
    invQty:     data.invQty     || 0,
    invPower:   data.invPower   || 0,
    valor:      data.valor      || 0,
    genKwh:     data.genKwh     || 0,
    ecoMonthly: data.ecoMonthly || 0,
    paybackStr: data.paybackStr || '',
    consultor:  data.consultor  || '',
    batKwh:     data.batKwh     || null,
    batModel:   data.batModel   || null,
    batQty:     data.batQty     || null,
    conexao:    data.conexao    || '',
    instType:   data.instType   || '',
    createdAt:  Date.now(),
    updatedAt:  Date.now(),
  };

  if (lead) {
    // Lead existente: atualiza proposta e valor
    proposta.createdAt = (lead.proposta && lead.proposta.createdAt) || Date.now();
    lead.proposta   = proposta;
    lead.valor      = data.valor || lead.valor;
    lead.updatedAt  = Date.now();
    lead.history    = lead.history || [];
    lead.history.push({
      text: 'Proposta ' + proposta.tipo + ' atualizada por ' + (data.consultor || 'Sistema') +
            ' — R$ ' + (data.valor ? Number(data.valor).toLocaleString('pt-BR') : '—') +
            ' · ' + (data.kWp ? data.kWp.toFixed(2) + ' kWp' : ''),
      user: data.consultor || 'Sistema',
      ts: Date.now(),
    });
    updated = true;
  } else {
    // Lead novo
    const resp = CONSULTOR_TO_RESP[data.consultorKey] || 'Comercial Lumen';
    lead = {
      id:        Utilities.getUuid(),
      nome:      data.nome     || 'Cliente',
      telefone:  data.telefone || '',
      email:     '',
      cidade:    data.cidade   || '',
      kwh:       '',
      tipo:      data.instType || '',
      telhado:   '',
      sistema:   data.tipoSistema === 'Híbrido' ? 'Híbrido' : 'String',
      origem:    data.parceiro ? 'Parceiro — ' + data.parceiro : 'Proposta',
      resp:      resp,
      valor:     data.valor || 0,
      stage:     15,
      subtasks:  {},
      proposta:  proposta,
      history:   [{
        text: 'Proposta ' + proposta.tipo + ' gerada por ' + (data.consultor || resp) +
              ' — R$ ' + (data.valor ? Number(data.valor).toLocaleString('pt-BR') : '—') +
              ' · ' + (data.kWp ? data.kWp.toFixed(2) + ' kWp' : ''),
        user: data.consultor || 'Sistema',
        ts: Date.now(),
      }],
      notes:     [],
      docs:      [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      seenBy:    [],
    };
    leads.unshift(lead);
  }

  saveLeadsCRM(leads);
  // Disparar sync ao portal do parceiro quando proposta é gerada com parceiro selecionado
  if ((lead.origem || '').startsWith('Parceiro — ')) {
    atualizarPortalParceiro(lead);
  }
  return { ok: true, leadId: lead.id, updated: updated };
}

// ────────────────────────────────────────────────
// INTEGRAÇÃO CRM → PORTAL DO PARCEIRO
// Atualiza status, etapa e última anotação no
// portal sempre que o CRM salvar o lead
// ────────────────────────────────────────────────
function atualizarPortalParceiro(lead) {
  try {
    const SHEET_ID_PARCEIROS = '1PoXQTLBfciYHSqQZn1ryHEx_0C6TQn5jDDyGNavGLuo';
    const parceiro = (lead.origem || '').replace('Parceiro — ', '').trim();
    if (!parceiro) return;

    const STAGE_NOMES = [
      'Lead Novo','Tentando Contato','Elaborar Orçamento','Enviar Orçamento',
      'Proposta Enviada','Negociação','Venda Fechada',
      'Agendar Visita','Estruturação Projeto','Comprar Equipamento',
      'Compra Realizada','Agendar Instalação','Homologação','Projeto Concluído',
      'Oportunidade Futura','Proposta Gerada'
    ];
    const status = STAGE_NOMES[lead.stage] || 'Atualizado';

    // Última anotação adicionada pela equipe
    const notas = lead.notes || [];
    const ultimaNota = notas.length > 0 ? notas[notas.length - 1].text : '';

    const ss    = SpreadsheetApp.openById(SHEET_ID_PARCEIROS);
    const sheet = ss.getSheetByName(parceiro);
    if (!sheet) return;

    const data    = sheet.getDataRange().getValues();
    const headers = data[0];
    const nomeCol = headers.indexOf('Nome');
    const telCol  = headers.indexOf('Telefone');
    const statCol = headers.indexOf('Status')             + 1;
    const obsCol  = headers.indexOf('Observações')        + 1;
    const kwpCol  = headers.indexOf('kWp')                + 1;
    const valCol  = headers.indexOf('Valor Projeto')      + 1;
    const comCol  = headers.indexOf('Comissão Estimada')  + 1;

    const leadNome = (lead.nome      || '').trim().toLowerCase();
    const leadTel  = (lead.telefone  || '').replace(/\D/g, '');
    const valorProjeto = lead.valor || (lead.proposta && lead.proposta.valor) || 0;
    const kWpProposta  = (lead.proposta && lead.proposta.kWp) || lead.kwp || 0;

    let matched = false;
    for (let i = 1; i < data.length; i++) {
      const rowNome = String(data[i][nomeCol] || '').trim().toLowerCase();
      const rowTel  = String(data[i][telCol]  || '').replace(/\D/g, '');
      const match   = rowNome === leadNome || (leadTel && rowTel === leadTel);
      if (!match) continue;

      const row = i + 1;
      if (statCol > 0) sheet.getRange(row, statCol).setValue(status);
      if (obsCol  > 0 && ultimaNota) sheet.getRange(row, obsCol).setValue(ultimaNota);
      if (kwpCol  > 0 && kWpProposta)     sheet.getRange(row, kwpCol).setValue(kWpProposta);
      if (valCol  > 0 && valorProjeto)    sheet.getRange(row, valCol).setValue(valorProjeto);
      if (comCol  > 0 && lead.comissaoEstimada) sheet.getRange(row, comCol).setValue(lead.comissaoEstimada);
      matched = true;
      break;
    }

    // Se o cliente ainda não existe no portal do parceiro, cria a linha
    if (!matched) {
      const idCol = headers.indexOf('ID') + 1;
      const newId = parceiro.substring(0, 2).toUpperCase() + Date.now().toString(36).toUpperCase();
      const dataHoje = new Date().toLocaleDateString('pt-BR');
      sheet.appendRow([
        newId, lead.nome || '', lead.telefone || '', lead.email || '',
        '', lead.cidade || '', dataHoje, status,
        kWpProposta, valorProjeto,
        '', '', '', '', '', '', '', '', '', '', '', '', ultimaNota
      ]);
    }
  } catch(e) {
    Logger.log('atualizarPortalParceiro: ' + e.message);
  }
}

// Grava os dados em formato tabular a partir da coluna B para visualização
function gravarTabelaLegivel(sheet, leads) {
  try {
    const STAGES = [
      'Lead Novo','Tentando Contato','Elaborar Orçamento','Enviar Orçamento',
      'Proposta Enviada','Negociação','Venda Fechada',
      'Agendar Visita','Estruturação Projeto','Comprar Equipamento',
      'Compra Realizada','Agendar Instalação','Homologação','Projeto Concluído',
      'Oportunidade Futura','Proposta Gerada'
    ];
    const headers = [
      'ID','Nome','Telefone','E-mail','Cidade','kWh Mensal','Tipo','Telhado','Sistema','Etapa','Responsável','Origem',
      'kWp','Valor Projeto','Custo Equipamento','Custo Instalação','Impostos','Margem Bruta','Pós-Venda (20%)','% Comissão','Comissão Estimada','Lucro Empresa','Parceiro',
      'Criado em','Atualizado em',
      'Tipo Proposta','kWp Proposta','Geração kWh/mês','Valor Proposta','Payback','Data Proposta'
    ];
    const rows = leads.map(l => [
      l.id, l.nome, l.telefone, l.email, l.cidade, l.kwh, l.tipo, l.telhado, l.sistema,
      STAGES[l.stage] || l.stage, l.resp, l.origem,
      l.kwp||'', l.valorProjeto||'', l.custoEquipamento||'', l.custoInstalacao||'',
      l.impostos||'', l.margemBruta||'', l.posVenda||'', l.pctComissao||'',
      l.comissaoEstimada||'', l.lucroEmpresa||'', l.parceiro||'',
      l.createdAt ? new Date(l.createdAt).toLocaleString('pt-BR') : '',
      l.updatedAt ? new Date(l.updatedAt).toLocaleString('pt-BR') : '',
      l.proposta ? l.proposta.tipo : '',
      l.proposta ? l.proposta.kWp : '',
      l.proposta ? l.proposta.genKwh : '',
      l.proposta ? l.proposta.valor : '',
      l.proposta ? l.proposta.paybackStr : '',
      l.proposta ? new Date(l.proposta.createdAt).toLocaleString('pt-BR') : '',
    ]);
    sheet.getRange(1, 3, 1, headers.length).setValues([headers]);
    if (rows.length > 0) {
      sheet.getRange(2, 3, rows.length, headers.length).setValues(rows);
      // Formata colunas financeiras para evitar interpretação como datas pelo Sheets
      // Colunas 15-24 (kWp, Valor Projeto, Custo Equipamento ... Lucro Empresa)
      sheet.getRange(2, 15, rows.length, 10).setNumberFormat('#,##0.##');
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
// DOCUMENTOS — Upload e vinculação ao lead
// ────────────────────────────────────────────────

function uploadDocGAS(leadId, tipo, arquivo, user) {
  try {
    const leads = getLeadsCRM();
    const lead  = leads.find(l => l.id === leadId);
    const leadNome = lead ? lead.nome : 'Desconhecido';

    // Pasta raiz → subpasta do cliente
    const root = obterPastaDocumentosCRM();
    const clientFolder = getOrCreateSubpasta(root, leadNome);
    clientFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // Nome do arquivo: Tipo_NomeCliente.ext
    const ext = _extMimeCRM(arquivo.tipo) || 'pdf';
    const fileName = tipo.replace(/\//g,'-') + '_' + leadNome + '.' + ext;
    const bytes = Utilities.base64Decode(arquivo.base64);
    const blob  = Utilities.newBlob(bytes, arquivo.tipo || 'application/octet-stream', fileName);
    const file  = clientFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const link   = file.getUrl();
    const fileId = file.getId();

    const idx = leads.findIndex(l => l.id === leadId);
    if (idx >= 0) {
      if (!leads[idx].docs) leads[idx].docs = [];
      leads[idx].docs.push({ tipo, nome: fileName, link, fileId, ts: Date.now(), user: user || '' });
      leads[idx].updatedAt = Date.now();
      saveLeadsCRM(leads);
    }
    return { ok: true, link };
  } catch(e) {
    return { error: e.message };
  }
}

function obterPastaDocumentosCRM() {
  const nome = 'Documentos CRM';
  const pastas = DriveApp.getFoldersByName(nome);
  if (pastas.hasNext()) return pastas.next();
  return DriveApp.createFolder(nome);
}

function getOrCreateSubpasta(parent, nome) {
  const it = parent.getFoldersByName(nome);
  return it.hasNext() ? it.next() : parent.createFolder(nome);
}

function _extMimeCRM(mime) {
  if (!mime) return null;
  const map = { 'image/jpeg':'jpg','image/png':'png','image/webp':'webp','application/pdf':'pdf' };
  return map[mime] || null;
}

// ────────────────────────────────────────────────
// INTEGRAÇÃO CONTRATO — move docs ao fechar venda
// ────────────────────────────────────────────────

function tentarMoverDocsParaContrato(lead) {
  try {
    const CONTRATOS_SHEET_ID = '145EgaXS8Jz1i5NEAWPhHJ9SoOE-Tzs9247vYsrxIR2o';
    const ss    = SpreadsheetApp.openById(CONTRATOS_SHEET_ID);
    const sheet = ss.getSheetByName('Gerado') || ss.getSheetByName('Assinado');
    if (!sheet || sheet.getLastRow() < 2) return;

    const rows = sheet.getDataRange().getValues();
    const leadNome = (lead.nome || '').trim().toLowerCase();
    const leadTel  = (lead.telefone || '').replace(/\D/g, '');

    // Busca contrato pelo nome ou telefone
    let folderUrl = null;
    for (let i = 1; i < rows.length; i++) {
      const cNome = String(rows[i][3] || '').trim().toLowerCase();
      const cTel  = String(rows[i][5] || '').replace(/\D/g, '');
      if (cNome === leadNome || (leadTel && cTel === leadTel)) {
        folderUrl = String(rows[i][13] || ''); // Coluna N = Pasta no Drive
        break;
      }
    }
    if (!folderUrl) return; // contrato não encontrado ainda

    // Extrai ID da pasta do contrato a partir da URL
    const match = folderUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (!match) return;
    const destFolder = DriveApp.getFolderById(match[1]);

    // Move cada arquivo para a pasta do contrato
    const leads = getLeadsCRM();
    const idx   = leads.findIndex(l => l.id === lead.id);
    if (idx < 0) return;

    let moveu = false;
    (leads[idx].docs || []).forEach(function(doc) {
      if (!doc.fileId) return;
      try {
        const file    = DriveApp.getFileById(doc.fileId);
        destFolder.addFile(file);
        const parents = file.getParents();
        while (parents.hasNext()) {
          const p = parents.next();
          if (p.getId() !== match[1]) p.removeFile(file);
        }
        doc.link = file.getUrl();
        moveu = true;
      } catch(e) { Logger.log('Erro ao mover ' + doc.fileId + ': ' + e.message); }
    });

    if (moveu) {
      leads[idx].docsFolderContrato = folderUrl;
      saveLeadsCRM(leads);
      Logger.log('Docs de ' + lead.nome + ' movidos para pasta do contrato.');
    }
  } catch(e) {
    Logger.log('tentarMoverDocsParaContrato: ' + e.message);
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
// FINANCEIRO — Receitas, Despesas, Previsões
// Armazena como JSON na mesma planilha do CRM
// ────────────────────────────────────────────────

function getFinData() {
  return {
    receitas:  loadFinJson('Fin_Receitas'),
    despesas:  loadFinJson('Fin_Despesas'),
    previsoes: loadFinJson('Fin_Previsoes'),
  };
}

function loadFinJson(abaName) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(abaName);
  if (!sheet) return [];
  const raw = sheet.getRange(1, 1).getValue();
  if (!raw) return [];
  try { return JSON.parse(raw); } catch(e) { return []; }
}

function saveFinJson(abaName, data) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(abaName);
  if (!sheet) {
    sheet = ss.insertSheet(abaName);
    sheet.getRange(1, 1).setBackground('#E8641A').setFontColor('#FFFFFF').setFontWeight('bold');
  }
  sheet.clearContents();
  sheet.getRange(1, 1).setValue(JSON.stringify(data || []));
  // Linha legível de resumo na célula B1
  sheet.getRange(1, 2).setValue('Atualizado: ' + new Date().toLocaleString('pt-BR') + ' — ' + (data||[]).length + ' registros');
  return { ok: true, count: (data || []).length };
}

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
