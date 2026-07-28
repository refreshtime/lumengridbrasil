#!/usr/bin/env python3
"""
LumenGrid — Gerador de Posts para Instagram
Uso: python3 gerador_posts.py

Gera carrossel de Feed (1080x1350, 4:5) e opcionalmente Story (1080x1920, 9:16).
"""

import anthropic
import os
import re

# ─── Pastas de imagens ─────────────────────────────────────────────────────────
PASTA_RAIZ = os.path.dirname(os.path.abspath(__file__))
PASTA_IMAGENS_LOCAL  = os.path.join(PASTA_RAIZ, "imagens")          # INSTAGRAM LUMENGRID/imagens/
PASTA_IMAGENS_GLOBAL = os.path.join(PASTA_RAIZ, "..", "imagens")    # LUMENGRID/imagens/
EXTENSOES_IMAGEM = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"}

def listar_imagens(pasta: str, path_prefix: str) -> list[str]:
    """Retorna lista de strings 'path_prefix/arquivo — nome legível'."""
    if not os.path.isdir(pasta):
        return []
    arquivos = sorted([
        f for f in os.listdir(pasta)
        if os.path.splitext(f)[1].lower() in EXTENSOES_IMAGEM
    ])
    return [f"{path_prefix}/{f}" for f in arquivos]

def montar_lista_imagens() -> str:
    """Lê as pastas em tempo real e monta o bloco de imagens para o prompt."""
    locais  = listar_imagens(PASTA_IMAGENS_LOCAL,  "imagens")
    globais = listar_imagens(PASTA_IMAGENS_GLOBAL, "../imagens")

    linhas = []
    if locais:
        linhas.append("Pasta local 'imagens/' (dentro da pasta INSTAGRAM LUMENGRID):")
        linhas += [f"  - {p}" for p in locais]
    if globais:
        linhas.append("Pasta geral '../imagens/' (acervo completo da marca LumenGrid):")
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
- Texto secundário: rgba(250,250,250,0.55) a rgba(250,250,250,0.62) — nunca branco puro
- Glow laranja sutil (slides sem foto): radial-gradient ellipse rgba(242,101,34,0.14–0.16)

TIPOGRAFIA:
- Títulos/headline: Space Grotesk, weight 600–700, letter-spacing negativo
- Corpo/Descrições: DM Sans, weight 300–500
- Fontes via Google Fonts CDN

TAMANHOS FIXOS:
- Logo wordmark: "LUMEN" laranja + "GRID" branco, Space Grotesk weight 800, 27px, uppercase
- Tagline da marca: "ENERGIA INTELIGENTE", DM Sans weight 600, 8px, letter-spacing 0.3em, laranja 85% opacidade
- Eyebrow tag (ex: "▶ rewind anos 90"): 17px, uppercase, letter-spacing 3px, laranja 95% opacidade — presente em TODO slide, Y fixo ~150–170px do topo
- Headline de impacto: 56–76px, Space Grotesk 700
- Frase/citação secundária: 28–32px
- Texto de apoio: 20px fixo (nunca varie entre slides)
- CTA final: 26–28px, weight 500

LOGO (posição fixa em todos os slides):
- Topo-esquerda, 72px do topo, 88px da margem lateral
- Ícone: imagens/logo-icone.png (height 32px)
- Wordmark ao lado: "LUMEN" laranja + "GRID" branco, ambos Space Grotesk 800 27px uppercase
- Tagline abaixo: "ENERGIA INTELIGENTE", DM Sans 600 8px, letter-spacing 0.3em, laranja 90%

REGRAS VISUAIS:
- SEM cantos decorativos, SEM faixa laranja no rodapé — o conteúdo e gradiente sustentam a composição
- Slides com foto: imagem de fundo + gradiente escuro (rgba(10,10,16,...)) mais forte nas bordas com texto
- Slides sem foto (quote/insight): fundo sólido #161616 com glow laranja sutil centralizado
- Indicador de progresso: 4 pontinhos no canto inferior direito, 48px da borda — ponto ativo em #F26522
- Margem lateral de conteúdo: 88px
- Overlay nos slides com foto: sempre usar gradiente para garantir legibilidade do texto

RITMO DO CARROSSEL (4 slides):
1. Hook — frase de efeito/provocativa + contexto rápido (geralmente com foto de fundo)
2. Desenvolvimento — lista ou detalhamento do gancho (pode ter foto de fundo)
3. Insight/virada — mensagem central da marca, fundo sólido, frase quotável grande ("save-worthy")
4. CTA — pergunta direta + convite claro para comentar/salvar/compartilhar (geralmente com foto de fundo)

IMAGENS DISPONÍVEIS (lidas em tempo real no momento da geração):
{{LISTA_IMAGENS}}

TOM DE VOZ:
- Confiante, moderno, acessível
- Foco em benefícios reais: economia, autonomia, segurança
- Evitar tecnicismo excessivo
- Emoji com moderação, só quando reforça o tom
""".replace("{{LISTA_IMAGENS}}", montar_lista_imagens())

# ─── System prompts (gerados em tempo real com lista de imagens atualizada) ────
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
- Hook: foto de fundo + overlay gradiente + balão de fala ou headline grande
- Desenvolvimento: foto de fundo + lista numerada na parte inferior
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


def _chamar_api(system: str, user_content: str) -> str:
    """Chama a API do Claude com streaming e retorna o HTML."""
    client = anthropic.Anthropic()
    with client.messages.stream(
        model="claude-opus-4-6",
        max_tokens=8000,
        system=system,
        messages=[{"role": "user", "content": user_content}]
    ) as stream:
        html = ""
        for text in stream.text_stream:
            html += text
            print(".", end="", flush=True)
    print(" ✓")
    return html


def gerar_feed(tema: str) -> str:
    """Gera carrossel de Feed (1080x1350, 4:5). Lê imagens em tempo real."""
    print(f"\n  Gerando Feed (1080x1350)...")
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
    print(f"\n  Gerando Story (1080x1920)...")
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


def salvar_post(html: str, tema: str, numero: int, sufixo: str = "") -> str:
    """Salva o HTML gerado em arquivo."""
    slug = re.sub(r'[^a-zA-Z0-9_]', '_', tema.lower())[:40]
    slug = re.sub(r'_+', '_', slug).strip('_')
    filename = f"post{numero:02d}_{slug}{sufixo}.html"
    filepath = os.path.join(os.path.dirname(os.path.abspath(__file__)), filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(html)
    return filepath


def main():
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
    print("  • 'Apaga a luz — nostalgia de crescer pagando conta de energia'")
    print()

    # Descobre próximo número de post
    pasta = os.path.dirname(os.path.abspath(__file__))
    posts_existentes = [f for f in os.listdir(pasta) if re.match(r'post\d+_', f)]
    nums = [int(re.match(r'post(\d+)_', f).group(1)) for f in posts_existentes
            if re.match(r'post(\d+)_', f)]
    proximo_num = max(nums, default=0) + 1

    while True:
        print("─" * 55)
        tema = input(f"  Tema do Post #{proximo_num:02d} (ou 'sair'): ").strip()

        if not tema or tema.lower() in ('sair', 'exit', 'quit', 'q'):
            print("\n  Até logo!\n")
            break

        try:
            # ── Feed (sempre gerado) ──────────────────────────────────────────
            html_feed = gerar_feed(tema)
            html_feed = _limpar_html(html_feed)

            if '<!DOCTYPE' not in html_feed and '<html' not in html_feed:
                print("  Resposta inesperada no Feed. Tente novamente.")
                continue

            path_feed = salvar_post(html_feed, tema, proximo_num)
            print(f"\n  Feed salvo: {os.path.basename(path_feed)}")

            resp_abrir = input("  Abrir Feed no browser? (s/n): ").strip().lower()
            if resp_abrir in ('s', 'sim', 'y', 'yes', ''):
                os.system(f'open "{path_feed}"')

            # ── Story (opcional) ──────────────────────────────────────────────
            resp_story = input("\n  Gerar versao Story (9:16) tambem? (s/n): ").strip().lower()
            if resp_story in ('s', 'sim', 'y', 'yes'):
                html_story = gerar_story(tema)
                html_story = _limpar_html(html_story)

                if '<!DOCTYPE' not in html_story and '<html' not in html_story:
                    print("  Resposta inesperada no Story. Pulando.")
                else:
                    path_story = salvar_post(html_story, tema, proximo_num, sufixo="_story")
                    print(f"\n  Story salvo: {os.path.basename(path_story)}")

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


if __name__ == "__main__":
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("ANTHROPIC_API_KEY nao configurada.")
        print("Execute: export ANTHROPIC_API_KEY='sua-chave-aqui'")
        exit(1)
    main()
