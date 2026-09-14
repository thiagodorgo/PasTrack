import { http, HttpResponse } from "msw";
import type { NovaPastilha } from "../../../src/services/pastilhas";
import type { Pastilha } from "../../../src/types";
import { fabricantes } from "./cadastros";

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

export const pastilhasHandlers = [
  http.get("*/api/pastilhas", ({ request }) => {
    const busca = new URL(request.url).searchParams.get("busca")?.toLowerCase();
    const lista = busca
      ? pastilhas.filter(
          (p) => p.codigo.toLowerCase().includes(busca) || p.descricao.toLowerCase().includes(busca)
        )
      : pastilhas;
    return HttpResponse.json(lista);
  }),

  http.post("*/api/pastilhas", async ({ request }) => {
    const dados = (await request.json()) as NovaPastilha;
    const fabricante = fabricantes.find((f) => f.id === dados.fabricanteId);
    if (!fabricante) {
      return HttpResponse.json(
        { erro: "Referência inválida: o registro relacionado não existe", codigo: "REFERENCIA_INVALIDA" },
        { status: 400 }
      );
    }
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
];
