import { screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { Fornecedores } from "../../src/pages/Fornecedores";
import { usuarioAdmin, usuarioComprador, usuarioGestor, usuarioOperador } from "../mocks/handlers/auth";
import { fornecedores } from "../mocks/handlers/fornecedores";
import { server } from "../mocks/server";
import { renderizar } from "../utils/renderizar";
import { iniciarSessao } from "../utils/sessao";

async function renderizarFornecedores() {
  const resultado = renderizar(<Fornecedores />, { initialEntries: ["/fornecedores"] });
  await screen.findByRole("table", { name: "Fornecedores cadastrados" });
  return resultado;
}

function linhas() {
  // a primeira linha é o cabeçalho
  return within(screen.getByRole("table", { name: "Fornecedores cadastrados" }))
    .getAllByRole("row")
    .slice(1);
}

describe("página de fornecedores", () => {
  it("lista os fornecedores com CNPJ e contato", async () => {
    iniciarSessao(usuarioOperador);

    await renderizarFornecedores();

    expect(linhas()).toHaveLength(fornecedores.length);
    const linha = screen.getByRole("row", { name: /Ferramentaria Sul/ });
    expect(linha).toHaveTextContent("11.222.333/0001-81");
    expect(linha).toHaveTextContent("(47) 3333-1111");
  });

  it.each([
    ["ADMINISTRADOR", usuarioAdmin],
    ["GESTOR", usuarioGestor],
    ["COMPRADOR", usuarioComprador],
  ])("o %s vê os botões de cadastro e edição", async (_perfil, usuario) => {
    iniciarSessao(usuario);

    await renderizarFornecedores();

    expect(screen.getByRole("button", { name: "Novo fornecedor" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Editar / })).toHaveLength(fornecedores.length);
  });

  it("o OPERADOR não vê os botões de cadastro e edição", async () => {
    iniciarSessao(usuarioOperador);

    await renderizarFornecedores();

    expect(screen.queryByRole("button", { name: "Novo fornecedor" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Editar / })).not.toBeInTheDocument();
  });

  it("cadastra um fornecedor com CNPJ sem pontuação", async () => {
    iniciarSessao(usuarioComprador);
    const { usuario } = await renderizarFornecedores();

    await usuario.click(screen.getByRole("button", { name: "Novo fornecedor" }));
    expect(screen.getByLabelText("Nome")).toHaveFocus();
    await usuario.type(screen.getByLabelText("Nome"), "Metal Norte");
    await usuario.type(screen.getByLabelText("CNPJ"), "04252011000110");
    await usuario.type(screen.getByLabelText("Contato"), "compras@metalnorte.local");
    await usuario.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Fornecedor Metal Norte cadastrado.");
    await waitFor(() => expect(linhas()).toHaveLength(fornecedores.length + 1));
    // a API devolve o CNPJ com máscara
    expect(screen.getByRole("row", { name: /Metal Norte/ })).toHaveTextContent("04.252.011/0001-10");
  });

  it("cadastra um fornecedor sem CNPJ", async () => {
    iniciarSessao(usuarioComprador);
    const { usuario } = await renderizarFornecedores();

    await usuario.click(screen.getByRole("button", { name: "Novo fornecedor" }));
    await usuario.type(screen.getByLabelText("Nome"), "Sem documento");
    await usuario.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Fornecedor Sem documento cadastrado.");
    await waitFor(() => expect(screen.getByRole("row", { name: /Sem documento/ })).toHaveTextContent("—"));
  });

  it("edita o contato de um fornecedor", async () => {
    iniciarSessao(usuarioGestor);
    const { usuario } = await renderizarFornecedores();

    await usuario.click(screen.getByRole("button", { name: "Editar TecCorte Suprimentos" }));
    const contato = screen.getByLabelText("Contato");
    await usuario.clear(contato);
    await usuario.type(contato, "(47) 99999-0000");
    await usuario.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Fornecedor TecCorte Suprimentos atualizado."
    );
    await waitFor(() =>
      expect(screen.getByRole("row", { name: /TecCorte/ })).toHaveTextContent("(47) 99999-0000")
    );
  });

  it("recusa o CNPJ inválido no próprio campo, sem chamar a API", async () => {
    iniciarSessao(usuarioComprador);
    const { usuario } = await renderizarFornecedores();

    await usuario.click(screen.getByRole("button", { name: "Novo fornecedor" }));
    await usuario.type(screen.getByLabelText("Nome"), "Fornecedor com CNPJ errado");
    await usuario.type(screen.getByLabelText("CNPJ"), "11.222.333/0001-00");
    await usuario.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("CNPJ inválido.");
    expect(screen.getByLabelText("CNPJ")).toHaveFocus();
    expect(linhas()).toHaveLength(fornecedores.length);
  });

  it("mostra no campo o CNPJ já cadastrado", async () => {
    iniciarSessao(usuarioComprador);
    const { usuario } = await renderizarFornecedores();

    await usuario.click(screen.getByRole("button", { name: "Novo fornecedor" }));
    await usuario.type(screen.getByLabelText("Nome"), "Outro nome");
    await usuario.type(screen.getByLabelText("CNPJ"), "11.222.333/0001-81");
    await usuario.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Já existe um fornecedor com este CNPJ");
    expect(linhas()).toHaveLength(fornecedores.length);
  });

  it("recusa o nome em branco", async () => {
    iniciarSessao(usuarioComprador);
    const { usuario } = await renderizarFornecedores();

    await usuario.click(screen.getByRole("button", { name: "Novo fornecedor" }));
    await usuario.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Informe o nome do fornecedor.");
    expect(screen.getByLabelText("Nome")).toHaveFocus();
  });

  it("mostra o erro quando a lista não carrega", async () => {
    server.use(
      http.get("*/api/fornecedores", () =>
        HttpResponse.json({ erro: "Erro interno no servidor" }, { status: 500 })
      )
    );
    iniciarSessao(usuarioOperador);

    renderizar(<Fornecedores />, { initialEntries: ["/fornecedores"] });

    expect(await screen.findByRole("alert")).toHaveTextContent("Erro interno no servidor");
  });

  it("mostra uma frase quando não há fornecedores", async () => {
    server.use(http.get("*/api/fornecedores", () => HttpResponse.json([])));
    iniciarSessao(usuarioOperador);

    renderizar(<Fornecedores />, { initialEntries: ["/fornecedores"] });

    expect(await screen.findByText("Nenhum fornecedor cadastrado.")).toBeInTheDocument();
  });
});
