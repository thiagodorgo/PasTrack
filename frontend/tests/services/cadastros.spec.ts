import { beforeEach, describe, expect, it } from "vitest";
import { camposDoErro, codigoDoErro } from "../../src/services/api";
import {
  atualizarFabricante,
  atualizarFornecedor,
  buscarFabricante,
  buscarFornecedor,
  criarFabricante,
  criarFornecedor,
  listarFabricantes,
  listarFornecedores,
} from "../../src/services/cadastros";
import { usuarioComprador, usuarioGestor } from "../mocks/handlers/auth";
import { fornecedores } from "../mocks/handlers/fornecedores";
import { capturarErro } from "../utils/requisicoes";
import { iniciarSessao } from "../utils/sessao";

describe("serviço de fabricantes", () => {
  beforeEach(() => {
    iniciarSessao(usuarioGestor);
  });

  it("lista os fabricantes em ordem alfabética", async () => {
    expect((await listarFabricantes()).map((f) => f.nome)).toEqual(["Iscar", "Sandvik Coromant"]);
  });

  it("busca um fabricante pelo id", async () => {
    expect(await buscarFabricante(2)).toEqual({ id: 2, nome: "Iscar" });
  });

  it("cria um fabricante, que passa a aparecer na lista", async () => {
    const criado = await criarFabricante({ nome: "Kennametal" });

    expect(criado).toEqual({ id: 3, nome: "Kennametal" });
    expect((await listarFabricantes()).map((f) => f.nome)).toContain("Kennametal");
  });

  it("atualiza o nome do fabricante", async () => {
    expect(await atualizarFabricante(1, { nome: "Sandvik" })).toEqual({ id: 1, nome: "Sandvik" });
  });

  it("um nome já cadastrado responde 409 DUPLICADO", async () => {
    const erro = await capturarErro(criarFabricante({ nome: "iscar" }));

    expect(erro).toMatchObject({ response: { status: 409 } });
    expect(codigoDoErro(erro)).toBe("DUPLICADO");
  });

  it("o COMPRADOR não gerencia fabricantes", async () => {
    iniciarSessao(usuarioComprador);

    const erro = await capturarErro(criarFabricante({ nome: "Walter" }));

    expect(erro).toMatchObject({ response: { status: 403 } });
  });
});

describe("serviço de fornecedores", () => {
  beforeEach(() => {
    iniciarSessao(usuarioComprador);
  });

  it("lista e busca fornecedores", async () => {
    expect(await listarFornecedores()).toHaveLength(fornecedores.length);
    expect(await buscarFornecedor(1)).toEqual(fornecedores[0]);
  });

  it("cria com CNPJ sem máscara e recebe o CNPJ formatado", async () => {
    const criado = await criarFornecedor({
      nome: "Usinagem Norte",
      cnpj: "11444777000161",
      contato: "compras@norte.com",
    });

    expect(criado).toMatchObject({ id: 3, nome: "Usinagem Norte", cnpj: "11.444.777/0001-61" });
  });

  it("um CNPJ com dígito verificador errado responde 400 com o erro no campo cnpj", async () => {
    const erro = await capturarErro(criarFornecedor({ nome: "Fornecedor X", cnpj: "11.444.777/0001-62" }));

    expect(codigoDoErro(erro)).toBe("DADOS_INVALIDOS");
    expect(camposDoErro(erro)).toEqual({ cnpj: "CNPJ inválido" });
  });

  it("um CNPJ já cadastrado responde 409 DUPLICADO", async () => {
    const erro = await capturarErro(criarFornecedor({ nome: "Outro", cnpj: "11222333000181" }));

    expect(codigoDoErro(erro)).toBe("DUPLICADO");
  });

  it("atualiza o contato e mantém o CNPJ que não foi enviado", async () => {
    const atualizado = await atualizarFornecedor(2, {
      nome: fornecedores[1].nome,
      contato: "(47) 3000-0000",
    });

    expect(atualizado).toEqual({ ...fornecedores[1], contato: "(47) 3000-0000" });
  });
});
