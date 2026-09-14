import { describe, expect, it } from "vitest";
import { formatarCnpj, validarCnpj } from "../../src/utils/cnpj";

describe("validarCnpj", () => {
  it.each([
    ["sem máscara", "11222333000181"],
    ["com máscara", "11.222.333/0001-81"],
    ["com outros dígitos", "12.345.678/0001-95"],
    ["que começa com zeros", "00.000.000/0001-91"],
    ["com resto zero no primeiro dígito", "33.000.167/0001-01"],
    ["com resto um no primeiro dígito", "60.701.190/0001-04"],
  ])("aceita CNPJ %s", (_caso, cnpj) => {
    expect(validarCnpj(cnpj)).toBe(true);
  });

  it.each([
    ["com o segundo dígito verificador errado", "11.222.333/0001-82"],
    ["com o primeiro dígito verificador errado", "11.222.333/0001-71"],
    ["com todos os dígitos iguais", "11111111111111"],
    ["só com zeros, que passaria na conta dos dígitos", "00000000000000"],
    ["com todos os dígitos iguais e máscara", "99.999.999/9999-99"],
    ["com 13 dígitos", "1122233300018"],
    ["com 15 dígitos", "112223330001810"],
    ["com máscara incompleta", "11.222.333/000181"],
    ["com separadores fora do lugar", "112.223.330/001-81"],
    ["com letras", "11.222.333/0001-8X"],
    ["com espaços nas pontas", " 11222333000181 "],
    ["vazio", ""],
  ])("recusa CNPJ %s", (_caso, cnpj) => {
    expect(validarCnpj(cnpj)).toBe(false);
  });
});

describe("formatarCnpj", () => {
  it("aplica a máscara ao CNPJ sem máscara", () => {
    expect(formatarCnpj("11222333000181")).toBe("11.222.333/0001-81");
  });

  it("mantém o CNPJ que já vem com máscara", () => {
    expect(formatarCnpj("00.000.000/0001-91")).toBe("00.000.000/0001-91");
  });

  it("lança erro para CNPJ inválido", () => {
    expect(() => formatarCnpj("11222333000182")).toThrow("CNPJ inválido");
  });
});
