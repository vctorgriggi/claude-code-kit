#!/usr/bin/env node
// Hook de PostToolUse (Write|Edit): confere o zelo do arquivo no momento em que
// ele é escrito, não semanas depois numa revisão.
//
// O irmão (claude-docs-kit) usa SessionStart, porque documentação desatualiza
// devagar. Código não: a gambiarra entra numa edição específica, e o momento
// barato de apontá-la é esse. Depois de commitada ela vira "como sempre foi".
//
// Só fala do arquivo que acabou de ser tocado, e só de achado que aquela edição
// introduziu — apontar dívida antiga a cada save vira ruído e ensina a ignorar.
//
// Nunca falha a edição: erro aqui vira silêncio. Um hook não é motivo para o
// agente parar de trabalhar.

import path from "node:path";
import { existsSync, realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";

const EXTENSOES = /\.(js|jsx|mjs|cjs|ts|tsx|mts|cts|py|rb|go|rs|java|kt|swift|php)$/;

async function carregar() {
  const aqui = path.dirname(realpathSync(process.argv[1]));
  const candidatos = [
    // rodando do repositório: hooks/ → bin/
    path.join(aqui, "..", "bin", "codecheck.mjs"),
    // instalado: ~/.claude/code-kit/hooks/ → ~/.claude/bin/
    path.join(aqui, "..", "..", "bin", "codecheck.mjs"),
    path.join(process.env.HOME ?? "", ".claude", "bin", "codecheck.mjs"),
  ];
  for (const c of candidatos) if (existsSync(c)) return import(pathToFileURL(c).href);
  return null;
}

async function lerEntrada() {
  const partes = [];
  for await (const p of process.stdin) partes.push(p);
  try {
    return JSON.parse(partes.join("") || "{}");
  } catch {
    return {};
  }
}

try {
  const entrada = await lerEntrada();
  const alvo =
    entrada?.tool_response?.filePath ?? entrada?.tool_input?.file_path ?? null;
  if (!alvo || !EXTENSOES.test(alvo)) process.exit(0);

  const mod = await carregar();
  if (!mod) process.exit(0); // codecheck não instalado: silêncio

  // Verifica a pasta do arquivo, não o repositório inteiro: barato o bastante
  // para rodar a cada save, e o que interessa é o que acabou de ser escrito.
  const dir = path.dirname(alvo);
  let r;
  try {
    r = await mod.verificar(dir);
  } catch {
    process.exit(0); // pasta sem código, config quebrada: não é problema daqui
  }

  const nome = path.basename(alvo);
  const doArquivo = r.violacoes.filter((v) => path.basename(v.arquivo) === nome);
  if (!doArquivo.length) process.exit(0);

  const linhas = doArquivo
    .slice(0, 5)
    .map((v) => `${v.arquivo}:${v.linha} [${v.id}] ${v.msg}`);
  const extra = doArquivo.length > 5 ? `\n… mais ${doArquivo.length - 5}` : "";

  console.log(
    JSON.stringify({
      systemMessage: `zelo: ${doArquivo.length} achado(s) em ${nome}`,
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext:
          `O codecheck acusou no arquivo que você acabou de escrever:\n${linhas.join("\n")}${extra}\n` +
          `Corrija agora se a edição introduziu isto; se for dívida anterior, deixe. ` +
          `\`codecheck --explain <id>\` diz o porquê de cada regra.`,
      },
    }),
  );
} catch {
  process.exit(0);
}
