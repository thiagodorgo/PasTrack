import { describe, expect, it } from "vitest";
import { paraJsonSeguro } from "../../src/services/auditoria.service";

describe("paraJsonSeguro", () => {
  it("remove campos sensíveis em qualquer nível", () => {
    const usuario = {
      id: 1,
      nome: "Ana",
      senhaHash: "hash",
      versaoToken: 3,
      detalhes: { senha: "segredo-qualquer", novaSenha: "outra", perfil: "GESTOR" },
    };
    expect(paraJsonSeguro(usuario)).toEqual({ id: 1, nome: "Ana", detalhes: { perfil: "GESTOR" } });
  });

  it("converte datas em texto ISO", () => {
    const data = new Date("2026-09-14T12:00:00.000Z");
    expect(paraJsonSeguro({ data })).toEqual({ data: "2026-09-14T12:00:00.000Z" });
  });

  it("ignora valores ausentes", () => {
    expect(paraJsonSeguro(undefined)).toBeUndefined();
    expect(paraJsonSeguro(null)).toBeUndefined();
  });
});
