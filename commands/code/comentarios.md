---
description: Encontra comentários que repetem o código em vez de explicar o porquê, e remove só os que o usuário aprovar. Reporta antes de aplicar, sempre.
argument-hint: [quantidade | tudo | pasta a focar]
# Edit sem Write: remover comentário é edição pontual em arquivo existente;
# criar arquivo nunca faz parte. Cada escrita ainda passa pelo prompt do
# harness — segundo gate além da aprovação da lista.
# npm run/npm test/node --test: o §5 cobra lint e typecheck após remover, e
# verificação obrigatória não deve esbarrar no prompt. Runner de outra stack
# passa pelo prompt do harness, como qualquer não listado.
allowed-tools: Read, Glob, Grep, Edit, Bash(git blame:*), Bash(git log:*), Bash(ls:*), Bash(npm test:*), Bash(npm run:*), Bash(node --test:*), Bash(node ~/.claude/bin/codecheck.mjs:*)
disable-model-invocation: true
---

# /code:comentarios

Pedido (pode estar vazio): $ARGUMENTS

Comentário bom explica **por quê**; comentário ruim repete **o quê** o código já
diz. O segundo custa: ocupa atenção em toda leitura, mente quando o código muda,
e ensina quem lê a pular comentários — inclusive os que importam.

**Reporta antes de aplicar.** Nada é removido sem você ver a lista.

## 0. Carregue o zelo

Leia `~/.claude/code-kit/GRAMATICA.md` (expanda `~`). Ausente: **pare** e diga
que `./install.sh` resolve.

Resolva o limite: número em `$ARGUMENTS` fixa a quantidade; `tudo` traz todos;
vazio traz os 10 de menor valor.

## 1. O teste que decide

Um só, e ele é de deleção:

> **Apagar esta linha muda o que alguém faz com o código?**

Muda → fica. Não muda → candidato.

```js
count++;                        // incrementa o contador        → remove
const buscar = debounce(f, 300); // evita martelar a API a cada tecla → fica
const id = Number(resp.id);     // o SDK v3 devolve string aqui — #412  → fica
```

## 2. Nunca remova

Comentário que carrega um porquê que o código não consegue carregar:

- workaround, gotcha, ou razão não óbvia;
- compatibilidade, versão, backport;
- referência a bug, issue, RFC, ADR ou decisão;
- intenção, trade-off, constraint;
- aviso de segurança ou de ordem de execução;
- **doc de API pública** — JSDoc, docstring e afins parecem redundantes e não
  são: ferramenta externa depende deles.

Na dúvida, **fica** (GRAMATICA §5). O erro caro é remover contexto; o barato é
deixar um comentário a mais.

## 3. Levante os candidatos

Varra o código-fonte; pule saída gerada, dependência vendorizada, lockfile e
documentação. Para cada candidato, pegue a idade:

```bash
git blame -L <linha>,<linha> --date=relative -- <arquivo>
```

Idade não decide nada sozinha, mas informa: comentário-ruído de dois anos que
sobreviveu a refatorações costuma ser mais seguro de remover que um de ontem,
que pode ser contexto fresco de quem ainda está no assunto.

## 4. Reporte

```markdown
| Comentário | Onde | Idade | Veredito |
|---|---|---|---|
| `// incrementa o contador` | `src/a.js:12` | 8 meses | *Remover.* Repete `count++`. |
| `// debounce evita martelar a API` | `src/b.js:30` | 1 ano | *Manter.* Diz a intenção. |
```

Ordene do mais redundante para o menos. Depois pergunte:

> **Remover todos os marcados?**
> - Sim, remover todos
> - Não, quero decidir um a um

No "não", pergunte por comentário, chamando cada um **pelo texto exato**, não
pela localização — quem decide precisa ver o que está apagando.

## 5. Aplique e verifique

Remova só o aprovado. Depois rode lint e typecheck do projeto e conserte o que
a remoção quebrou (comentário pode ser diretiva: `eslint-disable`,
`@ts-expect-error`, pragma de cobertura — remover muda comportamento).

Feche com uma linha: quantos saíram, quantos ficaram e por quê.

## 6. Nunca

- Remover sem a lista ter passado pelo usuário.
- Remover diretiva disfarçada de comentário.
- Reescrever comentário. Este comando remove ou mantém; melhorar texto é outra
  conversa, e reescrever silenciosamente troca a voz do autor pela sua.
- Tocar em código junto. Só comentários saem daqui.
