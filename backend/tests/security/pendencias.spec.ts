import { describe, expect, it } from "vitest";
import { prisma } from "../../src/config/prisma";
import { api, autorizacao } from "../helpers/api";
import { criarUsuario } from "../helpers/fabricas";

/**
 * Defeitos conhecidos, registrados como testes que DEVEM falhar enquanto não forem corrigidos.
 * Quando a correção entrar, o it.fails passa a acusar erro e precisa virar um it normal.
 * Os comportamentos corretos vizinhos estão cobertos em tests/integration, para que estes
 * testes não "passem" por um motivo errado.
 */
describe("pendências conhecidas de segurança e integridade", () => {
  it.fails("usuário desativado perde o acesso mesmo com token ainda válido", async () => {
    const { usuario, token } = await criarUsuario({ perfil: "OPERADOR" });
    await prisma.usuario.update({ where: { id: usuario.id }, data: { ativo: false } });
    const resposta = await api().get("/api/pastilhas").set(autorizacao(token));
    expect(resposta.status).toBe(401);
  });
});
