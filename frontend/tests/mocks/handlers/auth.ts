import { http, HttpResponse } from "msw";
import type { Usuario } from "../../../src/types";
import { criarTokenValido } from "../../utils/jwt";

export const usuarioAdmin: Usuario = {
  id: 1,
  nome: "Administrador",
  email: "admin@pastrack.com",
  perfil: "ADMINISTRADOR",
};

export const credenciaisValidas = { email: "admin@pastrack.com", senha: "senha-correta" };

export const authHandlers = [
  http.post("*/api/auth/login", async ({ request }) => {
    const { email, senha } = (await request.json()) as { email: string; senha: string };
    if (email !== credenciaisValidas.email || senha !== credenciaisValidas.senha) {
      return HttpResponse.json({ erro: "E-mail ou senha inválidos" }, { status: 401 });
    }
    return HttpResponse.json({ token: criarTokenValido(usuarioAdmin), usuario: usuarioAdmin });
  }),
];
