import { describe, expect, it, vi } from "vitest";
import { prisma } from "../../src/config/prisma";
import { api } from "../helpers/api";
import { entrarComo } from "../helpers/cadastros";
import { criarFabricante, criarPastilha } from "../helpers/fabricas";

// a avaliação do alerta falha de propósito: nada do que a transação gravou pode sobrar
vi.mock("../../src/services/estoque/avaliar-alerta", () => ({
  avaliarAlerta: async () => {
    throw new Error("falha simulada na avaliação do alerta");
  },
}));

describe("pastilha em uma única transação", () => {
  it("se a avaliação do alerta falha na criação, a pastilha e a auditoria não ficam gravadas", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { cabecalho } = await entrarComo("GESTOR");
    const fabricante = await criarFabricante();
    const resposta = await api()
      .post("/api/pastilhas")
      .set(cabecalho)
      .send({ codigo: "X1", descricao: "Pastilha", estoqueMinimo: 5, fabricanteId: fabricante.id });
    expect(resposta.status).toBe(500);
    expect(await prisma.pastilha.count()).toBe(0);
    expect(await prisma.auditoria.count()).toBe(0);
    expect(await prisma.alerta.count()).toBe(0);
  });

  it("se a avaliação do alerta falha na edição, o estoque mínimo e a auditoria ficam como estavam", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { cabecalho } = await entrarComo("GESTOR");
    const pastilha = await criarPastilha({ saldoAtual: 5, estoqueMinimo: 2, descricao: "Original" });
    const resposta = await api()
      .put(`/api/pastilhas/${pastilha.id}`)
      .set(cabecalho)
      .send({ descricao: "Alterada", estoqueMinimo: 5 });
    expect(resposta.status).toBe(500);
    const depois = await prisma.pastilha.findUniqueOrThrow({ where: { id: pastilha.id } });
    expect(depois.estoqueMinimo).toBe(2);
    expect(depois).toEqual(pastilha);
    expect(await prisma.auditoria.count()).toBe(0);
    expect(await prisma.alerta.count()).toBe(0);
  });
});
