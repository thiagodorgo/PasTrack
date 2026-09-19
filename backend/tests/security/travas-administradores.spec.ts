import { describe, expect, it } from "vitest";
import { prisma } from "../../src/config/prisma";
import { usuarioService } from "../../src/services/usuario.service";
import { api, autorizacao } from "../helpers/api";
import { criarUsuario } from "../helpers/fabricas";

function esperar(milissegundos: number) {
  return new Promise((resolver) => setTimeout(resolver, milissegundos));
}

describe("trava dos administradores ativos com ações cruzadas", () => {
  it("A redefine a senha de B enquanto B desativa A: as duas terminam, sem deadlock", async () => {
    const a = await criarUsuario({ perfil: "ADMINISTRADOR" });
    const b = await criarUsuario({ perfil: "ADMINISTRADOR" });

    // O que a redefinição de A faz no banco, com uma pausa no meio: trava a linha de B e depois grava a
    // auditoria com A como autor, o que pede FOR KEY SHARE na linha de A.
    let liberarDesativacao!: () => void;
    const desativacaoPodeComecar = new Promise<void>((resolver) => {
      liberarDesativacao = resolver;
    });
    const redefinicao = prisma.$transaction(
      async (tx) => {
        await tx.usuario.update({ where: { id: b.usuario.id }, data: { versaoToken: { increment: 1 } } });
        liberarDesativacao();
        // tempo para a desativação travar a linha de A e ficar esperando a de B
        await esperar(300);
        await tx.auditoria.create({
          data: {
            usuarioId: a.usuario.id,
            acao: "usuario.senha_redefinida",
            entidade: "usuario",
            entidadeId: b.usuario.id,
          },
        });
      },
      { timeout: 10_000 }
    );
    // B desativa A: trava as linhas dos administradores ativos na ordem de id (A, depois B)
    const desativacao = desativacaoPodeComecar.then(() =>
      usuarioService.alterarAtivo(a.usuario.id, false, b.usuario.id)
    );

    const resultados = await Promise.allSettled([redefinicao, desativacao]);
    expect(resultados.map((resultado) => resultado.status)).toEqual(["fulfilled", "fulfilled"]);
    const depoisA = await prisma.usuario.findUniqueOrThrow({ where: { id: a.usuario.id } });
    expect(depoisA.ativo).toBe(false);
  });

  it("pela API, as duas ações cruzadas em Promise.all nunca dão erro 500", async () => {
    for (let rodada = 1; rodada <= 5; rodada++) {
      const a = await criarUsuario({ perfil: "ADMINISTRADOR" });
      const b = await criarUsuario({ perfil: "ADMINISTRADOR" });

      const [redefinir, desativar] = await Promise.all([
        api()
          .post("/api/usuarios/" + b.usuario.id + "/redefinir-senha")
          .set(autorizacao(a.token)),
        api()
          .patch("/api/usuarios/" + a.usuario.id + "/ativo")
          .set(autorizacao(b.token))
          .send({ ativo: false }),
      ]);

      // quem chega depois pode encontrar a própria sessão já derrubada pela outra ação (401)
      expect([200, 401], "rodada " + rodada).toContain(redefinir.status);
      expect([200, 401], "rodada " + rodada).toContain(desativar.status);
      expect([redefinir.status, desativar.status]).toContain(200);
    }
    expect(await prisma.usuario.count({ where: { perfil: "ADMINISTRADOR", ativo: true } })).toBeGreaterThan(
      0
    );
  });
});
