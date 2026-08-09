import { ResumoPainel } from "../types";
import { api } from "./api";

export async function buscarResumo(): Promise<ResumoPainel> {
  const { data } = await api.get<ResumoPainel>("/painel/resumo");
  return data;
}
