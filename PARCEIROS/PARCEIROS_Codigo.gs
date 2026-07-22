// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  LUMENGRID — Apps Script: Portal do Parceiro
//  Cole em: script.google.com → projeto DOS PARCEIROS → Colar → Implantar
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SHEET_ID_PARCEIROS = '1PoXQTLBfciYHSqQZn1ryHEx_0C6TQn5jDDyGNavGLuo';
const SHEET_ID_CRM       = '1LTv6dFRT56533gfPc5elNfxiddsUzgYyLbCLsNykyRQ';
const EMAIL_NOTIFICACAO  = ''; // opcional: e-mail para receber avisos

// ────────────────────────────────────────────────
// GET — apenas leitura de dados
// ────────────────────────────────────────────────
function doGet(e) {
  const action   = (e && e.parameter && e.parameter.action)   || 'getData';
  const parceiro = (e && e.parameter && e.parameter.parceiro) || 'Michael';
  let result;
  try {
    if (action === 'getData') result = getData(parceiro);
    else result = { error: 'Ação GET desconhecida: ' + action };
  } catch(err) {
    result = { error: err.message };
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ────────────────────────────────────────────────
// POST — escrita de dados
// ────────────────────────────────────────────────
function doPost(e) {
  let result;
  try {
    const body   = JSON.parse(e.postData.contents);
    const action = body.action;
    if      (action === 'addClient')       result = addClient(body);
    else if (action === 'notify')          result = receberNotificacao(body);
    else if (action === 'lancar_proposta') result = lancarProposta(body);
    else if (action === 'update_status')   result = updateStatus(body);
    else result = { error: 'Ação POST desconhecida: ' + action };
  } catch(err) {
    result = { error: err.message };
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ────────────────────────────────────────────────
// CABEÇALHOS DA PLANILHA
// ────────────────────────────────────────────────
const HEADERS = [
  'ID','Nome','Telefone','E-mail','Endereço','Cidade',
  'Data Indicação','Status',
  'Valor Projeto','Comissão Estimada','Comissão Paga','Comissão Pendente',
  'Arquivo','Observações'
];

function garantirAba(ss, parceiro) {
  let sheet = ss.getSheetByName(parceiro);
  if (!sheet) sheet = ss.insertSheet(parceiro);

  // Verifica se a primeira célula é o cabeçalho esperado
  const primeiraCell = sheet.getRange(1, 1).getValue();
  if (primeiraCell !== 'ID') {
    // Se já tem dados, empurra tudo para baixo e insere cabeçalho
    if (sheet.getLastRow() > 0) sheet.insertRowBefore(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.getRange(1, 1, 1, HEADERS.length)
      .setBackground('#F26522').setFontColor('#FFFFFF').setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, HEADERS.length, [80,180,130,180,220,120,110,140,110,130,110,130,220,220]);
  }
  return sheet;
}

// ────────────────────────────────────────────────
// LEITURA
// ────────────────────────────────────────────────
function getData(parceiro) {
  const ss    = SpreadsheetApp.openById(SHEET_ID_PARCEIROS);
  const sheet = ss.getSheetByName(parceiro);
  if (!sheet) return { clientes: [] };

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return { clientes: [] };

  const headers  = data[0];
  const clientes = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
  return { clientes };
}

// ────────────────────────────────────────────────
// NOVA INDICAÇÃO (com arquivo opcional)
// ────────────────────────────────────────────────
function addClient(body) {
  const parceiro = body.parceiro || 'Michael';
  const ss       = SpreadsheetApp.openById(SHEET_ID_PARCEIROS);
  const sheet    = garantirAba(ss, parceiro);

  // Upload de arquivo para o Drive
  let linkArquivo = '';
  if (body.arquivo && body.arquivo.base64) {
    try {
      const pasta  = obterPastaIndicacoes(parceiro);
      const bytes  = Utilities.base64Decode(body.arquivo.base64);
      const blob   = Utilities.newBlob(bytes, body.arquivo.tipo || 'application/octet-stream', body.arquivo.nome || 'arquivo');
      const file   = pasta.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      linkArquivo  = file.getUrl();
    } catch(e) {
      Logger.log('Erro upload: ' + e.message);
    }
  }

  const id   = 'MC' + Date.now().toString(36).toUpperCase();
  const hoje = new Date().toLocaleDateString('pt-BR');

  sheet.appendRow([
    id,
    body.nome      || '',
    body.telefone  || '',
    body.email     || '',
    body.endereco  || '',
    body.cidade    || '',
    hoje,
    'Indicado',
    0, 0, 0, 0,
    linkArquivo,
    body.obs       || ''
  ]);

  // Notifica a equipe por e-mail (se configurado)
  if (EMAIL_NOTIFICACAO) {
    try {
      MailApp.sendEmail(EMAIL_NOTIFICACAO,
        '[LumenGrid] Nova indicação de ' + parceiro,
        'Parceiro: ' + parceiro + '\nCliente: ' + (body.nome||'') +
        '\nTelefone: ' + (body.telefone||'') +
        '\nCidade: ' + (body.cidade||'') +
        '\nObs: ' + (body.obs||'')
      );
    } catch(e) {}
  }

  // Cria lead no CRM automaticamente
  adicionarNoCRM({ nome: body.nome, telefone: body.telefone, email: body.email,
                   cidade: body.cidade, endereco: body.endereco, obs: body.obs,
                   parceiro });

  return { ok: true, id };
}

// ────────────────────────────────────────────────
// CRIAR LEAD NO CRM AUTOMATICAMENTE
// ────────────────────────────────────────────────
function adicionarNoCRM(lead) {
  try {
    const ss    = SpreadsheetApp.openById(SHEET_ID_CRM);
    let sheet   = ss.getSheetByName('CRM_Dados');
    if (!sheet) sheet = ss.insertSheet('CRM_Dados');

    const raw   = sheet.getRange(1, 1).getValue();
    const leads = raw ? JSON.parse(raw) : [];

    // Evita duplicata pelo telefone
    const tel = String(lead.telefone || '').replace(/\D/g, '');
    if (tel && leads.some(l => String(l.telefone || '').replace(/\D/g, '') === tel)) return;

    const novoLead = {
      id:        Utilities.getUuid(),
      nome:      lead.nome      || 'Lead do Parceiro',
      telefone:  lead.telefone  || '',
      email:     lead.email     || '',
      cidade:    lead.cidade    || '',
      origem:    'Parceiro — ' + (lead.parceiro || 'Parceiro'),
      resp:      'Lucas',
      stage:     0,
      subtasks:  {},
      history:   [{ text: 'Lead indicado pelo parceiro ' + (lead.parceiro || '') +
                          (lead.obs ? ' — ' + lead.obs : ''),
                    user: 'Sistema', ts: Date.now() }],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      seenBy:    [],
    };

    leads.unshift(novoLead);
    sheet.getRange(1, 1).setValue(JSON.stringify(leads));
  } catch(e) {
    Logger.log('Erro ao adicionar no CRM: ' + e.message);
  }
}

// ────────────────────────────────────────────────
// LANÇAR PROPOSTA (vindo do CRM)
// ────────────────────────────────────────────────
function lancarProposta(body) {
  const parceiro = body.parceiro || 'Michael';
  const ss       = SpreadsheetApp.openById(SHEET_ID_PARCEIROS);
  const sheet    = garantirAba(ss, parceiro);

  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  const nomeCol = headers.indexOf('Nome');
  const statCol = headers.indexOf('Status')              + 1;
  const valCol  = headers.indexOf('Valor Projeto')       + 1;
  const estCol  = headers.indexOf('Comissão Estimada')   + 1;
  const obsCol  = headers.indexOf('Observações')         + 1;

  let rowIdx = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][nomeCol]||'').toLowerCase().trim() ===
        String(body.nomeCliente||'').toLowerCase().trim()) {
      rowIdx = i + 1;
      break;
    }
  }

  if (rowIdx === -1) {
    const hoje = new Date().toLocaleDateString('pt-BR');
    sheet.appendRow([
      'MC' + Date.now().toString(36).toUpperCase(),
      body.nomeCliente||'', '', '', '', '', hoje,
      'Proposta Enviada',
      body.valorProjeto||0, body.comissaoEstimada||0, 0, body.comissaoEstimada||0,
      '', body.obs||''
    ]);
  } else {
    if (valCol > 0) sheet.getRange(rowIdx, valCol).setValue(body.valorProjeto    || 0);
    if (estCol > 0) sheet.getRange(rowIdx, estCol).setValue(body.comissaoEstimada|| 0);
    if (statCol> 0) sheet.getRange(rowIdx, statCol).setValue('Proposta Enviada');
    if (obsCol > 0 && body.obs) sheet.getRange(rowIdx, obsCol).setValue(body.obs);
  }

  return { ok: true };
}

// ────────────────────────────────────────────────
// ATUALIZAR STATUS (vindo do CRM)
// ────────────────────────────────────────────────
function updateStatus(body) {
  const parceiro = body.parceiro || 'Michael';
  const ss       = SpreadsheetApp.openById(SHEET_ID_PARCEIROS);
  const sheet    = ss.getSheetByName(parceiro);
  if (!sheet) return { error: 'Aba não encontrada: ' + parceiro };

  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  const nomeCol = headers.indexOf('Nome');
  const statCol = headers.indexOf('Status')            + 1;
  const pagaCol = headers.indexOf('Comissão Paga')     + 1;
  const pendCol = headers.indexOf('Comissão Pendente') + 1;

  const valCol  = headers.indexOf('Valor Projeto')       + 1;
  const estCol  = headers.indexOf('Comissão Estimada')   + 1;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][nomeCol]||'').toLowerCase().trim() ===
        String(body.nomeCliente||'').toLowerCase().trim()) {
      const row = i + 1;
      if (statCol > 0 && body.status !== undefined)             sheet.getRange(row, statCol).setValue(body.status);
      if (valCol  > 0 && body.valorProjeto !== undefined)       sheet.getRange(row, valCol).setValue(body.valorProjeto);
      if (estCol  > 0 && body.comissaoEstimada !== undefined)   sheet.getRange(row, estCol).setValue(body.comissaoEstimada);
      if (pagaCol > 0 && body.comissaoPaga !== undefined)       sheet.getRange(row, pagaCol).setValue(body.comissaoPaga);
      if (pendCol > 0 && body.comissaoPendente !== undefined)   sheet.getRange(row, pendCol).setValue(body.comissaoPendente);
      return { ok: true };
    }
  }
  return { error: 'Cliente não encontrado: ' + body.nomeCliente };
}

// ────────────────────────────────────────────────
// NOTIFICAÇÃO
// ────────────────────────────────────────────────
function receberNotificacao(body) {
  const parceiro = body.parceiro || 'Michael';
  const mensagem = body.mensagem || '';
  const ss       = SpreadsheetApp.openById(SHEET_ID_PARCEIROS);
  let sheet      = ss.getSheetByName('Notificações');
  if (!sheet) {
    sheet = ss.insertSheet('Notificações');
    sheet.getRange(1,1,1,3).setValues([['Data','Parceiro','Mensagem']]);
    sheet.getRange(1,1,1,3).setBackground('#F26522').setFontColor('#FFFFFF').setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, 3, [130, 100, 400]);
  }
  sheet.appendRow([new Date().toLocaleString('pt-BR'), parceiro, mensagem]);

  if (EMAIL_NOTIFICACAO) {
    try {
      MailApp.sendEmail(EMAIL_NOTIFICACAO,
        '[LumenGrid] Mensagem de ' + parceiro,
        parceiro + ':\n\n' + mensagem);
    } catch(e) {}
  }
  return { ok: true };
}

// ────────────────────────────────────────────────
// IMPORTAÇÃO MANUAL — execute uma vez no editor
// ────────────────────────────────────────────────
function importarLeadsMichaelParaCRM() {
  const ss      = SpreadsheetApp.openById(SHEET_ID_PARCEIROS);
  const sheet   = ss.getSheetByName('Michael');
  if (!sheet) { Logger.log('Aba Michael não encontrada.'); return; }

  const data    = sheet.getDataRange().getValues();
  if (data.length < 2) { Logger.log('Sem dados para importar.'); return; }

  const headers = data[0];
  const nomeCol = headers.indexOf('Nome');
  const telCol  = headers.indexOf('Telefone');
  const emailCol= headers.indexOf('E-mail');
  const endCol  = headers.indexOf('Endereço');
  const cidCol  = headers.indexOf('Cidade');
  const obsCol  = headers.indexOf('Observações');

  const crmSS   = SpreadsheetApp.openById(SHEET_ID_CRM);
  let crmSheet  = crmSS.getSheetByName('CRM_Dados');
  if (!crmSheet) crmSheet = crmSS.insertSheet('CRM_Dados');

  const raw     = crmSheet.getRange(1, 1).getValue();
  const leads   = raw ? JSON.parse(raw) : [];
  const telsExistentes = new Set(leads.map(l => String(l.telefone||'').replace(/\D/g,'')));

  let adicionados = 0;

  data.slice(1).forEach(row => {
    const nome = String(row[nomeCol] || '').trim();
    const tel  = String(row[telCol]  || '').trim();
    if (!nome) return;

    const telLimpo = tel.replace(/\D/g, '');
    if (telLimpo && telsExistentes.has(telLimpo)) return; // já existe

    const novoLead = {
      id:        Utilities.getUuid(),
      nome,
      telefone:  tel,
      email:     emailCol >= 0 ? String(row[emailCol] || '') : '',
      cidade:    cidCol   >= 0 ? String(row[cidCol]   || '') : '',
      origem:    'Parceiro — Michael',
      resp:      'Lucas',
      stage:     0,
      subtasks:  {},
      history:   [{ text: 'Lead importado do portal do parceiro Michael',
                    user: 'Sistema', ts: Date.now() }],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      seenBy:    [],
    };

    leads.unshift(novoLead);
    if (telLimpo) telsExistentes.add(telLimpo);
    adicionados++;
  });

  crmSheet.getRange(1, 1).setValue(JSON.stringify(leads));
  Logger.log(adicionados + ' lead(s) importado(s) para o CRM do Lucas.');
}

// ────────────────────────────────────────────────
// PASTA NO DRIVE
// ────────────────────────────────────────────────
function obterPastaIndicacoes(parceiro) {
  const nome   = 'LumenGrid — Indicações ' + parceiro;
  const pastas = DriveApp.getFoldersByName(nome);
  if (pastas.hasNext()) return pastas.next();
  return DriveApp.createFolder(nome);
}
