// ============================================================
//  LumenGrid — Portal do Parceiro
//  Codigo.gs — Google Apps Script
//
//  SETUP:
//  1. Abra o Google Sheets que vai armazenar os dados
//  2. Extensões → Apps Script → cole este código
//  3. Execute setupPlanilha() uma vez para criar a estrutura
//  4. Implante como Aplicativo da Web:
//       Executar como: Eu
//       Quem tem acesso: Qualquer pessoa
//  5. Copie a URL gerada e cole em michael.html → CONFIG.APPS_SCRIPT_URL
// ============================================================

const CFG = {
  LUMENGRID_EMAIL: 'comercial@lumengridbrasil.com.br',
  PARCEIRO_NOME:   'Michael',
};

// ── ROTEADOR PRINCIPAL ──────────────────────────────────────
function doGet(e) {
  const action = (e.parameter.action || 'getData');
  try {
    let result;
    switch (action) {
      case 'getData':       result = getData();                  break;
      case 'addClient':     result = addClient(e.parameter);     break;
      case 'updateStatus':  result = updateStatus(e.parameter);  break;
      case 'notify':        result = notifyLumenGrid(e.parameter); break;
      default:              result = { error: 'Ação desconhecida: ' + action };
    }
    return out(result);
  } catch (err) {
    return out({ error: err.message });
  }
}

function out(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── LEITURA DE DADOS ────────────────────────────────────────
function getData() {
  const sheet = getSheet('Clientes');
  if (!sheet) return { error: 'Execute setupPlanilha() primeiro.' };

  const raw = sheet.getDataRange().getValues();
  if (raw.length <= 1) return { clientes: [], resumo: calcResumo([]) };

  const headers  = raw[0];
  const clientes = raw.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });

  return { clientes, resumo: calcResumo(clientes) };
}

function calcResumo(clientes) {
  let indicados = 0, contatados = 0, propostas = 0, fechados = 0;
  let valorTotal = 0, comEstimada = 0, comPaga = 0, comPendente = 0;

  const ordem = { 'indicado': 1, 'contatado': 2, 'proposta enviada': 3, 'contrato fechado': 4 };

  clientes.forEach(c => {
    const s = (c['Status'] || '').toLowerCase().trim();
    const nivel = ordem[s] || 0;
    if (nivel >= 1) indicados++;
    if (nivel >= 2) contatados++;
    if (nivel >= 3) propostas++;
    if (nivel >= 4) fechados++;

    valorTotal   += Number(c['Valor Projeto']      || 0);
    comEstimada  += Number(c['Comissão Estimada']   || 0);
    comPaga      += Number(c['Comissão Paga']       || 0);
    comPendente  += Number(c['Comissão Pendente']   || 0);
  });

  return { indicados, contatados, propostas, fechados,
           valorTotal, comEstimada, comPaga, comPendente,
           total: clientes.length };
}

// ── ADICIONAR CLIENTE ───────────────────────────────────────
function addClient(p) {
  const sheet = getSheet('Clientes');
  const id    = 'MC' + Utilities.getUuid().substring(0, 6).toUpperCase();
  const hoje  = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy');

  sheet.appendRow([
    id,
    p.nome     || '',
    p.telefone || '',
    p.cidade   || '',
    hoje,
    'Indicado',
    0, 0, 0, 0,   // Valor Projeto, Com. Estimada, Com. Paga, Com. Pendente
    p.obs      || ''
  ]);

  // Notificação automática para a LumenGrid
  try {
    MailApp.sendEmail({
      to:      CFG.LUMENGRID_EMAIL,
      subject: `[Portal Parceiro] Nova indicação de ${CFG.PARCEIRO_NOME}: ${p.nome}`,
      body:
        `O parceiro ${CFG.PARCEIRO_NOME} adicionou uma nova indicação:\n\n` +
        `Nome:        ${p.nome}\n` +
        `Telefone:    ${p.telefone}\n` +
        `Cidade:      ${p.cidade}\n` +
        `Observações: ${p.obs}\n` +
        `Data:        ${hoje}\n\n` +
        `Acesse a planilha para preencher os dados financeiros.`
    });
  } catch(_) {}

  return { success: true, id };
}

// ── ATUALIZAR STATUS (uso interno LumenGrid) ─────────────────
function updateStatus(p) {
  const sheet = getSheet('Clientes');
  const data  = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(p.id)) {
      if (p.status)         sheet.getRange(i + 1, 6).setValue(p.status);
      if (p.valorProjeto)   sheet.getRange(i + 1, 7).setValue(Number(p.valorProjeto));
      if (p.comEstimada)    sheet.getRange(i + 1, 8).setValue(Number(p.comEstimada));
      if (p.comPaga)        sheet.getRange(i + 1, 9).setValue(Number(p.comPaga));
      if (p.comPendente)    sheet.getRange(i + 1, 10).setValue(Number(p.comPendente));
      if (p.obs !== undefined) sheet.getRange(i + 1, 11).setValue(p.obs);
      return { success: true };
    }
  }
  return { error: 'Cliente não encontrado: ' + p.id };
}

// ── NOTIFICAÇÃO MANUAL ──────────────────────────────────────
function notifyLumenGrid(p) {
  MailApp.sendEmail({
    to:      CFG.LUMENGRID_EMAIL,
    subject: `[Portal Parceiro] Mensagem de ${CFG.PARCEIRO_NOME}`,
    body:    p.mensagem || '(sem mensagem)'
  });
  return { success: true };
}

// ── HELPER ──────────────────────────────────────────────────
function getSheet(nome) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nome);
}

// ── SETUP INICIAL (executar uma vez) ────────────────────────
function setupPlanilha() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let sheet = ss.getSheetByName('Clientes');
  if (!sheet) sheet = ss.insertSheet('Clientes');
  else sheet.clearContents();

  const headers = [
    'ID', 'Nome', 'Telefone', 'Cidade',
    'Data Indicação', 'Status',
    'Valor Projeto', 'Comissão Estimada', 'Comissão Paga', 'Comissão Pendente',
    'Observações'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // Estilo do cabeçalho
  const hRange = sheet.getRange(1, 1, 1, headers.length);
  hRange.setBackground('#F26522').setFontColor('#FFFFFF')
        .setFontWeight('bold').setFontFamily('Arial');
  sheet.setFrozenRows(1);

  // Larguras
  [100,180,130,130,120,140,130,150,130,150,220].forEach((w, i) => sheet.setColumnWidth(i+1, w));

  // Dados de exemplo
  const ex = [
    ['MC001','Ricardo Almeida',  '(11) 98765-4321','São Paulo',    '15/02/2026','Contrato Fechado',45000,2700,2700,0,   'Residencial 5kWp'],
    ['MC002','Fernanda Costa',   '(11) 91234-5678','Guarulhos',    '28/03/2026','Proposta Enviada',38000,2280,0,   2280,'Aguardando financiamento'],
    ['MC003','Alexandre Souza',  '(11) 97777-2222','São Bernardo', '05/05/2026','Contrato Fechado',62000,3720,1860,1860,'Sistema híbrido'],
    ['MC004','Bruno Takahashi',  '(11) 99876-5432','Santo André',  '10/06/2026','Contatado',       0,    0,   0,   0,   'Reunião agendada'],
    ['MC005','Carla Mendonça',   '(19) 98888-1111','Campinas',     '20/06/2026','Proposta Enviada',29000,1740,0,   1740,''],
    ['MC006','Patricia Lima',    '(11) 95555-3333','Osasco',       '03/07/2026','Indicado',        0,    0,   0,   0,   'Indicação recente'],
  ];

  sheet.getRange(2, 1, ex.length, headers.length).setValues(ex);
  sheet.getRange(2, 7, ex.length, 4).setNumberFormat('R$ #,##0.00');

  // Validação de status (dropdown)
  const statusList = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Indicado','Contatado','Proposta Enviada','Contrato Fechado'])
    .build();
  sheet.getRange(2, 6, 200, 1).setDataValidation(statusList);

  SpreadsheetApp.getUi().alert(
    '✅ Planilha configurada com sucesso!\n\n' +
    'Próximos passos:\n' +
    '1. Implante este script como Aplicativo da Web\n' +
    '   (Executar como: Eu | Acesso: Qualquer pessoa)\n' +
    '2. Copie a URL gerada\n' +
    '3. Cole em michael.html → CONFIG.APPS_SCRIPT_URL'
  );
}
