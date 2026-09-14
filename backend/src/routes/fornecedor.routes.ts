import { Router } from "express";
import { fornecedorController } from "../controllers/fornecedor.controller";
import { autorizar } from "../middlewares/auth";
import { capturar } from "../middlewares/erros";

export const fornecedorRotas = Router();

fornecedorRotas.get("/", capturar(fornecedorController.listar));
fornecedorRotas.post("/", autorizar("gerenciarFornecedores"), capturar(fornecedorController.criar));
