import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";
import { prisma } from "../../src/config/prisma";
import { criarAdministradorInicial } from "../../src/scripts/administrador-inicial";
import { criarDadosDeDemonstracao } from "../../src/scripts/dados-demonstracao";

describe("criarAdministradorInicial", () => {
  it("cria o administrador uma vez e nunca troca a senha depois", async () => {
    const primeiro = await criarAdministradorInicial({
      email: " Admin@Teste.Local ",
      senha: "SenhaForte123",
    });
    expect(primeiro).toEqual({ criado: true, email: "admin@teste.local", senhaGerada: undefined });
    const antes = await prisma.usuario.findUniqueOrThrow({ where: { email: "admin@teste.local" } });
    expect(antes.perfil).toBe("ADMINISTRADOR");

    const segundo = await criarAdministradorInicial({ email: "admin@teste.local", senha: "OutraSenha456" });
    expect(segundo.criado).toBe(false);
    const depois = await prisma.usuario.findUniqueOrThrow({ where: { email: "admin@teste.local" } });
    expect(depois.senhaHash).toBe(antes.senhaHash);
    expect(await bcrypt.compare("SenhaForte123", depois.senhaHash)).toBe(true);
    expect(await prisma.usuario.count()).toBe(1);
  });

  it("recusa senha fraca sem criar nada", async () => {
    await expect(criarAdministradorInicial({ email: "admin@teste.local", senha: "123" })).rejects.toThrow(
      "política de senha"
    );
    expect(await prisma.usuario.count()).toBe(0);
  });

  it("gera uma senha aleatória válida em desenvolvimento", async () => {
    const resultado = await criarAdministradorInicial({
      email: "admin@teste.local",
      ambiente: "development",
    });
    expect(resultado.criado).toBe(true);
    expect(resultado.senhaGerada).toMatch(/^[\w-]{22}$/);
    const usuario = await prisma.usuario.findUniqueOrThrow({ where: { email: "admin@teste.local" } });
    expect(await bcrypt.compare(resultado.senhaGerada ?? "", usuario.senhaHash)).toBe(true);
  });

  it("exige a senha em produção", async () => {
    await expect(
      criarAdministradorInicial({ email: "admin@teste.local", ambiente: "production" })
    ).rejects.toThrow("SEED_ADMIN_SENHA");
  });
});

describe("criarDadosDeDemonstracao", () => {
  it("é idempotente e abre alerta só para o item abaixo do mínimo", async () => {
    await criarDadosDeDemonstracao("Demonstracao2026");
    await criarDadosDeDemonstracao("Demonstracao2026");
    expect(await prisma.usuario.count()).toBe(3);
    expect(await prisma.fabricante.count()).toBe(2);
    expect(await prisma.fornecedor.count()).toBe(2);
    expect(await prisma.pastilha.count()).toBe(3);
    const alertas = await prisma.alerta.findMany({ include: { pastilha: true } });
    expect(alertas).toHaveLength(1);
    expect(alertas[0].pastilha.codigo).toBe("WNMG 080408-TF");
    expect(alertas[0].situacao).toBe("ABERTO");
  });

  it("recusa senha fraca para os usuários de demonstração", async () => {
    await expect(criarDadosDeDemonstracao("fraca")).rejects.toThrow("política de senha");
  });
});
