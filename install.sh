#!/usr/bin/env bash
# Instala o claude-code-kit:
#   comandos   → ~/.claude/commands/code/   (viram /code:<nome>)
#   codecheck  → ~/.claude/bin/
#   gramática  → ~/.claude/code-kit/GRAMATICA.md
#   hook       → ~/.claude/code-kit/hooks/  (inativo até você ligar; ver README)
# Rode de dentro do repo: ./install.sh
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")" && pwd)"

instalar() { # instalar <origem> <destino> <rótulo>
  local origem="$1" destino="$2" rotulo="$3"
  mkdir -p "$(dirname "$destino")"
  if [ -f "$destino" ] && cmp -s "$origem" "$destino"; then
    echo "sem mudança: $rotulo"
  elif [ -f "$destino" ]; then
    cp "$origem" "$destino"; echo "atualizado: $rotulo"
  else
    cp "$origem" "$destino"; echo "instalado: $rotulo"
  fi
}

for f in "$RAIZ"/commands/code/*.md; do
  instalar "$f" "${HOME}/.claude/commands/code/$(basename "$f")" \
    "/code:$(basename "${f%.md}")"
done

instalar "$RAIZ/bin/codecheck.mjs" "${HOME}/.claude/bin/codecheck.mjs" \
  "codecheck (~/.claude/bin/codecheck.mjs)"

# A gramática é lida em runtime pelos comandos: é a fonte única, e nenhum
# comando carrega paráfrase dela. Ausente, os comandos param e avisam.
instalar "$RAIZ/grammar/GRAMATICA.md" "${HOME}/.claude/code-kit/GRAMATICA.md" \
  "gramática (~/.claude/code-kit/GRAMATICA.md)"

instalar "$RAIZ/hooks/zelo-ao-editar.mjs" \
  "${HOME}/.claude/code-kit/hooks/zelo-ao-editar.mjs" \
  "hook de PostToolUse (inativo até você ligar; ver README)"
chmod +x "${HOME}/.claude/code-kit/hooks/zelo-ao-editar.mjs"

echo "Pronto. Os comandos aparecem ao digitar /code no Claude Code."
