import { describe, expect, it } from "vitest";
import type { Perfil } from "../../src/types";
import { type Acao, ehPerfil, PERFIS, PERMISSOES, pode, ROTULOS_PERFIL } from "../../src/utils/permissoes";

// Matriz do backend copiada à mão: mudar o espelho sem mudar esta tabela faz o teste acusar a diferença.
const MATRIZ_DO_BACKEND: Record<Acao, Perfil[]> = {
  consultar: ["ADMINISTRADOR", "GESTOR", "OPERADOR", "COMPRADOR"],
  gerenciarPastilhas: ["ADMINISTRADOR", "GESTOR"],
  gerenciarFabricantes: ["ADMINISTRADOR", "GESTOR"],
  gerenciarFornecedores: ["ADMINISTRADOR", "GESTOR", "COMPRADOR"],
  registrarEntrada: ["ADMINISTRADOR", "GESTOR", "OPERADOR", "COMPRADOR"],
  registrarSaida: ["ADMINISTRADOR", "GESTOR", "OPERADOR"],
  resolverAlerta: ["ADMINISTRADOR", "GESTOR"],
  gerenciarUsuarios: ["ADMINISTRADOR"],
};

describe("permissões", () => {
  it("o espelho tem as mesmas ações e perfis da matriz do backend", () => {
    const acoes = Object.keys(PERMISSOES) as Acao[];
    const calculada = Object.fromEntries(acoes.map((acao) => [acao, PERFIS.filter((p) => pode(p, acao))]));

    expect(calculada).toEqual(MATRIZ_DO_BACKEND);
  });

  it("o COMPRADOR registra entrada, mas não saída", () => {
    expect(pode("COMPRADOR", "registrarEntrada")).toBe(true);
    expect(pode("COMPRADOR", "registrarSaida")).toBe(false);
  });

  it("só o ADMINISTRADOR gerencia usuários", () => {
    expect(PERFIS.filter((perfil) => pode(perfil, "gerenciarUsuarios"))).toEqual(["ADMINISTRADOR"]);
  });

  it("sem perfil, nenhuma ação é permitida", () => {
    expect(pode(null, "consultar")).toBe(false);
    expect(pode(undefined, "consultar")).toBe(false);
  });

  it("ehPerfil reconhece só os quatro perfis", () => {
    expect(PERFIS.every(ehPerfil)).toBe(true);
    expect(ehPerfil("administrador")).toBe(false);
    expect(ehPerfil("VISITANTE")).toBe(false);
    expect(ehPerfil(1)).toBe(false);
  });

  it("todo perfil tem um nome para exibir", () => {
    expect(Object.keys(ROTULOS_PERFIL).sort()).toEqual([...PERFIS].sort());
    expect(ROTULOS_PERFIL.ADMINISTRADOR).toBe("Administrador");
  });
});
