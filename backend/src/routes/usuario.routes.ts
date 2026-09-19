import { Router } from "express";
import { usuarioController } from "../controllers/usuario.controller";
import { autorizar } from "../middlewares/auth";
import { capturar } from "../middlewares/erros";
import { validar } from "../middlewares/validar";
import { idParam } from "../schemas/comum.schema";
import {
  alterarAtivoSchema,
  atualizarUsuarioSchema,
  criarUsuarioSchema,
  semCampos,
} from "../schemas/usuario.schema";

/** Gestão de usuários: exclusiva de administradores. */
export const usuarioRotas = Router();

usuarioRotas.use(autorizar("gerenciarUsuarios"));

usuarioRotas.get("/", validar({ query: semCampos }), capturar(usuarioController.listar));
usuarioRotas.post("/", validar({ body: criarUsuarioSchema }), capturar(usuarioController.criar));
usuarioRotas.put(
  "/:id",
  validar({ params: idParam, body: atualizarUsuarioSchema }),
  capturar(usuarioController.atualizar)
);
usuarioRotas.patch(
  "/:id/ativo",
  validar({ params: idParam, body: alterarAtivoSchema }),
  capturar(usuarioController.alterarAtivo)
);
usuarioRotas.post(
  "/:id/redefinir-senha",
  validar({ params: idParam, body: semCampos }),
  capturar(usuarioController.redefinirSenha)
);
