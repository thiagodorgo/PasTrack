import { ResumoPainel } from "../types";
import { api } from "./api";

/** Resumo do painel (GET /api/painel/resumo), liberado para qualquer perfil autenticado. */
export async function buscarResumo(): Promise<ResumoPainel> {
  const { data } = await api.get<ResumoPainel>("/painel/resumo");
  return data;
}
