# Alteração financeira — LumenGrid

Analise o front-end e o backend atuais do sistema financeiro da LumenGrid e implemente as alterações abaixo sem reconstruir o projeto do zero, sem remover funcionalidades existentes e preservando o visual escuro/premium atual.

## Objetivo

Criar um financeiro que controle:

- Contas a pagar e receber.
- Fluxo por competência.
- Fluxo por caixa realizado.
- Fluxo de caixa previsto.
- Parcelamentos e pagamentos parciais.
- Receitas e despesas vinculadas ou ainda não vinculadas a contratos.
- Margem e resultado por projeto.
- Edição tanto pelo dashboard quanto pela planilha, sem perda de dados.

## 1. Corrigir a sincronização dos contratos

O backend atualmente utiliza:

```javascript
const sheet = ss.getSheetByName('Assinado') || ss.getSheetByName('Gerado');
```

Isso faz com que apenas uma aba seja lida.

Alterar para:

- Ler simultaneamente as abas `Gerado` e `Assinado`.
- Mapear colunas pelo nome do cabeçalho, não por posições fixas.
- Unificar os resultados.
- Remover duplicados por ID ou Nº do Contrato.
- Quando o mesmo contrato estiver nas duas abas, priorizar os dados da aba `Assinado`.
- Manter o status do contrato: Gerado, Assinado, Cancelado ou Concluído.
- Não duplicar contratos já importados.
- Criar uma função de sincronização incremental, sem apagar e recriar toda a base.

## 2. Substituir a lista de contratos

Remover o dropdown que carrega todos os contratos em `Vincular ao projeto`.

Substituir por um campo de busca/autocomplete:

`Buscar cliente, projeto ou contrato`

Regras:

- Pesquisar somente após o usuário digitar 3 caracteres.
- Permitir busca por cliente, CPF/CNPJ, número do contrato, endereço ou ID.
- Mostrar no máximo 10 resultados por pesquisa.
- Exibir: Nº Contrato — Cliente — Tipo do sistema — Status.
- Manter a opção `Sem vínculo`.
- Não carregar todos os contratos na abertura da página.
- Mostrar os contratos mais recentes e ativos primeiro.

## 3. Criar as bases financeiras

Criar uma aba `Lançamentos` como base de contas a pagar e receber.

Campos:

- ID Lançamento
- Tipo: Receita ou Despesa
- Situação: Previsto, Em aberto, Parcial, Liquidado ou Cancelado
- Descrição
- Cliente/Fornecedor
- Categoria
- Grupo DRE
- Centro de Custo
- ID Projeto
- Nº Contrato
- Status do Vínculo: Vinculado ou Pendente
- Data de Emissão
- Data de Competência
- Data de Vencimento
- Data Prevista de Caixa
- Valor Previsto
- Parcela
- Quantidade de Parcelas
- Forma Prevista
- Conta Prevista
- Documento/Comprovante
- Origem
- Observações
- Criado por
- Criado em
- Atualizado em
- Versão
- Ativo

Criar uma aba separada chamada `Baixas` para os pagamentos e recebimentos realizados.

Campos:

- ID Baixa
- ID Lançamento
- Data do Caixa
- Valor Principal
- Juros/Multa
- Desconto
- Tarifa
- Valor Líquido
- Conta Financeira
- Método
- Comprovante
- Conciliado
- Observação
- Criado por
- Criado em

Cada parcela de contrato deve ser um lançamento separado. Um lançamento pode receber várias baixas, permitindo pagamento parcial.

## 4. Criar as datas corretas

Não utilizar uma única data para todos os relatórios.

Utilizar:

- Data de Competência: resultado econômico/DRE.
- Data Prevista de Caixa: projeção futura.
- Data do Caixa: dia efetivo do pagamento ou recebimento.

O fluxo de caixa realizado deve utilizar exclusivamente as baixas.

## 5. Integrar contratos e contas a receber

Ao sincronizar um novo contrato:

- Criar ou atualizar o projeto.
- Se houver parcelas estruturadas, criar automaticamente uma conta a receber para cada parcela.
- Não considerar a parcela como recebida até existir uma baixa.
- Evitar duplicação usando contrato + número da parcela.
- Se a condição de pagamento estiver apenas em texto livre, não tentar adivinhar os valores.
- Nesse caso, criar um alerta `Condição financeira pendente` para preenchimento manual.

## 6. Criar “Pendentes de vínculo”

Permitir salvar qualquer receita ou despesa sem contrato.

Quando isso acontecer:

- Gravar com Status do Vínculo = Pendente.
- Mostrar um contador no menu: `Pendentes de vínculo (X)`.
- Criar uma tela específica contendo descrição, data, valor, cliente/fornecedor e contrato sugerido.
- Disponibilizar os botões:
  - Confirmar sugestão
  - Buscar outro contrato
  - Manter como geral
  - Ignorar sugestão

O usuário não deve precisar conciliar tudo na tela principal.

## 7. Implementar sugestão automática

Criar uma pontuação determinística para sugerir contratos:

- Número do contrato identificado: +100 pontos.
- CPF/CNPJ igual: +50 pontos.
- Cliente igual: +40 pontos.
- Valor compatível com uma parcela em aberto: +30 pontos.
- Data próxima ao vencimento: +20 pontos.
- Nome ou endereço semelhante: +20 pontos.

Regras:

- 90 pontos ou mais: permitir vínculo automático e registrar a regra utilizada.
- De 60 a 89: apresentar como sugestão para confirmação.
- Abaixo de 60: manter pendente.
- Nunca vincular automaticamente quando houver dois contratos com pontuação semelhante.
- Permitir desfazer o vínculo.
- Registrar o histórico da alteração.

## 8. Alterar o formulário atual

Preservar o layout atual, mas acrescentar:

- Competência
- Vencimento
- Data prevista de pagamento
- Data efetiva, quando já estiver pago
- Valor previsto
- Valor pago/recebido
- Cliente/Fornecedor
- Campo de busca do projeto
- Checkbox `Já foi pago/recebido`
- Checkbox `Salvar sem vínculo`
- Status do lançamento
- Número da parcela
- Conta financeira

Se `Já foi pago/recebido` estiver marcado, criar o lançamento e a baixa na mesma operação.

## 9. Criar relatórios

Criar:

- DRE por competência.
- Fluxo de caixa realizado.
- Fluxo de caixa previsto.
- Contas a receber.
- Contas a pagar.
- Vencidos.
- Pendentes de vínculo.
- Receita, custo direto e margem por projeto.
- Despesas gerais sem projeto.

Não escrever números fixos nos relatórios. Usar fórmulas, tabelas dinâmicas ou cálculos atualizáveis.

## 10. Plano de contas da LumenGrid

### Receitas

- Sistema solar on-grid
- Sistema híbrido
- Retrofit
- Baterias e backup
- Carregadores veiculares
- Projeto e consultoria
- Instalação
- Engenharia e homologação
- Manutenção
- Comissão de parceiros
- Outras receitas

### Custos diretos

- Módulos
- Inversores
- Baterias
- Estruturas
- Cabos e conectores
- Proteções e quadros
- Carregadores
- Frete
- Mão de obra
- Engenharia, ART e homologação
- Visita técnica
- Deslocamento do projeto
- Locação de equipamentos
- Comissão comercial
- Terceirizados
- Retrabalho e garantia

### Despesas operacionais

- Marketing
- Softwares
- Contabilidade
- Jurídico
- Tarifas bancárias
- Taxas de cartão
- Juros
- Impostos
- Pró-labore
- Salários e encargos
- Escritório
- Telefonia e internet
- Veículos
- Seguros
- Treinamentos
- EPIs e uniformes
- Materiais de escritório
- Outras despesas

## 11. Corrigir o backend atual

Corrigir obrigatoriamente:

- O desalinhamento de colunas em `saveDespesa`: está faltando `Ref Contrato` antes de `Criado em`.
- Executar `atualizarResumos()` somente depois de gravar ou atualizar os dados.
- Parar de utilizar `replaceReceitas`, `replaceDespesas` e `replacePrevisoes` apagando todas as linhas.
- Substituir por create, update e soft delete por ID.
- Usar `LockService` em todas as operações de gravação.
- Aceitar valores no formato brasileiro sem erros de `parseFloat`.
- Tratar datas usando o fuso horário `America/Sao_Paulo`.
- Criar histórico de alterações.
- Criar exclusão lógica com campo Ativo.
- Proteger a API com token ou autenticação; os dados financeiros não podem ficar públicos somente porque alguém possui a URL.
- Não retornar todos os dados financeiros sem validação de acesso.
- Criar gatilho controlado para atualizar os relatórios após edições diretas na planilha.
- Evitar chamadas repetidas de `SpreadsheetApp.openById` na mesma operação.

## 12. Endpoints

Implementar ou adaptar:

- get_catalogos
- sincronizar_contratos
- buscar_contratos
- get_lancamentos
- create_lancamento
- update_lancamento
- liquidar_lancamento
- estornar_baixa
- vincular_projeto
- desfazer_vinculo
- get_pendentes_vinculo
- get_fluxo_caixa
- get_dre_competencia
- get_resultado_projetos

## 13. Migração e segurança

Antes de alterar:

- Criar backup das abas atuais.
- Não apagar `Receitas`, `Despesas` ou `Previsões`.
- Criar uma função `migrarDadosFinanceiros()` executada manualmente uma única vez.
- Preservar os IDs existentes.
- Migrar os dados antigos para `Lançamentos`.
- Quando não existir informação suficiente, marcar o campo como pendente, sem inventar datas, contratos ou pagamentos.
- Gerar relatório final da migração com total migrado, duplicado, ignorado e pendente.

## 14. Testes obrigatórios

Testar:

- Contrato presente somente em Gerado.
- Contrato presente somente em Assinado.
- Mesmo contrato nas duas abas.
- Receita sem contrato.
- Despesa sem contrato.
- Busca com mais de 100 contratos.
- Contrato parcelado.
- Pagamento parcial.
- Mais de uma baixa no mesmo lançamento.
- Edição direta pela planilha.
- Edição pelo dashboard.
- Tentativa de duplicação.
- Dois usuários gravando simultaneamente.
- Valor digitado como `1.250,50`.
- Estorno de pagamento.
- Contrato cancelado.

## Entrega

Primeiro, apresente um resumo dos arquivos, funções e abas que serão alterados. Depois implemente em etapas, começando pela correção da sincronização dos contratos e pela substituição do dropdown. Não reescreva arquivos inteiros sem necessidade. Mostre claramente onde cada trecho deve ser inserido e entregue o código completo dos arquivos efetivamente alterados.
