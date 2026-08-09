import { Usuario } from "../types";
import { api } from "./api";

export async function login(email: string, senha: string): Promise<Usuario> {
  const { data } = await api.post<{ token: string; usuario: Usuario }>("/auth/login", { email, senha });
  localStorage.setItem("pastrack:token", data.token);
  localStorage.setItem("pastrack:usuario", JSON.stringify(data.usuario));
  return data.usuario;
}

export function sair() {
  localStorage.removeItem("pastrack:token");
  localStorage.removeItem("pastrack:usuario");
}

export function usuarioSalvo(): Usuario | null {
  const salvo = localStorage.getItem("pastrack:usuario");
  return salvo ? (JSON.parse(salvo) as Usuario) : null;
}

export function estaAutenticado(): boolean {
  return Boolean(localStorage.getItem("pastrack:token"));
}
