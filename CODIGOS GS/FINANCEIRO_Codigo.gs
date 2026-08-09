// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  LUMENGRID — Financeiro · Google Apps Script Backend (v2)
//  Planilha: https://docs.google.com/spreadsheets/d/1b5bp7uPF2jDsR2i9CvGVdyhfkyuqYm-FyKevn3o8foM
//  Cole em: script.google.com → Novo Projeto → Colar → Implantar como Web App
//  Executar como: Você · Quem acessa: Qualquer pessoa
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SHEET_ID_FIN      = '1b5bp7uPF2jDsR2i9CvGVdyhfkyuqYm-FyKevn3o8foM';
const SHEET_ID_CONTRATOS = '145EgaXS8Jz1i5NEAWPhHJ9SoOE-Tzs9247vYsrxIR2o';

// ── Token de autenticação (altere para um valor secreto) ──────
const API_TOKEN = 'LG_xK9mQ3wZ7vR2pN8j';

// ── Cabeçalhos legados (mantidos para retrocompatibilidade) ───
const HDR_RECEITAS = [
  'ID','Data','Cliente','CPF/CNPJ','Endereço','Tipo','kVp','Módulos',
  'Inversor','Bateria','Valor Total (R$)','Valor Recebido (R$)',
  'Forma Pagamento','Condições','Consultor','Status','Observações','Nº Contrato','Criado em'
];
const HDR_DESPESAS = [
  'ID','Data','Descrição','Categoria','Valor (R$)','Método',
  'Observação','Lançado por','Nº Contrato','Projeto ID','Ref Contrato','Criado em'
];
const HDR_PREVISOES = [
  'ID','Data','Tipo','Cliente','Descrição','Categoria','Valor (R$)','Observação','Status','Criado em'
];

// ── Cabeçalhos novos ──────────────────────────────────────────
const HDR_LANCAMENTOS = [
  'ID Lançamento','Tipo','Situação','Descrição','Cliente/Fornecedor',
  'Categoria','Grupo DRE','Centro de Custo','ID Projeto','Nº Contrato',
  'Status Vínculo','Data Emissão','Data Competência','Data Vencimento',
  'Data Prevista Caixa','Valor Previsto (R$)','Parcela','Qtd Parcelas',
  'Forma Prevista','Conta Prevista','Documento','Origem','Observações',
  'Criado por','Criado em','Atualizado em','Versão','Ativo'
];
const HDR_BAIXAS = [
  'ID Baixa','ID Lançamento','Data Caixa','Valor Principal (R$)',
  'Juros/Multa (R$)','Desconto (R$)','Tarifa (R$)','Valor Líquido (R$)',
  'Conta Financeira','Método','Comprovante','Conciliado','Observação',
  'Criado por','Criado em'
];
const HDR_HISTORICO = [
  'ID','Entidade','Entidade ID','Campo','Valor Anterior','Valor Novo','Usuário','Data Hora'
];

// ── Plano de Contas ────────────────────────────────────────────
const PLANO_CONTAS = {
  receitas: [
    'Sistema solar on-grid','Sistema híbrido','Retrofit','Baterias e backup',
    'Carregadores veiculares','Projeto e consultoria','Instalação',
    'Engenharia e homologação','Manutenção','Comissão de parceiros','Outras receitas'
  ],
  custosDiretos: [
    'Módulos','Inversores','Baterias','Estruturas','Cabos e conectores',
    'Proteções e quadros','Carregadores','Frete','Mão de obra',
    'Engenharia, ART e homologação','Visita técnica','Deslocamento do projeto',
    'Locação de equipamentos','Comissão comercial','Terceirizados','Retrabalho e garantia'
  ],
  despesasOperacionais: [
    'Marketing','Softwares','Contabilidade','Jurídico','Tarifas bancárias',
    'Taxas de cartão','Juros','Impostos','Pró-labore','Salários e encargos',
    'Escritório','Telefonia e internet','Veículos','Seguros','Treinamentos',
    'EPIs e uniformes','Materiais de escritório','Outras despesas'
  ]
};

// ── Cache de instância (válido por execução) ──────────────────
let _ssFin = null;

// ─────────────────────────────────────────────────────────────
// UTILITÁRIOS
// ─────────────────────────────────────────────────────────────

function addCors(output) {
  return output
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET,POST')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function getSSCached() {
  if (!_ssFin) _ssFin = SpreadsheetApp.openById(SHEET_ID_FIN);
  return _ssFin;
}

function withLock(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function parseBRNumber(v) {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return v;
  const s = String(v).trim().replace(/[R$\s]/g, '');
  // Formato brasileiro: 1.250,50
  if (s.indexOf(',') > -1 && s.indexOf('.') > -1) {
    return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
  }
  // Só vírgula: 1250,50
  if (s.indexOf(',') > -1) {
    return parseFloat(s.replace(',', '.')) || 0;
  }
  return parseFloat(s) || 0;
}

function brTimestamp() {
  return Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss');
}

function fmtIsoDate(v) {
  if (!v) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

function nomeMes(m) {
  if (!m) return '—';
  const [y, mo] = m.split('-');
  const ns = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return (ns[+mo - 1] || mo) + '/' + y;
}

function validateToken(e) {
  return (e && e.parameter && e.parameter.token) === API_TOKEN;
}

function validateTokenPost(body) {
  return body && body.token === API_TOKEN;
}

function normalizeDoc(str) {
  return String(str || '').replace(/\D/g, '');
}

function registrarHistorico(ss, entidade, entidadeId, campo, valorAnterior, valorNovo, usuario) {
  try {
    const sheet = garantirAba(ss, 'Historico', HDR_HISTORICO);
    sheet.appendRow([
      Utilities.getUuid(), entidade, String(entidadeId || ''), campo,
      String(valorAnterior || ''), String(valorNovo || ''), usuario || '', brTimestamp()
    ]);
  } catch(e) {
    Logger.log('registrarHistorico erro: ' + e.message);
  }
}

// ─────────────────────────────────────────────────────────────
// GESTÃO DE ABAS
// ─────────────────────────────────────────────────────────────

function garantirAba(ss, nome, headers) {
  let sheet = ss.getSheetByName(nome);
  if (!sheet) {
    sheet = ss.insertSheet(nome);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#E8641A').setFontColor('#FFFFFF').setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function garantirNovasAbas(ss) {
  if (!ss) ss = getSSCached();
  garantirAba(ss, 'Lancamentos', HDR_LANCAMENTOS);
  garantirAba(ss, 'Baixas', HDR_BAIXAS);
  garantirAba(ss, 'Historico', HDR_HISTORICO);
  return ss;
}

// ─────────────────────────────────────────────────────────────
// ROTEAMENTO GET
// ─────────────────────────────────────────────────────────────

function doGet(e) {
  const action   = (e && e.parameter && e.parameter.action)   || 'get_data';
  const callback = (e && e.parameter && e.parameter.callback) || '';

  const protegidas = [
    'get_lancamentos','buscar_contratos','get_pendentes_vinculo',
    'get_fluxo_caixa','get_dre_competencia','get_resultado_projetos',
    'sincronizar_contratos'
  ];

  let result;
  try {
    if (protegidas.includes(action) && !validateToken(e)) {
      result = { error: 'Acesso não autorizado' };
    } else if (action === 'get_data')                result = getData();
    else if (action === 'get_contratos')             result = getContratos();
    else if (action === 'get_catalogos')             result = getCatalogos();
    else if (action === 'get_lancamentos')           result = getLancamentos(e.parameter);
    else if (action === 'buscar_contratos')          result = buscarContratos(e.parameter);
    else if (action === 'get_pendentes_vinculo')     result = getPendentesVinculo();
    else if (action === 'get_fluxo_caixa')           result = getFluxoCaixaNew(e.parameter);
    else if (action === 'get_dre_competencia')       result = getDRECompetencia(e.parameter);
    else if (action === 'get_resultado_projetos')    result = getResultadoProjetos();
    else if (action === 'sincronizar_contratos')     result = sincronizarContratos();
    else result = { error: 'Ação desconhecida: ' + action };
  } catch(err) {
    result = { error: err.message };
  }

  const json = JSON.stringify(result);
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return addCors(ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON));
}

// ─────────────────────────────────────────────────────────────
// ROTEAMENTO POST
// ─────────────────────────────────────────────────────────────

function doPost(e) {
  let result;
  try {
    const body   = JSON.parse(e.postData.contents);
    const action = body.action;

    const protegidas = [
      'create_lancamento','update_lancamento','liquidar_lancamento',
      'estornar_baixa','vincular_projeto','desfazer_vinculo'
    ];

    if (protegidas.includes(action) && !validateTokenPost(body)) {
      result = { error: 'Acesso não autorizado' };
    } else if (action === 'save_despesa')      result = saveDespesa(body);
    else if (action === 'save_receita')        result = saveReceita(body);
    else if (action === 'vincular')            result = vincularDespesa(body);
    else if (action === 'replace_despesas' ||
             action === 'replace_receitas' ||
             action === 'replace_previsoes')   result = { error: 'Endpoint desativado. Use create_lancamento.' };
    else if (action === 'create_lancamento')   result = createLancamento(body);
    else if (action === 'update_lancamento')   result = updateLancamento(body);
    else if (action === 'liquidar_lancamento') result = liquidarLancamento(body);
    else if (action === 'estornar_baixa')      result = estornarBaixa(body);
    else if (action === 'vincular_projeto')    result = vincularProjeto(body);
    else if (action === 'desfazer_vinculo')    result = desfazerVinculo(body);
    else result = { error: 'Ação desconhecida: ' + action };
  } catch(err) {
    result = { error: err.message };
  }
  return addCors(ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON));
}

// ─────────────────────────────────────────────────────────────
// ENDPOINTS LEGADOS (mantidos para retrocompatibilidade)
// ─────────────────────────────────────────────────────────────

// CORRIGIDO: lê AMBAS as abas Assinado e Gerado, prioriza Assinado
function getContratos() {
  return { contratos: getContratosBothTabs() };
}

function getData() {
  return {
    receitas:  getReceitas(),
    despesas:  getDespesas(),
    previsoes: getPrevisoes(),
  };
}

function getReceitas() {
  const ss    = getSSCached();
  const sheet = ss.getSheetByName('Receitas');
  if (!sheet || sheet.getLastRow() < 2) return [];
  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  return data.slice(1).filter(r => r[0]).map(row => {
    const o = {};
    headers.forEach((h, i) => o[h] = row[i]);
    return {
      id:          String(o['ID'] || ''),
      data:        fmtIsoDate(o['Data'] || ''),
      cliente:     o['Cliente'] || '',
      doc:         o['CPF/CNPJ'] || '',
      ender:       o['Endereço'] || '',
      tipo:        o['Tipo'] || '',
      kvp:         o['kVp'] || '',
      modulos:     o['Módulos'] || '',
      inversor:    o['Inversor'] || '',
      bateria:     o['Bateria'] || '',
      valor:       parseFloat(o['Valor Total (R$)']) || 0,
      recebido:    parseFloat(o['Valor Recebido (R$)']) || 0,
      pagamento:   o['Forma Pagamento'] || '',
      condicoes:   o['Condições'] || '',
      consultor:   o['Consultor'] || '',
      status:      o['Status'] || '',
      obs:         o['Observações'] || '',
      numContrato: String(o['Nº Contrato'] || ''),
    };
  });
}

// CORRIGIDO: atualizarResumos() chamado DEPOIS do appendRow
function saveReceita(body) {
  const ss    = getSSCached();
  const sheet = garantirAba(ss, 'Receitas', HDR_RECEITAS);
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(body.id || '')) return { ok: true, skipped: true };
  }
  sheet.appendRow([
    body.id || Utilities.getUuid(), body.data || '', body.cliente || '',
    body.doc || '', body.ender || '', body.tipo || '', body.kvp || '',
    body.modulos || '', body.inversor || '', body.bateria || '',
    parseBRNumber(body.valor), parseBRNumber(body.recebido),
    body.pagamento || '', body.condicoes || '', body.consultor || '',
    body.status || '', body.obs || '', body.numContrato || '', brTimestamp(),
  ]);
  atualizarResumos(); // CORRIGIDO: depois do appendRow
  return { ok: true, created: true };
}

function getDespesas() {
  const ss    = getSSCached();
  const sheet = ss.getSheetByName('Despesas');
  if (!sheet || sheet.getLastRow() < 2) return [];
  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  return data.slice(1).filter(r => r[0]).map(row => {
    const o = {};
    headers.forEach((h, i) => o[h] = row[i]);
    return {
      id:          String(o['ID'] || ''),
      data:        fmtIsoDate(o['Data'] || ''),
      desc:        o['Descrição'] || '',
      cat:         o['Categoria'] || '',
      valor:       parseFloat(o['Valor (R$)']) || 0,
      metodo:      o['Método'] || '',
      obs:         o['Observação'] || '',
      lancadoPor:  o['Lançado por'] || '',
      numContrato: String(o['Nº Contrato'] || ''),
      projetoId:   String(o['Projeto ID'] || ''),
      refContrato: String(o['Ref Contrato'] || ''),
    };
  }).reverse();
}

// CORRIGIDO: escreve 12 colunas (incluía Ref Contrato) + atualizarResumos depois
function saveDespesa(body) {
  const ss    = getSSCached();
  const sheet = garantirAba(ss, 'Despesas', HDR_DESPESAS);
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(body.id || '')) return { ok: true, skipped: true };
  }
  sheet.appendRow([
    body.id || Utilities.getUuid(), body.data || '', body.desc || '',
    body.cat || '', parseBRNumber(body.valor), body.metodo || '',
    body.obs || '', body.lancadoPor || '', body.numContrato || '',
    body.projetoId || '', body.refContrato || '', brTimestamp(), // CORRIGIDO: 12 colunas
  ]);
  atualizarResumos(); // CORRIGIDO: depois do appendRow
  return { ok: true, created: true };
}

function vincularDespesa(body) {
  const ss    = getSSCached();
  const sheet = ss.getSheetByName('Despesas');
  if (!sheet) return { error: 'Aba Despesas não encontrada' };
  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol   = headers.indexOf('ID');
  const ncCol   = headers.indexOf('Nº Contrato') + 1;
  const pidCol  = headers.indexOf('Projeto ID') + 1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(body.id || '')) {
      if (ncCol  > 0) sheet.getRange(i + 1, ncCol ).setValue(body.numContrato || '');
      if (pidCol > 0) sheet.getRange(i + 1, pidCol).setValue(body.projetoId   || '');
      return { ok: true };
    }
  }
  return { error: 'Despesa não encontrada: ' + body.id };
}

function getPrevisoes() {
  const ss    = getSSCached();
  const sheet = ss.getSheetByName('Previsoes');
  if (!sheet || sheet.getLastRow() < 2) return [];
  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  return data.slice(1).filter(r => r[0]).map(row => {
    const o = {};
    headers.forEach((h, i) => o[h] = row[i]);
    return {
      id:      String(o['ID'] || ''),
      data:    fmtIsoDate(o['Data'] || ''),
      tipo:    o['Tipo'] || '',
      cliente: o['Cliente'] || '',
      desc:    o['Descrição'] || '',
      cat:     o['Categoria'] || '',
      valor:   parseFloat(o['Valor (R$)']) || 0,
      obs:     o['Observação'] || '',
      status:  o['Status'] || 'previsto',
    };
  });
}

// ─────────────────────────────────────────────────────────────
// CATÁLOGOS E CONTRATOS
// ─────────────────────────────────────────────────────────────

function getCatalogos() {
  return {
    planoDeConta:      PLANO_CONTAS,
    situacoes:         ['Previsto','Em aberto','Parcial','Liquidado','Cancelado'],
    statusVinculo:     ['Vinculado','Pendente','Geral'],
    tipos:             ['Receita','Despesa'],
    metodos:           ['PIX','Cartão de Crédito','Boleto','Transferência','Dinheiro','Cheque'],
    contas:            ['Conta Principal','Caixa','Conta Parceiros'],
    gruposDRE:         ['Receita Bruta','Custo Direto','Despesa Operacional'],
  };
}

// NOVO: lê AMBAS as abas, mapeia por cabeçalho, deduplica priorizando Assinado
function getContratosBothTabs() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID_CONTRATOS);
    const resultado = {};

    ['Gerado', 'Assinado'].forEach(tabName => {
      const sheet = ss.getSheetByName(tabName);
      if (!sheet || sheet.getLastRow() < 2) return;
      const data = sheet.getDataRange().getValues();
      const hdrs = data[0];
      const col  = {};
      hdrs.forEach((h, i) => col[String(h).trim()] = i);

      const get = (row, ...keys) => {
        for (const k of keys) {
          if (col[k] !== undefined) return row[col[k]];
        }
        return '';
      };

      data.slice(1).forEach(row => {
        const id = String(get(row, 'ID') || '');
        const cliente = String(get(row, 'Cliente') || '');
        if (!id || !cliente) return;

        const dataEmissaoRaw = get(row, 'Data Emissão', 'Data Emissao');
        const contrato = {
          id,
          numContrato:    String(get(row, 'Nº Contrato', 'N Contrato') || ''),
          dataEmissao:    dataEmissaoRaw instanceof Date
                            ? dataEmissaoRaw.toLocaleDateString('pt-BR')
                            : String(dataEmissaoRaw || ''),
          cliente,
          cpfCnpj:        String(get(row, 'CPF/CNPJ') || ''),
          telefone:       String(get(row, 'Telefone') || ''),
          email:          String(get(row, 'E-mail') || ''),
          tipoSistema:    String(get(row, 'Tipo Sistema') || ''),
          kvp:            get(row, 'kVp') || '',
          valorTotal:     parseBRNumber(get(row, 'Valor Total (R$)')),
          formaPagamento: String(get(row, 'Forma Pagamento') || ''),
          consultor:      String(get(row, 'Consultor') || ''),
          status:         tabName === 'Assinado' ? 'Assinado'
                            : String(get(row, 'Status') || tabName),
        };

        // Assinado tem prioridade sobre Gerado
        if (!resultado[id] || tabName === 'Assinado') {
          resultado[id] = contrato;
        }
      });
    });

    return Object.values(resultado).filter(c => c.cliente);
  } catch(err) {
    Logger.log('getContratosBothTabs erro: ' + err.message);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────
// CRUD — LANÇAMENTOS
// ─────────────────────────────────────────────────────────────

function getLancamentos(params) {
  const ss    = getSSCached();
  const sheet = ss.getSheetByName('Lancamentos');
  if (!sheet || sheet.getLastRow() < 2) return { lancamentos: [] };

  const data = sheet.getDataRange().getValues();
  const hdrs = data[0];
  const idx  = {};
  hdrs.forEach((h, i) => idx[h] = i);

  let lancamentos = data.slice(1)
    .filter(r => r[idx['ID Lançamento']] && r[idx['Ativo']] !== false && r[idx['Ativo']] !== 'false')
    .map(row => ({
      id:               String(row[idx['ID Lançamento']] || ''),
      tipo:             row[idx['Tipo']] || '',
      situacao:         row[idx['Situação']] || '',
      descricao:        row[idx['Descrição']] || '',
      clienteFornecedor:row[idx['Cliente/Fornecedor']] || '',
      categoria:        row[idx['Categoria']] || '',
      grupoDRE:         row[idx['Grupo DRE']] || '',
      centroCusto:      row[idx['Centro de Custo']] || '',
      idProjeto:        String(row[idx['ID Projeto']] || ''),
      numContrato:      String(row[idx['Nº Contrato']] || ''),
      statusVinculo:    row[idx['Status Vínculo']] || '',
      dataEmissao:      fmtIsoDate(row[idx['Data Emissão']] || ''),
      dataCompetencia:  fmtIsoDate(row[idx['Data Competência']] || ''),
      dataVencimento:   fmtIsoDate(row[idx['Data Vencimento']] || ''),
      dataPrevistaCaixa:fmtIsoDate(row[idx['Data Prevista Caixa']] || ''),
      valorPrevisto:    parseFloat(row[idx['Valor Previsto (R$)']]) || 0,
      parcela:          row[idx['Parcela']] || '',
      qtdParcelas:      row[idx['Qtd Parcelas']] || '',
      formaPrevista:    row[idx['Forma Prevista']] || '',
      contaPrevista:    row[idx['Conta Prevista']] || '',
      documento:        row[idx['Documento']] || '',
      origem:           row[idx['Origem']] || '',
      observacoes:      row[idx['Observações']] || '',
      criadoPor:        row[idx['Criado por']] || '',
      criadoEm:         row[idx['Criado em']] || '',
      atualizadoEm:     row[idx['Atualizado em']] || '',
      versao:           row[idx['Versão']] || 1,
      ativo:            true,
    }));

  // Filtros opcionais
  if (params) {
    if (params.tipo)         lancamentos = lancamentos.filter(l => l.tipo         === params.tipo);
    if (params.situacao)     lancamentos = lancamentos.filter(l => l.situacao     === params.situacao);
    if (params.statusVinculo)lancamentos = lancamentos.filter(l => l.statusVinculo === params.statusVinculo);
    if (params.dateFrom)     lancamentos = lancamentos.filter(l => l.dataCompetencia >= params.dateFrom);
    if (params.dateTo)       lancamentos = lancamentos.filter(l => l.dataCompetencia <= params.dateTo);
  }

  return { lancamentos };
}

function createLancamento(body) {
  return withLock(() => {
    const ss    = getSSCached();
    garantirNovasAbas(ss);
    const sheet = ss.getSheetByName('Lancamentos');
    const id    = body.id || Utilities.getUuid();
    const agora = brTimestamp();

    // Verifica duplicata
    if (body.id && sheet.getLastRow() > 1) {
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(body.id)) return { ok: true, skipped: true };
      }
    }

    const statusVinculo = body.statusVinculo ||
      (body.numContrato || body.idProjeto ? 'Vinculado' : 'Pendente');

    sheet.appendRow([
      id,
      body.tipo             || '',
      body.situacao         || 'Em aberto',
      body.descricao        || '',
      body.clienteFornecedor|| '',
      body.categoria        || '',
      body.grupoDRE         || '',
      body.centroCusto      || '',
      body.idProjeto        || '',
      body.numContrato      || '',
      statusVinculo,
      body.dataEmissao      || '',
      body.dataCompetencia  || '',
      body.dataVencimento   || '',
      body.dataPrevistaCaixa|| '',
      parseBRNumber(body.valorPrevisto),
      body.parcela          || '',
      body.qtdParcelas      || '',
      body.formaPrevista    || '',
      body.contaPrevista    || '',
      body.documento        || '',
      body.origem           || 'dashboard',
      body.observacoes      || '',
      body.criadoPor        || '',
      agora,
      agora,
      1,
      true,
    ]);

    // Se "já pago", cria a Baixa na mesma operação
    if (body.jaPago && parseBRNumber(body.valorPago) > 0) {
      _criarBaixaInternal(ss, {
        idLancamento:  id,
        dataCaixa:     body.dataPagamento || body.dataEmissao || '',
        valorPrincipal:parseBRNumber(body.valorPago),
        metodo:        body.metodo        || '',
        criadoPor:     body.criadoPor     || '',
      });
      _recalcularSituacao(ss, id);
    }

    return { ok: true, created: true, id };
  });
}

function updateLancamento(body) {
  return withLock(() => {
    const ss    = getSSCached();
    const sheet = ss.getSheetByName('Lancamentos');
    if (!sheet) return { error: 'Aba Lancamentos não encontrada' };

    const data = sheet.getDataRange().getValues();
    const hdrs = data[0];
    const idIdx = hdrs.indexOf('ID Lançamento');

    const mapa = {
      'Tipo':               body.tipo,
      'Situação':           body.situacao,
      'Descrição':          body.descricao,
      'Cliente/Fornecedor': body.clienteFornecedor,
      'Categoria':          body.categoria,
      'Grupo DRE':          body.grupoDRE,
      'Centro de Custo':    body.centroCusto,
      'ID Projeto':         body.idProjeto,
      'Nº Contrato':        body.numContrato,
      'Status Vínculo':     body.statusVinculo,
      'Data Emissão':       body.dataEmissao,
      'Data Competência':   body.dataCompetencia,
      'Data Vencimento':    body.dataVencimento,
      'Data Prevista Caixa':body.dataPrevistaCaixa,
      'Valor Previsto (R$)':body.valorPrevisto !== undefined ? parseBRNumber(body.valorPrevisto) : undefined,
      'Parcela':            body.parcela,
      'Qtd Parcelas':       body.qtdParcelas,
      'Forma Prevista':     body.formaPrevista,
      'Conta Prevista':     body.contaPrevista,
      'Observações':        body.observacoes,
    };

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idIdx]) !== String(body.id || '')) continue;

      Object.entries(mapa).forEach(([campo, valor]) => {
        if (valor === undefined) return;
        const colIdx = hdrs.indexOf(campo);
        if (colIdx < 0) return;
        const anterior = data[i][colIdx];
        sheet.getRange(i + 1, colIdx + 1).setValue(valor);
        if (String(anterior) !== String(valor)) {
          registrarHistorico(ss, 'Lancamento', body.id, campo, anterior, valor, body.usuario || '');
        }
      });

      const versaoIdx    = hdrs.indexOf('Versão');
      const atualizadoIdx= hdrs.indexOf('Atualizado em');
      if (versaoIdx    >= 0) sheet.getRange(i+1, versaoIdx+1    ).setValue((data[i][versaoIdx] || 1) + 1);
      if (atualizadoIdx >= 0) sheet.getRange(i+1, atualizadoIdx+1).setValue(brTimestamp());

      return { ok: true };
    }
    return { error: 'Lançamento não encontrado: ' + body.id };
  });
}

function softDeleteLancamento(body) {
  return withLock(() => {
    const ss    = getSSCached();
    const sheet = ss.getSheetByName('Lancamentos');
    if (!sheet) return { error: 'Aba Lancamentos não encontrada' };

    const data  = sheet.getDataRange().getValues();
    const hdrs  = data[0];
    const idIdx = hdrs.indexOf('ID Lançamento');
    const ativIdx= hdrs.indexOf('Ativo');
    const atIdx = hdrs.indexOf('Atualizado em');

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idIdx]) !== String(body.id || '')) continue;
      if (ativIdx >= 0) sheet.getRange(i+1, ativIdx+1).setValue(false);
      if (atIdx   >= 0) sheet.getRange(i+1, atIdx+1  ).setValue(brTimestamp());
      registrarHistorico(ss, 'Lancamento', body.id, 'Ativo', true, false, body.usuario || '');
      return { ok: true };
    }
    return { error: 'Lançamento não encontrado: ' + body.id };
  });
}

// ─────────────────────────────────────────────────────────────
// CRUD — BAIXAS
// ─────────────────────────────────────────────────────────────

function liquidarLancamento(body) {
  return withLock(() => {
    const ss = getSSCached();
    garantirNovasAbas(ss);
    const idBaixa = _criarBaixaInternal(ss, {
      idLancamento:  body.idLancamento  || '',
      dataCaixa:     body.dataCaixa     || '',
      valorPrincipal:parseBRNumber(body.valorPrincipal),
      jurosMulta:    parseBRNumber(body.jurosMulta),
      desconto:      parseBRNumber(body.desconto),
      tarifa:        parseBRNumber(body.tarifa),
      contaFinanceira:body.contaFinanceira || '',
      metodo:        body.metodo        || '',
      comprovante:   body.comprovante   || '',
      conciliado:    body.conciliado    || false,
      observacao:    body.observacao    || '',
      criadoPor:     body.criadoPor     || '',
    });
    _recalcularSituacao(ss, body.idLancamento);
    return { ok: true, idBaixa };
  });
}

function _criarBaixaInternal(ss, b) {
  const sheet      = garantirAba(ss, 'Baixas', HDR_BAIXAS);
  const id         = Utilities.getUuid();
  const valorLiq   = (parseBRNumber(b.valorPrincipal) + parseBRNumber(b.jurosMulta))
                   - parseBRNumber(b.desconto) - parseBRNumber(b.tarifa);
  sheet.appendRow([
    id, b.idLancamento || '', b.dataCaixa || '',
    parseBRNumber(b.valorPrincipal), parseBRNumber(b.jurosMulta),
    parseBRNumber(b.desconto), parseBRNumber(b.tarifa), valorLiq,
    b.contaFinanceira || '', b.metodo || '', b.comprovante || '',
    b.conciliado || false, b.observacao || '', b.criadoPor || '', brTimestamp(),
  ]);
  return id;
}

function _recalcularSituacao(ss, idLancamento) {
  const baixaSheet = ss.getSheetByName('Baixas');
  if (!baixaSheet || baixaSheet.getLastRow() < 2) return;

  const baixaData = baixaSheet.getDataRange().getValues();
  const bHdrs     = baixaData[0];
  const bIdLanc   = bHdrs.indexOf('ID Lançamento');
  const bValPrinc = bHdrs.indexOf('Valor Principal (R$)');
  const bConc     = bHdrs.indexOf('Conciliado');

  const totalBaixas = baixaData.slice(1)
    .filter(r => r[0] && String(r[bIdLanc]) === String(idLancamento) && r[bConc] !== 'ESTORNADO')
    .reduce((s, r) => s + (parseFloat(r[bValPrinc]) || 0), 0);

  const lancSheet = ss.getSheetByName('Lancamentos');
  if (!lancSheet) return;

  const lancData  = lancSheet.getDataRange().getValues();
  const lHdrs     = lancData[0];
  const lIdCol    = lHdrs.indexOf('ID Lançamento');
  const lValCol   = lHdrs.indexOf('Valor Previsto (R$)');
  const lSitCol   = lHdrs.indexOf('Situação');
  const lAtCol    = lHdrs.indexOf('Atualizado em');

  for (let i = 1; i < lancData.length; i++) {
    if (String(lancData[i][lIdCol]) !== String(idLancamento)) continue;
    const valorPrev = parseFloat(lancData[i][lValCol]) || 0;
    const sit = totalBaixas <= 0 ? 'Em aberto'
              : totalBaixas >= valorPrev ? 'Liquidado' : 'Parcial';
    if (lSitCol >= 0) lancSheet.getRange(i+1, lSitCol+1).setValue(sit);
    if (lAtCol  >= 0) lancSheet.getRange(i+1, lAtCol+1 ).setValue(brTimestamp());
    break;
  }
}

function getBaixas(idLancamento) {
  const ss    = getSSCached();
  const sheet = ss.getSheetByName('Baixas');
  if (!sheet || sheet.getLastRow() < 2) return { baixas: [] };

  const data  = sheet.getDataRange().getValues();
  const hdrs  = data[0];
  const idx   = {};
  hdrs.forEach((h, i) => idx[h] = i);

  const baixas = data.slice(1)
    .filter(r => r[idx['ID Baixa']] && String(r[idx['ID Lançamento']]) === String(idLancamento))
    .map(row => ({
      id:             String(row[idx['ID Baixa']] || ''),
      idLancamento:   String(row[idx['ID Lançamento']] || ''),
      dataCaixa:      fmtIsoDate(row[idx['Data Caixa']] || ''),
      valorPrincipal: parseFloat(row[idx['Valor Principal (R$)']]) || 0,
      jurosMulta:     parseFloat(row[idx['Juros/Multa (R$)']]) || 0,
      desconto:       parseFloat(row[idx['Desconto (R$)']]) || 0,
      tarifa:         parseFloat(row[idx['Tarifa (R$)']]) || 0,
      valorLiquido:   parseFloat(row[idx['Valor Líquido (R$)']]) || 0,
      contaFinanceira:row[idx['Conta Financeira']] || '',
      metodo:         row[idx['Método']] || '',
      comprovante:    row[idx['Comprovante']] || '',
      conciliado:     row[idx['Conciliado']] || false,
      observacao:     row[idx['Observação']] || '',
      criadoPor:      row[idx['Criado por']] || '',
      criadoEm:       row[idx['Criado em']] || '',
    }));

  return { baixas };
}

function estornarBaixa(body) {
  return withLock(() => {
    const ss    = getSSCached();
    const sheet = ss.getSheetByName('Baixas');
    if (!sheet) return { error: 'Aba Baixas não encontrada' };

    const data  = sheet.getDataRange().getValues();
    const hdrs  = data[0];
    const idIdx = hdrs.indexOf('ID Baixa');
    const concIdx = hdrs.indexOf('Conciliado');
    const obsIdx  = hdrs.indexOf('Observação');
    const ilIdx   = hdrs.indexOf('ID Lançamento');

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idIdx]) !== String(body.id || '')) continue;
      const idLanc = String(data[i][ilIdx]);
      const obsAtual = String(data[i][obsIdx] || '');
      if (concIdx >= 0) {
        const anterior = data[i][concIdx];
        sheet.getRange(i+1, concIdx+1).setValue('ESTORNADO');
        registrarHistorico(ss, 'Baixa', body.id, 'Conciliado', anterior, 'ESTORNADO', body.usuario || '');
      }
      if (obsIdx >= 0) {
        sheet.getRange(i+1, obsIdx+1).setValue(obsAtual + ' [ESTORNADO em ' + brTimestamp() + ']');
      }
      _recalcularSituacao(ss, idLanc);
      return { ok: true };
    }
    return { error: 'Baixa não encontrada: ' + body.id };
  });
}

// ─────────────────────────────────────────────────────────────
// SINCRONIZAÇÃO E BUSCA DE CONTRATOS
// ─────────────────────────────────────────────────────────────

function sincronizarContratos() {
  const contratos  = getContratosBothTabs();
  const ss         = getSSCached();
  garantirNovasAbas(ss);

  const existentes = getLancamentos({}).lancamentos;
  const importados = new Set(existentes.map(l => l.numContrato).filter(Boolean));

  const resultado  = { importados: 0, ja_existentes: 0, alertas: [] };

  contratos.forEach(c => {
    if (!c.numContrato) return;
    if (importados.has(c.numContrato)) { resultado.ja_existentes++; return; }

    const parcelas = _parseParcelas(c);
    const baseObs  = c.consultor ? 'Consultor: ' + c.consultor : '';

    if (parcelas) {
      parcelas.forEach(p => {
        createLancamento({
          tipo:             'Receita',
          situacao:         'Em aberto',
          descricao:        c.tipoSistema + (parcelas.length > 1 ? ' (Parcela ' + p.parcela + '/' + p.qtdParcelas + ')' : ''),
          clienteFornecedor:c.cliente,
          categoria:        _categoriaDeTipo(c.tipoSistema),
          grupoDRE:         'Receita Bruta',
          idProjeto:        c.id,
          numContrato:      c.numContrato,
          statusVinculo:    'Vinculado',
          dataEmissao:      c.dataEmissao,
          dataCompetencia:  c.dataEmissao,
          valorPrevisto:    p.valorParcela,
          parcela:          p.parcela,
          qtdParcelas:      p.qtdParcelas,
          formaPrevista:    c.formaPagamento,
          origem:           'sincronizacao',
          observacoes:      baseObs,
          criadoPor:        'sistema',
        });
      });
    } else {
      const alertObs = 'Condição financeira pendente — verificar parcelas manualmente. ' + baseObs;
      createLancamento({
        tipo:             'Receita',
        situacao:         'Previsto',
        descricao:        c.tipoSistema,
        clienteFornecedor:c.cliente,
        categoria:        _categoriaDeTipo(c.tipoSistema),
        grupoDRE:         'Receita Bruta',
        idProjeto:        c.id,
        numContrato:      c.numContrato,
        statusVinculo:    'Vinculado',
        dataEmissao:      c.dataEmissao,
        dataCompetencia:  c.dataEmissao,
        valorPrevisto:    c.valorTotal,
        formaPrevista:    c.formaPagamento,
        origem:           'sincronizacao',
        observacoes:      alertObs,
        criadoPor:        'sistema',
      });
      resultado.alertas.push({ numContrato: c.numContrato, cliente: c.cliente, motivo: 'Condição em texto livre' });
    }

    importados.add(c.numContrato);
    resultado.importados++;
  });

  return resultado;
}

function buscarContratos(params) {
  const q = String((params && params.q) || '').toLowerCase().trim();
  if (q.length < 3) return { contratos: [], aviso: 'Digite ao menos 3 caracteres' };

  const contratos = getContratosBothTabs();
  const qDoc      = normalizeDoc(q);

  const results = contratos
    .filter(c => {
      const docNorm = normalizeDoc(c.cpfCnpj || '');
      return (
        String(c.numContrato   || '').toLowerCase().includes(q) ||
        String(c.cliente       || '').toLowerCase().includes(q) ||
        (qDoc.length >= 5 && docNorm.includes(qDoc))           ||
        String(c.email         || '').toLowerCase().includes(q) ||
        String(c.tipoSistema   || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (a.status === 'Assinado' && b.status !== 'Assinado') return -1;
      if (b.status === 'Assinado' && a.status !== 'Assinado') return 1;
      return String(b.dataEmissao || '').localeCompare(String(a.dataEmissao || ''));
    })
    .slice(0, 10);

  return { contratos: results };
}

function _parseParcelas(contrato) {
  const fp = String(contrato.formaPagamento || '').toLowerCase().trim();
  if (!fp) return null;
  const match = fp.match(/(\d+)\s*[x×]/) || fp.match(/(\d+)\s*parcela/i) || fp.match(/(\d+)\s*vez/i);
  if (!match) return null;
  const n = parseInt(match[1]);
  if (n <= 0 || n > 120) return null;
  const valorUnit = contrato.valorTotal / n;
  return Array.from({length: n}, (_, i) => ({ parcela: i+1, qtdParcelas: n, valorParcela: valorUnit }));
}

function _categoriaDeTipo(tipoSistema) {
  const t = String(tipoSistema || '').toLowerCase();
  if (t.includes('hibrid') || t.includes('bateria')) return 'Sistema híbrido';
  if (t.includes('retrofit'))                         return 'Retrofit';
  if (t.includes('carregador'))                       return 'Carregadores veiculares';
  return 'Sistema solar on-grid';
}

// ─────────────────────────────────────────────────────────────
// VÍNCULO E SUGESTÃO AUTOMÁTICA
// ─────────────────────────────────────────────────────────────

function vincularProjeto(body) {
  return withLock(() => {
    const ss    = getSSCached();
    const sheet = ss.getSheetByName('Lancamentos');
    if (!sheet) return { error: 'Aba Lancamentos não encontrada' };

    const data  = sheet.getDataRange().getValues();
    const hdrs  = data[0];
    const idIdx = hdrs.indexOf('ID Lançamento');

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idIdx]) !== String(body.id || '')) continue;
      _setCell(sheet, i+1, hdrs, 'Nº Contrato',   body.numContrato || '');
      _setCell(sheet, i+1, hdrs, 'Status Vínculo', 'Vinculado');
      _setCell(sheet, i+1, hdrs, 'ID Projeto',     body.idProjeto   || '');
      _setCell(sheet, i+1, hdrs, 'Atualizado em',  brTimestamp());
      registrarHistorico(ss, 'Lancamento', body.id, 'Status Vínculo', 'Pendente', 'Vinculado', body.usuario || '');
      return { ok: true };
    }
    return { error: 'Lançamento não encontrado: ' + body.id };
  });
}

function desfazerVinculo(body) {
  return withLock(() => {
    const ss    = getSSCached();
    const sheet = ss.getSheetByName('Lancamentos');
    if (!sheet) return { error: 'Aba Lancamentos não encontrada' };

    const data  = sheet.getDataRange().getValues();
    const hdrs  = data[0];
    const idIdx = hdrs.indexOf('ID Lançamento');

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idIdx]) !== String(body.id || '')) continue;
      const anterior = data[i][hdrs.indexOf('Status Vínculo')];
      _setCell(sheet, i+1, hdrs, 'Status Vínculo', 'Pendente');
      _setCell(sheet, i+1, hdrs, 'Atualizado em',  brTimestamp());
      registrarHistorico(ss, 'Lancamento', body.id, 'Status Vínculo', anterior, 'Pendente', body.usuario || '');
      return { ok: true };
    }
    return { error: 'Lançamento não encontrado: ' + body.id };
  });
}

function getPendentesVinculo() {
  const all      = getLancamentos({ statusVinculo: 'Pendente' }).lancamentos;
  const contratos = getContratosBothTabs();
  const pendentes = all.map(l => ({ ...l, sugestoes: sugerirContrato_(l, contratos) }));
  return { pendentes, total: pendentes.length };
}

// Pontuação determinística para sugerir contratos
function sugerirContrato_(lancamento, contratos) {
  if (!contratos) contratos = getContratosBothTabs();

  return contratos
    .map(c => {
      let score = 0;
      const regras = [];

      // +100 — número do contrato
      if (c.numContrato && lancamento.numContrato &&
          String(c.numContrato) === String(lancamento.numContrato)) {
        score += 100; regras.push('Nº contrato idêntico (+100)');
      } else if (c.numContrato && lancamento.descricao &&
                 String(lancamento.descricao).includes(String(c.numContrato))) {
        score += 100; regras.push('Nº contrato na descrição (+100)');
      }

      // +50 — CPF/CNPJ
      const lancDoc = normalizeDoc(lancamento.clienteFornecedor || lancamento.descricao || '');
      const cDoc    = normalizeDoc(c.cpfCnpj || '');
      if (lancDoc.length >= 5 && cDoc && lancDoc.includes(cDoc)) {
        score += 50; regras.push('CPF/CNPJ igual (+50)');
      }

      // +40 — cliente
      if (c.cliente && lancamento.clienteFornecedor) {
        const cn = c.cliente.toLowerCase().trim();
        const ln = lancamento.clienteFornecedor.toLowerCase().trim();
        if (cn === ln) { score += 40; regras.push('Cliente idêntico (+40)'); }
        else if (ln.length > 3 && (cn.includes(ln) || ln.includes(cn))) {
          score += 20; regras.push('Nome parcialmente igual (+20)');
        }
      }

      // +30 — valor compatível
      if (lancamento.valorPrevisto && c.valorTotal) {
        const diff = Math.abs(lancamento.valorPrevisto - c.valorTotal);
        if (diff / Math.max(c.valorTotal, 1) < 0.05) {
          score += 30; regras.push('Valor compatível (+30)');
        }
      }

      return { contrato: c, score, regras };
    })
    .filter(r => r.score >= 60)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

function autoVincular() {
  const pendentes = getPendentesVinculo().pendentes;
  const resultado = { vinculados: 0, sugestoes: 0, mantidos: 0 };

  pendentes.forEach(l => {
    const sugs = l.sugestoes || [];
    if (!sugs.length) { resultado.mantidos++; return; }

    const top = sugs[0];
    const segundo = sugs[1];

    // Não vincular se dois contratos com pontuação semelhante (diferença < 20)
    const hasTie = segundo && (top.score - segundo.score) < 20;

    if (top.score >= 90 && !hasTie) {
      vincularProjeto({
        id:          l.id,
        numContrato: top.contrato.numContrato,
        idProjeto:   top.contrato.id,
        usuario:     'auto-vincular (score ' + top.score + ')',
      });
      resultado.vinculados++;
    } else if (top.score >= 60) {
      // Marca como sugestão pendente via observação
      updateLancamento({
        id:         l.id,
        observacoes:(l.observacoes || '') + ' [Sugestão automática: ' + top.contrato.numContrato + ' (score ' + top.score + ')]',
        usuario:    'auto-vincular',
      });
      resultado.sugestoes++;
    } else {
      resultado.mantidos++;
    }
  });

  return resultado;
}

// Auxiliar para setar célula por nome de coluna
function _setCell(sheet, rowNum, hdrs, colName, value) {
  const c = hdrs.indexOf(colName);
  if (c >= 0) sheet.getRange(rowNum, c + 1).setValue(value);
}

// ─────────────────────────────────────────────────────────────
// RELATÓRIOS
// ─────────────────────────────────────────────────────────────

function getDRECompetencia(params) {
  const lancamentos = getLancamentos(params).lancamentos
    .filter(l => l.situacao !== 'Cancelado');
  const mes = params && params.mes;

  const grupos = {};
  lancamentos.forEach(l => {
    const m = (l.dataCompetencia || '').slice(0, 7);
    if (!m || (mes && m !== mes)) return;
    if (!grupos[m]) grupos[m] = { mes: m, receitas: {}, custosDiretos: {}, despesasOp: {} };
    const g    = grupos[m];
    const cat  = l.categoria || 'Outros';
    const val  = l.valorPrevisto || 0;
    if (l.tipo === 'Receita') {
      g.receitas[cat] = (g.receitas[cat] || 0) + val;
    } else {
      if (PLANO_CONTAS.custosDiretos.includes(cat)) {
        g.custosDiretos[cat] = (g.custosDiretos[cat] || 0) + val;
      } else {
        g.despesasOp[cat] = (g.despesasOp[cat] || 0) + val;
      }
    }
  });

  const dre = Object.keys(grupos).sort().map(m => {
    const g         = grupos[m];
    const totRec    = Object.values(g.receitas    ).reduce((s,v)=>s+v,0);
    const totCusto  = Object.values(g.custosDiretos).reduce((s,v)=>s+v,0);
    const lucroBruto= totRec - totCusto;
    const totDespOp = Object.values(g.despesasOp  ).reduce((s,v)=>s+v,0);
    const resultado = lucroBruto - totDespOp;
    const margem    = totRec > 0 ? +(resultado / totRec * 100).toFixed(1) : 0;
    return {
      mes: m, nomeMes: nomeMes(m),
      receitas: g.receitas, totalReceitas: totRec,
      custosDiretos: g.custosDiretos, totalCustos: totCusto,
      lucroBruto,
      despesasOp: g.despesasOp, totalDespOp: totDespOp,
      resultado, margem,
    };
  });

  return { dre };
}

function getFluxoCaixaNew(params) {
  const modo = (params && params.modo) || 'realizado';
  const ss   = getSSCached();

  if (modo === 'realizado') {
    const sheet = ss.getSheetByName('Baixas');
    if (!sheet || sheet.getLastRow() < 2) return { fluxo: [], modo };

    const data  = sheet.getDataRange().getValues();
    const hdrs  = data[0];
    const idx   = {};
    hdrs.forEach((h, i) => idx[h] = i);

    const lancMap = {};
    getLancamentos({}).lancamentos.forEach(l => lancMap[l.id] = l);

    const grupos = {};
    data.slice(1).filter(r => r[idx['ID Baixa']] && r[idx['Conciliado']] !== 'ESTORNADO').forEach(row => {
      const m = fmtIsoDate(row[idx['Data Caixa']] || '').slice(0, 7);
      if (!m) return;
      if (!grupos[m]) grupos[m] = { mes: m, entradas: 0, saidas: 0 };
      const lanc  = lancMap[String(row[idx['ID Lançamento']] || '')];
      const valor = parseFloat(row[idx['Valor Líquido (R$)']]) || 0;
      if (lanc && lanc.tipo === 'Receita') grupos[m].entradas += valor;
      else grupos[m].saidas += valor;
    });

    let acum = 0;
    const fluxo = Object.keys(grupos).sort().map(m => {
      const g = grupos[m];
      const saldo = g.entradas - g.saidas;
      acum += saldo;
      return { ...g, nomeMes: nomeMes(m), saldo, acumulado: acum };
    });
    return { fluxo, modo };
  } else {
    // Previsto: lançamentos em aberto por DataPrevistaCaixa
    const abertos = getLancamentos({}).lancamentos
      .filter(l => l.situacao !== 'Liquidado' && l.situacao !== 'Cancelado');

    const grupos = {};
    abertos.forEach(l => {
      const m = (l.dataPrevistaCaixa || l.dataVencimento || '').slice(0, 7);
      if (!m) return;
      if (!grupos[m]) grupos[m] = { mes: m, entradas: 0, saidas: 0 };
      const valor = l.valorPrevisto || 0;
      if (l.tipo === 'Receita') grupos[m].entradas += valor;
      else grupos[m].saidas += valor;
    });

    let acum = 0;
    const fluxo = Object.keys(grupos).sort().map(m => {
      const g = grupos[m];
      const saldo = g.entradas - g.saidas;
      acum += saldo;
      return { ...g, nomeMes: nomeMes(m), saldo, acumulado: acum };
    });
    return { fluxo, modo };
  }
}

function getResultadoProjetos() {
  const lancamentos = getLancamentos({}).lancamentos
    .filter(l => l.statusVinculo === 'Vinculado' && l.situacao !== 'Cancelado');

  const projetos = {};
  lancamentos.forEach(l => {
    const key = l.numContrato || l.idProjeto || 'sem-projeto';
    if (!projetos[key]) projetos[key] = {
      numContrato: l.numContrato, idProjeto: l.idProjeto,
      cliente: l.clienteFornecedor, receitas: 0, custosDiretos: 0, despesasOp: 0,
    };
    const p = projetos[key];
    if (l.tipo === 'Receita') {
      p.receitas += l.valorPrevisto || 0;
    } else if (PLANO_CONTAS.custosDiretos.includes(l.categoria)) {
      p.custosDiretos += l.valorPrevisto || 0;
    } else {
      p.despesasOp += l.valorPrevisto || 0;
    }
  });

  const resultado = Object.values(projetos).map(p => {
    const lucroBruto = p.receitas - p.custosDiretos;
    const resultado_ = lucroBruto - p.despesasOp;
    const margem     = p.receitas > 0 ? +(resultado_ / p.receitas * 100).toFixed(1) : 0;
    return { ...p, lucroBruto, resultado: resultado_, margem };
  }).sort((a, b) => b.resultado - a.resultado);

  return { projetos: resultado };
}

// ─────────────────────────────────────────────────────────────
// RESUMOS AUTOMÁTICOS (planilha Competência e Fluxo de Caixa)
// ─────────────────────────────────────────────────────────────

function atualizarResumos() {
  try {
    const ss   = getSSCached();
    const recs = getReceitas();
    const desps= getDespesas();
    gerarCompetencia(ss, recs, desps);
    gerarFluxoCaixa(ss, recs, desps);
  } catch(e) {
    Logger.log('atualizarResumos erro: ' + e.message);
  }
}

function gerarCompetencia(ss, recs, desps) {
  let sheet = ss.getSheetByName('📊 Competência');
  if (!sheet) sheet = ss.insertSheet('📊 Competência');
  sheet.clearContents();

  const hdrs = ['Mês','Receitas (R$)','Despesas (R$)','Resultado (R$)','Margem %','Acumulado (R$)'];
  sheet.getRange(1,1,1,hdrs.length).setValues([hdrs])
    .setBackground('#1a7a3c').setFontColor('#fff').setFontWeight('bold');
  sheet.setFrozenRows(1);

  const meses = [...new Set([
    ...recs .map(r => (r.data||'').slice(0,7)),
    ...desps.map(d => (d.data||'').slice(0,7))
  ])].filter(Boolean).sort();

  let acum = 0;
  const rows = meses.map(m => {
    const rec  = recs .filter(r=>(r.data||'').startsWith(m)).reduce((s,r)=>s+r.valor,0);
    const desp = desps.filter(d=>(d.data||'').startsWith(m)).reduce((s,d)=>s+d.valor,0);
    const res  = rec - desp;
    const mg   = rec > 0 ? (res/rec*100).toFixed(1)+'%' : '—';
    acum += res;
    return [nomeMes(m), rec, desp, res, mg, acum];
  });

  const totRec  = recs .reduce((s,r)=>s+r.valor,0);
  const totDesp = desps.reduce((s,d)=>s+d.valor,0);
  rows.push(['TOTAL', totRec, totDesp, totRec-totDesp,
    totRec>0?((totRec-totDesp)/totRec*100).toFixed(1)+'%':'—', '']);

  if (rows.length > 0) {
    sheet.getRange(2,1,rows.length,hdrs.length).setValues(rows);
    const fmt = '#,##0.00';
    [[2,2],[2,3],[2,4],[2,6]].forEach(([c1,c2]) =>
      sheet.getRange(2,c1,rows.length,c2-c1+1).setNumberFormat('R$ '+fmt));
    sheet.getRange(rows.length+1,1,1,hdrs.length).setFontWeight('bold').setBackground('#f0f0f0');
    rows.forEach((r,i) => {
      const cell = sheet.getRange(i+2,4);
      if (typeof r[3] === 'number') cell.setFontColor(r[3]>=0?'#1a7a3c':'#c0392b');
    });
  }
  sheet.autoResizeColumns(1, hdrs.length);
}

function gerarFluxoCaixa(ss, recs, desps) {
  let sheet = ss.getSheetByName('💰 Fluxo de Caixa');
  if (!sheet) sheet = ss.insertSheet('💰 Fluxo de Caixa');
  sheet.clearContents();

  const hdrs = ['Mês','Entradas Recebidas (R$)','Receita a Receber (R$)','Saídas (R$)','Saldo do Mês (R$)','Saldo Acumulado (R$)'];
  sheet.getRange(1,1,1,hdrs.length).setValues([hdrs])
    .setBackground('#1a4a7a').setFontColor('#fff').setFontWeight('bold');
  sheet.setFrozenRows(1);

  const meses = [...new Set([
    ...recs .map(r=>(r.data||'').slice(0,7)),
    ...desps.map(d=>(d.data||'').slice(0,7))
  ])].filter(Boolean).sort();

  let acum = 0;
  const rows = meses.map(m => {
    const recebido = recs .filter(r=>(r.data||'').startsWith(m)).reduce((s,r)=>s+(r.recebido||0),0);
    const aReceber = recs .filter(r=>(r.data||'').startsWith(m)).reduce((s,r)=>s+Math.max(0,(r.valor||0)-(r.recebido||0)),0);
    const saidas   = desps.filter(d=>(d.data||'').startsWith(m)).reduce((s,d)=>s+d.valor,0);
    const saldo    = recebido - saidas;
    acum += saldo;
    return [nomeMes(m), recebido, aReceber, saidas, saldo, acum];
  });

  const totRec = recs .reduce((s,r)=>s+(r.recebido||0),0);
  const totAR  = recs .reduce((s,r)=>s+Math.max(0,(r.valor||0)-(r.recebido||0)),0);
  const totSai = desps.reduce((s,d)=>s+d.valor,0);
  rows.push(['TOTAL', totRec, totAR, totSai, totRec-totSai, '']);

  if (rows.length > 0) {
    sheet.getRange(2,1,rows.length,hdrs.length).setValues(rows);
    sheet.getRange(2,2,rows.length,5).setNumberFormat('R$ #,##0.00');
    sheet.getRange(rows.length+1,1,1,hdrs.length).setFontWeight('bold').setBackground('#f0f0f0');
    rows.forEach((r,i) => {
      const cell = sheet.getRange(i+2,5);
      if (typeof r[4] === 'number') cell.setFontColor(r[4]>=0?'#1a7a3c':'#c0392b');
    });
  }
  sheet.autoResizeColumns(1, hdrs.length);
}

// ─────────────────────────────────────────────────────────────
// MIGRAÇÃO (executar UMA VEZ manualmente via editor do Apps Script)
// ─────────────────────────────────────────────────────────────

function migrarDadosFinanceiros() {
  const ss  = getSSCached();
  garantirNovasAbas(ss);

  const dataStr = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyyMMdd');
  const relatorio = { receitas: 0, despesas: 0, previsoes: 0, duplicados: 0, erros: [] };

  // 1. Backup das abas originais
  ['Receitas','Despesas','Previsoes'].forEach(nome => {
    const sheet = ss.getSheetByName(nome);
    if (!sheet) return;
    const backupNome = nome + '_backup_' + dataStr;
    if (!ss.getSheetByName(backupNome)) {
      sheet.copyTo(ss).setName(backupNome);
    }
  });

  // 2. Migrar Receitas
  getReceitas().forEach(r => {
    try {
      const res = createLancamento({
        id:               'mig_rec_' + r.id,
        tipo:             'Receita',
        situacao:         r.recebido >= r.valor ? 'Liquidado' : (r.recebido > 0 ? 'Parcial' : 'Em aberto'),
        descricao:        r.tipo || 'Venda',
        clienteFornecedor:r.cliente,
        categoria:        _categoriaDeTipo(r.tipo),
        grupoDRE:         'Receita Bruta',
        numContrato:      r.numContrato,
        statusVinculo:    r.numContrato ? 'Vinculado' : 'Pendente',
        dataEmissao:      r.data,
        dataCompetencia:  r.data,
        dataVencimento:   r.data,
        valorPrevisto:    r.valor,
        formaPrevista:    r.pagamento,
        origem:           'migracao_receitas',
        observacoes:      r.obs + (r.consultor ? ' | Consultor: ' + r.consultor : ''),
        criadoPor:        r.consultor || 'migracao',
        jaPago:           r.recebido > 0,
        valorPago:        r.recebido,
        dataPagamento:    r.data,
        metodo:           r.pagamento,
      });
      if (res.skipped) relatorio.duplicados++; else relatorio.receitas++;
    } catch(e) {
      relatorio.erros.push({ tipo: 'receita', id: r.id, erro: e.message });
    }
  });

  // 3. Migrar Despesas (já foram pagas, criar com Baixa automática)
  getDespesas().forEach(d => {
    try {
      const res = createLancamento({
        id:               'mig_dep_' + d.id,
        tipo:             'Despesa',
        situacao:         'Liquidado',
        descricao:        d.desc,
        clienteFornecedor:d.lancadoPor || '',
        categoria:        d.cat,
        grupoDRE:         _grupoDREDespesa(d.cat),
        idProjeto:        d.projetoId,
        numContrato:      d.numContrato,
        statusVinculo:    (d.numContrato || d.projetoId) ? 'Vinculado' : 'Pendente',
        dataEmissao:      d.data,
        dataCompetencia:  d.data,
        dataVencimento:   d.data,
        valorPrevisto:    d.valor,
        formaPrevista:    d.metodo,
        origem:           'migracao_despesas',
        observacoes:      d.obs,
        criadoPor:        d.lancadoPor || 'migracao',
        jaPago:           true,
        valorPago:        d.valor,
        dataPagamento:    d.data,
        metodo:           d.metodo,
      });
      if (res.skipped) relatorio.duplicados++; else relatorio.despesas++;
    } catch(e) {
      relatorio.erros.push({ tipo: 'despesa', id: d.id, erro: e.message });
    }
  });

  // 4. Migrar Previsões
  getPrevisoes().forEach(p => {
    try {
      const res = createLancamento({
        id:               'mig_prev_' + p.id,
        tipo:             p.tipo === 'entrada' ? 'Receita' : 'Despesa',
        situacao:         p.status === 'quitado' ? 'Liquidado' : 'Previsto',
        descricao:        p.desc,
        clienteFornecedor:p.cliente,
        categoria:        p.cat,
        grupoDRE:         p.tipo === 'entrada' ? 'Receita Bruta' : _grupoDREDespesa(p.cat),
        dataEmissao:      p.data,
        dataCompetencia:  p.data,
        dataPrevistaCaixa:p.data,
        valorPrevisto:    p.valor,
        origem:           'migracao_previsoes',
        observacoes:      p.obs + ' | Data competência estimada — verificar',
        criadoPor:        'migracao',
        statusVinculo:    'Pendente',
      });
      if (res.skipped) relatorio.duplicados++; else relatorio.previsoes++;
    } catch(e) {
      relatorio.erros.push({ tipo: 'previsao', id: p.id, erro: e.message });
    }
  });

  _gerarRelatorioMigracao(ss, relatorio);
  Logger.log('Migração concluída: ' + JSON.stringify(relatorio));
  return relatorio;
}

function _grupoDREDespesa(categoria) {
  return PLANO_CONTAS.custosDiretos.includes(categoria) ? 'Custo Direto' : 'Despesa Operacional';
}

function _gerarRelatorioMigracao(ss, rel) {
  let sheet = ss.getSheetByName('_Relatorio_Migracao');
  if (!sheet) sheet = ss.insertSheet('_Relatorio_Migracao');
  sheet.clearContents();

  const total = rel.receitas + rel.despesas + rel.previsoes;
  const linhas = [
    ['RELATÓRIO DE MIGRAÇÃO LUMENGRID', brTimestamp(), ''],
    ['', '', ''],
    ['Item', 'Quantidade', ''],
    ['Receitas migradas',    rel.receitas,    ''],
    ['Despesas migradas',    rel.despesas,    ''],
    ['Previsões migradas',   rel.previsoes,   ''],
    ['Duplicados ignorados', rel.duplicados,  ''],
    ['Erros',                rel.erros.length,''],
    ['TOTAL MIGRADO',        total,           ''],
    ['', '', ''],
    ['ERROS DETALHADOS', 'ID', 'Mensagem'],
    ...rel.erros.map(e => [e.tipo, e.id, e.erro]),
  ];

  sheet.getRange(1,1,linhas.length,3).setValues(linhas);
  sheet.getRange(1,1,1,2).setFontWeight('bold').setBackground('#E8641A').setFontColor('#FFFFFF');
  sheet.getRange(3,1,1,2).setFontWeight('bold').setBackground('#333').setFontColor('#FFFFFF');
  sheet.autoResizeColumns(1,3);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMO IMPLANTAR:
// 1. Acesse script.google.com → Novo projeto
// 2. Cole todo este código
// 3. Clique em Implantar → Nova implantação
// 4. Tipo: App da Web
// 5. Executar como: Você (sua conta Google)
// 6. Quem tem acesso: Qualquer pessoa
// 7. Clique em Implantar → copie a URL gerada
// 8. No dashboard.html → botão engrenagem (Config) → cole a URL → Salvar
//
// APÓS IMPLANTAR:
// - Para criar as novas abas: chame garantirNovasAbas() via Run
// - Para migrar dados: chame migrarDadosFinanceiros() via Run (só uma vez)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
