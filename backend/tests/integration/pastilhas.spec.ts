import { PerfilUsuario } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { prisma } from "../../src/config/prisma";
import { pastilhaRepository } from "../../src/repositories/pastilha.repository";
import { api, autorizacao } from "../helpers/api";
import { auditoriasDe, entrarComo } from "../helpers/cadastros";
import { criarFabricante, criarFornecedor, criarPastilha, criarUsuario } from "../helpers/fabricas";

type Corpo = Record<string, unknown>;

async function corpoValido() {
  const fabricante = await criarFabricante();
  return { codigo: "CNMG 120408", descricao: "Pastilha de torneamento", fabricanteId: fabricante.id };
}

/** Ids em ordem crescente, para comparar listas sem depender da ordenação. */
function ids(lista: { id: number }[]) {
  return lista.map((item) => item.id).sort((a, b) => a - b);
}

describe("POST /api/pastilhas", () => {
  it("cadastra com os padrões, tira os espaços das pontas e devolve o fabricante", async () => {
    const { cabecalho } = await entrarComo("GESTOR");
    const fabricante = await criarFabricante("Sandvik Coromant");
    const resposta = await api().post("/api/pastilhas").set(cabecalho).send({
      codigo: "  CNMG 120408  ",
      descricao: " Pastilha de torneamento ",
      fabricanteId: fabricante.id,
    });
    expect(resposta.status).toBe(201);
    expect(resposta.body).toMatchObject({
      codigo: "CNMG 120408",
      descricao: "Pastilha de torneamento",
      modelo: null,
      aplicacao: null,
      unidade: "un",
      estoqueMinimo: 0,
      saldoAtual: 0,
      fabricanteId: fabricante.id,
      fabricante: { id: fabricante.id, nome: "Sandvik Coromant" },
    });
  });

  it("grava os campos opcionais informados", async () => {
    const { cabecalho } = await entrarComo("ADMINISTRADOR");
    const corpo = {
      ...(await corpoValido()),
      modelo: "120408",
      aplicacao: "Torneamento de aço",
      unidade: "cx",
      estoqueMinimo: 10,
    };
    const resposta = await api().post("/api/pastilhas").set(cabecalho).send(corpo);
    expect(resposta.status).toBe(201);
    expect(resposta.body).toMatchObject(corpo);
  });

  it("registra a criação na auditoria, sem o fabricante embutido", async () => {
    const { usuario, cabecalho } = await entrarComo("GESTOR");
    const resposta = await api()
      .post("/api/pastilhas")
      .set(cabecalho)
      .send(await corpoValido());
    const registros = await auditoriasDe("pastilha", resposta.body.id);
    expect(registros.map((registro) => registro.acao)).toEqual(["pastilha.criada", "alerta.aberto"]);
    expect(registros[0]).toMatchObject({ acao: "pastilha.criada", usuarioId: usuario.id, antes: null });
    expect(registros[0].depois).toMatchObject({ id: resposta.body.id, codigo: "CNMG 120408", saldoAtual: 0 });
    expect(registros[0].depois).not.toHaveProperty("fabricante");
  });

  it.each([5, 0])(
    "com estoque mínimo %i já abre o alerta na mesma transação, porque o saldo nasce 0",
    async (estoqueMinimo) => {
      const { usuario, cabecalho } = await entrarComo("GESTOR");
      const resposta = await api()
        .post("/api/pastilhas")
        .set(cabecalho)
        .send({ ...(await corpoValido()), estoqueMinimo });
      expect(resposta.status).toBe(201);
      const alertas = await prisma.alerta.findMany({ where: { pastilhaId: resposta.body.id } });
      expect(alertas).toHaveLength(1);
      expect(alertas[0]).toMatchObject({ situacao: "ABERTO", dataResolucao: null, resolvidoPorId: null });
      const registro = await prisma.auditoria.findFirstOrThrow({ where: { acao: "alerta.aberto" } });
      expect(registro).toMatchObject({
        usuarioId: usuario.id,
        entidade: "pastilha",
        entidadeId: resposta.body.id,
      });
    }
  );

  it("a primeira entrada acima do mínimo fecha o alerta aberto na criação", async () => {
    const { cabecalho } = await entrarComo("GESTOR");
    const criada = await api()
      .post("/api/pastilhas")
      .set(cabecalho)
      .send({ ...(await corpoValido()), estoqueMinimo: 5 });
    const fornecedor = await criarFornecedor();
    const entrada = await api()
      .post("/api/movimentacoes")
      .set(cabecalho)
      .send({ tipo: "ENTRADA", pastilhaId: criada.body.id, quantidade: 10, fornecedorId: fornecedor.id });
    expect(entrada.status).toBe(201);
    const alerta = await prisma.alerta.findFirstOrThrow({ where: { pastilhaId: criada.body.id } });
    expect(alerta.situacao).toBe("RESOLVIDO");
  });

  it.each<[string, Corpo, string]>([
    ["sem código", { codigo: undefined }, "codigo"],
    ["código em branco", { codigo: "   " }, "codigo"],
    ["código com mais de 40 caracteres", { codigo: "X".repeat(41) }, "codigo"],
    ["sem descrição", { descricao: undefined }, "descricao"],
    ["descrição com mais de 200 caracteres", { descricao: "x".repeat(201) }, "descricao"],
    ["modelo com mais de 60 caracteres", { modelo: "x".repeat(61) }, "modelo"],
    ["aplicação com mais de 200 caracteres", { aplicacao: "x".repeat(201) }, "aplicacao"],
    ["unidade com mais de 10 caracteres", { unidade: "x".repeat(11) }, "unidade"],
    ["unidade em branco", { unidade: " " }, "unidade"],
    ["estoque mínimo negativo", { estoqueMinimo: -1 }, "estoqueMinimo"],
    ["estoque mínimo acima de 1.000.000", { estoqueMinimo: 1_000_001 }, "estoqueMinimo"],
    ["estoque mínimo fracionado", { estoqueMinimo: 1.5 }, "estoqueMinimo"],
    ["estoque mínimo em texto", { estoqueMinimo: "5" }, "estoqueMinimo"],
    ["sem fabricante", { fabricanteId: undefined }, "fabricanteId"],
    ["fabricante zero", { fabricanteId: 0 }, "fabricanteId"],
    ["fabricante em texto", { fabricanteId: "1" }, "fabricanteId"],
    ["fabricante fora da faixa do banco", { fabricanteId: 2_147_483_648 }, "fabricanteId"],
  ])("recusa %s com 400", async (_caso, alteracao, caminho) => {
    const { cabecalho } = await entrarComo("GESTOR");
    const resposta = await api()
      .post("/api/pastilhas")
      .set(cabecalho)
      .send({ ...(await corpoValido()), ...alteracao });
    expect(resposta.status).toBe(400);
    expect(resposta.body.codigo).toBe("DADOS_INVALIDOS");
    expect(resposta.body.campos).toEqual(expect.arrayContaining([expect.objectContaining({ caminho })]));
    expect(await prisma.pastilha.count()).toBe(0);
  });

  it.each<[string, Corpo]>([
    ["saldoAtual", { saldoAtual: 500 }],
    ["id", { id: 777 }],
    ["criadoEm", { criadoEm: "2020-01-01T00:00:00.000Z" }],
    ["fabricante", { fabricante: { create: { nome: "Fabricante intruso" } } }],
    ["movimentacoes", { movimentacoes: { create: [{ tipo: "ENTRADA", quantidade: 10, usuarioId: 1 }] } }],
  ])("recusa o campo extra %s com 400 sem gravar nada", async (campo, extra) => {
    const { cabecalho } = await entrarComo("GESTOR");
    const resposta = await api()
      .post("/api/pastilhas")
      .set(cabecalho)
      .send({ ...(await corpoValido()), ...extra });
    expect(resposta.status).toBe(400);
    expect(resposta.body.campos).toEqual([
      expect.objectContaining({ caminho: "", mensagem: expect.stringContaining(campo) }),
    ]);
    expect(await prisma.pastilha.count()).toBe(0);
    expect(await prisma.fabricante.count()).toBe(1);
    expect(await prisma.movimentacao.count()).toBe(0);
  });

  it("código repetido responde 409, mesmo com espaços nas pontas", async () => {
    const { cabecalho } = await entrarComo("GESTOR");
    const existente = await criarPastilha({ codigo: "CNMG 120408" });
    const resposta = await api()
      .post("/api/pastilhas")
      .set(cabecalho)
      .send({ codigo: " CNMG 120408 ", descricao: "Outra pastilha", fabricanteId: existente.fabricanteId });
    expect(resposta.status).toBe(409);
    expect(resposta.body).toEqual({ erro: "Já existe uma pastilha com este código", codigo: "DUPLICADO" });
    expect(await prisma.pastilha.count()).toBe(1);
    expect(await prisma.auditoria.count()).toBe(0);
  });

  it("fabricante inexistente responde 400 sem gravar nada", async () => {
    const { cabecalho } = await entrarComo("GESTOR");
    const resposta = await api()
      .post("/api/pastilhas")
      .set(cabecalho)
      .send({ codigo: "X1", descricao: "Pastilha", fabricanteId: 9999 });
    expect(resposta.status).toBe(400);
    expect(resposta.body.codigo).toBe("REFERENCIA_INVALIDA");
    expect(await prisma.pastilha.count()).toBe(0);
    expect(await prisma.auditoria.count()).toBe(0);
  });

  it.each<PerfilUsuario>(["OPERADOR", "COMPRADOR"])("%s não cadastra pastilha", async (perfil) => {
    const { cabecalho } = await entrarComo(perfil);
    const resposta = await api()
      .post("/api/pastilhas")
      .set(cabecalho)
      .send(await corpoValido());
    expect(resposta.status).toBe(403);
    expect(await prisma.pastilha.count()).toBe(0);
  });
});

describe("PUT /api/pastilhas/:id", () => {
  it("edita os campos permitidos sem mexer no código nem no saldo", async () => {
    const { cabecalho } = await entrarComo("GESTOR");
    const pastilha = await criarPastilha({ codigo: "APMT 1604", saldoAtual: 30, estoqueMinimo: 12 });
    const outroFabricante = await criarFabricante("Iscar");
    const resposta = await api().put(`/api/pastilhas/${pastilha.id}`).set(cabecalho).send({
      descricao: "  Pastilha de fresamento  ",
      modelo: "1604",
      aplicacao: "Fresamento de topo",
      unidade: "cx",
      estoqueMinimo: 10,
      fabricanteId: outroFabricante.id,
    });
    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({
      id: pastilha.id,
      codigo: "APMT 1604",
      saldoAtual: 30,
      descricao: "Pastilha de fresamento",
      modelo: "1604",
      aplicacao: "Fresamento de topo",
      unidade: "cx",
      estoqueMinimo: 10,
      fabricanteId: outroFabricante.id,
      fabricante: { id: outroFabricante.id, nome: "Iscar" },
    });
  });

  it("campo ausente fica como está; vazio ou null limpa modelo e aplicação", async () => {
    const { cabecalho } = await entrarComo("GESTOR");
    const pastilha = await criarPastilha({ descricao: "Original" });
    await prisma.pastilha.update({ where: { id: pastilha.id }, data: { modelo: "M1", aplicacao: "A1" } });
    const resposta = await api()
      .put(`/api/pastilhas/${pastilha.id}`)
      .set(cabecalho)
      .send({ modelo: "  ", aplicacao: null });
    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({ descricao: "Original", modelo: null, aplicacao: null });
  });

  it("registra antes e depois na auditoria", async () => {
    const { usuario, cabecalho } = await entrarComo("GESTOR");
    const pastilha = await criarPastilha({ descricao: "Antes" });
    await api().put(`/api/pastilhas/${pastilha.id}`).set(cabecalho).send({ descricao: "Depois" });
    const registros = await auditoriasDe("pastilha", pastilha.id);
    expect(registros).toHaveLength(1);
    expect(registros[0]).toMatchObject({ acao: "pastilha.atualizada", usuarioId: usuario.id });
    expect(registros[0].antes).toMatchObject({ descricao: "Antes" });
    expect(registros[0].depois).toMatchObject({ descricao: "Depois" });
    expect(registros[0].depois).not.toHaveProperty("fabricante");
  });

  it.each<[PerfilUsuario, number]>([
    ["GESTOR", 200],
    ["ADMINISTRADOR", 200],
    ["OPERADOR", 403],
    ["COMPRADOR", 403],
  ])("%s recebe %i ao editar", async (perfil, status) => {
    const { cabecalho } = await entrarComo(perfil);
    const pastilha = await criarPastilha({ descricao: "Original" });
    const resposta = await api()
      .put(`/api/pastilhas/${pastilha.id}`)
      .set(cabecalho)
      .send({ descricao: "Alterada" });
    expect(resposta.status).toBe(status);
    const depois = await prisma.pastilha.findUniqueOrThrow({ where: { id: pastilha.id } });
    expect(depois.descricao).toBe(status === 200 ? "Alterada" : "Original");
  });

  it("OPERADOR recebe 403 antes de qualquer validação do corpo", async () => {
    const { cabecalho } = await entrarComo("OPERADOR");
    const pastilha = await criarPastilha({ saldoAtual: 5 });
    const resposta = await api()
      .put(`/api/pastilhas/${pastilha.id}`)
      .set(cabecalho)
      .send({ saldoAtual: 999 });
    expect(resposta.status).toBe(403);
  });

  it("id inexistente responde 404", async () => {
    const { cabecalho } = await entrarComo("GESTOR");
    const resposta = await api().put("/api/pastilhas/9999").set(cabecalho).send({ descricao: "Nova" });
    expect(resposta.status).toBe(404);
    expect(resposta.body).toEqual({ erro: "Pastilha não encontrada", codigo: "NAO_ENCONTRADO" });
  });

  it.each(["abc", "0", "-1", "1.5", "2147483648"])("id %s responde 400", async (id) => {
    const { cabecalho } = await entrarComo("GESTOR");
    const resposta = await api().put(`/api/pastilhas/${id}`).set(cabecalho).send({ descricao: "Nova" });
    expect(resposta.status).toBe(400);
    expect(resposta.body.campos).toEqual([expect.objectContaining({ caminho: "id" })]);
  });

  it("corpo vazio responde 400", async () => {
    const { cabecalho } = await entrarComo("GESTOR");
    const pastilha = await criarPastilha();
    const resposta = await api().put(`/api/pastilhas/${pastilha.id}`).set(cabecalho).send({});
    expect(resposta.status).toBe(400);
    expect(resposta.body.campos).toEqual([
      { caminho: "", mensagem: "Informe ao menos um campo para atualizar" },
    ]);
  });

  it("fabricante inexistente responde 400 e desfaz a transação", async () => {
    const { cabecalho } = await entrarComo("GESTOR");
    const pastilha = await criarPastilha();
    const resposta = await api()
      .put(`/api/pastilhas/${pastilha.id}`)
      .set(cabecalho)
      .send({ descricao: "Nova", fabricanteId: 9999 });
    expect(resposta.status).toBe(400);
    expect(resposta.body.codigo).toBe("REFERENCIA_INVALIDA");
    expect(await prisma.pastilha.findUniqueOrThrow({ where: { id: pastilha.id } })).toEqual(pastilha);
    expect(await prisma.auditoria.count()).toBe(0);
  });
});

describe("PUT /api/pastilhas/:id contra mass assignment", () => {
  it("PUT /api/pastilhas/:id não aceita saldoAtual (mass assignment)", async () => {
    const { token } = await criarUsuario({ perfil: "GESTOR" });
    const pastilha = await criarPastilha({ saldoAtual: 5 });
    const resposta = await api()
      .put(`/api/pastilhas/${pastilha.id}`)
      .set(autorizacao(token))
      .send({ saldoAtual: 999 });
    expect(resposta.status).toBe(400);
    const depois = await prisma.pastilha.findUniqueOrThrow({ where: { id: pastilha.id } });
    expect(depois.saldoAtual).toBe(5);
  });

  it.each<[string, Corpo]>([
    ["saldoAtual junto de um campo válido", { descricao: "Nova", saldoAtual: 999 }],
    ["saldoAtual com incremento", { saldoAtual: { increment: 100 } }],
    ["id", { id: 999, descricao: "Nova" }],
    ["codigo", { codigo: "OUTRO-CODIGO" }],
    ["atualizadoEm", { atualizadoEm: "2020-01-01T00:00:00.000Z" }],
    ["movimentacoes.deleteMany", { movimentacoes: { deleteMany: {} } }],
    ["alertas.deleteMany", { alertas: { deleteMany: {} } }],
    ["fabricante.update", { fabricante: { update: { nome: "Invadido" } } }],
  ])("recusa %s com 400 sem alterar nada", async (_caso, corpo) => {
    const { usuario, cabecalho } = await entrarComo("GESTOR");
    const pastilha = await criarPastilha({ saldoAtual: 5, estoqueMinimo: 5 });
    await prisma.movimentacao.create({
      data: { tipo: "ENTRADA", quantidade: 5, pastilhaId: pastilha.id, usuarioId: usuario.id },
    });
    await prisma.alerta.create({ data: { pastilhaId: pastilha.id } });
    const consulta = { where: { id: pastilha.id }, include: { fabricante: true } };
    const antes = await prisma.pastilha.findUniqueOrThrow(consulta);

    const resposta = await api().put(`/api/pastilhas/${pastilha.id}`).set(cabecalho).send(corpo);

    expect(resposta.status).toBe(400);
    expect(resposta.body.codigo).toBe("DADOS_INVALIDOS");
    expect(await prisma.pastilha.findUniqueOrThrow(consulta)).toEqual(antes);
    expect(await prisma.movimentacao.count({ where: { pastilhaId: pastilha.id } })).toBe(1);
    expect(await prisma.alerta.count({ where: { pastilhaId: pastilha.id } })).toBe(1);
    expect(await prisma.auditoria.count()).toBe(0);
  });

  it("recusa __proto__ no corpo sem alterar nada", async () => {
    const { cabecalho } = await entrarComo("GESTOR");
    const pastilha = await criarPastilha({ saldoAtual: 5, descricao: "Original" });
    const resposta = await api()
      .put(`/api/pastilhas/${pastilha.id}`)
      .set(cabecalho)
      .set("Content-Type", "application/json")
      .send('{"descricao":"Nova","__proto__":{"saldoAtual":999}}');
    expect(resposta.status).toBe(400);
    expect(await prisma.pastilha.findUniqueOrThrow({ where: { id: pastilha.id } })).toEqual(pastilha);
  });
});

describe("estoque mínimo e alerta na edição da pastilha", () => {
  it("subir o mínimo até o saldo abre o alerta e baixar de novo fecha", async () => {
    const { usuario, cabecalho } = await entrarComo("GESTOR");
    const pastilha = await criarPastilha({ saldoAtual: 5, estoqueMinimo: 2 });
    const url = `/api/pastilhas/${pastilha.id}`;

    expect((await api().put(url).set(cabecalho).send({ estoqueMinimo: 5 })).status).toBe(200);
    const aberto = await prisma.alerta.findFirstOrThrow({ where: { pastilhaId: pastilha.id } });
    expect(aberto).toMatchObject({ situacao: "ABERTO", dataResolucao: null });

    expect((await api().put(url).set(cabecalho).send({ estoqueMinimo: 4 })).status).toBe(200);
    const fechado = await prisma.alerta.findUniqueOrThrow({ where: { id: aberto.id } });
    expect(fechado).toMatchObject({ situacao: "RESOLVIDO", resolvidoPorId: null });
    expect(fechado.dataResolucao).toBeInstanceOf(Date);
    expect(await prisma.alerta.count()).toBe(1);

    const trilha = await prisma.auditoria.findMany({
      orderBy: { id: "asc" },
      select: { acao: true, usuarioId: true },
    });
    expect(trilha).toEqual([
      { acao: "pastilha.atualizada", usuarioId: usuario.id },
      { acao: "alerta.aberto", usuarioId: usuario.id },
      { acao: "pastilha.atualizada", usuarioId: usuario.id },
      { acao: "alerta.resolvido_automaticamente", usuarioId: usuario.id },
    ]);
  });

  it("editar sem mudar o mínimo não abre nem fecha alerta", async () => {
    const { cabecalho } = await entrarComo("GESTOR");
    const pastilha = await criarPastilha({ saldoAtual: 5, estoqueMinimo: 5 });
    await prisma.alerta.create({ data: { pastilhaId: pastilha.id } });
    const resposta = await api()
      .put(`/api/pastilhas/${pastilha.id}`)
      .set(cabecalho)
      .send({ descricao: "Nova descrição", estoqueMinimo: 5 });
    expect(resposta.status).toBe(200);
    const alertas = await prisma.alerta.findMany({ where: { pastilhaId: pastilha.id } });
    expect(alertas.map((alerta) => alerta.situacao)).toEqual(["ABERTO"]);
    expect(await prisma.auditoria.findMany({ select: { acao: true } })).toEqual([
      { acao: "pastilha.atualizada" },
    ]);
  });
});

describe("GET /api/pastilhas", () => {
  async function criarEstoque() {
    const fabricante = await criarFabricante();
    const base = { fabricanteId: fabricante.id, estoqueMinimo: 5 };
    return {
      abaixo: await criarPastilha({ ...base, codigo: "A-1", descricao: "Torneamento abaixo", saldoAtual: 2 }),
      noMinimo: await criarPastilha({
        ...base,
        codigo: "B-1",
        descricao: "Fresamento no mínimo",
        saldoAtual: 5,
      }),
      acima: await criarPastilha({ ...base, codigo: "C-1", descricao: "Torneamento acima", saldoAtual: 6 }),
    };
  }

  it("criticas=true devolve só as pastilhas no mínimo ou abaixo", async () => {
    const { cabecalho } = await entrarComo("OPERADOR");
    const { abaixo, noMinimo } = await criarEstoque();
    const resposta = await api().get("/api/pastilhas?criticas=true").set(cabecalho);
    expect(resposta.status).toBe(200);
    expect(ids(resposta.body)).toEqual(ids([abaixo, noMinimo]));
  });

  it("criticas=false ou ausente não filtra", async () => {
    const { cabecalho } = await entrarComo("OPERADOR");
    const { abaixo, noMinimo, acima } = await criarEstoque();
    const todas = ids([abaixo, noMinimo, acima]);
    expect(ids((await api().get("/api/pastilhas?criticas=false").set(cabecalho)).body)).toEqual(todas);
    expect(ids((await api().get("/api/pastilhas").set(cabecalho)).body)).toEqual(todas);
  });

  it("a busca olha código e descrição, sem diferenciar maiúsculas, e combina com críticas", async () => {
    const { cabecalho } = await entrarComo("COMPRADOR");
    const { abaixo, acima } = await criarEstoque();
    const porCodigo = await api().get("/api/pastilhas").query({ busca: " c-1 " }).set(cabecalho);
    expect(ids(porCodigo.body)).toEqual([acima.id]);
    const combinada = await api()
      .get("/api/pastilhas")
      .query({ busca: "TORNEAMENTO", criticas: "true" })
      .set(cabecalho);
    expect(ids(combinada.body)).toEqual([abaixo.id]);
  });

  it.each([
    ["criticas fora de true ou false", "criticas=sim"],
    ["criticas como número", "criticas=1"],
    ["criticas repetido", "criticas=true&criticas=false"],
    ["busca com mais de 100 caracteres", `busca=${"x".repeat(101)}`],
    ["parâmetro desconhecido", "pagina=2"],
  ])("recusa %s com 400", async (_caso, consulta) => {
    const { cabecalho } = await entrarComo("OPERADOR");
    const resposta = await api().get(`/api/pastilhas?${consulta}`).set(cabecalho);
    expect(resposta.status).toBe(400);
    expect(resposta.body.codigo).toBe("DADOS_INVALIDOS");
  });

  it("listarCriticas(), usada pelo painel, devolve as mesmas pastilhas do filtro", async () => {
    const { abaixo, noMinimo } = await criarEstoque();
    const criticas = await pastilhaRepository.listarCriticas();
    expect(criticas.map((pastilha) => pastilha.id)).toEqual([abaixo.id, noMinimo.id]);
  });
});

describe("GET /api/pastilhas/:id", () => {
  it("devolve a pastilha com o fabricante", async () => {
    const { cabecalho } = await entrarComo("OPERADOR");
    const fabricante = await criarFabricante("Iscar");
    const pastilha = await criarPastilha({ fabricanteId: fabricante.id });
    const resposta = await api().get(`/api/pastilhas/${pastilha.id}`).set(cabecalho);
    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({
      id: pastilha.id,
      codigo: pastilha.codigo,
      fabricante: { nome: "Iscar" },
    });
  });

  it("responde 404 para id inexistente e 400 para id inválido", async () => {
    const { cabecalho } = await entrarComo("OPERADOR");
    const inexistente = await api().get("/api/pastilhas/9999").set(cabecalho);
    expect(inexistente.status).toBe(404);
    expect(inexistente.body).toEqual({ erro: "Pastilha não encontrada", codigo: "NAO_ENCONTRADO" });
    expect((await api().get("/api/pastilhas/abc").set(cabecalho)).status).toBe(400);
    expect((await api().get("/api/pastilhas/2147483648").set(cabecalho)).status).toBe(400);
  });
});
