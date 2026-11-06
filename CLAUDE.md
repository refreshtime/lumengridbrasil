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
├── MANUAL_ANA.html
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

- **On-Grid:** preço vem da tabela de kits (`KITS_OG_FALLBACK` em `gerador-solar-v3.html`). NÃO usar R$/kWp fixo.
- **Hibrido:** preço vem da tabela de kits (`KITS_HIBRIDOS_FALLBACK` em `gerador-hibrido.html`). NÃO usar R$/kWp fixo.
- Geração: 65 kWh/placa/mês (On-Grid e Híbrido)
- **Módulos disponíveis (Out/2026):** Leapton 600W, Jinko 620W, Ronma 620W, DMEGC 625W, Leapton 630W, OSDA 710W
- **Inversores On-Grid:** GoodWe (string) e FoxESS Micro (microinversores)
- **Inversores Híbridos:** GoodWe apenas (Sofar híbrido removido)
- **Cartão:** repasse de 11% (5% custo/taxas + 6% emissão NF) — campo toggle nos geradores

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

## ⚡ REGRA PERMANENTE — Banco de Dados (Supabase)

> Qualquer nova ferramenta ou funcionalidade criada para a LumenGrid
> **DEVE ler e escrever no PostgreSQL (Supabase)**. O banco é o centro do ecossistema.

- Supabase URL/Key: configurados no topo de `admin.html` (`LG_SUPABASE_URL`, `LG_SUPABASE_KEY`)
- Schema completo: `migration/schema.sql` (23 tabelas + 3 views + RLS)
- Script de migração: `migration/import-sheets.js` (Google Sheets → Supabase)
- Script de validação: `migration/validate.js` (compara contagens Sheet vs banco)
- Painel admin: `admin.html` (busca universal + CRUD de kits)
- Kits públicos (anon read): `kit_pricing_ongrid` e `kit_pricing_hybrid` têm RLS aberto para SELECT
- **Fase 3**: cada HTML recebe integração Supabase COM fallback para .gs (sem romper o que existe)
- **Fases 1-2 concluídas**: arquivos existentes NÃO foram alterados (exceto portal.html — link adicionado)

## Design

- Posts Instagram: consultar `INSTAGRAM LUMENGRID/GUIA_DESIGN_POSTS.md`

### Logo nova (nov/2026)
- Arquivos SVG em `REDESIGN/LOGOMARCA/`. Referência de uso: `lumengrid_horizontal_escura.svg`
- **Símbolo**: arc path `M59 15 A36 36 0 1 1 25 25` (stroke #FAFAFA, stroke-width 4) + círculo `cx=68 cy=19 r=6` fill #F57832
- **Texto**: "LUMEN"(#F26522) + "GRID"(#FAFAFA), font Raleway 600, font-size 80, letter-spacing 16
- **Tagline**: "ENERGIA INTELIGENTE", font Inter 400, font-size 22, letter-spacing 7, fill rgba(242,101,34,.90)
- **Transform do símbolo**: `translate(50,50) scale(3)` dentro de viewBox `0 0 1200 400`
- **Paleta**: laranja símbolo=#F57832, laranja texto=#F26522, branco=#FAFAFA, preto=#111111
- **Em posts dark (overlay foto)**: inlinear o SVG sem o `<rect>` de fundo. Adicionar glow filters no símbolo e dot.
- Fonts a importar: `Raleway:wght@600` e `Inter:wght@400` (além de Space Grotesk + DM Sans para conteúdo)

## Performance Web — Regras de Entrega (nov/2026)

Score atual: **69 mobile** | LCP **25,4s→alvo <4s** | FCP 1,0s | TBT 0ms | CLS 0

### CHECKLIST OBRIGATÓRIO — rodar antes de qualquer commit no site

```
[ ] Imagens novas: formato WebP, max 900px, max 200KB
[ ] <img> tem width e height explícitos
[ ] Google Fonts: padrão preload não-bloqueante
[ ] Imagem hero (LCP): preload no <head> com fetchpriority="high"
[ ] Script novo: tem async ou defer? Se não, adicionar
[ ] Payload total: verificar que não aumentou muito (baseline 4.755 KiB)
```

### Imagens — regras obrigatórias

- **Formato**: sempre `.webp` para fotos e ilustrações. `.png` só para logos com transparência. `.jpg` apenas para fotos antigas já existentes
- **Tamanho máximo**: 200KB. Logo: 120px. Cards sol-photo: 900px. Hero: 900px
- **Conversão PNG→WebP**: `python3 -c "from PIL import Image; img=Image.open('a.png').convert('RGBA'); img.save('a.webp','WEBP',quality=82)"`
- **Redimensionar**: `sips -Z 900 arquivo.png`
- **width/height obrigatório** em todo `<img>` — evita CLS (layout shift)
- **Backup**: salvar original como `arquivo.ORIG.png` — nunca commitar o ORIG
- **Exemplo de ganho**: split-escuro-claro.png 1,9MB → .webp 56KB (97% menor)

### Google Fonts — padrão obrigatório

NUNCA: `<link rel="stylesheet" href="https://fonts.googleapis.com/...">`

SEMPRE:
```html
<link rel="preload" as="style" href="URL_FONTS" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="URL_FONTS"></noscript>
```

### Imagem LCP (hero do site)

- Arquivo: `imagens/PROJETOS/split-escuro-claro.webp`
- Deve ter no `<head>`: `<link rel="preload" as="image" href="..." fetchpriority="high" type="image/webp">`
- CSS background usa a mesma URL webp

### Scripts de terceiros

- Todo `<script src="...">` externo deve ter `async` ou `defer` — sem exceções
- Scripts de rastreamento (GTM, Zenite, Meta Pixel): `async` sempre

### Vídeos no site

- Hospedar no YouTube e embedar com `<iframe>` lazy: `loading="lazy"`
- Nunca subir arquivo de vídeo direto no repositório (pesa demais)
- Poster image: WebP, max 100KB

### Cache (GitHub Pages não controla headers)

- Para cache longo: migrar para Cloudflare CDN
- Atualizar imagem existente: mudar nome do arquivo (cache busting)
