import { describe, expect, it, vi } from "vitest";
import { prisma } from "../../src/config/prisma";
import { api, autorizacao } from "../helpers/api";
import { criarMovimentacoes } from "../helpers/estoque";
import { criarFornecedor, criarPastilha, criarUsuario } from "../helpers/fabricas";

function buscarResumo(token: string) {
  return api().get("/api/painel/resumo").set(autorizacao(token));
}

describe("GET /api/painel/resumo", () => {
  it("devolve totais, itens críticos e últimas movimentações no formato de sempre", async () => {
    const { usuario, token } = await criarUsuario({ perfil: "OPERADOR" });
    const fornecedor = await criarFornecedor();
    const critica = await criarPastilha({ saldoAtual: 1, estoqueMinimo: 5 });
    const noMinimo = await criarPastilha({ saldoAtual: 5, estoqueMinimo: 5 });
    await criarPastilha({ saldoAtual: 50, estoqueMinimo: 5 });
    await prisma.alerta.createMany({
      data: [
        { pastilhaId: critica.id },
        { pastilhaId: noMinimo.id },
        { pastilhaId: noMinimo.id, situacao: "RESOLVIDO" },
      ],
    });
    await criarMovimentacoes([
      { pastilhaId: critica.id, usuarioId: usuario.id, tipo: "ENTRADA", fornecedorId: fornecedor.id },
    ]);

    const resposta = await buscarResumo(token);
    expect(resposta.status).toBe(200);
    expect(Object.keys(resposta.body).sort()).toEqual([
      "alertasAbertos",
      "itensCriticos",
      "totalPastilhas",
      "ultimasMovimentacoes",
    ]);
    expect(resposta.body.totalPastilhas).toBe(3);
    expect(resposta.body.alertasAbertos).toBe(2);
    expect(resposta.body.itensCriticos).toEqual([
      {
        id: critica.id,
        codigo: critica.codigo,
        descricao: critica.descricao,
        saldoAtual: 1,
        estoqueMinimo: 5,
      },
      {
        id: noMinimo.id,
        codigo: noMinimo.codigo,
        descricao: noMinimo.descricao,
        saldoAtual: 5,
        estoqueMinimo: 5,
      },
    ]);
    expect(resposta.body.ultimasMovimentacoes).toHaveLength(1);
    expect(resposta.body.ultimasMovimentacoes[0]).toMatchObject({
      tipo: "ENTRADA",
      quantidade: 1,
      pastilhaId: critica.id,
      pastilha: { codigo: critica.codigo, descricao: critica.descricao, unidade: critica.unidade },
      usuario: { nome: usuario.nome },
      fornecedor: { nome: fornecedor.nome },
    });
  });

  it("traz só as 5 movimentações mais recentes, com o limite aplicado no banco", async () => {
    const { usuario, token } = await criarUsuario();
    const pastilha = await criarPastilha();
    const inicio = new Date("2026-09-01T08:00:00.000Z").getTime();
    await criarMovimentacoes(
      Array.from({ length: 8 }, (_, i) => ({
        pastilhaId: pastilha.id,
        usuarioId: usuario.id,
        dataHora: new Date(inicio + i * 60_000),
      }))
    );
    const consulta = vi.spyOn(prisma.movimentacao, "findMany");

    const resposta = await buscarResumo(token);
    expect(resposta.status).toBe(200);
    expect(resposta.body.ultimasMovimentacoes.map((m: { id: number }) => m.id)).toEqual([8, 7, 6, 5, 4]);
    expect(consulta).toHaveBeenCalledTimes(1);
    expect(consulta).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }));
  });

  it("limita os itens críticos a 20, começando pelos de menor saldo", async () => {
    const { token } = await criarUsuario();
    for (let saldo = 0; saldo < 22; saldo++) {
      await criarPastilha({ saldoAtual: saldo, estoqueMinimo: 30 });
    }
    await criarPastilha({ saldoAtual: 31, estoqueMinimo: 30 });

    const resposta = await buscarResumo(token);
    expect(resposta.status).toBe(200);
    expect(resposta.body.totalPastilhas).toBe(23);
    expect(resposta.body.itensCriticos.map((p: { saldoAtual: number }) => p.saldoAtual)).toEqual(
      Array.from({ length: 20 }, (_, saldo) => saldo)
    );
  });

  it("não conta como crítica a pastilha com estoque mínimo 0", async () => {
    const { token } = await criarUsuario();
    await criarPastilha({ saldoAtual: 0, estoqueMinimo: 0 });
    const critica = await criarPastilha({ saldoAtual: 1, estoqueMinimo: 2 });
    const resposta = await buscarResumo(token);
    expect(resposta.status).toBe(200);
    expect(resposta.body.itensCriticos.map((p: { id: number }) => p.id)).toEqual([critica.id]);
  });

  it("com o banco vazio devolve zeros e listas vazias", async () => {
    const { token } = await criarUsuario();
    const resposta = await buscarResumo(token);
    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({
      totalPastilhas: 0,
      alertasAbertos: 0,
      itensCriticos: [],
      ultimasMovimentacoes: [],
    });
  });

  it("exige autenticação", async () => {
    const resposta = await api().get("/api/painel/resumo");
    expect(resposta.status).toBe(401);
  });
});

describe("desempate dos itens críticos do painel", () => {
  it("pastilhas com o mesmo saldo saem do id menor para o maior", async () => {
    const { token } = await criarUsuario();
    const empatadas: number[] = [];
    for (let i = 0; i < 3; i++) {
      empatadas.push((await criarPastilha({ saldoAtual: 2, estoqueMinimo: 5 })).id);
    }
    const menorSaldo = await criarPastilha({ saldoAtual: 1, estoqueMinimo: 5 });

    const resposta = await buscarResumo(token);
    expect(resposta.status).toBe(200);
    expect(resposta.body.itensCriticos.map((p: { id: number }) => p.id)).toEqual([
      menorSaldo.id,
      ...empatadas,
    ]);
  });
});
