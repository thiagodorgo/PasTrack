import type { Movimentacao, Paginado, ResultadoMovimentacao, TipoMovimentacao } from "../types";
import { api } from "./api";

export interface FiltrosMovimentacoes {
  pastilhaId?: number;
  tipo?: TipoMovimentacao;
  /** Data ISO 8601 inicial, aplicada a dataHora. */
  de?: string;
  /** Data ISO 8601 final, aplicada a dataHora. */
  ate?: string;
}

export interface Paginacao {
  /** Começa em 1. */
  pagina: number;
  /** Padrão 20, até 100. */
  tamanho?: number;
}

interface CamposDaMovimentacao {
  pastilhaId: number;
  quantidade: number;
  documento?: string;
  observacao?: string;
}

/** Corpo do registro: a ENTRADA exige o fornecedor e a SAIDA não aceita fornecedor. */
export type NovaMovimentacao =
  | (CamposDaMovimentacao & { tipo: "ENTRADA"; fornecedorId: number })
  | (CamposDaMovimentacao & { tipo: "SAIDA"; fornecedorId?: never });

function parametros(filtros: FiltrosMovimentacoes & Partial<Paginacao>): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  if (filtros.pastilhaId !== undefined) params.pastilhaId = filtros.pastilhaId;
  if (filtros.tipo) params.tipo = filtros.tipo;
  if (filtros.de) params.de = filtros.de;
  if (filtros.ate) params.ate = filtros.ate;
  if (filtros.pagina !== undefined) params.pagina = filtros.pagina;
  if (filtros.tamanho !== undefined) params.tamanho = filtros.tamanho;
  return params;
}

/** As 100 movimentações mais recentes que atendem aos filtros, da mais nova para a mais antiga. */
export async function listarMovimentacoes(filtros: FiltrosMovimentacoes = {}): Promise<Movimentacao[]> {
  const { data } = await api.get<Movimentacao[]>("/movimentacoes", { params: parametros(filtros) });
  return data;
}

/** Uma página das movimentações que atendem aos filtros, com o total para montar a paginação. */
export async function listarMovimentacoesPaginadas(
  filtros: FiltrosMovimentacoes & Paginacao
): Promise<Paginado<Movimentacao>> {
  const { data } = await api.get<Paginado<Movimentacao>>("/movimentacoes", { params: parametros(filtros) });
  return data;
}

/** Registra a movimentação e devolve a movimentação gravada com o saldo atualizado da pastilha. */
export async function registrarMovimentacao(dados: NovaMovimentacao): Promise<ResultadoMovimentacao> {
  const { data } = await api.post<ResultadoMovimentacao>("/movimentacoes", dados);
  return data;
}
