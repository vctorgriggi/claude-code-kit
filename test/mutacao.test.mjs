// Mutação: a prova de que cada regra detecta uma violação real.
//
// Teste unitário prova que a regra dispara no input que o autor inventou. Isto
// parte do projeto de referência — limpo, com contrato, testes passando —,
// quebra um invariante de cada vez do jeito que uma pessoa quebraria, e exige
// que a regra acuse. Regra que não acusa é decoração, e decoração num
// verificador é pior que ausência: o CI verde passa a mentir.
//
// Toda regra do catálogo precisa de um caso aqui; a suíte falha se faltar.

import { test } from "node:test";
import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { REGRAS, verificar } from "../bin/codecheck.mjs";

const LIMPO = fileURLToPath(
  new URL("../examples/fixtures/limpo", import.meta.url),
);

async function copia() {
  const dir = await mkdtemp(path.join(tmpdir(), "codecheck-mut-"));
  await cp(LIMPO, dir, { recursive: true });
  return dir;
}
const gravar = (dir, arquivo, texto) => writeFile(path.join(dir, arquivo), texto);
async function editar(dir, arquivo, transformar) {
  const p = path.join(dir, arquivo);
  await writeFile(p, transformar(await readFile(p, "utf8")));
}

// Cada caso: [id da regra, como quebrar o projeto limpo].
const CASOS = [
  ["J1", (d) =>
    gravar(d, "src/dominio/escape.js", "// @ts-ignore\nexport const x = api.chamar();\n")],

  ["J2", (d) =>
    editar(d, "src/dominio/frete.js", (s) => "// TODO: revisar a tabela\n" + s)],

  ["J3", (d) =>
    editar(d, "src/borda/http.js", (s) =>
      s.replace("  } catch (e) {\n    return { status: 422, erro: e.message };\n  }", "  } catch (e) {}"))],

  ["T1", (d) =>
    editar(d, "test/frete.test.js", (s) =>
      s + "\ntest('roda e não prova nada', () => {\n  cotar({ regiao: 'sul', pesoGramas: 100 });\n});\n")],

  ["T2", (d) =>
    editar(d, "test/frete.test.js", (s) =>
      s + "\ntest('placeholder', () => {\n  assert.ok(true);\n});\n")],

  ["T3", (d) =>
    editar(d, "test/frete.test.js", (s) =>
      s + "\ntest.skip('parado sem explicação', () => {\n  assert.equal(1, 2);\n});\n")],

  ["C1", (d) =>
    gravar(d, "src/dominio/vaza.js",
      "import { responder } from '../borda/http.js';\nexport const x = () => responder({});\n")],

  ["C2", async (d) => {
    await editar(d, "CLAUDE.md", (s) =>
      s.replace(
        "- Nunca usar float para dinheiro",
        "- Nunca usar `process.exit` fora da borda — mata o processo no meio de uma requisição.\n- Nunca usar float para dinheiro",
      ));
    await gravar(d, "src/dominio/abortar.js", "export function abortar() {\n  process.exit(1);\n}\n");
  }],

  ["D1", (d) =>
    gravar(d, "src/borda/retry.js",
      [
        "export const a = () => buscar({ timeout: 7500 });",
        "export const b = () => repetir({ ms: 7500 });",
        "export const c = () => aguardar(7500);",
      ].join("\n"))],

  ["M1", (d) =>
    editar(d, "src/dominio/frete.js", (s) =>
      s + "\nexport function calcularAntigo() {\n  return 0;\n}\n")],

  ["S1", (d) =>
    gravar(d, "src/dominio/silencio.js",
      "// codecheck: ignore J2\n// TODO sem rastro\nexport const x = 1;\n")],

  ["V1", (d) =>
    gravar(d, "src/borda/enorme.js",
      Array.from({ length: 420 }, (_, i) => `export const v${i} = ${i};`).join("\n"))],

  ["V2", (d) =>
    gravar(d, "src/dominio/longa.js",
      "export function longa() {\n" +
        Array.from({ length: 70 }, (_, i) => `  const v${i} = ${i};`).join("\n") +
        "\n  return 0;\n}\n")],
];

test("todo caso de mutação faz a sua regra acusar", async () => {
  const mudas = [];
  for (const [id, mutar] of CASOS) {
    const dir = await copia();
    try {
      await mutar(dir);
      const r = await verificar(dir, { strict: true });
      const acusados = new Set([...r.violacoes, ...r.avisos].map((v) => v.id));
      if (!acusados.has(id)) {
        mudas.push(`${id} (passou; acusou: ${[...acusados].join(", ") || "nada"})`);
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
  assert.deepEqual(
    mudas,
    [],
    `regras que não detectam a própria violação:\n  ${mudas.join("\n  ")}`,
  );
});

test("toda regra do catálogo tem um caso de mutação", () => {
  const comCaso = new Set(CASOS.map(([id]) => id));
  const semCaso = REGRAS.map((r) => r.id).filter((id) => !comCaso.has(id));
  assert.deepEqual(
    semCaso,
    [],
    `regras sem caso de mutação: ${semCaso.join(", ")} — uma regra que ninguém provou detectar nada não deveria existir`,
  );
});

test("o projeto de referência tem código real por baixo, e ele funciona", async () => {
  // Fixture cujos testes não passam é exemplo que ensina errado — e a mutação
  // partiria de uma base já quebrada, sem ninguém notar.
  // `NODE_TEST_CONTEXT` precisa sair do ambiente do filho. Herdado, ele faz o
  // runner reportar por IPC em vez de sair com código de erro — e o teste
  // passaria com o fixture quebrado, verificando nada. Verificado: com a
  // variável herdada, quebrar o cálculo do frete não derrubava esta asserção.
  const { execFileSync } = await import("node:child_process");
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (k.startsWith("NODE_TEST")) delete env[k];

  try {
    execFileSync("node", ["--test"], { cwd: LIMPO, encoding: "utf8", env });
  } catch (e) {
    assert.fail(`a suíte do projeto de referência não passa:\n${e.stdout}`);
  }
});
