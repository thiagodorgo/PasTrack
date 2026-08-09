import { Router } from "express";
import { alertaController } from "../controllers/alerta.controller";
import { authController } from "../controllers/auth.controller";
import { fabricanteController } from "../controllers/fabricante.controller";
import { fornecedorController } from "../controllers/fornecedor.controller";
import { movimentacaoController } from "../controllers/movimentacao.controller";
import { painelController } from "../controllers/painel.controller";
import { pastilhaController } from "../controllers/pastilha.controller";
import { autenticar, autorizar } from "../middlewares/auth";
import { capturar } from "../middlewares/erros";

export const rotas = Router();

rotas.post("/auth/login", capturar(authController.login));

// tudo abaixo exige usuário autenticado
rotas.use(autenticar);

rotas.get("/painel/resumo", capturar(painelController.resumo));

rotas.get("/pastilhas", capturar(pastilhaController.listar));
rotas.get("/pastilhas/:id", capturar(pastilhaController.buscarPorId));
rotas.post("/pastilhas", autorizar("ADMINISTRADOR", "GESTOR"), capturar(pastilhaController.criar));
rotas.put("/pastilhas/:id", autorizar("ADMINISTRADOR", "GESTOR"), capturar(pastilhaController.atualizar));

rotas.get("/fabricantes", capturar(fabricanteController.listar));
rotas.post("/fabricantes", autorizar("ADMINISTRADOR", "GESTOR"), capturar(fabricanteController.criar));

rotas.get("/fornecedores", capturar(fornecedorController.listar));
rotas.post("/fornecedores", autorizar("ADMINISTRADOR", "GESTOR"), capturar(fornecedorController.criar));

rotas.get("/movimentacoes", capturar(movimentacaoController.listar));
rotas.post(
  "/movimentacoes",
  autorizar("ADMINISTRADOR", "GESTOR", "OPERADOR"),
  capturar(movimentacaoController.registrar)
);

rotas.get("/alertas", capturar(alertaController.listar));
rotas.patch("/alertas/:id/resolver", autorizar("ADMINISTRADOR", "GESTOR"), capturar(alertaController.resolver));
