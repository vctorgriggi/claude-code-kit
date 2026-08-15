#!/usr/bin/env node
// Gera as tabelas de invariantes a partir do catálogo REGRAS de
// bin/codecheck.mjs. O catálogo é a fonte; o texto normativo e o README são
// derivados — nunca o contrário.
//
// Uso: node scripts/gerar-gramatica.mjs           reescreve as tabelas
//      node scripts/gerar-gramatica.mjs --check   falha se estiverem fora de dia
// Exit: 0 em dia (ou reescrito); 1 fora de dia com --check; 2 erro de uso.

import { readFile, writeFile } from "node:fs/promises";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { REGRAS } from "../bin/codecheck.mjs";

const INICIO =
  "<!-- REGRAS:início — tabela gerada por scripts/gerar-gramatica.mjs; não editar à mão -->";
const FIM = "<!-- REGRAS:fim -->";
const SEVERIDADE = { violacao: "violação", aviso: "aviso" };

// Os dois destinos: o texto normativo, com a lista completa, e o README, com a
// mesma lista agrupada por família — para quem só quer saber o que o
// verificador cobre sem ler a gramática inteira.
const DESTINOS = [
  { url: new URL("../grammar/GRAMATICA.md", import.meta.url), formato: "completa" },
  { url: new URL("../README.md", import.meta.url), formato: "familias" },
];

// A ordem das famílias sai da ordem do catálogo, em vez de uma lista à parte:
// duas listas divergem, uma derivada não tem como.
export const familias = () => [...new Set(REGRAS.map((r) => r.familia))];

export function tabela(formato = "completa") {
  if (formato === "familias") {
    const linhas = [
      "| família | regras | o que cobre | severidade |",
      "| ------- | ------ | ----------- | ---------- |",
    ];
    for (const nome of familias()) {
      const doGrupo = REGRAS.filter((r) => r.familia === nome);
      const ids = doGrupo.map((r) => `\`${r.id}\``).join(" ");
      const sevs = [...new Set(doGrupo.map((r) => SEVERIDADE[r.severidade]))];
      const promovivel = doGrupo.some((r) => r.promovivel);
      linhas.push(
        `| **${nome}** | ${ids} | ${doGrupo[0].titulo}${doGrupo.length > 1 ? "; …" : ""} | ` +
          `${sevs.join(" / ")}${promovivel ? " *(promovível)*" : ""} |`,
      );
    }
    return linhas.join("\n");
  }
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

export function aplicar(md, formato = "completa") {
  const i = md.indexOf(INICIO);
  const f = md.indexOf(FIM);
  if (i === -1 || f === -1 || f < i) {
    throw new Error("marcadores REGRAS:início/REGRAS:fim ausentes ou fora de ordem no arquivo");
  }
  return md.slice(0, i + INICIO.length) + "\n\n" + tabela(formato) + "\n\n" + md.slice(f);
}

async function main() {
  const checar = process.argv.includes("--check");
  let desatualizados = 0;
  for (const { url, formato } of DESTINOS) {
    const nome = url.pathname.split("/").slice(-2).join("/");
    const md = await readFile(url, "utf8");
    const novo = aplicar(md, formato);
    if (novo === md) {
      if (!checar) console.log(`sem mudança: ${nome}`);
      continue;
    }
    if (checar) {
      console.error(`erro: a tabela de ${nome} está fora de dia com o catálogo REGRAS.`);
      desatualizados++;
      continue;
    }
    await writeFile(url, novo);
    console.log(`${nome}: tabela regerada com ${REGRAS.length} regras`);
  }
  if (checar) {
    if (desatualizados) {
      console.error("      rode: node scripts/gerar-gramatica.mjs");
      process.exit(1);
    }
    console.log(`ok: tabelas em dia com REGRAS (${REGRAS.length} regras)`);
  }
}

// Comparação por realpath, não por string de URL: em macOS `/tmp` e `/var` são
// symlinks, e comparar o caminho literal faz o script sair 0 sem gerar nada.
const ehEntryPoint = () => {
  try {
    return (
      process.argv[1] &&
      realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
    );
  } catch {
    return false;
  }
};

if (ehEntryPoint()) {
  await main().catch((e) => {
    console.error(`erro: ${e.message}`);
    process.exit(2);
  });
}
