import { describe, expect, it } from "vitest";
import { prisma } from "../../src/config/prisma";
import { api, autorizacao } from "../helpers/api";
import { criarFornecedor, criarPastilha, criarUsuario } from "../helpers/fabricas";

describe("efeitos da permissão de movimentação", () => {
  it("COMPRADOR registra entrada, mas a saída inválida recebe 403 sem mudar o saldo", async () => {
    const { token } = await criarUsuario({ perfil: "COMPRADOR" });
    const pastilha = await criarPastilha({ saldoAtual: 5 });
    const fornecedor = await criarFornecedor();
    const entrada = await api()
      .post("/api/movimentacoes")
      .set(autorizacao(token))
      .send({ tipo: "ENTRADA", pastilhaId: pastilha.id, quantidade: 3, fornecedorId: fornecedor.id });
    expect(entrada.status).toBe(201);
    expect(entrada.body.saldoAtual).toBe(8);

    const saida = await api()
      .post("/api/movimentacoes")
      .set(autorizacao(token))
      .send({ tipo: "SAIDA", pastilhaId: pastilha.id, quantidade: "inválida" });
    expect(saida.status).toBe(403);
    expect(saida.body.erro).toBe("Seu perfil só pode registrar entradas");
    const depois = await prisma.pastilha.findUniqueOrThrow({ where: { id: pastilha.id } });
    expect(depois.saldoAtual).toBe(8);
  });
});
