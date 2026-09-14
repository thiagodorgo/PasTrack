import { Router } from "express";
import { painelController } from "../controllers/painel.controller";
import { capturar } from "../middlewares/erros";

export const painelRotas = Router();

painelRotas.get("/resumo", capturar(painelController.resumo));
