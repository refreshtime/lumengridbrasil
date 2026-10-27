# Planejamento Estratégico do Feed — LumenGrid

---

## SEQUÊNCIA DE PUBLICAÇÃO — siga esta ordem

> Os arquivos finais estão em **PUBLICACOES/**. Abra o HTML, tire print em tela cheia e exporte como imagem.
> Para simular o feed antes de publicar, abra **PUBLICACOES/_feed_preview.html**
> Publique um post por dia, na ordem abaixo. Nunca pule a ordem — ela é estratégica.

| # | Status | Layout | Arquivo | Tema |
|---:|:---:|---|---|---|
| **01** | ✅ Pronto | Tipografia · Pesado | `post01_manifesto.html` | Manifesto — "Não vendemos placas solares" |
| **02** | ✅ Pronto | Carrossel · Leve | `post02_nossa_historia.html` | Nossa história — +8 anos |
| **03** | ⚠️ A criar | Grid · Pesado | `post03_confianca.html` | Confiança — +8 anos · +700 projetos · Atendimento consultivo |
| **04** | ✅ Pronto | Editorial · Leve | `post04_solucoes.html` | Soluções — Solar · Híbrido · Lítio · Wallbox |
| **05** | ✅ Pronto | Carrossel · Pesado | `Post03_ApagaALuz.dc. - imagem html.html` | Apaga a luz! (nostalgia anos 90/2000) |
| **06** | ✅ Pronto | Hero · Pesado | `post06_apagao OK.html` | Apagão — você só percebe o valor quando acaba |
| **07** | ✅ Pronto | Carrossel · Leve | `post04_on_grid_vs_hibrido OK.html` | On-Grid ou Híbrido? — comparativo educativo |
| **08** | ✅ Pronto | Carrossel · Pesado | `post05_carro_eletrico_bateria_litio - fazer carrossel html.html` | Por que montadoras escolheram o lítio? |
| **09** | ✅ Pronto | Hero · Leve | `post07_energia_solar OK.html` | Energia Solar — melhor investimento no telhado |
| **10** | ✅ Pronto | Editorial · Pesado | `post08_sistema_hibrido- OK.html` | Sistema Híbrido — sua casa não precisa ficar no escuro |
| **11** | ✅ Pronto | Hero · Leve | `post09_independencia_energetica ok. html.html` | Independência energética — quanto depende da concessionária? |
| **12** | ✅ Pronto | Tipografia · Pesado | `post10_bateria_residencial - MUDAR OVERLAY.html` | Bateria residencial — energia vale quando continua disponível |
| **13** | ✅ Pronto | Hero · Leve | `post11_wallbox OK.html` | Wallbox Solar — dirija com a energia do seu telhado |
| **14** | ✅ Pronto | Tipografia · Pesado | `post12_casa_inteligente - TROCAR FOTO.html` | Casa inteligente — não economiza, administra energia |
| **15** | ✅ Pronto | Carrossel · Leve | `post15_como_trabalhamos.html` | Como trabalhamos — 5 etapas do diagnóstico ao pós-venda |

### Atenção: Post 03 está faltando

O arquivo `post03_confianca.html` ainda não existe. Estratégia sugerida:
- Publique 01 → 02 → **pule para 04** → crie o 03 e intercale assim que ficar pronto
- Conteúdo do post 03: Grid com números grandes. Copy: "+8 anos de experiência · +700 projetos homologados · Atendimento consultivo · Projetos personalizados"

---

## Por que esta ordem?

### Capítulo 1 — Quem somos (posts 01–04)
O visitante precisa entender **quem é a LumenGrid** antes de qualquer produto.
- Post 01: Posicionamento. O que acreditamos.
- Post 02: Trajetória. De onde viemos.
- Post 03: Prova social. Por que confiar.
- Post 04: Portfólio. O que fazemos.

### Capítulo 2 — O futuro da energia (posts 05–08)
Criar desejo e educação antes de apresentar soluções.
- Post 05: Nostalgia — cria conexão emocional
- Post 06: Problema — apagão como gatilho
- Post 07: Educação — On-Grid vs Híbrido
- Post 08: Tendência — lítio como referência

### Capítulo 3 — As soluções (posts 09–15)
Apresentar cada tecnologia sem parecer catálogo.
- Post 09: Solar (entrada)
- Post 10: Híbrido (upgrade)
- Post 11: Independência (resultado)
- Post 12: Bateria (tecnologia)
- Post 13: Wallbox (inovação)
- Post 14: Casa inteligente (visão de futuro)
- Post 15: Processo (como viramos realidade)

---

## Regras do feed — nunca quebrar

1. **Nunca repetir o mesmo layout em posts consecutivos**
2. **Sempre alternar o peso visual** — pesado → leve → pesado → leve
3. **Variar posição do texto** — nunca dois posts seguidos com headline no mesmo lugar
4. **Carrosseis interrompem sequências** — funciona como respiro na grade

### Sequência de layouts (validada)
```
TIPOGRAFIA pesado → CARROSSEL leve → GRID pesado → EDITORIAL leve
→ CARROSSEL pesado → HERO pesado → CARROSSEL leve → CARROSSEL pesado
→ HERO leve → EDITORIAL pesado → HERO leve → TIPOGRAFIA pesado
→ HERO leve → TIPOGRAFIA pesado → CARROSSEL leve
```

---

## Vocabulário visual

| Tipo | Quando usar |
|---|---|
| **TIPOGRAFIA** | Manifesto, frases de impacto, conceitos poderosos |
| **HERO** | Foto full-bleed + narrativa emocional |
| **EDITORIAL** | Conteúdo educativo, comparações, dois campos visuais |
| **GRID** | Stats, soluções, features em grelha |
| **CARROSSEL** | Histórias longas, educação passo a passo |

---

## Padrão de texto — obrigatório em todos os posts

| Elemento | Tamanho | Fonte | Peso |
|---|---|---|---|
| Eyebrow (label) | 16px | DM Sans | 600 · uppercase · letter-spacing 3px |
| Headline (h1) | 52–76px | Space Grotesk | 700–800 |
| Body / subtítulo | 24px | DM Sans | 300 · max-width 560px · line-height 1.70 |

---

## Notas de produção

- Template A (posts ímpares): sem moldura, narrativo/emocional
- Template B (posts pares): moldura laranja `inset:24px; border:4px solid rgba(242,101,34,0.65)`
- Logo padrão: `height:58px` + solar glow
- Fontes: Space Grotesk (headlines) · DM Sans (corpo)
- Cores: `#F26522` laranja · `#0a0a10` fundo · `#FAFAFA` branco
- Ícones: sempre CSS/SVG — nunca emojis
