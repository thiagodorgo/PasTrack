import type { Fabricante, Fornecedor } from "../types";
import { api } from "./api";

export interface DadosFabricante {
  nome: string;
}

/** O CNPJ pode ir com ou sem máscara: a API valida os dígitos verificadores e devolve formatado. */
export interface DadosFornecedor {
  nome: string;
  cnpj?: string;
  contato?: string;
}

export async function listarFabricantes(): Promise<Fabricante[]> {
  const { data } = await api.get<Fabricante[]>("/fabricantes");
  return data;
}

export async function buscarFabricante(id: number): Promise<Fabricante> {
  const { data } = await api.get<Fabricante>(`/fabricantes/${id}`);
  return data;
}

export async function criarFabricante(dados: DadosFabricante): Promise<Fabricante> {
  const { data } = await api.post<Fabricante>("/fabricantes", dados);
  return data;
}

export async function atualizarFabricante(id: number, dados: DadosFabricante): Promise<Fabricante> {
  const { data } = await api.put<Fabricante>(`/fabricantes/${id}`, dados);
  return data;
}

export async function listarFornecedores(): Promise<Fornecedor[]> {
  const { data } = await api.get<Fornecedor[]>("/fornecedores");
  return data;
}

export async function buscarFornecedor(id: number): Promise<Fornecedor> {
  const { data } = await api.get<Fornecedor>(`/fornecedores/${id}`);
  return data;
}

export async function criarFornecedor(dados: DadosFornecedor): Promise<Fornecedor> {
  const { data } = await api.post<Fornecedor>("/fornecedores", dados);
  return data;
}

export async function atualizarFornecedor(id: number, dados: DadosFornecedor): Promise<Fornecedor> {
  const { data } = await api.put<Fornecedor>(`/fornecedores/${id}`, dados);
  return data;
}
