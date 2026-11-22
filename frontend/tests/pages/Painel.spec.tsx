import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { Painel } from "../../src/pages/Painel";
import { pastilhas } from "../mocks/handlers/pastilhas";
import { resumoPainel } from "../mocks/handlers/painel";
import { server } from "../mocks/server";
import { renderizar } from "../utils/renderizar";

function valorDoCartao(rotulo: string) {
  return screen.getByText(rotulo).nextElementSibling?.textContent;
}

describe("página do painel", () => {
  it("mostra os totais e os itens críticos vindos da API", async () => {
    renderizar(<Painel />);

    expect(await screen.findByRole("heading", { name: "Painel" })).toBeInTheDocument();
    expect(valorDoCartao("Pastilhas cadastradas")).toBe(String(resumoPainel.totalPastilhas));
    expect(valorDoCartao("Itens em nível crítico")).toBe(String(resumoPainel.itensCriticos.length));
    expect(valorDoCartao("Alertas de reposição abertos")).toBe(String(resumoPainel.alertasAbertos));

    const grafico = screen.getByRole("list", { name: "Itens críticos" });
    expect(resumoPainel.itensCriticos.map((item) => item.codigo)).toEqual([
      "WNMG 080408-TF",
      "APMT 1604 PDER",
    ]);
    for (const item of resumoPainel.itensCriticos) {
      expect(await within(grafico).findByText(item.codigo)).toBeInTheDocument();
    }
    expect(within(grafico).queryByText(pastilhas[0].codigo)).not.toBeInTheDocument();

    const ultimas = within(screen.getByRole("list", { name: "Últimas movimentações" })).getAllByRole(
      "listitem"
    );
    expect(ultimas).toHaveLength(resumoPainel.ultimasMovimentacoes.length);
  });

  it("mostra a mensagem de erro do servidor quando a API falha", async () => {
    server.use(
      http.get("*/api/painel/resumo", () =>
        HttpResponse.json({ erro: "Erro interno no servidor" }, { status: 500 })
      )
    );

    renderizar(<Painel />);

    expect(await screen.findByText("Erro interno no servidor")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Painel" })).not.toBeInTheDocument();
  });

  it("mostra a falta de conexão quando o servidor não responde", async () => {
    server.use(http.get("*/api/painel/resumo", () => HttpResponse.error()));

    renderizar(<Painel />);

    expect(
      await screen.findByText("Sem conexão com o servidor. Verifique a rede e tente de novo.")
    ).toBeInTheDocument();
  });
});
