---
description: Confere se o código segue a estrutura declarada no CLAUDE.md e o idioma do framework — onde a coisa mora, como a camada conversa, o que atravessa fronteira. Reporta antes de aplicar.
argument-hint: [pasta ou camada para focar]
allowed-tools: Read, Glob, Grep, Edit, WebFetch, WebSearch, Bash(git log:*), Bash(ls:*), Bash(tree:*), Bash(cat:*), Bash(node ~/.claude/bin/codecheck.mjs:*)
disable-model-invocation: true
---

# /code:estrutura

Foco (pode estar vazio): $ARGUMENTS

Duas perguntas distintas, e confundi-las é o erro comum: **onde a coisa mora**
(estrutura do projeto) e **como se faz isso neste framework** (idioma do
ecossistema). A primeira o projeto declara; a segunda a documentação oficial
declara.

**Reporta antes de aplicar.**

## 0. Carregue o zelo

Leia `~/.claude/code-kit/GRAMATICA.md` (expanda `~`). Ausente: **pare**.

`node ~/.claude/bin/codecheck.mjs --json .`: `C1` já pega import cruzando
fronteira declarada. Parta dele.

## 1. Contra o que medir, nesta ordem

1. **O `CLAUDE.md` do projeto**, quando existe: a árvore comentada da Estrutura
   diz o papel de cada pasta e o que ela nunca importa. É a medida mais forte,
   porque foi o projeto que a declarou.
2. **A convenção observável do próprio repositório**, quando não há contrato:
   o padrão que 80% do código segue. Aqui vale o limite do §4 — se coexistem
   dois padrões e nada declara qual vale, o achado é *"coexistem X e Y"*, não
   *"Y está errado"*.
3. **A documentação oficial do framework**, na versão que o manifest declara.
   Consulte com WebFetch — docs oficiais, não blog. Registre
   `(fonte: docs oficiais <framework> <versão>, <mês/ano>)` em cada achado que
   vier daí; sem a marca, a recomendação envelhece sem ninguém perceber.
   Sem rede, diga que essa camada não rodou.

## 2. O que procurar

- **Coisa no lugar errado**: regra de negócio no componente, query no
  controller, tipo de domínio declarado na borda.
- **Camada conversando pulando a do meio**: UI que fala com o banco.
- **Padrão do framework ignorado**: rota fora do roteador da versão, estado
  global onde o framework oferece contexto, ciclo de vida reimplementado à mão.
- **Nome que não segue a convenção do repositório** quando ela é consistente.
- **Arquivo que não cabe na árvore declarada** — nem ele está lá, nem a árvore
  o prevê.

## 3. Reporte

```markdown
| O quê | Onde | Medido contra | Veredito |
|---|---|---|---|
| query SQL no handler | `borda/http.js:30` | CLAUDE.md › Estrutura | *Mover* para `dados/`. |
| `useEffect` para derivar estado | `ui/Lista.tsx:14` | docs oficiais React 19, ago/2026 | *Trocar* por valor derivado. |
| dois estilos de export | 12 arquivos | nada declara | *Decidir.* Coexistem; `/docs:decidir` fixa. |
```

Pergunte o que aplicar antes de mover qualquer arquivo.

## 4. Aplique e verifique

Só o aprovado. Mover arquivo quebra import — rode typecheck, lint e testes, e
confira que a árvore do `CLAUDE.md` continua descrevendo o disco (o `docscheck`
do kit irmão acusa como `A1` se não).

## 5. Nunca

- Propor reorganização que o projeto não pediu porque "ficaria mais limpo".
- Tratar convenção inferida como regra quando o repositório é inconsistente.
- Citar recomendação de framework sem versão e data.
- Mover arquivo e reportar na mesma passada.
