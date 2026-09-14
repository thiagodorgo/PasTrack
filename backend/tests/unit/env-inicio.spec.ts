import { afterEach, describe, expect, it, vi } from "vitest";

describe("configuração lida na inicialização", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("com variável inválida, lista o que corrigir e encerra o processo com código 1", async () => {
    vi.stubEnv("JWT_SECRET", "curto");
    const sair = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    const erro = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.resetModules();

    await expect(import("../../src/config/env")).rejects.toThrow("JWT_SECRET");
    expect(erro).toHaveBeenCalledWith(expect.stringContaining("JWT_SECRET"));
    expect(sair).toHaveBeenCalledWith(1);
  });
});
