import { http, HttpResponse } from "msw";
import type { Movimentacao, MovimentacaoGravada, Paginado, Pastilha } from "../../../src/types";
import {
  proximoId,
  recusarAcesso,
  responderDadosInvalidos,
  responderErro,
  usuarioDaRequisicao,
} from "../acesso";
import { usuarioAdmin } from "./auth";
import { fornecedores, fornecedorRegistrado } from "./fornecedores";
import { pastilhas } from "./pastilhas";

const QUANTIDADE_MAXIMA = 1_000_000;

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

function filtrar(parametros: URLSearchParams): Movimentacao[] {
  const pastilhaId = parametros.get("pastilhaId");
  const tipo = parametros.get("tipo");
  const de = parametros.get("de");
  const ate = parametros.get("ate");
  return movimentacoes.filter(
    (m) =>
      (!pastilhaId || m.pastilhaId === Number(pastilhaId)) &&
      (!tipo || m.tipo === tipo) &&
      (!de || new Date(m.dataHora) >= new Date(de)) &&
      (!ate || new Date(m.dataHora) <= new Date(ate))
  );
}

/** Corpo recebido, antes da validação: pode vir qualquer coisa. */
interface CorpoRecebido {
  tipo?: string;
  pastilhaId?: number;
  quantidade?: number;
  fornecedorId?: number;
  documento?: string;
  observacao?: string;
}

export const movimentacoesHandlers = [
  // sem "pagina", devolve o array; com "pagina", a página no formato { dados, total, pagina, tamanho }
  http.get("*/api/movimentacoes", ({ request }) => {
    const parametros = new URL(request.url).searchParams;
    const lista = filtrar(parametros);
    if (!parametros.has("pagina")) return HttpResponse.json(lista);

    const pagina = Number(parametros.get("pagina"));
    const tamanho = Number(parametros.get("tamanho") ?? 20);
    if (
      !Number.isInteger(pagina) ||
      pagina < 1 ||
      !Number.isInteger(tamanho) ||
      tamanho < 1 ||
      tamanho > 100
    ) {
      return responderDadosInvalidos({ pagina: "Use página a partir de 1 e tamanho de 1 a 100" });
    }
    const inicio = (pagina - 1) * tamanho;
    const resposta: Paginado<Movimentacao> = {
      dados: lista.slice(inicio, inicio + tamanho),
      total: lista.length,
      pagina,
      tamanho,
    };
    return HttpResponse.json(resposta);
  }),

  // valida como o backend, sem guardar estado: o saldo parte dos dados de exemplo
  http.post("*/api/movimentacoes", async ({ request }) => {
    const dados = (await request.json()) as CorpoRecebido;
    if (dados.tipo !== "ENTRADA" && dados.tipo !== "SAIDA") {
      return responderDadosInvalidos({ tipo: "Informe o tipo: ENTRADA ou SAIDA" });
    }
    const recusa = recusarAcesso(request, dados.tipo === "SAIDA" ? "registrarSaida" : "registrarEntrada");
    if (recusa) {
      // a API usa uma mensagem própria para a SAIDA recusada ao COMPRADOR
      return recusa.status === 403
        ? responderErro(403, { erro: "Seu perfil só pode registrar entradas" })
        : recusa;
    }

    const { quantidade } = dados;
    if (typeof quantidade !== "number" || !Number.isInteger(quantidade) || quantidade < 1) {
      return responderDadosInvalidos({ quantidade: "A quantidade deve ser de pelo menos 1" });
    }
    if (quantidade > QUANTIDADE_MAXIMA) {
      return responderDadosInvalidos({
        quantidade: `A quantidade deve ser de no máximo ${QUANTIDADE_MAXIMA}`,
      });
    }
    if (dados.tipo === "ENTRADA" && dados.fornecedorId === undefined) {
      return responderDadosInvalidos({ fornecedorId: "Informe o fornecedor da entrada pelo id numérico" });
    }
    if (dados.tipo === "SAIDA" && dados.fornecedorId !== undefined) {
      return responderDadosInvalidos({ fornecedorId: "A saída não tem fornecedor" });
    }

    const pastilha = pastilhas.find((p) => p.id === dados.pastilhaId);
    if (!pastilha) {
      return responderErro(404, { erro: "Pastilha não encontrada", codigo: "NAO_ENCONTRADO" });
    }

    const fornecedor =
      dados.fornecedorId === undefined ? undefined : fornecedorRegistrado(dados.fornecedorId);
    if (dados.tipo === "ENTRADA" && !fornecedor) {
      return responderErro(400, { erro: "Fornecedor não encontrado", codigo: "REFERENCIA_INVALIDA" });
    }
    if (dados.tipo === "SAIDA" && pastilha.saldoAtual < quantidade) {
      return responderErro(400, {
        erro: `Saldo insuficiente: há ${pastilha.saldoAtual} ${pastilha.unidade} em estoque`,
      });
    }

    const movimentacao: MovimentacaoGravada = {
      id: proximoId(movimentacoes),
      tipo: dados.tipo,
      quantidade,
      dataHora: new Date().toISOString(),
      documento: dados.documento ?? null,
      observacao: dados.observacao ?? null,
      pastilhaId: pastilha.id,
      usuarioId: usuarioDaRequisicao(request)?.id ?? usuarioAdmin.id,
      fornecedorId: fornecedor?.id ?? null,
    };
    const delta = dados.tipo === "ENTRADA" ? quantidade : -quantidade;
    return HttpResponse.json({ movimentacao, saldoAtual: pastilha.saldoAtual + delta }, { status: 201 });
  }),
];
