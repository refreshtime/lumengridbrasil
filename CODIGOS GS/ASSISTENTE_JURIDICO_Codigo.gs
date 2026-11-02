// ============================================================
// ASSISTENTE JURIDICO LUMENGRID — Google Apps Script Backend
// Feito por Domani Consultoria
// ============================================================

var SHEET_NAME = 'LumenGrid Jurídico';
var PASTA_RAIZ = 'Contratos Jurídicos';

function doPost(e) {
  try {
    var dados = JSON.parse(e.postData.contents);
    var action = dados.action;
    if (action === 'salvarContratoVendedor') return salvarContratoVendedor(dados);
    if (action === 'salvarContratoParceiro') return salvarContratoParceiro(dados);
    return resp({ ok: false, error: 'action desconhecida' });
  } catch (err) {
    return resp({ ok: false, error: err.message });
  }
}

function salvarContratoVendedor(dados) {
  var d = dados.dados;
  var num = dados.numContrato || 'LG-V-SEM-NUM';
  var nome = d.nomeContratado || 'Vendedor';

  // Planilha
  var ss = getOrCreateSpreadsheet();
  var aba = getOrCreateAba(ss, 'Vendedores', ['Num Contrato','Nome','CPF','CNPJ MEI','Email','Telefone','Território','Comissão %','Data','Observações']);
  aba.appendRow([num, nome, d.cpf||'', d.cnpjMei||'', d.emailContratado||'', d.telefoneContratado||'',
    d.areaAtuacao||'', d.comissaoPct||'5', d.dataContrato||'', d.observacoes||'']);

  // Drive
  var pasta = getOrCreatePasta(PASTA_RAIZ + '/Contratos Vendedores/' + nome);
  salvarHTMLnoPDF(pasta, num, dados.preview);

  return resp({ ok: true, num: num });
}

function salvarContratoParceiro(dados) {
  var d = dados.dados;
  var num = dados.numContrato || 'LG-P-SEM-NUM';
  var nome = d.razaoSocial || 'Parceiro';

  var ss = getOrCreateSpreadsheet();
  var aba = getOrCreateAba(ss, 'Parceiros Instaladores', ['Num Contrato','Razão Social','CNPJ','Resp. Técnico','CREA','Email','Telefone','Área','Remuneração','Data','Observações']);
  aba.appendRow([num, nome, d.cnpj||'', d.respTecnico||'', d.crea||'', d.email||'', d.telefone||'',
    d.areaAtuacao||'', d.modeloRemuneracao||'', d.dataContrato||'', d.observacoes||'']);

  var pasta = getOrCreatePasta(PASTA_RAIZ + '/Contratos Parceiros Instaladores/' + nome);
  salvarHTMLnoPDF(pasta, num, dados.preview);

  return resp({ ok: true, num: num });
}

// ---- Helpers ----

function getOrCreateSpreadsheet() {
  var files = DriveApp.getFilesByName(SHEET_NAME);
  if (files.hasNext()) return SpreadsheetApp.open(files.next());
  return SpreadsheetApp.create(SHEET_NAME);
}

function getOrCreateAba(ss, nome, headers) {
  var aba = ss.getSheetByName(nome);
  if (!aba) {
    aba = ss.insertSheet(nome);
    aba.appendRow(headers);
    aba.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return aba;
}

function getOrCreatePasta(caminho) {
  var partes = caminho.split('/');
  var pasta = DriveApp.getRootFolder();
  for (var i = 0; i < partes.length; i++) {
    var nome = partes[i].trim();
    if (!nome) continue;
    var subs = pasta.getFoldersByName(nome);
    pasta = subs.hasNext() ? subs.next() : pasta.createFolder(nome);
  }
  return pasta;
}

function salvarHTMLnoPDF(pasta, num, htmlContent) {
  if (!htmlContent) return;
  var blob = Utilities.newBlob(htmlContent, 'text/html', num + '.html');
  var existentes = pasta.getFilesByName(num + '.html');
  while (existentes.hasNext()) existentes.next().setTrashed(true);
  pasta.createFile(blob);
}

function resp(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function setup() {
  Logger.log('ASSISTENTE JURIDICO GAS configurado. Planilha: ' + SHEET_NAME);
}
