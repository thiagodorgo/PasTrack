import { describe, expect, it, vi } from "vitest";
import { prisma } from "../../src/config/prisma";
import { api, autorizacao } from "../helpers/api";
import { criarMovimentacoes, DadosMovimentacao, registrarMovimentacao } from "../helpers/estoque";
import { criarFabricante, criarFornecedor, criarPastilha, criarUsuario } from "../helpers/fabricas";

async function saldoDe(pastilhaId: number) {
  return (await prisma.pastilha.findUniqueOrThrow({ where: { id: pastilhaId } })).saldoAtual;
}

/** Comportamentos atuais que precisam continuar valendo depois das correções de segurança. */
describe("POST /api/movimentacoes", () => {
  it("ENTRADA soma ao saldo e registra o responsável e o fornecedor", async () => {
    const { usuario, token } = await criarUsuario({ perfil: "OPERADOR" });
    const pastilha = await criarPastilha({ saldoAtual: 2 });
    const fornecedor = await criarFornecedor();
    const resposta = await api().post("/api/movimentacoes").set(autorizacao(token)).send({
      tipo: "ENTRADA",
      pastilhaId: pastilha.id,
      quantidade: 5,
      fornecedorId: fornecedor.id,
      documento: "NF 123",
    });
    expect(resposta.status).toBe(201);
    expect(resposta.body.saldoAtual).toBe(7);
    expect(resposta.body.movimentacao).toMatchObject({
      tipo: "ENTRADA",
      quantidade: 5,
      usuarioId: usuario.id,
      fornecedorId: fornecedor.id,
      documento: "NF 123",
    });
  });

  it("SAÍDA desconta do saldo", async () => {
    const { token } = await criarUsuario({ perfil: "OPERADOR" });
    const pastilha = await criarPastilha({ saldoAtual: 10 });
    const resposta = await api()
      .post("/api/movimentacoes")
      .set(autorizacao(token))
      .send({ tipo: "SAIDA", pastilhaId: pastilha.id, quantidade: 4 });
    expect(resposta.status).toBe(201);
    expect(resposta.body.saldoAtual).toBe(6);
    expect(resposta.body.movimentacao).toMatchObject({ tipo: "SAIDA", quantidade: 4, fornecedorId: null });
  });

  it("recusa SAÍDA maior que o saldo sem alterar nada", async () => {
    const { token } = await criarUsuario({ perfil: "OPERADOR" });
    const pastilha = await criarPastilha({ saldoAtual: 3 });
    const resposta = await api()
      .post("/api/movimentacoes")
      .set(autorizacao(token))
      .send({ tipo: "SAIDA", pastilhaId: pastilha.id, quantidade: 4 });
    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toMatch(/^Saldo insuficiente/);
    expect(await prisma.movimentacao.count()).toBe(0);
    expect(await saldoDe(pastilha.id)).toBe(3);
  });

  it("recusa pastilha inexistente com 404", async () => {
    const { token } = await criarUsuario({ perfil: "OPERADOR" });
    const fornecedor = await criarFornecedor();
    const resposta = await api()
      .post("/api/movimentacoes")
      .set(autorizacao(token))
      .send({ tipo: "ENTRADA", pastilhaId: 9999, quantidade: 1, fornecedorId: fornecedor.id });
    expect(resposta.status).toBe(404);
  });

  it("abre um único alerta quando o saldo chega ao mínimo", async () => {
    const { token } = await criarUsuario({ perfil: "OPERADOR" });
    const pastilha = await criarPastilha({ saldoAtual: 6, estoqueMinimo: 5 });
    for (let i = 0; i < 2; i++) {
      await api()
        .post("/api/movimentacoes")
        .set(autorizacao(token))
        .send({ tipo: "SAIDA", pastilhaId: pastilha.id, quantidade: 1 });
    }
    const alertas = await prisma.alerta.findMany({ where: { pastilhaId: pastilha.id } });
    expect(alertas).toHaveLength(1);
    expect(alertas[0].situacao).toBe("ABERTO");
  });

  it("quantidade não numérica em POST /api/movimentacoes devolve 400", async () => {
    const espiao = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { token } = await criarUsuario({ perfil: "GESTOR" });
    const pastilha = await criarPastilha({ saldoAtual: 5 });
    const fornecedor = await criarFornecedor();
    const resposta = await api()
      .post("/api/movimentacoes")
      .set(autorizacao(token))
      .send({ tipo: "ENTRADA", pastilhaId: pastilha.id, quantidade: "abc", fornecedorId: fornecedor.id });
    expect(resposta.status).toBe(400);
    expect(resposta.body).toMatchObject({ codigo: "DADOS_INVALIDOS" });
    expect(resposta.body.campos).toEqual([expect.objectContaining({ caminho: "quantidade" })]);
    expect(espiao).not.toHaveBeenCalled();
    expect(await saldoDe(pastilha.id)).toBe(5);
  });
});

describe("validação do corpo de POST /api/movimentacoes", () => {
  async function preparar() {
    const { token } = await criarUsuario({ perfil: "GESTOR" });
    const pastilha = await criarPastilha({ saldoAtual: 10 });
    const fornecedor = await criarFornecedor();
    const entrada = { tipo: "ENTRADA", pastilhaId: pastilha.id, quantidade: 1, fornecedorId: fornecedor.id };
    const saida = { tipo: "SAIDA", pastilhaId: pastilha.id, quantidade: 1 };
    return { token, pastilha, fornecedor, entrada, saida };
  }

  async function esperarRecusa(resposta: { status: number; body: { campos?: unknown } }, caminho: string) {
    expect(resposta.status).toBe(400);
    expect(resposta.body).toMatchObject({ erro: "Dados inválidos", codigo: "DADOS_INVALIDOS" });
    expect(resposta.body.campos).toEqual(expect.arrayContaining([expect.objectContaining({ caminho })]));
    expect(await prisma.movimentacao.count()).toBe(0);
  }

  it("ENTRADA sem fornecedor devolve 400 e não mexe no saldo", async () => {
    const { token, pastilha, entrada } = await preparar();
    const resposta = await registrarMovimentacao(token, { ...entrada, fornecedorId: undefined });
    await esperarRecusa(resposta, "fornecedorId");
    expect(await saldoDe(pastilha.id)).toBe(10);
  });

  it("ENTRADA com fornecedorId que não é id válido devolve 400", async () => {
    const { token, entrada } = await preparar();
    for (const fornecedorId of [0, -3, 1.5, "1", null]) {
      const resposta = await registrarMovimentacao(token, { ...entrada, fornecedorId });
      await esperarRecusa(resposta, "fornecedorId");
    }
  });

  it("SAÍDA com fornecedor devolve 400 e não mexe no saldo", async () => {
    const { token, pastilha, fornecedor, saida } = await preparar();
    const resposta = await registrarMovimentacao(token, { ...saida, fornecedorId: fornecedor.id });
    await esperarRecusa(resposta, "fornecedorId");
    expect(resposta.body.campos[0].mensagem).toBe("A saída não tem fornecedor");
    expect(await saldoDe(pastilha.id)).toBe(10);
  });

  it("tipo ausente ou desconhecido devolve 400", async () => {
    const { token, saida } = await preparar();
    await esperarRecusa(await registrarMovimentacao(token, { ...saida, tipo: "TRANSFERENCIA" }), "tipo");
    await esperarRecusa(await registrarMovimentacao(token, { ...saida, tipo: undefined }), "tipo");
  });

  it("pastilha ausente ou em texto devolve 400", async () => {
    const { token, pastilha, saida } = await preparar();
    await esperarRecusa(
      await registrarMovimentacao(token, { ...saida, pastilhaId: undefined }),
      "pastilhaId"
    );
    await esperarRecusa(
      await registrarMovimentacao(token, { ...saida, pastilhaId: String(pastilha.id) }),
      "pastilhaId"
    );
  });

  it.each([0, -1, 1.5, 1_000_001, "5", null, undefined])("recusa a quantidade %j", async (quantidade) => {
    const { token, pastilha, entrada } = await preparar();
    const resposta = await registrarMovimentacao(token, { ...entrada, quantidade });
    await esperarRecusa(resposta, "quantidade");
    expect(await saldoDe(pastilha.id)).toBe(10);
  });

  it("aceita as quantidades nos limites de 1 e 1.000.000", async () => {
    const { token, entrada } = await preparar();
    const minima = await registrarMovimentacao(token, { ...entrada, quantidade: 1 });
    expect(minima.status).toBe(201);
    const maxima = await registrarMovimentacao(token, { ...entrada, quantidade: 1_000_000 });
    expect(maxima.status).toBe(201);
    expect(maxima.body.saldoAtual).toBe(1_000_011);
  });

  it("recusa documento e observação longos demais, de outro tipo ou com o caractere nulo", async () => {
    const { token, saida } = await preparar();
    await esperarRecusa(
      await registrarMovimentacao(token, { ...saida, documento: "d".repeat(101) }),
      "documento"
    );
    await esperarRecusa(
      await registrarMovimentacao(token, { ...saida, observacao: "o".repeat(501) }),
      "observacao"
    );
    await esperarRecusa(await registrarMovimentacao(token, { ...saida, documento: 123 }), "documento");
    // o PostgreSQL não grava o caractere nulo: o schema recusa antes de chegar ao banco
    const nulo = String.fromCharCode(0);
    await esperarRecusa(
      await registrarMovimentacao(token, { ...saida, documento: `NF${nulo}1` }),
      "documento"
    );
    await esperarRecusa(
      await registrarMovimentacao(token, { ...saida, observacao: `a${nulo}` }),
      "observacao"
    );
  });

  it("apara os espaços antes de medir documento e observação", async () => {
    const { token, saida } = await preparar();
    const resposta = await registrarMovimentacao(token, {
      ...saida,
      documento: `  ${"d".repeat(100)}  `,
      observacao: ` ${"o".repeat(500)}\n`,
    });
    expect(resposta.status).toBe(201);
    expect(resposta.body.movimentacao.documento).toBe("d".repeat(100));
    expect(resposta.body.movimentacao.observacao).toBe("o".repeat(500));
  });

  it.each([
    ["saldoAtual", 999],
    ["usuarioId", 1],
    ["dataHora", "2020-01-01T00:00:00.000Z"],
    ["id", 7],
  ])("recusa o campo extra %s", async (campo, valor) => {
    const { token, pastilha, entrada } = await preparar();
    const resposta = await registrarMovimentacao(token, { ...entrada, [campo]: valor });
    expect(resposta.status).toBe(400);
    expect(resposta.body.campos[0].mensagem).toBe(`Campo não permitido: ${campo}`);
    expect(await prisma.movimentacao.count()).toBe(0);
    expect(await saldoDe(pastilha.id)).toBe(10);
  });

  it("recusa corpo que não é objeto", async () => {
    const { token } = await preparar();
    const resposta = await api().post("/api/movimentacoes").set(autorizacao(token)).send([1, 2]);
    expect(resposta.status).toBe(400);
    expect(resposta.body.codigo).toBe("DADOS_INVALIDOS");
  });
});

describe("regras do registro", () => {
  it("ENTRADA com fornecedor inexistente devolve 400 REFERENCIA_INVALIDA sem gravar nada", async () => {
    const { token } = await criarUsuario({ perfil: "GESTOR" });
    const pastilha = await criarPastilha({ saldoAtual: 4, estoqueMinimo: 5 });
    const resposta = await registrarMovimentacao(token, {
      tipo: "ENTRADA",
      pastilhaId: pastilha.id,
      quantidade: 3,
      fornecedorId: 9999,
    });
    expect(resposta.status).toBe(400);
    expect(resposta.body).toEqual({ erro: "Fornecedor não encontrado", codigo: "REFERENCIA_INVALIDA" });
    expect(await saldoDe(pastilha.id)).toBe(4);
    expect(await prisma.movimentacao.count()).toBe(0);
    expect(await prisma.alerta.count()).toBe(0);
    expect(await prisma.auditoria.count()).toBe(0);
  });

  it("pastilha inexistente responde 404 antes de conferir o fornecedor", async () => {
    const { token } = await criarUsuario({ perfil: "GESTOR" });
    const entrada = await registrarMovimentacao(token, {
      tipo: "ENTRADA",
      pastilhaId: 9999,
      quantidade: 1,
      fornecedorId: 9999,
    });
    expect(entrada.status).toBe(404);
    expect(entrada.body).toEqual({ erro: "Pastilha não encontrada" });
    const saida = await registrarMovimentacao(token, { tipo: "SAIDA", pastilhaId: 9999, quantidade: 1 });
    expect(saida.status).toBe(404);
  });

  it("SAÍDA de todo o saldo é aceita e zera o estoque", async () => {
    const { token } = await criarUsuario({ perfil: "OPERADOR" });
    const pastilha = await criarPastilha({ saldoAtual: 4 });
    const resposta = await registrarMovimentacao(token, {
      tipo: "SAIDA",
      pastilhaId: pastilha.id,
      quantidade: 4,
    });
    expect(resposta.status).toBe(201);
    expect(resposta.body.saldoAtual).toBe(0);
    expect(await saldoDe(pastilha.id)).toBe(0);
  });

  it("saldo insuficiente informa o saldo atual e a unidade da pastilha", async () => {
    const { token } = await criarUsuario({ perfil: "OPERADOR" });
    const pastilha = await criarPastilha({ saldoAtual: 3, unidade: "cx" });
    const resposta = await registrarMovimentacao(token, {
      tipo: "SAIDA",
      pastilhaId: pastilha.id,
      quantidade: 4,
    });
    expect(resposta.status).toBe(400);
    expect(resposta.body).toEqual({ erro: "Saldo insuficiente: há 3 cx em estoque" });
  });

  it("devolve só a movimentação criada e o saldo atual", async () => {
    const { usuario, token } = await criarUsuario({ perfil: "OPERADOR" });
    const pastilha = await criarPastilha({ saldoAtual: 9 });
    const resposta = await registrarMovimentacao(token, {
      tipo: "SAIDA",
      pastilhaId: pastilha.id,
      quantidade: 2,
      observacao: "troca de turno",
    });
    expect(resposta.status).toBe(201);
    expect(Object.keys(resposta.body).sort()).toEqual(["movimentacao", "saldoAtual"]);
    const gravada = await prisma.movimentacao.findUniqueOrThrow({
      where: { id: resposta.body.movimentacao.id },
    });
    expect(resposta.body.movimentacao).toEqual({ ...gravada, dataHora: gravada.dataHora.toISOString() });
    expect(gravada).toMatchObject({
      usuarioId: usuario.id,
      fornecedorId: null,
      observacao: "troca de turno",
    });
    expect(resposta.body.saldoAtual).toBe(7);
  });
});

describe("GET /api/movimentacoes", () => {
  const inicio = new Date("2026-09-01T12:00:00.000Z");
  const minutos = (n: number) => new Date(inicio.getTime() + n * 60_000);
  const ids = (lista: { id: number }[]) => lista.map((movimentacao) => movimentacao.id);

  async function preparar() {
    const { usuario, token } = await criarUsuario({ perfil: "OPERADOR" });
    const pastilha = await criarPastilha();
    const outra = await criarPastilha();
    const fornecedor = await criarFornecedor();
    return { usuario, token, pastilha, outra, fornecedor };
  }

  function listar(token: string, consulta: Record<string, string | number> = {}) {
    return api().get("/api/movimentacoes").set(autorizacao(token)).query(consulta);
  }

  it("sem página devolve o array das 100 mais recentes com pastilha, usuário e fornecedor", async () => {
    const { usuario, token, pastilha, fornecedor } = await preparar();
    await criarMovimentacoes(
      Array.from({ length: 105 }, (_, i): DadosMovimentacao => ({
        pastilhaId: pastilha.id,
        usuarioId: usuario.id,
        tipo: i % 2 === 0 ? "ENTRADA" : "SAIDA",
        fornecedorId: i % 2 === 0 ? fornecedor.id : null,
        dataHora: minutos(i),
      }))
    );

    const resposta = await listar(token);
    expect(resposta.status).toBe(200);
    expect(Array.isArray(resposta.body)).toBe(true);
    expect(resposta.body).toHaveLength(100);
    expect(resposta.body[0].dataHora).toBe(minutos(104).toISOString());
    expect(resposta.body[99].dataHora).toBe(minutos(5).toISOString());
    expect(resposta.body[0]).toMatchObject({
      tipo: "ENTRADA",
      pastilha: { codigo: pastilha.codigo, descricao: pastilha.descricao, unidade: pastilha.unidade },
      usuario: { nome: usuario.nome },
      fornecedor: { nome: fornecedor.nome },
    });
    expect(resposta.body[1]).toMatchObject({ tipo: "SAIDA", fornecedor: null });
  });

  it("ordena pela data e desempata pelo id, da mais nova para a mais antiga", async () => {
    const { usuario, token, pastilha } = await preparar();
    await criarMovimentacoes(
      [minutos(1), minutos(2), minutos(2), minutos(0)].map((dataHora) => ({
        pastilhaId: pastilha.id,
        usuarioId: usuario.id,
        dataHora,
      }))
    );
    expect(ids((await listar(token)).body)).toEqual([3, 2, 1, 4]);
  });

  it("com página devolve dados, total, página e tamanho", async () => {
    const { usuario, token, pastilha } = await preparar();
    await criarMovimentacoes(
      Array.from({ length: 25 }, (_, i) => ({
        pastilhaId: pastilha.id,
        usuarioId: usuario.id,
        dataHora: minutos(i),
      }))
    );

    const primeira = await listar(token, { pagina: 1 });
    expect(primeira.status).toBe(200);
    expect(Object.keys(primeira.body).sort()).toEqual(["dados", "pagina", "tamanho", "total"]);
    expect(primeira.body).toMatchObject({ total: 25, pagina: 1, tamanho: 20 });
    expect(primeira.body.dados).toHaveLength(20);
    expect(primeira.body.dados[0]).toMatchObject({
      dataHora: minutos(24).toISOString(),
      pastilha: { codigo: pastilha.codigo, descricao: pastilha.descricao, unidade: pastilha.unidade },
      usuario: { nome: usuario.nome },
      fornecedor: null,
    });

    const segunda = await listar(token, { pagina: 2 });
    expect(segunda.body).toMatchObject({ total: 25, pagina: 2, tamanho: 20 });
    expect(segunda.body.dados).toHaveLength(5);
    expect(segunda.body.dados[4].dataHora).toBe(minutos(0).toISOString());

    const menor = await listar(token, { pagina: 2, tamanho: 10 });
    expect(menor.body).toMatchObject({ total: 25, pagina: 2, tamanho: 10 });
    expect(menor.body.dados.map((m: { dataHora: string }) => m.dataHora)).toEqual(
      Array.from({ length: 10 }, (_, i) => minutos(14 - i).toISOString())
    );

    const alemDoFim = await listar(token, { pagina: 9 });
    expect(alemDoFim.body).toEqual({ dados: [], total: 25, pagina: 9, tamanho: 20 });
  });

  it("aceita o tamanho máximo de 100 por página", async () => {
    const { usuario, token, pastilha } = await preparar();
    await criarMovimentacoes(
      Array.from({ length: 101 }, (_, i) => ({
        pastilhaId: pastilha.id,
        usuarioId: usuario.id,
        dataHora: minutos(i),
      }))
    );
    const resposta = await listar(token, { pagina: 1, tamanho: 100 });
    expect(resposta.status).toBe(200);
    expect(resposta.body.dados).toHaveLength(100);
    expect(resposta.body.total).toBe(101);
  });

  it("filtra por tipo, pastilha e período, com e sem página", async () => {
    const { usuario, token, pastilha, outra, fornecedor } = await preparar();
    const entrada = { usuarioId: usuario.id, tipo: "ENTRADA" as const, fornecedorId: fornecedor.id };
    const saida = { usuarioId: usuario.id, tipo: "SAIDA" as const };
    await criarMovimentacoes([
      { ...entrada, pastilhaId: pastilha.id, dataHora: new Date("2026-09-01T10:00:00.000Z") },
      { ...saida, pastilhaId: pastilha.id, dataHora: new Date("2026-09-10T00:00:00.000Z") },
      { ...saida, pastilhaId: outra.id, dataHora: new Date("2026-09-10T12:00:00.000Z") },
      { ...saida, pastilhaId: pastilha.id, dataHora: new Date("2026-09-10T23:59:59.999Z") },
      { ...entrada, pastilhaId: outra.id, dataHora: new Date("2026-09-11T00:00:00.000Z") },
    ]);

    expect(ids((await listar(token, { tipo: "ENTRADA" })).body)).toEqual([5, 1]);
    expect(ids((await listar(token, { pastilhaId: outra.id })).body)).toEqual([5, 3]);
    // a data sem hora cobre o dia inteiro, do primeiro ao último milissegundo
    expect(ids((await listar(token, { de: "2026-09-10", ate: "2026-09-10" })).body)).toEqual([4, 3, 2]);
    expect(ids((await listar(token, { de: "2026-09-10T12:00:00Z" })).body)).toEqual([5, 4, 3]);
    // data e hora com fuso: 09:00 em -03:00 é 12:00 UTC, e o limite é inclusivo
    expect(ids((await listar(token, { ate: "2026-09-10T09:00:00-03:00" })).body)).toEqual([3, 2, 1]);

    const pagina = await listar(token, {
      pagina: 1,
      tamanho: 1,
      tipo: "SAIDA",
      pastilhaId: pastilha.id,
      de: "2026-09-10",
    });
    expect(pagina.body).toMatchObject({ total: 2, pagina: 1, tamanho: 1 });
    expect(ids(pagina.body.dados)).toEqual([4]);
  });

  it.each([
    ["pagina", "0"],
    ["pagina", "abc"],
    ["pagina", "1.5"],
    ["tamanho", "0"],
    ["tamanho", "101"],
    ["tipo", "TRANSFERENCIA"],
    ["pastilhaId", "0"],
    ["pastilhaId", "x"],
    ["de", "14/09/2026"],
    ["de", "2026-13-01"],
    ["de", "2026-09-10T12:00:00"],
    ["ate", "ontem"],
  ])("recusa %s=%s com 400", async (campo, valor) => {
    const { token } = await criarUsuario();
    const resposta = await listar(token, { [campo]: valor });
    expect(resposta.status).toBe(400);
    expect(resposta.body.codigo).toBe("DADOS_INVALIDOS");
    expect(resposta.body.campos[0].caminho).toBe(campo);
  });

  it("recusa parâmetro desconhecido e período invertido", async () => {
    const { token } = await criarUsuario();
    const extra = await listar(token, { ordem: "asc" });
    expect(extra.status).toBe(400);
    expect(extra.body.campos[0].mensagem).toBe("Campo não permitido: ordem");

    const invertido = await listar(token, { de: "2026-09-10", ate: "2026-09-09" });
    expect(invertido.status).toBe(400);
    expect(invertido.body.campos).toEqual([
      { caminho: "ate", mensagem: "A data final deve ser igual ou posterior à inicial" },
    ]);
  });
});

describe("ids no limite do INT4", () => {
  const ID_MAXIMO = 2_147_483_647;

  /** Pastilha e fornecedor gravados com o maior id que o banco aceita. */
  async function criarNoLimite() {
    const fabricante = await criarFabricante();
    await prisma.pastilha.create({
      data: {
        id: ID_MAXIMO,
        codigo: "PT-LIMITE",
        descricao: "Pastilha no limite",
        fabricanteId: fabricante.id,
        saldoAtual: 5,
      },
    });
    await prisma.fornecedor.create({ data: { id: ID_MAXIMO, nome: "Fornecedor no limite" } });
  }

  it("aceita 2147483647 como pastilhaId e fornecedorId", async () => {
    const { token } = await criarUsuario({ perfil: "GESTOR" });
    await criarNoLimite();
    const entrada = await registrarMovimentacao(token, {
      tipo: "ENTRADA",
      pastilhaId: ID_MAXIMO,
      quantidade: 2,
      fornecedorId: ID_MAXIMO,
    });
    expect(entrada.status).toBe(201);
    expect(entrada.body.saldoAtual).toBe(7);
    const saida = await registrarMovimentacao(token, { tipo: "SAIDA", pastilhaId: ID_MAXIMO, quantidade: 1 });
    expect(saida.status).toBe(201);
    expect(saida.body.saldoAtual).toBe(6);
  });

  it("pastilha inexistente com id 2147483647 responde 404", async () => {
    const { token } = await criarUsuario({ perfil: "GESTOR" });
    const resposta = await registrarMovimentacao(token, {
      tipo: "SAIDA",
      pastilhaId: ID_MAXIMO,
      quantidade: 1,
    });
    expect(resposta.status).toBe(404);
  });

  it.each(["pastilhaId", "fornecedorId"])("recusa %s igual a 2147483648 com 400", async (campo) => {
    const { token } = await criarUsuario({ perfil: "GESTOR" });
    await criarNoLimite();
    const resposta = await registrarMovimentacao(token, {
      tipo: "ENTRADA",
      pastilhaId: ID_MAXIMO,
      quantidade: 1,
      fornecedorId: ID_MAXIMO,
      [campo]: ID_MAXIMO + 1,
    });
    expect(resposta.status).toBe(400);
    expect(resposta.body.campos).toEqual([expect.objectContaining({ caminho: campo })]);
    expect(await prisma.movimentacao.count()).toBe(0);
  });

  it("o filtro pastilhaId aceita 2147483647 e recusa 2147483648", async () => {
    const { token } = await criarUsuario();
    const noLimite = await api()
      .get("/api/movimentacoes")
      .set(autorizacao(token))
      .query({ pastilhaId: ID_MAXIMO });
    expect(noLimite.status).toBe(200);
    expect(noLimite.body).toEqual([]);
    const acima = await api()
      .get("/api/movimentacoes")
      .set(autorizacao(token))
      .query({ pastilhaId: ID_MAXIMO + 1 });
    expect(acima.status).toBe(400);
    expect(acima.body.campos[0].caminho).toBe("pastilhaId");
  });
});

describe("SAIDA de quem só registra ENTRADA", () => {
  it("COMPRADOR com SAIDA de quantidade 0 recebe 403, não 400", async () => {
    const { token } = await criarUsuario({ perfil: "COMPRADOR" });
    const pastilha = await criarPastilha({ saldoAtual: 5 });
    const resposta = await registrarMovimentacao(token, {
      tipo: "SAIDA",
      pastilhaId: pastilha.id,
      quantidade: 0,
    });
    expect(resposta.status).toBe(403);
    expect(resposta.body).toEqual({ erro: "Seu perfil só pode registrar entradas" });
    expect(await saldoDe(pastilha.id)).toBe(5);
  });

  it("COMPRADOR com SAIDA cheia de campos inválidos também recebe 403", async () => {
    const { token } = await criarUsuario({ perfil: "COMPRADOR" });
    const resposta = await registrarMovimentacao(token, {
      tipo: "SAIDA",
      pastilhaId: "x",
      fornecedorId: 1,
      saldoAtual: 9,
    });
    expect(resposta.status).toBe(403);
    expect(resposta.body).toEqual({ erro: "Seu perfil só pode registrar entradas" });
  });

  it("a ENTRADA inválida do COMPRADOR continua recebendo 400", async () => {
    const { token } = await criarUsuario({ perfil: "COMPRADOR" });
    const pastilha = await criarPastilha();
    const resposta = await registrarMovimentacao(token, {
      tipo: "ENTRADA",
      pastilhaId: pastilha.id,
      quantidade: 0,
    });
    expect(resposta.status).toBe(400);
    expect(resposta.body.codigo).toBe("DADOS_INVALIDOS");
  });
});

describe("documento e observação vazios", () => {
  it("só com espaços, documento e observação gravam null", async () => {
    const { token } = await criarUsuario({ perfil: "OPERADOR" });
    const pastilha = await criarPastilha({ saldoAtual: 5 });
    const resposta = await registrarMovimentacao(token, {
      tipo: "SAIDA",
      pastilhaId: pastilha.id,
      quantidade: 1,
      documento: "   ",
      observacao: " \n\t ",
    });
    expect(resposta.status).toBe(201);
    expect(resposta.body.movimentacao).toMatchObject({ documento: null, observacao: null });
  });

  it("aceita null em documento e observação e grava null", async () => {
    const { token } = await criarUsuario({ perfil: "GESTOR" });
    const pastilha = await criarPastilha();
    const fornecedor = await criarFornecedor();
    const resposta = await registrarMovimentacao(token, {
      tipo: "ENTRADA",
      pastilhaId: pastilha.id,
      quantidade: 1,
      fornecedorId: fornecedor.id,
      documento: null,
      observacao: null,
    });
    expect(resposta.status).toBe(201);
    const gravada = await prisma.movimentacao.findUniqueOrThrow({
      where: { id: resposta.body.movimentacao.id },
    });
    expect(gravada).toMatchObject({ documento: null, observacao: null });
  });
});
