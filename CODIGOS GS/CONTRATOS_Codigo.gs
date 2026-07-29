// ═══════════════════════════════════════════════════════════
// LUMEN GRID — CONTRATOS_Codigo.gs
// Recebe PDF gerado no cliente e salva no Google Drive
// ═══════════════════════════════════════════════════════════

const COLS = [
  'ID', 'Nº Contrato', 'Data Emissão', 'Cliente', 'CPF/CNPJ',
  'Telefone', 'E-mail', 'Tipo Sistema', 'kVp', 'Valor Total (R$)',
  'Forma Pagamento', 'Consultor', 'Status', 'Arquivo PDF', 'Criado em'
];
const COL_STATUS = 13;

// ── ENDPOINT ─────────────────────────────────────────────────
function doPost(e) {
  try {
    const action = e.parameter.action;
    if (action === 'salvarContrato') {
      const pdfBase64 = (e.postData && e.postData.contents) ? e.postData.contents : '';
      return ContentService
        .createTextOutput(JSON.stringify(salvarContrato(e.parameter, pdfBase64)))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'Acao desconhecida' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── SALVA PDF NO DRIVE ────────────────────────────────────────
function salvarContrato(p, pdfBase64) {
  if (!pdfBase64) throw new Error('PDF não recebido.');

  // Pasta de destino
  const folderName = 'LumenGrid — Contratos';
  const folders = DriveApp.getFoldersByName(folderName);
  const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);

  // Salva o PDF
  const num     = p.num     || '---';
  const cliNome = p.cliNome || 'Cliente';
  const fileName = 'Contrato ' + num + ' — ' + cliNome + '.pdf';
  const bytes = Utilities.base64DecodeWebSafe(pdfBase64);
  const blob  = Utilities.newBlob(bytes, 'application/pdf', fileName);
  const file  = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const fileUrl = file.getUrl();

  // Registro na planilha
  const ss = SpreadsheetApp.openById('1LTv6dFRT56533gfPc5elNfxiddsUzgYyLbCLsNykyRQ');
  let gerado = ss.getSheetByName('Gerado');
  if (!gerado) {
    gerado = ss.insertSheet('Gerado');
    gerado.appendRow(COLS);
    gerado.getRange(1, 1, 1, COLS.length).setFontWeight('bold').setBackground('#E8641A').setFontColor('#ffffff');
    gerado.setFrozenRows(1);
    gerado.setColumnWidth(14, 320);
    gerado.setColumnWidth(4, 200);
  }

  const id = Utilities.getUuid();
  const tipoLabel = p.tipoSistema === 'solar_bateria' ? 'Solar com Bateria (Híbrido)' : 'Solar Fotovoltaico';
  gerado.appendRow([
    id, num, _dt(p.dataEmissao), cliNome, p.cliDoc || '', p.cliFone || '', p.cliEmail || '',
    tipoLabel, p.eqKvp || '', parseFloat(p.payTotal) || 0, _pagLabel(p.payModo),
    p.vendNome || '', 'Gerado', fileUrl, new Date().toLocaleString('pt-BR')
  ]);
  const lr = gerado.getLastRow();
  gerado.getRange(lr, 10).setNumberFormat('R$ #,##0.00');
  gerado.getRange(lr, COL_STATUS).setFontColor('#E8641A').setFontWeight('bold');
  gerado.getRange(lr, 14).setFontColor('#1a73e8');

  return { success: true, docUrl: fileUrl, id: id };
}

// ── MENU / EVENTOS ────────────────────────────────────────────
function initSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return;
  ['Gerado', 'Assinado'].forEach(function(nome) {
    let sh = ss.getSheetByName(nome);
    if (!sh) {
      sh = ss.insertSheet(nome);
      sh.appendRow(COLS);
      sh.getRange(1, 1, 1, COLS.length).setFontWeight('bold')
        .setBackground(nome === 'Gerado' ? '#E8641A' : '#1a7340').setFontColor('#ffffff');
      sh.setFrozenRows(1);
      sh.setColumnWidth(14, 320);
    }
  });
  try { SpreadsheetApp.getUi().alert('Planilha de Contratos configurada!'); } catch(_) {}
}

function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('Lumen Grid')
      .addItem('Configurar planilha', 'initSheets').addToUi();
  } catch(_) {}
}

function onEdit(e) {
  const sheet = e.range.getSheet();
  if (sheet.getName() !== 'Gerado' || e.range.getColumn() !== COL_STATUS || e.range.getRow() === 1) return;
  if (e.value !== 'Assinado') return;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let assinado = ss.getSheetByName('Assinado');
  if (!assinado) { initSheets(); assinado = ss.getSheetByName('Assinado'); }
  const row = e.range.getRow();
  const rowData = sheet.getRange(row, 1, 1, COLS.length).getValues()[0];
  assinado.appendRow(rowData);
  const lr = assinado.getLastRow();
  assinado.getRange(lr, 10).setNumberFormat('R$ #,##0.00');
  assinado.getRange(lr, COL_STATUS).setFontColor('#1a7340').setFontWeight('bold');
  assinado.getRange(lr, 14).setFontColor('#1a73e8');
  sheet.deleteRow(row);
}

// ── HELPERS ───────────────────────────────────────────────────
function _dt(d) {
  if (!d) return new Date().toLocaleDateString('pt-BR');
  const pts = d.split('-');
  return pts.length === 3 ? pts[2] + '/' + pts[1] + '/' + pts[0] : d;
}
function _pagLabel(modo) {
  if (modo === 'cartao') return 'Cartão de Crédito';
  if (modo === 'parcelado') return 'Parcelado';
  if (modo === 'personalizado') return 'Personalizado';
  return modo || '---';
}
