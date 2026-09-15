import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { App } from "../src/App";
import { usuarioSalvo } from "../src/services/auth";
import {
  credenciaisTemporarias,
  credenciaisValidas,
  usuarioAdmin,
  usuarioGestor,
} from "./mocks/handlers/auth";
import { server } from "./mocks/server";
import { iniciarSessao } from "./utils/sessao";

// as páginas chegam por import dinâmico; na primeira vez, a transformação do módulo pode demorar
const ESPERA = { timeout: 10_000 };

// O painel traz o recharts, pesado de transformar na primeira importação. Carregado antes dos testes,
// o React.lazy da aplicação encontra o módulo pronto e a espera não conta no tempo de cada teste.
beforeAll(async () => {
  await import("../src/pages/Painel");
}, 60_000);

/** Abre a aplicação inteira, com o BrowserRouter de verdade, no caminho informado. */
function abrirEm(caminho: string) {
  window.history.replaceState(null, "", caminho);
  const usuario = userEvent.setup();
  return { usuario, ...render(<App />) };
}

describe("fluxos de sessão na aplicação inteira", { timeout: 30_000 }, () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("quem entra com a senha temporária troca a senha e chega ao painel", async () => {
    const { usuario } = abrirEm("/login");

    await usuario.type(await screen.findByLabelText("E-mail", {}, ESPERA), credenciaisTemporarias.email);
    await usuario.type(screen.getByLabelText("Senha"), credenciaisTemporarias.senha);
    await usuario.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByRole("heading", { name: "Alterar senha" }, ESPERA)).toBeInTheDocument();
    await usuario.type(screen.getByLabelText("Senha atual"), credenciaisTemporarias.senha);
    await usuario.type(screen.getByLabelText("Nova senha"), "Fresa2026retifica");
    await usuario.type(screen.getByLabelText("Confirme a nova senha"), "Fresa2026retifica");
    await usuario.click(screen.getByRole("button", { name: "Salvar nova senha" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Painel" }, ESPERA)).toBeInTheDocument();
    expect(window.location.pathname).toBe("/");
    expect(usuarioSalvo()?.deveTrocarSenha).toBe(false);
  });

  it("a sessão que expira durante o uso leva ao login com aviso, e entrar de novo volta ao painel", async () => {
    iniciarSessao(usuarioAdmin);
    server.use(
      http.get(
        "*/api/painel/resumo",
        () => HttpResponse.json({ erro: "Token inválido ou expirado" }, { status: 401 }),
        { once: true }
      )
    );
    const { usuario } = abrirEm("/");

    expect(await screen.findByText(/Sua sessão expirou/, {}, ESPERA)).toBeInTheDocument();
    expect(window.location.pathname).toBe("/login");
    expect(localStorage.getItem("pastrack:token")).toBeNull();

    await usuario.type(screen.getByLabelText("E-mail"), credenciaisValidas.email);
    await usuario.type(screen.getByLabelText("Senha"), credenciaisValidas.senha);
    await usuario.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Painel" }, ESPERA)).toBeInTheDocument();
  });

  it("quando a API exige a troca de senha, a tela de troca aparece no lugar da página", async () => {
    iniciarSessao(usuarioGestor);
    server.use(
      http.get(
        "*/api/pastilhas",
        () =>
          HttpResponse.json(
            { erro: "Troque a sua senha para continuar", codigo: "TROCA_SENHA_OBRIGATORIA" },
            { status: 403 }
          ),
        { once: true }
      )
    );

    abrirEm("/pastilhas");

    expect(await screen.findByRole("heading", { name: "Alterar senha" }, ESPERA)).toBeInTheDocument();
    expect(window.location.pathname).toBe("/alterar-senha");
    expect(screen.getByText(/senha temporária/)).toBeInTheDocument();
    expect(usuarioSalvo()?.deveTrocarSenha).toBe(true);
  });

  it("sair pelo cabeçalho encerra a sessão e volta ao login", async () => {
    iniciarSessao(usuarioGestor);
    const { usuario } = abrirEm("/pastilhas");

    await usuario.click(await screen.findByRole("button", { name: "Sair" }, ESPERA));

    expect(await screen.findByRole("button", { name: "Entrar" }, ESPERA)).toBeInTheDocument();
    expect(window.location.pathname).toBe("/login");
    expect(localStorage.getItem("pastrack:token")).toBeNull();
  });
});
