import { describe, expect, it } from "vitest";
import { prisma } from "../../src/config/prisma";
import { api, autorizacao } from "../helpers/api";
import { criarFornecedor, criarPastilha, criarUsuario } from "../helpers/fabricas";

async function movimentar(token: string, pastilhaId: number, tipo: "ENTRADA" | "SAIDA", quantidade: number) {
  // a ENTRADA exige fornecedor; a SAÍDA não aceita
  const fornecedorId = tipo === "ENTRADA" ? (await criarFornecedor()).id : undefined;
  const resposta = await api()
    .post("/api/movimentacoes")
    .set(autorizacao(token))
    .send({ tipo, pastilhaId, quantidade, fornecedorId });
  expect(resposta.status).toBe(201);
  return resposta;
}

describe("ciclo de vida do alerta", () => {
  it("SAÍDA que atinge o mínimo abre alerta e registra na auditoria", async () => {
    const { usuario, token } = await criarUsuario({ perfil: "OPERADOR" });
    const pastilha = await criarPastilha({ saldoAtual: 6, estoqueMinimo: 5 });
    await movimentar(token, pastilha.id, "SAIDA", 1);

    const alertas = await prisma.alerta.findMany({ where: { pastilhaId: pastilha.id } });
    expect(alertas).toHaveLength(1);
    expect(alertas[0]).toMatchObject({ situacao: "ABERTO", dataResolucao: null, resolvidoPorId: null });
    const registro = await prisma.auditoria.findFirstOrThrow({ where: { acao: "alerta.aberto" } });
    expect(registro).toMatchObject({ usuarioId: usuario.id, entidade: "pastilha", entidadeId: pastilha.id });
  });

  it("ENTRADA que repõe o saldo acima do mínimo fecha o alerta automaticamente", async () => {
    const { token } = await criarUsuario({ perfil: "GESTOR" });
    const pastilha = await criarPastilha({ saldoAtual: 5, estoqueMinimo: 5 });
    await movimentar(token, pastilha.id, "SAIDA", 1);
    await movimentar(token, pastilha.id, "ENTRADA", 10);

    const alerta = await prisma.alerta.findFirstOrThrow({ where: { pastilhaId: pastilha.id } });
    expect(alerta.situacao).toBe("RESOLVIDO");
    expect(alerta.dataResolucao).toBeInstanceOf(Date);
    expect(alerta.resolvidoPorId).toBeNull();
    const registros = await prisma.auditoria.count({
      where: { acao: "alerta.resolvido_automaticamente", entidadeId: alerta.id },
    });
    expect(registros).toBe(1);
  });

  it("ENTRADA que não passa do mínimo mantém o alerta aberto", async () => {
    const { token } = await criarUsuario({ perfil: "GESTOR" });
    const pastilha = await criarPastilha({ saldoAtual: 5, estoqueMinimo: 5 });
    await movimentar(token, pastilha.id, "SAIDA", 2);
    await movimentar(token, pastilha.id, "ENTRADA", 2);

    const alerta = await prisma.alerta.findFirstOrThrow({ where: { pastilhaId: pastilha.id } });
    expect(alerta.situacao).toBe("ABERTO");
  });

  it("abre um novo alerta quando o saldo volta a cair depois da reposição", async () => {
    const { token } = await criarUsuario({ perfil: "GESTOR" });
    const pastilha = await criarPastilha({ saldoAtual: 6, estoqueMinimo: 5 });
    await movimentar(token, pastilha.id, "SAIDA", 1);
    await movimentar(token, pastilha.id, "ENTRADA", 5);
    await movimentar(token, pastilha.id, "SAIDA", 6);

    const alertas = await prisma.alerta.findMany({
      where: { pastilhaId: pastilha.id },
      orderBy: { id: "asc" },
    });
    expect(alertas.map((alerta) => alerta.situacao)).toEqual(["RESOLVIDO", "ABERTO"]);
  });
});

describe("integridade garantida pelo banco", () => {
  it("não permite saldo negativo", async () => {
    const pastilha = await criarPastilha({ saldoAtual: 1 });
    await expect(
      prisma.pastilha.update({ where: { id: pastilha.id }, data: { saldoAtual: -1 } })
    ).rejects.toThrow();
  });

  it("não permite estoque mínimo negativo", async () => {
    const pastilha = await criarPastilha();
    await expect(
      prisma.pastilha.update({ where: { id: pastilha.id }, data: { estoqueMinimo: -1 } })
    ).rejects.toThrow();
  });

  it("não permite movimentação com quantidade zero", async () => {
    const { usuario } = await criarUsuario();
    const pastilha = await criarPastilha();
    await expect(
      prisma.movimentacao.create({
        data: { tipo: "ENTRADA", quantidade: 0, pastilhaId: pastilha.id, usuarioId: usuario.id },
      })
    ).rejects.toThrow();
  });

  it("não permite dois alertas abertos para a mesma pastilha", async () => {
    const pastilha = await criarPastilha();
    await prisma.alerta.create({ data: { pastilhaId: pastilha.id } });
    await expect(prisma.alerta.create({ data: { pastilhaId: pastilha.id } })).rejects.toMatchObject({
      code: "P2002",
    });
  });

  it("permite vários alertas resolvidos para a mesma pastilha", async () => {
    const pastilha = await criarPastilha();
    await prisma.alerta.createMany({
      data: [
        { pastilhaId: pastilha.id, situacao: "RESOLVIDO" },
        { pastilhaId: pastilha.id, situacao: "RESOLVIDO" },
        { pastilhaId: pastilha.id },
      ],
    });
    expect(await prisma.alerta.count({ where: { pastilhaId: pastilha.id } })).toBe(3);
  });
});

describe("erros do banco viram respostas claras", () => {
  it("fabricante com nome repetido responde 409", async () => {
    const { token } = await criarUsuario({ perfil: "GESTOR" });
    await api().post("/api/fabricantes").set(autorizacao(token)).send({ nome: "Iscar" });
    const repetido = await api().post("/api/fabricantes").set(autorizacao(token)).send({ nome: "Iscar" });
    expect(repetido.status).toBe(409);
    expect(repetido.body).toMatchObject({ codigo: "DUPLICADO" });
  });

  it("resolver alerta inexistente responde 404", async () => {
    const { token } = await criarUsuario({ perfil: "GESTOR" });
    const resposta = await api().patch("/api/alertas/999/resolver").set(autorizacao(token));
    expect(resposta.status).toBe(404);
    expect(resposta.body).toMatchObject({ codigo: "NAO_ENCONTRADO" });
  });
});
