import { describe, expect, it } from "vitest";
import { prisma } from "../../src/config/prisma";
import { api, autorizacao } from "../helpers/api";
import { aquecerConexoes, criarAlerta, registrarEntrada } from "../helpers/estoque";
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

function resolver(token: string, id: number | string) {
  return api().patch(`/api/alertas/${id}/resolver`).set(autorizacao(token));
}

describe("GET /api/alertas", () => {
  function listar(token: string, consulta: Record<string, string> = {}) {
    return api().get("/api/alertas").set(autorizacao(token)).query(consulta);
  }

  /** Um alerta aberto, um resolvido por um gestor e um fechado pela reposição do estoque. */
  async function preparar() {
    const { usuario: gestor } = await criarUsuario({ perfil: "GESTOR", nome: "Gestora Ana" });
    const { token } = await criarUsuario({ perfil: "OPERADOR" });
    const pastilha = await criarPastilha({ saldoAtual: 1, estoqueMinimo: 4 });
    const outra = await criarPastilha({ saldoAtual: 9, estoqueMinimo: 4 });
    const aberto = await criarAlerta({
      pastilhaId: pastilha.id,
      dataGeracao: new Date("2026-09-10T10:00:00.000Z"),
    });
    const manual = await criarAlerta({
      pastilhaId: pastilha.id,
      situacao: "RESOLVIDO",
      dataGeracao: new Date("2026-09-05T10:00:00.000Z"),
      dataResolucao: new Date("2026-09-06T10:00:00.000Z"),
      resolvidoPorId: gestor.id,
    });
    const automatico = await criarAlerta({
      pastilhaId: outra.id,
      situacao: "RESOLVIDO",
      dataGeracao: new Date("2026-09-01T10:00:00.000Z"),
      dataResolucao: new Date("2026-09-02T10:00:00.000Z"),
    });
    return { gestor, token, pastilha, aberto, manual, automatico };
  }

  it("sem situação lista só os abertos, com a pastilha e sem responsável", async () => {
    const { token, pastilha, aberto } = await preparar();
    const resposta = await listar(token);
    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual([
      {
        id: aberto.id,
        situacao: "ABERTO",
        dataGeracao: "2026-09-10T10:00:00.000Z",
        dataResolucao: null,
        pastilhaId: pastilha.id,
        resolvidoPorId: null,
        pastilha: { codigo: pastilha.codigo, descricao: pastilha.descricao, saldoAtual: 1, estoqueMinimo: 4 },
        resolvidoPor: null,
      },
    ]);
    const explicita = await listar(token, { situacao: "ABERTO" });
    expect(explicita.body).toEqual(resposta.body);
  });

  it("situacao=RESOLVIDO traz quem resolveu, ou null quando a reposição fechou o alerta", async () => {
    const { gestor, token, manual, automatico } = await preparar();
    const resposta = await listar(token, { situacao: "RESOLVIDO" });
    expect(resposta.status).toBe(200);
    expect(resposta.body.map((alerta: { id: number }) => alerta.id)).toEqual([manual.id, automatico.id]);
    expect(resposta.body[0]).toMatchObject({
      situacao: "RESOLVIDO",
      dataResolucao: "2026-09-06T10:00:00.000Z",
      resolvidoPor: { id: gestor.id, nome: "Gestora Ana" },
    });
    expect(resposta.body[1]).toMatchObject({ dataResolucao: "2026-09-02T10:00:00.000Z", resolvidoPor: null });
    // do responsável saem só id e nome: nada de e-mail, perfil ou senha
    expect(Object.keys(resposta.body[0].resolvidoPor).sort()).toEqual(["id", "nome"]);
    expect(JSON.stringify(resposta.body)).not.toMatch(/senha|email/i);
  });

  it("situacao=TODAS traz abertos e resolvidos, dos mais recentes para os mais antigos", async () => {
    const { token, aberto, manual, automatico } = await preparar();
    const resposta = await listar(token, { situacao: "TODAS" });
    expect(resposta.status).toBe(200);
    expect(resposta.body.map((alerta: { id: number }) => alerta.id)).toEqual([
      aberto.id,
      manual.id,
      automatico.id,
    ]);
  });

  it.each(["aberto", "FECHADO", ""])("recusa situacao=%s com 400", async (situacao) => {
    const { token } = await criarUsuario();
    const resposta = await listar(token, { situacao });
    expect(resposta.status).toBe(400);
    expect(resposta.body.campos[0]).toEqual({
      caminho: "situacao",
      mensagem: "Use a situação ABERTO, RESOLVIDO ou TODAS",
    });
  });

  it("recusa parâmetro desconhecido", async () => {
    const { token } = await criarUsuario();
    const resposta = await listar(token, { pastilhaId: "1" });
    expect(resposta.status).toBe(400);
    expect(resposta.body.campos[0].mensagem).toBe("Campo não permitido: pastilhaId");
  });

  it("qualquer perfil autenticado consulta; sem token é 401", async () => {
    const { token } = await criarUsuario({ perfil: "COMPRADOR" });
    expect((await listar(token)).status).toBe(200);
    expect((await api().get("/api/alertas")).status).toBe(401);
  });
});

describe("PATCH /api/alertas/:id/resolver", () => {
  it("resolve o alerta aberto, grava o responsável e registra na auditoria", async () => {
    const { usuario, token } = await criarUsuario({ perfil: "GESTOR", nome: "Gestor Bruno" });
    const pastilha = await criarPastilha({ saldoAtual: 1, estoqueMinimo: 4 });
    const alerta = await criarAlerta({ pastilhaId: pastilha.id });
    const antes = Date.now();

    const resposta = await resolver(token, alerta.id);
    expect(resposta.status).toBe(200);
    // o contrato devolve o alerta sem os objetos relacionados; pastilha e resolvidoPor vêm na listagem
    expect(Object.keys(resposta.body).sort()).toEqual([
      "dataGeracao",
      "dataResolucao",
      "id",
      "pastilhaId",
      "resolvidoPorId",
      "situacao",
    ]);
    expect(resposta.body).toMatchObject({
      id: alerta.id,
      situacao: "RESOLVIDO",
      pastilhaId: pastilha.id,
      resolvidoPorId: usuario.id,
    });

    const gravado = await prisma.alerta.findUniqueOrThrow({ where: { id: alerta.id } });
    expect(gravado).toMatchObject({ situacao: "RESOLVIDO", resolvidoPorId: usuario.id });
    expect(gravado.dataResolucao!.getTime()).toBeGreaterThanOrEqual(antes);
    expect(resposta.body.dataResolucao).toBe(gravado.dataResolucao!.toISOString());

    const registro = await prisma.auditoria.findFirstOrThrow({ where: { acao: "alerta.resolvido" } });
    expect(registro).toMatchObject({
      usuarioId: usuario.id,
      entidade: "alerta",
      entidadeId: alerta.id,
      antes: { situacao: "ABERTO" },
      depois: { situacao: "RESOLVIDO", resolvidoPorId: usuario.id },
    });

    const lista = await api().get("/api/alertas").set(autorizacao(token)).query({ situacao: "RESOLVIDO" });
    expect(lista.body[0].resolvidoPor).toEqual({ id: usuario.id, nome: "Gestor Bruno" });
  });

  it("alerta já resolvido responde 409 ALERTA_JA_RESOLVIDO e nada muda", async () => {
    const { usuario: primeiro } = await criarUsuario({ perfil: "GESTOR" });
    const { token } = await criarUsuario({ perfil: "ADMINISTRADOR" });
    const pastilha = await criarPastilha();
    const dataResolucao = new Date("2026-09-02T10:00:00.000Z");
    const alerta = await criarAlerta({
      pastilhaId: pastilha.id,
      situacao: "RESOLVIDO",
      dataResolucao,
      resolvidoPorId: primeiro.id,
    });

    const resposta = await resolver(token, alerta.id);
    expect(resposta.status).toBe(409);
    expect(resposta.body).toEqual({ erro: "Este alerta já foi resolvido", codigo: "ALERTA_JA_RESOLVIDO" });
    const gravado = await prisma.alerta.findUniqueOrThrow({ where: { id: alerta.id } });
    expect(gravado).toMatchObject({ resolvidoPorId: primeiro.id, dataResolucao });
    expect(await prisma.auditoria.count()).toBe(0);
  });

  it("alerta fechado pela reposição do estoque também responde 409", async () => {
    const { token } = await criarUsuario({ perfil: "GESTOR" });
    const pastilha = await criarPastilha({ saldoAtual: 5, estoqueMinimo: 5 });
    await movimentar(token, pastilha.id, "SAIDA", 1);
    await movimentar(token, pastilha.id, "ENTRADA", 10);
    const alerta = await prisma.alerta.findFirstOrThrow({ where: { pastilhaId: pastilha.id } });

    const resposta = await resolver(token, alerta.id);
    expect(resposta.status).toBe(409);
    expect(resposta.body.codigo).toBe("ALERTA_JA_RESOLVIDO");
  });

  it("alerta inexistente responde 404 e id inválido responde 400", async () => {
    const { token } = await criarUsuario({ perfil: "GESTOR" });
    const inexistente = await resolver(token, 999);
    expect(inexistente.status).toBe(404);
    expect(inexistente.body).toEqual({ erro: "Registro não encontrado", codigo: "NAO_ENCONTRADO" });
    for (const id of ["abc", "0", "-1", "1.5"]) {
      const resposta = await resolver(token, id);
      expect(resposta.status).toBe(400);
      expect(resposta.body.codigo).toBe("DADOS_INVALIDOS");
    }
  });

  it("OPERADOR e COMPRADOR recebem 403 e o alerta continua aberto", async () => {
    const pastilha = await criarPastilha();
    const alerta = await criarAlerta({ pastilhaId: pastilha.id });
    for (const perfil of ["OPERADOR", "COMPRADOR"] as const) {
      const { token } = await criarUsuario({ perfil });
      const resposta = await resolver(token, alerta.id);
      expect(resposta.status).toBe(403);
      expect(resposta.body).toEqual({ erro: "Acesso negado para este perfil" });
    }
    const gravado = await prisma.alerta.findUniqueOrThrow({ where: { id: alerta.id } });
    expect(gravado).toMatchObject({ situacao: "ABERTO", dataResolucao: null, resolvidoPorId: null });
  });

  it("de duas resoluções simultâneas, uma vence e a outra recebe 409", async () => {
    await aquecerConexoes(4);
    const gestor = await criarUsuario({ perfil: "GESTOR" });
    const admin = await criarUsuario({ perfil: "ADMINISTRADOR" });
    const pastilha = await criarPastilha();
    const alerta = await criarAlerta({ pastilhaId: pastilha.id });

    const respostas = await Promise.all([
      resolver(gestor.token, alerta.id),
      resolver(admin.token, alerta.id),
    ]);

    expect(respostas.map((resposta) => resposta.status).sort()).toEqual([200, 409]);
    const vencedora = respostas.find((resposta) => resposta.status === 200)!;
    const gravado = await prisma.alerta.findUniqueOrThrow({ where: { id: alerta.id } });
    expect(gravado.resolvidoPorId).toBe(vencedora.body.resolvidoPorId);
    expect(await prisma.auditoria.count({ where: { acao: "alerta.resolvido" } })).toBe(1);
  });

  it("resolução manual simultânea à reposição do estoque não perde o responsável", async () => {
    await aquecerConexoes(4);
    const { usuario, token } = await criarUsuario({ perfil: "GESTOR" });
    const fornecedor = await criarFornecedor();
    const pastilha = await criarPastilha({ saldoAtual: 1, estoqueMinimo: 4 });
    const alerta = await criarAlerta({ pastilhaId: pastilha.id });

    const [resolucao, entrada] = await Promise.all([
      resolver(token, alerta.id),
      registrarEntrada(token, pastilha.id, 10, fornecedor.id),
    ]);

    expect(entrada.status).toBe(201);
    const gravado = await prisma.alerta.findUniqueOrThrow({ where: { id: alerta.id } });
    expect(gravado.situacao).toBe("RESOLVIDO");
    if (resolucao.status === 200) {
      // a resolução manual chegou antes: a reposição não reescreve o responsável
      expect(gravado.resolvidoPorId).toBe(usuario.id);
    } else {
      // a reposição fechou o alerta antes: a resolução manual chega tarde
      expect(resolucao.status).toBe(409);
      expect(gravado.resolvidoPorId).toBeNull();
    }
    expect(await prisma.alerta.count({ where: { pastilhaId: pastilha.id, situacao: "ABERTO" } })).toBe(0);
  });
});

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
