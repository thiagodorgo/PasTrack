import { Router } from "express";
import { fabricanteController } from "../controllers/fabricante.controller";
import { autorizar } from "../middlewares/auth";
import { capturar } from "../middlewares/erros";
import { validar } from "../middlewares/validar";
import { consultaFabricantesSchema, fabricanteIdParam, fabricanteSchema } from "../schemas/fabricante.schema";

export const fabricanteRotas = Router();

// a permissão vem antes da validação: quem não pode alterar recebe 403 sem ver as regras do corpo
fabricanteRotas.get(
  "/",
  validar({ query: consultaFabricantesSchema }),
  capturar(fabricanteController.listar)
);
fabricanteRotas.get(
  "/:id",
  validar({ params: fabricanteIdParam }),
  capturar(fabricanteController.buscarPorId)
);
fabricanteRotas.post(
  "/",
  autorizar("gerenciarFabricantes"),
  validar({ body: fabricanteSchema }),
  capturar(fabricanteController.criar)
);
fabricanteRotas.put(
  "/:id",
  autorizar("gerenciarFabricantes"),
  validar({ params: fabricanteIdParam, body: fabricanteSchema }),
  capturar(fabricanteController.atualizar)
);
