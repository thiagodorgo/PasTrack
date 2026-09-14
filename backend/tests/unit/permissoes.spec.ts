import { PerfilUsuario } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { Acao, PERMISSOES, pode } from "../../src/config/permissoes";

/** Espelho, escrito à mão, da matriz de perfis aprovada. Mudar aqui exige decisão registrada. */
const ESPERADO: Record<Acao, PerfilUsuario[]> = {
  consultar: ["ADMINISTRADOR", "GESTOR", "OPERADOR", "COMPRADOR"],
  gerenciarPastilhas: ["ADMINISTRADOR", "GESTOR"],
  gerenciarFabricantes: ["ADMINISTRADOR", "GESTOR"],
  gerenciarFornecedores: ["ADMINISTRADOR", "GESTOR", "COMPRADOR"],
  registrarEntrada: ["ADMINISTRADOR", "GESTOR", "OPERADOR", "COMPRADOR"],
  registrarSaida: ["ADMINISTRADOR", "GESTOR", "OPERADOR"],
  resolverAlerta: ["ADMINISTRADOR", "GESTOR"],
  gerenciarUsuarios: ["ADMINISTRADOR"],
};

const PERFIS: PerfilUsuario[] = ["ADMINISTRADOR", "GESTOR", "OPERADOR", "COMPRADOR"];

describe("matriz de permissões", () => {
  it("tem exatamente as ações previstas", () => {
    expect(Object.keys(PERMISSOES).sort()).toEqual(Object.keys(ESPERADO).sort());
  });

  for (const acao of Object.keys(ESPERADO) as Acao[]) {
    for (const perfil of PERFIS) {
      const permitido = ESPERADO[acao].includes(perfil);
      it(`${perfil} ${permitido ? "pode" : "não pode"} ${acao}`, () => {
        expect(pode(perfil, acao)).toBe(permitido);
      });
    }
  }
});
