import { Router } from "express";
import { fornecedorController } from "../controllers/fornecedor.controller";
import { autorizar } from "../middlewares/auth";
import { capturar } from "../middlewares/erros";
import { validar } from "../middlewares/validar";
import { idParam } from "../schemas/comum.schema";
import {
  atualizarFornecedorSchema,
  consultaFornecedoresSchema,
  criarFornecedorSchema,
} from "../schemas/fornecedor.schema";

export const fornecedorRotas = Router();

// a permissão vem antes da validação: quem não pode alterar recebe 403 sem ver as regras do corpo
fornecedorRotas.get(
  "/",
  validar({ query: consultaFornecedoresSchema }),
  capturar(fornecedorController.listar)
);
fornecedorRotas.get("/:id", validar({ params: idParam }), capturar(fornecedorController.buscarPorId));
fornecedorRotas.post(
  "/",
  autorizar("gerenciarFornecedores"),
  validar({ body: criarFornecedorSchema }),
  capturar(fornecedorController.criar)
);
fornecedorRotas.put(
  "/:id",
  autorizar("gerenciarFornecedores"),
  validar({ params: idParam, body: atualizarFornecedorSchema }),
  capturar(fornecedorController.atualizar)
);
