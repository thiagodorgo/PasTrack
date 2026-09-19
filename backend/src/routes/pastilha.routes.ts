import { Router } from "express";
import { pastilhaController } from "../controllers/pastilha.controller";
import { autorizar } from "../middlewares/auth";
import { capturar } from "../middlewares/erros";
import { validar } from "../middlewares/validar";
import { idParam } from "../schemas/comum.schema";
import {
  atualizarPastilhaSchema,
  consultaPastilhasSchema,
  criarPastilhaSchema,
} from "../schemas/pastilha.schema";

export const pastilhaRotas = Router();

// a permissão vem antes da validação: quem não pode alterar recebe 403 sem ver as regras do corpo
pastilhaRotas.get("/", validar({ query: consultaPastilhasSchema }), capturar(pastilhaController.listar));
pastilhaRotas.get("/:id", validar({ params: idParam }), capturar(pastilhaController.buscarPorId));
pastilhaRotas.post(
  "/",
  autorizar("gerenciarPastilhas"),
  validar({ body: criarPastilhaSchema }),
  capturar(pastilhaController.criar)
);
pastilhaRotas.put(
  "/:id",
  autorizar("gerenciarPastilhas"),
  validar({ params: idParam, body: atualizarPastilhaSchema }),
  capturar(pastilhaController.atualizar)
);
