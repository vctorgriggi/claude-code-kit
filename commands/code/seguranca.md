---
description: Caça o que a aplicação sofre de fora — rota sem autorização, IDOR, injeção, SSRF, abuso do que ela faz de valor (pagamento, IA, envio) — mapeando a superfície de ataque e seguindo o dado não confiável até o estrago. Mede por exposição, nunca certifica. Reporta antes de aplicar.
argument-hint: [pasta, endpoint ou área para focar]
# npm test/npm run/node --test: o "Aplique e verifique" cobra typecheck, lint e
# testes, e verificação obrigatória não deve esbarrar no prompt. Runner de outra
# stack (pytest, go test) passa pelo prompt do harness, como qualquer não listado.
allowed-tools: Read, Glob, Grep, Edit, Bash(git log:*), Bash(git grep:*), Bash(ls:*), Bash(npm test:*), Bash(npm run:*), Bash(node --test:*), Bash(node ~/.claude/bin/codecheck.mjs:*)
disable-model-invocation: true
---

# /code:seguranca

Foco (pode estar vazio): $ARGUMENTS

As outras lâminas caçam o que custa caro **para quem mantém**; esta caça o que
um **atacante** faz com a aplicação. A diferença muda o método: não se varre o
código à procura de um padrão feio, mapeia-se por onde o dado de fora entra e
persegue-se cada um até onde ele faz estrago. O achado mais caro daqui quase
nunca é um trecho suspeito — é a **ausência** de uma checagem, e ausência grep
nenhum pega.

**Reporta antes de aplicar.**

## 0. Carregue o zelo e o contrato

Leia `~/.claude/code-kit/GRAMATICA.md` (expanda `~`). Ausente: **pare**.

Rode `node ~/.claude/bin/codecheck.mjs --json .`: `J3` pega erro engolido — que
em caminho de autenticação é achado daqui — e `C2` pega proibição nomeada. A
camada mecânica não faz o trabalho desta lâmina: rota sem autorização, IDOR e
injeção dependem de seguir o dado entre arquivos, que é julgamento, não regex.

Leia o `CLAUDE.md` se existir. Regra de segurança declarada ali — "toda entrada
externa passa por `validar()` antes do domínio", "todo endpoint autentica antes
do handler", "nunca interpolar input em query" — é a lâmina mais afiada deste
comando: nenhum SAST genérico sabe a regra que **este** projeto escolheu. Sem
contrato, o comando roda com as classes do §3 e diz que rodou sem ele.

## 1. O que este comando não é

Dito antes dos achados, porque aqui o silêncio engana mais que em qualquer
outra lâmina (é o princípio do `L0`: verde que significa duas coisas é pior que
cobertura ausente):

- **Não é pentest** — ninguém executou ataque nenhum; é leitura de código.
- **Não é SAST nem auditoria de dependência** — `npm audit`, Dependabot e
  scanner de segredo (gitleaks, trufflehog) continuam necessários; este comando
  não os substitui.
- **Não certifica.** O fecho de todo relatório — inclusive o vazio — declara o
  que **não** foi coberto. "Não achei nada" nunca vira "está seguro".

## 2. O método: superfície primeiro, depois o caminho do dado

Dois movimentos, nesta ordem. Fazê-los é o que separa esta lâmina de um grep.

**Primeiro, mapeie a superfície de ataque.** Liste os pontos de entrada — toda
porta pela qual dado de fora chega: rota/endpoint HTTP, handler de webhook ou de
fila, upload, GraphQL resolver, deep link, argumento de CLI exposta. Numa área
que você não conhece, ache-os pela convenção do framework (o roteador, o
decorator de rota, o registro de handler). Para **cada** ponto, duas perguntas:

1. **Quem alcança isto?** Anônimo, qualquer usuário logado, ou só um papel? A
   resposta é a exposição de tudo que vier depois — e o eixo pelo qual o
   relatório ordena.
2. **O que ele faz sem provar identidade nem permissão?** Rota que muda estado
   ou lê dado de outro dono sem checar autorização é o achado mais caro do
   comando, e o mais fácil de passar batido: a falha é uma linha que **não** está
   lá.
3. **O que ele faz de valor?** Mover dinheiro, chamar um modelo pago, enviar
   e-mail ou SMS, gerar um recurso caro. Onde há valor há abuso — e essa pergunta
   é o que leva à classe de lógica de negócio do §3, a que só se acha lendo o que
   a aplicação faz.

**Depois, siga o dado não confiável até o sink.** Pegue cada valor que entrou —
`req.params`, `req.body`, query string, header, payload de fila — e persiga
através das chamadas até onde ele é **usado**. O achado nasce quando ele chega
cru a um sink perigoso sem passar por validação ou escape no caminho. A pergunta
única, em cada parada: **de onde veio este valor, e quem o saneou até aqui?**

## 3. As classes de ataque

Da mais cara para a mais rara, que é perto da ordem de exposição:

**Autenticação e autorização** — o coração do comando.
- Rota/endpoint que muda estado ou expõe dado **sem exigir login**.
- Autorização checada na UI ou no cliente, e não no servidor — o botão some,
  a rota continua aberta.
- **IDOR**: o `id` do recurso vem do request e ninguém confere o dono. Trocar o
  número na URL lê o pedido, a fatura, o arquivo de outro usuário.
- Escalonamento: papel, `isAdmin` ou permissão que o próprio request afirma ter.
- **Mass assignment**: o body do request é atribuído ao modelo inteiro, e o
  usuário seta um campo que não devia — `role`, `saldo`, `verificado`.
- Sessão e token: não expira, não invalida no logout, segredo de assinatura
  fraco ou versionado, algoritmo `none` aceito.

**Injeção** — dado de fora chega cru a um interpretador.
- SQL/NoSQL: parâmetro concatenado na query em vez de parametrizado.
- Comando de shell (`exec`, `system`) com pedaço de input.
- Path traversal: `../` num caminho de arquivo montado com input.
- SSTI e XSS: valor de fora renderizado em template ou HTML sem escape.
- Desserialização de dado externo: `eval`, `Function(str)`, `pickle.loads`,
  YAML sem safe-load sobre bytes que vieram de fora.

**A aplicação como cliente.**
- **SSRF**: URL controlada pelo usuário buscada pelo servidor — alcança a rede
  interna, o metadata endpoint da cloud.
- Open redirect: destino de `redirect` vindo do request.
- Upload que confia no `Content-Type` ou na extensão que o cliente mandou.

**Abuso da lógica de negócio** — o que só se acha lendo o que a aplicação
**faz**, não procurando um padrão. A pergunta é: qual operação custa dinheiro,
reputação ou recurso quando alguém a repete ou a torce? Nenhum scanner responde
isso — é o que esta lâmina tem e um SAST não.
- **Pagamento e cobrança**: preço, valor ou quantidade que vêm do cliente e o
  servidor aceita; falta de idempotência que deixa reenviar e cobrar/estornar
  duas vezes; webhook de gateway cuja assinatura não é verificada; cupom que
  empilha, quantidade negativa que credita, checagem de saldo que dá para correr.
- **IA e LLM**: **prompt injection** — input do usuário (ou conteúdo que o modelo
  busca) entrando no prompt e virando instrução; custo sem teto — nenhum limite
  de tokens, taxa ou gasto, e a conta é sua; agir sobre a saída do modelo sem
  validar (SQL, comando, chamada de ferramenta que o modelo escolhe); segredo ou
  PII de outro usuário indo parar no contexto.
- **Qualquer operação cara e gratuita para quem chama**: envio em massa, geração,
  processamento pesado sem limite por usuário — negação de serviço pela porta da
  frente, ou só uma fatura alta no fim do mês.

**Exposição e falta de limite.**
- Erro que vaza stack trace, query ou caminho interno na resposta.
- CORS `*` com credencial, cookie sem `HttpOnly`/`Secure`, debug em produção,
  `http://` onde trafega segredo.
- Endpoint que muda estado sem proteção de **CSRF**, aceitando requisição
  disparada de outro site em nome do usuário logado.
- Sem rate limit em operação sensível: login, reset de senha, envio de código —
  o que torna força bruta e enumeração baratas.

**Segredo versionado** — chave, token, senha, connection string no código ou em
config commitada. É o achado mais raso da lista (e o que scanner dedicado pega
melhor), mas quando aparece o veredito é caro: apagar a linha **não** tira do
histórico do git.

Esta lista **não é exaustiva** — nenhuma é. Ela nomeia o que mais aparece; o que
acha o resto é o método do §2, não a memória de um catálogo. A pergunta que vale
em qualquer achado, dentro ou fora da lista, é a mesma: **quem alcança, e o que
ele consegue?** Se você souber responder isso, é achado, tenha nome ou não.

## 4. Verifique antes de acusar

- **Confirme a alcançabilidade.** Antes de chamar de crítico, siga o caminho de
  volta: o ponto de entrada é mesmo exposto, e o dado chega mesmo cru? "Rota sem
  auth" que na verdade passa por um middleware de autenticação global é falso
  positivo — e falso positivo em segurança gasta o capital que faz levarem o
  relatório a sério.
- **Rebaixe o que só o interno alcança.** Valor que só código próprio ou teste
  produz não tem a exposição de um vindo da rede — o achado pode ficar, mas
  rebaixado e **dizendo** isso (GRAMATICA §4).
- **Segredo de verdade, não placeholder.** `sk-test-…`, `changeme`, fixture e
  exemplo de README são ruído. `git log -S` no valor ajuda: segredo real entra
  junto do código que o usa.
- **Gap conhecido não é achado novo.** Se o `CLAUDE.md` já registra a dívida com
  paliativo, confira se o paliativo ainda descreve o código e reporte a
  divergência, não a dívida.
- **Nunca cole o valor de um segredo no relatório.** Aponte arquivo e linha; o
  valor já vazou uma vez, e o relatório não será o segundo lugar.

## 5. Reporte

Ordenado por **exposição** — o que um anônimo alcança primeiro, depois o que
exige usuário autenticado, por último o que depende de acesso interno. Cada
linha diz **quem alcança** e **o que ele consegue**, não só o nome da classe:

```markdown
| O quê | Onde | Quem alcança → o que consegue | Veredito |
|---|---|---|---|
| IDOR: `pedidoId` do request sem checar dono | `borda/api.js:52` | qualquer usuário logado → lê o pedido de qualquer outro | *Corrigir.* Falta o dono na query; ninguém confere. |
| rota `DELETE /admin/user` sem exigir papel | `borda/rotas.js:88` | qualquer logado → apaga conta alheia | *Corrigir.* A checagem de admin está só no front. |
| `nome` interpolado na query SQL | `borda/busca.js:14` | anônimo na busca → injeção SQL | *Corrigir.* Parametrizar; hoje é string concatenada. |
| `valor` da cobrança vem do body do request | `borda/checkout.js:30` | qualquer comprador → paga o preço que quiser | *Corrigir.* O servidor tem que calcular o preço, não confiar no cliente. |
| input do usuário concatenado no prompt do modelo | `borda/chat.js:19` | qualquer usuário → prompt injection, e custo sem teto | *Corrigir.* Separar instrução de dado; limitar tokens por chamada. |
| stack trace na resposta 500 | `borda/erros.js:19` | quem provocar o erro → vê caminho interno | *Registrar.* Vira gap conhecido se ficar. |
| token de API no código | `borda/http.js:8` | qualquer clone do repo → usa a chave | *Rotacionar.* Apagar a linha não tira do histórico. |
```

Cinco vereditos: **corrigir**, **rotacionar** (segredo commitado: revogar e
trocar na origem vem antes de qualquer edição), **registrar** (vira gap conhecido
— `/docs:decidir` se o kit irmão estiver instalado), **manter** (listado para
constar, sem exposição real), **confirmar** (a alcançabilidade não fechou e a
pergunta é sua — meio caminho de auth, middleware que talvez cubra).

Feche **sempre** com o que não foi coberto — dependências, infraestrutura,
lógica de negócio que exige contexto, o que só pentest vê. Relatório vazio fecha
igual: "não achei" + a lista do que não olhei.

Pergunte o que aplicar antes de tocar em qualquer arquivo.

## 6. Aplique e verifique

Só o aprovado. Typecheck, lint e testes depois; conserte o que quebrou.

Correção daqui muda comportamento com frequência — uma checagem de autorização
nova recusa request que antes passava. Se não houver teste cobrindo o caminho,
proponha o teste **antes** da correção, como faz `/code:gambiarra`: o teste que
prova a brecha (o usuário A alcançando o recurso de B) deve falhar antes e passar
depois.

Rotacionar segredo é ação fora do repositório: diga o passo (revogar na origem,
trocar por variável de ambiente) e deixe a revogação com o usuário — este comando
edita código, não consoles de terceiros.

## 7. Nunca

- Declarar o repositório seguro, aprovado ou "sem vulnerabilidades". Este
  comando lista o que achou; não certifica o que não achou.
- Chamar de crítico sem seguir o caminho de volta e confirmar que a entrada é
  alcançável e o dado chega cru. Falso positivo aqui gasta a confiança no resto.
- Colar valor de segredo no relatório, em log ou em mensagem de commit.
- Tratar segredo versionado como resolvido porque a linha foi apagada.
- Acusar sem dizer quem alcança e o que consegue (GRAMATICA §1).
- Chamar de vulnerabilidade o que é gambiarra sem exposição — contorno que só
  esconde bug é assunto de `/code:gambiarra`.
- Corrigir e reportar na mesma passada.
