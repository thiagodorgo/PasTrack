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

  listar() {
    return prisma.usuario.findMany({ select: CAMPOS_PUBLICOS, orderBy: [{ nome: "asc" }, { id: "asc" }] });
  },

  criar(dados: Prisma.UsuarioCreateInput, cliente: Cliente = prisma) {
    return cliente.usuario.create({ data: dados, select: CAMPOS_PUBLICOS });
  },

  atualizar(id: number, dados: Prisma.UsuarioUpdateInput, cliente: Cliente = prisma) {
    return cliente.usuario.update({ where: { id }, data: dados, select: CAMPOS_PUBLICOS });
  },

  /**
   * Grava a senha escolhida pelo próprio usuário, encerra a troca obrigatória e derruba os tokens antigos,
   * mas só se nada mudou desde a conferência: mesma versão de token da sessão, mesmo hash conferido e
   * usuário ativo. Devolve quantas linhas mudaram; zero significa que outra mudança chegou antes.
   */
  trocarSenhaSeInalterada(
    id: number,
    conferido: { versaoToken: number; senhaHash: string },
    novoHash: string,
    cliente: Cliente = prisma
  ) {
    return cliente.usuario.updateMany({
      where: { id, versaoToken: conferido.versaoToken, senhaHash: conferido.senhaHash, ativo: true },
      data: { senhaHash: novoHash, deveTrocarSenha: false, versaoToken: { increment: 1 } },
    });
  },

  buscarDadosDoToken(id: number, cliente: Cliente = prisma) {
    return cliente.usuario.findUniqueOrThrow({ where: { id }, select: CAMPOS_TOKEN });
  },

  /**
   * Grava uma senha definida por outra pessoa (administrador ou script de recuperação): obriga a troca
   * no próximo acesso e derruba os tokens antigos. Com reativar, também reativa o usuário.
   */
  redefinirSenha(
    id: number,
    senhaHash: string,
    { cliente = prisma, reativar = false }: { cliente?: Cliente; reativar?: boolean } = {}
  ) {
    return cliente.usuario.update({
      where: { id },
      data: {
        senhaHash,
        deveTrocarSenha: true,
        versaoToken: { increment: 1 },
        ...(reativar ? { ativo: true } : {}),
      },
      select: CAMPOS_PUBLICOS,
    });
  },

  /**
   * Trava as linhas dos administradores ativos até o fim da transação e devolve os ids, sempre na mesma
   * ordem. Duas remoções simultâneas esperam uma pela outra, e a segunda já enxerga o resultado da primeira.
   * FOR NO KEY UPDATE, e não FOR UPDATE, para não bloquear a checagem de chave estrangeira (FOR KEY SHARE)
   * que a auditoria faz na linha do administrador autor: isso evita deadlock com ações cruzadas.
   */
  async travarAdministradoresAtivos(cliente: Cliente): Promise<number[]> {
    const linhas = await cliente.$queryRaw<{ id: number }[]>`
      SELECT id FROM "usuario" WHERE perfil = 'ADMINISTRADOR' AND ativo = true ORDER BY id FOR NO KEY UPDATE
    `;
    return linhas.map((linha) => linha.id);
  },
};
