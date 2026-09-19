import { describe, expect, it } from "vitest";
import { problemasDaSenha } from "../../src/utils/senha";

describe("problemasDaSenha", () => {
  it("aceita senha com 12 caracteres ou mais, letra e número", () => {
    expect(problemasDaSenha("Fresa2026retifica")).toEqual([]);
    expect(problemasDaSenha("abcdefghijk1")).toEqual([]);
  });

  it("recusa senha com menos de 12 caracteres", () => {
    expect(problemasDaSenha("abcdefghij1")).toEqual(["use pelo menos 12 caracteres"]);
  });

  it("exige pelo menos uma letra e um número", () => {
    expect(problemasDaSenha("123456789012")).toEqual(["inclua pelo menos uma letra"]);
    expect(problemasDaSenha("somenteletras")).toEqual(["inclua pelo menos um número"]);
  });

  it("conta os bytes em UTF-8: letras acentuadas ocupam 2", () => {
    // 36 letras acentuadas e um número: 37 caracteres, mas 73 bytes
    const acentuada = `${"ã".repeat(36)}1`;

    expect(problemasDaSenha(acentuada)).toEqual(["use no máximo 72 bytes (letras acentuadas contam 2)"]);
    expect(problemasDaSenha(`${"a".repeat(71)}1`)).toEqual([]);
  });

  it("acumula os problemas encontrados", () => {
    expect(problemasDaSenha("")).toEqual([
      "use pelo menos 12 caracteres",
      "inclua pelo menos uma letra",
      "inclua pelo menos um número",
    ]);
  });
});
