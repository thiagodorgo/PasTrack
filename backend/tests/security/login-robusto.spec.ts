import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";
import { env } from "../../src/config/env";
import { prisma } from "../../src/config/prisma";
import { api, autorizacao } from "../helpers/api";
import { criarUsuario, SENHA_PADRAO } from "../helpers/fabricas";

function tentarLogin(corpo: Record<string, unknown>) {
  return api().post("/api/auth/login").send(corpo);
}

describe("caracteres de controle nas entradas de identidade", () => {
  it("o login recusa e-mail com byte nulo com 400, sem chegar ao banco", async () => {
    const resposta = await tentarLogin({ email: "alvo\u0000@teste.local", senha: SENHA_PADRAO });
    expect(resposta.status).toBe(400);
    expect(resposta.body.codigo).toBe("DADOS_INVALIDOS");
  });

  it("a gestão de usuários recusa nome com caractere de controle", async () => {
    const { token } = await criarUsuario({ perfil: "ADMINISTRADOR" });
    const resposta = await api()
      .post("/api/usuarios")
      .set(autorizacao(token))
      .send({ nome: "Ana\u0000 Souza", email: "ana.controle@teste.local", perfil: "OPERADOR" });
    expect(resposta.status).toBe(400);
    expect(resposta.body.codigo).toBe("DADOS_INVALIDOS");
  });
});

describe("limite de login conta só a credencial recusada", () => {
  it("corpos inválidos em sequência não bloqueiam o login certo", async () => {
    const email = "corpo.invalido@teste.local";
    await criarUsuario({ email });
    for (let tentativa = 0; tentativa <= env.RATE_LIMIT_LOGIN_MAX; tentativa++) {
      expect((await tentarLogin({ email })).status).toBe(400);
    }
    expect((await tentarLogin({ email, senha: SENHA_PADRAO })).status).toBe(200);
  });
});

describe("custo do bcrypt no login", () => {
  it("o login certo regrava o hash no custo atual sem derrubar a sessão", async () => {
    const email = "custo.antigo@teste.local";
    const { usuario } = await criarUsuario({ email });
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { senhaHash: await bcrypt.hash(SENHA_PADRAO, env.BCRYPT_CUSTO + 1) },
    });
    const antes = await prisma.usuario.findUniqueOrThrow({ where: { id: usuario.id } });

    expect((await tentarLogin({ email, senha: SENHA_PADRAO })).status).toBe(200);

    const depois = await prisma.usuario.findUniqueOrThrow({ where: { id: usuario.id } });
    expect(bcrypt.getRounds(depois.senhaHash)).toBe(env.BCRYPT_CUSTO);
    expect(await bcrypt.compare(SENHA_PADRAO, depois.senhaHash)).toBe(true);
    expect(depois.versaoToken).toBe(antes.versaoToken);
  });

  it("com o custo igual, o hash gravado não muda", async () => {
    const email = "custo.igual@teste.local";
    const { usuario } = await criarUsuario({ email });
    const antes = await prisma.usuario.findUniqueOrThrow({ where: { id: usuario.id } });

    expect((await tentarLogin({ email, senha: SENHA_PADRAO })).status).toBe(200);

    const depois = await prisma.usuario.findUniqueOrThrow({ where: { id: usuario.id } });
    expect(depois.senhaHash).toBe(antes.senhaHash);
  });
});
