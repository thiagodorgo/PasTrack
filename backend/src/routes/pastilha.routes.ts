import { Router } from "express";
import { pastilhaController } from "../controllers/pastilha.controller";
import { autorizar } from "../middlewares/auth";
import { capturar } from "../middlewares/erros";

export const pastilhaRotas = Router();

pastilhaRotas.get("/", capturar(pastilhaController.listar));
pastilhaRotas.get("/:id", capturar(pastilhaController.buscarPorId));
pastilhaRotas.post("/", autorizar("gerenciarPastilhas"), capturar(pastilhaController.criar));
pastilhaRotas.put("/:id", autorizar("gerenciarPastilhas"), capturar(pastilhaController.atualizar));
