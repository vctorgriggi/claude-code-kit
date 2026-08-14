// Completude: cada superfície do kit está coberta pelas outras.
//
// As outras suítes verificam se o que existe funciona. Esta verifica se **falta
// alguma coisa** — e existe porque a lacuna típica não é bug, é peça que
// ninguém lembrou de ligar: comando sem transcrição, regra sem caso de mutação,
// suíte que o CI não roda, executável que nenhum teste exercita.
//
// Escrita na primeira fase de propósito. No kit irmão ela chegou por último, e
// quase todo retrabalho de lá foi propagação que ela teria cobrado na hora.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { REGRAS } from "../bin/codecheck.mjs";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const ler = (p) => readFile(path.join(RAIZ, p), "utf8");
const existe = (p) => existsSync(path.join(RAIZ, p));
const listar = async (d, ext = ".md") =>
  existe(d) ? (await readdir(path.join(RAIZ, d))).filter((f) => f.endsWith(ext)) : [];

// Superfícies que o kit promete ter. Cada uma é cobrada abaixo; acrescentar uma
// aqui sem ligá-la nos lugares certos faz a suíte falhar, que é o objetivo.
const COMANDOS = (await listar("commands/code")).map((f) => f.replace(/\.md$/, ""));

test("o CI roda todo arquivo de teste do diretório test/", async () => {
  if (!existe(".github/workflows/ci.yml")) {
    assert.fail("o kit não tem CI — a suíte só vale se roda sozinha");
  }
  const ci = await ler(".github/workflows/ci.yml");
  const porGlob = /node --test [^\n]*test\/\*\.test\.mjs/.test(ci);
  if (porGlob) return;
  const esquecidos = (await listar("test", ".test.mjs")).filter(
    (f) => !ci.includes(`test/${f}`),
  );
  assert.deepEqual(
    esquecidos,
    [],
    `suítes que o CI não roda: ${esquecidos.join(", ")} — liste, ou use o glob`,
  );
});

test("toda regra do catálogo aparece na tabela gerada da gramática", async () => {
  assert.ok(existe("grammar/GRAMATICA.md"), "falta o texto normativo");
  const normativo = await ler("grammar/GRAMATICA.md");
  for (const r of REGRAS) {
    assert.ok(
      normativo.includes(`\`${r.id}\``),
      `${r.id} não aparece na tabela de invariantes`,
    );
  }
});

test("toda família do catálogo é explicada no texto normativo", async () => {
  const normativo = await ler("grammar/GRAMATICA.md");
  const familias = [...new Set(REGRAS.map((r) => r.familia))];
  const ausentes = familias.filter((f) => !normativo.includes(f));
  assert.deepEqual(
    ausentes,
    [],
    `famílias sem explicação na gramática: ${ausentes.join(", ")}`,
  );
});

test("a numeração das transcrições segue a ordem de consequência", async () => {
  // A ordem é contrato de leitura, e o princípio é o mesmo que o /code:varrer
  // usa para priorizar: o retrato primeiro, depois do que causa bug para o que
  // causa atrito, e por último a lâmina que apaga. Sem esta guarda, a
  // numeração vira ordem de escrita — que foi como ela nasceu.
  const ORDEM = [
    ["varrer", "o retrato"],
    ["contrato", "CRÍTICO"],
    ["gambiarra", "CRÍTICO"],
    ["estrutura", "ALTO"],
    ["comentarios", "MÉDIO"],
    ["morto", "apaga"],
  ];
  const transcricoes = (await listar("examples"))
    .filter((f) => /^\d\d-/.test(f))
    .sort();

  assert.equal(
    transcricoes.length,
    ORDEM.length,
    `esperava ${ORDEM.length} transcrições, achei ${transcricoes.length}`,
  );

  for (const [i, arquivo] of transcricoes.entries()) {
    const n = Number(arquivo.slice(0, 2));
    assert.equal(n, i + 1, `numeração com buraco ou fora de ordem: ${arquivo}`);

    const md = await ler(`examples/${arquivo}`);
    const titulo = md.match(/^# Exemplo (\d+):/);
    assert.ok(titulo, `${arquivo} não abre com "# Exemplo <n>: …"`);
    assert.equal(
      Number(titulo[1]),
      n,
      `${arquivo}: o nome diz ${n} e o título diz ${titulo[1]}`,
    );

    const [comando] = ORDEM[i];
    assert.ok(
      md.includes(`/code:${comando}`),
      `${arquivo} deveria demonstrar /code:${comando} — a posição e o comando não batem`,
    );
  }

  // E o índice precisa declarar o princípio, senão a ordem parece arbitrária.
  const indice = await ler("examples/README.md");
  assert.match(
    indice,
    /ordem é a mesma que o `\/code:varrer` usa|por consequência/i,
    "o índice não explica por que a ordem é essa",
  );
});

test("todo comando tem transcrição, entrada no README e caso de regressão", async () => {
  assert.ok(COMANDOS.length, "nenhum comando em commands/code/");
  const readme = await ler("README.md");
  const transcricoes = (await listar("examples")).filter((f) => /^\d\d-/.test(f));
  const corpo = (
    await Promise.all(transcricoes.map((f) => ler(`examples/${f}`)))
  ).join("\n");
  const regressao = existe("examples/regressao.md") ? await ler("examples/regressao.md") : "";

  const semExemplo = COMANDOS.filter((c) => !corpo.includes(`/code:${c}`));
  const semReadme = COMANDOS.filter((c) => !readme.includes(`/code:${c}`));
  const semRegressao = COMANDOS.filter((c) => !regressao.includes(`/code:${c}`));

  assert.deepEqual(semExemplo, [], `comandos sem transcrição: ${semExemplo.join(", ")}`);
  assert.deepEqual(semReadme, [], `comandos ausentes do README: ${semReadme.join(", ")}`);
  assert.deepEqual(
    semRegressao,
    [],
    `comandos sem caso travado na regressão: ${semRegressao.join(", ")}`,
  );
});

test("todo comando é instalado e declara o que faz", async () => {
  const sh = await ler("install.sh");
  assert.match(sh, /commands\/code\/\*\.md/, "install.sh não instala os comandos");
  for (const c of COMANDOS) {
    const fm = (await ler(`commands/code/${c}.md`)).match(/^---\n([\s\S]*?)\n---/);
    assert.ok(fm, `commands/code/${c}.md sem frontmatter`);
    for (const campo of ["description", "allowed-tools", "disable-model-invocation"]) {
      assert.match(fm[1], new RegExp(`^${campo}:`, "m"), `${c}.md sem "${campo}"`);
    }
  }
});

test("nenhum comando leva ferramenta de escrita em allowed-tools", async () => {
  // O gate duplo depende da ausência: além do aval conversacional, cada escrita
  // passa pelo prompt de permissão do harness.
  for (const c of COMANDOS) {
    const fm = (await ler(`commands/code/${c}.md`)).match(/^---\n([\s\S]*?)\n---/);
    const linha = fm[1].match(/^allowed-tools:.*$/m);
    assert.ok(linha, `${c}.md sem allowed-tools`);
    assert.doesNotMatch(
      linha[0],
      /\b(Write|MultiEdit|NotebookEdit)\b/,
      `commands/code/${c}.md traz ferramenta de escrita ampla em allowed-tools`,
    );
  }
});

test("todo comando declara se escreve, e nunca aplica sem a lista passar", async () => {
  // A regra que separa este kit de um formatador. Duas posturas aceitas, e o
  // comando precisa declarar a sua: read-only, ou reporta-antes-de-aplicar.
  for (const c of COMANDOS) {
    const md = await ler(`commands/code/${c}.md`);
    const fm = md.match(/^---\n([\s\S]*?)\n---/)[1];
    const escreve = /\bEdit\b/.test(fm.match(/^allowed-tools:.*$/m)[0]);

    if (escreve) {
      assert.match(
        md,
        /reporta antes de aplicar/i,
        `commands/code/${c}.md pode editar e não declara que reporta antes`,
      );
    } else {
      assert.match(
        md,
        /não altera nada|read-only/i,
        `commands/code/${c}.md não edita e não declara que é read-only`,
      );
    }
  }
});

test("todo executável do repositório é documentado e exercitado", async () => {
  const docs = (
    await Promise.all(
      ["README.md", "examples/README.md"].filter(existe).map(ler),
    )
  ).join("\n");
  const ci = existe(".github/workflows/ci.yml") ? await ler(".github/workflows/ci.yml") : "";
  // Esta suíte não conta como cobertura de nada: ela cobra o exercício, não o
  // faz. Sem a exclusão, mencionar um executável aqui já o daria por coberto.
  const suites = (
    await Promise.all(
      (await listar("test", ".test.mjs"))
        .filter((f) => f !== "completude.test.mjs")
        .map((f) => ler(`test/${f}`)),
    )
  ).join("\n");

  const semDoc = [];
  const semTeste = [];
  for (const pasta of ["scripts", "hooks", "bin"]) {
    for (const arquivo of await listar(pasta, "")) {
      if (!docs.includes(arquivo) && !ci.includes(arquivo)) semDoc.push(`${pasta}/${arquivo}`);
      if (!suites.includes(arquivo) && !ci.includes(arquivo)) semTeste.push(`${pasta}/${arquivo}`);
    }
  }
  assert.deepEqual(semDoc, [], `executáveis que ninguém documenta: ${semDoc.join(", ")}`);
  assert.deepEqual(semTeste, [], `executáveis que nenhuma suíte roda: ${semTeste.join(", ")}`);
});

test("todo fixture é exercitado por alguma suíte", async () => {
  const suites = (
    await Promise.all(
      (await listar("test", ".test.mjs")).map((f) => ler(`test/${f}`)),
    )
  ).join("\n");
  const fixtures = (
    await readdir(path.join(RAIZ, "examples/fixtures"), { withFileTypes: true })
  )
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
  assert.ok(fixtures.length, "nenhum fixture");
  const orfaos = fixtures.filter((f) => !suites.includes(f));
  assert.deepEqual(orfaos, [], `fixtures que nada exercita: ${orfaos.join(", ")}`);
});

test("o walkthrough cobre as lâminas e as partes que não são comando", async () => {
  // As transcrições são mergulhos de uma lâmina cada; sem um mapa, quem chega
  // costura cinco arquivos para entender o uso. E mapa que não acompanha o kit
  // é pior que nenhum — daí a cobrança.
  const w = await ler("examples/ciclo-completo.md");
  const ausentes = COMANDOS.filter((c) => !w.includes(`/code:${c}`));
  assert.deepEqual(ausentes, [], `o walkthrough não mostra: ${ausentes.join(", ")}`);

  for (const [oque, marca] of [
    ["o verificador no terminal", "$ codecheck"],
    ["o hook ao editar", "PostToolUse"],
    ["o CI do projeto-alvo", "actions/codecheck"],
    ["o --explain", "--explain"],
    ["o que muda com contrato", "CLAUDE.md"],
  ]) {
    assert.ok(w.includes(marca), `o walkthrough não mostra ${oque}`);
  }

  const readme = await ler("README.md");
  const indice = await ler("examples/README.md");
  assert.ok(
    readme.includes("ciclo-completo.md") && indice.includes("ciclo-completo.md"),
    "o walkthrough existe e não é anunciado no README ou no índice",
  );
});

test("a action de CI para projeto-alvo existe e é citada", async () => {
  const p = ".github/actions/codecheck/action.yml";
  assert.ok(existe(p), `falta ${p} — o README promete CI para o projeto-alvo`);
  const action = await ler(p);
  assert.match(action, /codecheck/);
  const readme = await ler("README.md");
  assert.ok(
    readme.includes(".github/actions/codecheck"),
    "o README não aponta para a action",
  );
});

test("a saída de exemplo do README tem o formato que a ferramenta emite", async () => {
  const readme = await ler("README.md");
  const bloco = readme
    .match(/```[^\n]*\n([\s\S]*?)```/g)
    ?.find((b) => b.includes("$ codecheck"));
  assert.ok(bloco, "o README não mostra nenhuma execução do codecheck");

  const ids = new Set(REGRAS.map((r) => r.id));
  const achados = bloco
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("$") && !l.startsWith("```") && !l.startsWith("resumo:"));
  assert.ok(achados.length >= 2, "o exemplo de saída não tem achados");
  for (const l of achados) {
    const m = l.match(/^(\S+):(\d+)\s+\[([A-Z]\d+)\]/);
    assert.ok(m, `linha fora do formato "arquivo:linha [ID] msg": ${l}`);
    assert.ok(ids.has(m[3]), `o exemplo cita ${m[3]}, que não existe no catálogo`);
  }
  assert.match(bloco, /^resumo: \d+ violação\(ões\)/m);
});

test("as contagens escritas à mão batem com a realidade", async () => {
  const readme = await ler("README.md");
  const declarado = readme.match(/(\d+) regras mecânicas/);
  if (declarado) {
    assert.equal(
      Number(declarado[1]),
      REGRAS.length,
      `o README diz ${declarado[1]} regras; o catálogo tem ${REGRAS.length}`,
    );
  }
});
