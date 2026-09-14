import { alertasHandlers, reiniciarAlertas } from "./alertas";
import { authHandlers } from "./auth";
import { fabricantesHandlers, reiniciarFabricantes } from "./fabricantes";
import { fornecedoresHandlers, reiniciarFornecedores } from "./fornecedores";
import { movimentacoesHandlers } from "./movimentacoes";
import { painelHandlers } from "./painel";
import { pastilhasHandlers } from "./pastilhas";
import { reiniciarUsuarios, usuariosHandlers } from "./usuarios";

export const handlers = [
  ...authHandlers,
  ...usuariosHandlers,
  ...painelHandlers,
  ...pastilhasHandlers,
  ...movimentacoesHandlers,
  ...fabricantesHandlers,
  ...fornecedoresHandlers,
  ...alertasHandlers,
];

/** Devolve aos dados de exemplo os recursos que guardam estado: fabricantes, fornecedores, alertas e usuários. */
export function reiniciarDadosSimulados() {
  reiniciarFabricantes();
  reiniciarFornecedores();
  reiniciarAlertas();
  reiniciarUsuarios();
}
