# O zelo da casa

> Texto normativo do claude-code-kit: o que conta como problema de zelo, como
> cada família decide, e quais invariantes o `codecheck` verifica sozinho. Os
> comandos leem este arquivo no início de cada invocação — é a fonte única, e
> nenhum comando a parafraseia.

Versão: v1. Incremente a cada mudança de critério; a constante `GRAMATICA` de
`bin/codecheck.mjs` acompanha, e o teste do kit acusa divergência.

---

## §1 A pergunta que governa tudo

Antes de qualquer achado, um filtro:

> **Alguém age diferente ao saber disto?**

Achado que não muda decisão é ruído, e ruído em ferramenta de revisão é pior
que silêncio: treina quem lê a ignorar a lista inteira. Preferência de estilo,
gosto de formatação e "eu faria diferente" não entram. O que entra é o que
custa — em bug, em tempo de entender, ou em mudança que vai quebrar sem avisar.

## §2 As duas camadas

**Mecânica** — decidível sem ler intenção. Vive no `codecheck`, tem id, exit
code e roda em CI. Se uma regra precisa de julgamento para não gerar falso
positivo, ela não pertence aqui.

**De julgamento** — exige ler o código e comparar com o propósito. Vive nos
comandos. Sempre **reporta antes de aplicar**, e a lista passa pelo usuário.

A fronteira entre as duas é a promessa do kit: o que é verde no `codecheck` foi
provado; o que veio de comando foi julgado, e julgamento se discute.

## §3 As famílias

**Justificativa** — a decisão carrega o porquê na própria linha. `any`,
`@ts-ignore`, `eslint-disable`, `TODO`, `catch` que ignora: todos são escolhas
legítimas em algum contexto, e todos apodrecem quando ninguém sabe qual era o
contexto. Sem o motivo escrito, o escape vira permanente porque removê-lo
parece arriscado.

**Testes** — teste que não prova nada é pior que teste ausente, porque a suíte
verde afirma uma cobertura que não existe. Três formas mecânicas: sem asserção,
asserção que não pode falhar, e `skip` sem motivo nem condição de volta.

**Contrato** — o que **este** projeto declarou no `CLAUDE.md`: a fronteira entre
camadas e as proibições nomeadas. É a única família que nenhuma ferramenta
genérica alcança, e a que mais depende do kit irmão. Sem `CLAUDE.md`, ela não
roda — o kit não inventa fronteira que ninguém declarou.

**Duplicação** — a terceira ocorrência é onde o custo vira real: alguém muda
duas e esquece a terceira. Duas é coincidência.

**Volume** — arquivo e função acima do limite brando. Sempre **aviso**: volume é
sintoma, não doença, e há função longa legítima.

## §4 Onde a confiança para

Três limites declarados, porque saber onde a ferramenta erra é parte de confiar
nela:

**O `codecheck` é textual, não AST.** Sem parser não há como distinguir dois
`5000` que significam coisas diferentes, nem contar chaves dentro de string em
qualquer linguagem. É o preço de zero dependências e rodar em qualquer stack.
Mitigação: o que depende de contexto é aviso, nunca violação.

**Convenção inferida de código inconsistente não vira regra.** Quando o
repositório faz X num lugar e Y noutro e nada declara qual vale, o achado é
"hoje coexistem X e Y", não "Y está errado". Afirme com a confiança que a
evidência permite.

**Fonte externa carrega data.** Convenção vinda da documentação oficial de uma
stack registra `(fonte: docs oficiais <stack> <versão>, <mês/ano>)`. Sem a
marca, recomendação externa passa por decisão do projeto e nunca é
re-verificada quando a versão muda.

## §5 Registro do interlocutor

Vale para o relatório, não só para o código:

- Lidere com o veredito; sem aberturas de preenchimento.
- Ordene por consequência, nunca por arquivo ou ordem de descoberta.
- Cada achado diz **o que muda** se for corrigido. Sem isso, não é achado.
- Mantenha a posição quando a evidência a sustenta; revisar para agradar é
  falha de qualidade.
- Na dúvida, o código **fica**. Remover o que não se provou morto é o erro
  caro; deixar o que talvez sobrasse é o barato.

## §6 Invariantes mecânicos

Verificados por `bin/codecheck.mjs`. `codecheck --explain <id>` imprime o porquê
e os exemplos de cada um.

<!-- REGRAS:início — tabela gerada por scripts/gerar-gramatica.mjs; não editar à mão -->

| id | família | severidade | verifica |
| -- | ------- | ---------- | -------- |
| `J1` | Justificativa | violação | escape de tipo carrega o porquê na própria linha |
| `J2` | Justificativa | violação | TODO e FIXME apontam para algo rastreável |
| `J3` | Justificativa | violação | catch não engole o erro em silêncio |
| `T1` | Testes | violação | teste que não afirma nada |
| `T2` | Testes | violação | asserção que não pode falhar |
| `T3` | Testes | violação | teste pulado carrega o porquê e a condição de volta |
| `D1` | Duplicação | aviso *(promovível)* | literal repetido três vezes ou mais |
| `C1` | Contrato | violação | import não cruza a fronteira declarada no CLAUDE.md |
| `C2` | Contrato | aviso *(promovível)* | proibição do "Nunca fazer" que virou grep |
| `S1` | Supressão | violação | supressão declara o motivo |
| `V1` | Volume | aviso *(promovível)* | arquivo acima do limite brando |
| `V2` | Volume | aviso *(promovível)* | função acima do limite brando |

<!-- REGRAS:fim -->
