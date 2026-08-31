// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  LUMENGRID — Vídeos de Homologação
//  Cole este código em: script.google.com → Novo Projeto → Colar → Implantar
//  Implante como Web App: Executar como "Eu" | Acesso "Qualquer pessoa"
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ────────────────────────────────────────────────
// CONFIGURAÇÃO
// ────────────────────────────────────────────────

const HOMOLAG_SHEET_ID = '1OkoXwfW1oMhQFDRw-mPKQMrk8Y9FClPWIRtZh-lajdM';
const ABA_HOMOLOGACOES = 'Homologações';

// Pasta raiz no Drive (mesma do checklist)
const DRIVE_PASTA_HOMOLAG = 'plan';
// Subpasta dentro de "plan" para homologações
const DRIVE_PASTA_HOMOLAG_SUB = 'homologacao';

// ────────────────────────────────────────────────
// CABEÇALHOS
// ────────────────────────────────────────────────

const HOMOLAG_HEADERS = [
  'ID', 'Data/Hora Envio', 'Instalador', 'Cliente', 'Endereço',
  'Concessionária', 'Concessionária Texto', 'Data Instalação',
  'Número UC / Protocolo', 'Observações Gerais',
  'Pasta Drive', 'Qtd Vídeos', 'Vídeos (JSON)', 'Termos Aceitos'
];

// ────────────────────────────────────────────────
// ENDPOINTS
// ────────────────────────────────────────────────

function doOptions(e) {
  return ContentService.createTextOutput('').setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  let result;
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action || 'save_homologacao';
    if (action === 'save_homologacao') {
      result = saveHomologacao(body.data);
    } else {
      result = { status: 'error', message: 'Ação desconhecida.' };
    }
  } catch (err) {
    result = { status: 'error', message: err.message };
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'ping';
  let result;
  try {
    if (action === 'ping') result = { status: 'ok', message: 'Homologação backend ativo.' };
    else if (action === 'list') result = listHomologacoes();
    else result = { status: 'error', message: 'Ação desconhecida.' };
  } catch (err) {
    result = { status: 'error', message: err.message };
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ────────────────────────────────────────────────
// SALVAR HOMOLOGAÇÃO
// ────────────────────────────────────────────────

function saveHomologacao(data) {
  const ss = SpreadsheetApp.openById(HOMOLAG_SHEET_ID);
  let sheet = ss.getSheetByName(ABA_HOMOLOGACOES);

  if (!sheet) {
    sheet = ss.insertSheet(ABA_HOMOLOGACOES);
    sheet.appendRow(HOMOLAG_HEADERS);
    sheet.setFrozenRows(1);
    const hr = sheet.getRange(1, 1, 1, HOMOLAG_HEADERS.length);
    hr.setBackground('#F26522');
    hr.setFontColor('#ffffff');
    hr.setFontWeight('bold');
    sheet.setColumnWidth(1, 90);
    sheet.setColumnWidth(2, 160);
    sheet.setColumnWidth(4, 200);
  }

  const id = 'HOM-' + String(sheet.getLastRow()).padStart(4, '0');
  const agora = new Date();

  // Salvar vídeos no Drive
  let pastaLink = '';
  const videosInfo = data.videos || [];
  try {
    if (videosInfo.length > 0) {
      const pasta = salvarVideosNoDrive(data.cliente, data.dataInstalacao, id, videosInfo);
      pastaLink = pasta ? pasta.getUrl() : '';
    }
  } catch (driveErr) {
    Logger.log('Drive error: ' + driveErr.message);
  }

  // Resumo dos vídeos para a planilha (sem base64)
  const videosResumo = videosInfo.map(v => ({
    id: v.id,
    nome: v.nome,
    arquivo: v.nomeArquivo || '',
    tamanhoMB: v.tamanhoMB || 0,
    obs: v.obs || '',
    muitoGrande: v.muitoGrande || false
  }));

  const row = [
    id, agora,
    data.instalador || '',
    data.cliente || '',
    data.endereco || '',
    data.concessionaria || '',
    data.concessionariaTexto || '',
    data.dataInstalacao || '',
    data.numeroUC || '',
    data.obsGerais || '',
    pastaLink,
    String(videosInfo.length),
    JSON.stringify(videosResumo),
    data.termosAceitos ? 'Sim' : 'Não'
  ];

  sheet.appendRow(row);
  sheet.getRange(sheet.getLastRow(), 1, 1, HOMOLAG_HEADERS.length).setVerticalAlignment('top');

  return { status: 'ok', id: id, row: sheet.getLastRow(), pastaLink: pastaLink };
}

// ────────────────────────────────────────────────
// SALVAR VÍDEOS NO DRIVE
// ────────────────────────────────────────────────

function salvarVideosNoDrive(cliente, dataInstalacao, id, videos) {
  // Localiza ou cria pasta raiz "plan"
  const raiz = obterOuCriarPastaHomolag(DRIVE_PASTA_HOMOLAG, DriveApp.getRootFolder());

  // Subpasta "homologacao" dentro de "plan"
  const subHomolag = obterOuCriarPastaHomolag(DRIVE_PASTA_HOMOLAG_SUB, raiz);

  // Pasta do envio: "HOM-0001 - Nome Cliente - 2025-01-15"
  const nomePasta = [
    id,
    (cliente || 'sem-nome').replace(/[\/\\:*?"<>|]/g, '_'),
    (dataInstalacao || '')
  ].filter(Boolean).join(' - ');

  const pasta = obterOuCriarPastaHomolag(nomePasta, subHomolag);

  // Salva cada vídeo que tenha base64
  videos.forEach((v, i) => {
    if (!v.base64 || v.muitoGrande) return; // pula arquivos grandes (apenas registrados por nome)
    try {
      const partes = v.base64.split(',');
      const mime = partes[0].match(/:(.*?);/)[1];
      const ext = mime.split('/')[1] || 'mp4';
      const bytes = Utilities.base64Decode(partes[1]);
      const nomeArquivo = (v.nomeArquivo || (v.nome || 'video-' + (i + 1)).replace(/\s+/g, '-')) + '.' + ext;
      const blob = Utilities.newBlob(bytes, mime, nomeArquivo);
      pasta.createFile(blob);
    } catch (e) {
      Logger.log('Erro ao salvar vídeo ' + i + ': ' + e.message);
    }
  });

  // Cria arquivo de texto listando vídeos muito grandes (não carregados)
  const grandes = videos.filter(v => v.muitoGrande);
  if (grandes.length > 0) {
    const linhas = ['Vídeos não carregados (acima de 50 MB):', ''];
    grandes.forEach(v => {
      linhas.push('- ' + (v.nome || v.id) + ': ' + (v.nomeArquivo || 'arquivo não identificado') + ' (' + (v.tamanhoMB || '?') + ' MB)');
    });
    const blob = Utilities.newBlob(linhas.join('\n'), 'text/plain', 'VIDEOS_GRANDES.txt');
    pasta.createFile(blob);
  }

  return pasta;
}

function obterOuCriarPastaHomolag(nome, pai) {
  const it = pai.getFoldersByName(nome);
  if (it.hasNext()) return it.next();
  return pai.createFolder(nome);
}

// ────────────────────────────────────────────────
// LISTAR (resumo)
// ────────────────────────────────────────────────

function listHomologacoes() {
  const ss = SpreadsheetApp.openById(HOMOLAG_SHEET_ID);
  const sheet = ss.getSheetByName(ABA_HOMOLOGACOES);
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues().map(r => ({
    id: r[0], dataEnvio: r[1], instalador: r[2],
    cliente: r[3], concessionaria: r[5], dataInstalacao: r[7]
  }));
}
