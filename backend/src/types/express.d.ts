import { UsuarioAutenticado } from "../middlewares/auth";

declare module "express-serve-static-core" {
  interface Request {
    /** Preenchido por autenticar com os dados atuais do banco, nunca só com o que vem no token. */
    usuario?: UsuarioAutenticado;
  }
}
