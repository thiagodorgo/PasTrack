import { describe, expect, it, vi } from "vitest";
import { gerarSenhaAleatoria, validarPoliticaDeSenha } from "../../src/services/politica-senha";

// permite forçar os bytes "aleatórios" de uma chamada para exercitar a nova tentativa
const bytesForcados = vi.hoisted(() => [] as Buffer[]);
vi.mock("node:crypto", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:crypto")>();
  return {
    ...original,
    randomBytes: (tamanho: number) => bytesForcados.shift() ?? original.randomBytes(tamanho),
  };
});

describe("gerarSenhaAleatoria", () => {
  it("gera 22 caracteres base64url que sempre atendem à política", () => {
    for (let i = 0; i < 200; i++) {
      const senha = gerarSenhaAleatoria();
      expect(senha).toMatch(/^[\w-]{22}$/);
      expect(validarPoliticaDeSenha(senha)).toEqual([]);
    }
  });

  it("não repete senhas", () => {
    const senhas = new Set(Array.from({ length: 200 }, () => gerarSenhaAleatoria()));
    expect(senhas.size).toBe(200);
  });

  it("tenta de novo quando a senha sorteada contém o nome do e-mail", () => {
    bytesForcados.push(
      Buffer.from("mariaAAAAAAAAAAAAAAA", "base64url"),
      Buffer.from("xyzwvutsrqponmlkjihg", "base64url")
    );
    const senha = gerarSenhaAleatoria("maria@empresa.com");
    expect(senha).toBe("xyzwvutsrqponmlkjihga1");
    expect(validarPoliticaDeSenha(senha, "maria@empresa.com")).toEqual([]);
  });
});
