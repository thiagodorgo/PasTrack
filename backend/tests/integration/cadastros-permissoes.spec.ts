import { PerfilUsuario } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { prisma } from "../../src/config/prisma";
import { api } from "../helpers/api";
import { criarFornecedorCompleto, entrarComo } from "../helpers/cadastros";
import { criarFabricante, criarPastilha } from "../helpers/fabricas";

/** Inválido para qualquer cadastro: campos proibidos, tipos errados e escrita aninhada. */
const CORPO_INVALIDO = {
  id: 1,
  codigo: "",
  nome: 123,
  saldoAtual: -1,
  movimentacoes: { deleteMany: {} },
};

/** Estado dos cadastros, para conferir que a requisição negada não mudou nada. */
function cadastros() {
  return Promise.all([
    prisma.pastilha.findMany({ orderBy: { id: "asc" } }),
    prisma.fabricante.findMany({ orderBy: { id: "asc" } }),
    prisma.fornecedor.findMany({ orderBy: { id: "asc" } }),
    prisma.auditoria.count(),
  ]);
}

const urlPastilha = async () => `/api/pastilhas/${(await criarPastilha()).id}`;
const urlFabricante = async () => `/api/fabricantes/${(await criarFabricante()).id}`;
const urlFornecedor = async () => `/api/fornecedores/${(await criarFornecedorCompleto()).id}`;

describe("a permissão é conferida antes da validação nas rotas de escrita dos cadastros", () => {
  it.each<[string, PerfilUsuario, "post" | "put", () => Promise<string>]>([
    ["POST /api/pastilhas", "OPERADOR", "post", async () => "/api/pastilhas"],
    ["POST /api/pastilhas", "COMPRADOR", "post", async () => "/api/pastilhas"],
    ["PUT /api/pastilhas/:id", "OPERADOR", "put", urlPastilha],
    ["PUT /api/pastilhas/:id", "COMPRADOR", "put", urlPastilha],
    ["POST /api/fabricantes", "OPERADOR", "post", async () => "/api/fabricantes"],
    ["POST /api/fabricantes", "COMPRADOR", "post", async () => "/api/fabricantes"],
    ["PUT /api/fabricantes/:id", "OPERADOR", "put", urlFabricante],
    ["PUT /api/fabricantes/:id", "COMPRADOR", "put", urlFabricante],
    ["POST /api/fornecedores", "OPERADOR", "post", async () => "/api/fornecedores"],
    ["PUT /api/fornecedores/:id", "OPERADOR", "put", urlFornecedor],
  ])("%s responde 403 para %s mesmo com corpo inválido", async (_rota, perfil, metodo, montarUrl) => {
    const { cabecalho } = await entrarComo(perfil);
    const url = await montarUrl();
    const antes = await cadastros();
    const resposta = await api()[metodo](url).set(cabecalho).send(CORPO_INVALIDO);
    expect(resposta.status).toBe(403);
    expect(resposta.body).toEqual({ erro: "Acesso negado para este perfil" });
    expect(await cadastros()).toEqual(antes);
  });
});
