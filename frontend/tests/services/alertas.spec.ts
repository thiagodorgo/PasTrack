import { describe, expect, it } from "vitest";
import { codigoDoErro } from "../../src/services/api";
import { listarAlertas, resolverAlerta } from "../../src/services/alertas";
import { usuarioGestor, usuarioOperador } from "../mocks/handlers/auth";
import { capturarErro, capturarUrls } from "../utils/requisicoes";
import { iniciarSessao } from "../utils/sessao";

describe("serviço de alertas", () => {
  it("sem filtro, pede e recebe só os alertas abertos", async () => {
    const urls = capturarUrls("*/api/alertas");

    const lista = await listarAlertas();

    expect(urls[0].searchParams.get("situacao")).toBe("ABERTO");
    expect(lista.map((alerta) => alerta.id)).toEqual([3, 2]);
    expect(lista.every((alerta) => alerta.resolvidoPor === null && alerta.dataResolucao === null)).toBe(true);
  });

  it("filtra os resolvidos, com a data e quem resolveu", async () => {
    const lista = await listarAlertas("RESOLVIDO");

    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({
      situacao: "RESOLVIDO",
      dataResolucao: "2026-09-02T15:30:00.000Z",
      resolvidoPor: { id: usuarioGestor.id, nome: usuarioGestor.nome },
    });
  });

  it("TODAS traz abertos e resolvidos", async () => {
    expect(await listarAlertas("TODAS")).toHaveLength(3);
  });

  it("o GESTOR resolve um alerta aberto, que sai da lista de abertos", async () => {
    iniciarSessao(usuarioGestor);

    const resolvido = await resolverAlerta(3);

    expect(resolvido).toMatchObject({ id: 3, situacao: "RESOLVIDO" });
    expect(resolvido.dataResolucao).not.toBeNull();
    expect(resolvido).not.toHaveProperty("pastilha");
    expect((await listarAlertas()).map((alerta) => alerta.id)).toEqual([2]);
    const [agoraResolvido] = (await listarAlertas("RESOLVIDO")).filter((alerta) => alerta.id === 3);
    expect(agoraResolvido.resolvidoPor).toEqual({ id: usuarioGestor.id, nome: usuarioGestor.nome });
  });

  it("resolver um alerta já resolvido responde 409 ALERTA_JA_RESOLVIDO", async () => {
    iniciarSessao(usuarioGestor);

    const erro = await capturarErro(resolverAlerta(1));

    expect(erro).toMatchObject({ response: { status: 409 } });
    expect(codigoDoErro(erro)).toBe("ALERTA_JA_RESOLVIDO");
  });

  it("o OPERADOR não resolve alertas", async () => {
    iniciarSessao(usuarioOperador);

    const erro = await capturarErro(resolverAlerta(3));

    expect(erro).toMatchObject({ response: { status: 403 } });
  });
});
