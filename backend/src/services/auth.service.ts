import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AppError } from "../middlewares/erros";
import { usuarioRepository } from "../repositories/usuario.repository";

export const authService = {
  async login(email: string, senha: string) {
    const usuario = await usuarioRepository.buscarPorEmail(email);

    if (!usuario || !usuario.ativo) {
      throw new AppError("E-mail ou senha inválidos", 401);
    }

    const senhaConfere = await bcrypt.compare(senha, usuario.senhaHash);
    if (!senhaConfere) {
      throw new AppError("E-mail ou senha inválidos", 401);
    }

    const token = jwt.sign(
      { id: usuario.id, nome: usuario.nome, perfil: usuario.perfil },
      process.env.JWT_SECRET as string,
      { expiresIn: "8h" }
    );

    return {
      token,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil },
    };
  },
};
