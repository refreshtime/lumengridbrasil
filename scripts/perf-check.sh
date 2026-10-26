#!/bin/bash
# ═══════════════════════════════════════════════════════════
# LUMENGRID — PERFORMANCE CHECK (perf-check.sh)
# Executa antes de qualquer git push no projeto do site.
# Verifica imagens e padrões de HTML para manter PageSpeed.
# ═══════════════════════════════════════════════════════════

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"
ERRORS=0
WARNINGS=0

echo ""
echo "┌─────────────────────────────────────────┐"
echo "│  LumenGrid — Performance Check          │"
echo "└─────────────────────────────────────────┘"

# ── 1. IMAGENS STAGED COM TAMANHO EXCESSIVO ──────────────
echo ""
echo "▸ Verificando tamanho das imagens staged..."

MAX_KB=900  # limite em KB

while IFS= read -r file; do
  [[ "$file" =~ \.(png|jpg|jpeg|webp|gif)$ ]] || continue
  [[ -f "$ROOT/$file" ]] || continue

  size_kb=$(du -k "$ROOT/$file" | cut -f1)
  if [ "$size_kb" -gt "$MAX_KB" ]; then
    echo "  ✗ ERRO: $file (${size_kb}KB > ${MAX_KB}KB limite)"
    echo "    → Execute: sips -Z 900 \"$ROOT/$file\""
    ERRORS=$((ERRORS + 1))
  else
    echo "  ✓ OK: $file (${size_kb}KB)"
  fi
done < <(git diff --cached --name-only)

# ── 2. IMAGENS SEM DIMENSÕES (width/height ausentes) ─────
echo ""
echo "▸ Verificando <img> sem width/height nos HTMLs staged..."

while IFS= read -r file; do
  [[ "$file" =~ \.html$ ]] || continue
  [[ -f "$ROOT/$file" ]] || continue

  count=$(grep -c '<img[^>]*>' "$ROOT/$file" 2>/dev/null || echo 0)
  missing=$(grep -c '<img[^>]*>' "$ROOT/$file" 2>/dev/null | xargs)
  no_size=$(grep '<img[^>]*>' "$ROOT/$file" 2>/dev/null | grep -v 'width=' | grep -v 'style=' | wc -l | xargs)

  if [ "$no_size" -gt 0 ]; then
    echo "  ⚠ AVISO: $file — $no_size <img> sem width/height"
    WARNINGS=$((WARNINGS + 1))
  fi
done < <(git diff --cached --name-only)

# ── 3. GOOGLE FONTS BLOQUEANTE ────────────────────────────
echo ""
echo "▸ Verificando Google Fonts bloqueantes..."

while IFS= read -r file; do
  [[ "$file" =~ \.html$ ]] || continue
  [[ -f "$ROOT/$file" ]] || continue

  if grep -q 'rel="stylesheet".*fonts.googleapis' "$ROOT/$file" 2>/dev/null; then
    echo "  ✗ ERRO: $file — Google Fonts com rel=stylesheet bloqueia render!"
    echo "    → Usar rel=\"preload\" as=\"style\" onload=... (ver CLAUDE.md)"
    ERRORS=$((ERRORS + 1))
  fi
done < <(git diff --cached --name-only)

# ── 4. RESUMO ─────────────────────────────────────────────
echo ""
echo "─────────────────────────────────────────"
if [ "$ERRORS" -gt 0 ]; then
  echo "  ✗ $ERRORS erro(s) encontrado(s) — corrija antes do push"
  echo "  ⚠ $WARNINGS aviso(s)"
  echo "─────────────────────────────────────────"
  echo ""
  exit 1
else
  echo "  ✓ Tudo OK — $WARNINGS aviso(s)"
  echo "─────────────────────────────────────────"
  echo ""
  exit 0
fi
