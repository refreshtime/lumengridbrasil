# LUMENGRID — Instruções para Claude

## Repositório e Deploy

- Git repo hospedado em lumengridbrasil.com.br
- `portal.html` = painel central de navegação — todos os links devem ser acessíveis a partir dele
- URL: https://lumengridbrasil.com.br/portal.html

## Estrutura do Projeto

```
LUMENGRID/
├── index.html                  # Página inicial / landing
├── site.html                   # Site principal
├── login.html                  # Login do portal
├── portal.html                 # Painel central de navegação
├── dashboard.html              # Dashboard interno
├── CRM_LumenGrid.html          # CRM
├── solicitacoes.html           # Solicitações
├── indicacao.html              # Programa de indicação
├── margem.html                 # Cálculo de margem
├── contrato.html               # Gerador de contratos
├── gerador.html                # Gerador solar (backup original — nunca sobrescrever)
├── gerador-solar.html          # Gerador On-Grid
├── gerador-solar-v2.html       # Gerador On-Grid v2
├── gerador-solar-v3.html       # Gerador On-Grid v3 (mais recente)
├── gerador-hibrido.html        # Gerador Híbrido
├── arte_etiqueta_inversor.html
├── post01_bemvindo.html
├── post02_missao.html
├── MANUAL_CRM.html
├── MANUAL_LUCAS.html
├── CNAME
├── alteração FINANCEIRO.md
├── CODIGOS GS/
│   ├── Codigo.gs                   # Backend principal
│   ├── CRM_Codigo.gs
│   ├── PARCEIROS_Codigo.gs
│   ├── PARCEIROS_Codigo_antigo.gs
│   ├── CONTRATOS_Codigo.gs
│   └── FINANCEIRO_Codigo.gs
├── FACEBOOK/
│   ├── facebook_perfil.html
│   ├── facebook_capa.html
│   └── facebook_pagina.html
├── INSTAGRAM LUMENGRID/
│   ├── GUIA_DESIGN_POSTS.md
│   ├── PLANEJAMENTO_FEED.md
│   ├── MANUAL_ORGANIZACAO.html
│   ├── legendas.md
│   ├── PUBLICACOES/            # Posts finalizados e publicados
│   ├── RASCUNHOS/              # Posts em desenvolvimento
│   ├── POSTS PARA POSTAR/      # Prontos, aguardando postagem
│   ├── WPP/                    # Artes para WhatsApp
│   └── _SCRIPTS/               # Scripts de automação
├── PARCEIROS/
│   ├── michael.html
│   ├── jessica.html
│   ├── ddeg.html
│   └── orlando.html
├── RELATORIOS/
│   └── relatorio_visita_tecnica.html
├── DESPESAS/
├── FOTOS PARA SITE/
└── imagens/                    # Assets visuais
    ├── LOGOS/
    ├── PESSOAS/
    ├── PROJETOS/
    ├── TECNOLOGIA/
    ├── PROCESSO/
    └── NAO_UTILIZADAS/
```

## Regras Obrigatórias

- Todo arquivo HTML deve ter rodapé "Feito por Domani Consultoria"
- Sempre que editar o frontend, verificar se o backend correspondente em `CODIGOS GS/` precisa ser atualizado
- Nunca sobrescrever `gerador.html` (é o backup original)
- **`gerador-solar.html` = URL canônica pública** (`lumengridbrasil.com.br/gerador-solar.html`). Sempre mantê-lo sincronizado com `gerador-solar-v3.html`. Ao editar qualquer um deles, copiar para o outro: `cp gerador-solar-v3.html gerador-solar.html`

## Workflow de Versionamento

Antes de qualquer edição:
1. Criar cópia local da versão atual como backup
2. Fazer as alterações
3. Subir para o repositório (`git push`)
4. Após confirmar que subiu com sucesso, perguntar ao usuário se pode apagar a versão anterior local

## Verificação de Bugs

- Sempre que for feita uma alteração em qualquer arquivo, passar um agente revisando o arquivo alterado em busca de bugs antes de finalizar
- A revisão deve checar: lógica quebrada, referências a arquivos inexistentes, JS com erros de sintaxe, e consistência com o backend correspondente

## Calculos do Gerador Solar

- **On-Grid:** R$ 3.500 / kWp, 65 kWh/placa/mes
- **Hibrido:** R$ 5.000 / kWp, minimo R$ 28.000, 65 kWh/placa/mes

## Precificação de Kits — Lógica Obrigatória

Arquivo fonte: `precificacao_kits.html` (array `KITS` / `KITS_OG`).

### Componentes do Custo Direto
```
Custo Direto = Equipamentos (equip) + Instalação (rwp × Wp + homo)
```

**Faixas de instalação (On-Grid):**
| kWp | R$/Wp (rwp) | Homologação |
|-----|------------|-------------|
| 0–3 | 0,84 | R$ 500 |
| 3–6 | 0,60 | R$ 500 |
| 6–9 | 0,50 | R$ 800 |
| 9–12 | 0,44 | R$ 950 |
| 12–20 | 0,42 | R$ 1.050 |
| 20–45 | 0,38 | R$ 1.450 |

### DRE do Kit (cascata obrigatória)
```
Preço de Venda (Cheio)          = 100%
(−) Custo Direto                = equip + instalação + homologação
(−) Impostos                    = 10% do preço de venda
(−) Gestão OP                   = 20% da margem bruta (receita − custo direto − impostos)
= MARGEM CASH
(−) Comissão Vendedor           = 5% da Margem Cash
= MARGEM LÍQUIDA FINAL
```

### Margens-alvo por porte (Preço Mínimo)
- 8 pl → 24% | 9 pl → 25% | 10 pl → 26% | 11 pl → 27% | 12 pl → 28%
- 13 pl → 28,5% | 14–16 pl → 29–30% | 17–27 pl → 30–31% | 28+ pl → 32–33%

### Campo `promo` vs fórmula
- `promo: null` → preço mínimo calculado pela fórmula: `direto / (1 − margem)`
- `promo: VALOR` → sobrescreve o preço mínimo com valor real cotado/negociado
- Preço Cheio sempre = `precoMinimo / (1 − 0,05)` (spread de negociação de 5%)

### Regra de sincronização — OBRIGATÓRIO
**Sempre que alterar preço em `precificacao_kits.html`:**
1. Se o kit for **On-Grid** → atualizar `KITS_OG` em `gerador-solar-v3.html` e copiar para `gerador-solar.html`
2. Se o kit for **Híbrido** → atualizar o array correspondente em `gerador-hibrido.html`
3. Fazer `git push` após todas as alterações

### Overload de Inversor
- On-Grid: limite ≤ 40% (`(placas × Wp / invW − 1) × 100`)
- Híbrido: limite ≤ 40%
- Alertas: ≤ 40% = verde | ≤ 55% = laranja | > 55% = vermelho

## Geracao de PDF

- Usa `html2canvas` (scale: 2, allowTaint: true) + `jsPDF`

## Design

- Posts Instagram: consultar `INSTAGRAM LUMENGRID/GUIA_DESIGN_POSTS.md`
- Logo: `logo-icone.png` com glow filter laranja + HTML "LUMEN"(#F26522) + "GRID"(#FAFAFA) + "Energia Inteligente" (8px laranja)
