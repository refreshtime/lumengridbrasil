# LUMENGRID — Instruções para Claude

## Estrutura do Projeto

```
LUMENGRID/
├── index.html              # Página inicial / landing
├── site.html               # Site principal
├── login.html              # Login do portal
├── portal.html             # Portal do cliente
├── dashboard.html          # Dashboard interno
├── CRM_LumenGrid.html      # CRM
├── solicitacoes.html       # Solicitações
├── indicacao.html          # Programa de indicação
├── margem.html             # Cálculo de margem
├── contrato.html           # Gerador de contratos
├── gerador.html            # Gerador solar (backup original)
├── gerador-solar-v2.html   # Gerador On-Grid v2
├── gerador-solar-v3.html   # Gerador On-Grid v3 (mais recente)
├── gerador-hibrido.html    # Gerador Híbrido
├── MANUAL_CRM.html
├── MANUAL_LUCAS.html
├── GUIA_DESIGN_LUMENGRID.html
├── CODIGOS GS/
│   ├── Codigo.gs           # Backend principal
│   ├── CRM_Codigo.gs
│   ├── PARCEIROS_Codigo.gs
│   ├── CONTRATOS_Codigo.gs
│   └── FINANCEIRO_Codigo.gs
├── FACEBOOK/
│   ├── facebook_perfil.html
│   ├── facebook_capa.html
│   └── facebook_pagina.html
├── INSTAGRAM LUMENGRID/
│   ├── POSTS/              # Posts sem imagem
│   └── POSTS COM IMAGENS - GPT/  # Posts com imagem gerada por IA
├── PARCEIROS/
│   ├── michael.html
│   └── jessica.html
├── propostas/
│   └── giovani.html
└── imagens/                # Assets visuais
```

## Regras Obrigatórias

- Todo arquivo HTML deve ter rodape "Feito por Domani Consultoria"
- Sempre que editar o frontend, verificar se o backend correspondente em `CODIGOS GS/` precisa ser atualizado
- Nunca sobrescrever `gerador.html` (é o backup original)

## Calculos do Gerador Solar

- **On-Grid:** R$ 3.500 / kWp, 65 kWh/placa/mes
- **Hibrido:** R$ 5.000 / kWp, minimo R$ 28.000, 65 kWh/placa/mes

## Geracao de PDF

- Usa `html2canvas` (scale: 2, allowTaint: true) + `jsPDF`

## Design

- Consultar `GUIA_DESIGN_LUMENGRID.html` para paleta de cores, tipografia e padroes visuais
- Posts Instagram: ver `INSTAGRAM LUMENGRID/GUIA_DESIGN_POSTS.md`
