# Guia de Estilo — Posts Instagram LumenGrid

## Canvas
Carrossel: 1080×1350px por slide (formato 4:5), gap de 36px entre slides no arquivo de trabalho.

## Cores
- Fundo base: `#161616` (quase preto, nunca preto puro)
- Laranja marca: `#F26522` (destaques, eyebrow tags, palavra-chave)
- Texto principal: `#FAFAFA`
- Texto de apoio: `rgba(250,250,250,0.55–0.62)` — nunca branco puro em texto secundário

## Tipografia
- Títulos/headline: **Space Grotesk**, weight 600–700
- Corpo/legenda: **DM Sans**, weight 300–500

### Tamanhos fixos (tokens)
- Marca: wordmark de duas cores — "LUMEN" laranja `#F26522` + "GRID" branco `#FAFAFA`, ambos Space Grotesk weight 800, **27px**, uppercase — mais tagline "ENERGIA INTELIGENTE" embaixo, DM Sans weight 600, **8px**, letter-spacing 0.3em, laranja 85% opacidade. Sempre topo-esquerda, ícone ao lado
- **Ícone (logo solar glow — padrão aprovado):** `height:58px` + `filter: drop-shadow(0 0 18px rgba(242,101,34,0.80)) drop-shadow(0 0 7px rgba(242,101,34,0.55)) drop-shadow(0 2px 10px rgba(0,0,0,0.9))` — funciona em fundo escuro e em foto. Arquivo: `../imagens/icone logo.png`
- Eyebrow tag (categoriza o slide, ex: "▶ rewind anos 90/2000"): **17px**, uppercase, letter-spacing 3px, cor laranja opacidade 0.95 — presente em TODO slide, sempre no mesmo Y (150-170px do topo). Evitar abaixo de 16px: no feed do Instagram a arte escala bem menor que o canvas de trabalho.
- Headline de impacto: **56-76px**, Space Grotesk 700 — 1 por slide, a ideia central
- Frase/citação principal: **28-32px**, a segunda informação mais importante
- Texto de apoio/legenda: **20px** fixo — nunca variar entre slides
- CTA final: **26-28px**, weight 500, cor laranja

## Estrutura por slide
- Header fixo: logo + nome da marca, topo-esquerda, 72px do topo, 88px da margem lateral
- Eyebrow tag: logo abaixo do header, mesmo Y em todos os slides
- Indicador de progresso: 4 pontinhos, canto inferior direito, 48px da borda — o ponto ativo em laranja
- Margem lateral de conteúdo: 88px

## Fundos por slide
- Slides com foto: imagem de fundo + gradiente escuro (preto 10,10,16) mais forte nas bordas onde tem texto, transparente no centro
- Slides sem foto (quote/CTA): fundo sólido `#161616` ou radial-gradient sutil com glow laranja (`rgba(242,101,34,0.14)`) centralizado — nunca gradiente forte ou textura

## Ritmo de carrossel (aplicar em todo post futuro)
1. **Hook** — frase de efeito nostálgica/provocativa + contexto rápido
2. **Desenvolvimento** — lista ou detalhamento do gancho (pode ter fundo com foto)
3. **Insight/virada** — a mensagem central da marca, fundo sólido, "save-worthy" (frase quotável grande)
4. **CTA** — pergunta direta + convite claro para comentar/salvar/compartilhar

## Regras gerais
- Nunca menos de 20px em texto de apoio, nunca menos de 25px na marca
- Máximo 1 imagem de fundo real por slide — se a foto já contém texto/elementos gráficos (como posters), não duplicar essa informação em texto por cima
- Emoji com moderação, só quando reforça o tom (ex: 😂 no gancho)
- Sem cantos com moldura (decorativos) — exceto a moldura estrutural do Template B abaixo

---

## Sistema de Templates — alternância no feed

O feed do Instagram exibe 3 colunas. Alternando os templates os posts criam um padrão visual reconhecível no perfil.

```
[A] [B] [A]
[B] [A] [B]
[A] [B] [A]
```

### Template A — "Narrativo" (posts ímpares: 03, 05, 07...)
- **SEM moldura** laranja
- Foto de fundo dominante em todos os slides com foto
- Narrativa emocional / storytelling
- Conteúdo alinhado na base dos slides
- Slide de insight: fundo sólido #161616 + frase grande centralizada
- Referência: Post03_ApagaALuz

### Template B — "Educacional" (posts pares: 04, 06, 08...)
- **COM moldura laranja**: `position:absolute; inset:24px; border:4px solid rgba(242,101,34,0.65); pointer-events:none; z-index:25`
- Layouts variados slide a slide (split, tabela, cards — nunca repetir o padrão do Template A)
- Conteúdo informativo: comparativos, dados, tabelas, listas com ícones
- Slide 3 preferencialmente com tabela ou infográfico ("save-worthy")
- Referência: Post04_OnGridVsHibrido

### Log de posts
| Post | Template | Tema |
|------|----------|------|
| 03 | A | Apaga a Luz — nostalgia anos 90 |
| 04 | B | On-Grid vs Solar Híbrido — comparativo |
| 05 | A | Carro Elétrico + Bateria de Lítio — Wallbox solar |
