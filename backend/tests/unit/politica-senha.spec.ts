import { describe, expect, it } from "vitest";
import { validarPoliticaDeSenha } from "../../src/services/politica-senha";

describe("validarPoliticaDeSenha", () => {
  it("aceita uma senha forte", () => {
    expect(validarPoliticaDeSenha("Estoque2026Seguro")).toEqual([]);
  });

  it.each([
    ["curta", "Abc1234567", "use pelo menos 12 caracteres"],
    ["sem número", "SomenteLetras", "inclua pelo menos um número"],
    ["sem letra", "12345678901", "inclua pelo menos uma letra"],
    ["comum", "Senha12345", "essa senha é comum demais"],
    ["acima de 72 bytes por causa de acentos", `${"á".repeat(37)}1`, "use no máximo 72 bytes"],
  ])("recusa senha %s", (_caso, senha, problema) => {
    expect(validarPoliticaDeSenha(senha)).toContain(problema);
  });

  it("aceita exatamente 72 bytes", () => {
    expect(validarPoliticaDeSenha(`${"a".repeat(71)}1`)).toEqual([]);
  });

  it("recusa senha que contém o e-mail", () => {
    expect(validarPoliticaDeSenha("maria2026abc", "Maria@empresa.com")).toContain(
      "não use o seu e-mail na senha"
    );
  });
});
