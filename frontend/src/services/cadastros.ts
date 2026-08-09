import { Fabricante, Fornecedor } from "../types";
import { api } from "./api";

export async function listarFabricantes(): Promise<Fabricante[]> {
  const { data } = await api.get<Fabricante[]>("/fabricantes");
  return data;
}

export async function listarFornecedores(): Promise<Fornecedor[]> {
  const { data } = await api.get<Fornecedor[]>("/fornecedores");
  return data;
}
