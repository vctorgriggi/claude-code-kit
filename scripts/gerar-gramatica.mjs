#!/usr/bin/env node
// Gera a tabela de invariantes do §6 de grammar/GRAMATICA.md a partir do
// catálogo REGRAS de bin/codecheck.mjs. O catálogo é a fonte; o texto normativo
// é derivado — nunca o contrário.
//
// Uso: node scripts/gerar-gramatica.mjs           reescreve a tabela
//      node scripts/gerar-gramatica.mjs --check   falha se estiver fora de dia

import { readFile, writeFile } from "node:fs/promises";
import { REGRAS } from "../bin/codecheck.mjs";

const ALVO = new URL("../grammar/GRAMATICA.md", import.meta.url);
const INICIO =
  "<!-- REGRAS:início — tabela gerada por scripts/gerar-gramatica.mjs; não editar à mão -->";
const FIM = "<!-- REGRAS:fim -->";
const SEVERIDADE = { violacao: "violação", aviso: "aviso" };

export function tabela() {
  const linhas = [
    "| id | família | severidade | verifica |",
    "| -- | ------- | ---------- | -------- |",
  ];
  for (const r of REGRAS) {
    const sev = SEVERIDADE[r.severidade] + (r.promovivel ? " *(promovível)*" : "");
    linhas.push(`| \`${r.id}\` | ${r.familia} | ${sev} | ${r.titulo} |`);
  }
  return linhas.join("\n");
}

export function aplicar(md) {
  const i = md.indexOf(INICIO);
  const f = md.indexOf(FIM);
  if (i === -1 || f === -1 || f < i) {
    throw new Error("marcadores REGRAS:início/REGRAS:fim ausentes ou fora de ordem");
  }
  return md.slice(0, i + INICIO.length) + "\n\n" + tabela() + "\n\n" + md.slice(f);
}

async function main() {
  const checar = process.argv.includes("--check");
  const md = await readFile(ALVO, "utf8");
  const novo = aplicar(md);
  if (novo === md) {
    console.log(`ok: §6 em dia com REGRAS (${REGRAS.length} regras)`);
    process.exit(0);
  }
  if (checar) {
    console.error(
      "erro: a tabela do §6 está fora de dia com o catálogo REGRAS.\n" +
        "      rode: node scripts/gerar-gramatica.mjs",
    );
    process.exit(1);
  }
  await writeFile(ALVO, novo);
  console.log(`tabela do §6 regerada com ${REGRAS.length} regras`);
}

if (
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].split("/").pop())
) {
  await main().catch((e) => {
    console.error(`erro: ${e.message}`);
    process.exit(2);
  });
}
