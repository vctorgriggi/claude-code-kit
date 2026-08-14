---
description: Encontra código que ninguém usa — símbolo sem referência, export sem consumidor, branch inalcançável, flag que nunca desliga — e prova cada um antes de propor a remoção. Reporta antes de aplicar.
argument-hint: [pasta, módulo ou área para focar]
allowed-tools: Read, Glob, Grep, Edit, Bash(git log:*), Bash(git grep:*), Bash(ls:*), Bash(node ~/.claude/bin/codecheck.mjs:*)
disable-model-invocation: true
---

# /code:morto

Foco (pode estar vazio): $ARGUMENTS

Este é o comando mais perigoso do kit, porque é o único cujo resultado é
**apagar**. Um falso positivo aqui não gera ruído — gera bug.

Por isso a postura é invertida em relação às outras lâminas: **todo símbolo é
vivo até você provar o contrário.** Não é "parece que ninguém usa"; é "procurei
de N formas e não achei consumidor".

**Reporta antes de aplicar.**

## 0. Carregue o zelo

Leia `~/.claude/code-kit/GRAMATICA.md` (expanda `~`). Ausente: **pare**.

Rode `node ~/.claude/bin/codecheck.mjs --json .`: `M1` já levanta os candidatos
mecânicos — export que nenhum outro arquivo menciona, já descontando entry
point, API do manifest, teste e acesso dinâmico por string. Parta deles; eles
são **candidatos**, não veredito.

## 1. As quatro categorias

**Símbolo sem referência.** Função, constante, tipo ou componente que nada
chama. O `M1` pega o caso exportado; o não exportado dentro de um arquivo
grande exige leitura.

**Export desnecessário.** O símbolo é usado, mas só dentro do próprio arquivo.
Aqui não se apaga — **tira-se o `export`**. É a correção mais barata e a mais
esquecida.

**Branch inalcançável.** `if (false)`, código depois de `return`, `case` de um
valor que o tipo não permite, flag que nunca é ligada.

**Duplicata versionada.** `processar2`, `handlerNew`, `utilsOld` convivendo com
o original, e só um sendo chamado.

## 2. A prova, antes de qualquer veredito

Para cada candidato, **todas** estas buscas — uma que você pular é a que
encontraria o consumidor:

1. `git grep -n '\bNOME\b'` no repositório inteiro, código e teste.
2. **Dentro de string**: `git grep -n "'NOME'\|\"NOME\""` — acesso dinâmico,
   mapa de rotas, nome de evento, chave de config.
3. **Import dinâmico e barril**: `import(`, `require(` construído, `export *`.
4. **Fora do código**: JSON de config, template, migration, workflow de CI.
5. `git log -S NOME --oneline | head -3` — quando entrou e por quê. Símbolo que
   nasceu semana passada provavelmente está esperando o consumidor chegar.

## 3. Vivos até prova em contrário

Nunca proponha remover sem tratar explicitamente:

- **API pública** — o que o `package.json` expõe em `main`, `exports`, `bin`,
  ou o que a documentação do projeto promete a terceiros.
- **Entry point de framework** — `page`, `layout`, `route`, `middleware`,
  handler registrado por convenção de nome, hook de ciclo de vida.
- **Acesso por reflexão** — decorator, injeção por nome, serialização.
- **Símbolo usado só em teste** — pode ser cobertura legítima de lógica não
  trivial. O veredito é "avaliar", não "remover"; e nunca apague o teste junto
  para o símbolo virar morto.
- **Compatibilidade** — export mantido para não quebrar quem importa de fora.

Na dúvida, fica (GRAMATICA §5).

## 4. Reporte

```markdown
| Símbolo | Onde | Prova | Veredito |
|---|---|---|---|
| `calcularAntigo` | `dominio/frete.js:40` | 0 refs em código, string, config e CI; entrou há 8 meses junto com `calcular` | *Remover.* |
| `formatar` | `borda/http.js:12` | usado só no próprio arquivo | *Desexportar.* Não apagar. |
| `handlerV2` | `borda/api.js:60` | 0 refs, mas `handler` original ainda é chamado | *Confirmar.* Migração pela metade? |
| `serializar` | `dominio/pedido.js:8` | referenciado só por `test/pedido.test.js` | *Avaliar.* Cobre lógica não trivial. |
```

Quatro vereditos: **remover**, **desexportar**, **confirmar** (a evidência não
fecha e a pergunta é sua), **avaliar**.

Diga sempre **qual busca provou o quê**. "Nenhuma referência" sem dizer onde
procurou não é prova.

Pergunte o que aplicar antes de apagar qualquer linha.

## 5. Aplique e verifique

Só o aprovado, e nesta ordem:

1. Remova o símbolo e o que **só** ele usava (a remoção costuma liberar uma
   cadeia — refaça a busca a cada nível, não presuma).
2. Typecheck, lint e a suíte **completa**, não só os testes da área.
3. Se o projeto tem build, rode: import quebrado às vezes só aparece ali.

Feche dizendo o que saiu, o que foi desexportado, e o que ficou por falta de
prova.

## 6. Nunca

- Apagar sem as cinco buscas do §2.
- Apagar teste para que o símbolo que ele cobre pareça morto.
- Tratar candidato do `M1` como veredito: ele é busca textual, e a família é
  aviso justamente porque não prova morte.
- Remover export de API pública sem o usuário confirmar que ninguém de fora
  consome.
- Apagar e reportar na mesma passada.
