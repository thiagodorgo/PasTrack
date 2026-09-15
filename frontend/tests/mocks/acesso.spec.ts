import { describe, expect, it } from "vitest";
import { responderErro } from "./acesso";

describe("respostas de erro dos handlers simulados", () => {
  it("todo 404 sai com o código NAO_ENCONTRADO, como na API", async () => {
    const resposta = responderErro(404, { erro: "Registro não encontrado" });

    expect(resposta.status).toBe(404);
    expect(await resposta.json()).toEqual({ erro: "Registro não encontrado", codigo: "NAO_ENCONTRADO" });
  });

  it("os demais erros saem como foram montados", async () => {
    const resposta = responderErro(409, {
      erro: "Já existe um fabricante com este nome",
      codigo: "DUPLICADO",
    });

    expect(resposta.status).toBe(409);
    expect(await resposta.json()).toEqual({
      erro: "Já existe um fabricante com este nome",
      codigo: "DUPLICADO",
    });
  });
});
