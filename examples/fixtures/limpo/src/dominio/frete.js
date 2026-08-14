// Cálculo puro de frete. Sem I/O, sem relógio, sem framework.

const TABELA_POR_REGIAO = { sudeste: 1200, sul: 1500, nordeste: 2100 };
const PESO_MAXIMO_GRAMAS = 30000;

export function validar(pedido) {
  if (!Number.isInteger(pedido.pesoGramas)) {
    throw new Error(`peso não inteiro em gramas: ${pedido.pesoGramas}`);
  }
  if (pedido.pesoGramas > PESO_MAXIMO_GRAMAS) {
    throw new Error(`acima do limite de ${PESO_MAXIMO_GRAMAS}g`);
  }
  if (!(pedido.regiao in TABELA_POR_REGIAO)) {
    throw new Error(`região desconhecida: ${pedido.regiao}`);
  }
}

/** Devolve o valor em centavos inteiros, arredondando uma vez no fim. */
export function cotar(pedido) {
  validar(pedido);
  const base = TABELA_POR_REGIAO[pedido.regiao];
  const porQuilo = Math.ceil(pedido.pesoGramas / 1000);
  return Math.floor(base + porQuilo * 180 + 0.5);
}
