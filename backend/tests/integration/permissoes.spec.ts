import { describe, expect, it } from "vitest";
import { prisma } from "../../src/config/prisma";
import { api, autorizacao } from "../helpers/api";
import { criarFabricante, criarFornecedor, criarPastilha, criarUsuario } from "../helpers/fabricas";

describe("permissões por perfil nas rotas", () => {
  it("OPERADOR não cadastra pastilha", async () => {
    const { token } = await criarUsuario({ perfil: "OPERADOR" });
    const fabricante = await criarFabricante();
    const resposta = await api()
      .post("/api/pastilhas")
      .set(autorizacao(token))
      .send({ codigo: "X1", descricao: "Teste", fabricanteId: fabricante.id });
    expect(resposta.status).toBe(403);
  });

  it("GESTOR cadastra fabricante e pastilha", async () => {
    const { token } = await criarUsuario({ perfil: "GESTOR" });
    const fabricante = await api()
      .post("/api/fabricantes")
      .set(autorizacao(token))
      .send({ nome: "Kennametal" });
    expect(fabricante.status).toBe(201);
    const pastilha = await api()
      .post("/api/pastilhas")
      .set(autorizacao(token))
      .send({ codigo: "X2", descricao: "Teste", fabricanteId: fabricante.body.id });
    expect(pastilha.status).toBe(201);
  });

  it("COMPRADOR cadastra fornecedor e OPERADOR não", async () => {
    const comprador = await criarUsuario({ perfil: "COMPRADOR" });
    const operador = await criarUsuario({ perfil: "OPERADOR" });
    const permitido = await api()
      .post("/api/fornecedores")
      .set(autorizacao(comprador.token))
      .send({ nome: "Fornecedor A" });
    const negado = await api()
      .post("/api/fornecedores")
      .set(autorizacao(operador.token))
      .send({ nome: "Fornecedor B" });
    expect(permitido.status).toBe(201);
    expect(negado.status).toBe(403);
  });

  it("COMPRADOR registra entrada, mas não registra saída", async () => {
    const { token } = await criarUsuario({ perfil: "COMPRADOR" });
    const pastilha = await criarPastilha({ saldoAtual: 5 });
    const fornecedor = await criarFornecedor();
    const entrada = await api()
      .post("/api/movimentacoes")
      .set(autorizacao(token))
      .send({ tipo: "ENTRADA", pastilhaId: pastilha.id, quantidade: 3, fornecedorId: fornecedor.id });
    expect(entrada.status).toBe(201);
    expect(entrada.body.saldoAtual).toBe(8);

    const saida = await api()
      .post("/api/movimentacoes")
      .set(autorizacao(token))
      .send({ tipo: "SAIDA", pastilhaId: pastilha.id, quantidade: 1 });
    expect(saida.status).toBe(403);
    expect(saida.body).toEqual({ erro: "Seu perfil só pode registrar entradas" });
    const depois = await prisma.pastilha.findUniqueOrThrow({ where: { id: pastilha.id } });
    expect(depois.saldoAtual).toBe(8);
  });

  it("OPERADOR não resolve alerta", async () => {
    const { token } = await criarUsuario({ perfil: "OPERADOR" });
    const pastilha = await criarPastilha();
    const alerta = await prisma.alerta.create({ data: { pastilhaId: pastilha.id } });
    const resposta = await api().patch(`/api/alertas/${alerta.id}/resolver`).set(autorizacao(token));
    expect(resposta.status).toBe(403);
  });

  it("só ADMINISTRADOR passa pela porta de /api/usuarios", async () => {
    const gestor = await criarUsuario({ perfil: "GESTOR" });
    const admin = await criarUsuario({ perfil: "ADMINISTRADOR" });
    const negado = await api().get("/api/usuarios").set(autorizacao(gestor.token));
    const liberado = await api().get("/api/usuarios").set(autorizacao(admin.token));
    expect(negado.status).toBe(403);
    expect(liberado.status).not.toBe(403);
  });
});
