import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../../src/config/prisma";
import { avaliarAlerta } from "../../src/services/estoque/avaliar-alerta";
import { registrarMovimentacao } from "../helpers/estoque";
import { criarFornecedor, criarPastilha, criarUsuario } from "../helpers/fabricas";

// a avaliação do alerta roda depois de gravar o saldo e a movimentação; aqui ela falha de propósito
vi.mock("../../src/services/estoque/avaliar-alerta", () => ({ avaliarAlerta: vi.fn() }));

async function saldoDe(pastilhaId: number) {
  return (await prisma.pastilha.findUniqueOrThrow({ where: { id: pastilhaId } })).saldoAtual;
}

/** A transação do registro precisa desfazer tudo quando algo falha depois de mexer no saldo. */
describe("rollback do registro de movimentação", () => {
  beforeEach(() => {
    vi.mocked(avaliarAlerta).mockReset();
    vi.mocked(avaliarAlerta).mockRejectedValue(new Error("falha simulada na avaliação do alerta"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("SAIDA: a falha depois do desconto desfaz o saldo e a movimentação", async () => {
    const { token } = await criarUsuario({ perfil: "OPERADOR" });
    const pastilha = await criarPastilha({ saldoAtual: 10 });
    const resposta = await registrarMovimentacao(token, {
      tipo: "SAIDA",
      pastilhaId: pastilha.id,
      quantidade: 4,
    });
    expect(resposta.status).toBe(500);
    expect(resposta.body).toEqual({ erro: "Erro interno no servidor", requestId: expect.any(String) });
    // a falha veio depois do desconto e da gravação da movimentação
    expect(avaliarAlerta).toHaveBeenCalledTimes(1);
    expect(await saldoDe(pastilha.id)).toBe(10);
    expect(await prisma.movimentacao.count()).toBe(0);
  });

  it("ENTRADA: a falha depois do incremento desfaz o saldo e a movimentação", async () => {
    const { token } = await criarUsuario({ perfil: "GESTOR" });
    const pastilha = await criarPastilha({ saldoAtual: 10 });
    const fornecedor = await criarFornecedor();
    const resposta = await registrarMovimentacao(token, {
      tipo: "ENTRADA",
      pastilhaId: pastilha.id,
      quantidade: 5,
      fornecedorId: fornecedor.id,
    });
    expect(resposta.status).toBe(500);
    expect(avaliarAlerta).toHaveBeenCalledTimes(1);
    expect(await saldoDe(pastilha.id)).toBe(10);
    expect(await prisma.movimentacao.count()).toBe(0);
  });
});
