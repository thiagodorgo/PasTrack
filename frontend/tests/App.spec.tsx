import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../src/App";
import { usuarioAdmin, usuarioComSenhaTemporaria, usuarioGestor } from "./mocks/handlers/auth";
import { criarTokenExpirado } from "./utils/jwt";
import { iniciarSessao } from "./utils/sessao";

// as páginas chegam por import dinâmico; na primeira vez, a transformação do módulo pode demorar
const ESPERA = { timeout: 10_000 };

/** Abre a aplicação inteira, com o BrowserRouter de verdade, no caminho informado. */
function abrirEm(caminho: string) {
  window.history.replaceState(null, "", caminho);
  return render(<App />);
}

function tituloDaPagina() {
  return screen.findByRole("heading", { level: 1 }, ESPERA);
}

describe("rotas da aplicação", { timeout: 20_000 }, () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("sem sessão, uma rota protegida leva ao login", async () => {
    abrirEm("/pastilhas");

    expect(await screen.findByRole("button", { name: "Entrar" }, ESPERA)).toBeInTheDocument();
    expect(window.location.pathname).toBe("/login");
  });

  it("com o token vencido, o login avisa que a sessão expirou", async () => {
    iniciarSessao(usuarioAdmin, criarTokenExpirado(usuarioAdmin));

    abrirEm("/movimentacoes");

    expect(await screen.findByText(/Sua sessão expirou/, {}, ESPERA)).toBeInTheDocument();
    expect(window.location.pathname).toBe("/login");
  });

  it("o painel abre na raiz, dentro do layout", async () => {
    iniciarSessao(usuarioAdmin);

    abrirEm("/");

    expect(await screen.findByRole("heading", { level: 1, name: "Painel" }, ESPERA)).toBeInTheDocument();
    const menu = screen.getByRole("navigation", { name: "Menu principal" });
    expect(within(menu).getByRole("link", { name: "Painel" })).toHaveAttribute("aria-current", "page");
  });

  it.each([
    ["/pastilhas", "Pastilhas"],
    ["/movimentacoes", "Movimentações"],
    ["/alertas", "Alertas"],
    ["/fabricantes", "Fabricantes"],
    ["/fornecedores", "Fornecedores"],
    ["/usuarios", "Usuários"],
  ])("%s está registrada e abre dentro do layout", async (caminho, itemDoMenu) => {
    iniciarSessao(usuarioAdmin);

    abrirEm(caminho);

    const titulo = await tituloDaPagina();
    expect(titulo).not.toHaveTextContent("Página não encontrada");
    expect(window.location.pathname).toBe(caminho);
    const menu = screen.getByRole("navigation", { name: "Menu principal" });
    expect(within(menu).getByRole("link", { name: itemDoMenu })).toHaveAttribute("aria-current", "page");
  });

  it("o GESTOR que abre /usuarios vai para a página de sem permissão", async () => {
    iniciarSessao(usuarioGestor);

    abrirEm("/usuarios");

    expect(await screen.findByRole("heading", { name: "Acesso não permitido" }, ESPERA)).toBeInTheDocument();
    expect(window.location.pathname).toBe("/sem-permissao");
  });

  it("uma rota inexistente mostra a página não encontrada, com o menu", async () => {
    iniciarSessao(usuarioGestor);

    abrirEm("/rota-que-nao-existe");

    expect(await screen.findByRole("heading", { name: "Página não encontrada" }, ESPERA)).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Menu principal" })).toBeInTheDocument();
  });

  it("com a troca de senha pendente, qualquer rota leva à troca de senha, fora do layout", async () => {
    iniciarSessao(usuarioComSenhaTemporaria);

    abrirEm("/pastilhas");

    expect(await screen.findByRole("heading", { name: "Alterar senha" }, ESPERA)).toBeInTheDocument();
    expect(window.location.pathname).toBe("/alterar-senha");
    expect(screen.queryByRole("navigation", { name: "Menu principal" })).not.toBeInTheDocument();
  });
});
