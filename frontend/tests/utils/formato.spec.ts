import { describe, expect, it } from "vitest";
import {
  formatarCnpj,
  formatarDataHora,
  formatarQuantidade,
  normalizarCnpj,
  somenteDigitos,
  validarCnpj,
} from "../../src/utils/formato";

describe("validarCnpj", () => {
  it.each(["11.222.333/0001-81", "11222333000181", "33.000.167/0001-01", " 55.666.777/0001-81 "])(
    "aceita o CNPJ numérico válido %s",
    (cnpj) => {
      expect(validarCnpj(cnpj)).toBe(true);
    }
  );

  it.each(["12.ABC.345/01DE-35", "12ABC34501DE35", "12.abc.345/01de-35"])(
    "aceita o CNPJ alfanumérico válido %s",
    (cnpj) => {
      expect(validarCnpj(cnpj)).toBe(true);
    }
  );

  it.each([
    ["dígito verificador errado", "11.222.333/0001-82"],
    ["primeiro dígito errado", "11.222.333/0001-71"],
    ["dígito verificador errado no alfanumérico", "12.ABC.345/01DE-36"],
    ["primeiro dígito errado no alfanumérico", "12.ABC.345/01DE-25"],
    ["letra nos dígitos verificadores", "11.222.333/0001-8a"],
    ["letra nos dígitos verificadores do alfanumérico", "12.ABC.345/01DE-3E"],
    ["símbolo fora das letras e dígitos", "12.AB#.345/01DE-35"],
    ["dígitos repetidos", "00.000.000/0000-00"],
    ["dígitos repetidos sem máscara", "11111111111111"],
    ["caracteres a menos", "1122233300018"],
    ["caracteres a mais", "112223330001810"],
    ["máscara fora do lugar", "112.223.330/0018-1"],
    ["valor vazio", ""],
  ])("recusa %s (%s)", (_caso, cnpj) => {
    expect(validarCnpj(cnpj)).toBe(false);
  });
});

describe("formatarCnpj", () => {
  it("aplica a máscara aos 14 dígitos", () => {
    expect(formatarCnpj("11222333000181")).toBe("11.222.333/0001-81");
  });

  it("mantém um CNPJ já formatado", () => {
    expect(formatarCnpj("11.222.333/0001-81")).toBe("11.222.333/0001-81");
  });

  it("mantém as letras do CNPJ alfanumérico, em maiúsculas", () => {
    expect(formatarCnpj("12abc34501de35")).toBe("12.ABC.345/01DE-35");
    expect(formatarCnpj("12.ABC.345/01DE-35")).toBe("12.ABC.345/01DE-35");
  });

  it("formata parte dos caracteres, para uso durante a digitação", () => {
    expect(formatarCnpj("11")).toBe("11");
    expect(formatarCnpj("112223")).toBe("11.222.3");
    expect(formatarCnpj("1122233300")).toBe("11.222.333/00");
    expect(formatarCnpj("12abc3")).toBe("12.ABC.3");
  });

  it("descarta o que passar de 14 caracteres e o que não for letra ou dígito", () => {
    expect(formatarCnpj("11.222.333/0001-8199")).toBe("11.222.333/0001-81");
    expect(formatarCnpj("12-abc 345*01de35")).toBe("12.ABC.345/01DE-35");
  });
});

describe("normalizarCnpj", () => {
  it("tira a pontuação e passa as letras para maiúsculas", () => {
    expect(normalizarCnpj(" 12.abc.345/01de-35 ")).toBe("12ABC34501DE35");
  });
});

describe("somenteDigitos", () => {
  it("remove pontuação e letras", () => {
    expect(somenteDigitos("11.222.333/0001-81")).toBe("11222333000181");
  });
});

describe("formatarDataHora", () => {
  const doisDigitos = (n: number) => String(n).padStart(2, "0");

  it("usa dia/mês/ano e hora:minuto no fuso local", () => {
    // meio-dia em UTC: a data é a mesma em qualquer fuso do Brasil
    const iso = "2026-09-10T12:05:00.000Z";
    const local = new Date(iso);

    expect(formatarDataHora(iso)).toBe(
      `10/09/2026 ${doisDigitos(local.getHours())}:${doisDigitos(local.getMinutes())}`
    );
  });

  it("devolve '-' para valor ausente ou inválido", () => {
    expect(formatarDataHora(null)).toBe("-");
    expect(formatarDataHora(undefined)).toBe("-");
    expect(formatarDataHora("")).toBe("-");
    expect(formatarDataHora("data inválida")).toBe("-");
  });
});

describe("formatarQuantidade", () => {
  it("usa separador de milhar e a unidade", () => {
    expect(formatarQuantidade(1500, "un")).toBe("1.500 un");
    expect(formatarQuantidade(1000000, "pc")).toBe("1.000.000 pc");
  });

  it("sem unidade, mostra só o número", () => {
    expect(formatarQuantidade(7)).toBe("7");
  });
});
