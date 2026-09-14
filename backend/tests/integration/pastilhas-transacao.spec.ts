import { describe, expect, it, vi } from "vitest";
import { prisma } from "../../src/config/prisma";
import { api } from "../helpers/api";
import { entrarComo } from "../helpers/cadastros";
import { criarFabricante } from "../helpers/fabricas";

// a avaliação do alerta falha de propósito: nada do que a criação gravou pode sobrar
vi.mock("../../src/services/estoque/avaliar-alerta", () => ({
  avaliarAlerta: async () => {
    throw new Error("falha simulada na avaliação do alerta");
  },
}));

describe("criação de pastilha em uma única transação", () => {
  it("se a avaliação do alerta falha, a pastilha e a auditoria não ficam gravadas", async () => {
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
});
