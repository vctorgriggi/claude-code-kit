# Exemplo 4: /code:seguranca — a lâmina que nunca certifica

O que um terceiro explora, medido por exposição — e o fecho que diz o que **não**
foi olhado, porque aqui relatório limpo engana mais que em qualquer outra
lâmina. Blockquotes em itálico são anotações.

---

**Usuário:** `/code:seguranca`

**Agente:** [lê a gramática e o `CLAUDE.md`; roda o codecheck]

O contrato declara "toda entrada externa passa por `validar()` antes do
domínio" — essa é a régua mais forte daqui. Quatro achados, por exposição:

| O quê | Onde | Exposição | Veredito |
|---|---|---|---|
| token de API no código | `borda/http.js:8` | qualquer clone do repo | *Rotacionar.* Apagar a linha não tira do histórico. |
| `id` do request lido sem checar o dono | `borda/api.js:52` | qualquer usuário logado | *Corrigir.* Um usuário lê o pedido do outro — e o `validar()` do contrato não cobre autorização. |
| stack trace na resposta 500 | `borda/erros.js:19` | quem provocar o erro | *Registrar.* Vaza caminho interno; vira gap conhecido se ficar. |
| `eval` sobre config local | `scripts/build.js:31` | só quem edita o repo | *Manter.* Não alcançável de fora; listado para constar. |

Sobre o token: não vou colar o valor aqui — arquivo e linha bastam, e o
relatório não será o segundo lugar onde ele vaza. Corrigir é o segundo passo;
o primeiro é **revogar na origem**, e esse console é seu, não meu.

**O que este relatório não cobre:** dependências (`npm audit` continua
necessário), infraestrutura, e o que só pentest vê. Não achei outros segredos
**com as buscas que fiz** — isso não é "não há".

> _Os dois momentos que separam esta lâmina de um scanner: o veredito
> "rotacionar" (segredo commitado não se resolve com Edit — o histórico do git
> guarda o que a edição apaga) e o fecho declarando o não-coberto. "Não achei"
> nunca vira "está seguro" — é o mesmo princípio do `L0`: silêncio não é
> aprovação._

**Usuário:** rotaciona depois eu faço. corrige o segundo, o terceiro registra

**Agente:** Sobre o segundo: a correção muda comportamento — o endpoint passa a
recusar `id` de outro dono, e **nenhum teste cobre esse caminho** hoje. Proponho
o teste antes: `test("recusa pedido de outro usuário")`, esperando 403. Escrevo
os dois nessa ordem?

**Usuário:** pode

**Agente:** [escreve o teste, confirma que falha, aplica a correção; cada
escrita passa pelo prompt do harness]

Teste vermelho antes, verde depois — a correção está provada. No `borda/http.js`
o token virou `process.env.API_TOKEN`, e deixei o passo de revogação com você:
enquanto o token antigo valer, a troca no código não resolveu nada. O stack
trace ficou registrado como gap para `/docs:decidir`.

Typecheck, lint e testes: verdes.

> _O teste veio **antes** da correção que muda comportamento — a mesma regra do
> `/code:gambiarra`, porque as duas lâminas mexem em caminho sem cobertura. E a
> troca por variável de ambiente não encerrou o achado: o comando repete que a
> revogação é a parte que importa, em vez de dar o item por resolvido._
