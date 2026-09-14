import { describe, expect, it } from "vitest";
import {
  formatarCnpj,
  formatarDataHora,
  formatarQuantidade,
  somenteDigitos,
  validarCnpj,
} from "../../src/utils/formato";

describe("validarCnpj", () => {
  it.each(["11.222.333/0001-81", "11222333000181", "33.000.167/0001-01", " 55.666.777/0001-81 "])(
    "aceita o CNPJ válido %s",
    (cnpj) => {
      expect(validarCnpj(cnpj)).toBe(true);
    }
  );

  it.each([
    ["dígito verificador errado", "11.222.333/0001-82"],
    ["primeiro dígito errado", "11.222.333/0001-71"],
    ["dígitos repetidos", "00.000.000/0000-00"],
    ["dígitos repetidos sem máscara", "11111111111111"],
    ["dígitos a menos", "1122233300018"],
    ["dígitos a mais", "112223330001810"],
    ["letra no lugar de dígito", "11.222.333/0001-8a"],
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

  it("formata parte dos dígitos, para uso durante a digitação", () => {
    expect(formatarCnpj("11")).toBe("11");
    expect(formatarCnpj("112223")).toBe("11.222.3");
    expect(formatarCnpj("1122233300")).toBe("11.222.333/00");
  });

  it("descarta o que passar de 14 dígitos e o que não for dígito", () => {
    expect(formatarCnpj("11a2223330001819999")).toBe("11.222.333/0001-81");
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
