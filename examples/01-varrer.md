# Exemplo 1: /code:varrer — o retrato antes de gastar atenção

Sessão sobre um repositório herdado, com `CLAUDE.md` no lugar. Blockquotes em
itálico são anotações; o resto é a sessão.

---

**Usuário:** `/code:varrer`

**Agente:** [lê `~/.claude/code-kit/GRAMATICA.md`; roda
`node ~/.claude/bin/codecheck.mjs --json .`; levanta os arquivos quentes com
`git log --format= --name-only -80 | sort | uniq -c | sort -rn | head -20`;
amostra 4 deles]

**[CRÍTICO]** `src/dominio/frete.js:22` (`C1`) — importa de `borda/`, que o
CLAUDE.md declara que o domínio nunca importa → o cálculo deixa de ser testável
sem subir infraestrutura, e é a regra de ouro do projeto.

**[CRÍTICO]** `src/borda/api.js:41` (`J3`) — `catch` devolve `[]` → o chamador
não distingue "sem dados" de "não consegui buscar". Este arquivo mudou 11 vezes
em 80 commits.

**[ALTO]** `src/borda/api.js:88` — `setTimeout(…, 300)` esperando o DOM montar
→ passa em máquina rápida, falha em CI carregado. Contorno, não correção.

**[MÉDIO]** `src/dominio/frete.js:1` (`V1`) — 612 linhas → cálculo, validação e
formatação no mesmo módulo.

**[MÉDIO]** 7 comentários que repetem o código, concentrados em `src/borda/`.

---

**Veredito:** o mecânico acusa 2 críticos, e os dois estão em código que muda
toda semana. O resto é atrito acumulado, não urgência.

**Na ordem que eu faria:**

1. `/code:contrato` — a violação da regra de ouro é a mais cara de desfazer, e
   quanto mais tempo fica, mais código depende dela.
2. `/code:gambiarra` — o `catch` e o `setTimeout` moram no mesmo arquivo quente.
3. `/code:comentarios` — barato, e limpa o ruído da área que você vai mexer.

Nada disto foi aplicado; `git status` continua limpo.

> _Ordenado por consequência, não por arquivo. Cada linha diz **o que muda** se
> for corrigido — sem isso não é achado, é opinião (GRAMATICA §1). E o comando
> não escolheu por você: devolveu a ordem e o porquê._
