# Exemplo 7: /code:morto — a lâmina que apaga, e por isso prova antes

O único comando cujo resultado é remover. Um falso positivo aqui não gera
ruído: gera bug. Blockquotes em itálico são anotações.

---

**Usuário:** `/code:morto`

**Agente:** [lê a gramática; roda `codecheck --json .` e parte dos candidatos
`M1`; faz as cinco buscas em cada um]

| Símbolo | Onde | Prova | Veredito |
|---|---|---|---|
| `calcularAntigo` | `dominio/frete.js:40` | 0 refs em código, string, config e CI; entrou há 8 meses no mesmo commit que `calcular`, que o substituiu | *Remover.* |
| `formatar` | `borda/http.js:12` | usado 4× — todas no próprio arquivo | *Desexportar.* Não apagar. |
| `handlerV2` | `borda/api.js:60` | 0 refs, mas o `handler` original segue sendo chamado em 3 lugares | *Confirmar.* Migração pela metade? |
| `serializar` | `dominio/pedido.js:8` | referenciado só por `test/pedido.test.js` | *Avaliar.* Cobre o arredondamento, que não é trivial. |
| `EVENTOS` | `dominio/eventos.js:3` | 0 refs em import, **mas** aparece como string em `config/filas.json` | *Manter.* Acesso dinâmico. |

Cinco candidatos do `M1`, e **um só** virou "remover".

> _O quinto é o motivo de a família ser aviso e não violação: a busca textual
> não vê `"EVENTOS"` dentro de um JSON de configuração. O `M1` levantou o
> candidato certo; a quinta busca é que salvou o código._

Sobre o terceiro: `handlerV2` não tem consumidor e o original tem. Isso é
migração abandonada ou preparo para uma que vem? A evidência não fecha, e
apagar o lado errado quebra a migração. Pergunto em vez de decidir.

**Usuário:** o handlerV2 pode apagar, a migração foi cancelada. o serializar
deixa, é usado pelo worker que tá em outro repo

**Agente:** O `serializar` muda de veredito: é **API pública de fato**, mesmo
sem estar no `exports` do manifest. Vou deixar, e sugerir registrar isso — um
comentário na linha, ou uma entrada no `CLAUDE.md` — para o próximo
`/code:morto` não levantar de novo.

[remove `calcularAntigo` e `handlerV2`; desexporta `formatar`]

A remoção de `calcularAntigo` liberou `TABELA_LEGADO`, que só ele usava. Refiz
a busca nesse segundo nível: 0 refs. Removido também.

Typecheck, lint e a suíte **completa**: verdes. O build também — import
quebrado às vezes só aparece ali.

**Saiu:** 2 símbolos e 1 constante em cascata. **Desexportado:** 1. **Ficou por
decisão sua:** `serializar`. **Ficou por prova:** `EVENTOS`.

> _A cascata é o que separa remoção feita direito de remoção pela metade:
> apagar um símbolo costuma liberar outro, e a busca precisa ser refeita a cada
> nível em vez de presumida._
