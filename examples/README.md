# Exemplos

> Transcrições de sessão dos comandos do kit, anotadas. Convenção: blockquotes
> em itálico são anotações do corpus; todo o resto é a sessão.

**Comece por [ciclo-completo.md](ciclo-completo.md)** se quiser ver o uso
inteiro antes do detalhe: herdar um repositório sem contrato, o que o
verificador diz sozinho, qual lâmina usar para cada tipo de achado, e o que
muda quando o `CLAUDE.md` existe. É o mapa; as transcrições abaixo são os
mergulhos.

**A ordem é a mesma que o `/code:varrer` usa para priorizar** — por
consequência, não por tema nem por ordem de escrita. O retrato vem primeiro;
depois as lâminas, do que causa bug para o que causa atrito; e por último a que
apaga, porque ela exige entender o código antes.

| # | Arquivo | Comando | Peso | O que observar |
| --- | --- | --- | --- | --- |
| 01 | [01-varrer.md](01-varrer.md) | `/code:varrer` | o retrato | ordenação por consequência; cada achado dizendo o que muda; o fecho apontando qual lâmina usar, e por quê |
| 02 | [02-contrato.md](02-contrato.md) | `/code:contrato` | CRÍTICO | contrato contradito de forma consistente virando hipótese de documento velho, não correção automática; o kit recusando editar o `CLAUDE.md` |
| 03 | [03-gambiarra-e-testes.md](03-gambiarra-e-testes.md) | `/code:gambiarra` · `/code:testes` | CRÍTICO | dívida deliberada não sendo achado; o teste vindo **antes** da correção que muda comportamento; "teste que falta" saindo de promessa declarada |
| 04 | [04-seguranca.md](04-seguranca.md) | `/code:seguranca` | CRÍTICO | superfície mapeada antes de varrer padrão; IDOR e rota sem autorização saindo da **ausência** de uma checagem; o fecho declarando o que **não** foi coberto — "não achei" nunca vira "está seguro" |
| 05 | [05-estrutura.md](05-estrutura.md) | `/code:estrutura` | ALTO | três fontes de verdade com pesos diferentes; recomendação externa carregando data; empate sujo virando "coexistem", não violação |
| 06 | [06-comentarios-e-duplicacao.md](06-comentarios-e-duplicacao.md) | `/code:comentarios` · `/code:duplicacao` | MÉDIO | JSDoc público sendo mantido; duplicação que é *manter* porque os dois lados evoluem separado |
| 07 | [07-morto.md](07-morto.md) | `/code:morto` | apaga | cinco candidatos do `M1` virando um só *remover*; acesso dinâmico por JSON salvando o código; a cascata refeita a cada nível |
| — | [regressao.md](regressao.md) | (mantenedor) | — | 62 casos com resultado travado, para detectar deriva depois de editar a gramática ou um comando |

Três leituras que valem mais que os arquivos isolados:

- **01 → 02** é o caminho normal: o retrato aponta o crítico, a lâmina resolve.
- **03** é o único par obrigatório — corrigir a gambiarra expõe que nada testava
  aquele caminho, e o teste precisa vir antes da correção.
- **07** fecha porque é a única que apaga. Ler as outras primeiro é o que dá
  contexto para julgar se um símbolo está morto ou só parece.

## Projetos de referência

| Fixture | Para que serve |
| --- | --- |
| [`fixtures/limpo/`](fixtures/limpo/) | Com `CLAUDE.md` declarando regra de ouro, fronteira e proibições; código que respeita; testes que passam. Passa `--strict` com **zero achados** no CI, e é de onde a suíte de mutação parte para quebrar um invariante de cada vez. |
| [`fixtures/sujo/`](fixtures/sujo/) | Sem `CLAUDE.md`, com dívida que ninguém registrou. É o que os comandos encontram no mundo real, e a prova das duas metades da dependência graciosa: o que funciona sem contrato, e o que o kit se recusa a inventar sem ele. |

```bash
node bin/codecheck.mjs --strict examples/fixtures/limpo   # 0 achados
node bin/codecheck.mjs examples/fixtures/sujo             # 6 violações e 3 avisos, em 4 famílias
node bin/codecheck.mjs --explain M1                       # o porquê de uma regra
cd examples/fixtures/limpo && node --test                 # o código funciona
```
