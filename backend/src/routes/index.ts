import { Router } from "express";
import { autenticar } from "../middlewares/auth";
import { alertaRotas } from "./alerta.routes";
import { authRotas } from "./auth.routes";
import { fabricanteRotas } from "./fabricante.routes";
import { fornecedorRotas } from "./fornecedor.routes";
import { movimentacaoRotas } from "./movimentacao.routes";
import { painelRotas } from "./painel.routes";
import { pastilhaRotas } from "./pastilha.routes";
import { saudeRotas } from "./saude.routes";
import { usuarioRotas } from "./usuario.routes";

export const rotas = Router();

// rotas públicas
rotas.use(saudeRotas);
rotas.use("/auth", authRotas);

// tudo abaixo exige usuário autenticado
rotas.use(autenticar);
rotas.use("/painel", painelRotas);
rotas.use("/pastilhas", pastilhaRotas);
rotas.use("/fabricantes", fabricanteRotas);
rotas.use("/fornecedores", fornecedorRotas);
rotas.use("/movimentacoes", movimentacaoRotas);
rotas.use("/alertas", alertaRotas);
rotas.use("/usuarios", usuarioRotas);
