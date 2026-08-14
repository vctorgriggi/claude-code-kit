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

## `/code:contrato`

| #   | Entrada                                                     | Resultado travado                                                                       |
| --- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 10  | Projeto sem `CLAUDE.md`                                       | **para** com mensagem própria: não há o que cobrar; sugere `/docs:fundar` ou `/code:varrer` |
| 11  | Achado de contrato                                            | cita o trecho do contrato; sem citação é opinião fantasiada de regra do projeto         |
| 12  | Código contradiz o contrato de forma consistente e deliberada | nomeia as duas hipóteses e devolve a escolha; **não** corrige contra a intenção real    |
| 13  | Dívida listada em "Gaps conhecidos"                           | não é violação; no máximo confere se o paliativo descrito ainda é o que o código faz    |
| 14  | Conclusão de que o contrato envelheceu                        | **não edita o CLAUDE.md** — encaminha para `/docs:decidir`                              |

## `/code:comentarios`

| #   | Entrada                                          | Resultado travado                                                                      |
| --- | -------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 15  | Comentário que repete o código                     | candidato a remoção, com a idade do `git blame`                                        |
| 16  | Comentário que explica intenção, trade-off ou bug  | mantido                                                                                |
| 17  | JSDoc/docstring de API pública                     | **mantido** — parece redundante e ferramenta externa depende dele                      |
| 18  | Dúvida sobre um candidato                          | fica; o erro caro é remover contexto                                                   |
| 19  | Comentário que é diretiva (`eslint-disable`, pragma) | nunca removido como comentário — muda comportamento                                    |
| 20  | Aprovação da lista                                 | pergunta antes; no "um a um", chama cada comentário pelo texto exato, não pela linha   |
| 21  | Comentário mal escrito, mas com conteúdo           | não é reescrito; este comando remove ou mantém                                         |

## `/code:gambiarra`

| #   | Entrada                                              | Resultado travado                                                                    |
| --- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| 22  | Atalho com motivo na linha e condição de saída         | **não é achado** — é dívida deliberada                                               |
| 23  | Atalho sem motivo escrito                              | achado; o veredito é corrigir ou registrar                                           |
| 24  | Motivo existe mas só na cabeça de alguém               | achado é "falta registrar", não "está errado"                                        |
| 25  | Correção que muda comportamento sem teste cobrindo     | propõe o teste **antes** da correção                                                 |
| 26  | Contorno cuja causa não se entende                     | não remove — sumir o sintoma faz voltar o bug original                               |

## `/code:testes`

| #   | Entrada                                                  | Resultado travado                                                                   |
| --- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 27  | Teste cuja asserção recai sobre o mock                     | achado: prova que o mock foi chamado, não que o código funciona                     |
| 28  | Critério do `SPEC.md` ou invariante do `DOMAIN.md` sem teste | achado de "teste que falta", citando a promessa sem prova                          |
| 29  | Projeto sem `SPEC.md`/`DOMAIN.md`                          | diz que essa parte não roda; **não inventa critério**                               |
| 30  | Teste redundante                                           | não é apagado; teste duplicado custa segundos, ausente custa incidente              |
| 31  | Teste novo cobrindo bug                                    | confirma que **falha sem a correção** antes de dar por pronto                       |
| 32  | Teste que quebra em refatoração inócua                     | achado: testa implementação, não comportamento                                      |

## `/code:duplicacao` e `/code:estrutura`

| #   | Entrada                                                    | Resultado travado                                                                 |
| --- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| 33  | Dois trechos parecidos que mudam por razões diferentes        | *manter* — abstração errada custa mais que duplicação                             |
| 34  | Mesma regra escrita em dois lugares, que mudam juntos         | *unificar*, dizendo **onde** a versão única deve morar                            |
| 35  | Unificação que moveria regra de domínio para a borda          | recusada                                                                          |
| 36  | Repositório com dois padrões e nada declarando qual vale      | achado é "coexistem X e Y", nunca "Y está errado" (GRAMATICA §4)                  |
| 37  | Recomendação vinda da doc oficial                             | registra `(fonte: docs oficiais <framework> <versão>, <mês/ano>)`                 |
| 38  | Sem rede para consultar a doc                                 | diz que a camada não rodou; nunca conclui "está certo"                            |

## Gates

| #   | Entrada                                     | Resultado travado                                                                        |
| --- | --------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 39  | Qualquer comando que edita                    | reporta a lista **antes**; nada é aplicado sem o usuário escolher                        |
| 40  | Escrita aprovada                              | passa também pelo prompt de permissão do harness (`Write` fora do `allowed-tools`)       |
| 41  | Depois de aplicar                             | roda typecheck, lint e testes; conserta o que a mudança quebrou                          |
| 42  | Hook de `PostToolUse` em arquivo limpo        | **silêncio** — sem isso vira ruído a cada save                                           |
| 43  | Hook em arquivo que não é código, ou com o kit quebrado | silêncio; nunca falha a edição                                                 |
