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

// Pasta dedicada de homologação (Form 1 — documentos do cliente)
const DRIVE_PASTA_HOMOLAG_DADOS_ID = '1n3kABE2H3i_1GvQwNVz_IrDR6nU14I8h';

// Destinatário do e-mail automático ao receber homologação
const EMAIL_DESTINO = 'comercial@lumengridbrasil.com.br';

// ────────────────────────────────────────────────
// CABEÇALHOS
// ────────────────────────────────────────────────

const HOMOLAG_HEADERS = [
  'ID', 'Data/Hora Envio', 'Instalador', 'Cliente', 'Endereço',
  'Concessionária', 'Concessionária Texto', 'Data Instalação',
  'Número UC / Protocolo', 'Tipo Ligação',
  'E-mail Cliente', 'Telefone Cliente', 'Coordenadas', 'Disjuntor Padrão',
  'Inversor (Marca/Modelo/Qtd)', 'Módulo (Marca/Modelo/Qtd)',
  'Fatura (link Drive)', 'Documento Titular (link Drive)',
  'Observações Gerais', 'Pasta Drive', 'Qtd Vídeos', 'Vídeos (JSON)', 'Termos Aceitos'
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
    // Aceita tanto fetch (postData.contents) quanto form iframe (parameter.payload)
    const raw = (e.postData && e.postData.contents) || (e.parameter && e.parameter.payload) || '{}';
    const body = JSON.parse(raw);
    const action = body.action || 'save_homologacao';
    if      (action === 'save_homologacao')       result = saveHomologacao(body.data);
    else if (action === 'save_homologacao_dados') result = saveHomologacaoDados(body.data);
    else result = { status: 'error', message: 'Ação desconhecida.' };
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
    if      (action === 'ping')       result = { status: 'ok', message: 'Homologação backend ativo.' };
    else if (action === 'list')       result = listHomologacoes();
    else if (action === 'get_index')  result = getHomologacoesIndex();
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

  // Salvar arquivos no Drive (vídeos + documentos)
  let pastaLink = '';
  let faturaLink = '';
  let documentoLink = '';
  const videosInfo = data.videos || [];
  const docsInfo = data.documentos || {};
  let pasta = null;
  try {
    pasta = salvarArquivosNoDrive(data.cliente, data.dataInstalacao, id, videosInfo, docsInfo);
    pastaLink = pasta ? pasta.getUrl() : '';
    faturaLink = pasta ? obterLinkArquivoPasta(pasta, 'fatura') : '';
    documentoLink = pasta ? obterLinkArquivoPasta(pasta, 'documento') : '';
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

  const inv = data.inversor || {};
  const mod = data.modulo || {};

  const row = [
    id, agora,
    data.instalador || '',
    data.cliente || '',
    data.endereco || '',
    data.concessionaria || '',
    data.concessionariaTexto || '',
    data.dataInstalacao || '',
    data.protocolo || '',
    data.tipoLigacao || '',
    data.emailCliente || '',
    data.telefoneCliente || '',
    data.coordenadas || '',
    data.disjuntorPadrao || '',
    [inv.marca, inv.modelo, inv.qtd].filter(Boolean).join(' / '),
    [mod.marca, mod.modelo, mod.qtd].filter(Boolean).join(' / '),
    faturaLink,
    documentoLink,
    data.obsGerais || '',
    pastaLink,
    String(videosInfo.length),
    JSON.stringify(videosResumo),
    data.termosAceitos ? 'Sim' : 'Não'
  ];

  sheet.appendRow(row);
  sheet.getRange(sheet.getLastRow(), 1, 1, HOMOLAG_HEADERS.length).setVerticalAlignment('top');

  // Enviar e-mail automático
  try {
    enviarEmailHomologacao(data, pastaLink, id);
  } catch (mailErr) {
    Logger.log('E-mail error: ' + mailErr.message);
  }

  return { status: 'ok', id: id, row: sheet.getLastRow(), pastaLink: pastaLink };
}

// ────────────────────────────────────────────────
// SALVAR ARQUIVOS NO DRIVE (vídeos + documentos)
// ────────────────────────────────────────────────

function salvarArquivosNoDrive(cliente, dataInstalacao, id, videos, docs) {
  const raiz = obterOuCriarPastaHomolag(DRIVE_PASTA_HOMOLAG, DriveApp.getRootFolder());
  const subHomolag = obterOuCriarPastaHomolag(DRIVE_PASTA_HOMOLAG_SUB, raiz);

  const nomePasta = [
    id,
    (cliente || 'sem-nome').replace(/[\/\\:*?"<>|]/g, '_'),
    (dataInstalacao || '')
  ].filter(Boolean).join(' - ');

  const pasta = obterOuCriarPastaHomolag(nomePasta, subHomolag);

  // Salva cada vídeo que tenha base64
  videos.forEach((v, i) => {
    if (!v.base64 || v.muitoGrande) return;
    try {
      const partes = v.base64.split(',');
      const mime = partes[0].match(/:(.*?);/)[1];
      const ext = mime.split('/')[1] || 'mp4';
      const bytes = Utilities.base64Decode(partes[1]);
      const nomeArquivo = (v.nomeArquivo || (v.nome || 'video-' + (i + 1)).replace(/\s+/g, '-'));
      const blob = Utilities.newBlob(bytes, mime, nomeArquivo);
      pasta.createFile(blob);
    } catch (e) {
      Logger.log('Erro ao salvar vídeo ' + i + ': ' + e.message);
    }
  });

  // Cria arquivo listando vídeos muito grandes
  const grandes = videos.filter(v => v.muitoGrande);
  if (grandes.length > 0) {
    const linhas = ['Vídeos não carregados (acima de 50 MB):', ''];
    grandes.forEach(v => {
      linhas.push('- ' + (v.nome || v.id) + ': ' + (v.nomeArquivo || 'arquivo não identificado'));
    });
    pasta.createFile(Utilities.newBlob(linhas.join('\n'), 'text/plain', 'VIDEOS_GRANDES.txt'));
  }

  // Salva documentos (fatura / documento do titular)
  const labelsDoc = { fatura: 'fatura_energia', documento: 'documento_titular' };
  Object.entries(docs || {}).forEach(([tipo, info]) => {
    if (!info || !info.base64 || info.grande) return;
    try {
      const partes = info.base64.split(',');
      const mime = partes[0].match(/:(.*?);/)[1];
      const bytes = Utilities.base64Decode(partes[1]);
      const nomeArquivo = (labelsDoc[tipo] || tipo) + '_' + id + '_' + (info.nome || 'arquivo');
      pasta.createFile(Utilities.newBlob(bytes, mime, nomeArquivo));
    } catch (e) {
      Logger.log('Erro ao salvar doc ' + tipo + ': ' + e.message);
    }
  });

  return pasta;
}

function obterLinkArquivoPasta(pasta, prefixo) {
  try {
    const it = pasta.getFiles();
    while (it.hasNext()) {
      const f = it.next();
      if (f.getName().indexOf(prefixo) === 0) return f.getUrl();
    }
  } catch (e) { /* ignora */ }
  return '';
}

function obterOuCriarPastaHomolag(nome, pai) {
  const it = pai.getFoldersByName(nome);
  if (it.hasNext()) return it.next();
  return pai.createFolder(nome);
}

// ────────────────────────────────────────────────
// SALVAR DADOS DE HOMOLOGAÇÃO (Form 1 — Vendedor)
// ────────────────────────────────────────────────

const ABA_DADOS = 'Homologacoes_Dados';

const DADOS_HEADERS = [
  'ID', 'Data/Hora Envio', 'Vendedor', 'Cliente', 'Endereço',
  'Concessionária', 'Data Instalação', 'Tipo Ligação',
  'E-mail Cliente', 'Telefone Cliente', 'Coordenadas', 'Disjuntor Padrão',
  'Inversor (Marca/Modelo/Qtd)', 'Módulo (Marca/Modelo/Qtd)',
  'Fatura (link Drive)', 'Documento Titular (link Drive)',
  'Protocolo/OS', 'Observações Gerais'
];

function saveHomologacaoDados(data) {
  const ss = SpreadsheetApp.openById(HOMOLAG_SHEET_ID);
  let sheet = ss.getSheetByName(ABA_DADOS);

  if (!sheet) {
    sheet = ss.insertSheet(ABA_DADOS);
    sheet.appendRow(DADOS_HEADERS);
    sheet.setFrozenRows(1);
    const hr = sheet.getRange(1, 1, 1, DADOS_HEADERS.length);
    hr.setBackground('#0D9488');
    hr.setFontColor('#ffffff');
    hr.setFontWeight('bold');
  }

  const id = 'HD-' + String(sheet.getLastRow()).padStart(4, '0');
  const agora = new Date();

  // Salvar documentos no Drive
  let faturaLink = '';
  let documentoLink = '';
  const docsInfo = data.documentos || {};
  try {
    const pastaRaiz = DriveApp.getFolderById(DRIVE_PASTA_HOMOLAG_DADOS_ID);
    const nomeCliente = (data.cliente || 'sem-nome').replace(/[\/\\:*?"<>|]/g, '_');
    const codContrato = (data.protocolo || '').replace(/[\/\\:*?"<>|]/g, '_');
    const nomePasta = codContrato ? nomeCliente + ' - ' + codContrato : nomeCliente;
    const pasta = obterOuCriarPastaHomolag(nomePasta, pastaRaiz);

    const labelsDoc = { fatura: 'fatura_energia', documento: 'documento_titular' };
    Object.entries(docsInfo).forEach(([tipo, info]) => {
      if (!info || !info.base64 || info.grande) return;
      try {
        const partes = info.base64.split(',');
        const mime = partes[0].match(/:(.*?);/)[1];
        const bytes = Utilities.base64Decode(partes[1]);
        const nomeArq = (labelsDoc[tipo] || tipo) + '_' + id + '_' + (info.nome || 'arquivo');
        const f = pasta.createFile(Utilities.newBlob(bytes, mime, nomeArq));
        if (tipo === 'fatura')    faturaLink = f.getUrl();
        if (tipo === 'documento') documentoLink = f.getUrl();
      } catch (e) { Logger.log('Doc error ' + tipo + ': ' + e.message); }
    });
  } catch (driveErr) {
    Logger.log('Drive error (dados): ' + driveErr.message);
  }

  const inv = data.inversor || {};
  const mod = data.modulo || {};

  const row = [
    id, agora,
    data.vendedor || '',
    data.cliente || '',
    data.endereco || '',
    data.concessionaria || '',
    data.dataInstalacao || '',
    data.tipoLigacao || '',
    data.emailCliente || '',
    data.telefoneCliente || '',
    data.coordenadas || '',
    data.disjuntorPadrao || '',
    [inv.marca, inv.modelo, inv.qtd].filter(Boolean).join(' / '),
    [mod.marca, mod.modelo, mod.qtd].filter(Boolean).join(' / '),
    faturaLink,
    documentoLink,
    data.protocolo || '',
    data.obsGerais || ''
  ];

  sheet.appendRow(row);
  sheet.getRange(sheet.getLastRow(), 1, 1, DADOS_HEADERS.length).setVerticalAlignment('top');

  // E-mail automático
  try { enviarEmailHomologacao(data, '', id); } catch(e) { Logger.log('Mail error: ' + e.message); }

  return { status: 'ok', id: id };
}

// ────────────────────────────────────────────────
// ÍNDICE DE HOMOLOGAÇÕES (consultado pelo CRM)
// ────────────────────────────────────────────────

function getHomologacoesIndex() {
  const ss = SpreadsheetApp.openById(HOMOLAG_SHEET_ID);
  const sheet = ss.getSheetByName(ABA_DADOS);
  if (!sheet || sheet.getLastRow() < 2) return { status: 'ok', clientes: [] };
  // Coluna 4 = Cliente (índice 3 em 0-based, coluna D)
  const rows = sheet.getRange(2, 4, sheet.getLastRow() - 1, 1).getValues();
  const clientes = rows.map(r => (r[0] || '').toString().trim().toLowerCase()).filter(Boolean);
  return { status: 'ok', clientes: clientes };
}

// ────────────────────────────────────────────────
// E-MAIL AUTOMÁTICO
// ────────────────────────────────────────────────

function enviarEmailHomologacao(data, pastaLink, id) {
  if (!EMAIL_DESTINO || EMAIL_DESTINO.indexOf('COLE_') === 0) return;

  const inv = data.inversor || {};
  const mod = data.modulo || {};
  const invTexto = [inv.marca, inv.modelo, inv.qtd ? inv.qtd + ' un.' : ''].filter(Boolean).join(' ');
  const modTexto = [mod.marca, mod.modelo, mod.qtd ? mod.qtd + ' un.' : ''].filter(Boolean).join(' ');

  const corpo = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9f9f9">
  <div style="background:#F26522;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0">
    <strong style="font-size:18px">LumenGrid — Nova Homologação Recebida</strong>
    <div style="font-size:12px;margin-top:4px;opacity:.85">ID: ${id}</div>
  </div>
  <div style="background:#fff;padding:20px;border-radius:0 0 8px 8px;border:1px solid #eee">
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <tr><td style="padding:6px 0;color:#555;width:180px">Instalador</td><td><strong>${data.instalador || '—'}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#555">Cliente</td><td><strong>${data.cliente || '—'}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#555">Endereço</td><td>${data.endereco || '—'}</td></tr>
      <tr><td style="padding:6px 0;color:#555">Concessionária</td><td>${data.concessionaria || '—'}</td></tr>
      <tr><td style="padding:6px 0;color:#555">Data Instalação</td><td>${data.dataInstalacao || '—'}</td></tr>
      <tr><td style="padding:6px 0;color:#555">E-mail Cliente</td><td>${data.emailCliente || '—'}</td></tr>
      <tr><td style="padding:6px 0;color:#555">Telefone Cliente</td><td>${data.telefoneCliente || '—'}</td></tr>
      <tr><td style="padding:6px 0;color:#555">Coordenadas</td><td>${data.coordenadas || '—'}</td></tr>
      <tr><td style="padding:6px 0;color:#555">Disjuntor Padrão</td><td>${data.disjuntorPadrao || '—'}</td></tr>
      <tr><td style="padding:6px 0;color:#555">Inversor</td><td>${invTexto || '—'}</td></tr>
      <tr><td style="padding:6px 0;color:#555">Módulo</td><td>${modTexto || '—'}</td></tr>
      <tr><td style="padding:6px 0;color:#555">Vídeos enviados</td><td>${(data.videos || []).length} arquivo(s)</td></tr>
      ${data.obsGerais ? '<tr><td style="padding:6px 0;color:#555">Observações</td><td>' + data.obsGerais + '</td></tr>' : ''}
      ${pastaLink ? '<tr><td style="padding:6px 0;color:#555">Pasta Drive</td><td><a href="' + pastaLink + '" style="color:#F26522">Abrir pasta</a></td></tr>' : ''}
    </table>
  </div>
  <div style="font-size:10px;color:#aaa;margin-top:12px;text-align:center">Feito por Domani Consultoria</div>
</div>`;

  MailApp.sendEmail({
    to: EMAIL_DESTINO,
    subject: 'LumenGrid — Homologação ' + id + ' — ' + (data.cliente || 'cliente'),
    htmlBody: corpo
  });
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
