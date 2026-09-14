import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { api, autorizacao } from "../helpers/api";
import { criarUsuario } from "../helpers/fabricas";

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
    });
    expect(JSON.stringify(resposta.body)).not.toContain("senhaHash");
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
    expect(resposta.body).toEqual({ erro: "E-mail ou senha inválidos" });
  });

  it("bloqueia usuário inativo", async () => {
    const { senha } = await criarUsuario({ email: "inativo@teste.local", ativo: false });
    const resposta = await api().post("/api/auth/login").send({ email: "inativo@teste.local", senha });
    expect(resposta.status).toBe(401);
  });

  it("exige e-mail e senha", async () => {
    const resposta = await api().post("/api/auth/login").send({ email: "alguem@teste.local" });
    expect(resposta.status).toBe(400);
  });
});

describe("acesso às rotas protegidas", () => {
  it("recusa requisição sem token", async () => {
    const resposta = await api().get("/api/pastilhas");
    expect(resposta.status).toBe(401);
    expect(resposta.body).toEqual({ erro: "Token não informado" });
  });

  it("recusa token malformado", async () => {
    const resposta = await api().get("/api/pastilhas").set(autorizacao("nao-e-um-jwt"));
    expect(resposta.status).toBe(401);
  });

  it("recusa token assinado com outra chave", async () => {
    const forjado = jwt.sign(
      { id: 1, nome: "Intruso", perfil: "ADMINISTRADOR" },
      "outra-chave-com-mais-de-32-caracteres-abcdef"
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
});
