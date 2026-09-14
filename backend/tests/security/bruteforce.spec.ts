import { describe, expect, it } from "vitest";
import { env } from "../../src/config/env";
import { api, autorizacao } from "../helpers/api";
import { criarUsuario, SENHA_PADRAO } from "../helpers/fabricas";

const SENHA_ERRADA = "SenhaErrada999";

function tentarLogin(email: string, senha: string, xForwardedFor?: string) {
  const requisicao = api().post("/api/auth/login");
  if (xForwardedFor) requisicao.set("X-Forwarded-For", xForwardedFor);
  return requisicao.send({ email, senha });
}

/** Cada teste usa um e-mail próprio: o contador do limite vive enquanto o app do arquivo existir. */
describe("limite de tentativas de login", () => {
  const limite = env.RATE_LIMIT_LOGIN_MAX;

  it("usa o padrão de 5 falhas", () => {
    expect(limite).toBe(5);
  });

  it("a 6ª falha responde 429 com Retry-After e bloqueia até a senha certa", async () => {
    const email = "alvo1@teste.local";
    await criarUsuario({ email });
    for (let tentativa = 1; tentativa <= limite; tentativa++) {
      expect((await tentarLogin(email, SENHA_ERRADA)).status).toBe(401);
    }

    const bloqueada = await tentarLogin(email, SENHA_ERRADA);
    expect(bloqueada.status).toBe(429);
    expect(bloqueada.body).toEqual({ erro: expect.any(String), codigo: "MUITAS_TENTATIVAS" });
    const esperaSegundos = Number(bloqueada.headers["retry-after"]);
    expect(esperaSegundos).toBeGreaterThan(0);
    expect(esperaSegundos).toBeLessThanOrEqual(env.RATE_LIMIT_LOGIN_JANELA_MIN * 60);
    expect(bloqueada.headers["ratelimit-policy"]).toContain("q=" + limite);

    expect((await tentarLogin(email, SENHA_PADRAO)).status).toBe(429);
  });

  it("logins bem-sucedidos não contam como tentativa", async () => {
    const email = "alvo2@teste.local";
    await criarUsuario({ email });
    for (let tentativa = 1; tentativa < limite; tentativa++) {
      expect((await tentarLogin(email, SENHA_ERRADA)).status).toBe(401);
    }
    for (let acerto = 1; acerto <= limite + 1; acerto++) {
      expect((await tentarLogin(email, SENHA_PADRAO)).status).toBe(200);
    }
    expect((await tentarLogin(email, SENHA_ERRADA)).status).toBe(401);
    expect((await tentarLogin(email, SENHA_ERRADA)).status).toBe(429);
  });

  it("outro e-mail usa outro contador", async () => {
    const esgotado = "alvo3@teste.local";
    const outro = "alvo4@teste.local";
    await criarUsuario({ email: esgotado });
    await criarUsuario({ email: outro });
    for (let tentativa = 1; tentativa <= limite; tentativa++) {
      await tentarLogin(esgotado, SENHA_ERRADA);
    }
    expect((await tentarLogin(esgotado, SENHA_ERRADA)).status).toBe(429);
    expect((await tentarLogin(outro, SENHA_ERRADA)).status).toBe(401);
    expect((await tentarLogin(outro, SENHA_PADRAO)).status).toBe(200);
  });

  it("maiúsculas e espaços no e-mail não abrem um contador novo", async () => {
    const email = "alvo5@teste.local";
    await criarUsuario({ email });
    const variantes = ["alvo5@teste.local", " ALVO5@teste.local", "Alvo5@Teste.Local "];
    for (let tentativa = 0; tentativa < limite; tentativa++) {
      expect((await tentarLogin(variantes[tentativa % variantes.length], SENHA_ERRADA)).status).toBe(401);
    }
    expect((await tentarLogin("ALVO5@TESTE.LOCAL", SENHA_ERRADA)).status).toBe(429);
  });

  it("com TRUST_PROXY=0, X-Forwarded-For forjado não burla o limite", async () => {
    expect(env.TRUST_PROXY).toBe(0);
    const email = "alvo6@teste.local";
    await criarUsuario({ email });
    for (let tentativa = 1; tentativa <= limite; tentativa++) {
      expect((await tentarLogin(email, SENHA_ERRADA, "203.0.113." + tentativa)).status).toBe(401);
    }
    expect((await tentarLogin(email, SENHA_ERRADA, "198.51.100.77")).status).toBe(429);
  });
});

describe("limite de tentativas na troca de senha", () => {
  function trocarSenha(token: string, senhaAtual: string, novaSenha: string) {
    return api().patch("/api/auth/senha").set(autorizacao(token)).send({ senhaAtual, novaSenha });
  }

  it("a 6ª senha atual errada responde 429; senha fraca não conta", async () => {
    const limite = env.RATE_LIMIT_LOGIN_MAX;
    const { token } = await criarUsuario();
    for (let tentativa = 1; tentativa <= limite + 2; tentativa++) {
      expect((await trocarSenha(token, SENHA_PADRAO, "fraca")).body.codigo).toBe("SENHA_FRACA");
    }
    for (let tentativa = 1; tentativa <= limite; tentativa++) {
      const resposta = await trocarSenha(token, SENHA_ERRADA, "OutraSenhaForte2026");
      expect(resposta.body.codigo).toBe("SENHA_ATUAL_INCORRETA");
    }

    const bloqueada = await trocarSenha(token, SENHA_PADRAO, "OutraSenhaForte2026");
    expect(bloqueada.status).toBe(429);
    expect(bloqueada.body.codigo).toBe("MUITAS_TENTATIVAS");
    expect(Number(bloqueada.headers["retry-after"])).toBeGreaterThan(0);
  });
});
