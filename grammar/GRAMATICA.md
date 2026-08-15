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

A ordem é a mesma em toda parte — no catálogo do `codecheck`, na tabela do §6 e
no README — e é por **consequência**: o que nenhuma outra ferramenta pega, o que
esconde bug, o que gera atrito, e por último as duas que falam da ferramenta em
vez de falar do código. Ordem por letra do id seria alfabeto disfarçado de
prioridade.

**Contrato** — o que **este** projeto declarou no `CLAUDE.md`: a fronteira entre
camadas e as proibições nomeadas. É a única família que nenhuma ferramenta
genérica alcança, e a que mais depende do kit irmão. Vem primeiro porque import
que cruza fronteira é a violação mais cara de desfazer: a dependência se espalha
antes de alguém notar. Sem `CLAUDE.md`, ela não roda — o kit não inventa
fronteira que ninguém declarou.

**Justificativa** — a decisão carrega o porquê na própria linha. `any`,
`@ts-ignore`, `eslint-disable`, `TODO`, `catch` que ignora: todos são escolhas
legítimas em algum contexto, e todos apodrecem quando ninguém sabe qual era o
contexto. Sem o motivo escrito, o escape vira permanente porque removê-lo
parece arriscado.

**Testes** — teste que não prova nada é pior que teste ausente, porque a suíte
verde afirma uma cobertura que não existe. Três formas mecânicas: sem asserção,
asserção que não pode falhar, e `skip` sem motivo nem condição de volta.

**Duplicação** — a terceira ocorrência é onde o custo vira real: alguém muda
duas e esquece a terceira. Duas é coincidência.

**Morto** — código que ninguém usa cobra atenção em toda leitura e mantém vivo
tudo o que ele arrasta. É a única família cujo resultado é **apagar**, e por
isso a postura se inverte: todo símbolo é vivo até que se prove o contrário.
Sempre aviso — acesso dinâmico, reflexão, API pública e entry point de
framework fazem um símbolo parecer morto sem estar, e busca textual não vê
nenhum deles. O mecânico levanta o candidato; a prova é de quem lê.

**Volume** — arquivo e função acima do limite brando. Sempre **aviso**: volume é
sintoma, não doença, e há função longa legítima.

**Supressão** — silenciar um achado exige o motivo na mesma linha. É a família
que protege todas as outras: sem ela, o primeiro falso positivo real vira um
`ignore` mudo, o segundo vira hábito, e o verificador morre de desuso sem que
ninguém perceba. Com o motivo escrito, silenciar é uma decisão auditável como
qualquer outra — e o kit usa isso em si mesmo, porque o regex que detecta um
escape contém o escape.

**Cobertura** — quais famílias não alcançaram as linguagens deste projeto. As
regras textuais valem em qualquer arquivo; as que dependem da forma de JS/TS não
acham nada num arquivo Python, e não achar nada é indistinguível de estar limpo.
Nunca vira violação, nem com `--strict`: é falta da ferramenta, não defeito do
código, e o projeto não teria como consertar. Existe para que o silêncio nunca
seja confundido com aprovação — a mesma razão pela qual o kit irmão tem o `A0`.

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
| `C1` | Contrato | violação | import não cruza a fronteira declarada no CLAUDE.md |
| `C2` | Contrato | aviso *(promovível)* | proibição do "Nunca fazer" que virou grep |
| `J1` | Justificativa | violação | escape de tipo carrega o porquê na própria linha |
| `J2` | Justificativa | violação | TODO e FIXME apontam para algo rastreável |
| `J3` | Justificativa | violação | catch não engole o erro em silêncio |
| `T1` | Testes | violação | teste que não afirma nada |
| `T2` | Testes | violação | asserção que não pode falhar |
| `T3` | Testes | violação | teste pulado carrega o porquê e a condição de volta |
| `D1` | Duplicação | aviso *(promovível)* | literal repetido três vezes ou mais |
| `M1` | Morto | aviso *(promovível)* | símbolo exportado que nenhum outro arquivo menciona |
| `V1` | Volume | aviso *(promovível)* | arquivo acima do limite brando |
| `V2` | Volume | aviso *(promovível)* | função acima do limite brando |
| `S1` | Supressão | violação | supressão declara o motivo |
| `L0` | Cobertura | aviso | o verificador alcança as linguagens do projeto |

<!-- REGRAS:fim -->
