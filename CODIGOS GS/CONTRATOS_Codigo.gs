// ═══════════════════════════════════════════════════════════
// LUMEN GRID — CONTRATOS_Codigo.gs
// Cole este código no Apps Script da planilha de contratos
// Após colar: Executar > initSheets para configurar as abas
// ═══════════════════════════════════════════════════════════

const COLS = [
  'ID', 'Nº Contrato', 'Data Emissão', 'Cliente', 'CPF/CNPJ',
  'Telefone', 'E-mail', 'Tipo Sistema', 'kVp', 'Valor Total (R$)',
  'Forma Pagamento', 'Consultor', 'Status', 'Google Doc', 'Criado em'
];
const COL_STATUS = 13; // coluna Status (1-based)

// ── INICIALIZAÇÃO ────────────────────────────────────────────
function initSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  _criarAba(ss, 'Gerado',   '#E8641A');
  _criarAba(ss, 'Assinado', '#1a7340');

  // Remove aba padrão vazia se existir
  ['Página1', 'Sheet1'].forEach(nome => {
    const s = ss.getSheetByName(nome);
    if (s && ss.getSheets().length > 2) ss.deleteSheet(s);
  });

  SpreadsheetApp.getUi().alert('Planilha de Contratos configurada com sucesso!');
}

function _criarAba(ss, nome, cor) {
  let sh = ss.getSheetByName(nome);
  if (!sh) sh = ss.insertSheet(nome);

  // Cabeçalho
  if (sh.getLastRow() === 0) {
    sh.appendRow(COLS);
    sh.getRange(1, 1, 1, COLS.length)
      .setFontWeight('bold')
      .setBackground(cor)
      .setFontColor('#ffffff');
    sh.setFrozenRows(1);
    sh.setColumnWidth(14, 320); // coluna Google Doc
    sh.setColumnWidth(4, 200);  // coluna Cliente
  }

  // Dropdown na coluna Status (da linha 2 até 1000)
  const regra = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Gerado', 'Assinado'], true)
    .setAllowInvalid(false)
    .build();
  sh.getRange(2, COL_STATUS, 999, 1).setDataValidation(regra);
}

// ── RECEBE CONTRATO DO contrato.html ─────────────────────────
function doPost(e) {
  try {
    const p = e.parameter;
    if (p.action === 'salvarContrato') {
      const result = salvarContrato(p);
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'Acao desconhecida' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── SALVA O CONTRATO E CRIA O GOOGLE DOC ─────────────────────
function salvarContrato(p) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let gerado = ss.getSheetByName('Gerado');
  if (!gerado) { initSheets(); gerado = ss.getSheetByName('Gerado'); }

  // --- Cria o Google Doc ---
  const docTitle = 'Contrato ' + (p.num || '---') + ' — ' + (p.cliNome || 'Cliente');
  const doc = DocumentApp.create(docTitle);
  const body = doc.getBody();
  body.setMarginTop(56).setMarginBottom(56).setMarginLeft(72).setMarginRight(72);

  // Cabeçalho
  const h1 = body.appendParagraph('LUMEN GRID — ENERGIA INTELIGENTE');
  h1.setHeading(DocumentApp.ParagraphHeading.HEADING1)
    .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  h1.editAsText().setForegroundColor('#E8641A');

  body.appendParagraph('CONTRATO Nº ' + (p.num || '---'))
    .setHeading(DocumentApp.ParagraphHeading.HEADING2)
    .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendHorizontalRule();
  body.appendParagraph('');

  // Seções
  _sec(body, 'DADOS DO CONTRATO');
  _lin(body, 'Número:', p.num);
  _lin(body, 'Data de Emissão:', _dt(p.dataEmissao));
  _lin(body, 'Tipo de Sistema:', _tipo(p.tipoSistema, p.tipoSistemaOutro));
  body.appendParagraph('');

  _sec(body, 'CONTRATANTE');
  _lin(body, 'Nome / Razão Social:', p.cliNome);
  _lin(body, 'CPF / CNPJ:', p.cliDoc);
  if (p.cliRG) _lin(body, 'RG:', p.cliRG);
  _lin(body, 'Endereço:', [p.cliEnder, p.cliCidade, p.cliCEP ? 'CEP ' + p.cliCEP : ''].filter(Boolean).join(', '));
  if (p.cliEmail) _lin(body, 'E-mail:', p.cliEmail);
  if (p.cliFone) _lin(body, 'Telefone:', p.cliFone);
  body.appendParagraph('');

  _sec(body, 'LOCAL DE INSTALAÇÃO');
  _lin(body, 'Endereço:', p.instEnder || p.cliEnder);
  _lin(body, 'Tipo:', p.instTipo);
  _lin(body, 'Conexão:', p.instConexao);
  body.appendParagraph('');

  _sec(body, 'EQUIPAMENTOS');
  if (p.eqModQty) _lin(body, 'Módulos:', p.eqModQty + ' un × ' + p.eqModPwr + ' W' + (p.eqModModel ? ' — ' + p.eqModModel : ''));
  if (p.eqInvQty) _lin(body, 'Inversores:', p.eqInvQty + ' un × ' + p.eqInvPwr + ' kW' + (p.eqInvModel ? ' — ' + p.eqInvModel : ''));
  if (p.eqBatQty && parseFloat(p.eqBatQty) > 0) _lin(body, 'Baterias:', p.eqBatQty + ' un × ' + p.eqBatKwh + ' kWh' + (p.eqBatModel ? ' — ' + p.eqBatModel : ''));
  if (p.eqKvp) _lin(body, 'Potência total:', p.eqKvp);
  if (p.eqGen) _lin(body, 'Geração estimada/mês:', p.eqGen);
  if (p.eqEstrutura) _lin(body, 'Estrutura:', p.eqEstrutura);
  if (p.eqAdicionais) _lin(body, 'Itens adicionais:', p.eqAdicionais);
  body.appendParagraph('');

  _sec(body, 'VALOR E PAGAMENTO');
  _lin(body, 'Valor Total:', 'R$ ' + parseFloat(p.payTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
  _lin(body, 'Forma:', _pag(p.payModo));
  if (p.payModo === 'cartao' && p.payParcelas) {
    _lin(body, 'Parcelamento:', p.payParcelas + 'x de R$ ' +
      (parseFloat(p.payTotal) / parseInt(p.payParcelas)).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) +
      ' (' + (p.payJuros || 'sem juros') + ')');
  } else if (p.payModo === 'parcelado') {
    if (p.payEntrada) _lin(body, 'Entrada (70%):', 'R$ ' + parseFloat(p.payEntrada).toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
    if (p.payEquip)   _lin(body, 'Equipamentos (15%):', 'R$ ' + parseFloat(p.payEquip).toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
    if (p.payInst)    _lin(body, 'Instalação (15%):', 'R$ ' + parseFloat(p.payInst).toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
  } else if (p.payModo === 'personalizado' && p.payPersonalizado) {
    _lin(body, 'Condições:', p.payPersonalizado);
  }
  if (p.payPrazo) _lin(body, 'Prazo de execução:', p.payPrazo + ' dias úteis');
  if (p.vendNome) _lin(body, 'Consultor:', p.vendNome + (p.vendCargo ? ' — ' + p.vendCargo : ''));
  body.appendParagraph('');

  if (p.cObs) {
    _sec(body, 'OBSERVAÇÕES');
    body.appendParagraph(p.cObs);
    body.appendParagraph('');
  }

  // Assinaturas
  body.appendHorizontalRule();
  _sec(body, 'ASSINATURAS');
  body.appendParagraph('');
  body.appendParagraph('________________________________________          ________________________________________')
    .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  const lbls = body.appendParagraph(
    'CONTRATANTE: ' + (p.cliNome || '_______________') +
    '          CONTRATADA: Lumen Grid'
  );
  lbls.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  lbls.editAsText().setFontSize(9).setForegroundColor('#555555');
  body.appendParagraph('Data: ______ / ______ / ____________')
    .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph('');
  body.appendHorizontalRule();
  const rodape = body.appendParagraph('Feito por Domani Consultoria — Lumen Grid Energia Inteligente');
  rodape.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  rodape.editAsText().setForegroundColor('#E8641A').setFontSize(8);

  doc.saveAndClose();
  const docUrl = doc.getUrl();

  // --- Salva na aba Gerado ---
  const id = Utilities.getUuid();
  gerado.appendRow([
    id,
    p.num || '',
    _dt(p.dataEmissao),
    p.cliNome || '',
    p.cliDoc || '',
    p.cliFone || '',
    p.cliEmail || '',
    _tipo(p.tipoSistema, p.tipoSistemaOutro),
    p.eqKvp || '',
    parseFloat(p.payTotal || 0),
    _pag(p.payModo),
    p.vendNome || '',
    'Gerado',
    docUrl,
    new Date().toLocaleString('pt-BR')
  ]);

  const lr = gerado.getLastRow();
  gerado.getRange(lr, 10).setNumberFormat('R$ #,##0.00');
  gerado.getRange(lr, COL_STATUS).setFontColor('#E8641A').setFontWeight('bold');
  gerado.getRange(lr, 14).setFontColor('#1a73e8');

  return { success: true, docUrl: docUrl, id: id };
}

// ── MOVE PARA "ASSINADO" AO MUDAR O DROPDOWN ─────────────────
function onEdit(e) {
  const sheet = e.range.getSheet();
  if (sheet.getName() !== 'Gerado') return;
  if (e.range.getColumn() !== COL_STATUS) return;
  if (e.range.getRow() === 1) return;

  if (e.value !== 'Assinado') return;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let assinado = ss.getSheetByName('Assinado');
  if (!assinado) { initSheets(); assinado = ss.getSheetByName('Assinado'); }

  const row = e.range.getRow();
  const rowData = sheet.getRange(row, 1, 1, COLS.length).getValues()[0];

  // Copia para aba Assinado
  assinado.appendRow(rowData);
  const lr = assinado.getLastRow();
  assinado.getRange(lr, 10).setNumberFormat('R$ #,##0.00');
  assinado.getRange(lr, COL_STATUS).setFontColor('#1a7340').setFontWeight('bold');
  assinado.getRange(lr, 14).setFontColor('#1a73e8');

  // Remove da aba Gerado
  sheet.deleteRow(row);
}

// ── MENU NA PLANILHA ─────────────────────────────────────────
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Lumen Grid')
    .addItem('Configurar planilha', 'initSheets')
    .addToUi();
}

// ── HELPERS ──────────────────────────────────────────────────
function _sec(body, title) {
  const p = body.appendParagraph(title);
  p.setHeading(DocumentApp.ParagraphHeading.HEADING3);
  p.editAsText().setForegroundColor('#E8641A');
}
function _lin(body, label, value) {
  const p = body.appendParagraph('');
  const txt = label + '  ' + (value || '---');
  p.editAsText().setText(txt)
    .setBold(0, label.length - 1, true)
    .setBold(label.length, txt.length - 1, false);
}
function _dt(d) {
  if (!d) return '---';
  const p = d.split('-');
  return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : d;
}
function _tipo(tipo, outro) {
  if (tipo === 'solar_bateria') return 'Solar com Bateria';
  if (tipo === 'solar') return 'Solar (sem bateria)';
  return outro || tipo || '---';
}
function _pag(modo) {
  if (modo === 'cartao') return 'Cartao de Credito';
  if (modo === 'parcelado') return 'Parcelado';
  if (modo === 'personalizado') return 'Personalizado';
  return modo || '---';
}
