---
description: Panorama priorizado do zelo do repositório. Roda o verificador mecânico, amostra o que só julgamento pega, e aponta qual lâmina usar em seguida. Não altera nada.
argument-hint: [área, pasta ou arquivo para focar]
# Sem Write nem Edit: este comando é o retrato, não a correção. Read-only por
# contrato, para poder rodar a qualquer momento sem pensar duas vezes.
allowed-tools: Read, Glob, Grep, Bash(git log:*), Bash(git diff:*), Bash(git status:*), Bash(ls:*), Bash(wc:*), Bash(node ~/.claude/bin/codecheck.mjs:*)
disable-model-invocation: true
---

# /code:varrer

Foco pedido (pode estar vazio): $ARGUMENTS

O retrato geral. **Não altera nada** — nem código, nem documento. Serve para
decidir onde vale gastar atenção antes de gastar.

## 0. Carregue o zelo

Leia `~/.claude/code-kit/GRAMATICA.md` (expanda `~`; `Read` exige caminho
absoluto). É o texto normativo: a pergunta que governa (§1), as duas camadas
(§2), as famílias (§3), onde a confiança para (§4) e o registro do interlocutor
(§5).

Ausente: **pare** e diga que `./install.sh` no repositório do kit resolve. Não
improvise os critérios — a fonte única existe para nenhum comando carregar uma
paráfrase que envelhece sozinha.

## 1. Camada mecânica

Rode `node ~/.claude/bin/codecheck.mjs --json .` e use a saída como base. Não
reimplemente as checagens dele nem parafraseie as mensagens; `--explain <id>`
dá o porquê quando precisar explicar um achado.

**Havendo achado `L0`, ele abre o relatório, antes de qualquer outro.** Não é
defeito do código: diz que as regras de forma JS/TS não alcançaram parte dos
arquivos. Retrato que omite isso afirma uma cobertura que não existe — quem lê
precisa saber quais famílias ficaram de fora antes de tomar o resto como
completo. Nesses arquivos só a camada de julgamento rodou de verdade, então
amostre mais deles no passo 2.

Sem o script, diga isso em uma linha e siga só com a camada de julgamento,
avisando que a cobertura está reduzida.

## 2. Amostragem de julgamento

Não leia o repositório inteiro. Amostre **3 a 5 arquivos por área**, escolhidos
pelo que o git indica como quente: `git log --format= --name-only -80 | sort |
uniq -c | sort -rn | head -20`. Código que muda muito é onde o zelo rende.

Em cada amostra, procure só o que a camada mecânica não vê:

1. **Comentário que repete o código** — o teste é a deleção: apagar muda o que
   alguém faz? (detalhe em `/code:comentarios`)
2. **Gambiarra** — atalho que contorna em vez de resolver, "temporário" que
   ficou, retry mágico, número que compensa outro bug.
3. **Duplicação de lógica** — não de literal (isso é `D1`), de *decisão*: a
   mesma regra escrita em dois lugares com palavras diferentes.
4. **Estrutura fora do idioma** — do framework, ou da árvore que o CLAUDE.md
   declara.
5. **Teste que não é sólido** — testa o mock, asserção frouxa, nome que promete
   mais do que a asserção prova.
6. **Superfície explorável** — rota que muda estado ou lê dado alheio sem checar
   autorização, entrada de fora usada crua num sink, abuso do que a app faz de
   valor (pagamento, IA) (detalhe em `/code:seguranca` — e nunca cole o valor de
   um segredo no relatório; aponte a localização).

## 3. Relatório

Uma mensagem, ordenada por **consequência** — nunca por arquivo nem por ordem
de descoberta (GRAMATICA §5):

- **CRÍTICO** — vai causar bug, ou já está causando: contrato violado, erro
  engolido em caminho que importa, teste que afirma cobertura inexistente,
  segredo versionado ou entrada de fora usada crua.
- **ALTO** — custa caro na próxima mudança: duplicação de decisão, gambiarra
  em código quente, fronteira de camada furada.
- **MÉDIO** — atrito acumulado: comentário-ruído, volume, literal repetido.

Cada linha:

```
[CRÍTICO] src/dominio/frete.js:22 (C1) — importa de borda/, que o contrato
          proíbe → o cálculo deixa de ser testável sem subir infraestrutura
```

Cada achado diz **o que muda se for corrigido**. Sem isso, não é achado — é
opinião (GRAMATICA §1).

Feche com:

1. **Veredito em uma frase.** "O repositório está limpo no mecânico e tem 3
   pontos de atrito" ou "há 2 achados críticos em código que muda toda semana".
2. **Qual lâmina usar**, na ordem que faria sentido: `/code:contrato` se houver
   violação de contrato, `/code:comentarios` se o ruído dominar, e assim por
   diante. Uma linha cada, com o motivo.
3. Se não houver nada, diga em uma linha e pare. Relatório inflado para parecer
   útil é o oposto do que este comando serve.

## 4. Nunca

- Alterar arquivo. Este comando é o retrato; quem corrige são os outros.
- Listar achado sem consequência. "Isto poderia ser melhor" não é achado.
- Reportar preferência de estilo como problema (GRAMATICA §1).
- Afirmar convenção que o repositório não declara nem aplica consistentemente.
  Coexistindo X e Y, o achado é "coexistem", não "Y está errado" (GRAMATICA §4).
