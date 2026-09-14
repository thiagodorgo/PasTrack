import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

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

export type UsuarioPublico = Prisma.UsuarioGetPayload<{ select: typeof CAMPOS_PUBLICOS }>;

export const usuarioRepository = {
  /** Só para o login: traz o hash da senha e a versão do token. Nunca devolva este objeto numa resposta. */
  buscarCredenciaisPorEmail(email: string) {
    return prisma.usuario.findUnique({
      where: { email },
      select: { ...CAMPOS_PUBLICOS, senhaHash: true, versaoToken: true },
    });
  },

  /** O que o autenticar confere a cada requisição. */
  buscarSessao(id: number) {
    return prisma.usuario.findUnique({
      where: { id },
      select: { id: true, nome: true, perfil: true, ativo: true, deveTrocarSenha: true, versaoToken: true },
    });
  },
};
