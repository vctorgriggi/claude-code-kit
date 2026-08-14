# Exemplo 2: /code:contrato — a lâmina que só existe com contrato

Continuação do [exemplo 1](01-varrer.md). Blockquotes em itálico são anotações.

---

**Usuário:** `/code:contrato`

**Agente:** [lê a gramática e o `CLAUDE.md` do projeto; roda o codecheck]

O contrato declara a regra de ouro **"o domínio não conhece a borda"** e quatro
proibições. Três achados:

| Viola | Onde | O contrato diz | Veredito |
|---|---|---|---|
| regra de ouro | `dominio/frete.js:22` | "nada em `src/dominio/` importa rede, banco ou framework" | *Corrigir.* |
| Nunca fazer #3 | `borda/api.js:41` | "nunca engolir erro de integração em silêncio — falha vira erro tipado, não `null`" | *Corrigir.* |
| convenção de erro | 5 arquivos em `borda/` | "erro tipado, não exceção" | *Decidir.* |

Sobre o terceiro: **o código faz o oposto de forma consistente, em toda a
borda.** Isso não parece descuido — parece que a convenção mudou e o documento
não acompanhou. Duas leituras possíveis, e a escolha é sua:

- a convenção vale e a borda inteira precisa migrar;
- a convenção envelheceu, e quem atualiza o `CLAUDE.md` é `/docs:decidir`.

Não vou corrigir código contra uma intenção que talvez seja a atual.

> _O terceiro achado é o teste real deste comando. Um revisor comum "corrige" o
> código para bater com o documento; aqui, contrato contradito de forma
> consistente é hipótese de documento velho, e a decisão volta para o usuário
> (GRAMATICA §4)._

**Usuário:** corrige os dois primeiros. o terceiro a convenção envelheceu mesmo

**Agente:** [aplica os dois; cada escrita passa pelo prompt do harness]

`dominio/frete.js` passou a receber o cotador por parâmetro — o domínio deixou
de importar da borda. `borda/api.js` devolve `Resultado` tipado em vez de `[]`.

Typecheck, lint e testes: verdes. O `codecheck` acusa **0** onde acusava `C1` e
`J3`.

Não toquei no `CLAUDE.md`: mudar o contrato é `/docs:decidir`, que tem o gate
certo para isso. A convenção de erro segue divergente até você rodá-lo.

> _O `catch` que parava de engolir passa a propagar erro — mudança de
> comportamento. Como havia teste cobrindo o caminho, deu para confirmar; se
> não houvesse, o comando teria proposto o teste antes da correção._
