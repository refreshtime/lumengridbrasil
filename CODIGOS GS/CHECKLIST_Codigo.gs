// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  LUMENGRID — Checklist de Visita Técnica
//  Cole este código em: script.google.com → Novo Projeto → Colar → Implantar
//  Implante como Web App: Executar como "Eu" | Acesso "Qualquer pessoa"
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ────────────────────────────────────────────────
// CONFIGURAÇÃO
// ────────────────────────────────────────────────

// Planilha de destino
const CHECKLIST_SHEET_ID = '1OkoXwfW1oMhQFDRw-mPKQMrk8Y9FClPWIRtZh-lajdM';
const ABA_CHECKLISTS = 'Checklists';

// Pasta raiz no Google Drive onde as fotos serão salvas
// Será criada automaticamente se não existir
const DRIVE_PASTA_RAIZ = 'plan';

// ────────────────────────────────────────────────
// CABEÇALHOS
// ────────────────────────────────────────────────

const HEADERS = [
  // Dados da Visita
  'ID', 'Data/Hora Envio', 'Instalador', 'Data Visita', 'Cliente',
  'Endereço', 'Cidade/UF', 'Tipo Projeto',
  // Telhado
  'Tipo Telhado', 'Estrutura para Compra', 'Obs Estrutura',
  'Telhado Apto', 'Ajuste Necessário',
  'Orientação', 'Inclinação', 'Sombreamento', 'Área Disponível (m²)', 'Acesso Telhado',
  // Padrão de Entrada
  'Tipo Ligação', 'Disjuntor Geral (A)', 'Disjuntor Bom Estado',
  'Disjuntor Compatível Solar', 'Aterramento', 'Haste Aterramento',
  'DPS Instalado', 'DPS Classe I/II', 'Quadro Bom Estado',
  'Espaço Quadro', 'Fiação Bom Estado', 'Medidor Bidirecional',
  'Espaço String Box', 'Dentro Normas Concessionária',
  // Inversor e Sistema
  'Local Inversor', 'Obs Local Inversor', 'Cargas (JSON)',
  // Fotos e Vídeo
  'Pasta Fotos Drive', 'Qtd Fotos', 'Vídeo Anexado', 'Nome Vídeo',
  // Adequações
  'Adequações (JSON)', 'Total Adequações (R$)',
  // Custos
  'Custo Instalação (R$)', 'Custo Homologação (R$)', 'Obs Custos',
  // Parecer
  'Parecer Geral', 'Obs Finais', 'Nome Assinatura', 'Tem Assinatura Digital'
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
    if ((body.action || 'save_checklist') === 'save_checklist') {
      result = saveChecklist(body.data);
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
    if (action === 'ping') result = { status: 'ok', message: 'Checklist backend ativo.' };
    else if (action === 'list') result = listChecklists();
    else result = { status: 'error', message: 'Ação desconhecida.' };
  } catch (err) {
    result = { status: 'error', message: err.message };
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ────────────────────────────────────────────────
// SALVAR CHECKLIST
// ────────────────────────────────────────────────

function saveChecklist(data) {
  const ss = SpreadsheetApp.openById(CHECKLIST_SHEET_ID);
  let sheet = ss.getSheetByName(ABA_CHECKLISTS);

  if (!sheet) {
    sheet = ss.insertSheet(ABA_CHECKLISTS);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    const hr = sheet.getRange(1, 1, 1, HEADERS.length);
    hr.setBackground('#F26522');
    hr.setFontColor('#ffffff');
    hr.setFontWeight('bold');
    sheet.setColumnWidth(1, 90);
    sheet.setColumnWidth(2, 160);
    sheet.setColumnWidth(5, 200);
  }

  const id = 'CHK-' + String(sheet.getLastRow()).padStart(4, '0');
  const agora = new Date();

  // Salvar fotos no Drive
  let pastaLink = '';
  try {
    if (data.fotosBase64 && data.fotosBase64.length > 0) {
      const subpasta = salvarFotosNoDrive(data.cliente, data.dataVisita, id, data.fotosBase64, data.assinaturaBase64);
      pastaLink = subpasta ? subpasta.getUrl() : '';
    }
  } catch (driveErr) {
    // Não falha o envio por causa do Drive
    Logger.log('Drive error: ' + driveErr.message);
  }

  const adequacoesJson = JSON.stringify(data.adequacoes || []);
  const totalAdequacoes = (data.adequacoes || []).reduce((s, a) => s + (parseFloat(a.valor) || 0), 0);
  const cargasJson = JSON.stringify(data.cargas || []);

  const row = [
    id, agora,
    data.instalador || '',
    data.dataVisita || '',
    data.cliente || '',
    data.endereco || '',
    data.cidadeUF || '',
    data.tipoProjeto || '',
    // Telhado
    data.tipoTelhado || '',
    data.estruturaCompra || '',
    data.obsEstrutura || '',
    data.telhadoApto || '',
    data.ajusteTelhado || '',
    data.orientacao || '',
    data.inclinacao || '',
    data.sombreamento || '',
    data.areaDisponivel || '',
    data.acessoTelhado || '',
    // Padrão
    data.tipoLigacao || '',
    data.disjuntorAmperagem || '',
    data.disjuntorBomEstado || '',
    data.disjuntorCompativel || '',
    data.aterramento || '',
    data.hasteAterramento || '',
    data.dpsInstalado || '',
    data.dpsClasseI || '',
    data.quadroBomEstado || '',
    data.espacoQuadro || '',
    data.fiacaoBomEstado || '',
    data.medidorBidirecional || '',
    data.espacoStringBox || '',
    data.dentroDasNormas || '',
    // Inversor
    data.localInversor || '',
    data.obsLocalInversor || '',
    cargasJson,
    // Fotos
    pastaLink,
    String(data.qtdFotos || 0),
    data.temVideoAnexado ? 'Sim' : 'Não',
    data.nomeVideo || '',
    // Adequações
    adequacoesJson,
    totalAdequacoes.toFixed(2),
    // Custos
    data.custoInstalacao || '',
    data.custoHomologacao || '',
    data.obsCustos || '',
    // Parecer
    data.parecerGeral || '',
    data.obsFinais || '',
    data.nomeAssinatura || '',
    data.temAssinatura ? 'Sim' : 'Não'
  ];

  sheet.appendRow(row);
  sheet.getRange(sheet.getLastRow(), 1, 1, HEADERS.length).setVerticalAlignment('top');

  return { status: 'ok', id: id, row: sheet.getLastRow(), pastaLink: pastaLink };
}

// ────────────────────────────────────────────────
// SALVAR FOTOS NO DRIVE
// ────────────────────────────────────────────────

function salvarFotosNoDrive(cliente, dataVisita, id, fotosBase64, assinaturaBase64) {
  // Localiza ou cria pasta raiz "plan"
  const raiz = obterOuCriarPasta(DRIVE_PASTA_RAIZ, DriveApp.getRootFolder());

  // Subpasta: "CHK-0001 - Nome Cliente - 2025-01-15"
  const nomeSub = [id, (cliente || 'sem-nome').replace(/[\/\\:*?"<>|]/g, '_'), (dataVisita || '')].filter(Boolean).join(' - ');
  const sub = obterOuCriarPasta(nomeSub, raiz);

  // Salva cada foto
  fotosBase64.forEach((f, i) => {
    if (!f.dataUrl) return;
    try {
      const partes = f.dataUrl.split(',');
      const mime = partes[0].match(/:(.*?);/)[1];
      const ext = mime.split('/')[1] || 'jpg';
      const bytes = Utilities.base64Decode(partes[1]);
      const blob = Utilities.newBlob(bytes, mime, (f.label || 'foto-' + (i + 1)) + '.' + ext);
      sub.createFile(blob);
    } catch (e) {
      Logger.log('Erro ao salvar foto ' + i + ': ' + e.message);
    }
  });

  // Salva assinatura
  if (assinaturaBase64) {
    try {
      const partes = assinaturaBase64.split(',');
      const bytes = Utilities.base64Decode(partes[1]);
      const blob = Utilities.newBlob(bytes, 'image/png', 'assinatura.png');
      sub.createFile(blob);
    } catch (e) {
      Logger.log('Erro ao salvar assinatura: ' + e.message);
    }
  }

  return sub;
}

function obterOuCriarPasta(nome, pai) {
  const it = pai.getFoldersByName(nome);
  if (it.hasNext()) return it.next();
  return pai.createFolder(nome);
}

// ────────────────────────────────────────────────
// LISTAR (resumo)
// ────────────────────────────────────────────────

function listChecklists() {
  const ss = SpreadsheetApp.openById(CHECKLIST_SHEET_ID);
  const sheet = ss.getSheetByName(ABA_CHECKLISTS);
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues().map(r => ({
    id: r[0], dataEnvio: r[1], instalador: r[2],
    dataVisita: r[3], cliente: r[4], tipoProjeto: r[7]
  }));
}
