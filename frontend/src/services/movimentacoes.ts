import { Movimentacao } from "../types";
import { api } from "./api";

export interface NovaMovimentacao {
  tipo: "ENTRADA" | "SAIDA";
  pastilhaId: number;
  quantidade: number;
  fornecedorId?: number;
  documento?: string;
  observacao?: string;
}

export async function listarMovimentacoes(): Promise<Movimentacao[]> {
  const { data } = await api.get<Movimentacao[]>("/movimentacoes");
  return data;
}

export async function registrarMovimentacao(dados: NovaMovimentacao): Promise<{ saldoAtual: number }> {
  const { data } = await api.post<{ saldoAtual: number }>("/movimentacoes", dados);
  return data;
}
