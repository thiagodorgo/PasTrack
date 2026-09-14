import { authHandlers } from "./auth";
import { cadastrosHandlers } from "./cadastros";
import { movimentacoesHandlers } from "./movimentacoes";
import { painelHandlers } from "./painel";
import { pastilhasHandlers } from "./pastilhas";

export const handlers = [
  ...authHandlers,
  ...painelHandlers,
  ...pastilhasHandlers,
  ...movimentacoesHandlers,
  ...cadastrosHandlers,
];
