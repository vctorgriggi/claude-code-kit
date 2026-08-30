# Exemplo 5: /code:estrutura — onde a coisa mora, e como se faz aqui

Duas perguntas distintas, e confundi-las é o erro comum: **onde** (o projeto
declara) e **como neste framework** (a documentação oficial declara).

---

**Usuário:** `/code:estrutura`

**Agente:** [lê a gramática e o `CLAUDE.md`; consulta a doc oficial da versão
declarada no manifest]

| O quê | Onde | Medido contra | Veredito |
|---|---|---|---|
| query SQL no handler | `borda/http.js:30` | CLAUDE.md › Estrutura | *Mover* para `dados/`. |
| `useEffect` derivando estado | `ui/Lista.tsx:14` | docs oficiais React 19, ago/2026 | *Trocar* por valor derivado no render. |
| dois estilos de export | 12 arquivos | **nada declara** | *Decidir.* Coexistem 7 default e 5 nomeados. |

As três linhas vêm de fontes diferentes, e isso muda o peso de cada uma:

A primeira é **o projeto contra si mesmo** — a árvore do `CLAUDE.md` diz que
acesso a dados mora em `dados/`, e ele está no handler. É a mais forte.

A segunda vem de fora e **carrega data**: `(fonte: docs oficiais React 19,
ago/2026)`. Sem a marca, ninguém saberia re-verificar quando a versão mudar.

A terceira **não é violação**. Nada no repositório declara qual estilo vale, e
inferir "o majoritário é o certo" seria inventar regra — 7 contra 5 não é
convenção, é empate sujo. O achado é *"coexistem"*, e quem decide é
`/docs:decidir`.

> _É o limite do §4 da gramática em ação: convenção inferida de código
> inconsistente não vira regra. Um revisor comum escolheria o majoritário e
> mandaria migrar 5 arquivos._

**Usuário:** move a query. o resto deixa

**Agente:** [move; ajusta os imports; typecheck, lint e testes]

Movido para `dados/pedidos.js`. Confirmei que a árvore do `CLAUDE.md` continua
descrevendo o disco — se não descrevesse, o `docscheck` do kit irmão acusaria
como `A1`.
