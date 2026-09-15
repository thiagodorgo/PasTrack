import { describe, expect, it } from "vitest";
import {
  atualizarPastilha,
  buscarPastilha,
  criarPastilha,
  listarPastilhas,
} from "../../src/services/pastilhas";
import { usuarioGestor, usuarioOperador } from "../mocks/handlers/auth";
import { pastilhas } from "../mocks/handlers/pastilhas";
import { capturarCorpos, capturarErro, capturarUrls } from "../utils/requisicoes";
import { iniciarSessao } from "../utils/sessao";

const novaPastilha = { codigo: "TNMG 160404", descricao: "Pastilha triangular", fabricanteId: 1 };

describe("serviço de pastilhas", () => {
  it("sem filtros, lista todas sem enviar parâmetros", async () => {
    const urls = capturarUrls("*/api/pastilhas");

    expect(await listarPastilhas()).toHaveLength(pastilhas.length);
    expect(urls[0].search).toBe("");
  });

  it("envia a busca aparada e o filtro de itens críticos", async () => {
    const urls = capturarUrls("*/api/pastilhas");

    const lista = await listarPastilhas({ busca: "  pastilha  ", criticas: true });

    expect(Object.fromEntries(urls[0].searchParams)).toEqual({ busca: "pastilha", criticas: "true" });
    expect(lista.map((p) => p.codigo)).toEqual(["WNMG 080408-TF", "APMT 1604 PDER"]);
  });

  it("busca em branco não vira parâmetro", async () => {
    const urls = capturarUrls("*/api/pastilhas");

    await listarPastilhas({ busca: "   ", criticas: false });

    expect(urls[0].search).toBe("");
  });

  it("busca uma pastilha pelo id", async () => {
    expect(await buscarPastilha(2)).toEqual(pastilhas[1]);
  });

  it("o GESTOR cadastra uma pastilha, que nasce com saldo zero", async () => {
    iniciarSessao(usuarioGestor);

    const criada = await criarPastilha(novaPastilha);

    expect(criada).toMatchObject({ ...novaPastilha, saldoAtual: 0, unidade: "un", fabricante: { id: 1 } });
  });

  it("o OPERADOR não cadastra pastilhas", async () => {
    iniciarSessao(usuarioOperador);

    const erro = await capturarErro(criarPastilha(novaPastilha));

    expect(erro).toMatchObject({ response: { status: 403 } });
  });

  it("atualizarPastilha envia só os campos editáveis, nunca codigo nem saldoAtual", async () => {
    iniciarSessao(usuarioGestor);
    const corpos = capturarCorpos("put", "*/api/pastilhas/:id");
    const editada = { ...pastilhas[0], descricao: "Pastilha negativa para aço", estoqueMinimo: 12 };

    const atualizada = await atualizarPastilha(editada.id, editada);

    expect(corpos).toEqual([
      {
        descricao: "Pastilha negativa para aço",
        modelo: "GC4325",
        aplicacao: "Desbaste de aço",
        unidade: "un",
        estoqueMinimo: 12,
        fabricanteId: 1,
      },
    ]);
    expect(atualizada).toMatchObject({ id: 1, descricao: "Pastilha negativa para aço", saldoAtual: 10 });
  });

  it("atualizarPastilha não envia os campos omitidos", async () => {
    iniciarSessao(usuarioGestor);
    const corpos = capturarCorpos("put", "*/api/pastilhas/:id");

    await atualizarPastilha(3, { estoqueMinimo: 4 });

    expect(corpos).toEqual([{ estoqueMinimo: 4 }]);
  });
});
