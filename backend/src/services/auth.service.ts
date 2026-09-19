import { PerfilUsuario } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { prisma } from "../config/prisma";
import { AppError } from "../middlewares/erros";
import { usuarioRepository } from "../repositories/usuario.repository";
import { ID_MAXIMO } from "../schemas/comum.schema";
import { registrarAuditoria } from "./auditoria.service";
import { validarPoliticaDeSenha } from "./politica-senha";

const ALGORITMO = "HS256";
export const EMISSOR_TOKEN = "pastrack-api";
export const PUBLICO_TOKEN = "pastrack-web";

export interface DadosDoToken {
  id: number;
  nome: string;
  perfil: PerfilUsuario;
  versaoToken: number;
}

/** Formato exato de um token emitido pela API. Qualquer outro conteúdo é recusado. */
const esquemaPayload = z.object({
  sub: z
    .string()
    .regex(/^[1-9]\d{0,9}$/)
    .transform(Number)
    .pipe(z.number().max(ID_MAXIMO)),
  nome: z.string(),
  perfil: z.enum(PerfilUsuario),
  v: z.number().int().min(0),
});

export function sessaoInvalida() {
  return new AppError("Sessão expirada. Entre novamente.", 401, "SESSAO_INVALIDA");
}

export function gerarToken(usuario: DadosDoToken): string {
  return jwt.sign(
    { sub: String(usuario.id), nome: usuario.nome, perfil: usuario.perfil, v: usuario.versaoToken },
    env.JWT_SECRET,
    {
      algorithm: ALGORITMO,
      issuer: EMISSOR_TOKEN,
      audience: PUBLICO_TOKEN,
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    }
  );
}

/** Confere assinatura, algoritmo, emissor, público, validade e formato. Lança erro se algo não bater. */
export function verificarToken(token: string): { id: number; versaoToken: number } {
  const payload = jwt.verify(token, env.JWT_SECRET, {
    algorithms: [ALGORITMO],
    issuer: EMISSOR_TOKEN,
    audience: PUBLICO_TOKEN,
  });
  const dados = esquemaPayload.parse(payload);
  return { id: dados.sub, versaoToken: dados.v };
}

// Hash de uma senha que ninguém conhece, com o mesmo custo das senhas reais. Quando o e-mail não existe,
// o login compara contra ele e responde no mesmo tempo de uma senha errada, sem revelar quem tem conta.
const hashFalso = bcrypt.hash(randomBytes(32).toString("base64url"), env.BCRYPT_CUSTO);

/**
 * Nova senha diferente da atual e dentro da política. As falhas saem como 400 DADOS_INVALIDOS, cada
 * problema em campos apontando novaSenha, para o frontend mostrar junto do campo.
 */
function esquemaNovaSenha(senhaAtual: string, email: string) {
  return z.object({
    novaSenha: z.string().superRefine((valor, contexto) => {
      const problemas =
        valor === senhaAtual
          ? ["a nova senha precisa ser diferente da atual"]
          : validarPoliticaDeSenha(valor, email);
      for (const problema of problemas) {
        contexto.addIssue({ code: "custom", message: problema });
      }
    }),
  });
}

/**
 * Quando o BCRYPT_CUSTO muda, os hashes gravados continuam no custo antigo, e o tempo do login passa a diferir
 * do hash falso, o que revela quais e-mails existem. Depois de um login certo, a senha é regravada no custo
 * atual, sem mexer na sessão. Uma falha aqui não impede o login.
 */
async function regravarHashSeCustoMudou(id: number, senha: string, senhaHash: string) {
  if (bcrypt.getRounds(senhaHash) === env.BCRYPT_CUSTO) return;
  try {
    await usuarioRepository.atualizar(id, { senhaHash: await bcrypt.hash(senha, env.BCRYPT_CUSTO) });
  } catch (erro) {
    logger.warn({ err: erro, usuarioId: id }, "não foi possível regravar o hash da senha no custo atual");
  }
}

function credenciaisInvalidas() {
  return new AppError("E-mail ou senha inválidos", 401);
}

export const authService = {
  async login(email: string, senha: string) {
    const usuario = await usuarioRepository.buscarCredenciaisPorEmail(email.trim().toLowerCase());
    // compara sempre, até para usuário inexistente ou inativo, para o tempo de resposta não denunciar nada
    const senhaConfere = await bcrypt.compare(senha, usuario?.senhaHash ?? (await hashFalso));
    if (!usuario || !senhaConfere || !usuario.ativo) {
      throw credenciaisInvalidas();
    }
    await regravarHashSeCustoMudou(usuario.id, senha, usuario.senhaHash);

    return {
      token: gerarToken(usuario),
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        deveTrocarSenha: usuario.deveTrocarSenha,
      },
    };
  },

  /** Dados do usuário logado, no mesmo formato do login. */
  async me(id: number) {
    const usuario = await usuarioRepository.buscarPorId(id);
    if (!usuario) {
      throw sessaoInvalida();
    }
    const { nome, email, perfil, deveTrocarSenha } = usuario;
    return { id, nome, email, perfil, deveTrocarSenha };
  },

  /**
   * Troca a senha do próprio usuário: confere a senha atual, aplica a política, encerra a troca obrigatória
   * e incrementa a versão do token, o que derruba as outras sessões. Devolve um token novo.
   * A gravação é condicional: se, entre a conferência e a gravação, a senha foi redefinida, o acesso foi
   * recuperado ou o usuário foi desativado, a mudança do administrador vence e a troca responde 401.
   */
  async trocarSenha(id: number, versaoDaSessao: number, senhaAtual: string, novaSenha: string) {
    const usuario = await usuarioRepository.buscarCredenciaisPorId(id);
    if (!usuario) {
      throw sessaoInvalida();
    }
    if (!(await bcrypt.compare(senhaAtual, usuario.senhaHash))) {
      // 400 e não 401: um 401 faria o frontend encerrar a sessão
      throw new AppError("A senha atual não confere", 400, "SENHA_ATUAL_INCORRETA");
    }
    esquemaNovaSenha(senhaAtual, usuario.email).parse({ novaSenha });

    const senhaHash = await bcrypt.hash(novaSenha, env.BCRYPT_CUSTO);
    const atualizado = await prisma.$transaction(async (tx) => {
      const { count } = await usuarioRepository.trocarSenhaSeInalterada(
        id,
        { versaoToken: versaoDaSessao, senhaHash: usuario.senhaHash },
        senhaHash,
        tx
      );
      if (count === 0) {
        throw sessaoInvalida();
      }
      await registrarAuditoria(tx, {
        usuarioId: id,
        acao: "usuario.senha_alterada",
        entidade: "usuario",
        entidadeId: id,
      });
      return usuarioRepository.buscarDadosDoToken(id, tx);
    });
    return { token: gerarToken(atualizado) };
  },
};
