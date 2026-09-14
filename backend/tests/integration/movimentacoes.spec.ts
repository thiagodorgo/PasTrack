import { describe, expect, it, vi } from "vitest";
import { prisma } from "../../src/config/prisma";
import { api, autorizacao } from "../helpers/api";
import { registrarMovimentacao } from "../helpers/estoque";
import { criarFornecedor, criarPastilha, criarUsuario } from "../helpers/fabricas";

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

  it("recusa documento acima de 100 caracteres e observação acima de 500", async () => {
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
    expect(entrada.body).toEqual({ erro: "Pastilha não encontrada", codigo: "NAO_ENCONTRADO" });
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
