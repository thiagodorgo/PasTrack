import { AxiosError } from "axios";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import {
  api,
  camposDoErro,
  codigoDoErro,
  EVENTO_SESSAO_EXPIRADA,
  EVENTO_TROCA_SENHA_OBRIGATORIA,
  mensagemDeErro,
} from "../../src/services/api";
import type { ErroApi } from "../../src/types";
import { credenciaisValidas } from "../mocks/handlers/auth";
import { server } from "../mocks/server";
import { capturarErro } from "../utils/requisicoes";
import { iniciarSessao } from "../utils/sessao";

function responderPastilhasCom(status: number, corpo: ErroApi = { erro: "Falha simulada" }) {
  server.use(http.get("*/api/pastilhas", () => HttpResponse.json(corpo, { status })));
}

// ouvintes registrados no window durante o teste, removidos no afterEach
const ouvintes: [string, Mock][] = [];

function ouvir(evento: string): Mock {
  const ouvinte = vi.fn();
  window.addEventListener(evento, ouvinte);
  ouvintes.push([evento, ouvinte]);
  return ouvinte;
}

afterEach(() => {
  for (const [evento, ouvinte] of ouvintes.splice(0)) window.removeEventListener(evento, ouvinte);
});

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
  // objeto no lugar de window.location: permite conferir que nada força a navegação nem recarrega a página
  let localizacao: { origin: string; pathname: string; href: string; reload: Mock };

  beforeEach(() => {
    localizacao = {
      origin: "http://localhost:3000",
      pathname: "/pastilhas",
      href: "http://localhost:3000/pastilhas",
      reload: vi.fn(),
    };
    vi.stubGlobal("location", localizacao);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("um 401 limpa a sessão e dispara pastrack:sessao-expirada, sem mexer em location", async () => {
    iniciarSessao();
    const sessaoExpirada = ouvir(EVENTO_SESSAO_EXPIRADA);
    responderPastilhasCom(401, { erro: "Token inválido ou expirado" });

    const erro = await capturarErro(api.get("/pastilhas"));

    expect(erro).toMatchObject({ response: { status: 401 } });
    expect(localStorage.getItem("pastrack:token")).toBeNull();
    expect(localStorage.getItem("pastrack:usuario")).toBeNull();
    expect(sessaoExpirada).toHaveBeenCalledTimes(1);
    expect(localizacao.href).toBe("http://localhost:3000/pastilhas");
    expect(localizacao.reload).not.toHaveBeenCalled();
  });

  it("o 401 do próprio login é credencial recusada: não mexe na sessão nem dispara o evento", async () => {
    iniciarSessao();
    const sessaoExpirada = ouvir(EVENTO_SESSAO_EXPIRADA);

    const erro = await capturarErro(
      api.post("/auth/login", { email: credenciaisValidas.email, senha: "senha-errada" })
    );

    expect(erro).toMatchObject({ response: { status: 401 } });
    expect(localStorage.getItem("pastrack:token")).not.toBeNull();
    expect(sessaoExpirada).not.toHaveBeenCalled();
  });

  it("um 403 TROCA_SENHA_OBRIGATORIA dispara pastrack:troca-senha-obrigatoria e preserva a sessão", async () => {
    iniciarSessao();
    const trocaObrigatoria = ouvir(EVENTO_TROCA_SENHA_OBRIGATORIA);
    const sessaoExpirada = ouvir(EVENTO_SESSAO_EXPIRADA);
    responderPastilhasCom(403, {
      erro: "Troque a sua senha para continuar",
      codigo: "TROCA_SENHA_OBRIGATORIA",
    });

    await capturarErro(api.get("/pastilhas"));

    expect(trocaObrigatoria).toHaveBeenCalledTimes(1);
    expect(sessaoExpirada).not.toHaveBeenCalled();
    expect(localStorage.getItem("pastrack:token")).not.toBeNull();
    expect(localizacao.href).toBe("http://localhost:3000/pastilhas");
  });

  it("um 403 de perfil sem permissão não dispara evento", async () => {
    iniciarSessao();
    const trocaObrigatoria = ouvir(EVENTO_TROCA_SENHA_OBRIGATORIA);
    responderPastilhasCom(403, { erro: "Acesso negado para este perfil" });

    await capturarErro(api.get("/pastilhas"));

    expect(trocaObrigatoria).not.toHaveBeenCalled();
    expect(localStorage.getItem("pastrack:token")).not.toBeNull();
  });

  it("outros erros preservam a sessão e não disparam eventos", async () => {
    iniciarSessao();
    const sessaoExpirada = ouvir(EVENTO_SESSAO_EXPIRADA);
    const trocaObrigatoria = ouvir(EVENTO_TROCA_SENHA_OBRIGATORIA);
    responderPastilhasCom(500);

    await capturarErro(api.get("/pastilhas"));

    expect(localStorage.getItem("pastrack:token")).not.toBeNull();
    expect(localStorage.getItem("pastrack:usuario")).not.toBeNull();
    expect(sessaoExpirada).not.toHaveBeenCalled();
    expect(trocaObrigatoria).not.toHaveBeenCalled();
  });
});

describe("mensagemDeErro", () => {
  it("devolve a mensagem enviada pelo servidor", async () => {
    // como na API, todo 404 traz o código NAO_ENCONTRADO
    responderPastilhasCom(404, { erro: "Pastilha não encontrada", codigo: "NAO_ENCONTRADO" });

    const erro = await capturarErro(api.get("/pastilhas"));

    expect(mensagemDeErro(erro)).toBe("Pastilha não encontrada");
    expect(codigoDoErro(erro)).toBe("NAO_ENCONTRADO");
  });

  it("sem conexão com o servidor, pede para verificar a rede", async () => {
    server.use(http.get("*/api/pastilhas", () => HttpResponse.error()));

    const erro = await capturarErro(api.get("/pastilhas"));

    expect(erro).toMatchObject({ code: "ERR_NETWORK" });
    expect(mensagemDeErro(erro)).toBe("Sem conexão com o servidor. Verifique a rede e tente de novo.");
  });

  // o interceptador de XHR do MSW não respeita o timeout do XHR; o erro é montado como o axios o monta
  it.each(["ECONNABORTED", "ETIMEDOUT"])(
    "com o tempo esgotado (%s), avisa que o servidor demorou",
    (codigo) => {
      const erro = new AxiosError("timeout of 8000ms exceeded", codigo);

      expect(mensagemDeErro(erro)).toBe("O servidor demorou para responder. Tente de novo em instantes.");
    }
  );

  it("com resposta sem o campo erro, devolve a mensagem de falha de comunicação", async () => {
    server.use(http.get("*/api/pastilhas", () => HttpResponse.text("Bad Gateway", { status: 502 })));

    const erro = await capturarErro(api.get("/pastilhas"));

    expect(mensagemDeErro(erro)).toBe("Falha na comunicação com o servidor");
  });

  it("para erros que não vêm do axios, devolve a mensagem de erro inesperado", () => {
    expect(mensagemDeErro(new Error("falha qualquer"))).toBe("Ocorreu um erro inesperado");
    expect(mensagemDeErro("texto solto")).toBe("Ocorreu um erro inesperado");
  });
});

describe("camposDoErro", () => {
  it("devolve os erros por campo e une os do mesmo campo", async () => {
    responderPastilhasCom(400, {
      erro: "Dados inválidos",
      codigo: "DADOS_INVALIDOS",
      campos: [
        { caminho: "quantidade", mensagem: "A quantidade deve ser um número inteiro" },
        { caminho: "quantidade", mensagem: "A quantidade deve ser de pelo menos 1" },
        { caminho: "fornecedorId", mensagem: "Informe o fornecedor" },
      ],
    });

    const erro = await capturarErro(api.get("/pastilhas"));

    expect(camposDoErro(erro)).toEqual({
      quantidade: "A quantidade deve ser um número inteiro; A quantidade deve ser de pelo menos 1",
      fornecedorId: "Informe o fornecedor",
    });
  });

  it("ignora itens fora do formato", async () => {
    server.use(
      http.get("*/api/pastilhas", () =>
        HttpResponse.json(
          {
            erro: "Dados inválidos",
            campos: [null, { caminho: 1 }, { caminho: "nome", mensagem: "Informe o nome" }],
          },
          { status: 400 }
        )
      )
    );

    const erro = await capturarErro(api.get("/pastilhas"));

    expect(camposDoErro(erro)).toEqual({ nome: "Informe o nome" });
  });

  it("sem erros por campo, devolve um objeto vazio", async () => {
    responderPastilhasCom(500);

    const erro = await capturarErro(api.get("/pastilhas"));

    expect(camposDoErro(erro)).toEqual({});
    expect(camposDoErro(new Error("falha qualquer"))).toEqual({});
  });
});

describe("codigoDoErro", () => {
  it("devolve o código estável enviado pela API", async () => {
    responderPastilhasCom(409, { erro: "Já existe uma pastilha com este código", codigo: "DUPLICADO" });

    const erro = await capturarErro(api.get("/pastilhas"));

    expect(codigoDoErro(erro)).toBe("DUPLICADO");
  });

  it("sem código, devolve undefined", async () => {
    responderPastilhasCom(500);

    const erro = await capturarErro(api.get("/pastilhas"));

    expect(codigoDoErro(erro)).toBeUndefined();
    expect(codigoDoErro("texto solto")).toBeUndefined();
  });
});
