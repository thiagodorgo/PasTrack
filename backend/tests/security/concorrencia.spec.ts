import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/config/prisma";
import { registrarEntrada, registrarSaida } from "../helpers/estoque";
import { criarFornecedor, criarPastilha, criarUsuario } from "../helpers/fabricas";

/**
 * Abre de antemão as conexões que as requisições simultâneas vão usar. Abrir uma conexão pode
 * levar segundos em algumas máquinas, e o Prisma espera só 2 s para iniciar uma transação:
 * o que se testa aqui é a concorrência sobre o saldo, não a latência de conexão.
 */
async function aquecerConexoes(quantidade: number) {
  await Promise.all(Array.from({ length: quantidade }, () => prisma.$executeRaw`SELECT pg_sleep(0.05)`));
}

beforeEach(async () => {
  await aquecerConexoes(11);
});

/** Saldo, histórico e alertas da pastilha, lidos direto do banco. */
async function estadoDoEstoque(pastilhaId: number) {
  const pastilha = await prisma.pastilha.findUniqueOrThrow({ where: { id: pastilhaId } });
  const movimentacoes = await prisma.movimentacao.findMany({ where: { pastilhaId } });
  const alertas = await prisma.alerta.findMany({ where: { pastilhaId } });
  const saldoPeloHistorico = movimentacoes.reduce(
    (soma, m) => soma + (m.tipo === "ENTRADA" ? m.quantidade : -m.quantidade),
    0
  );
  return { pastilha, movimentacoes, alertas, saldoPeloHistorico };
}

/**
 * Movimentações simultâneas da mesma pastilha. O decremento condicional e a trava da linha da
 * pastilha precisam impedir saldo negativo, histórico divergente e alertas duplicados.
 */
describe("movimentações concorrentes", () => {
  it("10 SAÍDAs simultâneas de 1 unidade sobre saldo 5: 5 aceitas, 5 recusadas e um só alerta", async () => {
    const { token } = await criarUsuario({ perfil: "OPERADOR" });
    const pastilha = await criarPastilha({ saldoAtual: 5, estoqueMinimo: 2 });

    const respostas = await Promise.all(
      Array.from({ length: 10 }, () => registrarSaida(token, pastilha.id, 1))
    );

    const aceitas = respostas.filter((resposta) => resposta.status === 201);
    const recusadas = respostas.filter((resposta) => resposta.status === 400);
    expect(aceitas).toHaveLength(5);
    expect(recusadas).toHaveLength(5);
    for (const recusada of recusadas) {
      expect(recusada.body.erro).toBe("Saldo insuficiente: há 0 un em estoque");
    }
    // cada SAÍDA aceita viu o próprio saldo, em sequência, sem repetir valor
    expect(aceitas.map((resposta) => resposta.body.saldoAtual).sort()).toEqual([0, 1, 2, 3, 4]);

    const estado = await estadoDoEstoque(pastilha.id);
    expect(estado.pastilha.saldoAtual).toBe(0);
    expect(estado.movimentacoes).toHaveLength(5);
    expect(estado.alertas).toHaveLength(1);
    expect(estado.alertas[0].situacao).toBe("ABERTO");
    expect(estado.pastilha.estoqueMinimo).toBe(2);
    expect(await prisma.auditoria.count({ where: { acao: "alerta.aberto", entidadeId: pastilha.id } })).toBe(
      1
    );
  });

  it("uma ENTRADA simultânea a várias SAÍDAs mantém o saldo coerente com o histórico", async () => {
    const { token } = await criarUsuario({ perfil: "GESTOR" });
    const fornecedor = await criarFornecedor();
    const pastilha = await criarPastilha({ saldoAtual: 3, estoqueMinimo: 2 });

    const [entrada, ...saidas] = await Promise.all([
      registrarEntrada(token, pastilha.id, 5, fornecedor.id),
      ...Array.from({ length: 10 }, () => registrarSaida(token, pastilha.id, 1)),
    ]);

    expect(entrada.status).toBe(201);
    const aceitas = saidas.filter((resposta) => resposta.status === 201).length;
    const recusadas = saidas.filter((resposta) => resposta.status === 400);
    expect(aceitas + recusadas.length).toBe(10);
    // conforme a ordem, a ENTRADA chega antes de 0 a 10 SAÍDAs: de 3 a 8 são aceitas
    expect(aceitas).toBeGreaterThanOrEqual(3);
    expect(aceitas).toBeLessThanOrEqual(8);
    for (const recusada of recusadas) {
      expect(recusada.body.erro).toMatch(/^Saldo insuficiente/);
    }

    const estado = await estadoDoEstoque(pastilha.id);
    expect(estado.pastilha.saldoAtual).toBe(3 + 5 - aceitas);
    expect(estado.pastilha.saldoAtual).toBe(3 + estado.saldoPeloHistorico);
    expect(estado.movimentacoes).toHaveLength(1 + aceitas);
    const abertos = estado.alertas.filter((alerta) => alerta.situacao === "ABERTO");
    expect(abertos).toHaveLength(estado.pastilha.saldoAtual <= 2 ? 1 : 0);
  });

  it("SAÍDAs simultâneas de quantidades diferentes nunca deixam o saldo negativo", async () => {
    const { token } = await criarUsuario({ perfil: "OPERADOR" });
    const pastilha = await criarPastilha({ saldoAtual: 10 });
    const quantidades = [4, 4, 4, 3, 2, 1];

    const respostas = await Promise.all(
      quantidades.map((quantidade) => registrarSaida(token, pastilha.id, quantidade))
    );

    const retirado = quantidades
      .filter((_, indice) => respostas[indice].status === 201)
      .reduce((soma, quantidade) => soma + quantidade, 0);
    expect(respostas.every((resposta) => [201, 400].includes(resposta.status))).toBe(true);
    const estado = await estadoDoEstoque(pastilha.id);
    expect(estado.pastilha.saldoAtual).toBe(10 - retirado);
    expect(estado.pastilha.saldoAtual).toBeGreaterThanOrEqual(0);
    expect(estado.pastilha.saldoAtual).toBe(10 + estado.saldoPeloHistorico);
  });
});
