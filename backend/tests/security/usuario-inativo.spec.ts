import { describe, expect, it } from "vitest";
import { prisma } from "../../src/config/prisma";
import { api, autorizacao } from "../helpers/api";
import { criarUsuario } from "../helpers/fabricas";

const SESSAO_INVALIDA = { erro: "Sessão expirada. Entre novamente.", codigo: "SESSAO_INVALIDA" };

describe("usuário desativado", () => {
  it("perde o acesso mesmo com token ainda válido", async () => {
    const { usuario, token } = await criarUsuario({ perfil: "OPERADOR" });
    expect((await api().get("/api/pastilhas").set(autorizacao(token))).status).toBe(200);

    await prisma.usuario.update({ where: { id: usuario.id }, data: { ativo: false } });

    const resposta = await api().get("/api/pastilhas").set(autorizacao(token));
    expect(resposta.status).toBe(401);
    expect(resposta.body).toEqual(SESSAO_INVALIDA);
  });

  it("perde o acesso em todas as rotas protegidas, inclusive nas de escrita", async () => {
    const { usuario, token } = await criarUsuario({ perfil: "ADMINISTRADOR" });
    await prisma.usuario.update({ where: { id: usuario.id }, data: { ativo: false } });

    const respostas = await Promise.all([
      api().get("/api/painel").set(autorizacao(token)),
      api().get("/api/usuarios").set(autorizacao(token)),
      api().post("/api/fabricantes").set(autorizacao(token)).send({ nome: "Kennametal" }),
    ]);
    expect(respostas.map((resposta) => resposta.status)).toEqual([401, 401, 401]);
    expect(await prisma.fabricante.count()).toBe(0);
  });
});
