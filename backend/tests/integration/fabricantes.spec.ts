import { PerfilUsuario } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { prisma } from "../../src/config/prisma";
import { api } from "../helpers/api";
import { auditoriasDe, entrarComo } from "../helpers/cadastros";
import { criarFabricante, criarPastilha } from "../helpers/fabricas";

type Corpo = Record<string, unknown>;

describe("POST /api/fabricantes", () => {
  it("cadastra sem os espaços das pontas e registra na auditoria", async () => {
    const { usuario, cabecalho } = await entrarComo("GESTOR");
    const resposta = await api()
      .post("/api/fabricantes")
      .set(cabecalho)
      .send({ nome: "  Sandvik Coromant  " });
    expect(resposta.status).toBe(201);
    expect(resposta.body).toMatchObject({ id: expect.any(Number), nome: "Sandvik Coromant" });
    const registros = await auditoriasDe("fabricante", resposta.body.id);
    expect(registros).toHaveLength(1);
    expect(registros[0]).toMatchObject({
      acao: "fabricante.criado",
      usuarioId: usuario.id,
      antes: null,
      depois: { id: resposta.body.id, nome: "Sandvik Coromant" },
    });
  });

  it.each<[string, Corpo, string]>([
    ["sem nome", {}, "nome"],
    ["nome com 1 caractere depois de tirar os espaços", { nome: "  I  " }, "nome"],
    ["nome com mais de 100 caracteres", { nome: "x".repeat(101) }, "nome"],
    ["nome que não é texto", { nome: 123 }, "nome"],
    ["campo extra id", { nome: "Iscar", id: 50 }, ""],
    ["pastilhas aninhadas", { nome: "Iscar", pastilhas: { create: [{ codigo: "X", descricao: "Y" }] } }, ""],
  ])("recusa %s com 400", async (_caso, corpo, caminho) => {
    const { cabecalho } = await entrarComo("GESTOR");
    const resposta = await api().post("/api/fabricantes").set(cabecalho).send(corpo);
    expect(resposta.status).toBe(400);
    expect(resposta.body.codigo).toBe("DADOS_INVALIDOS");
    expect(resposta.body.campos).toEqual(expect.arrayContaining([expect.objectContaining({ caminho })]));
    expect(await prisma.fabricante.count()).toBe(0);
    expect(await prisma.pastilha.count()).toBe(0);
  });

  it("nome repetido responde 409, mesmo com espaços nas pontas", async () => {
    const { cabecalho } = await entrarComo("GESTOR");
    await criarFabricante("Iscar");
    const resposta = await api().post("/api/fabricantes").set(cabecalho).send({ nome: " Iscar " });
    expect(resposta.status).toBe(409);
    expect(resposta.body).toEqual({ erro: "Já existe um fabricante com este nome", codigo: "DUPLICADO" });
    expect(await prisma.fabricante.count()).toBe(1);
    expect(await prisma.auditoria.count()).toBe(0);
  });

  it.each<PerfilUsuario>(["OPERADOR", "COMPRADOR"])("%s não cadastra fabricante", async (perfil) => {
    const { cabecalho } = await entrarComo(perfil);
    const resposta = await api().post("/api/fabricantes").set(cabecalho).send({ nome: "Iscar" });
    expect(resposta.status).toBe(403);
    expect(await prisma.fabricante.count()).toBe(0);
  });
});

describe("GET /api/fabricantes", () => {
  it("lista em ordem alfabética para qualquer perfil", async () => {
    const { cabecalho } = await entrarComo("OPERADOR");
    await criarFabricante("Sandvik Coromant");
    await criarFabricante("Iscar");
    const resposta = await api().get("/api/fabricantes").set(cabecalho);
    expect(resposta.status).toBe(200);
    expect(resposta.body.map((fabricante: { nome: string }) => fabricante.nome)).toEqual([
      "Iscar",
      "Sandvik Coromant",
    ]);
  });

  it("recusa parâmetro desconhecido na query com 400", async () => {
    const { cabecalho } = await entrarComo("OPERADOR");
    const resposta = await api().get("/api/fabricantes?pagina=2").set(cabecalho);
    expect(resposta.status).toBe(400);
    expect(resposta.body.codigo).toBe("DADOS_INVALIDOS");
  });
});

describe("GET /api/fabricantes/:id", () => {
  it("devolve o fabricante para qualquer perfil", async () => {
    const { cabecalho } = await entrarComo("OPERADOR");
    const fabricante = await criarFabricante("Iscar");
    const resposta = await api().get(`/api/fabricantes/${fabricante.id}`).set(cabecalho);
    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({ id: fabricante.id, nome: "Iscar" });
  });

  it("responde 404 para id inexistente e 400 para id inválido", async () => {
    const { cabecalho } = await entrarComo("OPERADOR");
    const inexistente = await api().get("/api/fabricantes/9999").set(cabecalho);
    expect(inexistente.status).toBe(404);
    expect(inexistente.body).toEqual({ erro: "Fabricante não encontrado", codigo: "NAO_ENCONTRADO" });
    expect((await api().get("/api/fabricantes/abc").set(cabecalho)).status).toBe(400);
    expect((await api().get("/api/fabricantes/2147483648").set(cabecalho)).status).toBe(400);
  });
});

describe("PUT /api/fabricantes/:id", () => {
  it("renomeia e registra antes e depois na auditoria", async () => {
    const { usuario, cabecalho } = await entrarComo("GESTOR");
    const fabricante = await criarFabricante("Iscar");
    const resposta = await api()
      .put(`/api/fabricantes/${fabricante.id}`)
      .set(cabecalho)
      .send({ nome: " Iscar do Brasil " });
    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({ id: fabricante.id, nome: "Iscar do Brasil" });
    const registros = await auditoriasDe("fabricante", fabricante.id);
    expect(registros).toHaveLength(1);
    expect(registros[0]).toMatchObject({
      acao: "fabricante.atualizado",
      usuarioId: usuario.id,
      antes: { nome: "Iscar" },
      depois: { nome: "Iscar do Brasil" },
    });
  });

  it.each<[PerfilUsuario, number]>([
    ["GESTOR", 200],
    ["ADMINISTRADOR", 200],
    ["OPERADOR", 403],
    ["COMPRADOR", 403],
  ])("%s recebe %i ao editar", async (perfil, status) => {
    const { cabecalho } = await entrarComo(perfil);
    const fabricante = await criarFabricante("Iscar");
    const resposta = await api()
      .put(`/api/fabricantes/${fabricante.id}`)
      .set(cabecalho)
      .send({ nome: "Iscar do Brasil" });
    expect(resposta.status).toBe(status);
    const depois = await prisma.fabricante.findUniqueOrThrow({ where: { id: fabricante.id } });
    expect(depois.nome).toBe(status === 200 ? "Iscar do Brasil" : "Iscar");
  });

  it("nome de outro fabricante responde 409 sem alterar nada", async () => {
    const { cabecalho } = await entrarComo("GESTOR");
    await criarFabricante("Iscar");
    const sandvik = await criarFabricante("Sandvik Coromant");
    const resposta = await api().put(`/api/fabricantes/${sandvik.id}`).set(cabecalho).send({ nome: "Iscar" });
    expect(resposta.status).toBe(409);
    expect(resposta.body.codigo).toBe("DUPLICADO");
    expect(await prisma.fabricante.findUniqueOrThrow({ where: { id: sandvik.id } })).toEqual(sandvik);
    expect(await prisma.auditoria.count()).toBe(0);
  });

  it("id inexistente responde 404", async () => {
    const { cabecalho } = await entrarComo("GESTOR");
    const resposta = await api().put("/api/fabricantes/9999").set(cabecalho).send({ nome: "Novo nome" });
    expect(resposta.status).toBe(404);
    expect(resposta.body).toEqual({ erro: "Fabricante não encontrado", codigo: "NAO_ENCONTRADO" });
  });

  it.each<[string, Corpo]>([
    ["corpo vazio", {}],
    ["nome curto", { nome: "x" }],
    ["id no corpo", { nome: "Novo nome", id: 99 }],
    ["pastilhas.deleteMany", { pastilhas: { deleteMany: {} } }],
    [
      "pastilhas.updateMany",
      { nome: "Novo nome", pastilhas: { updateMany: { where: {}, data: { saldoAtual: 0 } } } },
    ],
  ])("recusa %s com 400 sem alterar nada", async (_caso, corpo) => {
    const { cabecalho } = await entrarComo("GESTOR");
    const fabricante = await criarFabricante("Iscar");
    await criarPastilha({ fabricanteId: fabricante.id, saldoAtual: 7 });
    const resposta = await api().put(`/api/fabricantes/${fabricante.id}`).set(cabecalho).send(corpo);
    expect(resposta.status).toBe(400);
    expect(resposta.body.codigo).toBe("DADOS_INVALIDOS");
    expect(await prisma.fabricante.findUniqueOrThrow({ where: { id: fabricante.id } })).toEqual(fabricante);
    const pastilhas = await prisma.pastilha.findMany({ where: { fabricanteId: fabricante.id } });
    expect(pastilhas.map((pastilha) => pastilha.saldoAtual)).toEqual([7]);
    expect(await prisma.auditoria.count()).toBe(0);
  });
});
