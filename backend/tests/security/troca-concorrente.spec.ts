import bcrypt from "bcryptjs";
import { describe, expect, it, vi } from "vitest";
import { prisma } from "../../src/config/prisma";
import { redefinirSenhaDoAdministrador } from "../../src/scripts/administrador-inicial";
import { usuarioService } from "../../src/services/usuario.service";
import { api, autorizacao } from "../helpers/api";
import { criarUsuario, SENHA_PADRAO } from "../helpers/fabricas";

const NOVA_SENHA = "NovaSenhaForte2026";
const EMAIL_ALVO = "alvo@teste.local";
const hashOriginal = bcrypt.hash.bind(bcrypt) as (senha: string, custo: number) => Promise<string>;

interface Envolvidos {
  alvoId: number;
  adminId: number;
}
type AcaoConcorrente = (envolvidos: Envolvidos) => Promise<unknown>;

/**
 * Faz a ação do administrador acontecer no meio da troca: depois de a senha atual ser conferida e antes
 * da gravação. O primeiro bcrypt.hash da requisição é o da nova senha, que fica entre as duas etapas.
 */
function noMeioDaTroca(acao: () => Promise<unknown>) {
  vi.spyOn(bcrypt, "hash").mockImplementationOnce((async (senha: string, custo: number) => {
    await acao();
    return hashOriginal(senha, custo);
  }) as never);
}

function trocarSenha(token: string) {
  return api()
    .patch("/api/auth/senha")
    .set(autorizacao(token))
    .send({ senhaAtual: SENHA_PADRAO, novaSenha: NOVA_SENHA });
}

const cenarios: [string, AcaoConcorrente, Record<string, boolean>][] = [
  [
    "a redefinição de senha",
    ({ alvoId, adminId }) => usuarioService.redefinirSenha(alvoId, adminId),
    { deveTrocarSenha: true, ativo: true },
  ],
  [
    "a recuperação pelo script",
    () => redefinirSenhaDoAdministrador({ email: EMAIL_ALVO }),
    { deveTrocarSenha: true, ativo: true },
  ],
  [
    "a desativação",
    ({ alvoId, adminId }) => usuarioService.alterarAtivo(alvoId, false, adminId),
    { deveTrocarSenha: false, ativo: false },
  ],
];

describe("troca de senha concorrente com uma ação do administrador", () => {
  it.each(cenarios)(
    "%s no meio do caminho vence, e a troca responde 401 sem emitir token",
    async (_caso, acao, esperado) => {
      const admin = await criarUsuario({ perfil: "ADMINISTRADOR" });
      const alvo = await criarUsuario({ perfil: "ADMINISTRADOR", email: EMAIL_ALVO });
      noMeioDaTroca(() => acao({ alvoId: alvo.usuario.id, adminId: admin.usuario.id }));

      const troca = await trocarSenha(alvo.token);
      expect(troca.status).toBe(401);
      expect(troca.body).toEqual({ erro: "Sessão expirada. Entre novamente.", codigo: "SESSAO_INVALIDA" });

      const depois = await prisma.usuario.findUniqueOrThrow({ where: { id: alvo.usuario.id } });
      expect(depois).toMatchObject({ ...esperado, versaoToken: alvo.usuario.versaoToken + 1 });
      expect(await bcrypt.compare(NOVA_SENHA, depois.senhaHash)).toBe(false);
      expect(await prisma.auditoria.count({ where: { acao: "usuario.senha_alterada" } })).toBe(0);
    }
  );

  it("sem ação concorrente, a mesma troca grava e devolve um token novo", async () => {
    const alvo = await criarUsuario({ email: EMAIL_ALVO, deveTrocarSenha: true });
    noMeioDaTroca(async () => undefined);

    const troca = await trocarSenha(alvo.token);
    expect(troca.status).toBe(200);
    expect(troca.body).toEqual({ token: expect.any(String) });

    const depois = await prisma.usuario.findUniqueOrThrow({ where: { id: alvo.usuario.id } });
    expect(depois).toMatchObject({ deveTrocarSenha: false, versaoToken: 1 });
    expect(await bcrypt.compare(NOVA_SENHA, depois.senhaHash)).toBe(true);
  });
});
