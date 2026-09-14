import { Router } from "express";
import { fabricanteController } from "../controllers/fabricante.controller";
import { autorizar } from "../middlewares/auth";
import { capturar } from "../middlewares/erros";

export const fabricanteRotas = Router();

fabricanteRotas.get("/", capturar(fabricanteController.listar));
fabricanteRotas.post("/", autorizar("gerenciarFabricantes"), capturar(fabricanteController.criar));
