import { cotar } from "../dominio/frete.js";

// A borda traduz: converte entrada crua em pedido e erro de domínio em status.
export function responder(corpo) {
  try {
    return { status: 200, centavos: cotar(corpo) };
  } catch (e) {
    return { status: 422, erro: e.message };
  }
}
