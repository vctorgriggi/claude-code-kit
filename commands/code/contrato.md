---
description: Confere o código contra o contrato que o próprio projeto declarou no CLAUDE.md — regra de ouro, proibições e fronteiras. É a lâmina que nenhuma ferramenta genérica tem. Reporta antes de aplicar.
argument-hint: [pasta ou área para focar]
# npm test/npm run/node --test: o "Aplique e verifique" cobra typecheck, lint e
# testes, e verificação obrigatória não deve esbarrar no prompt. Runner de outra
# stack (pytest, go test) passa pelo prompt do harness, como qualquer não listado.
allowed-tools: Read, Glob, Grep, Edit, Bash(git log:*), Bash(ls:*), Bash(npm test:*), Bash(npm run:*), Bash(node --test:*), Bash(node ~/.claude/bin/codecheck.mjs:*)
disable-model-invocation: true
---

# /code:contrato

Foco (pode estar vazio): $ARGUMENTS

Linter genérico cobra regra genérica. Este cobra **a regra que este projeto
escolheu** — e por isso é o único que pode dizer "isto viola a sua regra de
ouro".

**Reporta antes de aplicar.**

## 0. Carregue o zelo e o contrato

Leia `~/.claude/code-kit/GRAMATICA.md` (expanda `~`). Ausente: **pare**.

Leia o `CLAUDE.md` do projeto. **Sem ele, pare também** — mas com outra
mensagem: este comando não tem o que cobrar, e o caminho é gerar o doc-set com
`/docs:fundar` (kit irmão) ou usar `/code:varrer`, que funciona sem contrato.

`node ~/.claude/bin/codecheck.mjs --json .`: `C1` e `C2` já cobrem o que é
mecânico — import cruzando fronteira e token proibido nomeado em crase. Parta
deles; o que sobra é o que exige julgamento.

## 1. Os quatro níveis do contrato

**Regra de ouro.** A disciplina central, em uma frase. Procure a violação mais
cara de desfazer — não a mais frequente. Uma regra de ouro que o código
desmente é pior que nenhuma: o agente que a lê age contra o repositório.

**Nunca fazer.** Cada proibição carrega a justificativa na linha. As que nomeiam
símbolo o `C2` pega; as que descrevem comportamento ("nunca engolir erro de
integração em silêncio") exigem ler o código.

**Estrutura.** A árvore comentada e o que cada pasta nunca importa. O `C1` pega
o import direto; o indireto — A importa B que importa C — exige seguir a cadeia.

**Convenções.** O padrão declarado para erro, nome, teste, env. Convenção com
`(fonte: docs oficiais …)` merece uma conferida extra: a versão pode ter mudado
desde que ela foi registrada.

## 2. Verifique antes de acusar

- **Cite o trecho do contrato** em cada achado. Sem citação, é opinião sua
  fantasiada de regra do projeto.
- **Gap conhecido não é violação.** O `CLAUDE.md` pode listar a dívida com
  paliativo — nesse caso confira se o paliativo descrito ainda é o que o código
  faz, e reporte a divergência, não a dívida.
- **Contrato pode estar errado.** Se o código contradiz o contrato de forma
  consistente e deliberada, a hipótese de que o documento envelheceu é tão
  válida quanto a de que o código violou. Nomeie as duas e devolva a escolha —
  não corrija o código contra a intenção real.

## 3. Reporte

```markdown
| Viola | Onde | O contrato diz | Veredito |
|---|---|---|---|
| regra de ouro | `dominio/frete.js:22` | "o domínio não conhece a borda" | *Corrigir.* Torna o cálculo intestável sem infraestrutura. |
| Nunca fazer #3 | `borda/api.js:41` | "nunca engolir erro de integração" | *Corrigir.* Falha vira `null` e o chamador não distingue. |
| convenção de erro | 5 arquivos | "erro tipado, não exceção" | *Decidir.* O código faz o oposto em toda a borda — o contrato pode ter envelhecido. |
```

Ordene por consequência. Pergunte o que aplicar antes de editar.

## 4. Aplique e verifique

Só o aprovado. Typecheck, lint e testes.

Quando a conclusão for "o contrato envelheceu", **não edite o CLAUDE.md aqui** —
isso é trabalho do `/docs:decidir` ou da `/docs:rodada`, que têm o gate certo
para mudar o contrato. Diga isso no fecho.

## 5. Nunca

- Inventar regra que o contrato não declara.
- Corrigir código para satisfazer contrato que o usuário disse estar obsoleto.
- Editar o `CLAUDE.md`. Este comando lê o contrato; quem o escreve é o kit irmão.
- Tratar gap conhecido como violação.
