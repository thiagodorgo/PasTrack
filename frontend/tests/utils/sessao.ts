import type { Usuario } from "../../src/types";
import { usuarioAdmin } from "../mocks/handlers/auth";
import { criarTokenValido, lerPayload } from "./jwt";

/** Instante em que o token teria chegado com o relógio certo: o da emissão (iat), ou agora se não houver. */
function instanteDeEmissao(token: string): number {
  try {
    const { iat } = lerPayload(token);
    return typeof iat === "number" ? iat * 1000 : Date.now();
  } catch {
    return Date.now();
  }
}

/** Grava no localStorage a mesma sessão que o login deixa: o token, o instante em que chegou e o usuário. */
export function iniciarSessao(
  usuario: Usuario = usuarioAdmin,
  token: string = criarTokenValido(usuario),
  recebidoEm: number = instanteDeEmissao(token)
) {
  localStorage.setItem("pastrack:token-recebido-em", String(recebidoEm));
  localStorage.setItem("pastrack:token", token);
  localStorage.setItem("pastrack:usuario", JSON.stringify(usuario));
  return { usuario, token };
}
