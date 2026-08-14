# cotacao

> Serviço que calcula cotação de frete a partir de peso e destino.

Leia este arquivo no início de toda sessão — ele é o **contrato de como
escrevemos código aqui**, não documentação.

## Regra de ouro

**O domínio não conhece a borda: nada em `src/dominio/` importa rede, banco ou
framework.** Tudo abaixo é desdobramento disso. A borda traduz; o domínio
decide.

## Estrutura

```
src/
  dominio/    # regra pura: cálculo e validação (nunca importa de borda/)
  borda/      # HTTP, persistência, integrações
test/
```

## Nunca fazer

- Nunca importar de `borda/` dentro de `dominio/` — inverte a regra de ouro e
  torna o cálculo intestável sem subir infraestrutura.
- Nunca usar float para dinheiro — 0.1 + 0.2 não fecha caixa.
- Nunca engolir erro de integração em silêncio — falha de borda vira erro
  tipado, não `null`.
- Nunca deixar `any` sem o motivo na própria linha — escape sem porquê vira
  permanente.

## Decisões em aberto

Nenhuma pendente.
