import bcrypt from "bcryptjs";

import { env, Env } from "../config/env";
import { prisma } from "../config/prisma";
import { usuarioRepository } from "../repositories/usuario.repository";
import { registrarAuditoria } from "../services/auditoria.service";
import { gerarSenhaAleatoria, validarPoliticaDeSenha } from "../services/politica-senha";

// continua exportada daqui para quem já importava deste módulo, como o seed-demo.ts
export { gerarSenhaAleatoria };

export interface OpcoesAdministrador {
  email: string;
  senha?: string;
  nome?: string;
  ambiente?: Env["NODE_ENV"];
}

export interface ResultadoAdministrador {
  criado: boolean;
  email: string;
  /** Preenchida só quando a senha foi gerada aqui; deve ser exibida uma única vez. */
  senhaGerada?: string;
}

/**
 * Cria o administrador inicial. É idempotente: se o e-mail já existe, não altera nada,
 * nem a senha. Em produção a senha precisa ser informada.
 */
export async function criarAdministradorInicial(
  opcoes: OpcoesAdministrador
): Promise<ResultadoAdministrador> {
  const email = opcoes.email.trim().toLowerCase();
  const ambiente = opcoes.ambiente ?? env.NODE_ENV;

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) {
    return { criado: false, email };
  }

  let senha = opcoes.senha;
  let senhaGerada: string | undefined;
  if (!senha) {
    if (ambiente === "production") {
      throw new Error("Defina SEED_ADMIN_SENHA para criar o administrador inicial em produção.");
    }
    senha = gerarSenhaAleatoria(email);
    senhaGerada = senha;
  }

  const problemas = validarPoliticaDeSenha(senha, email);
  if (problemas.length > 0) {
    throw new Error(`A senha do administrador não atende à política de senha: ${problemas.join("; ")}.`);
  }

  await prisma.usuario.create({
    data: {
      nome: opcoes.nome ?? "Administrador",
      email,
      senhaHash: await bcrypt.hash(senha, env.BCRYPT_CUSTO),
      perfil: "ADMINISTRADOR",
    },
  });

  return { criado: true, email, senhaGerada };
}

export interface OpcoesRecuperacao {
  email: string;
  /** Senha escolhida pelo operador (variável NOVA_SENHA). Sem ela, uma senha temporária é gerada. */
  novaSenha?: string;
}

export interface ResultadoRecuperacao {
  email: string;
  /** Preenchida só quando a senha foi gerada aqui; deve ser exibida uma única vez. */
  senhaGerada?: string;
}

/**
 * Recupera o acesso de um administrador: reativa o usuário, grava uma senha temporária (ou a informada),
 * obriga a troca no próximo acesso e derruba todas as sessões dele. Só vale para ADMINISTRADOR; os
 * demais perfis têm a senha redefinida pela tela de usuários.
 */
export async function redefinirSenhaDoAdministrador(
  opcoes: OpcoesRecuperacao
): Promise<ResultadoRecuperacao> {
  const email = opcoes.email.trim().toLowerCase();
  const usuario = await prisma.usuario.findUnique({ where: { email }, select: { id: true, perfil: true } });
  if (!usuario) {
    throw new Error(`Nenhum usuário cadastrado com o e-mail ${email}.`);
  }
  if (usuario.perfil !== "ADMINISTRADOR") {
    throw new Error(`O usuário ${email} não é ADMINISTRADOR. Redefina a senha dele pela tela de usuários.`);
  }

  const senha = opcoes.novaSenha || gerarSenhaAleatoria(email);
  const problemas = validarPoliticaDeSenha(senha, email);
  if (problemas.length > 0) {
    throw new Error(`A senha de NOVA_SENHA não atende à política de senha: ${problemas.join("; ")}.`);
  }

  const senhaHash = await bcrypt.hash(senha, env.BCRYPT_CUSTO);
  await prisma.$transaction(async (tx) => {
    await usuarioRepository.redefinirSenha(usuario.id, senhaHash, { cliente: tx, reativar: true });
    await registrarAuditoria(tx, {
      usuarioId: null,
      acao: "usuario.acesso_recuperado",
      entidade: "usuario",
      entidadeId: usuario.id,
      depois: { ativo: true, deveTrocarSenha: true, origem: "redefinir-senha-admin" },
    });
  });

  return { email, senhaGerada: opcoes.novaSenha ? undefined : senha };
}
