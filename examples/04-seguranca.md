# Exemplo 4: /code:seguranca — a superfície de ataque, não o grep de segredo

O que um atacante faz com a aplicação, medido por exposição: o comando mapeia os
pontos de entrada e segue o dado de fora até o estrago. O achado mais caro é a
checagem que **não** está lá. Blockquotes em itálico são anotações.

---

**Usuário:** `/code:seguranca`

**Agente:** [lê a gramática e o `CLAUDE.md`; roda o codecheck; mapeia as rotas
pelo roteador de `borda/`]

O contrato declara "todo endpoint autentica antes do handler". Mapeei sete
rotas e segui o input de cada uma. Quatro achados, por exposição:

| O quê | Onde | Quem alcança → o que consegue | Veredito |
|---|---|---|---|
| IDOR: `pedidoId` do request usado sem checar dono | `borda/api.js:52` | qualquer usuário logado → lê o pedido de qualquer outro | *Corrigir.* A query filtra por `id`, nunca por dono. |
| `DELETE /admin/user/:id` sem exigir papel | `borda/rotas.js:88` | qualquer logado → apaga conta alheia | *Corrigir.* A checagem de admin existe só no front. |
| stack trace na resposta 500 | `borda/erros.js:19` | quem provocar o erro → vê caminho interno e a query | *Registrar.* Vira gap conhecido se ficar. |
| token de API no código | `borda/http.js:8` | qualquer clone do repo → usa a chave | *Rotacionar.* Apagar a linha não tira do histórico. |

Os dois primeiros são o coração disto, e nenhum tem "trecho suspeito" para o
grep achar — a falha é a **ausência** de uma linha. No IDOR, a query é
`SELECT … WHERE id = ?` com o `pedidoId` do request e nada mais; falta o
`AND dono = usuarioLogado`. No `DELETE`, o handler roda sem olhar o papel — o
contrato dizia para autenticar antes, e essa rota não autentica.

Sobre o token: não colo o valor aqui — arquivo e linha bastam. E corrigir é o
segundo passo; o primeiro é **revogar na origem**, e esse console é seu.

**O que este relatório não cobre:** dependências (`npm audit` continua
necessário), infraestrutura, e o que só pentest vê. As sete rotas foram olhadas;
não afirmo nada sobre webhook ou fila, que este foco não incluiu.

> _O que separa a lâmina de um scanner está nos dois primeiros achados: eles
> saem de **mapear a superfície e seguir o dado**, não de reconhecer um padrão.
> E o fecho declara o não-coberto — "não achei" nunca vira "está seguro", o
> mesmo princípio do `L0`._

**Usuário:** corrige os dois primeiros. token eu rotaciono, o stack trace
registra

**Agente:** Sobre o IDOR: a correção muda comportamento — o endpoint passa a
recusar pedido de outro dono, e **nenhum teste cobre isso** hoje. Proponho o
teste antes: `test("usuário não lê pedido de outro dono")`, o usuário A pedindo
o recurso de B e esperando 403. Escrevo os dois nessa ordem, para os dois
achados?

**Usuário:** pode

**Agente:** [escreve os testes da brecha, confirma que falham, aplica as
correções; cada escrita passa pelo prompt do harness]

Testes vermelhos antes, verdes depois — as duas brechas estão provadas. A query
de `borda/api.js` ganhou `AND dono = :usuario`; o `DELETE` passou a exigir o
papel `admin` no servidor, não só no front. Não toquei no token além de apontá-lo:
enquanto a chave antiga valer, trocar o código não resolveu nada, e a revogação
é sua. O stack trace ficou como gap para `/docs:decidir`.

Typecheck, lint e testes: verdes.

> _O teste da brecha veio **antes** da correção — a mesma regra do
> `/code:gambiarra`, porque as duas mexem em caminho sem cobertura. E o segredo
> não foi dado por resolvido: o comando insiste que rotacionar na origem é a
> parte que importa, não o Edit._
