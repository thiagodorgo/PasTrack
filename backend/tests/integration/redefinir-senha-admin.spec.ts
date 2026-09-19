import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";
import { prisma } from "../../src/config/prisma";
import { redefinirSenhaDoAdministrador } from "../../src/scripts/administrador-inicial";
import { executarRedefinicao, Saida } from "../../src/scripts/redefinir-senha-admin";
import { api, autorizacao } from "../helpers/api";
import { criarUsuario } from "../helpers/fabricas";

const EMAIL = "admin@teste.local";
const SENHA_ESCOLHIDA = "Recupera2026forte";

function saidaEmMemoria() {
  const linhas: string[] = [];
  const erros: string[] = [];
  const saida: Saida = {
    log: (mensagem) => {
      linhas.push(mensagem);
    },
    error: (mensagem) => {
      erros.push(mensagem);
    },
  };
  return { linhas, erros, saida };
}

describe("redefinirSenhaDoAdministrador", () => {
  it("reativa, gera senha temporária, obriga a troca e derruba as sessões", async () => {
    const { usuario, token } = await criarUsuario({ perfil: "ADMINISTRADOR", email: EMAIL });
    await prisma.usuario.update({ where: { id: usuario.id }, data: { ativo: false } });

    const resultado = await redefinirSenhaDoAdministrador({ email: " Admin@Teste.Local " });
    expect(resultado.email).toBe(EMAIL);
    const senha = resultado.senhaGerada ?? "";
    expect(senha).toHaveLength(22);

    const depois = await prisma.usuario.findUniqueOrThrow({ where: { id: usuario.id } });
    expect(depois).toMatchObject({
      ativo: true,
      deveTrocarSenha: true,
      versaoToken: usuario.versaoToken + 1,
    });
    expect(await bcrypt.compare(senha, depois.senhaHash)).toBe(true);

    expect((await api().get("/api/auth/me").set(autorizacao(token))).status).toBe(401);
    const login = await api().post("/api/auth/login").send({ email: EMAIL, senha });
    expect(login.status).toBe(200);
    expect(login.body.usuario.deveTrocarSenha).toBe(true);

    const auditoria = await prisma.auditoria.findFirstOrThrow({
      where: { acao: "usuario.acesso_recuperado" },
    });
    expect(auditoria).toMatchObject({ usuarioId: null, entidade: "usuario", entidadeId: usuario.id });
    expect(JSON.stringify(auditoria)).not.toContain(senha);
  });

  it("usa a NOVA_SENHA informada quando ela atende à política", async () => {
    const { usuario } = await criarUsuario({ perfil: "ADMINISTRADOR", email: EMAIL });
    const resultado = await redefinirSenhaDoAdministrador({ email: EMAIL, novaSenha: SENHA_ESCOLHIDA });
    expect(resultado).toEqual({ email: EMAIL, senhaGerada: undefined });
    const depois = await prisma.usuario.findUniqueOrThrow({ where: { id: usuario.id } });
    expect(await bcrypt.compare(SENHA_ESCOLHIDA, depois.senhaHash)).toBe(true);
    expect(depois.deveTrocarSenha).toBe(true);
  });

  it("recusa NOVA_SENHA fora da política sem alterar nada", async () => {
    const { usuario } = await criarUsuario({ perfil: "ADMINISTRADOR", email: EMAIL, ativo: false });
    await expect(redefinirSenhaDoAdministrador({ email: EMAIL, novaSenha: "fraca" })).rejects.toThrow(
      "política de senha"
    );
    const depois = await prisma.usuario.findUniqueOrThrow({ where: { id: usuario.id } });
    expect(depois).toMatchObject({ ativo: false, versaoToken: 0, senhaHash: usuario.senhaHash });
    expect(await prisma.auditoria.count()).toBe(0);
  });

  it("recusa e-mail inexistente", async () => {
    await expect(redefinirSenhaDoAdministrador({ email: "ninguem@teste.local" })).rejects.toThrow(
      "Nenhum usuário cadastrado com o e-mail ninguem@teste.local."
    );
  });

  it("recusa usuário que não é ADMINISTRADOR", async () => {
    const { usuario } = await criarUsuario({ perfil: "GESTOR", email: "gestor@teste.local" });
    await expect(redefinirSenhaDoAdministrador({ email: "gestor@teste.local" })).rejects.toThrow(
      "não é ADMINISTRADOR"
    );
    const depois = await prisma.usuario.findUniqueOrThrow({ where: { id: usuario.id } });
    expect(depois.versaoToken).toBe(0);
  });
});

describe("linha de comando redefinir-senha-admin", () => {
  it("exibe a senha gerada uma única vez e sai com 0", async () => {
    await criarUsuario({ perfil: "ADMINISTRADOR", email: EMAIL });
    const { linhas, erros, saida } = saidaEmMemoria();

    expect(await executarRedefinicao([EMAIL], {}, saida)).toBe(0);
    expect(erros).toEqual([]);
    const senha = linhas[linhas.length - 1];
    expect(senha).toHaveLength(22);
    expect(linhas.filter((linha) => linha.includes(senha))).toHaveLength(1);
    const gravado = await prisma.usuario.findUniqueOrThrow({ where: { email: EMAIL } });
    expect(await bcrypt.compare(senha, gravado.senhaHash)).toBe(true);
  });

  it("com NOVA_SENHA não exibe a senha", async () => {
    await criarUsuario({ perfil: "ADMINISTRADOR", email: EMAIL });
    const { linhas, saida } = saidaEmMemoria();
    expect(await executarRedefinicao([EMAIL], { NOVA_SENHA: SENHA_ESCOLHIDA }, saida)).toBe(0);
    expect(linhas.join(" ")).not.toContain(SENHA_ESCOLHIDA);
    expect(linhas.join(" ")).toContain("NOVA_SENHA");
  });

  it("sem e-mail mostra como usar e sai com 1", async () => {
    const { linhas, erros, saida } = saidaEmMemoria();
    expect(await executarRedefinicao([], {}, saida)).toBe(1);
    expect(linhas).toEqual([]);
    expect(erros.join(" ")).toContain("redefinir-senha-admin.js");
  });

  it("transforma falhas em mensagem e código 1", async () => {
    const { erros, saida } = saidaEmMemoria();
    expect(await executarRedefinicao(["ninguem@teste.local"], {}, saida)).toBe(1);
    expect(erros).toEqual(["Nenhum usuário cadastrado com o e-mail ninguem@teste.local."]);
  });
});
