#!/usr/bin/env python3
"""
LumenGrid — Gerador de Posts para Instagram
Uso: python3 gerador_posts.py              # modo interativo (1 post por vez)
     python3 gerador_posts.py --batch      # modo batch (3 posts)
     python3 gerador_posts.py --batch 5    # modo batch (5 posts)
"""

import anthropic
import argparse
import os
import re
from datetime import datetime

# ─── Pastas ────────────────────────────────────────────────────────────────────
PASTA_SCRIPTS    = os.path.dirname(os.path.abspath(__file__))
PASTA_INSTAGRAM  = os.path.dirname(PASTA_SCRIPTS)
PASTA_POSTS      = os.path.join(PASTA_INSTAGRAM, "POSTS PARA POSTAR")
PASTA_IMAGENS_LOCAL  = os.path.join(PASTA_SCRIPTS, "imagens")
PASTA_IMAGENS_GLOBAL = os.path.join(PASTA_INSTAGRAM, "..", "imagens")   # LUMENGRID/imagens/
GUIA_DESIGN_MD   = os.path.join(PASTA_INSTAGRAM, "GUIA_DESIGN_POSTS.md")
LEGENDAS_MD      = os.path.join(PASTA_INSTAGRAM, "legendas.md")
EXTENSOES_IMAGEM = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"}


def listar_imagens_dir(pasta: str, path_prefix: str) -> list[str]:
    """Retorna lista de 'path_prefix/arquivo' para imagens em subpastas."""
    if not os.path.isdir(pasta):
        return []
    resultado = []
    for raiz, dirs, arquivos in os.walk(pasta):
        dirs.sort()
        for arquivo in sorted(arquivos):
            if os.path.splitext(arquivo)[1].lower() in EXTENSOES_IMAGEM:
                rel = os.path.relpath(os.path.join(raiz, arquivo), pasta)
                resultado.append(f"{path_prefix}/{rel}")
    return resultado


def montar_lista_imagens() -> str:
    """Lê as pastas em tempo real e monta o bloco de imagens para o prompt."""
    # Paths relativos ao HTML salvo em POSTS PARA POSTAR/ (dois níveis acima = LUMENGRID/)
    locais  = listar_imagens_dir(PASTA_IMAGENS_LOCAL,  "imagens")
    globais = listar_imagens_dir(PASTA_IMAGENS_GLOBAL, "../../imagens")

    linhas = []
    if locais:
        linhas.append("Pasta local 'imagens/' (dentro da pasta INSTAGRAM LUMENGRID):")
        linhas += [f"  - {p}" for p in locais]
    if globais:
        linhas.append("Pasta geral '../../imagens/' (acervo completo da marca LumenGrid):")
        linhas += [f"  - {p}" for p in globais]
    if not linhas:
        linhas.append("  (nenhuma imagem encontrada — use apenas fundos sólidos)")

    return "\n".join(linhas)


# ─── Guia de marca da LumenGrid ───────────────────────────────────────────────
def montar_brand_guide() -> str:
    return """
IDENTIDADE VISUAL — LUMENGRID
==============================

MARCA:
- Nome: LumenGrid
- Slogan: Energia Inteligente
- Serviços: Energia Solar (On-Grid), Sistema Híbrido com Baterias, Carregador para Carro Elétrico (Wallbox)

CORES:
- Laranja principal: #F26522
- Laranja escuro: #C94E0F
- Fundo base: #161616 (quase preto — nunca preto puro #000)
- Texto principal: #FAFAFA
- Texto secundário: rgba(250,250,250,0.65) a rgba(250,250,250,0.75) — nunca branco puro
- Glow laranja sutil (slides sem foto): radial-gradient ellipse rgba(242,101,34,0.14–0.16)

TIPOGRAFIA:
- Títulos/headline: Space Grotesk, weight 600–700, letter-spacing negativo
- Corpo/Descrições: DM Sans, weight 300–500
- Fontes via Google Fonts CDN

TAMANHOS FIXOS:
- Logo wordmark: "LUMEN" laranja + "GRID" branco, Space Grotesk weight 800, 27px, uppercase
- Tagline da marca: "ENERGIA INTELIGENTE", DM Sans weight 600, 8px, letter-spacing 0.3em, laranja 85% opacidade
- Eyebrow tag (ex: "▶ energia inteligente"): 17px, uppercase, letter-spacing 3px, laranja 95% opacidade — presente em TODO slide, Y fixo ~150–170px do topo
- Headline de impacto: 48–80px, Space Grotesk 700
- Sub-headline: 34–44px, Space Grotesk 700, laranja
- Texto de apoio: 32–34px, DM Sans weight 400–500, opacidade mínima 0.80
- CTA final: 30px, DM Sans weight 500–600, laranja

LOGO (posição fixa em todos os slides):
- Topo-esquerda, 72px do topo, 88px da margem lateral
- Ícone: ../../imagens/LOGOS/logo-icone.png (height 58px, filter: drop-shadow(0 0 18px rgba(242,101,34,0.80)) drop-shadow(0 0 7px rgba(242,101,34,0.55)) drop-shadow(0 2px 10px rgba(0,0,0,0.9)))
- Wordmark ao lado: "LUMEN" laranja + "GRID" branco, ambos Space Grotesk 800 27px uppercase
- Tagline abaixo: "ENERGIA INTELIGENTE", DM Sans 600 8px, letter-spacing 0.3em, laranja 90%

REGRAS VISUAIS:
- SEM cantos decorativos, SEM faixa laranja no rodapé
- Slides com foto: imagem de fundo + gradiente escuro (rgba(10,10,16,...)) mais forte nas bordas com texto
- Slides sem foto (quote/insight): fundo sólido #161616 com glow laranja sutil centralizado
- Overlay nos slides com foto: topo nunca ultrapassar rgba(0,0,0,0.30) — a foto precisa aparecer
- Overlay padrão: linear-gradient(to bottom, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.10) 30%, rgba(0,0,0,0.45) 60%, rgba(0,0,0,0.82) 100%)
- Indicador de progresso: 4 pontinhos no canto inferior direito, 48px da borda — ponto ativo em #F26522
- Margem lateral de conteúdo: 88px
- CAPA (slide 1): NUNCA usar moldura laranja
- Slides internos: moldura opcional (inset:24px; border:4px solid rgba(242,101,34,0.65))

RITMO DO CARROSSEL (4 slides):
1. Hook — frase de efeito/provocativa + contexto rápido (geralmente com foto de fundo)
2. Desenvolvimento — lista ou detalhamento do gancho (pode ter foto de fundo)
3. Insight/virada — mensagem central da marca, fundo sólido, frase quotável grande ("save-worthy")
4. CTA — pergunta direta + convite claro para comentar/salvar/compartilhar (geralmente com foto de fundo)

RITMO VISUAL ENTRE SLIDES — OBRIGATÓRIO:
- Variar alinhamento: esquerda, direita e centro — nunca todos iguais
- Variar posição do texto: alternar entre topo, base e centro vertical
- Incluir ao menos 1 slide sem foto (fundo sólido)
- Variar peso do overlay e tamanho do headline entre slides

SUBTEXTO — ESTILO CRESCENTE (preferência):
"A energia deixou de ser consumo. / Virou estratégia. / Segurança. / Patrimônio."

IMAGENS DISPONÍVEIS (lidas em tempo real no momento da geração):
{{LISTA_IMAGENS}}

TOM DE VOZ:
- Confiante, moderno, acessível
- Foco em benefícios reais: economia, autonomia, segurança
- Evitar tecnicismo excessivo
- Emoji com moderação, só quando reforça o tom
""".replace("{{LISTA_IMAGENS}}", montar_lista_imagens())


# ─── System prompts ────────────────────────────────────────────────────────────
def montar_system_feed(brand_guide: str) -> str:
    return f"""Você é um designer especialista em social media para a marca LumenGrid.
Você gera carrosseis completos para o Feed do Instagram em HTML/CSS puro, prontos para abrir no browser.

{brand_guide}

REGRAS OBRIGATÓRIAS — FEED (carrossel 4:5):
1. Gere um HTML COMPLETO e válido (<!DOCTYPE html> ... </html>)
2. O layout exibe todos os slides lado a lado: display:flex; gap:36px; padding:44px; overflow-x:auto
3. Cada slide: width:1080px; height:1350px; flex-shrink:0 (formato 4:5 — o correto para Feed)
4. O body deve ter background:#161616
5. Sempre inclua as fontes Space Grotesk e DM Sans via Google Fonts
6. Sempre inclua o logo no topo-esquerda de TODOS os slides (posição e tamanho fixos conforme o guia)
7. Sempre inclua o eyebrow tag em todos os slides (~150–170px do topo)
8. Sempre inclua indicador de progresso (4 pontinhos) no canto inferior direito de cada slide
9. Use apenas imagens listadas no guia acima, com o path exato indicado (relativo ao arquivo gerado)
10. Aplique overlay escuro em todos os slides com foto de fundo
11. Siga o ritmo de 4 slides: Hook → Desenvolvimento → Insight → CTA
12. SEM cantos decorativos, SEM faixa laranja no rodapé
13. Retorne APENAS o código HTML, sem explicações, sem markdown, sem ```html

VARIAÇÕES DE LAYOUT POR SLIDE:
- Hook: foto de fundo + overlay gradiente + headline grande — texto pode ser base ou centro
- Desenvolvimento: foto de fundo + lista numerada — texto alinhado diferente do slide anterior
- Insight: fundo sólido #161616 com glow laranja sutil + frase grande centralizada (save-worthy)
- CTA: foto de fundo + headline + convite para compartilhar/salvar
"""


def montar_system_story(brand_guide: str) -> str:
    return f"""Você é um designer especialista em social media para a marca LumenGrid.
Você gera Stories para o Instagram em HTML/CSS puro, prontos para abrir no browser.

{brand_guide}

REGRAS OBRIGATÓRIAS — STORY (9:16):
1. Gere um HTML COMPLETO e válido (<!DOCTYPE html> ... </html>)
2. UM único slide: width:1080px; height:1920px (formato 9:16 — tela cheia no Story)
3. O body deve ter background:#161616 e centralizar o slide
4. ZONA SEGURA OBRIGATÓRIA: nenhum texto ou elemento importante abaixo de 1670px (250px do fundo ficam sob a UI do Instagram) nem acima de 200px do topo
5. Sempre inclua as fontes Space Grotesk e DM Sans via Google Fonts
6. Sempre inclua o logo no topo-esquerda (topo: 120px, lateral: 88px)
7. Aplique overlay escuro em fotos de fundo para garantir legibilidade
8. Use apenas imagens listadas no guia acima, com o path exato indicado (relativo ao arquivo gerado)
9. CTA claro e direto: "Link na bio", "Arraste para cima" ou chamada para ação
10. Textos grandes (mínimo 36px para corpo, headline 80–100px) — Story é consumido rápido
11. SEM cantos decorativos, SEM faixa laranja no rodapé
12. Retorne APENAS o código HTML, sem explicações, sem markdown, sem ```html

ESTRUTURA TÍPICA DO STORY:
- Fundo: foto de fundo ou sólido #161616 com glow laranja
- Logo no topo
- Eyebrow tag (~280px do topo)
- Headline grande e impactante no centro
- Subtítulo/complemento
- CTA na zona segura inferior (~1500–1620px do topo)
"""


def _chamar_api(system: str, user_content: str, max_tokens: int = 8000) -> str:
    """Chama a API do Claude com streaming e retorna o texto."""
    client = anthropic.Anthropic()
    with client.messages.stream(
        model="claude-opus-4-6",
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user_content}]
    ) as stream:
        resultado = ""
        for text in stream.text_stream:
            resultado += text
            print(".", end="", flush=True)
    print(" ✓")
    return resultado


def _chamar_api_simples(prompt: str, max_tokens: int = 2000) -> str:
    """Chama a API sem system prompt (para análise e sugestões)."""
    client = anthropic.Anthropic()
    with client.messages.stream(
        model="claude-opus-4-6",
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}]
    ) as stream:
        resultado = ""
        for text in stream.text_stream:
            resultado += text
            print(".", end="", flush=True)
    print(" ✓")
    return resultado


def gerar_feed(tema: str) -> str:
    """Gera carrossel de Feed (1080x1350, 4:5). Lê imagens em tempo real."""
    print(f"\n  Gerando Feed (1080x1350)...", end="", flush=True)
    brand_guide = montar_brand_guide()
    return _chamar_api(
        montar_system_feed(brand_guide),
        f"""Crie um carrossel de Feed para Instagram (4 slides, 1080×1350px cada) sobre o tema:

TEMA: {tema}

Escolha as imagens do acervo listado no guia que melhor se encaixam no tema e no ritmo do carrossel.
Pense nos benefícios reais para o cliente e comunique de forma impactante.
Retorne apenas o HTML completo, sem nenhum texto adicional."""
    )


def gerar_story(tema: str) -> str:
    """Gera Story (1080x1920, 9:16). Lê imagens em tempo real."""
    print(f"\n  Gerando Story (1080x1920)...", end="", flush=True)
    brand_guide = montar_brand_guide()
    return _chamar_api(
        montar_system_story(brand_guide),
        f"""Crie um Story para Instagram (1080×1920px) sobre o tema:

TEMA: {tema}

Use a mesma linha criativa do tema, mas adapte para o formato vertical de tela cheia.
Escolha a imagem do acervo listado no guia que melhor se encaixa.
Texto grande, impacto imediato, CTA claro.
Retorne apenas o HTML completo, sem nenhum texto adicional."""
    )


def _limpar_html(html: str) -> str:
    """Remove wrapper de markdown se o modelo incluiu."""
    html = re.sub(r'^```html\s*', '', html.strip())
    html = re.sub(r'\s*```$', '', html.strip())
    return html


# ─── Funções de batch ──────────────────────────────────────────────────────────

def ler_posts_existentes() -> dict:
    """Lê o log de posts do GUIA_DESIGN_POSTS.md e analisa a pasta POSTS PARA POSTAR/."""
    resultado = {
        "posts_publicados": [],
        "posts_aguardando": [],
        "ultimo_numero": 0,
        "posts_aguardando_pasta": 0,
    }

    # 1. Lê a tabela de log do GUIA
    if os.path.isfile(GUIA_DESIGN_MD):
        with open(GUIA_DESIGN_MD, encoding='utf-8') as f:
            conteudo = f.read()

        in_log = False
        for linha in conteudo.splitlines():
            if "## Log de posts" in linha:
                in_log = True
                continue
            if in_log:
                if linha.startswith("| ") and "|---" not in linha and "| Post" not in linha:
                    partes = [p.strip() for p in linha.split("|") if p.strip()]
                    if len(partes) >= 4:
                        num_str, _arquivo, tema, status = partes[0], partes[1], partes[2], partes[3]
                        m = re.match(r'^(\d+)', num_str)
                        num = int(m.group(1)) if m else 0
                        if num > resultado["ultimo_numero"]:
                            resultado["ultimo_numero"] = num
                        info = {"num": num, "tema": tema, "status": status}
                        if "✅" in status or ("publicado" in status and "não" not in status and "nao" not in status):
                            resultado["posts_publicados"].append(info)
                        else:
                            resultado["posts_aguardando"].append(info)
                elif in_log and linha.startswith("## ") and "Log" not in linha:
                    break

    # 2. Verifica arquivos numerados em POSTS PARA POSTAR/
    if os.path.isdir(PASTA_POSTS):
        htmls = [f for f in os.listdir(PASTA_POSTS)
                 if f.endswith('.html') and not f.endswith('_story.html')
                 and not f.startswith('.')]
        resultado["posts_aguardando_pasta"] = len(htmls)
        for f in htmls:
            m = re.match(r'post(\d+)_', f)
            if m:
                n = int(m.group(1))
                if n > resultado["ultimo_numero"]:
                    resultado["ultimo_numero"] = n

    return resultado


def sugerir_temas(n: int, contexto: dict) -> list[dict]:
    """Chama a API para sugerir N temas estratégicos baseados no feed atual."""
    publicados = contexto["posts_publicados"]
    aguardando = contexto["posts_aguardando"]

    temas_publicados = "\n".join(f"  - {p['tema']}" for p in publicados) or "  (nenhum registrado)"
    temas_aguardando = "\n".join(f"  - {p['tema']}" for p in aguardando) or "  (nenhum)"

    mes = datetime.now().month
    if mes in (12, 1, 2):
        estacao = "verão (sol forte, ideal para solar residencial e empresarial)"
    elif mes in (3, 4, 5):
        estacao = "outono (transição, reforçar autonomia energética)"
    elif mes in (6, 7, 8):
        estacao = "inverno (foco em backup, híbrido, autonomia noturna)"
    else:
        estacao = "primavera (início de ano, planejamento, reformas)"

    prompt = f"""Você é estrategista de conteúdo para a LumenGrid, empresa de energia solar e híbrida no Brasil.

POSTS JÁ PUBLICADOS (evite repetir esses temas):
{temas_publicados}

POSTS AGUARDANDO PUBLICAÇÃO (evite repetir esses temas também):
{temas_aguardando}

CONTEXTO SAZONAL: {estacao}

VOCABULÁRIO VISUAL — escolha o mais adequado para cada tema:
- HERO pesado: foto full-bleed + narrativa emocional forte (impacto máximo)
- HERO leve: foto + copy mais informativa
- EDITORIAL: conteúdo educativo, comparações, dois campos visuais
- TIPOGRAFIA: manifesto, frases de impacto, fundo sólido
- CARROSSEL leve: educação passo a passo

SERVIÇOS DA LUMENGRID:
- Energia Solar On-Grid (economia na conta de luz)
- Sistema Híbrido com Baterias (autonomia, backup, independência)
- Wallbox — Carregador para Carro Elétrico com energia solar

Sugira {n} temas NOVOS e estratégicos para posts de Feed do Instagram.
Alterne os tipos de layout — nunca dois HERO seguidos.
Temas devem ser relevantes para a sazonalidade e gerar engajamento.

RESPONDA APENAS no formato abaixo, sem explicações, sem numeração extra:
TEMA 1: [título do tema] | LAYOUT: [tipo]
TEMA 2: [título do tema] | LAYOUT: [tipo]
(continue até TEMA {n})"""

    print(f"\n  Sugerindo {n} temas estratégicos", end="", flush=True)
    return _parse_temas(_chamar_api_simples(prompt, max_tokens=800))


def _parse_temas(texto: str) -> list[dict]:
    """Extrai lista de temas da resposta da API."""
    temas = []
    for linha in texto.strip().splitlines():
        m = re.match(r'TEMA \d+:\s*(.+?)\s*\|\s*LAYOUT:\s*(.+)', linha)
        if m:
            temas.append({"tema": m.group(1).strip(), "layout": m.group(2).strip()})
    return temas


def gerar_photo_brief(tema: str, html: str) -> str:
    """Analisa o HTML gerado e produz um briefing de direção de fotografia."""
    # Extrai referências de imagens no HTML
    refs = re.findall(r'url\(["\']?([^"\')\s]+)["\']?\)', html)
    refs += re.findall(r'src=["\']([^"\']+)["\']', html)
    imagens_usadas = sorted(set(
        i for i in refs if any(ext in i.lower() for ext in EXTENSOES_IMAGEM)
    ))

    lista_acervo = montar_lista_imagens()

    prompt = f"""Você é diretor de fotografia e criativo da LumenGrid.

TEMA DO POST: {tema}

IMAGENS REFERENCIADAS NO HTML GERADO:
{chr(10).join('  - ' + i for i in imagens_usadas) if imagens_usadas else '  (nenhuma encontrada)'}

ACERVO DISPONÍVEL (paths relativos ao arquivo HTML em POSTS PARA POSTAR/):
{lista_acervo}

Analise os 4 slides do carrossel e para cada um descreva a necessidade de foto:

## Slide 1 — Hook
- **Tipo**: [tipo de imagem necessária]
- **Acervo**: ✅ TEMOS → `caminho/exato.png` | ❌ NÃO TEMOS → [descrição da foto ideal para produzir ou buscar]
- **Mood**: [iluminação, ângulo, sensação desejada]

(repita para Slide 2 — Desenvolvimento, Slide 3 — Insight, Slide 4 — CTA)

Ao final, adicione uma seção:
## Resumo de produção
- Fotos que temos: [lista]
- Fotos a providenciar: [lista com descrição]"""

    print(f"\n  Gerando briefing de fotos", end="", flush=True)
    return _chamar_api_simples(prompt, max_tokens=1500)


def gerar_legenda(tema: str) -> str:
    """Gera legenda completa do Instagram para o post."""
    prompt = f"""Você é copywriter da LumenGrid, empresa de energia solar e híbrida no Brasil.

TEMA DO POST: {tema}

TOM DE VOZ:
- Confiante, moderno, acessível
- Foco em benefícios reais: economia, autonomia, segurança
- Linhas curtas com clímax crescente
- Emoji com moderação (máximo 3-4 por legenda)
- Terminar com pergunta ou CTA para comentários/DM

Crie a legenda completa para Instagram:
1. Hook (1-2 linhas de abertura impactantes)
2. Desenvolvimento (3-5 linhas curtas com a mensagem central)
3. CTA (1 linha — pergunta ou convite para comentar/salvar/compartilhar)
4. Hashtags (12-15 hashtags relevantes: misture específicos e gerais)

Retorne apenas a legenda pronta, sem comentários ou explicações."""

    print(f"\n  Gerando legenda", end="", flush=True)
    return _chamar_api_simples(prompt, max_tokens=800)


def salvar_post(html: str, tema: str, numero: int, sufixo: str = "", pasta: str = None) -> str:
    """Salva o HTML gerado em POSTS PARA POSTAR/ (ou pasta especificada)."""
    if pasta is None:
        pasta = PASTA_POSTS
    os.makedirs(pasta, exist_ok=True)
    slug = re.sub(r'[^a-zA-Z0-9_]', '_', tema.lower())[:40]
    slug = re.sub(r'_+', '_', slug).strip('_')
    filename = f"post{numero:02d}_{slug}{sufixo}.html"
    filepath = os.path.join(pasta, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(html)
    return filepath


def salvar_brief(conteudo: str, filepath_html: str) -> str:
    """Salva o briefing de fotos como _FOTOS.md ao lado do HTML."""
    filepath = filepath_html.replace('.html', '_FOTOS.md')
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(f"# Briefing de Fotos\n\n")
        f.write(conteudo)
    return filepath


def _salvar_legenda(legenda: str, tema: str, numero: int) -> None:
    """Appenda a legenda ao legendas.md."""
    with open(LEGENDAS_MD, 'a', encoding='utf-8') as f:
        f.write(f"\n---\n\n## Post {numero:02d} — {tema}\n\n{legenda}\n")


def _proximo_numero() -> int:
    """Determina o próximo número de post olhando GUIA + POSTS PARA POSTAR/."""
    ultimo = 0
    if os.path.isfile(GUIA_DESIGN_MD):
        with open(GUIA_DESIGN_MD, encoding='utf-8') as f:
            for linha in f:
                m = re.match(r'\|\s*(\d+)[a-z]?\s*\|', linha)
                if m:
                    n = int(m.group(1))
                    if n > ultimo:
                        ultimo = n
    if os.path.isdir(PASTA_POSTS):
        for f in os.listdir(PASTA_POSTS):
            m = re.match(r'post(\d+)_', f)
            if m:
                n = int(m.group(1))
                if n > ultimo:
                    ultimo = n
    return ultimo + 1


# ─── Modo batch ───────────────────────────────────────────────────────────────

def main_batch(n: int = 3):
    print("=" * 55)
    print("  LUMENGRID — Gerador de Posts (Modo Batch)")
    print("=" * 55)
    print()

    # 1. Lê contexto atual
    print("  Analisando feed atual...")
    ctx = ler_posts_existentes()
    total_aguardando = len(ctx["posts_aguardando"]) + ctx["posts_aguardando_pasta"]
    print(f"    Posts publicados : {len(ctx['posts_publicados'])}")
    print(f"    Posts aguardando : {total_aguardando}")
    proximo_num = ctx["ultimo_numero"] + 1

    # 2. Sugere temas
    temas = sugerir_temas(n, ctx)

    if not temas:
        print("\n  Nao foi possivel sugerir temas. Tente novamente.")
        return

    print(f"\n  Temas sugeridos:")
    for i, t in enumerate(temas, 1):
        print(f"    {i}. \"{t['tema']}\" ({t['layout']})")

    print()
    resp = input("  Aceitar temas? (s/n/editar): ").strip().lower()

    if resp in ('n', 'nao', 'não', 'no'):
        print("\n  Operacao cancelada.\n")
        return

    if resp in ('e', 'editar', 'edit'):
        for i, t in enumerate(temas):
            novo = input(f"    Tema {i+1} [{t['tema']}]: ").strip()
            if novo:
                temas[i]["tema"] = novo

    # 3. Gera cada post
    gerados = 0
    for i, tema_info in enumerate(temas):
        tema = tema_info["tema"]
        num = proximo_num + i

        print(f"\n{'─' * 55}")
        print(f"  Gerando Post {num:02d} — {tema}")

        try:
            html_feed = gerar_feed(tema)
            html_feed = _limpar_html(html_feed)

            if '<!DOCTYPE' not in html_feed and '<html' not in html_feed:
                print(f"  Resposta inesperada. Pulando este tema.")
                continue

            path_feed = salvar_post(html_feed, tema, num)
            rel = os.path.relpath(path_feed, PASTA_INSTAGRAM)
            print(f"\n  Feed salvo    : {rel}")

            brief = gerar_photo_brief(tema, html_feed)
            path_brief = salvar_brief(brief, path_feed)
            print(f"  Briefing salvo: {os.path.basename(path_brief)}")

            # Exibe resumo de acervo do briefing
            for linha in brief.splitlines():
                if linha.startswith("## Slide") or "Acervo" in linha:
                    print(f"    {linha.strip()}")

            legenda = gerar_legenda(tema)
            _salvar_legenda(legenda, tema, num)
            print(f"  Legenda       : adicionada a legendas.md")

            gerados += 1

        except anthropic.AuthenticationError:
            print("\n  API Key invalida.")
            print("  Configure: export ANTHROPIC_API_KEY='sua-chave'")
            return
        except Exception as e:
            print(f"\n  Erro ao gerar '{tema}': {e}")
            continue

    print(f"\n{'=' * 55}")
    print(f"  Batch concluido. {gerados}/{len(temas)} posts gerados.")
    print(f"  Pasta: POSTS PARA POSTAR/")
    print()


# ─── Modo interativo ──────────────────────────────────────────────────────────

def main_interativo():
    print("=" * 55)
    print("  LUMENGRID — Gerador de Posts para Instagram")
    print("  Feed: 1080x1350px (4:5) | Story: 1080x1920px (9:16)")
    print("=" * 55)
    print()
    print("Exemplos de temas:")
    print("  • '90% de economia na conta de luz'")
    print("  • 'Sistema híbrido com baterias — energia à noite'")
    print("  • 'Carregue seu carro elétrico com energia solar'")
    print("  • 'Por que instalar agora e não depois?'")
    print("  • '5 motivos para escolher energia solar'")
    print()

    proximo_num = _proximo_numero()

    while True:
        print("─" * 55)
        tema = input(f"  Tema do Post #{proximo_num:02d} (ou 'sair'): ").strip()

        if not tema or tema.lower() in ('sair', 'exit', 'quit', 'q'):
            print("\n  Ate logo!\n")
            break

        try:
            # ── Feed (sempre gerado) ──────────────────────────────────────
            html_feed = gerar_feed(tema)
            html_feed = _limpar_html(html_feed)

            if '<!DOCTYPE' not in html_feed and '<html' not in html_feed:
                print("  Resposta inesperada no Feed. Tente novamente.")
                continue

            path_feed = salvar_post(html_feed, tema, proximo_num)
            rel = os.path.relpath(path_feed, PASTA_INSTAGRAM)
            print(f"\n  Feed salvo: {rel}")

            resp_abrir = input("  Abrir Feed no browser? (s/n): ").strip().lower()
            if resp_abrir in ('s', 'sim', 'y', 'yes', ''):
                os.system(f'open "{path_feed}"')

            # ── Story (opcional) ──────────────────────────────────────────
            resp_story = input("\n  Gerar versao Story (9:16) tambem? (s/n): ").strip().lower()
            if resp_story in ('s', 'sim', 'y', 'yes'):
                html_story = gerar_story(tema)
                html_story = _limpar_html(html_story)

                if '<!DOCTYPE' not in html_story and '<html' not in html_story:
                    print("  Resposta inesperada no Story. Pulando.")
                else:
                    path_story = salvar_post(html_story, tema, proximo_num, sufixo="_story")
                    rel_story = os.path.relpath(path_story, PASTA_INSTAGRAM)
                    print(f"\n  Story salvo: {rel_story}")

                    resp_abrir_story = input("  Abrir Story no browser? (s/n): ").strip().lower()
                    if resp_abrir_story in ('s', 'sim', 'y', 'yes', ''):
                        os.system(f'open "{path_story}"')

            proximo_num += 1

        except anthropic.AuthenticationError:
            print("\n  API Key invalida.")
            print("  Configure: export ANTHROPIC_API_KEY='sua-chave'")
            break
        except Exception as e:
            print(f"\n  Erro: {e}")
            print("  Tente novamente.\n")


# ─── Entry point ──────────────────────────────────────────────────────────────

def main(batch=None):
    """Entry point reutilizável (batch=None → interativo, batch=N → lote)."""
    if batch is not None:
        main_batch(batch)
    else:
        main_interativo()


if __name__ == "__main__":
    # Argparse primeiro — para que --help funcione sem API key
    _parser = argparse.ArgumentParser(
        prog="gerador_posts.py",
        description="LumenGrid — Gerador de Posts para Instagram",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""exemplos:
  python3 gerador_posts.py              modo interativo (1 post por vez)
  python3 gerador_posts.py --batch      modo batch (3 posts)
  python3 gerador_posts.py --batch 5    modo batch (5 posts)
        """
    )
    _parser.add_argument(
        "--batch", nargs="?", const=3, type=int, metavar="N",
        help="gera N posts em lote com temas sugeridos automaticamente (padrao: 3)"
    )
    _args = _parser.parse_args()

    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("ANTHROPIC_API_KEY nao configurada.")
        print("Execute: export ANTHROPIC_API_KEY='sua-chave-aqui'")
        exit(1)

    if _args.batch is not None:
        main_batch(_args.batch)
    else:
        main_interativo()
