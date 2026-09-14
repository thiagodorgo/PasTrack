import { Router } from "express";
import { autorizar } from "../middlewares/auth";

/** Gestão de usuários: exclusiva de administradores. As rotas entram junto com o módulo de usuários. */
export const usuarioRotas = Router();

usuarioRotas.use(autorizar("gerenciarUsuarios"));
