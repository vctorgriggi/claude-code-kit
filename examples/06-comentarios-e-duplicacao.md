# Exemplo 6: /code:comentarios e /code:duplicacao — o ruído e a decisão repetida

---

**Usuário:** `/code:comentarios`

**Agente:** [lê a gramática; varre o código; `git blame` em cada candidato]

| Comentário | Onde | Idade | Veredito |
|---|---|---|---|
| `// incrementa o contador` | `borda/api.js:52` | 8 meses | *Remover.* Repete `contador++`. |
| `/** Retorna o id do usuário. */` | `borda/api.js:70` | 3 semanas | *Remover.* Descreve `getUserId()` palavra por palavra. |
| `// loop pelos itens` | `dominio/frete.js:40` | 1 ano | *Remover.* Repete o `for`. |
| `// debounce evita martelar a API a cada tecla` | `borda/ui.js:30` | 1 ano | *Manter.* Diz a intenção. |
| `// o SDK v3 devolve string aqui — #412` | `borda/sdk.ts:12` | 2 meses | *Manter.* Contexto caro. |
| `/** @param id — usado pelo cliente público */` | `api/publica.ts:8` | 6 meses | *Manter.* Doc de API pública; ferramenta externa depende. |

> **Remover todos os marcados?**
> - Sim, remover todos
> - Não, quero decidir um a um

> _O sexto é o caso que separa este comando de um regex: JSDoc parece
> redundante e não é. Na dúvida, fica — o erro caro é remover contexto._

**Usuário:** sim

**Agente:** [remove os três; lint e typecheck depois]

Três saíram, três ficaram. Nenhum era diretiva disfarçada — conferi antes,
porque remover um `eslint-disable` ou `@ts-expect-error` muda comportamento.

---

**Usuário:** `/code:duplicacao`

**Agente:** [parte do `D1` do codecheck e procura o que ele não vê]

| O quê | Onde | Muda junto? | Veredito |
|---|---|---|---|
| validação de peso | `dominio/frete.js:8`, `borda/http.js:22` | sim | *Unificar* no domínio; a borda chama. |
| `"pendente"` | 4 arquivos | sim | *Nomear* `STATUS.PENDENTE`. |
| paginação | `listaPedidos.js`, `listaUsuarios.js` | **não** | *Manter.* Iguais hoje; evoluem por razões diferentes. |

O terceiro é o mais importante da lista, e é um *manter*. Os dois trechos são
quase idênticos — e unificá-los criaria acoplamento entre paginação de pedidos
e de usuários, que vão divergir no primeiro filtro específico.

> _O teste é "se esta regra mudar, os dois mudam juntos?". Abstração errada
> custa mais que duplicação: ela esconde a diferença que aparece depois._

**Usuário:** faz os dois primeiros

**Agente:** [unifica no domínio, nomeia a constante; typecheck, lint e testes]

A validação foi para `dominio/`, não para um `utils/` — o `CLAUDE.md` declara
que regra de negócio mora no domínio, e mover para a borda violaria `C1`.
