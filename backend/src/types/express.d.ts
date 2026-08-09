import { UsuarioToken } from "../middlewares/auth";

declare module "express-serve-static-core" {
  interface Request {
    usuario?: UsuarioToken;
  }
}
