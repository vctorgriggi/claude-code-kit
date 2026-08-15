import { test } from "node:test";
import assert from "node:assert/strict";
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GRAMATICA, REGRAS, verificar } from "../bin/codecheck.mjs";

const LIMPO = fileURLToPath(
  new URL("../examples/fixtures/limpo", import.meta.url),
);
const BIN = fileURLToPath(new URL("../bin/codecheck.mjs", import.meta.url));

async function projeto(arquivos) {
  const dir = await mkdtemp(path.join(tmpdir(), "codecheck-"));
  for (const [nome, conteudo] of Object.entries(arquivos)) {
    const p = path.join(dir, nome);
    await mkdir(path.dirname(p), { recursive: true });
    await writeFile(p, conteudo);
  }
  return dir;
}

async function copiaDoLimpo(mutacoes = {}) {
  const dir = await mkdtemp(path.join(tmpdir(), "codecheck-mut-"));
  await cp(LIMPO, dir, { recursive: true });
  for (const [nome, transformar] of Object.entries(mutacoes)) {
    const p = path.join(dir, nome);
    await writeFile(p, transformar(await readFile(p, "utf8")));
  }
  return dir;
}

const ids = (r) => r.violacoes.map((v) => v.id);
const avisos = (r) => r.avisos.map((v) => v.id);
// Projeto de teste é mínimo: quase todo export nele fica sem consumidor, e o
// M1 acusa com razão. Quem testa outra família filtra a sua.
const semM1 = (lista) => lista.filter((i) => i !== "M1");

// --- o fixture de referência ----------------------------------------------

test("o projeto de referência passa sem nada, inclusive --strict", async () => {
  const r = await verificar(LIMPO, { strict: true });
  assert.deepEqual(r.violacoes, []);
  assert.deepEqual(r.avisos, []);
  assert.ok(r.arquivos >= 3);
});

test("diretório sem código é erro de uso", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "codecheck-vazio-"));
  await assert.rejects(() => verificar(dir), /nenhum arquivo de código/);
});

// --- J: justificativa na linha --------------------------------------------

test("J1: escape de tipo sem porquê acusa; com porquê passa", async () => {
  const dir = await projeto({
    "src/a.ts": [
      "// @ts-ignore",
      "const a = cliente.chamar();",
      "// @ts-expect-error — o tipo do SDK v3 está errado; issue #412",
      "const b = cliente.chamar();",
      "const c: any = 1; // — vem de JSON.parse sem schema, validado abaixo",
      "const d: any = 2;",
      "const e: any = 3; // because the SDK erases this type before v4",
    ].join("\n"),
  });
  const r = await verificar(dir);
  assert.deepEqual(ids(r), ["J1", "J1"]);
  // codecheck: ignore J1 — o regex que confere a mensagem contém o escape que ele procura
  assert.match(r.violacoes[0].msg, /@ts-ignore/);
});

test("J2: TODO sem rastro acusa; com issue, ticket ou URL passa", async () => {
  const dir = await projeto({
    "src/a.js": [
      "// TODO: melhorar isso",
      "// TODO(#317): trocar pelo endpoint novo",
      "// FIXME JIRA-88: corrigir o fuso",
      "// HACK: ver https://github.com/x/y/issues/9",
      "export const a = 1;",
    ].join("\n"),
  });
  const r = await verificar(dir);
  assert.deepEqual(ids(r), ["J2"]);
});

test("J3: catch vazio e catch que só comenta sem dizer o porquê", async () => {
  const dir = await projeto({
    "src/a.js": [
      // codecheck: ignore J3 — este catch vazio é o input que prova a regra, não código do kit
      "try { a(); } catch (e) {}",
      // codecheck: ignore J3 — idem: o catch que só comenta é o input, não um catch nosso
      "try { b(); } catch { /* ignora */ }",
      "try { c(); } catch { /* cache é best-effort — falha não afeta a resposta */ }",
      "try { d(); } catch (e) { registrar(e); }",
      "try { e(); } catch { /* fine because the next read warms the cache */ }",
    ].join("\n"),
  });
  const r = await verificar(dir);
  assert.deepEqual(ids(r), ["J3", "J3"]);
});

// --- T: testes que não provam nada ----------------------------------------

test("T1: teste sem asserção acusa; com asserção passa", async () => {
  const dir = await projeto({
    "src/a.js": "export const somar = (x, y) => x + y;",
    "test/a.test.js": [
      "import { test } from 'node:test';",
      "import assert from 'node:assert/strict';",
      "import { somar } from '../src/a.js';",
      "test('soma', () => { assert.equal(somar(1, 2), 3); });",
      // codecheck: ignore T1 — o teste sem asserção é o input que prova a regra
      "test('roda e não prova', () => { somar(1, 2); });",
    ].join("\n"),
  });
  const r = await verificar(dir);
  assert.deepEqual(ids(r), ["T1"]);
  assert.match(r.violacoes[0].msg, /roda e não prova/);
});

// codecheck: ignore T2 — o corpo deste teste carrega a tautologia que a regra procura
test("T2: asserção que não pode falhar", async () => {
  const dir = await projeto({
    "src/a.js": "export const a = 1;",
    "test/a.test.js": [
      "import { test } from 'node:test';",
      "import assert from 'node:assert/strict';",
      // codecheck: ignore T2 — a asserção sempre-verdadeira é o input que prova a regra
      "test('placeholder', () => { assert.ok(true); });",
    ].join("\n"),
  });
  const r = await verificar(dir);
  assert.deepEqual(ids(r), ["T2"]);
});

test("T3: skip sem motivo acusa; com motivo na linha anterior passa", async () => {
  const dir = await projeto({
    "src/a.js": "export const a = 1;",
    "test/a.test.js": [
      "import { test } from 'node:test';",
      "test.skip('sem motivo', () => {});",
      "// flaky no CI enquanto o mock de rede não chega — #402",
      "test.skip('com motivo', () => {});",
      "// skipped because the network mock is not ready yet",
      "test.skip('with the reason in English', () => {});",
    ].join("\n"),
  });
  const r = await verificar(dir);
  assert.deepEqual(ids(r).filter((i) => i === "T3"), ["T3"]);
});

// --- C: o contrato do projeto ---------------------------------------------

test("C1: import cruzando a fronteira declarada no CLAUDE.md", async () => {
  const dir = await copiaDoLimpo();
  await writeFile(
    path.join(dir, "src/dominio/vaza.js"),
    "import { responder } from '../borda/http.js';\nexport const x = () => responder({});\n",
  );
  const r = await verificar(dir);
  assert.deepEqual(ids(r), ["C1"]);
  assert.match(r.violacoes[0].msg, /`dominio\/` importa de `borda\/`/);
});

test("no projeto sem contrato, o kit é útil e a família C fica muda", async () => {
  // O fixture `sujo` é o que os comandos encontram no mundo real: sem
  // CLAUDE.md, com dívida que ninguém registrou. Prova as duas metades da
  // dependência graciosa — o que funciona sem contrato, e o que não inventa.
  const SUJO = fileURLToPath(
    new URL("../examples/fixtures/sujo", import.meta.url),
  );
  const r = await verificar(SUJO, { strict: true });
  const familias = new Set([...r.violacoes, ...r.avisos].map((v) => v.familia));

  assert.ok(
    ["Justificativa", "Testes", "Duplicação"].every((f) => familias.has(f)),
    `esperava J, T e D no projeto sujo; achei ${[...familias].join(", ")}`,
  );
  assert.ok(
    !familias.has("Contrato"),
    "sem CLAUDE.md a família Contrato não pode acusar nada",
  );
});

test("C1 não roda sem CLAUDE.md — a dependência é graciosa", async () => {
  const dir = await copiaDoLimpo();
  await rm(path.join(dir, "CLAUDE.md"));
  await writeFile(
    path.join(dir, "src/dominio/vaza.js"),
    "import { responder } from '../borda/http.js';\nexport const x = () => responder({});\n",
  );
  const r = await verificar(dir, { strict: true });
  assert.deepEqual(
    ids(r).filter((i) => i.startsWith("C")),
    [],
    "sem contrato não há o que cobrar — o kit não inventa fronteira",
  );
});

test("C2: token proibido pelo Nunca fazer; pasta e any ficam de fora", async () => {
  const dir = await copiaDoLimpo({
    "CLAUDE.md": (md) =>
      md.replace(
        "- Nunca usar float para dinheiro",
        "- Nunca usar `process.exit` fora da borda — mata o processo no meio de uma requisição.\n- Nunca usar float para dinheiro",
      ),
  });
  await writeFile(
    path.join(dir, "src/dominio/abortar.js"),
    "export function abortar() {\n  process.exit(1);\n}\n",
  );
  // Um comentário citando as pastas não pode acender: `borda/` e `dominio/`
  // são assunto do C1, e o C2 os ignora de propósito.
  await writeFile(
    path.join(dir, "src/borda/nota.js"),
    "// este módulo não fala com dominio nem borda diretamente\nexport const z = 1;\n",
  );
  const r = await verificar(dir, { strict: true });
  const doC2 = r.violacoes.filter((v) => v.id === "C2");
  assert.equal(doC2.length, 1);
  assert.match(doC2[0].msg, /process\.exit/);
  assert.equal(doC2[0].arquivo, path.join("src", "dominio", "abortar.js"));
});

// --- M: código morto, com a postura de "na dúvida, fica" -------------------

test("M1: export sem consumidor acende; export usado por outro arquivo não", async () => {
  const dir = await projeto({
    "src/a.js": "export const usado = 1;\nexport const orfao = 2;\n",
    "src/b.js": "import { usado } from './a.js';\nexport const c = usado;\n",
    "src/index.js": "export { c } from './b.js';\n",
  });
  const r = await verificar(dir);
  const m1 = r.avisos.filter((v) => v.id === "M1");
  assert.equal(m1.length, 1);
  assert.match(m1[0].msg, /`orfao`/);
});

test("M1 não acusa entry point, API do manifest, teste nem acesso dinâmico", async () => {
  const dir = await projeto({
    // entry point: exportar sem consumidor interno é o trabalho dele
    "src/index.js": "export function bootstrap() { return 1; }\n",
    "src/rotas/page.tsx": "export default function Page() { return null; }\nexport const revalidate = 60;\n",
    "vite.config.js": "export default { plugins: [] };\n",
    // API pública declarada no manifest
    "lib/publico.js": "export function apiPublica() { return 1; }\n",
    // acesso dinâmico: o nome só aparece dentro de string
    "src/handlers.js": "export function viaNome() { return 2; }\n",
    // Não exporta nada: o papel dele no teste é só citar `viaNome` dentro de
    // uma string, provando que acesso dinâmico mantém o símbolo vivo.
    "src/registro.js": "import './handlers.js';\nconst mapa = { 'viaNome': true };\nglobalThis.mapa = mapa;\n",
    "package.json": JSON.stringify({ name: "x", type: "module", main: "lib/publico.js" }),
    "test/a.test.js":
      "import { test } from 'node:test';\nimport assert from 'node:assert/strict';\nexport const auxiliar = 1;\ntest('t', () => { assert.equal(1, 1); });",
  });
  const r = await verificar(dir, { strict: true });
  assert.deepEqual(
    r.violacoes.filter((v) => v.id === "M1").map((v) => v.arquivo),
    [],
    "M1 acusou algo que está vivo por convenção, manifest ou acesso dinâmico",
  );
});

test("M1 é aviso, nunca violação sem --strict — prova de morte é do humano", async () => {
  const dir = await projeto({
    "src/a.js": "export const orfao = 1;\n",
    "src/b.js": "export const outro = 2;\nimport './a.js';\n",
  });
  const brando = await verificar(dir);
  assert.deepEqual(brando.violacoes, []);
  assert.ok(brando.avisos.some((v) => v.id === "M1"));

  const estrito = await verificar(dir, { strict: true });
  assert.ok(estrito.violacoes.some((v) => v.id === "M1"));
});

// --- D e V: calibráveis ----------------------------------------------------

test("D1: literal repetido 3× no código; teste não conta", async () => {
  const comTeste = await projeto({
    "src/a.js": "export const a = () => fetch(u, { timeout: 5000 });",
    "test/a.test.js":
      "import { test } from 'node:test';\nimport assert from 'node:assert/strict';\ntest('t', () => { assert.equal(5000, 5000); assert.equal(5000, 5000); });",
  });
  assert.deepEqual(
    semM1(avisos(await verificar(comTeste))),
    [],
    "ocorrência em teste não pode empurrar o literal para o limiar",
  );

  const soCodigo = await projeto({
    "src/a.js": [
      "export const a = () => fetch(u, { timeout: 5000 });",
      "export const b = () => retry({ ms: 5000 });",
      "export const c = () => esperar(5000);",
    ].join("\n"),
  });
  assert.deepEqual(semM1(avisos(await verificar(soCodigo))), ["D1"]);
});

test("--strict promove as calibráveis; as duras não mudam", async () => {
  const dir = await projeto({
    "src/a.js": [
      "export const a = () => fetch(u, { timeout: 5000 });",
      "export const b = () => retry({ ms: 5000 });",
      "export const c = () => esperar(5000);",
      "// TODO: sem rastro",
    ].join("\n"),
  });
  const brando = await verificar(dir);
  assert.deepEqual(ids(brando), ["J2"]);
  assert.deepEqual(semM1(avisos(brando)), ["D1"]);

  const estrito = await verificar(dir, { strict: true });
  assert.deepEqual(semM1(ids(estrito)).sort(), ["D1", "J2"]);
  assert.deepEqual(semM1(avisos(estrito)), []);
});

test("V1 e V2 são avisos: volume é sintoma, não doença", async () => {
  const dir = await projeto({
    "src/grande.js":
      "export function longa() {\n" +
      Array.from({ length: 80 }, (_, i) => `  const v${i} = ${i};`).join("\n") +
      "\n}\n" +
      Array.from({ length: 400 }, (_, i) => `// linha ${i}`).join("\n"),
  });
  const r = await verificar(dir);
  assert.deepEqual(r.violacoes, []);
  assert.deepEqual(semM1(avisos(r)).sort(), ["V1", "V2"]);
});

test("arquivo de teste é reconhecido nas convenções fora do mundo JS", async () => {
  // Regressão: `ehTeste` só lia .test.js e test/ — num projeto Swift os testes
  // (CremaTests/, FooTests.swift) contavam como código, e o D1 empurrava para
  // cima do limiar dezenas de literais que o teste crava de propósito.
  const dir = await projeto({
    "src/a.swift": "let ancora = 4242",
    "CremaTests/FrameRuleTests.swift": "let a = 4242\nlet b = 4242\nlet c = 4242",
    "pkg/tabela_test.go": "var x = 4242",
  });
  const r = await verificar(dir);
  assert.deepEqual(
    avisos(r).filter((i) => i === "D1"),
    [],
    "literal cravado em arquivo de teste contou para o limiar do D1",
  );
});

// --- L0: cobertura é gate, não só mensagem ---------------------------------

test("as regras de forma não rodam fora de JS/TS — o L0 diz, o gate cumpre", async () => {
  // Regressão: o gate não existia e o L0 era só mensagem — J1 rodava em .swift
  // e acusava o `any` de existencial, que o Swift obriga em tipo de protocolo,
  // como escape sem justificativa: centenas de falsos positivos num
  // repositório real, com o L0 dizendo o contrário na mesma saída.
  const dir = await projeto({
    "src/a.swift": [
      "import AppKit",
      "let fonte: any NowPlayingSource = Fonte()",
      "func aplicar() {",
      // codecheck: ignore J3 — o catch vazio em Swift é o input que prova que J3 segue rodando lá
      "  do { try x() } catch {}",
      "}",
    ].join("\n"),
    "src/b.py": "valor = calcular()  # type: ignore",
  });
  const r = await verificar(dir);
  assert.deepEqual(ids(r).filter((i) => i === "J1"), [], "J1 acusou fora de JS/TS");
  assert.deepEqual(ids(r).filter((i) => i === "J3"), ["J3"], "J3 é regra de chaves e alcança o catch do Swift");
  const l0 = r.avisos.filter((v) => v.id === "L0");
  assert.equal(l0.length, 2, "uma linha de L0 por extensão fora de JS/TS");
  assert.ok(
    l0.every((v) => v.msg.includes("J1")),
    "o L0 segue nomeando J1 entre as que não rodam",
  );
});

// --- catálogo e CLI --------------------------------------------------------

const FONTE = await readFile(new URL("../bin/codecheck.mjs", import.meta.url), "utf8");
const IMPLEMENTACAO = FONTE.slice(FONTE.indexOf("const REGRA = Object.fromEntries"));

test("o catálogo é bem formado: ids únicos, campos preenchidos", () => {
  const vistos = new Set();
  for (const r of REGRAS) {
    assert.match(r.id, /^[A-Z]\d+$/, `id fora do padrão: ${r.id}`);
    assert.ok(!vistos.has(r.id), `id duplicado: ${r.id}`);
    vistos.add(r.id);
    for (const campo of ["familia", "titulo", "porque", "ok", "ruim"]) {
      assert.ok(
        typeof r[campo] === "string" && r[campo].trim(),
        `${r.id}: campo "${campo}" vazio`,
      );
    }
    assert.ok(["violacao", "aviso"].includes(r.severidade), `${r.id}: severidade inválida`);
  }
});

test("toda regra do catálogo tem implementação, e toda emissão tem catálogo", () => {
  const conhecidos = new Set(REGRAS.map((r) => r.id));
  for (const r of REGRAS) {
    assert.ok(
      IMPLEMENTACAO.includes(`"${r.id}"`),
      `${r.id} está no catálogo e nenhum achar() a emite`,
    );
  }
  for (const m of IMPLEMENTACAO.matchAll(/,\s*"([A-Z]\d+)",/g)) {
    assert.ok(conhecidos.has(m[1]), `a implementação emite "${m[1]}", fora do catálogo`);
  }
});

test("--explain imprime porquê e os dois exemplos de qualquer regra", () => {
  for (const r of REGRAS) {
    const saida = execFileSync("node", [BIN, "--explain", r.id], { encoding: "utf8" });
    assert.match(saida, new RegExp(`^${r.id} — `));
    assert.ok(saida.includes(r.porque), `${r.id}: --explain não traz o porquê`);
    assert.ok(saida.includes("bem:") && saida.includes("mal:"), `${r.id}: sem exemplos`);
  }
  let code = 0;
  try {
    execFileSync("node", [BIN, "--explain", "Z9"], { stdio: "pipe" });
  } catch (e) {
    code = e.status;
  }
  assert.equal(code, 2, "id inexistente precisa ser erro de uso");
});

test("--json emite o contrato que os comandos consomem", async () => {
  const dir = await projeto({ "src/a.js": "// TODO: sem rastro\nexport const a = 1;" });
  let saida, code = 0;
  try {
    saida = execFileSync("node", [BIN, "--json", dir], { encoding: "utf8" });
  } catch (e) {
    saida = e.stdout;
    code = e.status;
  }
  const r = JSON.parse(saida);
  assert.equal(code, 1);
  assert.equal(r.gramatica, GRAMATICA);
  assert.deepEqual(Object.keys(r).sort(), ["arquivos", "avisos", "gramatica", "violacoes"]);
  for (const v of r.violacoes) {
    assert.deepEqual(Object.keys(v).sort(), [
      "arquivo",
      "familia",
      "id",
      "linha",
      "msg",
      "severidade",
    ]);
  }
});

test("panorama: vários diretórios, e o que não tem código some da lista", async () => {
  const comCodigo = await projeto({ "src/a.js": "// TODO: sem rastro\nexport const a = 1;" });
  const limpo = await projeto({ "src/b.js": "export const b = 1;\nimport './b.js';" });
  const vazio = await mkdtemp(path.join(tmpdir(), "codecheck-nada-"));

  const rodar = (args) => {
    try {
      return { code: 0, out: execFileSync("node", [BIN, ...args], { encoding: "utf8" }) };
    } catch (e) {
      return { code: e.status, out: e.stdout ?? "" };
    }
  };

  const r = rodar([comCodigo, limpo, vazio]);
  assert.equal(r.code, 1, "um projeto com violação precisa reprovar o panorama");
  assert.match(r.out, /resumo: 1 de 2 projeto\(s\) com violação/);
  assert.doesNotMatch(
    r.out,
    new RegExp(path.basename(vazio)),
    "diretório sem código poluiu o panorama",
  );

  // Todos limpos: exit 0.
  assert.equal(rodar([limpo, limpo]).code, 0);

  // Nenhum é alvo: diz isso, e não é erro.
  const nada = rodar([vazio, await mkdtemp(path.join(tmpdir(), "codecheck-nada2-"))]);
  assert.equal(nada.code, 0);
  assert.match(nada.out, /nenhum código encontrado/);
});

test("o CLI roda por symlink sem sair 0 em silêncio", async () => {
  // Regressão herdada do irmão: guarda de entry-point por string de URL falha
  // quando o caminho passa por symlink, e o processo sai 0 sem verificar nada.
  const dir = await projeto({ "src/a.js": "// TODO: sem rastro\nexport const a = 1;" });
  const tmp = await mkdtemp(path.join(tmpdir(), "codecheck-link-"));
  const link = path.join(tmp, "codecheck.mjs");
  const { symlink } = await import("node:fs/promises");
  await symlink(BIN, link);
  const rodar = (exe) => {
    try {
      return { code: 0, out: execFileSync("node", [exe, dir], { encoding: "utf8" }) };
    } catch (e) {
      return { code: e.status, out: e.stdout ?? "" };
    }
  };
  const direto = rodar(BIN);
  const porLink = rodar(link);
  assert.equal(direto.code, 1);
  assert.equal(porLink.code, 1, "invocado por symlink, o CLI não verificou nada");
  assert.equal(porLink.out, direto.out);
  await rm(tmp, { recursive: true, force: true });
});

test('.codecheck.json com {"strict": true} promove como a flag; inválido é erro de uso', async () => {
  // Calibração é decisão do projeto, e decisão do projeto mora versionada nele.
  // Sem isto, "este repositório é estrito" depende de todo mundo lembrar da
  // flag — inclusive o CI de quem clonou.
  const codigo = {
    "src/a.js": "export const t = 5000;\nexport const u = 5000;\nexport const v = 5000;\n",
  };

  const semConfig = await verificar(await projeto(codigo));
  assert.deepEqual(semConfig.violacoes, [], "sem config, D1 é só aviso");
  assert.ok(avisos(semConfig).includes("D1"));

  const dir = await projeto(codigo);
  await writeFile(path.join(dir, ".codecheck.json"), '{"strict": true}\n');
  const comConfig = await verificar(dir);
  assert.ok(
    ids(comConfig).includes("D1"),
    "o .codecheck.json não promoveu o aviso a violação",
  );

  // A flag explícita vence a config, nos dois sentidos.
  const forcandoBrando = await verificar(dir, { strict: false });
  assert.deepEqual(forcandoBrando.violacoes, [], "a opção explícita não venceu a config");

  // JSON quebrado é erro duro: silenciá-lo faria o strict desligar sozinho.
  const quebrado = await projeto(codigo);
  await writeFile(path.join(quebrado, ".codecheck.json"), "{nao é json}\n");
  await assert.rejects(() => verificar(quebrado), /\.codecheck\.json inválido/);
});

test('.codecheck.json com "ignorar" tira o caminho da varredura', async () => {
  // Todo projeto real tem árvore que não é código dele: fixture que precisa
  // estar quebrado, saída de gerador, dependência versionada. Sem isto, a
  // única saída seria suprimir achado a achado num arquivo que ninguém
  // escreveu para ser bom.
  const arquivos = {
    "src/bom.js": "export const bom = 1;\n",
    "fixtures/ruim/src/a.js": "// TODO: sem rastro\nexport const a = 1;\n",
  };

  const semIgnorar = await verificar(await projeto(arquivos));
  assert.ok(ids(semIgnorar).includes("J2"), "sem ignorar, o fixture acusa");

  const dir = await projeto(arquivos);
  await writeFile(path.join(dir, ".codecheck.json"), '{"ignorar": ["fixtures"]}\n');
  const comIgnorar = await verificar(dir);
  assert.deepEqual(
    ids(comIgnorar),
    [],
    "o caminho ignorado ainda foi varrido",
  );

  // A opção explícita vence a config, como em `strict`.
  const forcando = await verificar(dir, { ignorar: [] });
  assert.ok(ids(forcando).includes("J2"), "a opção explícita não venceu a config");
});
