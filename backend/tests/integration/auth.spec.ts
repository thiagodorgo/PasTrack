import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { describe, expect, it, vi } from "vitest";
import { env } from "../../src/config/env";
import { api, autorizacao } from "../helpers/api";
import { criarUsuario } from "../helpers/fabricas";

const CREDENCIAIS_INVALIDAS = { erro: "E-mail ou senha inválidos", codigo: "CREDENCIAIS_INVALIDAS" };

describe("POST /api/auth/login", () => {
  it("devolve token e apenas os dados públicos do usuário", async () => {
    const { usuario, senha } = await criarUsuario({ email: "maria@teste.local", perfil: "GESTOR" });
    const resposta = await api().post("/api/auth/login").send({ email: "maria@teste.local", senha });
    expect(resposta.status).toBe(200);
    expect(resposta.body.token).toEqual(expect.any(String));
    expect(resposta.body.usuario).toEqual({
      id: usuario.id,
      nome: usuario.nome,
      email: "maria@teste.local",
      perfil: "GESTOR",
      deveTrocarSenha: false,
    });
    expect(JSON.stringify(resposta.body)).not.toMatch(/senhaHash|versaoToken/);
  });

  it("avisa quando o usuário ainda precisa trocar a senha", async () => {
    const { senha } = await criarUsuario({ email: "novo@teste.local", deveTrocarSenha: true });
    const resposta = await api().post("/api/auth/login").send({ email: "novo@teste.local", senha });
    expect(resposta.status).toBe(200);
    expect(resposta.body.usuario.deveTrocarSenha).toBe(true);
  });

  it("emite o token HS256 com emissor, público, validade e versão", async () => {
    const { usuario, senha } = await criarUsuario({ email: "token@teste.local", perfil: "COMPRADOR" });
    const resposta = await api().post("/api/auth/login").send({ email: "token@teste.local", senha });
    const decodificado = jwt.decode(resposta.body.token, { complete: true });
    expect(decodificado?.header.alg).toBe("HS256");
    expect(decodificado?.payload).toMatchObject({
      sub: String(usuario.id),
      nome: usuario.nome,
      perfil: "COMPRADOR",
      v: 0,
      iss: "pastrack-api",
      aud: "pastrack-web",
    });
    const { iat, exp } = decodificado?.payload as jwt.JwtPayload;
    expect(exp! - iat!).toBe(60 * 60);
  });

  it("aceita o e-mail com maiúsculas e espaços", async () => {
    const { senha } = await criarUsuario({ email: "joao@teste.local" });
    const resposta = await api().post("/api/auth/login").send({ email: "  JOAO@Teste.Local ", senha });
    expect(resposta.status).toBe(200);
  });

  it.each([
    ["senha errada", "joana@teste.local", "SenhaErrada999"],
    ["e-mail inexistente", "ninguem@teste.local", "SenhaForte123"],
  ])("recusa %s com a mesma mensagem genérica", async (_caso, email, senha) => {
    await criarUsuario({ email: "joana@teste.local" });
    const resposta = await api().post("/api/auth/login").send({ email, senha });
    expect(resposta.status).toBe(401);
    expect(resposta.body).toEqual(CREDENCIAIS_INVALIDAS);
  });

  it("compara a senha contra um hash falso quando o e-mail não existe", async () => {
    const comparar = vi.spyOn(bcrypt, "compare");
    const resposta = await api()
      .post("/api/auth/login")
      .send({ email: "fantasma@teste.local", senha: "SenhaForte123" });
    expect(resposta.status).toBe(401);
    expect(comparar).toHaveBeenCalledTimes(1);
    const [senha, hash] = comparar.mock.calls[0] as unknown as [string, string];
    expect(senha).toBe("SenhaForte123");
    // mesmo algoritmo e mesmo custo das senhas reais, para o tempo de resposta ser igual
    const custo = String(env.BCRYPT_CUSTO).padStart(2, "0");
    expect(["$2a$", "$2b$", "$2y$"].map((versao) => versao + custo + "$")).toContain(hash.slice(0, 7));
  });

  it("bloqueia usuário inativo mesmo com a senha certa, com a mesma mensagem", async () => {
    const { senha } = await criarUsuario({ email: "inativo@teste.local", ativo: false });
    const resposta = await api().post("/api/auth/login").send({ email: "inativo@teste.local", senha });
    expect(resposta.status).toBe(401);
    expect(resposta.body).toEqual(CREDENCIAIS_INVALIDAS);
  });

  it("exige e-mail e senha", async () => {
    const resposta = await api().post("/api/auth/login").send({ email: "alguem@teste.local" });
    expect(resposta.status).toBe(400);
    expect(resposta.body.codigo).toBe("DADOS_INVALIDOS");
  });

  it("recusa campos fora do esquema", async () => {
    const resposta = await api()
      .post("/api/auth/login")
      .send({ email: "alguem@teste.local", senha: "SenhaForte123", perfil: "ADMINISTRADOR" });
    expect(resposta.status).toBe(400);
  });
});

describe("acesso às rotas protegidas", () => {
  it("recusa requisição sem token", async () => {
    const resposta = await api().get("/api/pastilhas");
    expect(resposta.status).toBe(401);
    expect(resposta.body).toEqual({ erro: "Token não informado", codigo: "TOKEN_AUSENTE" });
  });

  it("recusa token malformado", async () => {
    const resposta = await api().get("/api/pastilhas").set(autorizacao("nao-e-um-jwt"));
    expect(resposta.status).toBe(401);
    expect(resposta.body.codigo).toBe("SESSAO_INVALIDA");
  });

  it("recusa token assinado com outra chave", async () => {
    const forjado = jwt.sign(
      { sub: "1", nome: "Intruso", perfil: "ADMINISTRADOR", v: 0 },
      "outra-chave-com-mais-de-32-caracteres-abcdef",
      { issuer: "pastrack-api", audience: "pastrack-web" }
    );
    const resposta = await api().get("/api/pastilhas").set(autorizacao(forjado));
    expect(resposta.status).toBe(401);
  });

  it("aceita token válido", async () => {
    const { token } = await criarUsuario();
    const resposta = await api().get("/api/pastilhas").set(autorizacao(token));
    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual([]);
  });

  it("aceita o token devolvido pelo login", async () => {
    const { senha } = await criarUsuario({ email: "sessao@teste.local" });
    const login = await api().post("/api/auth/login").send({ email: "sessao@teste.local", senha });
    const resposta = await api().get("/api/pastilhas").set(autorizacao(login.body.token));
    expect(resposta.status).toBe(200);
  });
});
