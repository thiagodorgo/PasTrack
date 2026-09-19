import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";
import { prisma } from "../../src/config/prisma";
import { validarPoliticaDeSenha } from "../../src/services/politica-senha";
import { usuarioService } from "../../src/services/usuario.service";
import { api, autorizacao } from "../helpers/api";
import { criarUsuario, SENHA_PADRAO } from "../helpers/fabricas";

const SESSAO_INVALIDA = { erro: "Sessão expirada. Entre novamente.", codigo: "SESSAO_INVALIDA" };
const CAMPOS_DO_USUARIO = [
  "ativo",
  "atualizadoEm",
  "criadoEm",
  "deveTrocarSenha",
  "email",
  "id",
  "nome",
  "perfil",
];

/** Nenhuma resposta pode trazer o hash, a versão do token ou qualquer hash bcrypt. */
function esperarSemSegredos(corpo: unknown) {
  const texto = JSON.stringify(corpo);
  for (const proibido of ["senhaHash", "versaoToken", "$2a$", "$2b$", "$2y$"]) {
    expect(texto).not.toContain(proibido);
  }
}

function criarAdministrador() {
  return criarUsuario({ nome: "Carla Admin", email: "admin@teste.local", perfil: "ADMINISTRADOR" });
}

function rota(id: number | string, sufixo = "") {
  return `/api/usuarios/${id}${sufixo}`;
}

function acessarPastilhas(token: string) {
  return api().get("/api/pastilhas").set(autorizacao(token));
}

function entrar(email: string, senha: string) {
  return api().post("/api/auth/login").send({ email, senha });
}

describe("acesso à gestão de usuários", () => {
  it.each(["GESTOR", "OPERADOR", "COMPRADOR"] as const)("%s recebe 403 em todas as rotas", async (perfil) => {
    const { token } = await criarUsuario({ perfil });
    const alvo = await criarUsuario();
    const novo = { nome: "Novo", email: "novo@teste.local", perfil: "ADMINISTRADOR" };
    const respostas = [
      await api().get("/api/usuarios").set(autorizacao(token)),
      await api().post("/api/usuarios").set(autorizacao(token)).send(novo),
      await api().put(rota(alvo.usuario.id)).set(autorizacao(token)).send({ perfil: "ADMINISTRADOR" }),
      await api().patch(rota(alvo.usuario.id, "/ativo")).set(autorizacao(token)).send({ ativo: false }),
      await api().post(rota(alvo.usuario.id, "/redefinir-senha")).set(autorizacao(token)),
    ];
    expect(respostas.map((resposta) => resposta.status)).toEqual([403, 403, 403, 403, 403]);
    expect(await prisma.usuario.count()).toBe(2);
    const intacto = await prisma.usuario.findUniqueOrThrow({ where: { id: alvo.usuario.id } });
    expect(intacto).toMatchObject({ perfil: "OPERADOR", ativo: true, versaoToken: 0 });
  });

  it("sem token recebe 401", async () => {
    expect((await api().get("/api/usuarios")).status).toBe(401);
  });

  it("administrador com a troca de senha pendente também é barrado", async () => {
    const { token } = await criarUsuario({ perfil: "ADMINISTRADOR", deveTrocarSenha: true });
    const resposta = await api().get("/api/usuarios").set(autorizacao(token));
    expect(resposta.status).toBe(403);
    expect(resposta.body.codigo).toBe("TROCA_SENHA_OBRIGATORIA");
  });
});

describe("CRUD de usuários", () => {
  it("lista em ordem de nome, só com os campos públicos", async () => {
    const { token } = await criarAdministrador();
    await criarUsuario({ nome: "Bruno", perfil: "GESTOR" });
    await criarUsuario({ nome: "Ana", perfil: "COMPRADOR" });

    const resposta = await api().get("/api/usuarios").set(autorizacao(token));
    expect(resposta.status).toBe(200);
    expect(resposta.body.map((usuario: { nome: string }) => usuario.nome)).toEqual([
      "Ana",
      "Bruno",
      "Carla Admin",
    ]);
    for (const usuario of resposta.body) {
      expect(Object.keys(usuario).sort()).toEqual(CAMPOS_DO_USUARIO);
    }
    esperarSemSegredos(resposta.body);
  });

  it("cria com senha temporária exibida uma vez, troca obrigatória e e-mail normalizado", async () => {
    const admin = await criarAdministrador();
    const resposta = await api()
      .post("/api/usuarios")
      .set(autorizacao(admin.token))
      .send({ nome: "  João Lima ", email: " Joao.Lima@Teste.Local ", perfil: "OPERADOR" });

    expect(resposta.status).toBe(201);
    esperarSemSegredos(resposta.body);
    const { senhaTemporaria, ...usuario } = resposta.body;
    expect(usuario).toMatchObject({
      nome: "João Lima",
      email: "joao.lima@teste.local",
      perfil: "OPERADOR",
      ativo: true,
      deveTrocarSenha: true,
    });
    expect(Object.keys(usuario).sort()).toEqual(CAMPOS_DO_USUARIO);
    expect(senhaTemporaria).toHaveLength(22);
    expect(validarPoliticaDeSenha(senhaTemporaria, "joao.lima@teste.local")).toEqual([]);

    const gravado = await prisma.usuario.findUniqueOrThrow({ where: { id: usuario.id } });
    expect(await bcrypt.compare(senhaTemporaria, gravado.senhaHash)).toBe(true);

    const lista = await api().get("/api/usuarios").set(autorizacao(admin.token));
    expect(JSON.stringify(lista.body)).not.toContain(senhaTemporaria);

    const auditoria = await prisma.auditoria.findFirstOrThrow({ where: { acao: "usuario.criado" } });
    expect(auditoria).toMatchObject({
      usuarioId: admin.usuario.id,
      entidade: "usuario",
      entidadeId: usuario.id,
    });
    expect(JSON.stringify(auditoria)).not.toContain(senhaTemporaria);
    esperarSemSegredos(auditoria);
  });

  it("recusa e-mail já cadastrado, sem diferenciar maiúsculas, com 409 DUPLICADO", async () => {
    const admin = await criarAdministrador();
    await criarUsuario({ email: "maria@teste.local" });
    const resposta = await api()
      .post("/api/usuarios")
      .set(autorizacao(admin.token))
      .send({ nome: "Maria Duplicada", email: "MARIA@teste.local", perfil: "GESTOR" });
    expect(resposta.status).toBe(409);
    expect(resposta.body).toEqual({ erro: "Já existe um usuário com este e-mail", codigo: "DUPLICADO" });
    expect(await prisma.usuario.count()).toBe(2);
    expect(await prisma.auditoria.count()).toBe(0);
  });

  it.each([
    ["sem perfil", { nome: "Ana", email: "ana@teste.local" }],
    ["com perfil inexistente", { nome: "Ana", email: "ana@teste.local", perfil: "DONO" }],
    ["com e-mail inválido", { nome: "Ana", email: "ana-sem-arroba", perfil: "GESTOR" }],
    ["com nome curto", { nome: "A", email: "ana@teste.local", perfil: "GESTOR" }],
    [
      "com senha no corpo",
      { nome: "Ana", email: "ana@teste.local", perfil: "GESTOR", senha: "Escolhida2026" },
    ],
  ])("recusa a criação %s com 400 DADOS_INVALIDOS", async (_caso, corpo) => {
    const { token } = await criarAdministrador();
    const resposta = await api().post("/api/usuarios").set(autorizacao(token)).send(corpo);
    expect(resposta.status).toBe(400);
    expect(resposta.body.codigo).toBe("DADOS_INVALIDOS");
    expect(await prisma.usuario.count()).toBe(1);
  });

  it("muda o nome sem derrubar a sessão do usuário", async () => {
    const admin = await criarAdministrador();
    const alvo = await criarUsuario({ nome: "Pedro", perfil: "OPERADOR" });
    const resposta = await api()
      .put(rota(alvo.usuario.id))
      .set(autorizacao(admin.token))
      .send({ nome: "Pedro Alves" });
    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({ id: alvo.usuario.id, nome: "Pedro Alves", perfil: "OPERADOR" });
    esperarSemSegredos(resposta.body);
    expect((await acessarPastilhas(alvo.token)).status).toBe(200);

    const auditoria = await prisma.auditoria.findFirstOrThrow({ where: { acao: "usuario.atualizado" } });
    expect(auditoria).toMatchObject({
      usuarioId: admin.usuario.id,
      antes: { nome: "Pedro", perfil: "OPERADOR" },
      depois: { nome: "Pedro Alves", perfil: "OPERADOR" },
    });
  });

  it("mudar o perfil derruba a sessão do usuário", async () => {
    const admin = await criarAdministrador();
    const alvo = await criarUsuario({ perfil: "OPERADOR" });
    const resposta = await api()
      .put(rota(alvo.usuario.id))
      .set(autorizacao(admin.token))
      .send({ perfil: "GESTOR" });
    expect(resposta.status).toBe(200);
    expect(resposta.body.perfil).toBe("GESTOR");

    const antigo = await acessarPastilhas(alvo.token);
    expect(antigo.status).toBe(401);
    expect(antigo.body).toEqual(SESSAO_INVALIDA);
    const login = await entrar(alvo.usuario.email, SENHA_PADRAO);
    expect(login.body.usuario.perfil).toBe("GESTOR");
  });

  it.each([
    ["vazia", {}],
    ["com campo desconhecido", { email: "outro@teste.local" }],
    ["com perfil inválido", { perfil: "DONO" }],
  ])("recusa a atualização %s", async (_caso, corpo) => {
    const admin = await criarAdministrador();
    const alvo = await criarUsuario();
    const resposta = await api().put(rota(alvo.usuario.id)).set(autorizacao(admin.token)).send(corpo);
    expect(resposta.status).toBe(400);
    expect(resposta.body.codigo).toBe("DADOS_INVALIDOS");
  });

  it("responde 404 para usuário inexistente e 400 para id inválido", async () => {
    const { token } = await criarAdministrador();
    const inexistentes = [
      await api().put(rota(9999)).set(autorizacao(token)).send({ nome: "Fulano" }),
      await api().patch(rota(9999, "/ativo")).set(autorizacao(token)).send({ ativo: false }),
      await api().post(rota(9999, "/redefinir-senha")).set(autorizacao(token)),
    ];
    for (const resposta of inexistentes) {
      expect(resposta.status).toBe(404);
      expect(resposta.body).toEqual({ erro: "Usuário não encontrado" });
    }
    for (const id of ["abc", "0", "99999999999"]) {
      const resposta = await api().put(rota(id)).set(autorizacao(token)).send({ nome: "Fulano" });
      expect(resposta.status, id).toBe(400);
    }
  });

  it("desativar derruba a sessão e reativar devolve o acesso com um novo login", async () => {
    const admin = await criarAdministrador();
    const alvo = await criarUsuario({ email: "pausa@teste.local" });

    const desativado = await api()
      .patch(rota(alvo.usuario.id, "/ativo"))
      .set(autorizacao(admin.token))
      .send({ ativo: false });
    expect(desativado.status).toBe(200);
    expect(desativado.body.ativo).toBe(false);
    esperarSemSegredos(desativado.body);
    expect((await acessarPastilhas(alvo.token)).body).toEqual(SESSAO_INVALIDA);
    expect((await entrar("pausa@teste.local", SENHA_PADRAO)).status).toBe(401);

    const reativado = await api()
      .patch(rota(alvo.usuario.id, "/ativo"))
      .set(autorizacao(admin.token))
      .send({ ativo: true });
    expect(reativado.body.ativo).toBe(true);
    expect((await acessarPastilhas(alvo.token)).status).toBe(401);
    const login = await entrar("pausa@teste.local", SENHA_PADRAO);
    expect(login.status).toBe(200);
    expect((await acessarPastilhas(login.body.token)).status).toBe(200);

    const acoes = (await prisma.auditoria.findMany({ orderBy: { id: "asc" } })).map(
      (registro) => registro.acao
    );
    expect(acoes).toEqual(["usuario.desativado", "usuario.reativado"]);
  });

  it("repetir o estado atual não muda nada", async () => {
    const admin = await criarAdministrador();
    const alvo = await criarUsuario({ ativo: false });
    const resposta = await api()
      .patch(rota(alvo.usuario.id, "/ativo"))
      .set(autorizacao(admin.token))
      .send({ ativo: false });
    expect(resposta.status).toBe(200);
    const depois = await prisma.usuario.findUniqueOrThrow({ where: { id: alvo.usuario.id } });
    expect(depois.versaoToken).toBe(0);
    expect(await prisma.auditoria.count()).toBe(0);
  });

  it("redefinir a senha gera outra senha temporária e derruba a sessão", async () => {
    const admin = await criarAdministrador();
    const alvo = await criarUsuario({ email: "esqueceu@teste.local" });
    const resposta = await api()
      .post(rota(alvo.usuario.id, "/redefinir-senha"))
      .set(autorizacao(admin.token));
    expect(resposta.status).toBe(200);
    expect(Object.keys(resposta.body)).toEqual(["senhaTemporaria"]);
    const { senhaTemporaria } = resposta.body;
    expect(validarPoliticaDeSenha(senhaTemporaria, "esqueceu@teste.local")).toEqual([]);

    expect((await acessarPastilhas(alvo.token)).body).toEqual(SESSAO_INVALIDA);
    expect((await entrar("esqueceu@teste.local", SENHA_PADRAO)).status).toBe(401);
    const login = await entrar("esqueceu@teste.local", senhaTemporaria);
    expect(login.status).toBe(200);
    expect(login.body.usuario.deveTrocarSenha).toBe(true);
    expect((await acessarPastilhas(login.body.token)).status).toBe(403);

    const auditoria = await prisma.auditoria.findFirstOrThrow({
      where: { acao: "usuario.senha_redefinida" },
    });
    expect(auditoria).toMatchObject({ usuarioId: admin.usuario.id, entidadeId: alvo.usuario.id });
    expect(JSON.stringify(auditoria)).not.toContain(senhaTemporaria);
  });
});

describe("proteções dos administradores", () => {
  it("ninguém desativa a si mesmo", async () => {
    const admin = await criarAdministrador();
    await criarUsuario({ perfil: "ADMINISTRADOR" });
    const resposta = await api()
      .patch(rota(admin.usuario.id, "/ativo"))
      .set(autorizacao(admin.token))
      .send({ ativo: false });
    expect(resposta.status).toBe(409);
    expect(resposta.body).toEqual({ erro: "Você não pode desativar o seu próprio usuário" });
    expect((await prisma.usuario.findUniqueOrThrow({ where: { id: admin.usuario.id } })).ativo).toBe(true);
  });

  it("ninguém rebaixa a si mesmo, mas pode mudar o próprio nome", async () => {
    const admin = await criarAdministrador();
    await criarUsuario({ perfil: "ADMINISTRADOR" });
    const rebaixar = await api()
      .put(rota(admin.usuario.id))
      .set(autorizacao(admin.token))
      .send({ perfil: "GESTOR" });
    expect(rebaixar.status).toBe(409);
    expect(rebaixar.body).toEqual({ erro: "Você não pode rebaixar o seu próprio perfil" });

    const renomear = await api()
      .put(rota(admin.usuario.id))
      .set(autorizacao(admin.token))
      .send({ nome: "Carla Souza", perfil: "ADMINISTRADOR" });
    expect(renomear.status).toBe(200);
    expect((await acessarPastilhas(admin.token)).status).toBe(200);
  });

  it("um administrador rebaixa e desativa outros administradores", async () => {
    const admin = await criarAdministrador();
    const outro = await criarUsuario({ perfil: "ADMINISTRADOR" });
    const terceiro = await criarUsuario({ perfil: "ADMINISTRADOR" });
    const rebaixar = await api()
      .put(rota(outro.usuario.id))
      .set(autorizacao(admin.token))
      .send({ perfil: "GESTOR" });
    const desativar = await api()
      .patch(rota(terceiro.usuario.id, "/ativo"))
      .set(autorizacao(admin.token))
      .send({ ativo: false });
    expect([rebaixar.status, desativar.status]).toEqual([200, 200]);
    expect(await prisma.usuario.count({ where: { perfil: "ADMINISTRADOR", ativo: true } })).toBe(1);
  });

  it("o serviço nunca remove o último administrador ativo", async () => {
    const unico = await criarAdministrador();
    const gestor = await criarUsuario({ perfil: "GESTOR" });
    await expect(
      usuarioService.alterarAtivo(unico.usuario.id, false, gestor.usuario.id)
    ).rejects.toMatchObject({
      status: 409,
      message: "O PasTrack precisa de pelo menos um administrador ativo",
    });
    await expect(
      usuarioService.atualizar(unico.usuario.id, { perfil: "GESTOR" }, gestor.usuario.id)
    ).rejects.toMatchObject({ status: 409 });

    const intacto = await prisma.usuario.findUniqueOrThrow({ where: { id: unico.usuario.id } });
    expect(intacto).toMatchObject({ perfil: "ADMINISTRADOR", ativo: true, versaoToken: 0 });
    expect(await prisma.auditoria.count()).toBe(0);
  });

  it("duas desativações simultâneas entre administradores deixam um ativo", async () => {
    const a = await criarAdministrador();
    const b = await criarUsuario({ perfil: "ADMINISTRADOR" });
    const respostas = await Promise.all([
      api().patch(rota(b.usuario.id, "/ativo")).set(autorizacao(a.token)).send({ ativo: false }),
      api().patch(rota(a.usuario.id, "/ativo")).set(autorizacao(b.token)).send({ ativo: false }),
    ]);
    const status = respostas.map((resposta) => resposta.status).sort((x, y) => x - y);
    expect(status[0]).toBe(200);
    expect([401, 409]).toContain(status[1]);
    expect(await prisma.usuario.count({ where: { perfil: "ADMINISTRADOR", ativo: true } })).toBe(1);
  });
});

describe("usuário criado pelo administrador", () => {
  it("passa pelo primeiro acesso até liberar o sistema", async () => {
    const admin = await criarAdministrador();
    const criado = await api()
      .post("/api/usuarios")
      .set(autorizacao(admin.token))
      .send({ nome: "Rita", email: "rita@teste.local", perfil: "COMPRADOR" });
    const senhaTemporaria: string = criado.body.senhaTemporaria;

    const login = await entrar("rita@teste.local", senhaTemporaria);
    expect(login.body.usuario.deveTrocarSenha).toBe(true);
    const bloqueado = await acessarPastilhas(login.body.token);
    expect(bloqueado.status).toBe(403);
    expect(bloqueado.body.codigo).toBe("TROCA_SENHA_OBRIGATORIA");

    const troca = await api()
      .patch("/api/auth/senha")
      .set(autorizacao(login.body.token))
      .send({ senhaAtual: senhaTemporaria, novaSenha: "CompraSegura2026" });
    expect(troca.status).toBe(200);
    expect((await acessarPastilhas(login.body.token)).status).toBe(401);
    expect((await acessarPastilhas(troca.body.token)).status).toBe(200);
  });
});

describe("redefinição da própria senha pela gestão de usuários", () => {
  it("responde 409 e aponta para a troca de senha, sem mexer em nada", async () => {
    const admin = await criarAdministrador();
    const resposta = await api()
      .post(rota(admin.usuario.id, "/redefinir-senha"))
      .set(autorizacao(admin.token));
    expect(resposta.status).toBe(409);
    expect(resposta.body).toEqual({
      erro: "Para trocar a sua própria senha, use a troca de senha (PATCH /api/auth/senha)",
    });

    const depois = await prisma.usuario.findUniqueOrThrow({ where: { id: admin.usuario.id } });
    expect(depois).toMatchObject({ versaoToken: 0, deveTrocarSenha: false });
    expect((await acessarPastilhas(admin.token)).status).toBe(200);
    expect(await prisma.auditoria.count()).toBe(0);
  });
});
