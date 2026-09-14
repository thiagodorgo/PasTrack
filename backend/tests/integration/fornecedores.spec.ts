import { PerfilUsuario } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { prisma } from "../../src/config/prisma";
import { api } from "../helpers/api";
import { auditoriasDe, criarFornecedorCompleto, entrarComo } from "../helpers/cadastros";
import { criarFabricante, criarPastilha } from "../helpers/fabricas";

type Corpo = Record<string, unknown>;

const CNPJ = "11.222.333/0001-81";
const CNPJ_SEM_MASCARA = "11222333000181";
const OUTRO_CNPJ = "12.345.678/0001-95";

describe("POST /api/fornecedores", () => {
  it("cadastra com o CNPJ sem máscara, grava com máscara e registra na auditoria", async () => {
    const { usuario, cabecalho } = await entrarComo("COMPRADOR");
    const resposta = await api()
      .post("/api/fornecedores")
      .set(cabecalho)
      .send({ nome: " Ferramentaria Sul ", cnpj: ` ${CNPJ_SEM_MASCARA} `, contato: " vendas@sul.com.br " });
    expect(resposta.status).toBe(201);
    expect(resposta.body).toMatchObject({
      nome: "Ferramentaria Sul",
      cnpj: CNPJ,
      contato: "vendas@sul.com.br",
    });
    const registros = await auditoriasDe("fornecedor", resposta.body.id);
    expect(registros).toHaveLength(1);
    expect(registros[0]).toMatchObject({
      acao: "fornecedor.criado",
      usuarioId: usuario.id,
      antes: null,
      depois: { id: resposta.body.id, cnpj: CNPJ },
    });
  });

  it("CNPJ e contato são opcionais; vazios gravam null", async () => {
    const { cabecalho } = await entrarComo("GESTOR");
    const semNada = await api().post("/api/fornecedores").set(cabecalho).send({ nome: "TecCorte" });
    const vazios = await api()
      .post("/api/fornecedores")
      .set(cabecalho)
      .send({ nome: "TecCorte Sul", cnpj: " ", contato: "" });
    for (const resposta of [semNada, vazios]) {
      expect(resposta.status).toBe(201);
      expect(resposta.body).toMatchObject({ cnpj: null, contato: null });
    }
  });

  it.each<[string, Corpo, string]>([
    ["sem nome", { cnpj: CNPJ }, "nome"],
    ["nome com 1 caractere", { nome: " A " }, "nome"],
    ["nome com mais de 150 caracteres", { nome: "x".repeat(151) }, "nome"],
    ["nome com caractere nulo", { nome: "Ferramentaria\u0000Sul" }, "nome"],
    ["CNPJ com dígito verificador errado", { nome: "Fornecedor", cnpj: "11.222.333/0001-82" }, "cnpj"],
    ["CNPJ com todos os dígitos iguais", { nome: "Fornecedor", cnpj: "11111111111111" }, "cnpj"],
    ["CNPJ com letras", { nome: "Fornecedor", cnpj: "11.222.333/0001-8X" }, "cnpj"],
    ["CNPJ com máscara incompleta", { nome: "Fornecedor", cnpj: "11.222.333000181" }, "cnpj"],
    ["CNPJ numérico", { nome: "Fornecedor", cnpj: 11222333000181 }, "cnpj"],
    ["contato com mais de 150 caracteres", { nome: "Fornecedor", contato: "x".repeat(151) }, "contato"],
    ["contato com caractere nulo", { nome: "Fornecedor", contato: "vendas\u0000@sul.com.br" }, "contato"],
    ["campo extra id", { nome: "Fornecedor", id: 10 }, ""],
    ["movimentações aninhadas", { nome: "Fornecedor", movimentacoes: { create: [] } }, ""],
  ])("recusa %s com 400", async (_caso, corpo, caminho) => {
    const { cabecalho } = await entrarComo("GESTOR");
    const resposta = await api().post("/api/fornecedores").set(cabecalho).send(corpo);
    expect(resposta.status).toBe(400);
    expect(resposta.body.codigo).toBe("DADOS_INVALIDOS");
    expect(resposta.body.campos).toEqual(expect.arrayContaining([expect.objectContaining({ caminho })]));
    expect(await prisma.fornecedor.count()).toBe(0);
  });

  it("CNPJ repetido responde 409, com ou sem máscara", async () => {
    const { cabecalho } = await entrarComo("GESTOR");
    await criarFornecedorCompleto({ cnpj: CNPJ });
    for (const cnpj of [CNPJ, CNPJ_SEM_MASCARA]) {
      const resposta = await api()
        .post("/api/fornecedores")
        .set(cabecalho)
        .send({ nome: "Outro fornecedor", cnpj });
      expect(resposta.status).toBe(409);
      expect(resposta.body).toEqual({ erro: "Já existe um fornecedor com este CNPJ", codigo: "DUPLICADO" });
    }
    expect(await prisma.fornecedor.count()).toBe(1);
    expect(await prisma.auditoria.count()).toBe(0);
  });

  it("aceita CNPJ alfanumérico, grava em maiúsculas com máscara e detecta a duplicidade", async () => {
    const { cabecalho } = await entrarComo("COMPRADOR");
    const criado = await api()
      .post("/api/fornecedores")
      .set(cabecalho)
      .send({ nome: "Fornecedor Alfa", cnpj: "12abc34501de35" });
    expect(criado.status).toBe(201);
    expect(criado.body.cnpj).toBe("12.ABC.345/01DE-35");
    const repetido = await api()
      .post("/api/fornecedores")
      .set(cabecalho)
      .send({ nome: "Outro fornecedor", cnpj: "12.ABC.345/01DE-35" });
    expect(repetido.status).toBe(409);
    expect(repetido.body.codigo).toBe("DUPLICADO");
  });

  it("recusa CNPJ alfanumérico com dígito verificador errado", async () => {
    const { cabecalho } = await entrarComo("COMPRADOR");
    const resposta = await api()
      .post("/api/fornecedores")
      .set(cabecalho)
      .send({ nome: "Fornecedor Alfa", cnpj: "12.ABC.345/01DE-36" });
    expect(resposta.status).toBe(400);
    expect(resposta.body.campos).toEqual([{ caminho: "cnpj", mensagem: "CNPJ inválido" }]);
    expect(await prisma.fornecedor.count()).toBe(0);
  });
});

describe("GET /api/fornecedores", () => {
  it("lista em ordem alfabética para qualquer perfil", async () => {
    const { cabecalho } = await entrarComo("OPERADOR");
    await criarFornecedorCompleto({ nome: "TecCorte Suprimentos" });
    await criarFornecedorCompleto({ nome: "Ferramentaria Sul", cnpj: CNPJ });
    const resposta = await api().get("/api/fornecedores").set(cabecalho);
    expect(resposta.status).toBe(200);
    expect(resposta.body.map((fornecedor: { nome: string }) => fornecedor.nome)).toEqual([
      "Ferramentaria Sul",
      "TecCorte Suprimentos",
    ]);
  });

  it("recusa parâmetro desconhecido na query com 400", async () => {
    const { cabecalho } = await entrarComo("OPERADOR");
    const resposta = await api().get("/api/fornecedores?pagina=2").set(cabecalho);
    expect(resposta.status).toBe(400);
    expect(resposta.body.codigo).toBe("DADOS_INVALIDOS");
  });
});

describe("GET /api/fornecedores/:id", () => {
  it("devolve o fornecedor para qualquer perfil", async () => {
    const { cabecalho } = await entrarComo("OPERADOR");
    const fornecedor = await criarFornecedorCompleto({ nome: "Ferramentaria Sul", cnpj: CNPJ });
    const resposta = await api().get(`/api/fornecedores/${fornecedor.id}`).set(cabecalho);
    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({ id: fornecedor.id, nome: "Ferramentaria Sul", cnpj: CNPJ });
  });

  it("responde 404 para id inexistente e 400 para id inválido", async () => {
    const { cabecalho } = await entrarComo("OPERADOR");
    const inexistente = await api().get("/api/fornecedores/9999").set(cabecalho);
    expect(inexistente.status).toBe(404);
    expect(inexistente.body).toEqual({ erro: "Fornecedor não encontrado", codigo: "NAO_ENCONTRADO" });
    expect((await api().get("/api/fornecedores/abc").set(cabecalho)).status).toBe(400);
    expect((await api().get("/api/fornecedores/2147483648").set(cabecalho)).status).toBe(400);
  });
});

describe("PUT /api/fornecedores/:id", () => {
  it("edita só o contato, mantém o resto e registra antes e depois na auditoria", async () => {
    const { usuario, cabecalho } = await entrarComo("COMPRADOR");
    const fornecedor = await criarFornecedorCompleto({
      nome: "Ferramentaria Sul",
      cnpj: CNPJ,
      contato: "antigo@sul.com.br",
    });
    const resposta = await api()
      .put(`/api/fornecedores/${fornecedor.id}`)
      .set(cabecalho)
      .send({ contato: "novo@sul.com.br" });
    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({
      nome: "Ferramentaria Sul",
      cnpj: CNPJ,
      contato: "novo@sul.com.br",
    });
    const registros = await auditoriasDe("fornecedor", fornecedor.id);
    expect(registros).toHaveLength(1);
    expect(registros[0]).toMatchObject({
      acao: "fornecedor.atualizado",
      usuarioId: usuario.id,
      antes: { contato: "antigo@sul.com.br", cnpj: CNPJ },
      depois: { contato: "novo@sul.com.br", cnpj: CNPJ },
    });
  });

  it("troca o CNPJ aplicando a máscara e limpa CNPJ e contato com null ou vazio", async () => {
    const { cabecalho } = await entrarComo("GESTOR");
    const fornecedor = await criarFornecedorCompleto({ cnpj: CNPJ, contato: "vendas@sul.com.br" });
    const url = `/api/fornecedores/${fornecedor.id}`;

    const trocado = await api().put(url).set(cabecalho).send({ cnpj: "12345678000195" });
    expect(trocado.body).toMatchObject({ cnpj: OUTRO_CNPJ, contato: "vendas@sul.com.br" });

    const limpoComNull = await api().put(url).set(cabecalho).send({ cnpj: null });
    expect(limpoComNull.body).toMatchObject({ cnpj: null, contato: "vendas@sul.com.br" });

    const limpoComVazio = await api().put(url).set(cabecalho).send({ contato: "" });
    expect(limpoComVazio.body).toMatchObject({ cnpj: null, contato: null });
  });

  it.each<[PerfilUsuario, number]>([
    ["COMPRADOR", 200],
    ["GESTOR", 200],
    ["ADMINISTRADOR", 200],
    ["OPERADOR", 403],
  ])("%s recebe %i ao editar", async (perfil, status) => {
    const { cabecalho } = await entrarComo(perfil);
    const fornecedor = await criarFornecedorCompleto({ nome: "Ferramentaria Sul" });
    const resposta = await api()
      .put(`/api/fornecedores/${fornecedor.id}`)
      .set(cabecalho)
      .send({ nome: "Ferramentaria Norte" });
    expect(resposta.status).toBe(status);
    const depois = await prisma.fornecedor.findUniqueOrThrow({ where: { id: fornecedor.id } });
    expect(depois.nome).toBe(status === 200 ? "Ferramentaria Norte" : "Ferramentaria Sul");
  });

  it("COMPRADOR edita fornecedor, mas não fabricante", async () => {
    const { cabecalho } = await entrarComo("COMPRADOR");
    const fornecedor = await criarFornecedorCompleto();
    const fabricante = await criarFabricante();
    const noFornecedor = await api()
      .put(`/api/fornecedores/${fornecedor.id}`)
      .set(cabecalho)
      .send({ nome: "Nome novo" });
    const noFabricante = await api()
      .put(`/api/fabricantes/${fabricante.id}`)
      .set(cabecalho)
      .send({ nome: "Nome novo" });
    expect(noFornecedor.status).toBe(200);
    expect(noFabricante.status).toBe(403);
  });

  it("CNPJ de outro fornecedor responde 409 sem alterar nada", async () => {
    const { cabecalho } = await entrarComo("GESTOR");
    await criarFornecedorCompleto({ cnpj: CNPJ });
    const outro = await criarFornecedorCompleto({ cnpj: OUTRO_CNPJ });
    const resposta = await api()
      .put(`/api/fornecedores/${outro.id}`)
      .set(cabecalho)
      .send({ cnpj: CNPJ_SEM_MASCARA });
    expect(resposta.status).toBe(409);
    expect(resposta.body).toEqual({ erro: "Já existe um fornecedor com este CNPJ", codigo: "DUPLICADO" });
    expect(await prisma.fornecedor.findUniqueOrThrow({ where: { id: outro.id } })).toEqual(outro);
    expect(await prisma.auditoria.count()).toBe(0);
  });

  it("id inexistente responde 404", async () => {
    const { cabecalho } = await entrarComo("GESTOR");
    const resposta = await api().put("/api/fornecedores/9999").set(cabecalho).send({ nome: "Novo nome" });
    expect(resposta.status).toBe(404);
    expect(resposta.body).toEqual({ erro: "Fornecedor não encontrado", codigo: "NAO_ENCONTRADO" });
  });

  it.each<[string, Corpo]>([
    ["corpo vazio", {}],
    ["CNPJ inválido", { cnpj: "11.222.333/0001-80" }],
    ["contato só com o caractere nulo", { contato: "\u0000" }],
    ["id no corpo", { id: 99, nome: "Novo nome" }],
    ["criadoEm", { criadoEm: "2020-01-01T00:00:00.000Z" }],
    ["movimentacoes.deleteMany", { movimentacoes: { deleteMany: {} } }],
  ])("recusa %s com 400 sem alterar nada", async (_caso, corpo) => {
    const { usuario, cabecalho } = await entrarComo("GESTOR");
    const fornecedor = await criarFornecedorCompleto({ cnpj: CNPJ });
    const pastilha = await criarPastilha();
    await prisma.movimentacao.create({
      data: {
        tipo: "ENTRADA",
        quantidade: 3,
        pastilhaId: pastilha.id,
        usuarioId: usuario.id,
        fornecedorId: fornecedor.id,
      },
    });
    const resposta = await api().put(`/api/fornecedores/${fornecedor.id}`).set(cabecalho).send(corpo);
    expect(resposta.status).toBe(400);
    expect(resposta.body.codigo).toBe("DADOS_INVALIDOS");
    expect(await prisma.fornecedor.findUniqueOrThrow({ where: { id: fornecedor.id } })).toEqual(fornecedor);
    expect(await prisma.movimentacao.count({ where: { fornecedorId: fornecedor.id } })).toBe(1);
    expect(await prisma.auditoria.count()).toBe(0);
  });
});
