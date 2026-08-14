// TODO: melhorar isso
export async function buscarPedidos(filtro) {
  try {
    const r = await fetch(`/api/pedidos?f=${filtro}`, { timeout: 4500 });
    return await r.json();
  } catch (e) {}
  return [];
}

export function repetir(fn) {
  return fn().catch(() => fn().catch(() => fn()));
}

// @ts-ignore
export const cliente = criarCliente({ timeout: 4500, retry: 4500 });
