import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { UsuarioAutenticado } from "../../src/middlewares/auth";
import { tratarErros } from "../../src/middlewares/erros";
import { exigirSenhaAtualizada } from "../../src/middlewares/exigir-senha-atualizada";

function montarApp(usuario?: UsuarioAutenticado) {
  const app = express();
  app.use((req, _res, next) => {
    req.usuario = usuario;
    next();
  });
  app.get("/protegida", exigirSenhaAtualizada, (_req, res) => {
    res.json({ ok: true });
  });
  app.use(tratarErros);
  return app;
}

const base: UsuarioAutenticado = { id: 1, nome: "Ana", perfil: "OPERADOR", deveTrocarSenha: false };

describe("exigirSenhaAtualizada", () => {
  it("libera quem já trocou a senha", async () => {
    const resposta = await request(montarApp(base)).get("/protegida");
    expect(resposta.status).toBe(200);
  });

  it("bloqueia com 403 TROCA_SENHA_OBRIGATORIA quem ainda precisa trocar", async () => {
    const resposta = await request(montarApp({ ...base, deveTrocarSenha: true })).get("/protegida");
    expect(resposta.status).toBe(403);
    expect(resposta.body).toEqual({
      erro: "Troque a sua senha para continuar.",
      codigo: "TROCA_SENHA_OBRIGATORIA",
    });
  });

  it("recusa com 401 se usada sem autenticar antes", async () => {
    const resposta = await request(montarApp()).get("/protegida");
    expect(resposta.status).toBe(401);
    expect(resposta.body.codigo).toBe("SESSAO_INVALIDA");
  });
});
