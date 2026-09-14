import { Router } from "express";
import { usuarioController } from "../controllers/usuario.controller";
import { autorizar } from "../middlewares/auth";
import { capturar } from "../middlewares/erros";
import { validar } from "../middlewares/validar";
import {
  alterarAtivoSchema,
  atualizarUsuarioSchema,
  criarUsuarioSchema,
  usuarioIdParam,
} from "../schemas/usuario.schema";

/** Gestão de usuários: exclusiva de administradores. */
export const usuarioRotas = Router();

usuarioRotas.use(autorizar("gerenciarUsuarios"));

usuarioRotas.get("/", capturar(usuarioController.listar));
usuarioRotas.post("/", validar({ body: criarUsuarioSchema }), capturar(usuarioController.criar));
usuarioRotas.put(
  "/:id",
  validar({ params: usuarioIdParam, body: atualizarUsuarioSchema }),
  capturar(usuarioController.atualizar)
);
usuarioRotas.patch(
  "/:id/ativo",
  validar({ params: usuarioIdParam, body: alterarAtivoSchema }),
  capturar(usuarioController.alterarAtivo)
);
usuarioRotas.post(
  "/:id/redefinir-senha",
  validar({ params: usuarioIdParam }),
  capturar(usuarioController.redefinirSenha)
);
