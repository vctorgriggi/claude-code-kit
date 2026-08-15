# claude-code-kit

Comandos de [Claude Code](https://docs.claude.com/en/docs/claude-code/overview)
que caçam decaimento de código — comentário que só faz ruído, gambiarra, teste
que não prova nada, estrutura fora do lugar — com um verificador mecânico por
baixo e, quando o projeto tem contrato, **cobrando o contrato do projeto**.

## Por quê

Linter genérico cobra regra genérica. Ele não sabe que o seu domínio nunca pode
importar da borda, nem que este repositório proibiu float para dinheiro — isso
está escrito no `CLAUDE.md`, e nenhuma ferramenta lê.

Este kit lê. É o irmão do
[claude-docs-kit](https://github.com/vctorgriggi/claude-docs-kit): **um escreve
o contrato, o outro cobra.** Sem doc-set ele continua útil, só perde a lâmina
mais afiada — a dependência é graciosa, nunca dura.

## As lâminas

| comando | caça | fonte da verdade |
| --- | --- | --- |
| [**`/code:varrer`**](commands/code/varrer.md) | panorama priorizado; aponta qual lâmina usar | tudo, por amostragem |
| [**`/code:contrato`**](commands/code/contrato.md) | violação da regra de ouro e das proibições **deste** projeto | `CLAUDE.md` |
| [**`/code:gambiarra`**](commands/code/gambiarra.md) | atalho que contorna em vez de resolver; erro engolido | o que o contorno esconde |
| [**`/code:testes`**](commands/code/testes.md) | teste que não prova, que não é sólido, e o que **falta** | `SPEC.md`, `DOMAIN.md` |
| [**`/code:comentarios`**](commands/code/comentarios.md) | comentário que repete o código | o teste da deleção |
| [**`/code:duplicacao`**](commands/code/duplicacao.md) | a mesma **decisão** escrita em dois lugares | "muda junto?" |
| [**`/code:estrutura`**](commands/code/estrutura.md) | coisa no lugar errado; idioma do framework ignorado | `CLAUDE.md` + docs oficiais |
| [**`/code:morto`**](commands/code/morto.md) | símbolo sem consumidor, export desnecessário, branch inalcançável | cinco buscas, não uma |

**Todo comando reporta antes de aplicar.** Você vê a lista e escolhe o que
entra — e cada escrita ainda passa pelo prompt de permissão do harness. Dois
gates, e o primeiro é o que realmente filtra.

**E nada disso depende de você lembrar.** As oito lâminas são *pull* — alguém
precisa invocá-las, e quase nunca é no momento em que a gambiarra é escrita. O
[hook de `PostToolUse`](#o-zelo-ao-editar-em-vez-de-na-revisao) fecha essa
lacuna exatamente ali: no arquivo que acabou de ser tocado, antes de o atalho
virar "como sempre foi". É opcional, e vem desligado.

## O que sai disso

O verificador mecânico, com exit code:

```
$ codecheck .
src/dominio/frete.js:22 [C1] `dominio/` importa de `borda/`, que o CLAUDE.md declara que ele nunca importa
src/api.js:41 [J3] catch vazio: o erro some sem deixar rastro
test/a.test.js:9 [T1] "desconto" roda o código e não afirma nada
src/borda/retry.js:2 [D1] aviso: o literal 7500 aparece 3×; nomeie a constante
resumo: 3 violação(ões)
```

E um comando devolve o que só julgamento pega, ordenado por consequência:

```
[CRÍTICO] src/api.js:41 (J3) — falha de rede vira lista vazia
          → o chamador não distingue "sem dados" de "não consegui buscar"
[ALTO]    src/ui.js:88 — setTimeout(300) espera o DOM montar
          → frágil; vira gap conhecido se ficar
```

## O contrato, que é o diferencial

Com um `CLAUDE.md` na raiz declarando:

```markdown
## Estrutura

```
src/
  dominio/    # regra pura (nunca importa de borda/)
  borda/      # HTTP, persistência
```

## Nunca fazer

- Nunca usar `process.exit` fora da borda — mata o processo no meio de uma requisição.
```

O `codecheck` passa a cobrar exatamente isso: `C1` acusa o import que cruza,
`C2` acusa o `process.exit` no domínio. **Sem `CLAUDE.md`, as duas não rodam** —
o kit não inventa fronteira que ninguém declarou.

## Em que projetos isso funciona

**As lâminas são agnósticas de linguagem** — elas leem o código, não um regex.
`/code:comentarios`, `/code:duplicacao`, `/code:estrutura` e `/code:morto`
julgam Python e Go como julgam TypeScript.

**A camada mecânica não é.** O `codecheck` varre dezesseis extensões, mas só
cinco regras são textuais o bastante para valer em todas (`J2`, `D1`, `C2`,
`S1`, `V1`). As outras foram escritas contra a forma de JS/TS — `it(…)`,
`export const`, `import … from` — e duas precisam de bloco delimitado por
chaves. Num projeto Python o `L0` diz exatamente quais ficaram de fora, em vez
de deixar o resumo limpo significar duas coisas:

```
$ codecheck .
src/a.py:1 [L0] aviso: arquivos .py: C1, J1, J3, T1, T2, T3, M1, V2 não rodam aqui — são regras de forma JS/TS
```

Cobertura que some em silêncio é pior que cobertura ausente: ninguém desconfia
de um verde. Por isso o `L0` fala mesmo quando não há nada a corrigir, e por
isso ele nunca vira violação — o seu projeto não escolheu essa limitação.

Onde ele **não** compensa: código gerado, repositório que vai ser jogado fora,
e a base em que ninguém vai voltar a ler. As três regras que mais pagam —
contrato, justificativa e testes — cobram disciplina que só se recupera na
segunda leitura.

## Instalação

```bash
git clone https://github.com/vctorgriggi/claude-code-kit
cd claude-code-kit
./install.sh
```

Comandos em `~/.claude/commands/code/` (viram `/code:<nome>`), `codecheck` em
`~/.claude/bin/`, gramática e hook em `~/.claude/code-kit/`.

## As 14 regras mecânicas

`codecheck --explain <id>` imprime o porquê e os exemplos de cada uma. A ordem
é por consequência — o que nenhuma outra ferramenta pega primeiro, as duas que
falam da ferramenta em vez do código por último — e é a mesma no catálogo, na
[gramática §3](grammar/GRAMATICA.md) e aqui, porque esta tabela é gerada de lá.

<!-- REGRAS:início — tabela gerada por scripts/gerar-gramatica.mjs; não editar à mão -->

| família | regras | o que cobre | severidade |
| ------- | ------ | ----------- | ---------- |
| **Contrato** | `C1` `C2` | import não cruza a fronteira declarada no CLAUDE.md; … | violação / aviso *(promovível)* |
| **Justificativa** | `J1` `J2` `J3` | escape de tipo carrega o porquê na própria linha; … | violação |
| **Testes** | `T1` `T2` `T3` | teste que não afirma nada; … | violação |
| **Duplicação** | `D1` | literal repetido três vezes ou mais | aviso *(promovível)* |
| **Morto** | `M1` | símbolo exportado que nenhum outro arquivo menciona | aviso *(promovível)* |
| **Volume** | `V1` `V2` | arquivo acima do limite brando; … | aviso |
| **Supressão** | `S1` | supressão declara o motivo | violação |
| **Cobertura** | `L0` | o verificador alcança as linguagens do projeto | aviso |

<!-- REGRAS:fim -->

Os avisos marcados *(promovível)* viram violação com `--strict`, ou com
`{"strict": true}` num `.codecheck.json` na raiz do repositório-alvo — assim a
decisão fica versionada junto do código, em vez de depender de todo mundo
lembrar da flag. **Três nunca promovem**, em modo nenhum: `V1` e `V2`, porque
volume é sintoma e não doença, e `L0`, porque cobertura que falta é defeito da
ferramenta e o seu projeto não teria como consertar.

O mesmo arquivo diz o que não é código seu — fixture, saída de gerador, código
de terceiro versionado:

```json
{ "strict": true, "ignorar": ["examples/fixtures", "src/gerado"] }
```

É o que este repositório usa em si mesmo: o `codecheck` roda contra o próprio
kit no CI, e o fixture sujo fica de fora porque estar sujo é o trabalho dele.

Achado que não se sustenta no seu projeto pode ser silenciado **com motivo**:
`// codecheck: ignore D1 — a versão é gerada no build`. Sem o motivo, a própria
supressão vira violação — é o que impede o mecanismo de virar a porta dos
fundos. O kit usa isso em si mesmo: o regex que detecta `@ts-ignore` contém
`@ts-ignore`, e a supressão explica por quê.

```bash
codecheck .            # exit 0 sem violações, 1 com, 2 erro de uso
codecheck --strict .   # promove os calibráveis
codecheck --json .     # para CI e para os comandos
codecheck --explain C1 # o porquê e os exemplos de uma regra
```

### Panorama de vários projetos

Um diretório é "verifique isto" — não achar código ali é erro de uso. Vários é
"quais destes estão decaindo", e cada projeto vira uma linha com até três
achados. Quando corta, ele diz que cortou:

```
$ codecheck ~/Workspaces/*
limpo  ok
sujo   6 violação(ões)
         src/api.js:1 [J2] TODO sem issue, ticket ou dono
         src/api.js:6 [J3] catch vazio: o erro some sem deixar rastro
         src/api.js:14 [J1] "@ts-ignore" sem justificativa na linha
         … mais 6 achado(s); rode no diretório para ver todos

resumo: 1 de 2 projeto(s) com violação
```

## O zelo ao editar, em vez de na revisão

Hook opcional de `PostToolUse`: confere o arquivo **no momento em que ele é
escrito**. Gambiarra entra numa edição específica; depois de commitada, vira
"como sempre foi".

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{
        "type": "command",
        "command": "node ~/.claude/code-kit/hooks/zelo-ao-editar.mjs"
      }]
    }]
  }
}
```

O `install.sh` copia o script mas **não liga o hook** — isso é editar
`settings.json`, e é sua decisão. Ele só fala do arquivo tocado, cala quando
não há achado, e nunca falha a edição.

## Verificação

Quatro camadas, todas rápidas e sem custo de token:

| passo | o que garante |
| --- | --- |
| [`test/codecheck.test.mjs`](test/codecheck.test.mjs) | cada regra se comporta como o `--explain` dela promete |
| [`test/mutacao.test.mjs`](test/mutacao.test.mjs) | cada regra **detecta violação real**: parte do projeto limpo, quebra um invariante como um humano quebraria, exige que a regra acuse |
| [`test/completude.test.mjs`](test/completude.test.mjs) | **nada ficou sem ligar**: comando sem transcrição, regra sem mutação, suíte fora do CI, executável que ninguém exercita |
| [`test/coerencia.test.mjs`](test/coerencia.test.mjs) | links, âncoras, ids e caminhos resolvem em todo o repositório |

A camada de mutação existe porque teste unitário prova que a regra dispara no
input que o autor inventou — não que ela pega a violação do mundo. A de
completude foi escrita **na primeira fase**, não na última: no kit irmão ela
chegou por último, e quase todo retrabalho de lá foi propagação que ela teria
cobrado na hora.

## Veja funcionando

**[O ciclo completo](examples/ciclo-completo.md)** é o melhor ponto de
partida: herdar um repositório sem contrato, o que o verificador diz sozinho,
qual lâmina usar para cada achado, e o que muda quando o `CLAUDE.md` existe.

Depois dele, as transcrições anotadas em [`examples/`](examples/), uma por
lâmina, e dois projetos de referência:

- [`fixtures/limpo/`](examples/fixtures/limpo/) — com contrato, código que o
  respeita e testes que passam. Passa `--strict` com **zero achados** no CI, e
  é de onde a suíte de mutação parte.
- [`fixtures/sujo/`](examples/fixtures/sujo/) — sem `CLAUDE.md`, com dívida que
  ninguém registrou. É o que os comandos encontram no mundo real, e a prova de
  que a família `C` não inventa fronteira quando não há contrato.

### No CI de um projeto-alvo

Copie `bin/codecheck.mjs` para `.github/codecheck.mjs` e use a action:

```yaml
- uses: ./.github/actions/codecheck
  with:
    strict: "true"
```

## Onde a confiança para

O texto normativo declara os limites em
[`grammar/GRAMATICA.md` §4](grammar/GRAMATICA.md), e vale repetir os três:

**O `codecheck` é textual, não AST.** Sem parser, não dá para distinguir dois
`5000` que significam coisas diferentes. Por isso o que depende de contexto é
aviso, nunca violação.

**Convenção inferida de código inconsistente não vira regra.** Coexistindo dois
padrões sem nada declarar qual vale, o achado é "coexistem", não "está errado".

**Recomendação de framework carrega data.** `/code:estrutura` registra
`(fonte: docs oficiais <framework> <versão>, <mês/ano>)`; sem rede, essa camada
não roda e diz que não rodou.

## Personalização

A fonte da verdade é [`grammar/GRAMATICA.md`](grammar/GRAMATICA.md). Para mudar
um critério: edite lá, atualize o catálogo `REGRAS` de
[`bin/codecheck.mjs`](bin/codecheck.mjs) se houver lado mecânico, rode
`node scripts/gerar-gramatica.mjs` e `node --test test/*.test.mjs`. Regra nova
exige teste **e** caso de mutação — a suíte falha se faltar qualquer um.
