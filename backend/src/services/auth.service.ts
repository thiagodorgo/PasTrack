import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { UsuarioToken } from "../middlewares/auth";
import { AppError } from "../middlewares/erros";
import { usuarioRepository } from "../repositories/usuario.repository";

export function gerarToken(usuario: UsuarioToken): string {
  return jwt.sign({ id: usuario.id, nome: usuario.nome, perfil: usuario.perfil }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export const authService = {
  async login(email: string, senha: string) {
    const usuario = await usuarioRepository.buscarPorEmail(email.trim().toLowerCase());

    if (!usuario || !usuario.ativo) {
      throw new AppError("E-mail ou senha inválidos", 401);
    }

    const senhaConfere = await bcrypt.compare(senha, usuario.senhaHash);
    if (!senhaConfere) {
      throw new AppError("E-mail ou senha inválidos", 401);
    }

    return {
      token: gerarToken(usuario),
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil },
    };
  },
};
