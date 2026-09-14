import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { Movimentacoes } from "../../src/pages/Movimentacoes";
import { usuarioComprador } from "../mocks/handlers/auth";
import { fornecedores } from "../mocks/handlers/fornecedores";
import { movimentacoes } from "../mocks/handlers/movimentacoes";
import { pastilhas } from "../mocks/handlers/pastilhas";
import { renderizar } from "../utils/renderizar";
import { capturarCorpos } from "../utils/requisicoes";
import { iniciarSessao } from "../utils/sessao";

async function renderizarMovimentacoes() {
  const resultado = renderizar(<Movimentacoes />, { initialEntries: ["/movimentacoes"] });
  // o histórico só aparece depois que as três listas foram carregadas
  await screen.findByRole("table");
  return resultado;
}

describe("página de movimentações", () => {
  // o registro exige sessão, como na API; por padrão, a do administrador
  beforeEach(() => {
    iniciarSessao();
  });

  it("carrega o histórico, as pastilhas e os fornecedores", async () => {
    const { usuario } = await renderizarMovimentacoes();

    const linhas = within(screen.getByRole("table", { name: "Histórico de movimentações" })).getAllByRole(
      "row"
    );
    expect(linhas).toHaveLength(movimentacoes.length + 1);
    expect(within(linhas[1]).getByText("OS-1042")).toBeInTheDocument();
    expect(within(linhas[2]).getByText("Ferramentaria Sul Ltda")).toBeInTheDocument();

    const seletorDePastilha = screen.getByLabelText("Pastilha");
    for (const pastilha of pastilhas) {
      const rotulo = `${pastilha.codigo} (${pastilha.saldoAtual} ${pastilha.unidade})`;
      expect(within(seletorDePastilha).getByRole("option", { name: rotulo })).toBeInTheDocument();
    }

    await usuario.selectOptions(screen.getByLabelText("Tipo"), "ENTRADA");

    const seletorDeFornecedor = screen.getByLabelText("Fornecedor");
    for (const fornecedor of fornecedores) {
      expect(within(seletorDeFornecedor).getByRole("option", { name: fornecedor.nome })).toBeInTheDocument();
    }
  });

  it("registra uma SAÍDA e anuncia o saldo atualizado", async () => {
    const enviadas = capturarCorpos("post", "*/api/movimentacoes");
    const { usuario } = await renderizarMovimentacoes();

    await usuario.selectOptions(screen.getByLabelText("Tipo"), "SAIDA");
    await usuario.selectOptions(screen.getByLabelText("Pastilha"), "1");
    await usuario.clear(screen.getByLabelText("Quantidade"));
    await usuario.type(screen.getByLabelText("Quantidade"), "3");
    await usuario.type(screen.getByLabelText("Documento (NF, OS...)"), "OS-2001");
    await usuario.click(screen.getByRole("button", { name: "Registrar" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Movimentação registrada. Saldo atual do item: 7."
    );
    expect(enviadas).toEqual([{ tipo: "SAIDA", pastilhaId: 1, quantidade: 3, documento: "OS-2001" }]);
    expect(screen.getByLabelText("Quantidade")).toHaveValue(1);
    expect(screen.getByLabelText("Documento (NF, OS...)")).toHaveValue("");
  });

  it("registra uma ENTRADA com fornecedor e observação", async () => {
    const enviadas = capturarCorpos("post", "*/api/movimentacoes");
    const { usuario } = await renderizarMovimentacoes();

    await usuario.selectOptions(screen.getByLabelText("Tipo"), "ENTRADA");
    await usuario.selectOptions(screen.getByLabelText("Pastilha"), "2");
    await usuario.clear(screen.getByLabelText("Quantidade"));
    await usuario.type(screen.getByLabelText("Quantidade"), "10");
    await usuario.selectOptions(screen.getByLabelText("Fornecedor"), "1");
    await usuario.type(screen.getByLabelText("Observação"), "Reposição do mês");
    await usuario.click(screen.getByRole("button", { name: "Registrar" }));

    expect(await screen.findByText("Movimentação registrada. Saldo atual do item: 14.")).toBeInTheDocument();
    expect(enviadas).toEqual([
      { tipo: "ENTRADA", pastilhaId: 2, quantidade: 10, fornecedorId: 1, observacao: "Reposição do mês" },
    ]);
    expect(screen.getByLabelText("Observação")).toHaveValue("");
  });

  it("na ENTRADA, o fornecedor é obrigatório: sem ele, nada é enviado", async () => {
    const enviadas = capturarCorpos("post", "*/api/movimentacoes");
    const { usuario } = await renderizarMovimentacoes();

    await usuario.selectOptions(screen.getByLabelText("Tipo"), "ENTRADA");
    const fornecedor = screen.getByLabelText("Fornecedor");
    expect(fornecedor).toBeRequired();
    await usuario.selectOptions(screen.getByLabelText("Pastilha"), "2");
    await usuario.click(screen.getByRole("button", { name: "Registrar" }));

    expect(fornecedor).toBeInvalid();
    expect(enviadas).toEqual([]);
  });

  it("o COMPRADOR não vê a opção de SAÍDA e registra só ENTRADA", async () => {
    iniciarSessao(usuarioComprador);

    await renderizarMovimentacoes();

    const tipo = screen.getByLabelText("Tipo");
    expect(within(tipo).queryByRole("option", { name: "Saída" })).not.toBeInTheDocument();
    expect(
      within(tipo)
        .getAllByRole("option")
        .map((opcao) => opcao.textContent)
    ).toEqual(["Entrada"]);
    expect(tipo).toHaveValue("ENTRADA");
    expect(screen.getByLabelText("Fornecedor")).toBeRequired();
  });

  it("mostra a mensagem de saldo insuficiente devolvida pelo servidor", async () => {
    const { usuario } = await renderizarMovimentacoes();

    await usuario.selectOptions(screen.getByLabelText("Pastilha"), "2");
    await usuario.clear(screen.getByLabelText("Quantidade"));
    await usuario.type(screen.getByLabelText("Quantidade"), "50");
    await usuario.click(screen.getByRole("button", { name: "Registrar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Saldo insuficiente: há 4 un em estoque");
    expect(screen.queryByText(/Movimentação registrada/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Quantidade")).toHaveValue(50);
  });
});
