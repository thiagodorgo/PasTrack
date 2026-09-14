import bcrypt from "bcryptjs";

import { env, Env } from "../config/env";
import { prisma } from "../config/prisma";
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
