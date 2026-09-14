import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TabelaMovimentacoes } from "../../src/components/TabelaMovimentacoes";
import { movimentacoes } from "../mocks/handlers/movimentacoes";

function textosDosCabecalhos(tabela: HTMLElement) {
  return within(tabela)
    .getAllByRole("columnheader")
    .map((cabecalho) => cabecalho.textContent);
}

describe("TabelaMovimentacoes", () => {
  it("tem legenda, cabeçalhos com scope e fica num contêiner que rola na horizontal", () => {
    render(<TabelaMovimentacoes movimentacoes={movimentacoes} legenda="Últimas movimentações" />);

    const tabela = screen.getByRole("table", { name: "Últimas movimentações" });
    expect(textosDosCabecalhos(tabela)).toEqual(["Data", "Tipo", "Pastilha", "Qtde", "Responsável"]);
    for (const cabecalho of within(tabela).getAllByRole("columnheader")) {
      expect(cabecalho).toHaveAttribute("scope", "col");
    }
    expect(tabela.parentElement).toHaveClass("tabela-rolavel");
  });

  it("a versão detalhada inclui fornecedor, documento e observação", () => {
    render(<TabelaMovimentacoes movimentacoes={movimentacoes} legenda="Histórico" detalhada />);

    const tabela = screen.getByRole("table", { name: "Histórico" });
    expect(textosDosCabecalhos(tabela)).toEqual([
      "Data",
      "Tipo",
      "Pastilha",
      "Qtde",
      "Fornecedor",
      "Responsável",
      "Documento",
      "Observação",
    ]);
    const linhas = within(tabela).getAllByRole("row");
    expect(within(linhas[1]).getByText("OS-1042")).toBeInTheDocument();
    expect(within(linhas[2]).getByText("Ferramentaria Sul Ltda")).toBeInTheDocument();
  });

  it("mostra o tipo por extenso e a quantidade com a unidade", () => {
    render(<TabelaMovimentacoes movimentacoes={movimentacoes} legenda="Histórico" />);

    const [, saida, entrada] = within(screen.getByRole("table")).getAllByRole("row");
    expect(within(saida).getByText("Saída")).toBeInTheDocument();
    expect(within(saida).getByText("6 un")).toBeInTheDocument();
    expect(within(entrada).getByText("Entrada")).toBeInTheDocument();
    expect(within(entrada).getByText("20 un")).toBeInTheDocument();
  });

  it("sem movimentações, mostra a mensagem de vazio no lugar da tabela", () => {
    render(<TabelaMovimentacoes movimentacoes={[]} legenda="Histórico" mensagemVazia="Nada por aqui." />);

    expect(screen.getByText("Nada por aqui.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
