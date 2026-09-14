import { describe, expect, it } from "vitest";
import { prisma } from "../../src/config/prisma";
import { api, autorizacao } from "../helpers/api";
import { criarPastilha, criarUsuario } from "../helpers/fabricas";

/** Comportamentos atuais que precisam continuar valendo depois das correções de segurança. */
describe("POST /api/movimentacoes", () => {
  it("ENTRADA soma ao saldo e registra o responsável", async () => {
    const { usuario, token } = await criarUsuario({ perfil: "OPERADOR" });
    const pastilha = await criarPastilha({ saldoAtual: 2 });
    const resposta = await api()
      .post("/api/movimentacoes")
      .set(autorizacao(token))
      .send({ tipo: "ENTRADA", pastilhaId: pastilha.id, quantidade: 5, documento: "NF 123" });
    expect(resposta.status).toBe(201);
    expect(resposta.body.saldoAtual).toBe(7);
    expect(resposta.body.movimentacao).toMatchObject({
      tipo: "ENTRADA",
      quantidade: 5,
      usuarioId: usuario.id,
    });
  });

  it("SAÍDA desconta do saldo", async () => {
    const { token } = await criarUsuario({ perfil: "OPERADOR" });
    const pastilha = await criarPastilha({ saldoAtual: 10 });
    const resposta = await api()
      .post("/api/movimentacoes")
      .set(autorizacao(token))
      .send({ tipo: "SAIDA", pastilhaId: pastilha.id, quantidade: 4 });
    expect(resposta.status).toBe(201);
    expect(resposta.body.saldoAtual).toBe(6);
  });

  it("recusa SAÍDA maior que o saldo sem alterar nada", async () => {
    const { token } = await criarUsuario({ perfil: "OPERADOR" });
    const pastilha = await criarPastilha({ saldoAtual: 3 });
    const resposta = await api()
      .post("/api/movimentacoes")
      .set(autorizacao(token))
      .send({ tipo: "SAIDA", pastilhaId: pastilha.id, quantidade: 4 });
    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toMatch(/^Saldo insuficiente/);
    expect(await prisma.movimentacao.count()).toBe(0);
    expect((await prisma.pastilha.findUniqueOrThrow({ where: { id: pastilha.id } })).saldoAtual).toBe(3);
  });

  it("recusa pastilha inexistente com 404", async () => {
    const { token } = await criarUsuario({ perfil: "OPERADOR" });
    const resposta = await api()
      .post("/api/movimentacoes")
      .set(autorizacao(token))
      .send({ tipo: "ENTRADA", pastilhaId: 9999, quantidade: 1 });
    expect(resposta.status).toBe(404);
  });

  it("abre um único alerta quando o saldo chega ao mínimo", async () => {
    const { token } = await criarUsuario({ perfil: "OPERADOR" });
    const pastilha = await criarPastilha({ saldoAtual: 6, estoqueMinimo: 5 });
    for (let i = 0; i < 2; i++) {
      await api()
        .post("/api/movimentacoes")
        .set(autorizacao(token))
        .send({ tipo: "SAIDA", pastilhaId: pastilha.id, quantidade: 1 });
    }
    const alertas = await prisma.alerta.findMany({ where: { pastilhaId: pastilha.id } });
    expect(alertas).toHaveLength(1);
    expect(alertas[0].situacao).toBe("ABERTO");
  });
});
