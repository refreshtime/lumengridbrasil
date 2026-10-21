// ═══════════════════════════════════════════════════════════
// LUMEN GRID — LEADS_CODIGO.GS
// Endpoint para receber leads do formulário orcamento.html
// ═══════════════════════════════════════════════════════════
// Como usar:
//   1. Abra script.google.com → Novo projeto
//   2. Cole este código (arquivo Code.gs)
//   3. Implantar > Nova implantação > Tipo: App da Web
//      - Executar como: Eu (sua conta Google)
//      - Quem pode acessar: Qualquer pessoa
//   4. Copie a URL gerada e cole em orcamento.html
//      na variável GAS_URL (busque por "URL_DO_WEB_APP_AQUI")
// ═══════════════════════════════════════════════════════════

// ── CONFIG ──────────────────────────────────────────────────
// Cole aqui o ID da planilha onde os leads serão gravados.
// Deixe em branco para criar uma nova planilha automaticamente.
const LEADS_SHEET_ID = '1qrYtwajNSEKrQkf5KdXE1eZ3li3AeKXtroZlxBDFY1Y';
const LEADS_SHEET_NAME = 'Leads Orçamento';

// ── doPost: recebe JSON do formulário orcamento.html ────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    const ss = getLeadsSpreadsheet();
    let sh = ss.getSheetByName(LEADS_SHEET_NAME);

    // Cria aba com cabeçalho se não existir
    if (!sh) {
      sh = ss.insertSheet(LEADS_SHEET_NAME);
      const headers = [
        'Timestamp', 'Objetivo', 'Tipo Imóvel', 'Já Tem Solar',
        'Nome', 'Sobrenome', 'Email', 'Telefone', 'Estado', 'Cidade', 'Faixa Conta',
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'gclid', 'gbraid', 'wbraid',
        'fbclid', 'fbc', 'fbp',
        'campaign_id', 'adset_id', 'ad_id', 'placement',
        'landing_page', 'referrer', 'ga_client_id'
      ];
      sh.appendRow(headers);
      sh.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#E8641A')
        .setFontColor('#fff');
      sh.setFrozenRows(1);
      sh.setColumnWidth(1, 160); // Timestamp
      sh.setColumnWidth(7, 200); // Email
    }

    // Grava lead
    sh.appendRow([
      new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      data.objetivo      || '',
      data.tipo_imovel   || '',
      data.ja_tem_solar  || '',
      data.nome          || '',
      data.sobrenome     || '',
      data.email         || '',
      data.telefone      || '',
      data.estado        || '',
      data.cidade        || '',
      data.faixa_conta   || '',
      data.utm_source    || '',
      data.utm_medium    || '',
      data.utm_campaign  || '',
      data.utm_term      || '',
      data.utm_content   || '',
      data.gclid         || '',
      data.gbraid        || '',
      data.wbraid        || '',
      data.fbclid        || '',
      data.fbc           || '',
      data.fbp           || '',
      data.campaign_id   || '',
      data.adset_id      || '',
      data.ad_id         || '',
      data.placement     || '',
      data.landing_page  || '',
      data.referrer      || '',
      data.ga_client_id  || ''
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    console.error('LEADS doPost error:', err);
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// doGet: página de status (opcional — confirma que o web app está ativo)
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'LumenGrid Leads — Web App ativo.' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── HELPERS ─────────────────────────────────────────────────
function getLeadsSpreadsheet() {
  if (LEADS_SHEET_ID) {
    return SpreadsheetApp.openById(LEADS_SHEET_ID);
  }

  // Busca planilha existente pelo nome
  const files = DriveApp.getFilesByName('LumenGrid — Leads Orçamento');
  if (files.hasNext()) {
    return SpreadsheetApp.open(files.next());
  }

  // Cria nova planilha
  const ss = SpreadsheetApp.create('LumenGrid — Leads Orçamento');
  console.log('Nova planilha criada. ID:', ss.getId());
  return ss;
}
