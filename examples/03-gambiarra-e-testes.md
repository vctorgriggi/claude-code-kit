# Exemplo 3: /code:gambiarra e /code:testes — o atalho e a prova que falta

Os dois juntos porque é assim que aparecem: corrigir uma gambiarra expõe que
nada testava aquele caminho.

---

**Usuário:** `/code:gambiarra src/borda`

**Agente:** [lê a gramática; parte dos achados `J` do codecheck]

| O quê | Onde | Contorna | Veredito |
|---|---|---|---|
| `setTimeout(…, 300)` | `borda/api.js:88` | espera o DOM montar | *Corrigir.* Passa em máquina rápida, falha em CI carregado. |
| `retry(3)` sem backoff | `borda/api.js:120` | uma race na inicialização | *Corrigir.* Mascara o bug e triplica a carga quando ele acontece. |
| `as any` | `borda/sdk.ts:12` | tipo errado no SDK — issue #412 | *Manter.* Dívida com motivo e saída. |

O terceiro **não é achado**: tem motivo na linha e condição de volta. Dívida
registrada é o sistema funcionando.

> _A distinção que organiza este comando: dívida deliberada tem motivo escrito
> e condição de saída; gambiarra não tem. O `as any` passaria por gambiarra em
> qualquer revisor que só olhasse o símbolo._

**Usuário:** corrige os dois

**Agente:** O `retry` sem backoff eu corrijo direto. O `setTimeout` **muda
comportamento** — passa a aguardar o evento de montagem — e não há teste
cobrindo esse caminho.

Proponho a ordem inversa: primeiro o teste que falha hoje, depois a correção.
Sem isso, não temos como saber se a troca funcionou.

**Usuário:** boa, faz assim

---

**Usuário:** `/code:testes src/borda`

**Agente:** [roda a suíte; parte dos achados `T` do codecheck]

| Teste | Onde | Problema | Veredito |
|---|---|---|---|
| `busca lista` | `test/api.test.js:14` | asserção recai sobre o mock de `fetch` | *Refazer.* Prova que o mock foi chamado, não que o parsing funciona. |
| — | `borda/api.js` | montagem do DOM sem teste | *Escrever.* `"aguarda a montagem antes de consultar"`. |
| — | `borda/api.js` | critério 2 do SPEC sem teste | *Escrever.* Nada garante o timeout de rede. |
| `não quebra` | `test/api.test.js:40` | só verifica `not.toThrow()` | *Ajustar.* Passaria com a função devolvendo lixo. |

Os dois "escrever" vêm de fontes diferentes: um é o caminho que a correção
acabou de criar, outro é **promessa declarada sem prova** — o critério 2 do
`SPEC.md` não tem teste que o nomeie.

> _"Teste que falta" aqui não é cobertura de linha: é critério de aceitação e
> invariante de domínio sem prova. Só funciona com o kit irmão instalado — sem
> `SPEC.md`, o comando diz que essa parte não roda em vez de inventar critério._

**Usuário:** escreve os dois e ajusta o último

**Agente:** [propõe nome e asserção de cada um; com o OK, escreve]

Confirmei que o teste da montagem **falha sem a correção** e passa com ela. Um
teste que passa antes e depois não prova nada — que é justamente o problema
que este comando caça.
