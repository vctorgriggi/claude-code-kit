---
description: Encontra atalhos que contornam em vez de resolver — escape sem porquê, erro engolido, retry mágico, número que compensa outro bug — e separa dívida deliberada de acidente. Reporta antes de aplicar.
argument-hint: [pasta, arquivo ou área para focar]
allowed-tools: Read, Glob, Grep, Edit, Bash(git log:*), Bash(git blame:*), Bash(git diff:*), Bash(ls:*), Bash(node ~/.claude/bin/codecheck.mjs:*)
disable-model-invocation: true
---

# /code:gambiarra

Foco (pode estar vazio): $ARGUMENTS

Gambiarra é o atalho que **contorna** em vez de resolver. Nem toda é erro:
algumas são dívida consciente, tomada com prazo e motivo. A diferença entre as
duas está escrita — ou não está, e é isso que este comando procura.

**Reporta antes de aplicar.**

## 0. Carregue o zelo

Leia `~/.claude/code-kit/GRAMATICA.md` (expanda `~`). Ausente: **pare**.

Rode `node ~/.claude/bin/codecheck.mjs --json .` primeiro: a família `J` já
pega escape sem justificativa, TODO órfão e catch que engole. Não repita esses
achados — parta deles.

## 1. A distinção que organiza tudo

| | dívida deliberada | gambiarra |
| --- | --- | --- |
| tem motivo escrito | sim, na linha ou no CLAUDE.md | não |
| tem condição de saída | sim ("quando a v2 sair") | não |
| alguém decidiu | sim | aconteceu |

Dívida deliberada **não é achado** — é uma decisão registrada. Se o motivo
existe mas está solto na cabeça de alguém, o achado é *"falta registrar"*, não
*"está errado"*.

## 2. O que procurar

**Contorno em vez de correção**
- `setTimeout` para "esperar carregar" em vez de aguardar o evento certo
- retry que existe para mascarar uma race, não para tolerar rede
- `?.` em cadeia longa onde o valor deveria estar garantido
- número ajustado até funcionar (offset de +1, delay de 300ms que "resolveu")

**Erro tratado como sucesso**
- `catch` que devolve valor default e segue
- `|| []`, `?? {}` onde a ausência era sinal de bug
- promise sem `await` nem `.catch`

**Escape de tipo e de lint**
- `as any`, `as unknown as X`, `@ts-ignore`, `# type: ignore`
- `eslint-disable` de regra que existe por um motivo

**Código que "é temporário"**
- flag que nunca é desligada, branch morto atrás de `if (false)`
- versão duplicada de uma função com sufixo `2`, `New`, `Old`, `Tmp`

**Configuração encravada**
- URL, credencial de ambiente, caminho absoluto de máquina de alguém

## 3. Verifique antes de acusar

Para cada candidato, uma pergunta e uma evidência:

1. **É contorno de quê?** Se você não sabe o que ele contorna, provavelmente é
   código normal que parece estranho. Não acuse.
2. **`git log -S` no trecho.** O commit que introduziu costuma dizer se foi
   pressa ou decisão — e às vezes traz o número do incidente.
3. **O CLAUDE.md já cobre?** Dívida listada em "Gaps conhecidos" é deliberada
   por definição. Não vire achado; no máximo, confira se o paliativo descrito
   ainda é o que o código faz.

## 4. Reporte

Ordenado por consequência (GRAMATICA §5):

```markdown
| O quê | Onde | Contorna | Veredito |
|---|---|---|---|
| `catch { return [] }` | `src/api.js:41` | falha de rede vira lista vazia | *Corrigir.* O chamador não distingue "sem dados" de "não consegui buscar". |
| `setTimeout(…, 300)` | `src/ui.js:88` | espera o DOM montar | *Registrar.* Funciona, mas é frágil; vira gap conhecido se ficar. |
| `as any` | `src/sdk.ts:12` | tipo errado no SDK — issue #412 | *Manter.* Dívida deliberada, com motivo e saída. |
```

Três vereditos, e só três: **corrigir**, **registrar** (vira gap conhecido ou
convenção — use `/docs:decidir` se o kit irmão estiver instalado), **manter**.

Pergunte quais aplicar antes de tocar em qualquer arquivo.

## 5. Aplique e verifique

Só o aprovado. Depois: typecheck, lint e testes; conserte o que quebrou.

Correção de gambiarra **muda comportamento** com mais frequência que os outros
comandos deste kit — um `catch` que parava de engolir passa a propagar erro. Se
não houver teste cobrindo o caminho, diga isso e proponha o teste **antes** da
correção.

## 6. Nunca

- Chamar de gambiarra o que tem motivo escrito. Isso é dívida, e dívida
  registrada é o sistema funcionando.
- Remover contorno sem entender o que ele contornava — some o sintoma, volta o
  bug original.
- Acusar sem dizer o que muda ao corrigir (GRAMATICA §1).
- Corrigir e reportar na mesma passada.
