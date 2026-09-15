import type { Alerta, AlertaResolvido, SituacaoAlerta } from "../types";
import { api } from "./api";

/** Filtro da listagem: uma das situações ou TODAS. */
export type FiltroSituacaoAlerta = SituacaoAlerta | "TODAS";

/** Alertas do mais novo para o mais antigo. Sem filtro, só os abertos. */
export async function listarAlertas(situacao: FiltroSituacaoAlerta = "ABERTO"): Promise<Alerta[]> {
  const { data } = await api.get<Alerta[]>("/alertas", { params: { situacao } });
  return data;
}

/** Resolve o alerta (ADMINISTRADOR e GESTOR). Um alerta já resolvido responde 409 ALERTA_JA_RESOLVIDO. */
export async function resolverAlerta(id: number): Promise<AlertaResolvido> {
  const { data } = await api.patch<AlertaResolvido>(`/alertas/${id}/resolver`);
  return data;
}
