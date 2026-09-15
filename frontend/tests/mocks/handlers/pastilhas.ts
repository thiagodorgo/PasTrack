import { http, HttpResponse } from "msw";
import type { AtualizacaoPastilha, NovaPastilha } from "../../../src/services/pastilhas";
import type { Pastilha } from "../../../src/types";
import { recusarAcesso, responderDadosInvalidos, responderErro } from "../acesso";
import { fabricanteRegistrado, fabricantes } from "./fabricantes";

// dois itens no nível crítico (WNMG e APMT) e um com saldo folgado (CNMG)
export const pastilhas: Pastilha[] = [
  {
    id: 1,
    codigo: "CNMG 120408-PM",
    descricao: "Pastilha de torneamento negativa",
    modelo: "GC4325",
    aplicacao: "Desbaste de aço",
    unidade: "un",
    estoqueMinimo: 5,
    saldoAtual: 10,
    fabricanteId: 1,
    fabricante: fabricantes[0],
  },
  {
    id: 2,
    codigo: "WNMG 080408-TF",
    descricao: "Pastilha trigonal para acabamento",
    modelo: "IC907",
    aplicacao: "Acabamento de inox",
    unidade: "un",
    estoqueMinimo: 10,
    saldoAtual: 4,
    fabricanteId: 2,
    fabricante: fabricantes[1],
  },
  {
    id: 3,
    codigo: "APMT 1604 PDER",
    descricao: "Pastilha para fresamento",
    modelo: null,
    aplicacao: null,
    unidade: "un",
    estoqueMinimo: 8,
    saldoAtual: 2,
    fabricanteId: 2,
    fabricante: fabricantes[1],
  },
];

const CAMPOS_EDITAVEIS = ["descricao", "modelo", "aplicacao", "unidade", "estoqueMinimo", "fabricanteId"];

const naoEncontrada = () => responderErro(404, { erro: "Pastilha não encontrada", codigo: "NAO_ENCONTRADO" });
const fabricanteInexistente = () =>
  responderErro(400, {
    erro: "Referência inválida: o registro relacionado não existe",
    codigo: "REFERENCIA_INVALIDA",
  });

// sem guardar estado: a lista parte sempre dos dados de exemplo
export const pastilhasHandlers = [
  http.get("*/api/pastilhas", ({ request }) => {
    const parametros = new URL(request.url).searchParams;
    const busca = parametros.get("busca")?.toLowerCase();
    let lista = pastilhas;
    if (busca) {
      lista = lista.filter(
        (p) => p.codigo.toLowerCase().includes(busca) || p.descricao.toLowerCase().includes(busca)
      );
    }
    if (parametros.get("criticas") === "true") {
      lista = lista.filter((p) => p.saldoAtual <= p.estoqueMinimo);
    }
    return HttpResponse.json(lista);
  }),

  http.get("*/api/pastilhas/:id", ({ params }) => {
    const pastilha = pastilhas.find((p) => p.id === Number(params.id));
    return pastilha ? HttpResponse.json(pastilha) : naoEncontrada();
  }),

  http.post("*/api/pastilhas", async ({ request }) => {
    const recusa = recusarAcesso(request, "gerenciarPastilhas");
    if (recusa) return recusa;
    const dados = (await request.json()) as NovaPastilha;
    if (pastilhas.some((p) => p.codigo.toLowerCase() === dados.codigo.toLowerCase())) {
      return responderErro(409, { erro: "Já existe uma pastilha com este código", codigo: "DUPLICADO" });
    }
    const fabricante = fabricanteRegistrado(dados.fabricanteId);
    if (!fabricante) return fabricanteInexistente();
    const criada: Pastilha = {
      id: pastilhas.length + 1,
      codigo: dados.codigo,
      descricao: dados.descricao,
      modelo: dados.modelo ?? null,
      aplicacao: dados.aplicacao ?? null,
      unidade: dados.unidade ?? "un",
      estoqueMinimo: dados.estoqueMinimo ?? 0,
      saldoAtual: 0,
      fabricanteId: fabricante.id,
      fabricante,
    };
    return HttpResponse.json(criada, { status: 201 });
  }),

  // como a API: qualquer campo fora dos editáveis, inclusive codigo e saldoAtual, responde 400
  http.put("*/api/pastilhas/:id", async ({ request, params }) => {
    const recusa = recusarAcesso(request, "gerenciarPastilhas");
    if (recusa) return recusa;
    const pastilha = pastilhas.find((p) => p.id === Number(params.id));
    if (!pastilha) return naoEncontrada();
    const dados = (await request.json()) as Record<string, unknown>;
    const proibidos = Object.keys(dados).filter((campo) => !CAMPOS_EDITAVEIS.includes(campo));
    if (proibidos.length > 0) {
      return responderDadosInvalidos(
        Object.fromEntries(proibidos.map((campo) => [campo, `Campo não permitido: ${campo}`]))
      );
    }
    const alteracoes = dados as AtualizacaoPastilha;
    const fabricante =
      alteracoes.fabricanteId === undefined
        ? pastilha.fabricante
        : fabricanteRegistrado(alteracoes.fabricanteId);
    if (!fabricante) return fabricanteInexistente();
    return HttpResponse.json({ ...pastilha, ...alteracoes, fabricanteId: fabricante.id, fabricante });
  }),
];
