import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

type Cliente = Prisma.TransactionClient;

/** Campos que podem sair numa resposta da API. senhaHash e versaoToken nunca entram aqui. */
export const CAMPOS_PUBLICOS = {
  id: true,
  nome: true,
  email: true,
  perfil: true,
  ativo: true,
  deveTrocarSenha: true,
  criadoEm: true,
  atualizadoEm: true,
} as const satisfies Prisma.UsuarioSelect;

/** O necessário para emitir um token. */
const CAMPOS_TOKEN = {
  id: true,
  nome: true,
  perfil: true,
  versaoToken: true,
} as const satisfies Prisma.UsuarioSelect;

export type UsuarioPublico = Prisma.UsuarioGetPayload<{ select: typeof CAMPOS_PUBLICOS }>;

export const usuarioRepository = {
  /** Só para o login: traz o hash da senha e a versão do token. Nunca devolva este objeto numa resposta. */
  buscarCredenciaisPorEmail(email: string) {
    return prisma.usuario.findUnique({
      where: { email },
      select: { ...CAMPOS_PUBLICOS, senhaHash: true, versaoToken: true },
    });
  },

  /** Só para a troca de senha: traz o hash da senha atual. */
  buscarCredenciaisPorId(id: number) {
    return prisma.usuario.findUnique({ where: { id }, select: { id: true, email: true, senhaHash: true } });
  },

  /** O que o autenticar confere a cada requisição. */
  buscarSessao(id: number) {
    return prisma.usuario.findUnique({
      where: { id },
      select: { id: true, nome: true, perfil: true, ativo: true, deveTrocarSenha: true, versaoToken: true },
    });
  },

  buscarPorId(id: number, cliente: Cliente = prisma) {
    return cliente.usuario.findUnique({ where: { id }, select: CAMPOS_PUBLICOS });
  },

  /** Grava a senha escolhida pelo próprio usuário, encerra a troca obrigatória e derruba os tokens antigos. */
  trocarSenha(id: number, senhaHash: string, cliente: Cliente = prisma) {
    return cliente.usuario.update({
      where: { id },
      data: { senhaHash, deveTrocarSenha: false, versaoToken: { increment: 1 } },
      select: CAMPOS_TOKEN,
    });
  },
};
