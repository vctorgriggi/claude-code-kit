// Coerência do repositório: as referências cruzadas entre gramática, comandos,
// exemplos e README apontam para coisas que existem.
//
// Separada de codecheck.test.mjs de propósito: aquela testa o verificador, esta
// testa o próprio kit. Um comando renomeado, uma regra removida ou um link
// quebrado num exemplo falham aqui — deriva que só apareceria meses depois, na
// hora em que alguém tenta seguir a documentação.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm, symlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { REGRAS } from "../bin/codecheck.mjs";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const IGNORAR = new Set([".git", "node_modules", ".github"]);
const rel = (p) => path.relative(RAIZ, p);

async function markdowns(dir = RAIZ, acc = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (IGNORAR.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await markdowns(p, acc);
    else if (e.name.endsWith(".md")) acc.push(p);
  }
  return acc;
}

const MDS = await markdowns();
const conteudo = new Map(
  await Promise.all(MDS.map(async (p) => [p, await readFile(p, "utf8")])),
);
const NORMATIVO = conteudo.get(path.join(RAIZ, "grammar/GRAMATICA.md"));
const IDS = new Set(REGRAS.map((r) => r.id));
const TOPO = new Set(
  (await readdir(RAIZ, { withFileTypes: true }))
    .filter((e) => e.isDirectory() && !IGNORAR.has(e.name))
    .map((e) => e.name),
);

// Fora das cercas: um `## Título` dentro de um exemplo de código não gera
// âncora no GitHub, e contá-lo aprovaria link que não resolve.
function foraDeFence(md) {
  let dentro = false;
  return md
    .split("\n")
    .map((l) => {
      if (l.trimStart().startsWith("```")) {
        dentro = !dentro;
        return "";
      }
      return dentro ? "" : l;
    })
    .join("\n");
}

test("todo link markdown do repositório resolve", () => {
  const quebrados = [];
  for (const [p, md] of conteudo) {
    for (const m of md.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
      const alvo = m[1].replace(/#.*$/, "");
      if (!alvo || /^([a-z]+:|#|mailto:)/i.test(alvo)) continue;
      if (!existsSync(path.join(path.dirname(p), alvo))) {
        quebrados.push(`${rel(p)} → ${alvo}`);
      }
    }
  }
  assert.deepEqual(quebrados, [], `links quebrados:\n  ${quebrados.join("\n  ")}`);
});

test("toda âncora de link resolve para um heading que existe", () => {
  const slug = (t) =>
    t
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/`|\*\*|_/g, "")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");

  const headings = new Map();
  for (const [p, md] of conteudo) {
    headings.set(
      p,
      new Set([...foraDeFence(md).matchAll(/^#{1,6} (.+)$/gm)].map((m) => slug(m[1]))),
    );
  }

  const quebradas = [];
  for (const [p, md] of conteudo) {
    for (const m of md.matchAll(/\[[^\]]*\]\(([^)\s]*)#([^)\s]+)\)/g)) {
      const [, arquivo, ancora] = m;
      if (/^[a-z]+:/i.test(arquivo)) continue;
      const alvo = arquivo ? path.resolve(path.dirname(p), arquivo) : p;
      const doAlvo = headings.get(alvo);
      if (!doAlvo) continue; // arquivo inexistente já é pego acima
      if (!doAlvo.has(decodeURIComponent(ancora))) {
        quebradas.push(`${rel(p)} → ${arquivo || "(este arquivo)"}#${ancora}`);
      }
    }
  }
  assert.deepEqual(quebradas, [], `âncoras que não resolvem:\n  ${quebradas.join("\n  ")}`);
});

test("todo caminho deste repositório citado em crase existe", () => {
  // Quem fala de qual repositório: o README e a gramática descrevem **este**
  // kit, e um caminho errado ali é erro. Os prompts de comando e as
  // transcrições descrevem o projeto-alvo — `test/pedido.test.js` numa tabela
  // de achados é ilustração, e colide com o `test/` real daqui por acaso.
  const DESCREVE_ESTE_REPO = (r) =>
    r === "README.md" || r.startsWith("grammar/");

  const faltando = [];
  for (const [p, md] of conteudo) {
    if (!DESCREVE_ESTE_REPO(rel(p))) continue;
    for (const m of md.matchAll(/`([^`\n]+)`/g)) {
      const alvo = m[1].trim();
      if (!alvo.includes("/") || /^(~|\/|[a-z]+:)/i.test(alvo)) continue;
      if (/[<>*?{}\s|]/.test(alvo)) continue;
      // `arquivo:linha` é localização em saída de exemplo, não referência a
      // arquivo deste repositório — os comandos mostram achados fictícios.
      if (/:\d+$/.test(alvo)) continue;
      if (!TOPO.has(alvo.split("/")[0])) continue;
      if (!existsSync(path.join(RAIZ, alvo))) faltando.push(`${rel(p)} → ${alvo}`);
    }
  }
  assert.deepEqual(faltando, [], `caminhos inexistentes:\n  ${faltando.join("\n  ")}`);
});

test("todo id de regra citado no repositório existe no catálogo", () => {
  const FORMAS = [
    /`([JTCDV]\d+)`/g,
    /--explain\s+([JTCDV]\d+)/g,
    /\(([JTCDV]\d+)\)/g,
  ];
  const orfaos = [];
  for (const [p, md] of conteudo) {
    for (const forma of FORMAS) {
      for (const m of md.matchAll(forma)) {
        if (!IDS.has(m[1])) orfaos.push(`${rel(p)} → ${m[1]}`);
      }
    }
  }
  assert.deepEqual(orfaos, [], `ids inexistentes:\n  ${orfaos.join("\n  ")}`);
});

test("todo comando /code:<nome> citado existe em commands/code/", async () => {
  const existentes = new Set(
    (await readdir(path.join(RAIZ, "commands/code")))
      .filter((f) => f.endsWith(".md"))
      .map((f) => f.replace(/\.md$/, "")),
  );
  const orfaos = [];
  for (const [p, md] of conteudo) {
    for (const m of md.matchAll(/\/code:([a-z-]+)/g)) {
      if (!existentes.has(m[1])) orfaos.push(`${rel(p)} → /code:${m[1]}`);
    }
  }
  assert.deepEqual(orfaos, [], `comandos inexistentes:\n  ${orfaos.join("\n  ")}`);
});

test("toda GRAMATICA §N citada aponta para uma seção que existe", () => {
  const secoes = new Set([...NORMATIVO.matchAll(/^## §(\d+)/gm)].map((m) => m[1]));
  const orfas = [];
  for (const [p, md] of conteudo) {
    for (const m of md.matchAll(/GRAMATICA §(\d+)/g)) {
      if (!secoes.has(m[1])) orfas.push(`${rel(p)} → GRAMATICA §${m[1]}`);
    }
  }
  assert.deepEqual(orfas, [], `seções inexistentes:\n  ${orfas.join("\n  ")}`);
});

test("todo comando carrega a gramática e para se ela faltar", async () => {
  const dir = path.join(RAIZ, "commands/code");
  for (const nome of (await readdir(dir)).filter((f) => f.endsWith(".md"))) {
    const md = await readFile(path.join(dir, nome), "utf8");
    assert.match(
      md,
      /~\/\.claude\/code-kit\/GRAMATICA\.md/,
      `commands/code/${nome} não carrega o texto normativo`,
    );
    assert.match(
      md,
      /\*\*pare\*\*/,
      `commands/code/${nome} não diz o que fazer sem a gramática instalada`,
    );
  }
});

test("o hook se comporta nos três cenários que importam", async () => {
  const hook = path.join(RAIZ, "hooks/zelo-ao-editar.mjs");
  const dir = await mkdtemp(path.join(tmpdir(), "hook-zelo-"));
  const { mkdir, writeFile } = await import("node:fs/promises");
  await mkdir(path.join(dir, "src"), { recursive: true });

  const rodar = (arquivo) =>
    execFileSync("node", [hook], {
      encoding: "utf8",
      input: JSON.stringify({ tool_input: { file_path: arquivo } }),
    }).trim();

  try {
    // (a) arquivo com achado: fala, e nomeia o arquivo tocado
    const sujo = path.join(dir, "src/a.js");
    await writeFile(sujo, "// TODO: sem rastro\nexport const a = 1;\n");
    const r = JSON.parse(rodar(sujo));
    assert.equal(r.hookSpecificOutput.hookEventName, "PostToolUse");
    assert.match(r.systemMessage, /a\.js/);
    assert.match(r.hookSpecificOutput.additionalContext, /\[J2\]/);

    // (b) arquivo limpo: silêncio — senão vira ruído a cada save
    const limpo = path.join(dir, "src/b.js");
    await writeFile(limpo, "export const b = 2;\n");
    assert.equal(rodar(limpo), "");

    // (c) arquivo que não é código: nem roda
    const doc = path.join(dir, "LEIAME.md");
    await writeFile(doc, "# nada\n");
    assert.equal(rodar(doc), "");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("o CLI roda por symlink sem sair 0 em silêncio", async () => {
  const bin = path.join(RAIZ, "bin/codecheck.mjs");
  const alvo = path.join(RAIZ, "examples/fixtures/limpo");
  const tmp = await mkdtemp(path.join(tmpdir(), "codecheck-link-"));
  try {
    const link = path.join(tmp, "codecheck.mjs");
    await symlink(bin, link);
    const saida = (exe) => execFileSync("node", [exe, alvo], { encoding: "utf8" });
    assert.equal(saida(link), saida(bin), "a saída diverge quando invocado por symlink");
    assert.match(saida(link), /^ok: zelo/m);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});

test("a constante GRAMATICA acompanha a versão declarada no texto normativo", async () => {
  const { GRAMATICA } = await import("../bin/codecheck.mjs");
  const m = NORMATIVO.match(/^Versão: (v\d+)/m);
  assert.ok(m, "grammar/GRAMATICA.md não declara a versão");
  assert.equal(GRAMATICA, m[1]);
});
