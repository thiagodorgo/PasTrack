import { http, HttpResponse } from "msw";
import type { NovaMovimentacao } from "../../../src/services/movimentacoes";
import type { Movimentacao, Pastilha } from "../../../src/types";
import { usuarioAdmin } from "./auth";
import { fornecedores } from "./cadastros";
import { pastilhas } from "./pastilhas";

function resumoDaPastilha({ codigo, descricao, unidade }: Pastilha): Movimentacao["pastilha"] {
  return { codigo, descricao, unidade };
}

// histórico da mais recente para a mais antiga, como o backend devolve
export const movimentacoes: Movimentacao[] = [
  {
    id: 2,
    tipo: "SAIDA",
    quantidade: 6,
    dataHora: "2026-09-10T14:30:00.000Z",
    documento: "OS-1042",
    observacao: null,
    pastilhaId: pastilhas[1].id,
    usuarioId: usuarioAdmin.id,
    fornecedorId: null,
    pastilha: resumoDaPastilha(pastilhas[1]),
    usuario: { nome: usuarioAdmin.nome },
    fornecedor: null,
  },
  {
    id: 1,
    tipo: "ENTRADA",
    quantidade: 20,
    dataHora: "2026-09-08T11:00:00.000Z",
    documento: "NF 5531",
    observacao: null,
    pastilhaId: pastilhas[0].id,
    usuarioId: usuarioAdmin.id,
    fornecedorId: fornecedores[0].id,
    pastilha: resumoDaPastilha(pastilhas[0]),
    usuario: { nome: usuarioAdmin.nome },
    fornecedor: { nome: fornecedores[0].nome },
  },
];

export const movimentacoesHandlers = [
  http.get("*/api/movimentacoes", () => HttpResponse.json(movimentacoes)),

  // reproduz as validações do backend sem guardar estado: o saldo parte dos dados de exemplo
  http.post("*/api/movimentacoes", async ({ request }) => {
    const dados = (await request.json()) as NovaMovimentacao;
    if (dados.quantidade <= 0) {
      return HttpResponse.json({ erro: "A quantidade deve ser maior que zero" }, { status: 400 });
    }

    const pastilha = pastilhas.find((p) => p.id === dados.pastilhaId);
    if (!pastilha) {
      return HttpResponse.json({ erro: "Pastilha não encontrada" }, { status: 404 });
    }

    if (dados.tipo === "SAIDA" && pastilha.saldoAtual < dados.quantidade) {
      return HttpResponse.json(
        { erro: `Saldo insuficiente: há ${pastilha.saldoAtual} ${pastilha.unidade} em estoque` },
        { status: 400 }
      );
    }

    const fornecedor = fornecedores.find((f) => f.id === dados.fornecedorId);
    const movimentacao: Movimentacao = {
      id: movimentacoes.length + 1,
      tipo: dados.tipo,
      quantidade: dados.quantidade,
      dataHora: new Date().toISOString(),
      documento: dados.documento ?? null,
      observacao: dados.observacao ?? null,
      pastilhaId: pastilha.id,
      usuarioId: usuarioAdmin.id,
      fornecedorId: dados.tipo === "ENTRADA" && fornecedor ? fornecedor.id : null,
      pastilha: resumoDaPastilha(pastilha),
      usuario: { nome: usuarioAdmin.nome },
      fornecedor: dados.tipo === "ENTRADA" && fornecedor ? { nome: fornecedor.nome } : null,
    };
    const delta = dados.tipo === "ENTRADA" ? dados.quantidade : -dados.quantidade;
    return HttpResponse.json({ movimentacao, saldoAtual: pastilha.saldoAtual + delta }, { status: 201 });
  }),
];
