# Guia de Estilo — Posts Instagram LumenGrid

## Canvas
Carrossel: 1080×1350px por slide (formato 4:5), gap de 36px entre slides no arquivo de trabalho.

## Cores
- Fundo base: `#161616` (quase preto, nunca preto puro)
- Laranja marca: `#F26522` (destaques, eyebrow tags, palavra-chave)
- Texto principal: `#FAFAFA`
- Texto de apoio: `rgba(250,250,250,0.65–0.75)` — mínimo 0.65 para corpo, 0.75 para eyebrow

## Tipografia
- Títulos/headline: **Space Grotesk**, weight 600–700
- Corpo/legenda: **DM Sans**, weight 300–500

### Tamanhos fixos (tokens)
- Marca: wordmark de duas cores — "LUMEN" laranja `#F26522` + "GRID" branco `#FAFAFA`, ambos Space Grotesk weight 800, **27px**, uppercase — mais tagline "ENERGIA INTELIGENTE" embaixo, DM Sans weight 600, **8px**, letter-spacing 0.3em, laranja 85% opacidade. Sempre topo-esquerda, ícone ao lado
- **Ícone (logo solar glow — padrão aprovado):** `height:58px` + `filter: drop-shadow(0 0 18px rgba(242,101,34,0.80)) drop-shadow(0 0 7px rgba(242,101,34,0.55)) drop-shadow(0 2px 10px rgba(0,0,0,0.9))` — funciona em fundo escuro e em foto. Arquivo: `../imagens/logo - icone da logo.png`
- Eyebrow tag (categoriza o slide, ex: "▶ energia para empresas"): **17px**, uppercase, letter-spacing 3–4px, cor laranja opacidade 0.90–0.95 — presente em TODO slide, sempre no mesmo Y (150-170px do topo). Nunca abaixo de 17px.
- Header tag (▶ categoria, canto superior direito): **15px**, mesma família e estilo do eyebrow
- Headline de impacto: **48-80px**, Space Grotesk 700 — 1 por slide, a ideia central
- Sub-headline / segunda frase de impacto: **34-44px**, Space Grotesk 700, geralmente em laranja
- Setup/intro line (frase introdutória leve): **30px**, DM Sans weight 300, opacidade baixa (.45–.55)
- Texto de apoio/corpo: **32-34px**, DM Sans weight 400–500, opacidade mínima `.80`, text-shadow forte `0 2px 24px rgba(0,0,0,.99)` — nunca abaixo de 32px
- Listas (itens com "—"): **30px**, DM Sans weight 400–500
- CTA final: **30px**, DM Sans weight 500–600, cor laranja

## Estrutura por slide
- Header fixo: logo + nome da marca, topo-esquerda, 72px do topo, 88px da margem lateral
- Eyebrow tag: logo abaixo do header, mesmo Y em todos os slides
- Indicador de progresso: 4 pontinhos, canto inferior direito, 48px da borda — o ponto ativo em laranja
- Margem lateral de conteúdo: 88px

## Fundos por slide
- Slides com foto: imagem de fundo + gradiente escuro (preto 10,10,16) mais forte nas bordas onde tem texto, transparente no centro
- Slides sem foto (quote/CTA): fundo sólido `#161616` ou radial-gradient sutil com glow laranja (`rgba(242,101,34,0.14)`) centralizado — nunca gradiente forte ou textura

## Overlay sobre fotos
- Topo: nunca ultrapassar `rgba(0,0,0,0.30)` — a foto precisa aparecer
- Base: pode ser mais escuro onde tem texto (`rgba(0,0,0,0.75–0.85)`)
- Padrão: `linear-gradient(to bottom, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.10) 30%, rgba(0,0,0,0.45) 60%, rgba(0,0,0,0.82) 100%)`

## Posição do texto — variar no feed
O texto não deve sempre estar no mesmo lugar. Alternar entre:
- **Base centralizada** (bottom: 120px, text-align: center) — padrão narrativo
- **Base esquerda** (bottom: 88px, text-align: left) — editorial/impacto
- **Centro vertical** (top: 50%, transform: translateY(-50%)) — quotes e frases soltas

## Moldura laranja — regra correta
- **CAPA (slide 1): NUNCA usar moldura laranja** — a foto deve respirar, sem borda decorativa
- **Slides internos (2 em diante): opcional** — moldura `inset:24px; border:4px solid rgba(242,101,34,0.65)` pode ser usada em slides educativos/comparativos para dar estrutura

## Ritmo de carrossel (aplicar em todo post futuro)
1. **Hook** — frase de efeito provocativa + contexto rápido
2. **Desenvolvimento** — lista ou detalhamento do gancho (pode ter fundo com foto)
3. **Insight/virada** — a mensagem central da marca, fundo sólido, "save-worthy" (frase quotável grande)
4. **CTA** — pergunta direta + convite claro para comentar/salvar/compartilhar

## Subtexto — estilo crescente
Preferência por linhas curtas com clímax crescente:
> "A energia deixou de ser consumo. / Virou estratégia. / Segurança. / Patrimônio."

## Regras gerais
- Nunca menos de 17px em eyebrow, nunca menos de 30px em corpo/listas, nunca menos de 32px em texto de apoio
- **Subtexto mínimo: 36px** — textos de apoio abaixo disso ficam pequenos demais no celular
- Máximo 1 imagem de fundo real por slide
- Emoji com moderação, só quando reforça o tom
- Sem moldura decorativa na capa (slide 1)

## Ritmo visual entre slides — obrigatório
Cada slide de um mesmo carrossel deve ter pelo menos uma diferença de formatação visual em relação ao anterior:
- **Alinhamento**: variar entre esquerda, direita e centro — nunca todos iguais
- **Posição do texto**: alternar entre topo, base e centro vertical
- **Tipo de slide**: incluir ao menos 1 slide sem foto (fundo sólido ou blur) para quebrar o ritmo
- **Peso do overlay**: slides não devem ter o mesmo padrão de escurecimento
- **Tamanho do headline**: variar entre slides para criar hierarquia no conjunto

### Nunca fazer em um mesmo carrossel:
- Todos os slides com texto centralizado
- Todos os slides com texto ancorado na base
- Todos os slides com foto full-bleed sem variação de overlay
- Mais de 2 slides seguidos com o mesmo layout

---

## Harmonia do feed — regras do Instagram real

O feed da LumenGrid tem padrão visual específico observado nos posts publicados:

1. **Alternar tonalidade**: nunca dois posts seguidos da mesma tonalidade (escuro/escuro ou claro/claro)
2. **Variar posição do texto**: nunca dois posts consecutivos com texto no mesmo canto
3. **Maioria escura**: posts com foto noturna/premium dominam o feed; posts claros aparecem como respiro
4. **Nunca repetir o mesmo layout** em posts consecutivos

### Vocabulário visual
| Tipo | Quando usar |
|---|---|
| **HERO** | Foto full-bleed + narrativa emocional |
| **EDITORIAL** | Conteúdo educativo, comparações, dois campos visuais |
| **TIPOGRAFIA** | Manifesto, frases de impacto, fundo sólido |
| **CARROSSEL** | Histórias longas, educação passo a passo |

---

## Posts de Empresa / Comercial

Para posts voltados a negócios (postos, comércios, indústrias):

- **Eyebrow**: `▶ energia para empresas`
- **Posição do texto**: base do post (`bottom: 110-120px`), `text-align: center`
- **Overlay**: gradiente suave — topo quase transparente, base escura
- **Tom da copy**: direto, foco em economia, resultado, operação
- **Foto**: aérea ou arquitetural do empreendimento com painéis

---

## Log de posts

| Post | Arquivo | Tema | Status |
|------|---------|------|--------|
| 01 | `post01_manifesto.html` | Não vendemos placas solares | ✅ publicado |
| 04 | `post04_on_grid_vs_hibrido OK.html` | On-Grid ou Híbrido? | ✅ publicado |
| 05 | `post05_carro_eletrico_bateria_litio…html` | Por que o lítio? | ✅ publicado |
| 06 | `post06_apagao OK.html` | Você só percebe quando acaba | ✅ publicado |
| 07 | `post07_energia_solar OK.html` | O melhor investimento da sua casa | ✅ publicado |
| 08 | `post08_sistema_hibrido- OK.html` | Energia inteligente exige planejamento | ✅ publicado |
| 11 | `post11_wallbox OK.html` | Imagine dirigir com energia do telhado | ✅ publicado |
| 15 | `post15_como_trabalhamos.html` | Cada projeto começa antes da instalação | ✅ publicado |
| — | `Post03_ApagaALuz.dc. - imagem html.html` | Apaga a luz! (nostalgia) | ✅ publicado |
| 04b | `post04_solucoes.html` | Soluções — Solar · Híbrido · Lítio | ⏳ não publicado |
| 09 | `post09_independencia_energetica ok. html.html` | Independência energética | ⏳ não publicado |
| 10 | `post10_bateria_residencial…html` | Bateria residencial | ⏳ não publicado |
| 12 | `post12_casa_inteligente…html` | Casa inteligente | ⏳ não publicado |
| — | `post_empresa_telhado.html` | O melhor investimento da empresa | ⏳ não publicado |
| — | `post_empresa_telhado_v2.html` | O maior corte de custos do posto | ⏳ não publicado |
| — | `post_posto_backup_litio.html` | Seu posto não pode parar | ⏳ não publicado |
| — | `post_indicacao.html` | Indicação | ⏳ não publicado |
| — | `post_goodwe_inversor.html` | GoodWe inversor | ⏳ não publicado |
| — | `post_apagao_empresas.html` | Apagão: academia, farmácia e mercado — backup lítio | ⏳ não publicado |
| — | `post_apagao_rede.html` | Risco de apagão na rede — residencial + empresarial | ⏳ não publicado |
