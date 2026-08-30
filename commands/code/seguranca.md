---
description: Caça o que um terceiro pode explorar — segredo versionado, entrada de fora usada crua, autorização no lugar errado, erro que vaza — e fecha sempre dizendo o que NÃO cobriu. Lista o que achou; nunca certifica o que não achou. Reporta antes de aplicar.
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
custa caro **porque alguém de fora explora**. A diferença muda tudo: o achado se
mede por exposição, não por atrito, e o relatório limpo é o momento mais
perigoso do comando.

**Reporta antes de aplicar.**

## 0. Carregue o zelo e o contrato

Leia `~/.claude/code-kit/GRAMATICA.md` (expanda `~`). Ausente: **pare**.

Rode `node ~/.claude/bin/codecheck.mjs --json .`: `J3` pega erro engolido — que
em caminho de autenticação é achado daqui — e `C2` pega proibição nomeada. A
camada mecânica **não caça segredo**: isso é território de ferramenta dedicada
(gitleaks, trufflehog), e regex de meia-verdade geraria o verde que mente.

Leia o `CLAUDE.md` se existir. Proibição de segurança declarada ali ("toda
entrada externa passa por `validar()` antes do domínio", "nunca interpolar
input em query") é a lâmina mais afiada deste comando: nenhum SAST genérico
sabe a regra que **este** projeto escolheu. Sem contrato, o comando roda com as
categorias do §2 e diz que rodou sem ele.

## 1. O que este comando não é

Dito antes dos achados, porque aqui o silêncio engana mais que em qualquer
outra lâmina (é o mesmo princípio do `L0`: verde que significa duas coisas é
pior que cobertura ausente):

- **Não é pentest** — ninguém executou ataque nenhum.
- **Não é SAST nem auditoria de dependência** — `npm audit`, Dependabot e
  scanner de segredo continuam necessários; este comando não os substitui.
- **Não certifica.** O fecho de todo relatório — inclusive o vazio — declara o
  que **não** foi coberto. "Não achei nada" nunca vira "está seguro".

## 2. O que procurar

- **Segredo versionado** — chave de API, token, senha, connection string no
  código ou em config commitada. Placeholder, fixture e exemplo de doc não
  contam (§3 decide).
- **Entrada de fora usada crua** — parâmetro de request interpolado em query
  SQL, em comando de shell, em caminho de arquivo, em HTML sem escape. A
  pergunta é sempre: de onde vem o valor, e quem o saneou no caminho?
- **`eval` e desserialização de dado externo** — `eval`, `Function(str)`,
  `pickle.loads`, YAML sem safe-load, sobre bytes que vieram de fora.
- **Autorização no lugar errado** — checada só na UI ou só no cliente; endpoint
  que confia no `id` que o próprio request afirma ser seu.
- **Erro que vaza** — stack trace, query, caminho interno ou credencial na
  resposta ou no log acessível.
- **Configuração frouxa** — CORS `*` com credencial, cookie sem `HttpOnly`/
  `Secure`, `http://` onde trafega segredo, debug ligado em produção.

## 3. Verifique antes de acusar

- **É alcançável por entrada externa?** Valor que só código interno ou teste
  produz não tem a mesma exposição — o achado pode ficar, mas rebaixado e
  dizendo isso. Afirme com a confiança que a evidência permite (GRAMATICA §4).
- **É segredo de verdade?** `sk-test-…`, `changeme`, fixture de teste e exemplo
  de README são ruído. `git log -S` no valor ajuda: segredo real costuma entrar
  junto de código que o usa.
- **Gap conhecido não é achado novo.** Se o `CLAUDE.md` já registra a dívida
  com paliativo, confira se o paliativo ainda é o que o código faz e reporte a
  divergência, não a dívida.
- **Nunca cole o valor de um segredo no relatório.** Aponte arquivo e linha; o
  valor já vazou uma vez, e o relatório não será o segundo lugar.

## 4. Reporte

Ordenado por exposição — o que um anônimo alcança primeiro, depois o que exige
usuário autenticado, por último o que depende de acesso interno:

```markdown
| O quê | Onde | Exposição | Veredito |
|---|---|---|---|
| token de API no código | `borda/http.js:8` | qualquer clone do repo | *Rotacionar.* Apagar a linha não tira do histórico. |
| id do request usado sem checar dono | `borda/api.js:52` | qualquer usuário logado | *Corrigir.* Um usuário lê o pedido do outro. |
| stack trace na resposta 500 | `borda/erros.js:19` | quem provocar o erro | *Registrar.* Vaza caminho interno; vira gap conhecido se ficar. |
| `eval` sobre config local | `scripts/build.js:31` | só quem edita o repo | *Manter.* Não alcançável de fora; dito para constar. |
```

Quatro vereditos: **corrigir**, **rotacionar** (segredo commitado: revogar e
trocar na origem vem antes de qualquer edição — o histórico do git guarda o que
a edição apaga), **registrar** (vira gap conhecido — `/docs:decidir` se o kit
irmão estiver instalado), **manter**.

Feche **sempre** com o que não foi coberto — dependências, infraestrutura, o
que só pentest vê. Relatório vazio fecha igual: "não achei" + a lista do que
não olhei.

Pergunte o que aplicar antes de tocar em qualquer arquivo.

## 5. Aplique e verifique

Só o aprovado. Typecheck, lint e testes depois; conserte o que quebrou.

Correção daqui muda comportamento com frequência — validação nova recusa input
que antes passava. Se não houver teste cobrindo o caminho, proponha o teste
**antes** da correção, como faz `/code:gambiarra`.

Rotacionar segredo é ação fora do repositório: diga o passo (revogar na
origem, trocar por variável de ambiente) e deixe a revogação com o usuário —
este comando edita código, não consoles de terceiros.

## 6. Nunca

- Declarar o repositório seguro, aprovado ou "sem vulnerabilidades". Este
  comando lista o que achou; não certifica o que não achou.
- Colar valor de segredo no relatório, em log ou em mensagem de commit.
- Tratar segredo versionado como resolvido porque a linha foi apagada.
- Acusar sem dizer quem alcança e o que muda ao corrigir (GRAMATICA §1).
- Chamar de vulnerabilidade o que é gambiarra sem exposição — contorno que só
  esconde bug é assunto de `/code:gambiarra`.
- Corrigir e reportar na mesma passada.
