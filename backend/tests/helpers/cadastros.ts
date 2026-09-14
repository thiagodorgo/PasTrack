import { PerfilUsuario } from "@prisma/client";
import { prisma } from "../../src/config/prisma";
import { autorizacao } from "./api";
import { criarUsuario } from "./fabricas";

/** Cria um usuário do perfil e devolve o cabeçalho de autorização dele. */
export async function entrarComo(perfil: PerfilUsuario) {
  const { usuario, token } = await criarUsuario({ perfil });
  return { usuario, cabecalho: autorizacao(token) };
}

/** Trilha de auditoria de um registro, da mais antiga para a mais recente. */
export function auditoriasDe(entidade: string, entidadeId: number) {
  return prisma.auditoria.findMany({ where: { entidade, entidadeId }, orderBy: { id: "asc" } });
}

let sequencia = 0;

/** Fornecedor com CNPJ e contato, gravado direto no banco. */
export function criarFornecedorCompleto(dados: { nome?: string; cnpj?: string; contato?: string } = {}) {
  sequencia += 1;
  return prisma.fornecedor.create({
    data: {
      nome: dados.nome ?? `Fornecedor completo ${sequencia}`,
      cnpj: dados.cnpj ?? null,
      contato: dados.contato ?? null,
    },
  });
}
