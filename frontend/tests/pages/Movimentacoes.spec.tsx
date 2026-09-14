import { screen, within } from "@testing-library/react";
import { http } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { Movimentacoes } from "../../src/pages/Movimentacoes";
import type { NovaMovimentacao } from "../../src/services/movimentacoes";
import { fornecedores } from "../mocks/handlers/fornecedores";
import { movimentacoes } from "../mocks/handlers/movimentacoes";
import { pastilhas } from "../mocks/handlers/pastilhas";
import { server } from "../mocks/server";
import { renderizar } from "../utils/renderizar";
import { iniciarSessao } from "../utils/sessao";

async function renderizarMovimentacoes() {
  const resultado = renderizar(<Movimentacoes />, { initialEntries: ["/movimentacoes"] });
  // o histórico só aparece depois que as três listas foram carregadas
  await screen.findByRole("table");
  return resultado;
}

describe("página de movimentações", () => {
  // o registro exige sessão, como na API
  beforeEach(() => {
    iniciarSessao();
  });

  it("carrega o histórico, as pastilhas e os fornecedores", async () => {
    const { usuario } = await renderizarMovimentacoes();

    const linhas = within(screen.getByRole("table")).getAllByRole("row");
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

  it("registra uma SAÍDA e mostra o saldo atualizado", async () => {
    const enviadas: NovaMovimentacao[] = [];
    // só registra o corpo enviado; sem resposta própria, o handler padrão calcula o saldo
    server.use(
      http.post("*/api/movimentacoes", async ({ request }) => {
        enviadas.push((await request.clone().json()) as NovaMovimentacao);
      })
    );
    const { usuario } = await renderizarMovimentacoes();

    await usuario.selectOptions(screen.getByLabelText("Tipo"), "SAIDA");
    await usuario.selectOptions(screen.getByLabelText("Pastilha"), "1");
    await usuario.clear(screen.getByLabelText("Quantidade"));
    await usuario.type(screen.getByLabelText("Quantidade"), "3");
    await usuario.type(screen.getByLabelText("Documento (NF, OS...)"), "OS-2001");
    await usuario.click(screen.getByRole("button", { name: "Registrar" }));

    expect(await screen.findByText("Movimentação registrada. Saldo atual do item: 7.")).toBeInTheDocument();
    expect(enviadas).toEqual([{ tipo: "SAIDA", pastilhaId: 1, quantidade: 3, documento: "OS-2001" }]);
    expect(screen.getByLabelText("Quantidade")).toHaveValue(1);
    expect(screen.getByLabelText("Documento (NF, OS...)")).toHaveValue("");
  });

  it("mostra a mensagem de saldo insuficiente devolvida pelo servidor", async () => {
    const { usuario } = await renderizarMovimentacoes();

    await usuario.selectOptions(screen.getByLabelText("Pastilha"), "2");
    await usuario.clear(screen.getByLabelText("Quantidade"));
    await usuario.type(screen.getByLabelText("Quantidade"), "50");
    await usuario.click(screen.getByRole("button", { name: "Registrar" }));

    expect(await screen.findByText("Saldo insuficiente: há 4 un em estoque")).toBeInTheDocument();
    expect(screen.queryByText(/Movimentação registrada/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Quantidade")).toHaveValue(50);
  });
});
