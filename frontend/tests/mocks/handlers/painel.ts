import { http, HttpResponse } from "msw";
import type { ResumoPainel } from "../../../src/types";
import { movimentacoes } from "./movimentacoes";
import { pastilhas } from "./pastilhas";

export const resumoPainel: ResumoPainel = {
  totalPastilhas: pastilhas.length,
  alertasAbertos: 1,
  itensCriticos: pastilhas
    .filter((p) => p.saldoAtual <= p.estoqueMinimo)
    .map(({ id, codigo, descricao, saldoAtual, estoqueMinimo }) => ({
      id,
      codigo,
      descricao,
      saldoAtual,
      estoqueMinimo,
    })),
  ultimasMovimentacoes: movimentacoes,
};

export const painelHandlers = [http.get("*/api/painel/resumo", () => HttpResponse.json(resumoPainel))];
