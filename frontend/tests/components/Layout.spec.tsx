import { screen, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Layout } from "../../src/components/Layout";
import type { Usuario } from "../../src/types";
import { usuarioAdmin, usuarioComprador, usuarioGestor, usuarioOperador } from "../mocks/handlers/auth";
import { silenciarErrosDeRenderizacao } from "../utils/console";
import { renderizar } from "../utils/renderizar";
import { iniciarSessao } from "../utils/sessao";

function PaginaQuebrada(): never {
  throw new Error("falha na página");
}

function renderizarLayout(usuario: Usuario, inicial = "/") {
  iniciarSessao(usuario);
  return renderizar(
    <Routes>
      <Route path="/login" element={<p>Tela de login</p>} />
      <Route path="/alterar-senha" element={<p>Tela de troca de senha</p>} />
      <Route element={<Layout />}>
        <Route path="/" element={<h1>Página inicial</h1>} />
        <Route path="/pastilhas" element={<h1>Página de pastilhas</h1>} />
        <Route path="/quebrada" element={<PaginaQuebrada />} />
      </Route>
    </Routes>,
    { initialEntries: [inicial] }
  );
}

function itensDoMenu() {
  const menu = screen.getByRole("navigation", { name: "Menu principal" });
  return within(menu)
    .getAllByRole("link")
    .map((link) => link.textContent);
}

const ITENS_DE_TODOS = ["Painel", "Pastilhas", "Movimentações", "Alertas", "Fabricantes", "Fornecedores"];

describe("Layout", () => {
  it("o ADMINISTRADOR vê todos os itens do menu, inclusive Usuários", () => {
    renderizarLayout(usuarioAdmin);

    expect(itensDoMenu()).toEqual([...ITENS_DE_TODOS, "Usuários"]);
  });

  it.each([
    ["GESTOR", usuarioGestor],
    ["OPERADOR", usuarioOperador],
    ["COMPRADOR", usuarioComprador],
  ])("o %s não vê Usuários no menu", (_perfil, usuario) => {
    renderizarLayout(usuario);

    expect(itensDoMenu()).toEqual(ITENS_DE_TODOS);
  });

  it("marca o item da página atual", () => {
    renderizarLayout(usuarioGestor, "/pastilhas");

    expect(screen.getByRole("link", { name: "Pastilhas" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Painel" })).not.toHaveAttribute("aria-current");
  });

  it("mostra o nome e o perfil do usuário no cabeçalho", () => {
    renderizarLayout(usuarioGestor);

    const cabecalho = screen.getByRole("banner");
    expect(within(cabecalho).getByText("Maria Souza")).toBeInTheDocument();
    // o rótulo "Perfil:" existe só para leitores de tela, junto do nome do perfil
    expect(within(cabecalho).getByText("Gestor")).toHaveTextContent("Perfil: Gestor");
  });

  it("o link de pular leva o foco ao conteúdo principal", async () => {
    const { usuario } = renderizarLayout(usuarioGestor);

    const pular = screen.getByRole("link", { name: "Pular para o conteúdo" });
    expect(pular).toHaveAttribute("href", "#conteudo");
    await usuario.click(pular);

    expect(screen.getByRole("main")).toHaveFocus();
  });

  it("Alterar senha leva à tela de troca de senha", async () => {
    const { usuario } = renderizarLayout(usuarioGestor);

    await usuario.click(screen.getByRole("link", { name: "Alterar senha" }));

    expect(await screen.findByText("Tela de troca de senha")).toBeInTheDocument();
  });

  it("Sair encerra a sessão e leva ao login", async () => {
    const { usuario } = renderizarLayout(usuarioGestor);

    await usuario.click(screen.getByRole("button", { name: "Sair" }));

    expect(await screen.findByText("Tela de login")).toBeInTheDocument();
    expect(localStorage.getItem("pastrack:token")).toBeNull();
  });

  it("o botão Menu abre a navegação e ela fecha ao escolher uma página", async () => {
    const { usuario } = renderizarLayout(usuarioGestor);
    const botao = screen.getByRole("button", { name: "Menu" });
    const menu = screen.getByRole("navigation", { name: "Menu principal" });
    expect(botao).toHaveAttribute("aria-expanded", "false");
    expect(botao).toHaveAttribute("aria-controls", menu.id);

    await usuario.click(botao);
    expect(botao).toHaveAttribute("aria-expanded", "true");
    expect(menu).toHaveClass("aberto");

    await usuario.click(within(menu).getByRole("link", { name: "Pastilhas" }));
    expect(await screen.findByRole("heading", { name: "Página de pastilhas" })).toBeInTheDocument();
    expect(botao).toHaveAttribute("aria-expanded", "false");
    expect(menu).not.toHaveClass("aberto");
  });

  it("uma página que falha mostra o limite de erro sem derrubar o menu", async () => {
    silenciarErrosDeRenderizacao();
    const { usuario } = renderizarLayout(usuarioGestor, "/quebrada");

    expect(screen.getByRole("alert")).toHaveTextContent("Algo deu errado nesta tela");
    expect(screen.getByRole("navigation", { name: "Menu principal" })).toBeInTheDocument();

    await usuario.click(screen.getByRole("link", { name: "Painel" }));

    expect(await screen.findByRole("heading", { name: "Página inicial" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
