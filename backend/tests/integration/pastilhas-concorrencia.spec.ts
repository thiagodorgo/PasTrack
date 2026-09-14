import { PrismaClient } from "@prisma/client";
import { afterAll, describe, expect, it } from "vitest";
import { env } from "../../src/config/env";
import { prisma } from "../../src/config/prisma";
import { avaliarAlerta } from "../../src/services/estoque/avaliar-alerta";
import { api } from "../helpers/api";
import { entrarComo } from "../helpers/cadastros";
import { criarPastilha } from "../helpers/fabricas";

/**
 * Cliente próprio, com duas conexões, para a transação concorrente e para observar o banco.
 * Assim o PUT não disputa conexão com eles, qualquer que seja o tamanho do pool da API.
 */
function clienteComDuasConexoes() {
  const url = new URL(env.DATABASE_URL);
  url.searchParams.set("connection_limit", "2");
  return new PrismaClient({ datasources: { db: { url: url.toString() } } });
}

const outraConexao = clienteComDuasConexoes();

afterAll(async () => {
  await outraConexao.$disconnect();
});

/** Promessa que só se cumpre quando alguém chama disparar(). */
function sinal() {
  let disparar: () => void = () => undefined;
  const aconteceu = new Promise<void>((resolve) => {
    disparar = () => resolve();
  });
  return { disparar, aconteceu };
}

/** Espera até outra conexão do banco de teste ficar parada numa trava de linha pedida com FOR UPDATE. */
async function esperarBloqueio() {
  for (let tentativa = 0; tentativa < 250; tentativa++) {
    const [{ total }] = await outraConexao.$queryRaw<{ total: number }[]>`
      SELECT count(*)::int AS total
      FROM pg_stat_activity
      WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE '%FOR UPDATE%'
    `;
    if (total > 0) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("a edição não ficou esperando a trava da linha");
}

describe("edição concorrente da pastilha", () => {
  it("espera a trava da linha, audita o valor gravado pela outra transação e mantém o alerta coerente", async () => {
    const { usuario, cabecalho } = await entrarComo("GESTOR");
    const pastilha = await criarPastilha({ saldoAtual: 5, estoqueMinimo: 2 });
    const travou = sinal();
    const liberacao = sinal();

    // outra edição trava a linha, sobe o mínimo para 5 (o que abre o alerta) e segura a transação aberta
    const concorrente = outraConexao.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "pastilha" WHERE "id" = ${pastilha.id} FOR UPDATE`;
        await tx.pastilha.update({ where: { id: pastilha.id }, data: { estoqueMinimo: 5 } });
        await avaliarAlerta(tx, pastilha.id, usuario.id);
        travou.disparar();
        await liberacao.aconteceu;
      },
      { maxWait: 10_000, timeout: 15_000 }
    );
    await travou.aconteceu;

    // o PUT volta o mínimo para 2. Sem a trava, ele leria o 2 antigo, acharia que o mínimo não mudou
    // e deixaria aberto o alerta que a outra transação abriu
    const edicao = api()
      .put(`/api/pastilhas/${pastilha.id}`)
      .set(cabecalho)
      .send({ estoqueMinimo: 2 })
      .then((resposta) => resposta);
    try {
      await esperarBloqueio();
    } finally {
      liberacao.disparar();
    }
    await concorrente;
    const resposta = await edicao;

    expect(resposta.status).toBe(200);
    const registro = await prisma.auditoria.findFirstOrThrow({ where: { acao: "pastilha.atualizada" } });
    expect(registro.antes).toMatchObject({ estoqueMinimo: 5 });
    expect(registro.depois).toMatchObject({ estoqueMinimo: 2 });
    const alertas = await prisma.alerta.findMany({ where: { pastilhaId: pastilha.id } });
    expect(alertas.map((alerta) => alerta.situacao)).toEqual(["RESOLVIDO"]);
    const trilha = await prisma.auditoria.findMany({ orderBy: { id: "asc" }, select: { acao: true } });
    expect(trilha.map((item) => item.acao)).toEqual([
      "alerta.aberto",
      "pastilha.atualizada",
      "alerta.resolvido_automaticamente",
    ]);
  }, 15_000);
});
