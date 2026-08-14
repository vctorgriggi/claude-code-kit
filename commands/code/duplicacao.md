---
description: Encontra a mesma decisão escrita em mais de um lugar — lógica, constante, tipo e validação — e propõe onde ela deveria morar. Reporta antes de aplicar.
argument-hint: [pasta, módulo ou área para focar]
allowed-tools: Read, Glob, Grep, Edit, Bash(git log:*), Bash(ls:*), Bash(node ~/.claude/bin/codecheck.mjs:*)
disable-model-invocation: true
---

# /code:duplicacao

Foco (pode estar vazio): $ARGUMENTS

Duplicação que importa não é texto repetido — é **decisão** repetida. Dois
trechos parecidos que mudam por razões diferentes devem continuar separados;
dois trechos diferentes que mudam sempre juntos são a mesma regra escrita duas
vezes.

**Reporta antes de aplicar.**

## 0. Carregue o zelo

Leia `~/.claude/code-kit/GRAMATICA.md` (expanda `~`). Ausente: **pare**.

Rode `node ~/.claude/bin/codecheck.mjs --json .`: `D1` já pega literal repetido
três vezes ou mais. Parta dele e procure o que ele não vê.

## 1. O teste que decide

> **Se esta regra mudar, os dois lugares mudam juntos?**

Juntos → é uma decisão só, duplicada. Separados → é semelhança, e unificar cria
acoplamento entre coisas que não têm relação. Abstração errada custa mais que
duplicação: ela esconde a diferença que aparece depois.

## 2. O que procurar

- **Lógica de decisão** repetida com palavras diferentes: a mesma validação
  como `if` num lugar e `guard` noutro.
- **Constante sem nome**, além do que o `D1` pega: string de status, chave de
  config, formato de data.
- **Tipo ou shape** declarado duas vezes em vez de importado.
- **Regra de negócio** fora do domínio: a mesma condição na borda e no core —
  se o kit irmão estiver instalado, o `DOMAIN.md` diz onde ela deveria estar.
- **Drift**: literal solto que duplica uma constante que já existe nomeada.

## 3. Verifique antes de acusar

- Confira **todas** as ocorrências antes de julgar; uma que você não viu muda o
  veredito.
- Teste e código podem repetir de propósito: teste crava o valor esperado, e
  asserção contra a constante não prova nada.
- Código gerado não conta.

## 4. Reporte

```markdown
| O quê | Onde | Muda junto? | Veredito |
|---|---|---|---|
| validação de peso | `dominio/frete.js:8`, `borda/http.js:22` | sim | *Unificar* no domínio; a borda chama. |
| `"pendente"` | 4 arquivos | sim | *Nomear* `STATUS.PENDENTE`. |
| paginação | `listaA.js`, `listaB.js` | não | *Manter.* Iguais hoje, evoluem separado. |
```

Diga **onde** a versão única deve morar, não só que há duplicação. Pergunte o
que aplicar antes de editar.

## 5. Aplique e verifique

Só o aprovado. Typecheck, lint e testes depois; conserte o que quebrou.

Unificação move código entre módulos — confira que o novo lar não viola a
fronteira do `CLAUDE.md` (o `codecheck` acusa como `C1` se violar).

## 6. Nunca

- Unificar por semelhança de texto sem o teste do "muda junto".
- Criar abstração com mais parâmetros que casos de uso — isso é a duplicação
  original com custo extra.
- Mover regra de domínio para a borda para "evitar duplicação".
