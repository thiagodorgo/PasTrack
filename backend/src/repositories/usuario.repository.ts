import { prisma } from "../config/prisma";

export const usuarioRepository = {
  buscarPorEmail(email: string) {
    return prisma.usuario.findUnique({ where: { email } });
  },
};
