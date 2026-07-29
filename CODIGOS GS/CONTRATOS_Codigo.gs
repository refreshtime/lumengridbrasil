// ═══════════════════════════════════════════════════════════
// LUMEN GRID — CONTRATOS_Codigo.gs
// Gera contrato completo com todas as cláusulas no Google Doc
// Após colar: Executar > initSheets para configurar as abas
// ═══════════════════════════════════════════════════════════

const COLS = [
  'ID', 'Nº Contrato', 'Data Emissão', 'Cliente', 'CPF/CNPJ',
  'Telefone', 'E-mail', 'Tipo Sistema', 'kVp', 'Valor Total (R$)',
  'Forma Pagamento', 'Consultor', 'Status', 'Google Doc', 'Criado em'
];
const COL_STATUS = 13;

// ── INICIALIZAÇÃO ────────────────────────────────────────────
function initSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  _criarAba(ss, 'Gerado',   '#E8641A');
  _criarAba(ss, 'Assinado', '#1a7340');
  ['Página1', 'Sheet1'].forEach(nome => {
    const s = ss.getSheetByName(nome);
    if (s && ss.getSheets().length > 2) ss.deleteSheet(s);
  });
  try { SpreadsheetApp.getUi().alert('Planilha de Contratos configurada com sucesso!'); } catch(_) {}
}

function _criarAba(ss, nome, cor) {
  let sh = ss.getSheetByName(nome);
  if (!sh) sh = ss.insertSheet(nome);
  if (sh.getLastRow() === 0) {
    sh.appendRow(COLS);
    sh.getRange(1, 1, 1, COLS.length).setFontWeight('bold').setBackground(cor).setFontColor('#ffffff');
    sh.setFrozenRows(1);
    sh.setColumnWidth(14, 320);
    sh.setColumnWidth(4, 200);
  }
  const regra = SpreadsheetApp.newDataValidation().requireValueInList(['Gerado', 'Assinado'], true).setAllowInvalid(false).build();
  sh.getRange(2, COL_STATUS, 999, 1).setDataValidation(regra);
}

// ── ENDPOINT ─────────────────────────────────────────────────
function doPost(e) {
  try {
    let p;
    try { p = JSON.parse(e.postData.contents); } catch(_) { p = e.parameter; }
    if (p.action === 'salvarContrato') {
      return ContentService.createTextOutput(JSON.stringify(salvarContrato(p))).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Acao desconhecida' })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ── SALVA CONTRATO COMPLETO ───────────────────────────────────
function salvarContrato(p) {
  const ss = SpreadsheetApp.openById('1LTv6dFRT56533gfPc5elNfxiddsUzgYyLbCLsNykyRQ');
  let gerado = ss.getSheetByName('Gerado');
  if (!gerado) { initSheets(); gerado = ss.getSheetByName('Gerado'); }

  // — variáveis —
  const num        = p.num          || '---';
  const data       = _dt(p.dataEmissao);
  const hasBat     = p.tipoSistema  === 'solar_bateria';
  const tipoLabel  = hasBat ? 'Solar com Bateria (Sistema Híbrido)' : 'Solar Fotovoltaico';
  const cliNome    = p.cliNome      || '[NOME]';
  const cliDoc     = p.cliDoc       || '[CPF/CNPJ]';
  const cliRG      = p.cliRG        || '';
  const cliEnder   = p.cliEnder     || '';
  const cliCidade  = p.cliCidade    || '';
  const cliCEP     = p.cliCEP       || '';
  const cliEmail   = p.cliEmail     || '';
  const cliFone    = p.cliFone      || '';
  const instEnder  = p.instEnder    || cliEnder;
  const instTipo   = p.instTipo     || '';
  const instConexao= p.instConexao  || '';
  const modQty     = parseInt(p.eqModQty)  || 0;
  const modPwr     = parseFloat(p.eqModPwr)|| 0;
  const modModel   = p.eqModModel   || '';
  const invQty     = parseInt(p.eqInvQty)  || 0;
  const invPwr     = parseFloat(p.eqInvPwr)|| 0;
  const invModel   = p.eqInvModel   || '';
  const batQty     = parseInt(p.eqBatQty)  || 0;
  const batKwh     = parseFloat(p.eqBatKwh)|| 0;
  const batModel   = p.eqBatModel   || '';
  const kvp        = p.eqKvp        || (modQty && modPwr ? (modQty*modPwr/1000).toFixed(2)+' kVp' : '');
  const gen        = p.eqGen        || '';
  const estrutura  = p.eqEstrutura  || '';
  const adicionais = p.eqAdicionais || '';
  const payTotal   = parseFloat(p.payTotal) || 0;
  const payModo    = p.payModo      || '';
  const payParcelas= parseInt(p.payParcelas)|| 12;
  const payJuros   = p.payJuros     || 'sem juros';
  const payEntrada = parseFloat(p.payEntrada) || Math.round(payTotal*0.70);
  const payEquip   = parseFloat(p.payEquip)   || Math.round(payTotal*0.15);
  const payInst    = parseFloat(p.payInst)    || Math.round(payTotal*0.15);
  const payPersonalizado = p.payPersonalizado || '';
  const prazo      = parseInt(p.payPrazo) || 20;
  const warMod     = parseInt(p.warMod)   || 25;
  const warMicro   = parseInt(p.warMicro) || 15;
  const warInv     = parseInt(p.warInv)   || 10;
  const warBat     = parseInt(p.warBat)   || 10;
  const warInst    = parseInt(p.warInst)  || 1;
  const vendNome   = p.vendNome     || 'Lumen Grid';
  const vendCargo  = p.vendCargo    || 'Consultor de Energia';
  const foro       = p.cForo        || p.cliCidade || 'São Paulo';
  const obs        = p.cObs         || '';
  const clausObs   = obs ? 13 : 0;
  const clausForo  = obs ? 14 : 13;

  // — Google Doc —
  const docTitle = 'Contrato ' + num + ' — ' + cliNome;
  const doc  = DocumentApp.create(docTitle);
  const body = doc.getBody();
  body.setMarginTop(56).setMarginBottom(56).setMarginLeft(72).setMarginRight(72);

  // ── TÍTULO ──
  _titulo(body, 'CONTRATO DE FORNECIMENTO E INSTALAÇÃO');
  _titulo(body, 'DE SISTEMA DE ENERGIA SOLAR FOTOVOLTAICA' + (hasBat ? ' COM ARMAZENAMENTO EM BATERIA' : ''));
  const sub = body.appendParagraph('Contrato nº ' + num + '  ·  Emitido em ' + data);
  sub.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  sub.editAsText().setItalic(true).setFontSize(10).setForegroundColor('#666666');
  body.appendHorizontalRule();
  body.appendParagraph('');

  // ── CL. 1 — QUALIFICAÇÃO DAS PARTES ──
  _cl(body, '1ª', 'Qualificação das Partes');
  _p(body, '1.1.', 'CONTRATADA:');
  _box(body, [
    'Razão Social: [RAZÃO SOCIAL DA LUMEN GRID LTDA]',
    'CNPJ: [CNPJ DA LUMEN GRID]',
    'Endereço: [Endereço Completo da Lumen Grid]',
    'E-mail: contato@lumengridbrasil.com.br',
    'Representante: ' + vendNome + ' — ' + vendCargo,
  ]);

  _p(body, '1.2.', 'CONTRATANTE:');
  const contratanteLinhas = [
    'Nome / Razão Social: ' + cliNome,
    'CPF/CNPJ: ' + cliDoc + (cliRG ? '   ·   RG: ' + cliRG : ''),
    'Endereço: ' + [cliEnder, cliCidade, cliCEP ? 'CEP ' + cliCEP : ''].filter(Boolean).join(', '),
  ];
  if (cliEmail) contratanteLinhas.push('E-mail: ' + cliEmail);
  if (cliFone)  contratanteLinhas.push('Telefone: ' + cliFone);
  _box(body, contratanteLinhas);

  body.appendParagraph('As partes acima qualificadas, de comum acordo e na melhor forma de direito, celebram o presente instrumento particular, que se regerá pelas cláusulas e condições a seguir estipuladas.').setAlignment(DocumentApp.HorizontalAlignment.JUSTIFY);

  // ── RESUMO DE PAGAMENTO ──
  body.appendParagraph('');
  _secInterna(body, 'Resumo de Pagamento');
  _lin(body, 'Valor Total do Contrato:', _brl(payTotal));
  if (payModo === 'cartao') {
    _lin(body, 'Cartão de Crédito:', payParcelas + 'x de ' + _brl(payTotal/payParcelas) + ' (' + payJuros + ')');
  } else if (payModo === 'parcelado') {
    _lin(body, 'Entrada — 70% (ato da assinatura):', _brl(payEntrada));
    _lin(body, 'Entrega dos Equipamentos — 15%:', _brl(payEquip));
    _lin(body, 'Instalação — 15%:', _brl(payInst));
  } else if (payPersonalizado) {
    _lin(body, 'Condições:', payPersonalizado);
  }

  // ── CL. 2 — OBJETO ──
  _cl(body, '2ª', 'Objeto do Contrato');
  _p(body, '2.1.', 'O presente contrato tem por objeto o fornecimento de equipamentos, a execução da instalação e a prestação de serviços de comissionamento de um Sistema de Geração de Energia Solar Fotovoltaica' + (hasBat ? ' com Armazenamento em Bateria' : '') + ' na modalidade ' + instTipo + ' / ' + instConexao + ', no endereço: ' + instEnder + '.');
  _p(body, '2.2.', 'O sistema projetado possui potência nominal de ' + kvp + '.');
  _p(body, '2.3.', 'Compõem o escopo do fornecimento os seguintes equipamentos e serviços:');

  // Equipamentos
  _secInterna(body, 'Relação de Equipamentos e Serviços');
  if (modQty) _equip(body, modQty + 'x Módulo Fotovoltaico ' + (modPwr ? modPwr + 'W' : ''), modModel);
  if (invQty) _equip(body, invQty + 'x Inversor ' + (hasBat ? 'Híbrido ' : '') + (invPwr ? invPwr + 'kW' : ''), invModel);
  if (hasBat && batQty) _equip(body, batQty + 'x Sistema de Bateria ' + (batKwh ? batKwh + ' kWh' : ''), batModel);
  _equip(body, 'Estrutura de Fixação', estrutura);
  _equip(body, 'Cabeamento, String Box e Proteções', 'conforme projeto elétrico');
  _equip(body, 'Projeto Elétrico (ART/RRT)', 'incluído');
  _equip(body, 'Acompanhamento de Homologação', 'junto à concessionária');
  if (adicionais) _equip(body, 'Itens Adicionais', adicionais);
  if (gen) _lin(body, 'Geração estimada/mês:', gen);

  _p(body, '2.4.', 'A instalação seguirá as normas técnicas aplicáveis, em especial a ABNT NBR 16690 (sistemas fotovoltaicos), NR-10 (segurança em eletricidade) e as resoluções vigentes da ANEEL, bem como as normas de acesso da distribuidora local.');

  _cl(body, '2ª', 'Declarações do CONTRATANTE');
  _p(body, '2.1.', 'Ao assinar este contrato, o CONTRATANTE declara:');
  _item(body, '2.1.1.', 'Não haver impedimento legal, estrutural ou regulatório para a instalação do sistema no endereço indicado;');
  _item(body, '2.1.2.', 'Ter ciência de que o direito de propriedade sobre os equipamentos será transferido ao CONTRATANTE somente após a liquidação integral do valor contratado;');
  _item(body, '2.1.3.', 'Ter ciência de que a CONTRATADA realizará a solicitação de compra dos equipamentos e, quando necessário, os processos de homologação junto à concessionária de energia em nome do CONTRATANTE.');

  // ── CL. 3 — PRAZO ──
  _cl(body, '3ª', 'Prazo de Instalação');
  _p(body, '3.1.', 'A conclusão da instalação física dar-se-á em até ' + prazo + ' (' + _ext(prazo) + ') dias úteis, a contar da confirmação do pagamento da entrada e assinatura deste instrumento.');
  _p(body, '3.2.', 'O prazo de homologação junto à concessionária de energia é de responsabilidade desta, estando sujeito aos prazos regulatórios da ANEEL. A CONTRATADA realizará todos os trâmites necessários, mas não se responsabiliza por atrasos ocasionados pela concessionária.');

  _secInterna(body, 'Projeto e Homologação junto à Concessionária');
  body.appendParagraph('A CONTRATADA será responsável pela elaboração e condução do processo de homologação do sistema de energia solar perante a concessionária, contemplando:').setAlignment(DocumentApp.HorizontalAlignment.JUSTIFY);
  const homoItens = [
    'Desenvolvimento do projeto elétrico do sistema;',
    'Elaboração do memorial descritivo;',
    'Elaboração dos diagramas unifilar e de blocos;',
    'Dimensionamento elétrico de cabos, proteções, dispositivos de seccionamento e aterramento;',
    'Detalhamento do ponto de conexão, padrão de entrada e integração com a rede elétrica;',
    'Especificação técnica dos módulos, inversores e demais equipamentos;',
    'Preparação e preenchimento dos formulários exigidos pela concessionária;',
    'Organização da documentação técnica e dos certificados dos equipamentos;',
    'Protocolo da solicitação de conexão;',
    'Acompanhamento do processo e atendimento de eventuais adequações técnicas solicitadas;',
    'Solicitação de vistoria e troca ou parametrização do medidor;',
    'Acompanhamento até a conclusão da homologação e liberação do sistema para operação.',
  ];
  homoItens.forEach(function(item) { body.appendListItem(item).setGlyphType(DocumentApp.GlyphType.BULLET); });
  if (hasBat) {
    body.appendParagraph('Nos sistemas híbridos, o projeto também contemplará a integração entre geração solar, rede elétrica, baterias e cargas de backup, incluindo a definição dos modos de operação, proteções anti-ilhamento e controle de injeção de energia, quando aplicável.').setAlignment(DocumentApp.HorizontalAlignment.JUSTIFY);
  }

  // ── CL. 4 — RESPONSABILIDADE ──
  _cl(body, '4ª', 'Responsabilidade pela Instalação');
  _p(body, '4.1.', 'Após a aquisição dos equipamentos, a CONTRATADA fará uma visita técnica ao local de instalação para avaliação do projeto e requisitos de homologação, resultando em relatório técnico enviado ao CONTRATANTE.');
  _p(body, '4.2.', 'A CONTRATADA poderá optar por um parceiro de instalação, que será o responsável pela engenharia e execução dos serviços no local, permanecendo a CONTRATADA como responsável perante o CONTRATANTE pela qualidade e documentação do projeto.');
  _p(body, '4.3.', 'Caso o relatório técnico identifique a necessidade de alteração do Padrão de Entrada ou separação de cargas exigidas pela concessionária, a CONTRATADA apresentará proposta para tais adequações. O CONTRATANTE poderá optá-las com a CONTRATADA ou de forma independente, assumindo, neste último caso, a responsabilidade pelo cumprimento dos requisitos técnicos.');
  _p(body, '4.4.', 'Os equipamentos adquiridos serão compatíveis com os requisitos técnicos da distribuidora local, incluindo tensão, distribuição de cargas, fases e dispositivos de proteção necessários ao funcionamento seguro do sistema.');

  // ── CL. 5 — PREÇO ──
  _cl(body, '5ª', 'Preço e Forma de Pagamento');
  _p(body, '5.1.', 'O valor total do presente contrato é de ' + _brl(payTotal) + ' (' + _porExtenso(payTotal) + ').');
  if (payModo === 'cartao') {
    _secInterna(body, 'Pagamento — Cartão de Crédito');
    _lin(body, 'Parcelamento:', payParcelas + 'x de ' + _brl(payTotal/payParcelas) + ' (' + payJuros + ')');
  } else if (payModo === 'parcelado') {
    _secInterna(body, 'Pagamento — Parcelado');
    _lin(body, 'Entrada — 70% (ato da assinatura):', _brl(payEntrada));
    _lin(body, 'Entrega dos Equipamentos — 15%:', _brl(payEquip));
    _lin(body, 'Instalação — 15%:', _brl(payInst));
  } else if (payPersonalizado) {
    _secInterna(body, 'Condições de Pagamento');
    body.appendParagraph(payPersonalizado);
  }
  _p(body, '5.2.', 'O valor contratado inclui o fornecimento dos equipamentos especificados na Cláusula 2ª e os serviços de instalação, comissionamento e projeto elétrico. Não estão incluídos: obras civis, taxa de vistoria da concessionária, materiais adicionais não especificados e adequações elétricas internas do imóvel.');
  _p(body, '5.3.', 'Durante a instalação, alterações podem ser necessárias em função das características do telhado ou exigências da concessionária, podendo implicar reajuste do valor contratado mediante prévia notificação e aceite do CONTRATANTE.');
  _p(body, '5.5.', 'Caso o CONTRATANTE opte por financiamento bancário, a CONTRATADA fica desde já autorizada a compartilhar documentos e informações referentes a este contrato com a instituição financeira responsável.');

  // ── CL. 6 — GARANTIAS ──
  _cl(body, '6ª', 'Garantias');
  _p(body, '6.1.', 'A garantia dos equipamentos integrantes do sistema é de responsabilidade exclusiva de seus respectivos fabricantes. A CONTRATADA se responsabilizará por intermediar, caso necessário, quaisquer tratativas referentes às necessidades de pós-venda junto aos devidos fornecedores, desde que não seja identificado mau uso.');
  _secInterna(body, 'Prazos de Garantia do Fabricante');
  _lin(body, 'Módulos Fotovoltaicos:', warMod + ' anos');
  _lin(body, 'Microinversores:', warMicro + ' anos');
  _lin(body, 'Inversor String / Híbrido:', warInv + ' anos');
  if (hasBat) _lin(body, 'Sistema de Bateria:', warBat + ' anos — 6.000 ciclos de vida útil');
  _lin(body, 'Instalação e Mão de Obra:', warInst + ' ano(s)');
  _p(body, '6.2.', 'A garantia de instalação cobre defeitos de execução, fixação e conexões elétricas. Não estão cobertos danos decorrentes de: (i) mau uso pelo CONTRATANTE; (ii) intervenções de terceiros não autorizadas.');

  // ── CL. 7 — OBRIGAÇÕES CONTRATADA ──
  _cl(body, '7ª', 'Obrigações da CONTRATADA');
  _p(body, '7.1.', 'São obrigações da CONTRATADA:');
  ['Fornecer os equipamentos integrantes do sistema em perfeitas condições;',
   'Executar a instalação conforme especificações técnicas e projeto elétrico;',
   'Protocolar a solicitação de acesso junto à concessionária e acompanhar o processo até a homologação;',
   'Comunicar ao CONTRATANTE em tempo hábil qualquer irregularidade no fornecimento do sistema;',
   'Deixar o local de trabalho limpo e organizado após a conclusão dos serviços.',
  ].forEach(function(i){ body.appendListItem(i).setGlyphType(DocumentApp.GlyphType.BULLET); });

  // ── CL. 8 — OBRIGAÇÕES CONTRATANTE ──
  _cl(body, '8ª', 'Obrigações do CONTRATANTE');
  _p(body, '8.1.', 'São obrigações do CONTRATANTE:');
  ['Efetuar os pagamentos nas datas e condições acordados neste instrumento;',
   'Garantir acesso ao local de instalação nos horários combinados com a equipe técnica;',
   'Informar à CONTRATADA qualquer alteração na instalação elétrica existente que possa afetar o sistema;',
   'Não realizar intervenções no sistema sem prévia autorização da CONTRATADA;',
   'Realizar manutenção periódica de limpeza dos módulos conforme orientação técnica;',
   'Comunicar imediatamente à CONTRATADA sobre quaisquer falhas no sistema;',
   'Enviar, em até 10 (dez) dias corridos após a assinatura deste contrato, os documentos necessários ao andamento do projeto: fatura de energia, documento pessoal com foto do titular e demais requeridos pela concessionária.',
  ].forEach(function(i){ body.appendListItem(i).setGlyphType(DocumentApp.GlyphType.BULLET); });

  // ── CL. 9 — PENALIDADES ──
  _cl(body, '9ª', 'Penalidades');
  _p(body, '9.1.', 'No caso de infração contratual por quaisquer das partes, a parte infratora pagará à outra multa não compensatória de 2% (dois por cento) sobre o valor total do contrato, até o limite de 10% (dez por cento) do mesmo valor.');

  // ── CL. 10 — RESCISÃO ──
  _cl(body, '10ª', 'Rescisão');
  body.appendParagraph('A rescisão poderá ser solicitada por qualquer das partes, mediante prévio envio de comunicação por escrito, durante toda a etapa de elaboração do projeto, ou seja, até o momento anterior à compra dos equipamentos por parte da CONTRATADA.').setAlignment(DocumentApp.HorizontalAlignment.JUSTIFY);
  _p(body, '10.1.', 'São hipóteses de rescisão motivadas pelo CONTRATANTE:');
  ['Problemas de infraestrutura ou padrão de entrada no local de instalação;',
   'Condições estruturais do telhado inadequadas para suporte e fixação dos módulos;',
   'Não aceite das adequações de projeto apontadas em relatório técnico;',
   'Problemas que inviabilizem a acessibilidade ao local de instalação;',
   'Alterações estruturais do telhado não informadas no momento da contratação;',
   'Não aceite do aumento de carga contratada junto à concessionária;',
   'Não aceite de regularizações de pendências elétricas pré-existentes;',
   'Não envio das documentações necessárias no prazo previsto na Cláusula 8ª;',
   'Problemas pessoais; e',
   'Solicitação de cancelamento imotivada.',
  ].forEach(function(i){ body.appendListItem(i).setGlyphType(DocumentApp.GlyphType.BULLET); });
  _p(body, '10.2.', 'São hipóteses de rescisão motivadas pela CONTRATADA:');
  ['Adequações de projeto que inviabilizem tecnicamente a realização da instalação;',
   'Eventos de força maior que impeçam a compra, instalação ou homologação do sistema.',
  ].forEach(function(i){ body.appendListItem(i).setGlyphType(DocumentApp.GlyphType.BULLET); });
  _p(body, '10.3.', 'Nos casos de rescisão atribuídos ao CONTRATANTE, após a compra dos equipamentos por parte da CONTRATADA, o CONTRATANTE não terá direito ao reembolso de nenhum valor pago.');
  _p(body, '10.4.', 'Nos casos de rescisão atribuídos ao CONTRATANTE, antes da compra dos equipamentos, o CONTRATANTE terá direito à devolução dos valores já pagos, sendo devida à CONTRATADA multa compensatória de 10% (dez por cento) do valor total do projeto, referente aos custos já incorridos.');
  _p(body, '10.5.', 'Nos casos de rescisão atribuídos à CONTRATADA, antes ou após a compra dos equipamentos, a CONTRATADA devolverá integralmente os valores já pagos pelo CONTRATANTE.');

  // ── CL. 11 — LGPD ──
  _cl(body, '11ª', 'Proteção de Dados (LGPD)');
  _p(body, '11.1.', 'As partes são obrigadas a observar a legislação em vigor relativa à proteção de dados pessoais (Lei nº 13.709/2018 — LGPD), sem prejuízo de empenhar os esforços necessários para não causar danos à contraparte.');
  _p(body, '11.2.', 'Por meio do presente, o CONTRATANTE expressamente autoriza a CONTRATADA a: (i) tratar seus dados pessoais, inclusive armazenando-os em base de dados própria, com a finalidade exclusiva de cumprir o objeto deste contrato; (ii) compartilhar os dados pessoais do CONTRATANTE com o parceiro de instalação responsável pela execução e homologação do sistema.');

  // ── CL. 12 — DISPOSIÇÕES GERAIS ──
  _cl(body, '12ª', 'Disposições Gerais');
  _p(body, '12.1.', 'A tolerância de qualquer das partes em relação às condições ora pactuadas não representará novação ou renúncia de direitos.');
  _p(body, '12.2.', 'A CONTRATADA não é responsável perante o CONTRATANTE por alterações em regulamentos, normas ou leis referentes a sistemas fotovoltaicos, após a entrega e instalação do sistema.');
  _p(body, '12.3.', 'O CONTRATANTE declara estar ciente de que fotos da instalação do sistema poderão ser reproduzidas e divulgadas pela CONTRATADA com fins publicitários/comerciais.');
  _p(body, '12.4.', 'Quaisquer alterações das obrigações contratuais somente serão válidas mediante a celebração de Termos Aditivos, firmados pelos representantes legais das partes.');
  _p(body, '12.5.', 'As partes afirmam expressamente que reconhecem a autenticidade, integridade e validade jurídica do instrumento, que poderá ser firmado por meio eletrônico, digital ou físico.');
  _p(body, '12.6.', 'As partes reconhecem que o presente contrato constitui título executivo extrajudicial, dotado de certeza, liquidez e exigibilidade, para todos os fins previstos no Código de Processo Civil.');

  // ── CL. 13 (opcional) — DISPOSIÇÕES ESPECIAIS ──
  if (obs) {
    _cl(body, '13ª', 'Disposições Especiais');
    body.appendParagraph(obs).setAlignment(DocumentApp.HorizontalAlignment.JUSTIFY);
  }

  // ── CL. 13/14 — FORO ──
  _cl(body, clausForo + 'ª', 'Foro');
  body.appendParagraph('As partes elegem o Foro da Comarca de ' + foro + ' para dirimir quaisquer dúvidas ou litígios oriundos do presente instrumento, com renúncia expressa a qualquer outro, por mais privilegiado que seja.').setAlignment(DocumentApp.HorizontalAlignment.JUSTIFY);
  body.appendParagraph('E, por estarem assim justos e contratados, firmam o presente instrumento em 2 (duas) vias de igual teor e forma.').setAlignment(DocumentApp.HorizontalAlignment.JUSTIFY);

  // ── ASSINATURAS ──
  body.appendParagraph('');
  body.appendHorizontalRule();
  const localData = body.appendParagraph(foro + ', ' + data);
  localData.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  localData.editAsText().setBold(true);
  body.appendParagraph('');
  body.appendParagraph('________________________________________          ________________________________________').setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  const lbls = body.appendParagraph('[RAZÃO SOCIAL DA LUMEN GRID]          ' + cliNome);
  lbls.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  lbls.editAsText().setFontSize(9).setForegroundColor('#555555');
  const roles = body.appendParagraph('CONTRATADA — Lumen Grid Energia Inteligente          CONTRATANTE — CPF: ' + cliDoc);
  roles.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  roles.editAsText().setFontSize(9).setForegroundColor('#555555');
  body.appendParagraph('');
  body.appendHorizontalRule();
  const rodape = body.appendParagraph('Feito por Domani Consultoria — Lumen Grid Energia Inteligente');
  rodape.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  rodape.editAsText().setForegroundColor('#E8641A').setFontSize(8);

  doc.saveAndClose();
  const docUrl = doc.getUrl();

  // ── REGISTRO NA PLANILHA ──
  const id = Utilities.getUuid();
  gerado.appendRow([
    id, num, _dt(p.dataEmissao), cliNome, cliDoc, cliFone, cliEmail,
    tipoLabel, kvp, payTotal, _pagLabel(payModo), vendNome, 'Gerado', docUrl,
    new Date().toLocaleString('pt-BR')
  ]);
  const lr = gerado.getLastRow();
  gerado.getRange(lr, 10).setNumberFormat('R$ #,##0.00');
  gerado.getRange(lr, COL_STATUS).setFontColor('#E8641A').setFontWeight('bold');
  gerado.getRange(lr, 14).setFontColor('#1a73e8');

  return { success: true, docUrl: docUrl, id: id };
}

// ── MENU / EVENTOS ────────────────────────────────────────────
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Lumen Grid').addItem('Configurar planilha', 'initSheets').addToUi();
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
function _titulo(body, txt) {
  const p = body.appendParagraph(txt);
  p.setHeading(DocumentApp.ParagraphHeading.HEADING1).setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  p.editAsText().setForegroundColor('#E8641A').setFontSize(13);
}
function _cl(body, num, titulo) {
  body.appendParagraph('');
  const p = body.appendParagraph('CLÁUSULA ' + num + ' — ' + titulo.toUpperCase());
  p.setHeading(DocumentApp.ParagraphHeading.HEADING3);
  p.editAsText().setForegroundColor('#E8641A');
}
function _secInterna(body, titulo) {
  const p = body.appendParagraph(titulo);
  p.editAsText().setBold(true).setFontSize(10).setForegroundColor('#E8641A');
}
function _p(body, num, txt) {
  const p = body.appendParagraph('');
  const full = num + ' ' + txt;
  p.editAsText().setText(full).setBold(0, num.length - 1, true).setBold(num.length, full.length - 1, false);
  p.setAlignment(DocumentApp.HorizontalAlignment.JUSTIFY);
}
function _item(body, num, txt) {
  const p = body.appendParagraph('');
  const full = '    ' + num + ' ' + txt;
  p.editAsText().setText(full).setBold(4, 4 + num.length - 1, true).setBold(4 + num.length, full.length - 1, false);
  p.setAlignment(DocumentApp.HorizontalAlignment.JUSTIFY);
}
function _lin(body, label, value) {
  const p = body.appendParagraph('');
  const txt = label + '  ' + (value || '---');
  p.editAsText().setText(txt).setBold(0, label.length - 1, true).setBold(label.length, txt.length - 1, false);
}
function _box(body, linhas) {
  linhas.forEach(function(l) {
    const p = body.appendParagraph('    ' + l);
    p.editAsText().setFontSize(11).setForegroundColor('#333333');
  });
}
function _equip(body, label, desc) {
  const p = body.appendParagraph('');
  const txt = '• ' + label + (desc ? ' — ' + desc : '');
  p.editAsText().setText(txt).setBold(0, label.length + 1, true).setBold(label.length + 2, txt.length - 1, false);
}
function _dt(d) {
  if (!d) return '---';
  const pts = d.split('-');
  return pts.length === 3 ? pts[2] + '/' + pts[1] + '/' + pts[0] : d;
}
function _brl(v) {
  if (!v) return 'R$ 0,00';
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function _pagLabel(modo) {
  if (modo === 'cartao') return 'Cartão de Crédito';
  if (modo === 'parcelado') return 'Parcelado';
  if (modo === 'personalizado') return 'Personalizado';
  return modo || '---';
}
function _ext(n) {
  const u = ['','um','dois','três','quatro','cinco','seis','sete','oito','nove','dez','onze','doze','treze','quatorze','quinze','dezesseis','dezessete','dezoito','dezenove'];
  const d = ['','','vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa'];
  if (n < 20) return u[n];
  if (n < 100) return d[Math.floor(n/10)] + (n%10 ? ' e ' + u[n%10] : '');
  return n + '';
}
function _porExtenso(v) {
  if (!v) return 'zero reais';
  const inteiro = Math.floor(v);
  const cent = Math.round((v - inteiro) * 100);
  const u = ['','um','dois','três','quatro','cinco','seis','sete','oito','nove','dez','onze','doze','treze','quatorze','quinze','dezesseis','dezessete','dezoito','dezenove'];
  const d = ['','','vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa'];
  const c = ['','cento','duzentos','trezentos','quatrocentos','quinhentos','seiscentos','setecentos','oitocentos','novecentos'];
  function _n(n) {
    if (n === 0) return 'zero';
    if (n === 100) return 'cem';
    if (n < 20) return u[n];
    if (n < 100) return d[Math.floor(n/10)] + (n%10 ? ' e ' + u[n%10] : '');
    const r = n % 100;
    return c[Math.floor(n/100)] + (r ? ' e ' + (r < 20 ? u[r] : d[Math.floor(r/10)] + (r%10 ? ' e ' + u[r%10] : '')) : '');
  }
  let res = _n(inteiro) + (inteiro === 1 ? ' real' : ' reais');
  if (cent > 0) res += ' e ' + _n(cent) + (cent === 1 ? ' centavo' : ' centavos');
  return res;
}
