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
import { execFileSync } from "node:child_process";
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

test("toda família do catálogo é explicada em prosa no §3, na ordem do catálogo", async () => {
  // Só o §3 conta. Procurar no arquivo inteiro aprovaria a família pela tabela
  // gerada do §6, que sempre cita o nome — guarda que não pode falhar não é
  // guarda. Foi assim que "Supressão" ficou sem uma linha de explicação.
  const normativo = await ler("grammar/GRAMATICA.md");
  const secao = normativo.match(/^## §3[^\n]*\n([\s\S]*?)^## §4/m);
  assert.ok(secao, "a gramática não tem um §3 delimitado");

  const explicadas = [...secao[1].matchAll(/^\*\*([^*]+)\*\* —/gm)].map((m) => m[1]);
  const doCatalogo = [...new Set(REGRAS.map((r) => r.familia))];

  const ausentes = doCatalogo.filter((f) => !explicadas.includes(f));
  assert.deepEqual(
    ausentes,
    [],
    `famílias sem parágrafo próprio no §3: ${ausentes.join(", ")}`,
  );

  // A ordem também: catálogo, §3 e a tabela do README são a mesma sequência, e
  // a do README é gerada do catálogo. Sobra o §3 para divergir à mão.
  assert.deepEqual(
    explicadas,
    doCatalogo,
    "a ordem das famílias no §3 diverge da ordem do catálogo",
  );
});

test("a ordem das seções do README leva à instalação, não parte dela", async () => {
  // Instalar é o pedido mais caro da página. Ele vem depois da prova (o que sai
  // disso, o diferencial) e depois da pergunta que decide (isto serve para o
  // meu projeto?) — nunca antes. Sem esta guarda a ordem volta a ser a de
  // escrita, que foi como ela nasceu nos dois kits.
  const md = await ler("README.md");
  let dentro = false;
  const secoes = [];
  for (const l of md.split("\n")) {
    if (l.trimStart().startsWith("```")) dentro = !dentro;
    else if (!dentro && l.startsWith("## ")) secoes.push(l.slice(3).trim());
  }

  const pos = (t) => secoes.findIndex((s) => s === t);
  const antes = (a, b) => {
    assert.notEqual(pos(a), -1, `o README não tem a seção "${a}"`);
    assert.notEqual(pos(b), -1, `o README não tem a seção "${b}"`);
    assert.ok(pos(a) < pos(b), `"${a}" precisa vir antes de "${b}" no README`);
  };

  antes("Por quê", "As lâminas");
  antes("As lâminas", "O que sai disso");
  antes("O que sai disso", "O contrato, que é o diferencial");
  antes("O contrato, que é o diferencial", "Em que projetos isso funciona");
  antes("Em que projetos isso funciona", "Instalação");
  antes("Instalação", "Verificação");
  antes("Veja funcionando", "Onde a confiança para");
  antes("Onde a confiança para", "Personalização");
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

test("toda feature de CLI documentada existe e tem teste", async () => {
  // Esta guarda pegou uma feature fantasma no primeiro uso: a ajuda anunciava
  // panorama de vários diretórios e o main() só lia o primeiro argumento.
  // Documentar sem implementar é a pior variante — o usuário confia e não há
  // erro nenhum.
  const readme = await ler("README.md");
  const ajuda = await ler("bin/codecheck.mjs");
  const suites = (
    await Promise.all(
      (await listar("test", ".test.mjs"))
        .filter((f) => f !== "completude.test.mjs")
        .map((f) => ler(`test/${f}`)),
    )
  ).join("\n");

  const flags = new Set(
    [...`${readme}\n${ajuda}`.matchAll(/codecheck[^\n`]*\s(--[a-z-]+)/g)].map((m) => m[1]),
  );
  assert.ok(flags.size >= 3, "não achei as flags documentadas");

  for (const flag of flags) {
    assert.ok(ajuda.includes(`"${flag}"`), `${flag} é documentada e o CLI não a conhece`);
    assert.ok(suites.includes(flag), `${flag} é documentada e nenhuma suíte a exercita`);
  }

  // Formas de invocação que a ajuda anuncia sem serem flag.
  if (/<dir>\s+<dir>/.test(ajuda)) {
    assert.match(
      ajuda,
      /dirs\.length <= 1/,
      "a ajuda anuncia panorama de vários diretórios e o CLI não o implementa",
    );
    assert.match(
      suites,
      /panorama/i,
      "o panorama é documentado e nenhuma suíte o exercita",
    );
  }

  if (readme.includes("codecheck: ignore")) {
    assert.ok(ajuda.includes("codecheck:"), "a supressão documentada não existe");
    assert.ok(suites.includes("codecheck: ignore"), "a supressão não é exercitada");
  }
});

test("o que o índice dos exemplos afirma sobre os fixtures é o que eles dão", async () => {
  // O índice promete números concretos ("6 violações e 3 avisos, em 4
  // famílias") porque número concreto é o que deixa o exemplo avaliável sem
  // rodar nada. É também o que envelhece calado: a linha dizia "seis famílias"
  // quando eram quatro, e nada quebrava.
  const { verificar } = await import("../bin/codecheck.mjs");
  const indice = await ler("examples/README.md");

  const m = indice.match(/(\d+) violações e (\d+) avisos, em (\d+) famílias/);
  assert.ok(m, "o índice não declara os números do fixture sujo");
  const r = await verificar(path.join(RAIZ, "examples/fixtures/sujo"));
  const familias = new Set([...r.violacoes, ...r.avisos].map((a) => a.familia));
  assert.deepEqual(
    [r.violacoes.length, r.avisos.length, familias.size],
    [Number(m[1]), Number(m[2]), Number(m[3])],
    "os números que o índice afirma sobre o fixture sujo não são os que ele dá",
  );

  assert.match(indice, /--strict examples\/fixtures\/limpo\s+# 0 achados/);
  const limpo = await verificar(path.join(RAIZ, "examples/fixtures/limpo"), { strict: true });
  assert.equal(
    limpo.violacoes.length + limpo.avisos.length,
    0,
    "o índice promete zero achados no fixture limpo e ele tem achado",
  );
});

test("as regras que o README diz que nunca promovem são as que o catálogo não promove", async () => {
  // O `promovivel: true` de V1 e V2 contradizia a gramática §3 ("sempre
  // aviso"), o `porque` das próprias regras ("Aviso, nunca violação") e o
  // README — e o `--strict` promovia as duas. Três textos concordavam, o código
  // discordava, e nada acusava.
  const readme = await ler("README.md");
  const frase = readme.match(/\*\*Três nunca promovem\*\*[^.]*\./);
  assert.ok(frase, "o README não declara quais regras nunca promovem");

  const declaradas = [...frase[0].matchAll(/`([A-Z]\d)`/g)].map((m) => m[1]).sort();
  const doCatalogo = REGRAS.filter((r) => r.severidade === "aviso" && !r.promovivel)
    .map((r) => r.id)
    .sort();

  assert.deepEqual(
    declaradas,
    doCatalogo,
    "o README e o catálogo discordam sobre quais avisos nunca viram violação",
  );

  // E a gramática precisa dizer o mesmo em prosa, para as três fontes fecharem.
  const normativo = await ler("grammar/GRAMATICA.md");
  for (const id of doCatalogo) {
    const familia = REGRAS.find((r) => r.id === id).familia;
    const paragrafo = normativo.match(
      new RegExp(`^\\*\\*${familia}\\*\\* —[\\s\\S]*?(?=\\n\\n\\*\\*|\\n## )`, "m"),
    );
    assert.ok(paragrafo, `a gramática não tem parágrafo da família ${familia}`);
    assert.match(
      paragrafo[0],
      /Sempre \*\*aviso\*\*|Sempre aviso|[Nn]unca vira violação/,
      `${id} nunca promove no catálogo e a gramática não diz isso no parágrafo de ${familia}`,
    );
  }
});

test("o kit passa no próprio verificador", async () => {
  // Verificador que não se verifica pede uma disciplina que ele mesmo não
  // segue. O que sobra são avisos de volume, que nunca promovem — e o CI roda
  // exatamente este comando.
  const { verificar } = await import("../bin/codecheck.mjs");
  const r = await verificar(RAIZ);
  assert.deepEqual(
    r.violacoes.map((v) => `${v.arquivo}:${v.linha} [${v.id}]`),
    [],
    "o kit viola a própria gramática — corrija, ou suprima com motivo na linha",
  );
});

test("o README aponta para o kit irmão", async () => {
  // A dependência graciosa só é graciosa se o leitor souber que o outro lado
  // existe. A guarda espelha a do irmão, para que a relação nunca volte a ser
  // anunciada em um sentido só.
  const readme = await ler("README.md");
  assert.match(
    readme,
    /\[claude-docs-kit\]\(https:\/\/github\.com\/[^)]+\)/,
    "o README não leva ao kit que escreve o contrato que a família C cobra",
  );
});

test("o panorama documentado é a saída real, não uma lembrança dela", async () => {
  // A guarda acima prova que a feature existe; esta prova que o exemplo dela
  // ainda é verdade. O panorama roda sobre os fixtures de verdade, então dá
  // para exigir igualdade byte a byte — é o único jeito de pegar o exemplo que
  // estava certo quando foi escrito e envelheceu junto com o fixture.
  const readme = await ler("README.md");
  const bloco = [...readme.matchAll(/```[^\n]*\n([\s\S]*?)```/g)]
    .map((m) => m[1])
    .find((b) => b.split("\n").some((l) => l.startsWith("$ codecheck ~/")));
  assert.ok(bloco, "o README não mostra o panorama entre projetos");

  // Exit 1 é o esperado: o fixture sujo viola de propósito, e o execFileSync
  // entrega o stdout no erro.
  const argv = [
    path.join(RAIZ, "bin/codecheck.mjs"),
    ...["limpo", "sujo"].map((f) => path.join(RAIZ, "examples/fixtures", f)),
  ];
  let real;
  try {
    real = execFileSync("node", argv, { encoding: "utf8" });
  } catch (e) {
    real = e.stdout ?? "";
  }

  const limpar = (s) =>
    s
      .split("\n")
      .filter((l) => l.trim() && !l.startsWith("$"))
      .map((l) => l.trimEnd())
      .join("\n");

  assert.equal(
    limpar(bloco),
    limpar(real),
    "o panorama do README diverge do que o codecheck emite hoje sobre os fixtures",
  );
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

  const indice = await ler("examples/README.md");
  const casos = (await ler("examples/regressao.md"))
    .split("\n")
    .filter((l) => /^\| *\d+ *\|/.test(l)).length;
  const anunciado = indice.match(/(\d+) casos com resultado travado/);
  assert.ok(anunciado, "o índice dos exemplos não anuncia o número de casos");
  assert.equal(
    Number(anunciado[1]),
    casos,
    `o índice diz ${anunciado[1]} casos; a tabela tem ${casos}`,
  );
});

test("os casos de regressão são numerados 1..N na ordem do arquivo", async () => {
  // A tabela é dividida em seções por comando, e caso novo entra na seção do
  // comando dele — não no fim do arquivo. Sem esta guarda a numeração vira
  // ordem de escrita: foi assim que a seção do `/code:morto` acabou com os
  // números 44–51 posicionada antes da seção que tinha 39–43.
  const numeros = (await ler("examples/regressao.md"))
    .split("\n")
    .filter((l) => /^\| *\d+ *\|/.test(l))
    .map((l) => Number(l.match(/^\| *(\d+)/)[1]));

  assert.deepEqual(
    numeros,
    numeros.map((_, i) => i + 1),
    "numeração fora de ordem ou com buraco na tabela de regressão",
  );
});
