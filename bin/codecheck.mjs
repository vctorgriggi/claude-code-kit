#!/usr/bin/env node
// codecheck: verifica os invariantes mecânicos de zelo de código — o que dá
// para provar sem julgamento. Zero dependências (Node ≥ 20); instalação por
// cópia, como o restante do kit.
//
// Uso: node codecheck.mjs [diretório]
//      node codecheck.mjs <dir> <dir> …    panorama de vários projetos
//      node codecheck.mjs --explain <id>   catálogo de uma regra
//      node codecheck.mjs --json [dir]     achados em JSON
//      node codecheck.mjs --strict [dir]   promove as calibráveis a violação
// Exit: 0 sem violações; 1 com violações; 2 erro de uso.
//
// O catálogo REGRAS é a fonte legível-por-máquina: a tabela da gramática e o
// --explain saem dele. Nenhum invariante existe só no texto ou só aqui.
//
// A família `C` é a que nenhuma ferramenta genérica alcança: ela lê o CLAUDE.md
// do projeto — a fronteira entre camadas declarada na árvore da Estrutura (C1) e
// as proibições nomeadas no "Nunca fazer" (C2). O contrato é do projeto; este
// verificador só o executa. Sem CLAUDE.md, a família não roda.

import { readFile, readdir, lstat } from "node:fs/promises";
import { existsSync, realpathSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const GRAMATICA = "v1";

// Extensões que contam como código-fonte do projeto.
const FONTES = new Set([
  ".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".mts", ".cts",
  ".py", ".rb", ".go", ".rs", ".java", ".kt", ".swift", ".php",
]);

// Nunca varridos: não são código que alguém escreveu para este projeto.
const IGNORADOS = new Set([
  ".git", "node_modules", "dist", "build", "out", "coverage", "vendor",
  ".next", ".nuxt", ".svelte-kit", "target", "__pycache__", ".venv", "venv",
]);

const LIMITE_ARQUIVO = 400; // linhas
const LIMITE_FUNCAO = 60; // linhas
const MIN_REPETICOES = 3; // literal repetido a partir da terceira ocorrência

// Um único lugar decide o que é arquivo de teste: a família T só roda neles, e
// o D1 os ignora ao contar literais.
const ehTeste = (rel) => /\.(test|spec)\.[jt]sx?$|(^|\/)tests?\//.test(rel);

export const REGRAS = [
  {
    id: "J1",
    familia: "Justificativa",
    severidade: "violacao",
    titulo: "escape de tipo carrega o porquê na própria linha",
    porque:
      "`any`, `@ts-ignore` e `eslint-disable` são decisões, não acidentes. Sem o motivo na linha, ninguém sabe se ainda vale — e o escape vira permanente porque remover parece arriscado.",
    ok: "// @ts-expect-error — o tipo do SDK v3 está errado; issue #412\nconst r = cliente.chamar(x);",
    ruim: "// @ts-ignore\nconst r = cliente.chamar(x);",
  },
  {
    id: "J2",
    familia: "Justificativa",
    severidade: "violacao",
    titulo: "TODO e FIXME apontam para algo rastreável",
    porque:
      "TODO sem dono nem referência não é plano, é sedimento: ninguém sabe se ainda importa e ninguém se sente autorizado a apagar.",
    ok: "// TODO(#317): trocar pelo endpoint novo quando a v2 sair do beta",
    ruim: "// TODO: melhorar isso",
  },
  {
    id: "J3",
    familia: "Justificativa",
    severidade: "violacao",
    titulo: "catch não engole o erro em silêncio",
    porque:
      "Catch vazio transforma falha em comportamento aleatório mais adiante, e apaga o rastro que apontaria a origem. Se ignorar é a decisão certa, ela precisa estar escrita.",
    ok: "try { cache.limpar(); } catch { /* cache é best-effort; falha aqui não afeta a resposta */ }",
    // codecheck: ignore J3 — este é o exemplo "mal" do catálogo, não código
    ruim: "try { cache.limpar(); } catch (e) {}",
  },
  {
    id: "T1",
    familia: "Testes",
    severidade: "violacao",
    titulo: "teste que não afirma nada",
    porque:
      "Teste sem asserção passa sempre — inclusive quando o código quebra. É pior que teste ausente: a suíte verde afirma uma cobertura que não existe.",
    ok: "test('recusa centavo fracionário', () => {\n  assert.throws(() => total([{ centavos: 1.5 }]));\n});",
    ruim: "test('total', () => {\n  total([{ centavos: 100 }]);\n});",
  },
  {
    id: "T2",
    familia: "Testes",
    severidade: "violacao",
    titulo: "asserção que não pode falhar",
    porque:
      "`expect(true).toBe(true)` e `assert.equal(x, x)` são ruído que conta como cobertura. Quase sempre é resto de um teste que alguém começou e não terminou.",
    ok: "assert.equal(total(itens), 899);",
    ruim: "assert.ok(true); // placeholder",
  },
  {
    id: "T3",
    familia: "Testes",
    severidade: "violacao",
    titulo: "teste pulado carrega o porquê e a condição de volta",
    porque:
      "`skip` sem motivo vira permanente: ninguém sabe se o teste está quebrado, se a feature saiu, ou se era flaky. Some da suíte sem sumir do arquivo.",
    ok: "// flaky no CI enquanto o mock de rede não chega — #402\ntest.skip('baixa o índice remoto', …)",
    ruim: "test.skip('baixa o índice remoto', …)",
  },
  {
    id: "D1",
    familia: "Duplicação",
    severidade: "aviso",
    promovivel: true,
    titulo: "literal repetido três vezes ou mais",
    porque:
      "A terceira ocorrência é onde o custo vira real: alguém vai mudar duas e esquecer a terceira. Duas é coincidência; três é uma constante que ninguém nomeou. Arquivo de teste não conta — teste deve cravar o valor esperado, senão a asserção compara a constante consigo mesma e não prova nada.",
    ok: "const TIMEOUT_MS = 5000; // usado nos três lugares",
    ruim: "fetch(u, { timeout: 5000 }) … retry(5000) … esperar(5000)",
  },
  {
    id: "C1",
    familia: "Contrato",
    severidade: "violacao",
    titulo: "import não cruza a fronteira declarada no CLAUDE.md",
    porque:
      "A árvore comentada da Estrutura declara o que cada pasta é e o que ela nunca importa. Um linter genérico não sabe disso — só o contrato do projeto sabe. Import que cruza a fronteira é a violação mais cara de desfazer, porque a dependência se espalha antes de alguém notar.",
    ok: "CLAUDE.md: `dominio/ # nunca importa de borda/`\nsrc/dominio/frete.js importa só de dominio/",
    ruim: "o mesmo contrato, e `src/dominio/frete.js` com `import { db } from '../borda/db.js'`",
  },
  {
    id: "C2",
    familia: "Contrato",
    severidade: "aviso",
    promovivel: true,
    titulo: 'proibição do "Nunca fazer" que virou grep',
    porque:
      "Cada proibição do CLAUDE.md nomeia um símbolo concreto na maioria dos casos — `var`, `any`, `float`, `process.exit`. Quando nomeia, dá para procurar. Aviso e não violação porque o texto é prosa: a correspondência é heurística e o julgamento final é de quem lê.",
    ok: 'CLAUDE.md proíbe `float` para dinheiro; o código só usa centavos inteiros',
    ruim: 'a mesma proibição, e `const preco = 19.90` no código',
  },
  {
    id: "S1",
    familia: "Supressão",
    severidade: "violacao",
    titulo: "supressão declara o motivo",
    porque:
      "Supressão sem motivo é a porta pela qual um verificador morre: alguém silencia o achado, ninguém sabe por quê, e a regra vira decoração. Com o motivo na linha, silenciar é uma decisão auditável como qualquer outra.",
    ok: "// codecheck: ignore J1 — este é o regex que detecta o escape, não um escape",
    ruim: "// codecheck: ignore J1",
  },
  {
    id: "V1",
    familia: "Volume",
    severidade: "aviso",
    promovivel: true,
    titulo: "arquivo acima do limite brando",
    porque:
      "Arquivo grande demais não é erro, é sinal: quase sempre há duas responsabilidades ali. Aviso, nunca violação — o corte é julgamento.",
    ok: `arquivo com menos de ${LIMITE_ARQUIVO} linhas, ou um acima com motivo declarado`,
    ruim: `um módulo de ${LIMITE_ARQUIVO * 2} linhas fazendo parsing, validação e I/O`,
  },
  {
    id: "V2",
    familia: "Volume",
    severidade: "aviso",
    promovivel: true,
    titulo: "função acima do limite brando",
    porque:
      "Função longa esconde o caminho de erro no meio do caminho feliz. O limite é brando de propósito: há funções longas legítimas (máquinas de estado, parsers).",
    ok: `função com menos de ${LIMITE_FUNCAO} linhas`,
    ruim: `um handler de ${LIMITE_FUNCAO * 3} linhas com validação, regra e resposta juntas`,
  },
];

const REGRA = Object.fromEntries(REGRAS.map((r) => [r.id, r]));
const PROMOVIVEIS = new Set(REGRAS.filter((r) => r.promovivel).map((r) => r.id));

// --- varredura ---------------------------------------------------------

async function fontes(dir, acc = [], raiz = dir) {
  let entradas;
  try {
    entradas = await readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entradas) {
    if (IGNORADOS.has(e.name) || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isSymbolicLink()) continue;
    if (e.isDirectory()) await fontes(p, acc, raiz);
    else if (FONTES.has(path.extname(e.name))) acc.push(p);
  }
  return acc;
}

// Linhas dentro de string ou comentário de bloco não são código executável;
// varrer sem isso faria um `"// TODO"` dentro de uma string virar achado.
function semStrings(linha) {
  return linha
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/`(?:[^`\\]|\\.)*`/g, "``");
}

// --- o contrato do projeto ------------------------------------------------
//
// Sem CLAUDE.md, a família C não roda e o kit continua útil — é a dependência
// graciosa. Com ele, o verificador passa a cobrar o que ESTE projeto declarou,
// que é a coisa que nenhuma ferramenta genérica consegue.

// Fronteiras da árvore comentada da Estrutura: `pasta/ # … nunca importa de X`.
function fronteiras(claude) {
  const fim = claude.slice(claude.indexOf("## Estrutura"));
  const bloco = fim.match(/```[^\n]*\n([\s\S]*?)```/);
  if (!bloco) return [];
  const out = [];
  for (const l of bloco[1].split("\n")) {
    const nome = l.match(/^\s*([\w.@-]+)\/\s*#(.*)$/);
    if (!nome) continue;
    for (const p of nome[2].matchAll(/nunca importa (?:de|da|do)\s+`?([\w.@/-]+?)\/?`?(?:[\s,.)]|$)/gi)) {
      out.push({ de: nome[1], nao: p[1] });
    }
  }
  return out;
}

// Símbolos concretos citados em crase dentro do "Nunca fazer".
function proibicoes(claude) {
  const sec = claude.slice(claude.indexOf("## Nunca fazer"));
  const corpo = sec.slice(0, sec.slice(2).search(/^## /m) + 2 || undefined);
  const out = [];
  for (const l of corpo.split("\n")) {
    if (!/^- Nunca /.test(l)) continue;
    for (const m of l.matchAll(/`([^`\n]{2,40})`/g)) {
      const s = m[1];
      // Só token de código dá para procurar.
      if (!/^[\w.@$-]+$/.test(s)) continue;
      // Caminho ou pasta é assunto de fronteira (C1), não token proibido —
      // sem isto, `borda/` citado num comentário viraria achado.
      if (s.includes("/") || s.endsWith("/")) continue;
      // O que outra família já cobre melhor não vira achado duplicado aqui:
      // `any` e `@ts-ignore` são J1, que sabe distinguir com e sem justificativa.
      if (/^(any|@ts-\w+|eslint-disable[\w-]*)$/.test(s)) continue;
      out.push({ simbolo: s, regra: l.replace(/^- /, "").trim() });
    }
  }
  return out;
}

export async function verificar(dirs, opcoes = {}) {
  const strict = opcoes.strict === true;
  const achados = [];
  const achar = (arquivo, linha, id, msg) => {
    const r = REGRA[id];
    if (!r) throw new Error(`id fora do catálogo REGRAS: ${id}`);
    const severidade =
      strict && PROMOVIVEIS.has(id) ? "violacao" : r.severidade;
    achados.push({ arquivo, linha, id, familia: r.familia, severidade, msg });
  };

  const raiz = Array.isArray(dirs) ? dirs[0] : dirs;
  const arquivos = await fontes(raiz);
  if (!arquivos.length) {
    throw new Error(`nenhum arquivo de código em ${raiz}`);
  }

  const literais = new Map(); // valor → [{arquivo, linha}]

  // O contrato, quando existe. Ausente: a família C não roda (dependência
  // graciosa) e nada disso vira violação inventada.
  const pClaude = path.join(raiz, "CLAUDE.md");
  const claude = existsSync(pClaude) ? await readFile(pClaude, "utf8") : null;
  const FRONTEIRAS = claude ? fronteiras(claude) : [];
  const PROIBIDOS = claude ? proibicoes(claude) : [];

  for (const abs of arquivos) {
    const rel = path.relative(raiz, abs);
    const texto = await readFile(abs, "utf8");
    const linhas = texto.split("\n");

    // C1 — import cruzando fronteira declarada
    for (const f of FRONTEIRAS) {
      if (!rel.split(path.sep).includes(f.de)) continue;
      for (const m of texto.matchAll(/(?:^|\n)\s*(?:import[^\n]*?from\s*|.*?\brequire\s*\()\s*['"]([^'"]+)['"]/g)) {
        const alvo = m[1];
        const resolvido = alvo.startsWith(".")
          ? path.normalize(path.join(path.dirname(rel), alvo))
          : alvo;
        if (resolvido.split(/[\\/]/).includes(f.nao)) {
          const linha = texto.slice(0, m.index).split("\n").length + 1;
          achar(rel, linha, "C1", `\`${f.de}/\` importa de \`${f.nao}/\`, que o CLAUDE.md declara que ele nunca importa`);
        }
      }
    }

    // C2 — símbolo que o "Nunca fazer" proíbe, aparecendo no código
    if (!ehTeste(rel)) {
      linhas.forEach((l, i) => {
        const codigo = semStrings(l);
        for (const p of PROIBIDOS) {
          const esc = p.simbolo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          if (!new RegExp(`(^|[^\\w.$-])${esc}([^\\w$-]|$)`).test(codigo)) continue;
          achar(rel, i + 1, "C2", `usa \`${p.simbolo}\`, que o CLAUDE.md proíbe — "${p.regra}"`);
        }
      });
    }

    if (linhas.length > LIMITE_ARQUIVO) {
      achar(rel, 1, "V1", `${linhas.length} linhas (limite brando: ${LIMITE_ARQUIVO})`);
    }

    linhas.forEach((l, i) => {
      const n = i + 1;
      const codigo = semStrings(l);

      // J1 — escape de tipo sem justificativa na linha
      // codecheck: ignore J1 — este é o padrão que detecta o escape
      const escape = codigo.match(/@ts-ignore|@ts-nocheck|eslint-disable(?:-next)?-line|:\s*any\b|\bas any\b|# type:\s*ignore|# noqa/);
      if (escape) {
        const temPorque = /—|--\s|\bporque\b|#\d+|issue|bug|https?:\/\//i.test(l);
        if (!temPorque) {
          achar(rel, n, "J1", `"${escape[0]}" sem justificativa na linha`);
        }
      }

      // J2 — marcador de pendência sem referência rastreável
      // codecheck: ignore J2 — este é o padrão que detecta os marcadores
      const todo = codigo.match(/\b(TODO|FIXME|HACK|XXX)\b/);
      if (todo) {
        const rastreavel = /\(#?\w+\)|#\d+|[A-Z]{2,}-\d+|https?:\/\//.test(l);
        if (!rastreavel) {
          achar(rel, n, "J2", `${todo[1]} sem issue, ticket ou dono`);
        }
      }

      // D1 — literais candidatos a constante. Duas exclusões: arquivo de teste
      // (cravar o valor esperado é o trabalho dele) e número dentro de string
      // (texto de mensagem ou exemplo não é constante mágica no código).
      if (!ehTeste(rel)) for (const m of codigo.matchAll(/(?<![\w.])(\d{3,})(?![\w.])/g)) {
        const v = m[1];
        if (/^[01]+$/.test(v) || Number(v) === 100 || Number(v) === 1000) continue;
        if (!literais.has(v)) literais.set(v, []);
        literais.get(v).push({ arquivo: rel, linha: n });
      }
    });

    // J3 — catch vazio ou que só engole
    for (const m of texto.matchAll(/catch\s*(?:\([^)]*\))?\s*\{([^{}]*)\}/g)) {
      const corpo = m[1];
      const vazio = corpo.trim() === "";
      const soComentario = /^\s*(?:\/\/[^\n]*|\/\*[\s\S]*?\*\/)\s*$/.test(corpo);
      if (vazio) {
        const linha = texto.slice(0, m.index).split("\n").length;
        achar(rel, linha, "J3", "catch vazio: o erro some sem deixar rastro");
        // "ignora" não entra na lista: repetir que se está ignorando é o
        // problema, não a justificativa. O que vale é o motivo — travessão,
        // "porque", ou um qualificador que explique a tolerância à falha.
      } else if (soComentario && !/—|--\s|\bporque\b|best-effort|opcional|não bloqueia/i.test(corpo)) {
        const linha = texto.slice(0, m.index).split("\n").length;
        achar(rel, linha, "J3", "catch só com comentário que não diz por que ignorar");
      }
    }

    // --- família T: só em arquivo de teste ---
    if (ehTeste(rel)) {
      const AFIRMA = /\b(assert|expect|should|t\.(ok|is|deepEqual)|assertEqual)\b/;

      // T1 — corpo de teste sem nenhuma asserção
      for (const m of texto.matchAll(
        /\b(?:it|test)\s*\(\s*(['"`])(.+?)\1\s*,\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{/g,
      )) {
        const abre = m.index + m[0].length - 1;
        let prof = 0;
        let fim = abre;
        for (let k = abre; k < texto.length; k++) {
          if (texto[k] === "{") prof++;
          else if (texto[k] === "}" && --prof === 0) {
            fim = k;
            break;
          }
        }
        const corpo = texto.slice(abre, fim);
        const linha = texto.slice(0, m.index).split("\n").length;
        if (!AFIRMA.test(corpo)) {
          achar(rel, linha, "T1", `"${m[2]}" roda o código e não afirma nada`);
        }
        // T2 — asserção que não pode falhar
        const tautologia = corpo.match(
          /(?:expect\(\s*(true|1)\s*\)\s*\.\w+\(\s*(?:true|1)\s*\)|assert\.(?:ok|equal)\(\s*true\s*[,)])/,
        );
        if (tautologia) {
          achar(rel, linha, "T2", `"${m[2]}" contém asserção que não pode falhar`);
        }
      }

      // T3 — teste pulado sem justificativa na linha ou na anterior
      linhas.forEach((l, i) => {
        if (!/\b(?:it|test|describe)\.(?:skip|todo)\b|\bx(?:it|test|describe)\s*\(/.test(semStrings(l))) return;
        const contexto = `${linhas[i - 1] ?? ""}\n${l}`;
        if (!/—|--\s|#\d+|[A-Z]{2,}-\d+|https?:\/\/|\bflaky\b|\bporque\b/i.test(contexto)) {
          achar(rel, i + 1, "T3", "teste pulado sem motivo nem condição de volta");
        }
      });
    }

    // V2 — funções longas (heurística por chave de bloco no nível do arquivo)
    let inicio = null;
    let profundidade = 0;
    linhas.forEach((l, i) => {
      const abre = (l.match(/\{/g) || []).length;
      const fecha = (l.match(/\}/g) || []).length;
      if (
        inicio === null &&
        /\b(function|=>|def |func |fn )\b/.test(semStrings(l)) &&
        abre > fecha
      ) {
        inicio = i;
        profundidade = abre - fecha;
        return;
      }
      if (inicio !== null) {
        profundidade += abre - fecha;
        if (profundidade <= 0) {
          const tamanho = i - inicio + 1;
          if (tamanho > LIMITE_FUNCAO) {
            achar(rel, inicio + 1, "V2", `função de ${tamanho} linhas (limite brando: ${LIMITE_FUNCAO})`);
          }
          inicio = null;
        }
      }
    });
  }

  for (const [valor, onde] of literais) {
    if (onde.length < MIN_REPETICOES) continue;
    const lugares = onde.map((o) => `${o.arquivo}:${o.linha}`).join(", ");
    achar(
      onde[0].arquivo,
      onde[0].linha,
      "D1",
      `o literal ${valor} aparece ${onde.length}× (${lugares}); nomeie a constante`,
    );
  }

  // --- supressão justificada -------------------------------------------
  // `// codecheck: ignore <ID> — motivo` silencia um id na própria linha ou na
  // seguinte. Escopo de linha, não de arquivo: código é denso, e silenciar um
  // arquivo inteiro esconde o achado seguinte que ninguém pediu para ignorar.
  const suprimido = new Set();
  for (const abs of arquivos) {
    const rel = path.relative(raiz, abs);
    (await readFile(abs, "utf8")).split("\n").forEach((l, i) => {
      const m = l.match(/codecheck:\s*ignore\s+([A-Z]\d+)\s*(.*?)\s*(?:\*\/|$)/);
      if (!m) return;
      const motivo = m[2].replace(/^[—–-]+\s*/, "").trim();
      if (!REGRA[m[1]]) {
        achar(rel, i + 1, "S1", `supressão de "${m[1]}", que não existe no catálogo`);
      } else if (!motivo) {
        achar(rel, i + 1, "S1", `supressão de ${m[1]} sem motivo na linha`);
      } else {
        suprimido.add(`${rel}:${i + 1}:${m[1]}`);
        suprimido.add(`${rel}:${i + 2}:${m[1]}`);
      }
    });
  }
  const efetivos = achados.filter(
    (a) => !suprimido.has(`${a.arquivo}:${a.linha}:${a.id}`),
  );
  achados.length = 0;
  achados.push(...efetivos);

  achados.sort(
    (a, b) => a.arquivo.localeCompare(b.arquivo) || a.linha - b.linha,
  );
  return {
    violacoes: achados.filter((a) => a.severidade === "violacao"),
    avisos: achados.filter((a) => a.severidade === "aviso"),
    arquivos: arquivos.length,
  };
}

// --- CLI ---------------------------------------------------------------

const AJUDA = [
  "uso: node codecheck.mjs [diretório]        (padrão: .)",
  "     node codecheck.mjs --explain <id>     catálogo de uma regra",
  "     node codecheck.mjs --json [dir]       achados em JSON",
  "     node codecheck.mjs --strict [dir]     promove as calibráveis a violação",
  "",
  `regras: ${REGRAS.map((r) => r.id).join(", ")}`,
].join("\n");

function explicar(id) {
  const r = REGRA[(id || "").toUpperCase()];
  if (!r) {
    console.error(
      `erro: id desconhecido "${id}". Conhecidos: ${REGRAS.map((x) => x.id).join(", ")}`,
    );
    return 2;
  }
  const indenta = (s) => s.split("\n").map((l) => `    ${l}`).join("\n");
  console.log(`${r.id} — ${r.titulo}`);
  console.log(`  família ${r.familia} · ${r.severidade}${r.promovivel ? " (promovível)" : ""}`);
  console.log(`\n  ${r.porque}\n`);
  console.log("  bem:");
  console.log(indenta(r.ok));
  console.log("\n  mal:");
  console.log(indenta(r.ruim));
  return 0;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("-h") || args.includes("--help")) {
    console.log(AJUDA);
    process.exit(0);
  }
  const i = args.indexOf("--explain");
  if (i !== -1) process.exit(explicar(args[i + 1]));

  const FLAGS = ["--json", "--strict"];
  const dirs = args.filter((a) => !a.startsWith("-"));
  if (args.some((a) => a.startsWith("-") && !FLAGS.includes(a))) {
    console.error(AJUDA);
    process.exit(2);
  }
  const opcoes = args.includes("--strict") ? { strict: true } : {};

  try {
    const r = await verificar(dirs[0] || ".", opcoes);
    if (args.includes("--json")) {
      console.log(JSON.stringify({ gramatica: GRAMATICA, ...r }, null, 2));
      process.exit(r.violacoes.length === 0 ? 0 : 1);
    }
    for (const v of r.violacoes) console.log(`${v.arquivo}:${v.linha} [${v.id}] ${v.msg}`);
    for (const a of r.avisos) console.log(`${a.arquivo}:${a.linha} [${a.id}] aviso: ${a.msg}`);
    if (r.violacoes.length === 0) {
      console.log(
        `ok: zelo ${GRAMATICA} sem violações mecânicas (${r.arquivos} arquivo(s))` +
          (r.avisos.length ? ` — ${r.avisos.length} aviso(s)` : ""),
      );
      process.exit(0);
    }
    console.log(`resumo: ${r.violacoes.length} violação(ões)`);
    process.exit(1);
  } catch (e) {
    console.error(`erro: ${e.message}`);
    process.exit(2);
  }
}

// Entry-point por realpath: em macOS `/tmp` e `/var` são symlinks, e symlinkar
// o binário para a cópia do repo é o atalho óbvio. Comparar URLs cruas faria o
// guard falhar e o CLI sair 0 sem verificar nada — a pior falha possível.
function ehEntryPoint() {
  if (!process.argv[1]) return false;
  const real = (p) => {
    try {
      return realpathSync(p);
    } catch {
      return p;
    }
  };
  return real(process.argv[1]) === real(fileURLToPath(import.meta.url));
}

if (ehEntryPoint()) await main();
