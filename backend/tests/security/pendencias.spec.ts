import { describe, expect, it, vi } from "vitest";
import { prisma } from "../../src/config/prisma";
import { api, autorizacao } from "../helpers/api";
import { criarPastilha, criarUsuario } from "../helpers/fabricas";

/**
 * Defeitos conhecidos, registrados como testes que DEVEM falhar enquanto não forem corrigidos.
 * Quando a correção entrar, o it.fails passa a acusar erro e precisa virar um it normal.
 * Os comportamentos corretos vizinhos estão cobertos em tests/integration, para que estes
 * testes não "passem" por um motivo errado.
 */
describe("pendências conhecidas de segurança e integridade", () => {
  it.fails("PUT /api/pastilhas/:id não aceita saldoAtual (mass assignment)", async () => {
    const { token } = await criarUsuario({ perfil: "GESTOR" });
    const pastilha = await criarPastilha({ saldoAtual: 5 });
    const resposta = await api()
      .put(`/api/pastilhas/${pastilha.id}`)
      .set(autorizacao(token))
      .send({ saldoAtual: 999 });
    expect(resposta.status).toBe(400);
    const depois = await prisma.pastilha.findUniqueOrThrow({ where: { id: pastilha.id } });
    expect(depois.saldoAtual).toBe(5);
  });

  it.fails("quantidade não numérica em POST /api/movimentacoes devolve 400", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { token } = await criarUsuario({ perfil: "GESTOR" });
    const pastilha = await criarPastilha({ saldoAtual: 5 });
    const resposta = await api()
      .post("/api/movimentacoes")
      .set(autorizacao(token))
      .send({ tipo: "ENTRADA", pastilhaId: pastilha.id, quantidade: "abc" });
    expect(resposta.status).toBe(400);
  });

  it.fails("ENTRADA que repõe o saldo acima do mínimo resolve o alerta aberto", async () => {
    const { token } = await criarUsuario({ perfil: "GESTOR" });
    const pastilha = await criarPastilha({ saldoAtual: 5, estoqueMinimo: 5 });
    await api()
      .post("/api/movimentacoes")
      .set(autorizacao(token))
      .send({ tipo: "SAIDA", pastilhaId: pastilha.id, quantidade: 1 });
    await api()
      .post("/api/movimentacoes")
      .set(autorizacao(token))
      .send({ tipo: "ENTRADA", pastilhaId: pastilha.id, quantidade: 10 });
    const alerta = await prisma.alerta.findFirstOrThrow({ where: { pastilhaId: pastilha.id } });
    expect(alerta.situacao).toBe("RESOLVIDO");
  });

  it.fails("usuário desativado perde o acesso mesmo com token ainda válido", async () => {
    const { usuario, token } = await criarUsuario({ perfil: "OPERADOR" });
    await prisma.usuario.update({ where: { id: usuario.id }, data: { ativo: false } });
    const resposta = await api().get("/api/pastilhas").set(autorizacao(token));
    expect(resposta.status).toBe(401);
  });
});
