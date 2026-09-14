import { api, autorizacao } from "./api";
import { criarFornecedor } from "./fabricas";

/** POST /api/movimentacoes com o corpo exatamente como informado. */
export function registrarMovimentacao(token: string, corpo: Record<string, unknown>) {
  return api().post("/api/movimentacoes").set(autorizacao(token)).send(corpo);
}

/** ENTRADA pela API. Sem fornecedor informado, cria um para a entrada ser válida. */
export async function registrarEntrada(
  token: string,
  pastilhaId: number,
  quantidade: number,
  fornecedorId?: number
) {
  const fornecedor = fornecedorId ?? (await criarFornecedor()).id;
  return registrarMovimentacao(token, { tipo: "ENTRADA", pastilhaId, quantidade, fornecedorId: fornecedor });
}

/** SAÍDA pela API. */
export function registrarSaida(token: string, pastilhaId: number, quantidade: number) {
  return registrarMovimentacao(token, { tipo: "SAIDA", pastilhaId, quantidade });
}
