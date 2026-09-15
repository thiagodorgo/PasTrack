import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  alterarSenha,
  estaAutenticado,
  gravarSessao,
  login,
  marcarTrocaDeSenhaObrigatoria,
  me,
  sair,
  sessaoExpirada,
  tokenExpirado,
  usuarioSalvo,
} from "../../src/services/auth";
import {
  credenciaisTemporarias,
  credenciaisValidas,
  usuarioAdmin,
  usuarioComSenhaTemporaria,
  usuarioGestor,
} from "../mocks/handlers/auth";
import { server } from "../mocks/server";
import { agoraEmSegundos, criarJwt, criarTokenExpirado, criarTokenValido, lerPayload } from "../utils/jwt";
import { capturarErro } from "../utils/requisicoes";
import { iniciarSessao } from "../utils/sessao";

describe("serviço de autenticação", () => {
  it("login grava o token e o usuário devolvidos pelo servidor", async () => {
    const usuario = await login(credenciaisValidas.email, credenciaisValidas.senha);

    expect(usuario).toEqual(usuarioAdmin);
    const token = localStorage.getItem("pastrack:token");
    expect(token).not.toBeNull();
    expect(lerPayload(token ?? "")).toMatchObject({ id: usuarioAdmin.id, perfil: usuarioAdmin.perfil });
    expect(localStorage.getItem("pastrack:usuario")).toBe(JSON.stringify(usuarioAdmin));
  });

  it("login devolve deveTrocarSenha de quem ainda usa a senha temporária", async () => {
    const usuario = await login(credenciaisTemporarias.email, credenciaisTemporarias.senha);

    expect(usuario.deveTrocarSenha).toBe(true);
    expect(usuarioSalvo()).toEqual(usuarioComSenhaTemporaria);
  });

  it("sair remove o token e o usuário", () => {
    iniciarSessao();

    sair();

    expect(localStorage.getItem("pastrack:token")).toBeNull();
    expect(localStorage.getItem("pastrack:usuario")).toBeNull();
  });

  it("gravarSessao grava o token e o usuário", () => {
    gravarSessao("token-qualquer", usuarioGestor);

    expect(localStorage.getItem("pastrack:token")).toBe("token-qualquer");
    expect(usuarioSalvo()).toEqual(usuarioGestor);
  });

  it("me devolve o usuário do token", async () => {
    iniciarSessao(usuarioGestor);

    expect(await me()).toEqual(usuarioGestor);
  });

  it("alterarSenha grava o token novo devolvido pela API", async () => {
    iniciarSessao();
    server.use(http.patch("*/api/auth/senha", () => HttpResponse.json({ token: "token-depois-da-troca" })));

    const token = await alterarSenha(credenciaisValidas.senha, "Fresa2026retifica");

    expect(token).toBe("token-depois-da-troca");
    expect(localStorage.getItem("pastrack:token")).toBe("token-depois-da-troca");
  });

  it("alterarSenha com a senha atual errada rejeita e mantém o token", async () => {
    const { token } = iniciarSessao();

    const erro = await capturarErro(alterarSenha("senha-errada", "Fresa2026retifica"));

    expect(erro).toMatchObject({ response: { status: 400, data: { codigo: "SENHA_ATUAL_INCORRETA" } } });
    expect(localStorage.getItem("pastrack:token")).toBe(token);
  });
});

describe("usuarioSalvo", () => {
  it("lê o usuário gravado", () => {
    iniciarSessao();

    expect(usuarioSalvo()).toEqual(usuarioAdmin);
  });

  it("devolve null quando não há sessão", () => {
    expect(usuarioSalvo()).toBeNull();
  });

  // antes registrado como pendência: um JSON inválido lançava exceção e derrubava a aplicação
  it("não lança exceção com JSON inválido: limpa a sessão e devolve null", () => {
    iniciarSessao();
    localStorage.setItem("pastrack:usuario", "{json inválido");

    expect(() => usuarioSalvo()).not.toThrow();
    expect(usuarioSalvo()).toBeNull();
    expect(localStorage.getItem("pastrack:token")).toBeNull();
    expect(localStorage.getItem("pastrack:usuario")).toBeNull();
  });

  it("recusa conteúdo fora do formato de usuário e limpa a sessão", () => {
    iniciarSessao();
    localStorage.setItem("pastrack:usuario", JSON.stringify({ nome: "Sem id", perfil: "CHEFE" }));

    expect(usuarioSalvo()).toBeNull();
    expect(localStorage.getItem("pastrack:token")).toBeNull();
  });

  it("sessão gravada sem deveTrocarSenha conta como senha já trocada", () => {
    const gravadoAntes = {
      id: 1,
      nome: "Administrador",
      email: "admin@pastrack.com",
      perfil: "ADMINISTRADOR",
    };
    localStorage.setItem("pastrack:usuario", JSON.stringify(gravadoAntes));

    expect(usuarioSalvo()).toEqual({ ...gravadoAntes, deveTrocarSenha: false });
  });
});

describe("marcarTrocaDeSenhaObrigatoria", () => {
  it("marca deveTrocarSenha na sessão gravada e devolve o usuário", () => {
    iniciarSessao(usuarioGestor);

    const marcado = marcarTrocaDeSenhaObrigatoria();

    expect(marcado).toEqual({ ...usuarioGestor, deveTrocarSenha: true });
    expect(usuarioSalvo()).toEqual({ ...usuarioGestor, deveTrocarSenha: true });
  });

  it("sem sessão, devolve null", () => {
    expect(marcarTrocaDeSenhaObrigatoria()).toBeNull();
  });
});

describe("tokenExpirado", () => {
  it("o token expirado dos testes é um JWT bem formado com exp no passado", () => {
    const payload = lerPayload(criarTokenExpirado(usuarioAdmin));

    expect(payload.exp).toBeTypeOf("number");
    expect(payload.exp).toBeLessThan(agoraEmSegundos());
  });

  it("token dentro do prazo não expirou", () => {
    expect(tokenExpirado(criarTokenValido(usuarioAdmin))).toBe(false);
  });

  it("token com exp no passado expirou", () => {
    expect(tokenExpirado(criarTokenExpirado(usuarioAdmin))).toBe(true);
  });

  it("sem o instante de chegada, compara o exp com o instante informado", () => {
    const token = criarJwt({ id: 1, exp: agoraEmSegundos() + 60 });

    expect(tokenExpirado(token)).toBe(false);
    expect(tokenExpirado(token, null, Date.now() + 120_000)).toBe(true);
  });

  it("lê payload com acentos, codificado em base64url", () => {
    expect(tokenExpirado(criarTokenValido({ ...usuarioAdmin, nome: "João Conceição" }))).toBe(false);
  });

  it.each([
    ["texto sem partes", "nao-e-um-jwt"],
    ["só duas partes", "abc.def"],
    ["payload vazio", "abc..def"],
    ["payload fora de base64", "abc.%%%.def"],
    ["payload que não é JSON", `abc.${btoa("texto")}.def`],
    ["payload sem exp", criarJwt({ id: 1 })],
    ["exp em texto", criarJwt({ id: 1, exp: "amanhã" })],
  ])("token malformado conta como expirado: %s", (_caso, token) => {
    expect(tokenExpirado(token)).toBe(true);
  });
});

describe("validade do token contada a partir da chegada", () => {
  const UMA_HORA = 60 * 60 * 1000;
  const OITO_HORAS = 8 * UMA_HORA;
  const UM_DIA = 24 * UMA_HORA;

  afterEach(() => {
    vi.useRealTimers();
  });

  it("com o relógio do posto adiantado, o token vale pela sua duração a partir da chegada", () => {
    // emitido agora pelo servidor, com 8 horas de validade; o relógio do posto está um dia à frente
    const token = criarTokenValido(usuarioAdmin);
    const chegada = Date.now() + UM_DIA;

    expect(tokenExpirado(token, chegada, chegada + UMA_HORA)).toBe(false);
    expect(tokenExpirado(token, chegada, chegada + OITO_HORAS - UMA_HORA)).toBe(false);
    expect(tokenExpirado(token, chegada, chegada + OITO_HORAS)).toBe(true);
    // pelo exp absoluto, o mesmo token pareceria vencido desde a chegada
    expect(tokenExpirado(token, null, chegada)).toBe(true);
  });

  it("com o relógio do posto atrasado, o token não passa da sua duração", () => {
    const token = criarTokenValido(usuarioAdmin);
    const chegada = Date.now() - UM_DIA;

    expect(tokenExpirado(token, chegada, chegada + OITO_HORAS - UMA_HORA)).toBe(false);
    expect(tokenExpirado(token, chegada, chegada + OITO_HORAS + UMA_HORA)).toBe(true);
    // pelo exp absoluto, o mesmo token pareceria valer por mais um dia
    expect(tokenExpirado(token, null, chegada + OITO_HORAS + UMA_HORA)).toBe(false);
  });

  it("sem iat no token, vale o exp absoluto mesmo com o instante de chegada", () => {
    const token = criarJwt({ id: 1, exp: agoraEmSegundos() + 60 });

    expect(tokenExpirado(token, Date.now() - UM_DIA, Date.now())).toBe(false);
    expect(tokenExpirado(token, Date.now() + UM_DIA, Date.now() + 120_000)).toBe(true);
  });

  it("a sessão gravada vale com o relógio do posto adiantado e acaba ao fim da duração", () => {
    // o servidor emite o token com o relógio certo; o posto está um dia à frente quando ele chega
    const token = criarTokenValido(usuarioAdmin);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + UM_DIA);

    gravarSessao(token, usuarioAdmin);

    expect(estaAutenticado()).toBe(true);
    expect(sessaoExpirada()).toBe(false);

    vi.setSystemTime(Date.now() + OITO_HORAS);

    expect(estaAutenticado()).toBe(false);
    expect(sessaoExpirada()).toBe(true);
  });

  it("com o relógio do posto atrasado, a sessão gravada acaba ao fim da duração do token", () => {
    const token = criarTokenValido(usuarioAdmin);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() - UM_DIA);

    gravarSessao(token, usuarioAdmin);

    expect(estaAutenticado()).toBe(true);

    vi.setSystemTime(Date.now() + OITO_HORAS + UMA_HORA);

    expect(estaAutenticado()).toBe(false);
    expect(sessaoExpirada()).toBe(true);
  });

  it("o instante de chegada é gravado junto com o token e sai com a sessão", () => {
    const antes = Date.now();

    gravarSessao(criarTokenValido(usuarioAdmin), usuarioAdmin);

    const gravado = Number(localStorage.getItem("pastrack:token-recebido-em"));
    expect(gravado).toBeGreaterThanOrEqual(antes);
    expect(gravado).toBeLessThanOrEqual(Date.now());

    sair();

    expect(localStorage.getItem("pastrack:token-recebido-em")).toBeNull();
  });

  it("sem o instante de chegada, ou com ele ilegível, vale o exp absoluto", () => {
    localStorage.setItem("pastrack:token", criarTokenValido(usuarioAdmin));
    localStorage.setItem("pastrack:usuario", JSON.stringify(usuarioAdmin));

    expect(estaAutenticado()).toBe(true);

    localStorage.setItem("pastrack:token-recebido-em", "ontem");
    localStorage.setItem("pastrack:token", criarTokenExpirado(usuarioAdmin));

    expect(sessaoExpirada()).toBe(true);
  });
});

describe("estaAutenticado e sessaoExpirada", () => {
  it("sem token, não há sessão válida nem sessão expirada", () => {
    expect(estaAutenticado()).toBe(false);
    expect(sessaoExpirada()).toBe(false);
  });

  it("com token no prazo, a sessão vale", () => {
    iniciarSessao();

    expect(estaAutenticado()).toBe(true);
    expect(sessaoExpirada()).toBe(false);
  });

  it("com token vencido, a sessão expirou", () => {
    iniciarSessao(usuarioAdmin, criarTokenExpirado(usuarioAdmin));

    expect(estaAutenticado()).toBe(false);
    expect(sessaoExpirada()).toBe(true);
  });

  it("com token ilegível, a sessão também conta como expirada", () => {
    iniciarSessao(usuarioAdmin, "token-ilegivel");

    expect(estaAutenticado()).toBe(false);
    expect(sessaoExpirada()).toBe(true);
  });
});
