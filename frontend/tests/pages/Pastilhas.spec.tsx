import { screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { Pastilhas } from "../../src/pages/Pastilhas";
import { usuarioAdmin, usuarioComprador, usuarioGestor, usuarioOperador } from "../mocks/handlers/auth";
import { pastilhas } from "../mocks/handlers/pastilhas";
import { server } from "../mocks/server";
import { renderizar } from "../utils/renderizar";
import { capturarCorpos } from "../utils/requisicoes";
import { iniciarSessao } from "../utils/sessao";

async function renderizarPastilhas() {
  const resultado = renderizar(<Pastilhas />, { initialEntries: ["/pastilhas"] });
  await screen.findByRole("table", { name: "Pastilhas cadastradas" });
  return resultado;
}

describe("página de pastilhas", () => {
  it.each([
    ["ADMINISTRADOR", usuarioAdmin],
    ["GESTOR", usuarioGestor],
  ])("o %s vê o botão Nova pastilha", async (_perfil, usuario) => {
    iniciarSessao(usuario);

    await renderizarPastilhas();

    expect(screen.getByRole("button", { name: "Nova pastilha" })).toBeInTheDocument();
  });

  it.each([
    ["OPERADOR", usuarioOperador],
    ["COMPRADOR", usuarioComprador],
  ])("o %s não vê o botão Nova pastilha", async (_perfil, usuario) => {
    iniciarSessao(usuario);

    await renderizarPastilhas();

    expect(screen.queryByRole("button", { name: "Nova pastilha" })).not.toBeInTheDocument();
  });

  it("lista as pastilhas com a situação do estoque", async () => {
    iniciarSessao(usuarioOperador);

    await renderizarPastilhas();

    const linhas = within(screen.getByRole("table")).getAllByRole("row");
    expect(linhas).toHaveLength(pastilhas.length + 1);
    expect(within(linhas[1]).getByText("Normal")).toBeInTheDocument();
    expect(within(linhas[2]).getByText("Crítico")).toBeInTheDocument();
  });

  it("busca por código ou descrição", async () => {
    iniciarSessao(usuarioOperador);
    const { usuario } = await renderizarPastilhas();

    await usuario.type(screen.getByLabelText("Buscar por código ou descrição"), "wnmg");
    await usuario.click(screen.getByRole("button", { name: "Buscar" }));

    await waitFor(() => expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(2));
    expect(screen.getByText("WNMG 080408-TF")).toBeInTheDocument();
  });

  it("o GESTOR abre o formulário e cadastra uma pastilha", async () => {
    iniciarSessao(usuarioGestor);
    const enviadas = capturarCorpos("post", "*/api/pastilhas");
    const { usuario } = await renderizarPastilhas();

    const botao = screen.getByRole("button", { name: "Nova pastilha" });
    await usuario.click(botao);
    expect(screen.getByRole("button", { name: "Fechar" })).toHaveAttribute("aria-expanded", "true");
    await usuario.type(screen.getByLabelText("Código"), "TNMG 160404");
    await usuario.type(screen.getByLabelText("Descrição"), "Pastilha triangular");
    await usuario.selectOptions(screen.getByLabelText("Fabricante"), "1");
    await usuario.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(enviadas).toHaveLength(1));
    expect(enviadas[0]).toMatchObject({
      codigo: "TNMG 160404",
      descricao: "Pastilha triangular",
      fabricanteId: 1,
      unidade: "un",
      estoqueMinimo: 0,
    });
    expect(await screen.findByRole("button", { name: "Nova pastilha" })).toBeInTheDocument();
  });
});

describe("edição de pastilha e situação do estoque", () => {
  it("mostra 'Sem mínimo' quando o estoque mínimo é zero", async () => {
    server.use(
      http.get("*/api/pastilhas", () =>
        HttpResponse.json([{ ...pastilhas[0], estoqueMinimo: 0, saldoAtual: 0 }])
      )
    );
    iniciarSessao(usuarioOperador);

    await renderizarPastilhas();

    // com mínimo zero a pastilha não é crítica, como na regra da API
    expect(screen.getByText("Sem mínimo")).toBeInTheDocument();
    expect(screen.queryByText("Crítico")).not.toBeInTheDocument();
  });

  it.each([
    ["OPERADOR", usuarioOperador],
    ["COMPRADOR", usuarioComprador],
  ])("o %s não vê o botão de editar", async (_perfil, usuario) => {
    iniciarSessao(usuario);

    await renderizarPastilhas();

    expect(screen.queryByRole("button", { name: /^Editar / })).not.toBeInTheDocument();
  });

  it("o GESTOR edita a descrição e o estoque mínimo, sem enviar código nem saldo", async () => {
    iniciarSessao(usuarioGestor);
    const enviadas = capturarCorpos("put", "*/api/pastilhas/:id");
    const { usuario } = await renderizarPastilhas();

    await usuario.click(screen.getByRole("button", { name: `Editar ${pastilhas[0].codigo}` }));
    const descricao = screen.getByLabelText("Descrição");
    expect(descricao).toHaveValue(pastilhas[0].descricao);
    expect(descricao).toHaveFocus();
    expect(screen.queryByLabelText("Código")).not.toBeInTheDocument();

    await usuario.clear(descricao);
    await usuario.type(descricao, "Pastilha revisada");
    const minimo = screen.getByLabelText("Estoque mínimo");
    await usuario.clear(minimo);
    await usuario.type(minimo, "8");
    await usuario.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(enviadas).toHaveLength(1));
    expect(enviadas[0]).toMatchObject({ descricao: "Pastilha revisada", estoqueMinimo: 8 });
    expect(enviadas[0]).not.toHaveProperty("codigo");
    expect(enviadas[0]).not.toHaveProperty("saldoAtual");
    expect(await screen.findByRole("status")).toHaveTextContent(
      `Pastilha ${pastilhas[0].codigo} atualizada.`
    );
  });

  it("o formulário de edição mostra o código e o saldo como leitura", async () => {
    iniciarSessao(usuarioGestor);
    const { usuario } = await renderizarPastilhas();

    await usuario.click(screen.getByRole("button", { name: `Editar ${pastilhas[0].codigo}` }));

    const formulario = screen.getByRole("form", { name: `Editar ${pastilhas[0].codigo}` });
    expect(formulario).toHaveTextContent(`Código: ${pastilhas[0].codigo}`);
    expect(formulario).toHaveTextContent("Saldo atual: 10 un");
  });
});
