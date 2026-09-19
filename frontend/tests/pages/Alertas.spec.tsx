import { screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { Alertas } from "../../src/pages/Alertas";
import { alertas } from "../mocks/handlers/alertas";
import { usuarioAdmin, usuarioComprador, usuarioGestor, usuarioOperador } from "../mocks/handlers/auth";
import { server } from "../mocks/server";
import { renderizar } from "../utils/renderizar";
import { iniciarSessao } from "../utils/sessao";

const abertos = alertas.filter((alerta) => alerta.situacao === "ABERTO");
const resolvidos = alertas.filter((alerta) => alerta.situacao === "RESOLVIDO");

async function renderizarAlertas() {
  const resultado = renderizar(<Alertas />, { initialEntries: ["/alertas"] });
  await screen.findByRole("table", { name: "Alertas de reposição" });
  return resultado;
}

function linhasDaTabela() {
  // a primeira linha é o cabeçalho
  return within(screen.getByRole("table", { name: "Alertas de reposição" }))
    .getAllByRole("row")
    .slice(1);
}

describe("página de alertas", () => {
  it("lista só os alertas abertos por padrão", async () => {
    iniciarSessao(usuarioOperador);

    await renderizarAlertas();

    expect(screen.getByRole("button", { name: "Abertos" })).toHaveAttribute("aria-pressed", "true");
    const linhas = linhasDaTabela();
    expect(linhas).toHaveLength(abertos.length);
    for (const alerta of abertos) {
      expect(screen.getByRole("row", { name: new RegExp(alerta.pastilha.codigo) })).toHaveTextContent(
        "Aberto"
      );
    }
  });

  it("o filtro Resolvidos mostra quem resolveu", async () => {
    iniciarSessao(usuarioOperador);
    const { usuario } = await renderizarAlertas();

    await usuario.click(screen.getByRole("button", { name: "Resolvidos" }));

    await waitFor(() => expect(linhasDaTabela()).toHaveLength(resolvidos.length));
    expect(screen.getByRole("button", { name: "Resolvidos" })).toHaveAttribute("aria-pressed", "true");
    const linha = screen.getByRole("row", { name: new RegExp(resolvidos[0].pastilha.codigo) });
    expect(linha).toHaveTextContent("Resolvido");
    expect(linha).toHaveTextContent(`por ${usuarioGestor.nome}`);
  });

  it("o filtro Todos mostra abertos e resolvidos", async () => {
    iniciarSessao(usuarioOperador);
    const { usuario } = await renderizarAlertas();

    await usuario.click(screen.getByRole("button", { name: "Todos" }));

    await waitFor(() => expect(linhasDaTabela()).toHaveLength(alertas.length));
  });

  it("mostra o fechamento automático quando não há responsável", async () => {
    server.use(
      http.get("*/api/alertas", () =>
        HttpResponse.json([
          { ...resolvidos[0], resolvidoPor: null, dataResolucao: "2026-09-03T12:00:00.000Z" },
        ])
      )
    );
    iniciarSessao(usuarioOperador);

    await renderizarAlertas();

    expect(linhasDaTabela()[0]).toHaveTextContent("automaticamente pela reposição");
  });

  it.each([
    ["ADMINISTRADOR", usuarioAdmin],
    ["GESTOR", usuarioGestor],
  ])("o %s vê Resolver em cada alerta aberto", async (_perfil, usuario) => {
    iniciarSessao(usuario);

    await renderizarAlertas();

    expect(screen.getAllByRole("button", { name: /^Resolver o alerta de/ })).toHaveLength(abertos.length);
  });

  it.each([
    ["OPERADOR", usuarioOperador],
    ["COMPRADOR", usuarioComprador],
  ])("o %s não vê o botão Resolver", async (_perfil, usuario) => {
    iniciarSessao(usuario);

    await renderizarAlertas();

    expect(screen.queryByRole("button", { name: /^Resolver o alerta de/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Ações" })).not.toBeInTheDocument();
  });

  it("resolver pede confirmação e tira o alerta da lista de abertos", async () => {
    iniciarSessao(usuarioGestor);
    const { usuario } = await renderizarAlertas();
    const alvo = abertos[0];

    await usuario.click(screen.getByRole("button", { name: `Resolver o alerta de ${alvo.pastilha.codigo}` }));
    const confirmar = screen.getByRole("button", { name: "Confirmar resolução" });
    expect(confirmar).toHaveFocus();
    await usuario.click(confirmar);

    expect(await screen.findByRole("status")).toHaveTextContent(
      `Alerta de ${alvo.pastilha.codigo} resolvido.`
    );
    await waitFor(() => expect(linhasDaTabela()).toHaveLength(abertos.length - 1));
    expect(screen.queryByRole("row", { name: new RegExp(alvo.pastilha.codigo) })).not.toBeInTheDocument();
  });

  it("cancelar a confirmação não resolve nada", async () => {
    iniciarSessao(usuarioGestor);
    const { usuario } = await renderizarAlertas();

    await usuario.click(screen.getAllByRole("button", { name: /^Resolver o alerta de/ })[0]);
    await usuario.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("button", { name: "Confirmar resolução" })).not.toBeInTheDocument();
    expect(linhasDaTabela()).toHaveLength(abertos.length);
  });

  it("mostra a mensagem da API quando o alerta já foi resolvido por outra pessoa", async () => {
    server.use(
      http.patch("*/api/alertas/:id/resolver", () =>
        HttpResponse.json(
          { erro: "Este alerta já foi resolvido", codigo: "ALERTA_JA_RESOLVIDO" },
          { status: 409 }
        )
      )
    );
    iniciarSessao(usuarioGestor);
    const { usuario } = await renderizarAlertas();

    await usuario.click(screen.getAllByRole("button", { name: /^Resolver o alerta de/ })[0]);
    await usuario.click(screen.getByRole("button", { name: "Confirmar resolução" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Este alerta já foi resolvido");
  });

  it("mostra o erro quando a lista não carrega", async () => {
    server.use(
      http.get("*/api/alertas", () =>
        HttpResponse.json({ erro: "Erro interno no servidor" }, { status: 500 })
      )
    );
    iniciarSessao(usuarioOperador);

    renderizar(<Alertas />, { initialEntries: ["/alertas"] });

    expect(await screen.findByRole("alert")).toHaveTextContent("Erro interno no servidor");
  });

  it("mostra uma frase quando não há alertas no filtro", async () => {
    server.use(http.get("*/api/alertas", () => HttpResponse.json([])));
    iniciarSessao(usuarioOperador);

    renderizar(<Alertas />, { initialEntries: ["/alertas"] });

    expect(await screen.findByText(/Nenhum alerta aberto/)).toBeInTheDocument();
  });
});
