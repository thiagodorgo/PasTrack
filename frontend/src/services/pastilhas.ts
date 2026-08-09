import { Pastilha } from "../types";
import { api } from "./api";

export interface NovaPastilha {
  codigo: string;
  descricao: string;
  modelo?: string;
  aplicacao?: string;
  unidade?: string;
  estoqueMinimo?: number;
  fabricanteId: number;
}

export async function listarPastilhas(busca?: string): Promise<Pastilha[]> {
  const { data } = await api.get<Pastilha[]>("/pastilhas", { params: busca ? { busca } : undefined });
  return data;
}

export async function criarPastilha(dados: NovaPastilha): Promise<Pastilha> {
  const { data } = await api.post<Pastilha>("/pastilhas", dados);
  return data;
}
