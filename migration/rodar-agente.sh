#!/bin/bash
# LumenGrid — Roda o agente de cotações
# Execute: bash rodar-agente.sh [--dry-run] [--todos]
#
# SETUP (primeira vez):
#   1. Pegar a API Key em: https://console.anthropic.com/settings/keys
#   2. Colar abaixo na variável ANTHROPIC_API_KEY
#   3. Ou definir permanentemente: echo 'export ANTHROPIC_API_KEY=sk-ant-...' >> ~/.zshrc

# ── Cole sua chave aqui ────────────────────────────────────────────────────────
ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-}"
# ─────────────────────────────────────────────────────────────────────────────

if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo ""
  echo "⚠  ANTHROPIC_API_KEY não definida."
  echo ""
  echo "   Para configurar permanentemente:"
  echo "   1. Abra: https://console.anthropic.com/settings/keys"
  echo "   2. Crie uma chave API"
  echo "   3. Rode: echo 'export ANTHROPIC_API_KEY=sk-ant-SEU-TOKEN' >> ~/.zshrc && source ~/.zshrc"
  echo ""
  read -p "   Cole a chave agora para esta sessão: " INPUT_KEY
  ANTHROPIC_API_KEY="$INPUT_KEY"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
export ANTHROPIC_API_KEY
node agente-cotacoes.mjs "$@"
