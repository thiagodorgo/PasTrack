import { Router } from "express";
import { autenticar } from "../middlewares/auth";
import { exigirSenhaAtualizada } from "../middlewares/exigir-senha-atualizada";
import { limitarGlobal, limitarPorUsuario } from "../middlewares/rate-limit";
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

// limite por IP antes de tudo, inclusive do autenticar, que consulta o banco a cada requisição:
// alto, só contra varredura, porque vários postos podem sair pelo mesmo IP
rotas.use(limitarGlobal);

// rotas públicas; as de sessão (/auth/me e /auth/senha) declaram o próprio autenticar
rotas.use(saudeRotas);
rotas.use("/auth", authRotas);

// tudo abaixo exige usuário autenticado e com a senha já trocada, dentro do orçamento de cada usuário
rotas.use(autenticar, limitarPorUsuario, exigirSenhaAtualizada);
rotas.use("/painel", painelRotas);
rotas.use("/pastilhas", pastilhaRotas);
rotas.use("/fabricantes", fabricanteRotas);
rotas.use("/fornecedores", fornecedorRotas);
rotas.use("/movimentacoes", movimentacaoRotas);
rotas.use("/alertas", alertaRotas);
rotas.use("/usuarios", usuarioRotas);
