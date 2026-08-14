# Exemplos

> Transcrições de sessão dos comandos do kit, anotadas. Convenção: blockquotes
> em itálico são anotações do corpus; todo o resto é a sessão.

**Comece por [ciclo-completo.md](ciclo-completo.md)** se quiser ver o uso
inteiro antes do detalhe: herdar um repositório sem contrato, o que o
verificador diz sozinho, qual lâmina usar para cada tipo de achado, e o que
muda quando o `CLAUDE.md` existe. É o mapa; as transcrições abaixo são os
mergulhos.

Uma transcrição por lâmina, na ordem em que elas aparecem no uso:

| Arquivo | Comando | O que observar |
| --- | --- | --- |
| [01-varrer.md](01-varrer.md) | `/code:varrer` | ordenação por consequência; cada achado dizendo o que muda; o fecho apontando qual lâmina usar, e por quê |
| [02-contrato.md](02-contrato.md) | `/code:contrato` | contrato contradito de forma consistente virando hipótese de documento velho, não correção automática; o kit recusando editar o `CLAUDE.md` |
| [03-gambiarra-e-testes.md](03-gambiarra-e-testes.md) | `/code:gambiarra` · `/code:testes` | dívida deliberada não sendo achado; o teste vindo **antes** da correção que muda comportamento; "teste que falta" saindo de promessa declarada |
| [04-comentarios-e-duplicacao.md](04-comentarios-e-duplicacao.md) | `/code:comentarios` · `/code:duplicacao` | JSDoc público sendo mantido; duplicação que é *manter* porque os dois lados evoluem separado |
| [05-estrutura.md](05-estrutura.md) | `/code:estrutura` | três fontes de verdade com pesos diferentes; recomendação externa carregando data; empate sujo virando "coexistem", não violação |
| [regressao.md](regressao.md) | (mantenedor) | 43 casos com resultado travado, para detectar deriva depois de editar a gramática ou um comando |

O par **01 → 02** mostra o caminho normal: o retrato aponta o crítico, a lâmina
resolve. O **03** é o único com dois comandos porque é assim que eles aparecem
— corrigir a gambiarra expõe que nada testava aquele caminho.

## Projeto de referência

[`fixtures/limpo/`](fixtures/limpo/) — serviço pequeno com `CLAUDE.md`
declarando regra de ouro, fronteira e proibições; código que a respeita; testes
que passam. Passa `codecheck --strict` com **zero achados** no CI, e é a base
de onde a suíte de mutação parte para quebrar um invariante de cada vez.

```bash
node bin/codecheck.mjs --strict examples/fixtures/limpo   # zero achados
node bin/codecheck.mjs --explain C1                        # o porquê de uma regra
cd examples/fixtures/limpo && node --test                  # o código funciona
```
