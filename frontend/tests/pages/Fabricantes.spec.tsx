import { screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { Fabricantes } from "../../src/pages/Fabricantes";
import { usuarioAdmin, usuarioComprador, usuarioGestor, usuarioOperador } from "../mocks/handlers/auth";
import { fabricantes } from "../mocks/handlers/fabricantes";
import { server } from "../mocks/server";
import { renderizar } from "../utils/renderizar";
import { iniciarSessao } from "../utils/sessao";

async function renderizarFabricantes() {
  const resultado = renderizar(<Fabricantes />, { initialEntries: ["/fabricantes"] });
  await screen.findByRole("table", { name: "Fabricantes cadastrados" });
  return resultado;
}

function linhas() {
  // a primeira linha é o cabeçalho
  return within(screen.getByRole("table", { name: "Fabricantes cadastrados" }))
    .getAllByRole("row")
    .slice(1);
}

describe("página de fabricantes", () => {
  it("lista os fabricantes cadastrados", async () => {
    iniciarSessao(usuarioOperador);

    await renderizarFabricantes();

    expect(linhas()).toHaveLength(fabricantes.length);
    expect(screen.getByRole("row", { name: /Sandvik Coromant/ })).toBeInTheDocument();
  });

  it.each([
    ["ADMINISTRADOR", usuarioAdmin],
    ["GESTOR", usuarioGestor],
  ])("o %s vê os botões de cadastro e edição", async (_perfil, usuario) => {
    iniciarSessao(usuario);

    await renderizarFabricantes();

    expect(screen.getByRole("button", { name: "Novo fabricante" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Editar / })).toHaveLength(fabricantes.length);
  });

  it.each([
    ["OPERADOR", usuarioOperador],
    ["COMPRADOR", usuarioComprador],
  ])("o %s não vê os botões de cadastro e edição", async (_perfil, usuario) => {
    iniciarSessao(usuario);

    await renderizarFabricantes();

    expect(screen.queryByRole("button", { name: "Novo fabricante" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Editar / })).not.toBeInTheDocument();
  });

  it("cadastra um fabricante e mostra na lista", async () => {
    iniciarSessao(usuarioGestor);
    const { usuario } = await renderizarFabricantes();

    await usuario.click(screen.getByRole("button", { name: "Novo fabricante" }));
    const campo = screen.getByLabelText("Nome");
    expect(campo).toHaveFocus();
    await usuario.type(campo, "Kennametal");
    await usuario.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Fabricante Kennametal cadastrado.");
    await waitFor(() => expect(linhas()).toHaveLength(fabricantes.length + 1));
    expect(screen.getByRole("button", { name: "Novo fabricante" })).toHaveFocus();
  });

  it("edita o nome de um fabricante", async () => {
    iniciarSessao(usuarioGestor);
    const { usuario } = await renderizarFabricantes();

    await usuario.click(screen.getByRole("button", { name: "Editar Iscar" }));
    const campo = screen.getByLabelText("Nome");
    expect(campo).toHaveValue("Iscar");
    await usuario.clear(campo);
    await usuario.type(campo, "Iscar do Brasil");
    await usuario.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Fabricante Iscar do Brasil atualizado.");
    await waitFor(() => expect(screen.getByRole("row", { name: /Iscar do Brasil/ })).toBeInTheDocument());
  });

  it("mostra no campo o nome já cadastrado", async () => {
    iniciarSessao(usuarioGestor);
    const { usuario } = await renderizarFabricantes();

    await usuario.click(screen.getByRole("button", { name: "Novo fabricante" }));
    await usuario.type(screen.getByLabelText("Nome"), "Iscar");
    await usuario.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Já existe um fabricante com este nome");
    expect(screen.getByLabelText("Nome")).toHaveFocus();
    expect(linhas()).toHaveLength(fabricantes.length);
  });

  it("recusa o nome em branco sem chamar a API", async () => {
    iniciarSessao(usuarioGestor);
    const { usuario } = await renderizarFabricantes();

    await usuario.click(screen.getByRole("button", { name: "Novo fabricante" }));
    await usuario.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Informe o nome do fabricante.");
    expect(screen.getByLabelText("Nome")).toHaveAttribute("aria-invalid", "true");
  });

  it("cancelar fecha o formulário e devolve o foco", async () => {
    iniciarSessao(usuarioGestor);
    const { usuario } = await renderizarFabricantes();

    await usuario.click(screen.getByRole("button", { name: "Novo fabricante" }));
    await usuario.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByLabelText("Nome")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Novo fabricante" })).toHaveFocus();
  });

  it("mostra o erro quando a lista não carrega", async () => {
    server.use(
      http.get("*/api/fabricantes", () =>
        HttpResponse.json({ erro: "Erro interno no servidor" }, { status: 500 })
      )
    );
    iniciarSessao(usuarioOperador);

    renderizar(<Fabricantes />, { initialEntries: ["/fabricantes"] });

    expect(await screen.findByRole("alert")).toHaveTextContent("Erro interno no servidor");
  });

  it("mostra uma frase quando não há fabricantes", async () => {
    server.use(http.get("*/api/fabricantes", () => HttpResponse.json([])));
    iniciarSessao(usuarioOperador);

    renderizar(<Fabricantes />, { initialEntries: ["/fabricantes"] });

    expect(await screen.findByText("Nenhum fabricante cadastrado.")).toBeInTheDocument();
  });
});
