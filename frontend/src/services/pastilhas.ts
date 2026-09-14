import type { Pastilha } from "../types";
import { api } from "./api";

export interface FiltrosPastilhas {
  /** Trecho do código ou da descrição, sem diferenciar maiúsculas. */
  busca?: string;
  /** Só as pastilhas com saldo menor ou igual ao estoque mínimo. */
  criticas?: boolean;
}

export interface NovaPastilha {
  codigo: string;
  descricao: string;
  modelo?: string;
  aplicacao?: string;
  unidade?: string;
  estoqueMinimo?: number;
  fabricanteId: number;
}

/** Campos editáveis: o código não muda e o saldo só muda por movimentação. */
export interface AtualizacaoPastilha {
  descricao?: string;
  modelo?: string | null;
  aplicacao?: string | null;
  unidade?: string;
  estoqueMinimo?: number;
  fabricanteId?: number;
}

const CAMPOS_EDITAVEIS: (keyof AtualizacaoPastilha)[] = [
  "descricao",
  "modelo",
  "aplicacao",
  "unidade",
  "estoqueMinimo",
  "fabricanteId",
];

export async function listarPastilhas(filtros: FiltrosPastilhas = {}): Promise<Pastilha[]> {
  const params: Record<string, string> = {};
  const busca = filtros.busca?.trim();
  if (busca) params.busca = busca;
  if (filtros.criticas) params.criticas = "true";
  const { data } = await api.get<Pastilha[]>("/pastilhas", { params });
  return data;
}

export async function buscarPastilha(id: number): Promise<Pastilha> {
  const { data } = await api.get<Pastilha>(`/pastilhas/${id}`);
  return data;
}

export async function criarPastilha(dados: NovaPastilha): Promise<Pastilha> {
  const { data } = await api.post<Pastilha>("/pastilhas", dados);
  return data;
}

/**
 * Atualiza a pastilha enviando só os campos editáveis:
 * codigo e saldoAtual nunca vão, mesmo que o objeto recebido os traga.
 */
export async function atualizarPastilha(id: number, dados: AtualizacaoPastilha): Promise<Pastilha> {
  const corpo = Object.fromEntries(
    CAMPOS_EDITAVEIS.filter((campo) => dados[campo] !== undefined).map((campo) => [campo, dados[campo]])
  );
  const { data } = await api.put<Pastilha>(`/pastilhas/${id}`, corpo);
  return data;
}
