// ═══════════════════════════════════════════════════════════
// LUMEN GRID — CONTRATOS_Codigo.gs
// Planilha: LumenGrid Contratos
// https://docs.google.com/spreadsheets/d/145EgaXS8Jz1i5NEAWPhHJ9SoOE-Tzs9247vYsrxIR2o
// Abas: Gerado | Assinado
// ═══════════════════════════════════════════════════════════

const COLS = [
  'ID', 'Nº Contrato', 'Data Emissão', 'Cliente', 'CPF/CNPJ',
  'Telefone', 'E-mail', 'Tipo Sistema', 'kVp', 'Valor Total (R$)',
  'Forma Pagamento', 'Consultor', 'Status', 'Pasta no Drive', 'Criado em'
];
const COL_STATUS = 13;

// ── ENDPOINTS ────────────────────────────────────────────────
function doGet(e) {
  try {
    const action = e.parameter.action;
    let result;
    if (action === 'get_contratos') {
      result = getContratos();
    } else {
      result = { success: false, error: 'Acao desconhecida' };
    }
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    // action vem pela URL (?action=salvarContrato) — sobrevive ao redirect do GAS
    const action = e.parameter.action;
    if (action === 'salvarContrato') {
      const body = JSON.parse(e.postData.contents);
      return ContentService
        .createTextOutput(JSON.stringify(salvarContrato(body)))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'Acao desconhecida: ' + action }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── HELPERS DE PASTA / ARQUIVO ────────────────────────────────
function getOrCreateFolder(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function saveOrReplaceFile(folder, fileName, bytes, mimeType) {
  const existing = folder.getFilesByName(fileName);
  while (existing.hasNext()) { existing.next().setTrashed(true); }
  const blob = Utilities.newBlob(bytes, mimeType, fileName);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

// ── SALVA DOCUMENTOS NO DRIVE ─────────────────────────────────
function salvarContrato(p) {
  if (!p || !p.pdf) throw new Error('PDF não recebido. Chaves recebidas: ' + Object.keys(p || {}).join(','));
  if (!p.cnh) throw new Error('CNH não recebida.');

  // 1. Pasta raiz → subpasta do cliente
  const root = getOrCreateFolder(DriveApp.getRootFolder(), 'LumenGrid — Contratos');
  const num     = p.num     || '---';
  const cliNome = p.cliNome || 'Cliente';
  const sub = getOrCreateFolder(root, cliNome + ' - ' + num);
  sub.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const folderUrl = sub.getUrl();
  const id = Utilities.getUuid();

  // 2. PDF
  const pdfBytes = Utilities.base64DecodeWebSafe(p.pdf);
  saveOrReplaceFile(sub, cliNome + ' - ' + num + ' - LUMENGRID.pdf', pdfBytes, 'application/pdf');

  // 3. CNH
  const cnhBytes = Utilities.base64Decode(p.cnh.data);
  const cnhExt   = _extFromMime(p.cnh.type) || _extFromName(p.cnh.name) || 'pdf';
  saveOrReplaceFile(sub, 'CNH_' + cliNome + '.' + cnhExt, cnhBytes, p.cnh.type);

  // 4. Fatura (opcional)
  if (p.fatura) {
    const fatBytes = Utilities.base64Decode(p.fatura.data);
    const fatExt   = _extFromMime(p.fatura.type) || _extFromName(p.fatura.name) || 'pdf';
    saveOrReplaceFile(sub, 'Fatura_' + cliNome + '.' + fatExt, fatBytes, p.fatura.type);
  }

  // 5. Registro na planilha
  try {
    const ss = SpreadsheetApp.openById('145EgaXS8Jz1i5NEAWPhHJ9SoOE-Tzs9247vYsrxIR2o');
    let gerado = ss.getSheetByName('Gerado');
    if (!gerado) {
      gerado = ss.insertSheet('Gerado');
      gerado.getRange(1, 1, 1, COLS.length).setValues([COLS])
        .setFontWeight('bold').setBackground('#E8641A').setFontColor('#ffffff');
      gerado.setFrozenRows(1);
      gerado.setColumnWidth(14, 320);
      gerado.setColumnWidth(4, 200);
    }
    const tipoLabel = p.tipoSistema === 'solar_bateria' ? 'Solar com Bateria (Híbrido)' : 'Solar Fotovoltaico';
    gerado.appendRow([
      id, num, _dt(p.dataEmissao), cliNome, p.cliDoc || '', p.cliFone || '', p.cliEmail || '',
      tipoLabel, p.eqKvp || '', parseFloat(p.payTotal) || 0, _pagLabel(p.payModo),
      p.vendNome || '', 'Gerado', folderUrl, new Date().toLocaleString('pt-BR')
    ]);
    const newRow = gerado.getLastRow();
    gerado.getRange(newRow, 10).setNumberFormat('R$ #,##0.00');
    gerado.getRange(newRow, COL_STATUS).setFontColor('#E8641A').setFontWeight('bold');
    gerado.getRange(newRow, 14).setFontColor('#1a73e8');
  } catch(sheetErr) {
    return { success: true, folderUrl: folderUrl, id: id, warning: sheetErr.message };
  }

  return { success: true, folderUrl: folderUrl, id: id };
}

// ── LER CONTRATOS ─────────────────────────────────────────────
function getContratos() {
  try {
    const ss = SpreadsheetApp.openById('145EgaXS8Jz1i5NEAWPhHJ9SoOE-Tzs9247vYsrxIR2o');
    const sheet = ss.getSheetByName('Assinado') || ss.getSheetByName('Gerado');
    if (!sheet || sheet.getLastRow() < 2) return { contratos: [] };
    const rows = sheet.getDataRange().getValues();
    const contratos = rows.slice(1).map(function(r) {
      return {
        id: r[0]||'', numContrato: r[1]||'',
        dataEmissao: r[2] ? String(r[2]) : '',
        cliente: r[3]||'', cpfCnpj: r[4]||'', telefone: r[5]||'',
        email: r[6]||'', tipoSistema: r[7]||'', kvp: r[8]||'',
        valorTotal: r[9]||0, formaPagamento: r[10]||'',
        consultor: r[11]||'', status: r[12]||''
      };
    }).filter(function(c) { return c.cliente; });
    return { contratos: contratos };
  } catch(err) {
    return { contratos: [], error: err.message };
  }
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
function _extFromMime(mime) {
  if (!mime) return null;
  const map = { 'image/jpeg':'jpg','image/png':'png','image/gif':'gif','image/webp':'webp','application/pdf':'pdf' };
  return map[mime] || null;
}
function _extFromName(name) {
  if (!name) return null;
  const parts = name.split('.');
  return parts.length > 1 ? parts[parts.length-1].toLowerCase() : null;
}
