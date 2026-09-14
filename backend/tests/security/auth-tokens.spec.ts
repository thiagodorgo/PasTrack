import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { env } from "../../src/config/env";
import { prisma } from "../../src/config/prisma";
import { api, autorizacao } from "../helpers/api";
import { criarUsuario } from "../helpers/fabricas";

const SESSAO_INVALIDA = { erro: "Sessão expirada. Entre novamente.", codigo: "SESSAO_INVALIDA" };
const OPCOES_VALIDAS: jwt.SignOptions = {
  algorithm: "HS256",
  issuer: "pastrack-api",
  audience: "pastrack-web",
  expiresIn: "1h",
};

function base64url(valor: object) {
  return Buffer.from(JSON.stringify(valor)).toString("base64url");
}

async function usuarioComPayload() {
  const { usuario, token } = await criarUsuario({ perfil: "GESTOR" });
  const payload = {
    sub: String(usuario.id),
    nome: usuario.nome,
    perfil: usuario.perfil,
    v: usuario.versaoToken,
  };
  return { usuario, token, payload };
}

function assinar(payload: object, opcoes: jwt.SignOptions = OPCOES_VALIDAS, segredo = env.JWT_SECRET) {
  return jwt.sign(payload, segredo, opcoes);
}

function acessarComToken(token: string) {
  return api().get("/api/pastilhas").set(autorizacao(token));
}

async function esperarSessaoInvalida(token: string) {
  const resposta = await acessarComToken(token);
  expect(resposta.status).toBe(401);
  expect(resposta.body).toEqual(SESSAO_INVALIDA);
}

describe("tokens recusados nas rotas protegidas", () => {
  it("controle: o token legítimo é aceito", async () => {
    const { payload } = await usuarioComPayload();
    expect((await acessarComToken(assinar(payload))).status).toBe(200);
  });

  it("1. token ausente", async () => {
    const resposta = await api().get("/api/pastilhas");
    expect(resposta.status).toBe(401);
    expect(resposta.body.codigo).toBe("TOKEN_AUSENTE");
  });

  it("2. token sem o prefixo Bearer", async () => {
    const { token } = await usuarioComPayload();
    const semBearer = await api().get("/api/pastilhas").set("Authorization", token);
    const basic = await api()
      .get("/api/pastilhas")
      .set("Authorization", "Basic " + token);
    expect(semBearer.status).toBe(401);
    expect(basic.status).toBe(401);
    expect(semBearer.body.codigo).toBe("TOKEN_AUSENTE");
  });

  it.each(["nao-e-um-jwt", "abc.def.ghi", "eyJhbGciOiJIUzI1NiJ9.e30"])(
    "3. token malformado: %s",
    async (token) => {
      await esperarSessaoInvalida(token);
    }
  );

  it("4. alg none, sem assinatura", async () => {
    const { payload } = await usuarioComPayload();
    const agora = Math.floor(Date.now() / 1000);
    const semAssinatura =
      base64url({ alg: "none", typ: "JWT" }) +
      "." +
      base64url({ ...payload, iss: "pastrack-api", aud: "pastrack-web", iat: agora, exp: agora + 3600 }) +
      ".";
    await esperarSessaoInvalida(semAssinatura);
  });

  it("5. assinado com outro segredo", async () => {
    const { payload } = await usuarioComPayload();
    await esperarSessaoInvalida(
      assinar(payload, OPCOES_VALIDAS, "outro-segredo-com-mais-de-32-caracteres-xyz")
    );
  });

  it("6. assinado com algoritmo fora da lista (HS512), mesmo com o segredo certo", async () => {
    const { payload } = await usuarioComPayload();
    await esperarSessaoInvalida(assinar(payload, { ...OPCOES_VALIDAS, algorithm: "HS512" }));
  });

  it("7. expirado", async () => {
    const { payload } = await usuarioComPayload();
    const { expiresIn: _ignorado, ...semValidade } = OPCOES_VALIDAS;
    const expirado = assinar({ ...payload, exp: Math.floor(Date.now() / 1000) - 60 }, semValidade);
    await esperarSessaoInvalida(expirado);
  });

  it("8. emissor errado", async () => {
    const { payload } = await usuarioComPayload();
    await esperarSessaoInvalida(assinar(payload, { ...OPCOES_VALIDAS, issuer: "outra-api" }));
  });

  it("9. público errado", async () => {
    const { payload } = await usuarioComPayload();
    await esperarSessaoInvalida(assinar(payload, { ...OPCOES_VALIDAS, audience: "outro-app" }));
  });

  it("10. payload sem sub", async () => {
    const { payload } = await usuarioComPayload();
    const { sub: _sub, ...semSub } = payload;
    await esperarSessaoInvalida(assinar(semSub));
  });

  it.each([
    ["sub não numérico", { sub: "admin" }],
    ["sub fora do intervalo do banco", { sub: "99999999999" }],
    ["sem a versão v", { v: undefined }],
    ["versão negativa", { v: -1 }],
    ["perfil desconhecido", { perfil: "SUPERUSUARIO" }],
  ])("11. payload inválido: %s", async (_caso, alteracao) => {
    const { payload } = await usuarioComPayload();
    await esperarSessaoInvalida(assinar({ ...payload, ...alteracao }));
  });

  it("12. versão antiga depois que a versão do usuário mudou", async () => {
    const { usuario, token } = await usuarioComPayload();
    await prisma.usuario.update({ where: { id: usuario.id }, data: { versaoToken: { increment: 1 } } });
    await esperarSessaoInvalida(token);
  });

  it("13. versão diferente da do banco, mesmo que maior", async () => {
    const { payload } = await usuarioComPayload();
    await esperarSessaoInvalida(assinar({ ...payload, v: payload.v + 5 }));
  });

  it("14. usuário apagado", async () => {
    const { usuario, token } = await usuarioComPayload();
    await prisma.usuario.delete({ where: { id: usuario.id } });
    await esperarSessaoInvalida(token);
  });

  it("15. o perfil do token não vale: o perfil vem do banco", async () => {
    const { payload } = await usuarioComPayload();
    const promovido = assinar({ ...payload, perfil: "ADMINISTRADOR" });
    const resposta = await api().get("/api/usuarios").set(autorizacao(promovido));
    expect(resposta.status).toBe(403);
  });
});
