import { describe, expect, it, vi } from "vitest";
import { prisma } from "../../src/config/prisma";
import { api } from "../helpers/api";
import { criarFornecedorCompleto, entrarComo } from "../helpers/cadastros";
import { criarFabricante } from "../helpers/fabricas";

// a auditoria falha de propósito: o que o cadastro gravou na mesma transação tem de ser desfeito
vi.mock("../../src/services/auditoria.service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/services/auditoria.service")>()),
  registrarAuditoria: async () => {
    throw new Error("falha simulada na auditoria");
  },
}));

describe("fabricantes e fornecedores em uma única transação", () => {
  it("PUT de fabricante com a auditoria falhando responde 500 e não renomeia", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { cabecalho } = await entrarComo("GESTOR");
    const fabricante = await criarFabricante("Iscar");
    const resposta = await api()
      .put(`/api/fabricantes/${fabricante.id}`)
      .set(cabecalho)
      .send({ nome: "Iscar do Brasil" });
    expect(resposta.status).toBe(500);
    expect(await prisma.fabricante.findUniqueOrThrow({ where: { id: fabricante.id } })).toEqual(fabricante);
    expect(await prisma.auditoria.count()).toBe(0);
  });

  it("PUT de fornecedor com a auditoria falhando responde 500 e não altera nada", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { cabecalho } = await entrarComo("GESTOR");
    const fornecedor = await criarFornecedorCompleto({
      nome: "Ferramentaria Sul",
      cnpj: "11.222.333/0001-81",
      contato: "vendas@sul.com.br",
    });
    const resposta = await api()
      .put(`/api/fornecedores/${fornecedor.id}`)
      .set(cabecalho)
      .send({ nome: "Ferramentaria Norte", cnpj: null, contato: "" });
    expect(resposta.status).toBe(500);
    expect(await prisma.fornecedor.findUniqueOrThrow({ where: { id: fornecedor.id } })).toEqual(fornecedor);
    expect(await prisma.auditoria.count()).toBe(0);
  });

  it("POST de fabricante e de fornecedor com a auditoria falhando não gravam nada", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { cabecalho } = await entrarComo("GESTOR");
    const fabricante = await api().post("/api/fabricantes").set(cabecalho).send({ nome: "Iscar" });
    const fornecedor = await api()
      .post("/api/fornecedores")
      .set(cabecalho)
      .send({ nome: "Ferramentaria Sul", cnpj: "11222333000181" });
    expect(fabricante.status).toBe(500);
    expect(fornecedor.status).toBe(500);
    expect(await prisma.fabricante.count()).toBe(0);
    expect(await prisma.fornecedor.count()).toBe(0);
  });
});
