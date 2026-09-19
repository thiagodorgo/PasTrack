import { describe, expect, it } from "vitest";
import { prisma } from "../../src/config/prisma";
import { api, autorizacao } from "../helpers/api";
import { criarUsuario, SENHA_PADRAO } from "../helpers/fabricas";

const NOVA_SENHA = "PastilhaNova2026";
const TROCA_OBRIGATORIA = { erro: "Troque a sua senha para continuar", codigo: "TROCA_SENHA_OBRIGATORIA" };
const SESSAO_INVALIDA = { erro: "Sessão expirada. Entre novamente.", codigo: "SESSAO_INVALIDA" };

function entrar(email: string, senha: string) {
  return api().post("/api/auth/login").send({ email, senha });
}

function trocarSenha(token: string, senhaAtual: string, novaSenha: string) {
  return api().patch("/api/auth/senha").set(autorizacao(token)).send({ senhaAtual, novaSenha });
}

describe("primeiro acesso com troca obrigatória de senha", () => {
  it("fluxo completo: bloqueio, troca, token antigo recusado e token novo liberado", async () => {
    const email = "primeiro@teste.local";
    const { usuario, senha } = await criarUsuario({ email, perfil: "GESTOR", deveTrocarSenha: true });

    const login = await entrar(email, senha);
    expect(login.status).toBe(200);
    expect(login.body.usuario.deveTrocarSenha).toBe(true);
    const tokenAntigo: string = login.body.token;

    for (const rota of [
      "/api/painel",
      "/api/pastilhas",
      "/api/fabricantes",
      "/api/alertas",
      "/api/usuarios",
    ]) {
      const bloqueada = await api().get(rota).set(autorizacao(tokenAntigo));
      expect(bloqueada.status, rota).toBe(403);
      expect(bloqueada.body).toEqual(TROCA_OBRIGATORIA);
    }
    const escrita = await api()
      .post("/api/fabricantes")
      .set(autorizacao(tokenAntigo))
      .send({ nome: "Iscar" });
    expect(escrita.status).toBe(403);
    expect(await prisma.fabricante.count()).toBe(0);

    const me = await api().get("/api/auth/me").set(autorizacao(tokenAntigo));
    expect(me.status).toBe(200);
    expect(me.body).toEqual({
      id: usuario.id,
      nome: usuario.nome,
      email,
      perfil: "GESTOR",
      deveTrocarSenha: true,
    });

    const troca = await trocarSenha(tokenAntigo, senha, NOVA_SENHA);
    expect(troca.status).toBe(200);
    expect(troca.body).toEqual({ token: expect.any(String) });
    const tokenNovo: string = troca.body.token;

    for (const rota of ["/api/auth/me", "/api/pastilhas"]) {
      const recusada = await api().get(rota).set(autorizacao(tokenAntigo));
      expect(recusada.status, rota).toBe(401);
      expect(recusada.body).toEqual(SESSAO_INVALIDA);
    }

    expect((await api().get("/api/pastilhas").set(autorizacao(tokenNovo))).status).toBe(200);
    const meNovo = await api().get("/api/auth/me").set(autorizacao(tokenNovo));
    expect(meNovo.body.deveTrocarSenha).toBe(false);

    expect((await entrar(email, senha)).status).toBe(401);
    const loginNovo = await entrar(email, NOVA_SENHA);
    expect(loginNovo.status).toBe(200);
    expect(loginNovo.body.usuario.deveTrocarSenha).toBe(false);
  });

  it("a troca derruba as outras sessões do mesmo usuário", async () => {
    const email = "duas.sessoes@teste.local";
    await criarUsuario({ email });
    const primeira: string = (await entrar(email, SENHA_PADRAO)).body.token;
    const segunda: string = (await entrar(email, SENHA_PADRAO)).body.token;

    const troca = await trocarSenha(primeira, SENHA_PADRAO, NOVA_SENHA);
    expect(troca.status).toBe(200);

    expect((await api().get("/api/pastilhas").set(autorizacao(primeira))).status).toBe(401);
    expect((await api().get("/api/pastilhas").set(autorizacao(segunda))).status).toBe(401);
    expect((await api().get("/api/pastilhas").set(autorizacao(troca.body.token))).status).toBe(200);
  });

  it("registra a troca na auditoria sem guardar nenhuma senha", async () => {
    const { usuario, token } = await criarUsuario({ deveTrocarSenha: true });
    expect((await trocarSenha(token, SENHA_PADRAO, NOVA_SENHA)).status).toBe(200);

    const registros = await prisma.auditoria.findMany({ where: { acao: "usuario.senha_alterada" } });
    expect(registros).toHaveLength(1);
    expect(registros[0]).toMatchObject({
      usuarioId: usuario.id,
      entidade: "usuario",
      entidadeId: usuario.id,
    });
    const conteudo = JSON.stringify(registros);
    for (const proibido of [
      SENHA_PADRAO,
      NOVA_SENHA,
      '"senha":',
      "senhaHash",
      "senhaAtual",
      "novaSenha",
      "$2a$",
      "$2b$",
    ]) {
      expect(conteudo).not.toContain(proibido);
    }
  });

  it("recusa a senha atual errada com 400, e não 401, e mantém a sessão", async () => {
    const { usuario, token } = await criarUsuario({ deveTrocarSenha: true });
    const resposta = await trocarSenha(token, "SenhaErrada999", NOVA_SENHA);
    expect(resposta.status).toBe(400);
    expect(resposta.body).toEqual({ erro: "A senha atual não confere", codigo: "SENHA_ATUAL_INCORRETA" });
    expect((await api().get("/api/auth/me").set(autorizacao(token))).status).toBe(200);
    const depois = await prisma.usuario.findUniqueOrThrow({ where: { id: usuario.id } });
    expect(depois).toMatchObject({ deveTrocarSenha: true, versaoToken: 0 });
  });

  it("recusa nova senha igual à atual, apontando o campo", async () => {
    const { token } = await criarUsuario({ deveTrocarSenha: true });
    const resposta = await trocarSenha(token, SENHA_PADRAO, SENHA_PADRAO);
    expect(resposta.status).toBe(400);
    expect(resposta.body).toEqual({
      erro: "Dados inválidos",
      codigo: "DADOS_INVALIDOS",
      campos: [{ caminho: "novaSenha", mensagem: "a nova senha precisa ser diferente da atual" }],
    });
  });

  it.each([
    ["curta", "abc123", "use pelo menos 12 caracteres"],
    ["sem número", "SomenteLetrasAqui", "inclua pelo menos um número"],
    ["sem letra", "12345678901", "inclua pelo menos uma letra"],
    ["com o nome do e-mail", "fraca2026abc", "não use o seu e-mail na senha"],
    ["comum demais", "pastrack123", "essa senha é comum demais"],
  ])("recusa nova senha fora da política: %s", async (_caso, novaSenha, problema) => {
    const { usuario, token } = await criarUsuario({ email: "fraca@teste.local", deveTrocarSenha: true });
    const resposta = await trocarSenha(token, SENHA_PADRAO, novaSenha);
    expect(resposta.status).toBe(400);
    expect(resposta.body.codigo).toBe("DADOS_INVALIDOS");
    expect(resposta.body.campos).toContainEqual({ caminho: "novaSenha", mensagem: problema });
    for (const campo of resposta.body.campos) {
      expect(campo.caminho).toBe("novaSenha");
    }
    const depois = await prisma.usuario.findUniqueOrThrow({ where: { id: usuario.id } });
    expect(depois).toMatchObject({ deveTrocarSenha: true, versaoToken: 0 });
  });

  it.each([
    ["sem a nova senha", { senhaAtual: SENHA_PADRAO }],
    ["com campo a mais", { senhaAtual: SENHA_PADRAO, novaSenha: NOVA_SENHA, deveTrocarSenha: false }],
    ["com tipo errado", { senhaAtual: SENHA_PADRAO, novaSenha: 12345678901 }],
  ])("valida o corpo da troca: %s", async (_caso, corpo) => {
    const { token } = await criarUsuario({ deveTrocarSenha: true });
    const resposta = await api().patch("/api/auth/senha").set(autorizacao(token)).send(corpo);
    expect(resposta.status).toBe(400);
    expect(resposta.body.codigo).toBe("DADOS_INVALIDOS");
  });

  it("/me e /senha exigem estar autenticado", async () => {
    expect((await api().get("/api/auth/me")).status).toBe(401);
    const troca = await api().patch("/api/auth/senha").send({ senhaAtual: "x", novaSenha: "y" });
    expect(troca.status).toBe(401);
  });

  it("health e login continuam públicos", async () => {
    expect((await api().get("/api/health")).status).toBe(200);
    expect((await entrar("ninguem@teste.local", SENHA_PADRAO)).status).toBe(401);
  });
});
