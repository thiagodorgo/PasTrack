import { describe, expect, it } from "vitest";
import { estaAutenticado, login, sair, usuarioSalvo } from "../../src/services/auth";
import { credenciaisValidas, usuarioAdmin } from "../mocks/handlers/auth";
import { lerPayload } from "../utils/jwt";
import { iniciarSessao } from "../utils/sessao";

describe("serviço de autenticação", () => {
  it("login grava o token e o usuário devolvidos pelo servidor", async () => {
    const usuario = await login(credenciaisValidas.email, credenciaisValidas.senha);

    expect(usuario).toEqual(usuarioAdmin);
    const token = localStorage.getItem("pastrack:token");
    expect(token).not.toBeNull();
    expect(lerPayload(token ?? "")).toMatchObject({ id: usuarioAdmin.id, perfil: usuarioAdmin.perfil });
    expect(localStorage.getItem("pastrack:usuario")).toBe(JSON.stringify(usuarioAdmin));
  });

  it("sair remove o token e o usuário", () => {
    iniciarSessao();

    sair();

    expect(localStorage.getItem("pastrack:token")).toBeNull();
    expect(localStorage.getItem("pastrack:usuario")).toBeNull();
  });

  it("usuarioSalvo lê o usuário gravado", () => {
    iniciarSessao();

    expect(usuarioSalvo()).toEqual(usuarioAdmin);
  });

  it("usuarioSalvo devolve null quando não há sessão", () => {
    expect(usuarioSalvo()).toBeNull();
  });

  it("estaAutenticado indica se há token gravado", () => {
    expect(estaAutenticado()).toBe(false);

    iniciarSessao();

    expect(estaAutenticado()).toBe(true);
  });
});
