# O ciclo completo — herdando um repositório

> O mapa, não o mergulho. As transcrições numeradas mostram **uma lâmina cada**,
> em profundidade; esta mostra **como elas se encadeiam**, incluindo as partes
> que não são comando: o verificador no terminal, o hook ao editar, o CI.

O cenário é o mais comum: você herdou um repositório, não escreveu nada dele, e
precisa decidir onde gastar atenção. É
[`fixtures/sujo/`](fixtures/sujo/) — sem `CLAUDE.md`, com dívida que ninguém
registrou.

---

## Primeiro: o que dá para saber sem ler nada

```
$ codecheck examples/fixtures/sujo
src/api.js:1       [J2] TODO sem issue, ticket ou dono
src/api.js:6       [J3] catch vazio: o erro some sem deixar rastro
src/api.js:14      [J1] "@ts-ignore" sem justificativa na linha
test/api.test.js:5 [T1] "busca pedidos" roda o código e não afirma nada
test/api.test.js:9 [T2] "placeholder" contém asserção que não pode falhar
test/api.test.js:13 [T3] teste pulado sem motivo nem condição de volta
resumo: 6 violação(ões)
```

Seis achados, zero julgamento, zero token. Repare no que **não** apareceu: nada
da família `C`. Sem `CLAUDE.md` não há contrato para cobrar, e o kit não inventa
fronteira que ninguém declarou.

## Depois: o retrato com julgamento

```
/code:varrer
```

Aqui entra o que o mecânico não vê — gambiarra, duplicação de decisão, teste
que testa o mock — ordenado por consequência, com o fecho dizendo qual lâmina
usar primeiro.

> Detalhe em [01-varrer](01-varrer.md).

## Então, a lâmina que o retrato apontou

Cada uma resolve um tipo de achado, e todas **reportam antes de aplicar**:

| se o retrato apontou… | rode |
| --- | --- |
| erro engolido, atalho, `@ts-ignore` sem motivo | [`/code:gambiarra`](03-gambiarra-e-testes.md) |
| teste que não prova, ou promessa sem prova | [`/code:testes`](03-gambiarra-e-testes.md) |
| segredo versionado, entrada de fora usada crua | [`/code:seguranca`](04-seguranca.md) |
| ruído de comentário | [`/code:comentarios`](06-comentarios-e-duplicacao.md) |
| a mesma decisão em dois lugares | [`/code:duplicacao`](06-comentarios-e-duplicacao.md) |
| coisa no lugar errado, idioma do framework ignorado | [`/code:estrutura`](05-estrutura.md) |
| símbolo que ninguém usa, export desnecessário | [`/code:morto`](07-morto.md) |

## O que muda quando existe contrato

Rode `/docs:fundar` (kit irmão) neste repositório e ele ganha um `CLAUDE.md`
com regra de ouro, fronteira entre camadas e proibições. Aí:

```
$ codecheck .
src/dominio/frete.js:22 [C1] `dominio/` importa de `borda/`, que o CLAUDE.md
                             declara que ele nunca importa
src/dominio/abortar.js:2 [C2] usa `process.exit`, que o CLAUDE.md proíbe
```

Duas regras que **nenhuma ferramenta genérica tem**, porque dependem do que
este projeto declarou. E [`/code:contrato`](02-contrato.md) passa a existir de
verdade.

> Esta é a tese do par: um kit escreve o contrato, o outro cobra.

## Fora do ciclo

**Ao editar**, com o hook de `PostToolUse` ligado: o achado aparece no momento
em que o arquivo é escrito, não semanas depois. Gambiarra entra numa edição
específica; depois de commitada, vira "como sempre foi". Em arquivo limpo,
silêncio.

**No CI do projeto**, copiando `bin/codecheck.mjs` para `.github/codecheck.mjs`:

```yaml
- uses: ./.github/actions/codecheck
  with:
    strict: "true"
```

**Quando uma regra acusar e você discordar**, o `--explain` diz o porquê dela
antes de você decidir:

```
$ codecheck --explain D1
D1 — literal repetido três vezes ou mais
  família Duplicação · aviso (promovível)

  A terceira ocorrência é onde o custo vira real: alguém vai mudar duas e
  esquecer a terceira. […]
```

---

## Em uma tela

| quando | o quê | escreve |
| --- | --- | --- |
| a qualquer momento, e no CI | `codecheck .` | nada |
| ao herdar ou revisitar | `/code:varrer` | nada |
| conforme o retrato apontar | as sete lâminas | só o que você aprovar |
| com contrato instalado | `/code:contrato` | só o que você aprovar |
| ao escrever cada arquivo | (hook) | nada |

Das cinco linhas, **três não escrevem nada**, e as outras duas só depois de você
ver a lista e escolher.
