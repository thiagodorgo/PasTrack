import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Pastilhas } from "../../src/pages/Pastilhas";
import { usuarioAdmin, usuarioComprador, usuarioGestor, usuarioOperador } from "../mocks/handlers/auth";
import { pastilhas } from "../mocks/handlers/pastilhas";
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
