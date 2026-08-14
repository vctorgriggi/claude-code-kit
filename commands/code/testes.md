---
description: Avalia a suíte de testes em três eixos — teste que não prova nada, teste que não é sólido, e teste que falta para um critério ou invariante declarado. Reporta antes de aplicar.
argument-hint: [pasta de teste, módulo ou área para focar]
allowed-tools: Read, Glob, Grep, Edit, Bash(git log:*), Bash(ls:*), Bash(wc:*), Bash(npm test:*), Bash(node --test:*), Bash(node ~/.claude/bin/codecheck.mjs:*)
disable-model-invocation: true
---

# /code:testes

Foco (pode estar vazio): $ARGUMENTS

Suíte verde não é prova de nada por si só. Este comando pergunta três coisas
diferentes, e a terceira é a que nenhuma ferramenta de cobertura responde.

**Reporta antes de aplicar.**

## 0. Carregue o zelo

Leia `~/.claude/code-kit/GRAMATICA.md` (expanda `~`). Ausente: **pare**.

Rode `node ~/.claude/bin/codecheck.mjs --json .`: a família `T` já pega teste
sem asserção (`T1`), asserção que não pode falhar (`T2`) e `skip` sem motivo
(`T3`). Parta desses; não os repita.

## 1. Teste que não é sólido

Passa hoje e não protege amanhã. Cinco formas:

**Testa o mock.** Toda dependência mockada e a asserção recai sobre o mock —
prova que o mock foi chamado, não que o código funciona.

**Asserção frouxa.** `toBeTruthy()` onde cabia o valor exato; `not.toThrow()`
como única verificação; comparar contra a própria expressão que produziu o
valor (tautologia).

**Testa implementação, não comportamento.** Espia chamada interna, depende de
ordem de método privado. Quebra em refatoração que não muda nada observável — e
aí alguém ajusta o teste em vez de investigar, que é como suíte perde valor.

**Depende de ordem ou de estado compartilhado.** Passa em suíte completa, falha
sozinho (ou o contrário). O sinal é estado de módulo mutado entre testes.

**O nome mente.** `test("recusa valor negativo")` que só verifica que não
lançou. O nome é contrato de leitura: quem lê a lista de testes acredita nele.

## 2. Teste que falta

Não é cobertura de linha. É **promessa declarada sem prova**:

- **Critério de aceitação do `SPEC.md`** sem teste que o nomeie.
- **Invariante `I<n>` do `DOMAIN.md`** sem teste que o cite.
- **Proibição do "Nunca fazer"** que dá para provar por teste.
- **Caminho de erro** de função pública que só tem teste do caminho feliz.
- **Regressão de bug corrigido**: `git log --grep=fix` sem teste correspondente.

Os três primeiros só funcionam com o kit irmão instalado — sem `SPEC.md` e
`DOMAIN.md`, diga que essa parte não roda em vez de inventar critério
(GRAMATICA §4).

## 3. Verifique antes de acusar

- **Rode a suíte.** Diagnóstico sobre teste que você não viu passar é chute.
- **Teste sozinho o que suspeita de acoplamento de ordem.**
- Mock legítimo existe: borda de rede, relógio, aleatoriedade. Mockar isso é
  correto — o achado é mockar **o que está sendo testado**.

## 4. Reporte

Ordenado por consequência: primeiro o que afirma cobertura falsa, depois o que
falta, por último o frágil.

```markdown
| Teste | Onde | Problema | Veredito |
|---|---|---|---|
| `soma itens` | `test/a.test.js:12` | asserção recai sobre o mock de `repo` | *Refazer.* Não prova o cálculo. |
| — | `src/frete.js` | critério 3 do SPEC sem teste | *Escrever.* Nada garante o arredondamento. |
| `I2 terminal` | `test/b.test.js:30` | espia método privado | *Ajustar.* Quebra em refatoração inócua. |
```

Para "teste que falta", proponha o **nome** e a **asserção**, não o corpo
inteiro — quem escreve decide o resto.

Pergunte o que aplicar antes de tocar em arquivo.

## 5. Aplique e verifique

Só o aprovado. Rode a suíte depois **e confirme que o teste novo falha sem a
correção** quando ele cobre um bug: teste que passa antes e depois não prova
nada, que é o problema que este comando existe para caçar.

## 6. Nunca

- Apagar teste porque parece redundante. Teste duplicado custa segundos; teste
  ausente custa incidente. Na dúvida, fica (GRAMATICA §5).
- Enfraquecer asserção para o teste passar.
- Escrever teste que só reflete a implementação atual — nasce quebrando na
  primeira refatoração legítima.
- Reportar falta de cobertura sem dizer qual promessa está sem prova.
