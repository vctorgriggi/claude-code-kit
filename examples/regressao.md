# Regressão do zelo

> Material do mantenedor, não dos comandos: vive fora do runtime de propósito.
> Rode mentalmente após editar `grammar/GRAMATICA.md` ou um comando, e antes de
> reinstalar. Resultado divergente que não era a intenção da edição é deriva.
>
> O que é mecânico não mora aqui: virou regra do `codecheck`, com id, e o CI
> cobre. Esta tabela guarda o que depende de julgamento do modelo.

## Carregamento

| #   | Entrada                                                | Resultado travado                                                                       |
| --- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1   | Qualquer comando sem `~/.claude/code-kit/GRAMATICA.md`   | o comando **para** e manda rodar `./install.sh`; não improvisa critério                 |
| 2   | Qualquer comando com a gramática instalada               | lê o texto normativo antes de agir; os critérios citados vêm de lá, nunca de paráfrase   |

## O filtro que governa

| #   | Entrada                                                 | Resultado travado                                                                        |
| --- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 3   | Achado que não muda decisão de ninguém                    | não entra no relatório (GRAMATICA §1) — preferência de estilo nunca vira achado          |
| 4   | Achado sem consequência declarada                         | não é achado; cada linha diz o que muda ao corrigir                                      |
| 5   | Relatório com mais de um achado                           | ordenado por consequência, nunca por arquivo nem por ordem de descoberta                 |
| 6   | Nenhum achado                                             | diz isso em uma linha e para; não infla para parecer útil                                |

## `/code:varrer`

| #   | Entrada                                     | Resultado travado                                                                     |
| --- | --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 7   | Repositório qualquer                          | **nada é alterado**; `git status` limpo depois                                        |
| 8   | Repositório grande                            | amostra 3–5 arquivos por área, escolhidos pelo que o git indica como quente           |
| 9   | Fecho do relatório                            | aponta qual lâmina usar em seguida, na ordem, com o motivo de cada uma                |
| 10  | Projeto com arquivos que não são JS/TS        | o achado `L0` **abre** o relatório, nomeando as famílias que não rodaram; o resumo limpo nunca é apresentado como cobertura completa |

## `/code:contrato`

| #   | Entrada                                                     | Resultado travado                                                                       |
| --- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 11  | Projeto sem `CLAUDE.md`                                       | **para** com mensagem própria: não há o que cobrar; sugere `/docs:fundar` ou `/code:varrer` |
| 12  | Achado de contrato                                            | cita o trecho do contrato; sem citação é opinião fantasiada de regra do projeto         |
| 13  | Código contradiz o contrato de forma consistente e deliberada | nomeia as duas hipóteses e devolve a escolha; **não** corrige contra a intenção real    |
| 14  | Dívida listada em "Gaps conhecidos"                           | não é violação; no máximo confere se o paliativo descrito ainda é o que o código faz    |
| 15  | Conclusão de que o contrato envelheceu                        | **não edita o CLAUDE.md** — encaminha para `/docs:decidir`                              |

## `/code:comentarios`

| #   | Entrada                                          | Resultado travado                                                                      |
| --- | -------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 16  | Comentário que repete o código                     | candidato a remoção, com a idade do `git blame`                                        |
| 17  | Comentário que explica intenção, trade-off ou bug  | mantido                                                                                |
| 18  | JSDoc/docstring de API pública                     | **mantido** — parece redundante e ferramenta externa depende dele                      |
| 19  | Dúvida sobre um candidato                          | fica; o erro caro é remover contexto                                                   |
| 20  | Comentário que é diretiva (`eslint-disable`, pragma) | nunca removido como comentário — muda comportamento                                    |
| 21  | Aprovação da lista                                 | pergunta antes; no "um a um", chama cada comentário pelo texto exato, não pela linha   |
| 22  | Comentário mal escrito, mas com conteúdo           | não é reescrito; este comando remove ou mantém                                         |

## `/code:gambiarra`

| #   | Entrada                                              | Resultado travado                                                                    |
| --- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| 23  | Atalho com motivo na linha e condição de saída         | **não é achado** — é dívida deliberada                                               |
| 24  | Atalho sem motivo escrito                              | achado; o veredito é corrigir ou registrar                                           |
| 25  | Motivo existe mas só na cabeça de alguém               | achado é "falta registrar", não "está errado"                                        |
| 26  | Correção que muda comportamento sem teste cobrindo     | propõe o teste **antes** da correção                                                 |
| 27  | Contorno cuja causa não se entende                     | não remove — sumir o sintoma faz voltar o bug original                               |

## `/code:testes`

| #   | Entrada                                                  | Resultado travado                                                                   |
| --- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 28  | Teste cuja asserção recai sobre o mock                     | achado: prova que o mock foi chamado, não que o código funciona                     |
| 29  | Critério do `SPEC.md` ou invariante do `DOMAIN.md` sem teste | achado de "teste que falta", citando a promessa sem prova                          |
| 30  | Projeto sem `SPEC.md`/`DOMAIN.md`                          | diz que essa parte não roda; **não inventa critério**                               |
| 31  | Teste redundante                                           | não é apagado; teste duplicado custa segundos, ausente custa incidente              |
| 32  | Teste novo cobrindo bug                                    | confirma que **falha sem a correção** antes de dar por pronto                       |
| 33  | Teste que quebra em refatoração inócua                     | achado: testa implementação, não comportamento                                      |

## `/code:duplicacao` e `/code:estrutura`

| #   | Entrada                                                    | Resultado travado                                                                 |
| --- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| 34  | Dois trechos parecidos que mudam por razões diferentes        | *manter* — abstração errada custa mais que duplicação                             |
| 35  | Mesma regra escrita em dois lugares, que mudam juntos         | *unificar*, dizendo **onde** a versão única deve morar                            |
| 36  | Unificação que moveria regra de domínio para a borda          | recusada                                                                          |
| 37  | Repositório com dois padrões e nada declarando qual vale      | achado é "coexistem X e Y", nunca "Y está errado" (GRAMATICA §4)                  |
| 38  | Recomendação vinda da doc oficial                             | registra `(fonte: docs oficiais <framework> <versão>, <mês/ano>)`                 |
| 39  | Sem rede para consultar a doc                                 | diz que a camada não rodou; nunca conclui "está certo"                            |

## `/code:morto`

| #   | Entrada                                                      | Resultado travado                                                                          |
| --- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 40  | Candidato levantado pelo `M1`                                  | tratado como **candidato**, nunca veredito — o `M1` é busca textual                        |
| 41  | Qualquer proposta de remoção                                   | traz **qual busca provou o quê**; "nenhuma referência" sem dizer onde procurou não é prova |
| 42  | Símbolo citado apenas dentro de string, JSON ou CI             | *manter* — acesso dinâmico conta como vivo                                                 |
| 43  | Símbolo usado só dentro do próprio arquivo                     | *desexportar*, nunca apagar                                                                |
| 44  | Símbolo referenciado só por teste                              | *avaliar*; e o teste **nunca** é apagado para o símbolo virar morto                        |
| 45  | Export em `main`/`exports`/`bin`, ou entry point de framework  | vivo por definição; remoção só com confirmação explícita                                   |
| 46  | Evidência que não fecha (migração pela metade)                 | *confirmar* — devolve a pergunta em vez de escolher um lado                                |
| 47  | Remoção aprovada                                               | refaz a busca a cada nível da cascata; roda a suíte completa e o build                     |

## `/code:seguranca`

| #   | Entrada                                                  | Resultado travado                                                                        |
| --- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 48  | Segredo versionado                                         | veredito *rotacionar*: revogar na origem vem antes de editar — apagar a linha não tira do histórico |
| 49  | Qualquer segredo achado                                    | o **valor** nunca aparece no relatório, em log ou em commit; arquivo e linha bastam      |
| 50  | Relatório, inclusive o vazio                               | fecha declarando o que **não** foi coberto; "não achei" nunca vira "está seguro"         |
| 51  | Achado alcançável só por código interno ou teste           | exposição rebaixada **e dita** — nunca inflado para parecer grave                        |
| 52  | Credencial de placeholder, fixture ou exemplo de doc       | não é achado                                                                             |
| 53  | Contorno sem exposição a terceiro                          | encaminhado a `/code:gambiarra`; vulnerabilidade e gambiarra não se misturam no relatório |

## Gates

| #   | Entrada                                     | Resultado travado                                                                        |
| --- | --------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 54  | Qualquer comando que edita                    | reporta a lista **antes**; nada é aplicado sem o usuário escolher                        |
| 55  | Escrita aprovada                              | passa também pelo prompt de permissão do harness (`Write` fora do `allowed-tools`)       |
| 56  | Depois de aplicar                             | roda typecheck, lint e testes; conserta o que a mudança quebrou                          |
| 57  | Hook de `PostToolUse` em arquivo limpo        | **silêncio** — sem isso vira ruído a cada save                                           |
| 58  | Hook em arquivo que não é código, ou com o kit quebrado | silêncio; nunca falha a edição                                                 |
