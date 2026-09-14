import type { Usuario } from "../../src/types";
import { usuarioAdmin } from "../mocks/handlers/auth";
import { criarTokenValido } from "./jwt";

/** Grava no localStorage a mesma sessão que o login deixa. */
export function iniciarSessao(usuario: Usuario = usuarioAdmin, token: string = criarTokenValido(usuario)) {
  localStorage.setItem("pastrack:token", token);
  localStorage.setItem("pastrack:usuario", JSON.stringify(usuario));
  return { usuario, token };
}
