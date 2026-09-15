import { beforeEach, describe, expect, it } from "vitest";
import { camposDoErro, mensagemDeErro } from "../../src/services/api";
import {
  listarMovimentacoes,
  listarMovimentacoesPaginadas,
  type NovaMovimentacao,
  registrarMovimentacao,
} from "../../src/services/movimentacoes";
import { usuarioComprador } from "../mocks/handlers/auth";
import { movimentacoes } from "../mocks/handlers/movimentacoes";
import { capturarErro, capturarUrls } from "../utils/requisicoes";
import { iniciarSessao } from "../utils/sessao";

describe("serviço de movimentações", () => {
  beforeEach(() => {
    iniciarSessao();
  });

  it("sem filtros, lista o histórico sem enviar parâmetros", async () => {
    const urls = capturarUrls("*/api/movimentacoes");

    expect(await listarMovimentacoes()).toEqual(movimentacoes);
    expect(urls[0].search).toBe("");
  });

  it("envia só os filtros informados", async () => {
    const urls = capturarUrls("*/api/movimentacoes");

    const lista = await listarMovimentacoes({
      pastilhaId: 1,
      tipo: "ENTRADA",
      de: "2026-09-01T00:00:00.000Z",
    });

    expect(Object.fromEntries(urls[0].searchParams)).toEqual({
      pastilhaId: "1",
      tipo: "ENTRADA",
      de: "2026-09-01T00:00:00.000Z",
    });
    expect(lista.map((m) => m.id)).toEqual([1]);
  });

  it("com página, devolve os dados da página e o total", async () => {
    const pagina = await listarMovimentacoesPaginadas({ pagina: 2, tamanho: 1 });

    expect(pagina).toMatchObject({ total: movimentacoes.length, pagina: 2, tamanho: 1 });
    expect(pagina.dados.map((m) => m.id)).toEqual([movimentacoes[1].id]);
  });

  it("registra uma ENTRADA com fornecedor e devolve o saldo atualizado", async () => {
    const resultado = await registrarMovimentacao({
      tipo: "ENTRADA",
      pastilhaId: 2,
      quantidade: 10,
      fornecedorId: 1,
      observacao: "Reposição do mês",
    });

    expect(resultado.saldoAtual).toBe(14);
    expect(resultado.movimentacao).toMatchObject({
      tipo: "ENTRADA",
      pastilhaId: 2,
      fornecedorId: 1,
      observacao: "Reposição do mês",
    });
  });

  it("a ENTRADA sem fornecedor volta com o erro no campo fornecedorId", async () => {
    const semFornecedor = { tipo: "ENTRADA", pastilhaId: 2, quantidade: 1 } as unknown as NovaMovimentacao;

    const erro = await capturarErro(registrarMovimentacao(semFornecedor));

    expect(camposDoErro(erro)).toHaveProperty("fornecedorId");
  });

  it("o COMPRADOR não registra SAIDA", async () => {
    iniciarSessao(usuarioComprador);

    const erro = await capturarErro(registrarMovimentacao({ tipo: "SAIDA", pastilhaId: 1, quantidade: 1 }));

    expect(erro).toMatchObject({ response: { status: 403 } });
    expect(mensagemDeErro(erro)).toBe("Seu perfil só pode registrar entradas");
  });
});
