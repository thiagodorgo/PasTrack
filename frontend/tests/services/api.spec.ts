import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, mensagemDeErro } from "../../src/services/api";
import { server } from "../mocks/server";
import { iniciarSessao } from "../utils/sessao";

async function capturarErro(requisicao: Promise<unknown>): Promise<unknown> {
  try {
    await requisicao;
  } catch (erro) {
    return erro;
  }
  throw new Error("a requisição deveria ter falhado");
}

function responderPastilhasCom(status: number, corpo: { erro: string } = { erro: "Falha simulada" }) {
  server.use(http.get("*/api/pastilhas", () => HttpResponse.json(corpo, { status })));
}

describe("api: interceptor de requisição", () => {
  function capturarAutorizacao() {
    const recebido: { authorization?: string | null } = {};
    server.use(
      http.get("*/api/pastilhas", ({ request }) => {
        recebido.authorization = request.headers.get("Authorization");
        return HttpResponse.json([]);
      })
    );
    return recebido;
  }

  it("injeta Authorization: Bearer <token> quando há token", async () => {
    const { token } = iniciarSessao();
    const recebido = capturarAutorizacao();

    await api.get("/pastilhas");

    expect(recebido.authorization).toBe(`Bearer ${token}`);
  });

  it("não envia Authorization quando não há token", async () => {
    const recebido = capturarAutorizacao();

    await api.get("/pastilhas");

    expect(recebido.authorization).toBeNull();
  });
});

describe("api: interceptor de resposta", () => {
  // objeto no lugar de window.location: permite conferir o redirecionamento sem acionar a navegação do jsdom
  let localizacao: { origin: string; pathname: string; href: string };

  function estarNaRota(pathname: string) {
    localizacao = { origin: "http://localhost:3000", pathname, href: `http://localhost:3000${pathname}` };
    vi.stubGlobal("location", localizacao);
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uma resposta 401 limpa pastrack:token e pastrack:usuario e redireciona para /login", async () => {
    estarNaRota("/pastilhas");
    iniciarSessao();
    responderPastilhasCom(401, { erro: "Token inválido ou expirado" });

    const erro = await capturarErro(api.get("/pastilhas"));

    expect(erro).toMatchObject({ response: { status: 401 } });
    expect(localStorage.getItem("pastrack:token")).toBeNull();
    expect(localStorage.getItem("pastrack:usuario")).toBeNull();
    expect(localizacao.href).toBe("/login");
  });

  it("na própria tela de login, um 401 não mexe na sessão nem redireciona", async () => {
    estarNaRota("/login");
    iniciarSessao();
    responderPastilhasCom(401);

    await capturarErro(api.get("/pastilhas"));

    expect(localStorage.getItem("pastrack:token")).not.toBeNull();
    expect(localizacao.href).toBe("http://localhost:3000/login");
  });

  it("erros diferentes de 401 preservam a sessão", async () => {
    estarNaRota("/pastilhas");
    iniciarSessao();
    responderPastilhasCom(500);

    await capturarErro(api.get("/pastilhas"));

    expect(localStorage.getItem("pastrack:token")).not.toBeNull();
    expect(localStorage.getItem("pastrack:usuario")).not.toBeNull();
    expect(localizacao.href).toBe("http://localhost:3000/pastilhas");
  });
});

describe("mensagemDeErro", () => {
  it("devolve a mensagem enviada pelo servidor", async () => {
    responderPastilhasCom(404, { erro: "Pastilha não encontrada" });

    const erro = await capturarErro(api.get("/pastilhas"));

    expect(mensagemDeErro(erro)).toBe("Pastilha não encontrada");
  });

  it("sem resposta do servidor, devolve a mensagem de falha de comunicação", async () => {
    server.use(http.get("*/api/pastilhas", () => HttpResponse.error()));

    const erro = await capturarErro(api.get("/pastilhas"));

    expect(mensagemDeErro(erro)).toBe("Falha na comunicação com o servidor");
  });

  it("com resposta sem o campo erro, também devolve a mensagem de falha de comunicação", async () => {
    server.use(http.get("*/api/pastilhas", () => HttpResponse.text("Bad Gateway", { status: 502 })));

    const erro = await capturarErro(api.get("/pastilhas"));

    expect(mensagemDeErro(erro)).toBe("Falha na comunicação com o servidor");
  });

  it("para erros que não vêm do axios, devolve a mensagem de erro inesperado", () => {
    expect(mensagemDeErro(new Error("falha qualquer"))).toBe("Ocorreu um erro inesperado");
    expect(mensagemDeErro("texto solto")).toBe("Ocorreu um erro inesperado");
  });
});
