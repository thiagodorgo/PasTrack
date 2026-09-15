import { beforeEach, describe, expect, it } from "vitest";
import { codigoDoErro } from "../../src/services/api";
import {
  atualizarUsuario,
  criarUsuario,
  definirAtivo,
  listarUsuarios,
  redefinirSenha,
} from "../../src/services/usuarios";
import { usuarioAdmin, usuarioGestor } from "../mocks/handlers/auth";
import { SENHA_TEMPORARIA, usuariosGerenciados } from "../mocks/handlers/usuarios";
import { capturarErro } from "../utils/requisicoes";
import { iniciarSessao } from "../utils/sessao";

describe("serviço de usuários", () => {
  beforeEach(() => {
    iniciarSessao(usuarioAdmin);
  });

  it("lista os usuários com a situação de cada um", async () => {
    const lista = await listarUsuarios();

    expect(lista).toHaveLength(usuariosGerenciados.length);
    expect(lista.find((usuario) => usuario.id === 6)?.ativo).toBe(false);
  });

  it("só o ADMINISTRADOR acessa: o GESTOR recebe 403", async () => {
    iniciarSessao(usuarioGestor);

    const erro = await capturarErro(listarUsuarios());

    expect(erro).toMatchObject({ response: { status: 403 } });
  });

  it("cria um usuário e recebe a senha temporária uma única vez", async () => {
    const criado = await criarUsuario({
      nome: "Rita Gomes",
      email: "rita@pastrack.com",
      perfil: "COMPRADOR",
    });

    expect(criado).toMatchObject({
      nome: "Rita Gomes",
      ativo: true,
      deveTrocarSenha: true,
      senhaTemporaria: SENHA_TEMPORARIA,
    });
    const naLista = (await listarUsuarios()).find((usuario) => usuario.email === "rita@pastrack.com");
    expect(naLista).toBeDefined();
    expect(naLista).not.toHaveProperty("senhaTemporaria");
  });

  it("um e-mail já cadastrado responde 409 DUPLICADO", async () => {
    const erro = await capturarErro(
      criarUsuario({ nome: "Outra Maria", email: usuarioGestor.email, perfil: "OPERADOR" })
    );

    expect(codigoDoErro(erro)).toBe("DUPLICADO");
  });

  it("atualiza o nome e o perfil", async () => {
    const atualizado = await atualizarUsuario(3, { nome: "Carlos A. Lima", perfil: "GESTOR" });

    expect(atualizado).toMatchObject({ id: 3, nome: "Carlos A. Lima", perfil: "GESTOR" });
  });

  it("desativa e reativa um usuário", async () => {
    expect((await definirAtivo(3, false)).ativo).toBe(false);
    expect((await definirAtivo(3, true)).ativo).toBe(true);
  });

  it("ninguém desativa a si mesmo: 409", async () => {
    const erro = await capturarErro(definirAtivo(usuarioAdmin.id, false));

    expect(erro).toMatchObject({ response: { status: 409 } });
  });

  it("redefinir a senha devolve a senha temporária e exige nova troca", async () => {
    expect(await redefinirSenha(2)).toBe(SENHA_TEMPORARIA);

    const redefinido = (await listarUsuarios()).find((usuario) => usuario.id === 2);
    expect(redefinido?.deveTrocarSenha).toBe(true);
  });
});
