import { http, HttpResponse } from "msw";
import type { Usuario } from "../../../src/types";
import { problemasDaSenha } from "../../../src/utils/senha";
import { criarTokenValido } from "../../utils/jwt";
import { responderDadosInvalidos, responderErro, usuarioDaRequisicao } from "../acesso";

export const usuarioAdmin: Usuario = {
  id: 1,
  nome: "Administrador",
  email: "admin@pastrack.com",
  perfil: "ADMINISTRADOR",
  deveTrocarSenha: false,
};

export const usuarioGestor: Usuario = {
  id: 2,
  nome: "Maria Souza",
  email: "maria@pastrack.com",
  perfil: "GESTOR",
  deveTrocarSenha: false,
};

export const usuarioOperador: Usuario = {
  id: 3,
  nome: "Carlos Lima",
  email: "carlos@pastrack.com",
  perfil: "OPERADOR",
  deveTrocarSenha: false,
};

export const usuarioComprador: Usuario = {
  id: 4,
  nome: "Ana Prado",
  email: "ana@pastrack.com",
  perfil: "COMPRADOR",
  deveTrocarSenha: false,
};

/** Usuário recém-criado, que ainda entra com a senha temporária. */
export const usuarioComSenhaTemporaria: Usuario = {
  id: 5,
  nome: "João Pereira",
  email: "joao@pastrack.com",
  perfil: "OPERADOR",
  deveTrocarSenha: true,
};

export const credenciaisValidas = { email: usuarioAdmin.email, senha: "senha-correta" };
export const credenciaisTemporarias = { email: usuarioComSenhaTemporaria.email, senha: "Provisoria7k2m9x" };

// contas aceitas pelo login simulado; quem não tem senha temporária usa a senha das credenciais válidas
const contas = [
  { usuario: usuarioAdmin, senha: credenciaisValidas.senha },
  { usuario: usuarioGestor, senha: credenciaisValidas.senha },
  { usuario: usuarioOperador, senha: credenciaisValidas.senha },
  { usuario: usuarioComprador, senha: credenciaisValidas.senha },
  { usuario: usuarioComSenhaTemporaria, senha: credenciaisTemporarias.senha },
];

/** Usuários com conta no login simulado: um de cada perfil e um com a senha temporária. */
export const usuariosDeExemplo: Usuario[] = contas.map(({ usuario }) => usuario);

function contaDaRequisicao(request: Request) {
  const doToken = usuarioDaRequisicao(request);
  return doToken ? contas.find(({ usuario }) => usuario.id === doToken.id) : undefined;
}

export const authHandlers = [
  http.post("*/api/auth/login", async ({ request }) => {
    const { email, senha } = (await request.json()) as { email?: string; senha?: string };
    if (!email || !senha) {
      return responderErro(400, { erro: "Informe e-mail e senha" });
    }
    const emailNormalizado = email.trim().toLowerCase();
    const conta = contas.find(({ usuario }) => usuario.email === emailNormalizado);
    if (!conta || conta.senha !== senha) {
      return responderErro(401, { erro: "E-mail ou senha inválidos" });
    }
    return HttpResponse.json({ token: criarTokenValido(conta.usuario), usuario: conta.usuario });
  }),

  http.get("*/api/auth/me", ({ request }) => {
    const conta = contaDaRequisicao(request);
    if (!conta) {
      return responderErro(401, { erro: "Token inválido ou expirado" });
    }
    return HttpResponse.json(conta.usuario);
  }),

  // valida como a API, mas não guarda a senha nova: só devolve um token novo
  http.patch("*/api/auth/senha", async ({ request }) => {
    const conta = contaDaRequisicao(request);
    if (!conta) {
      return responderErro(401, { erro: "Token inválido ou expirado" });
    }
    const { senhaAtual, novaSenha = "" } = (await request.json()) as {
      senhaAtual?: string;
      novaSenha?: string;
    };
    if (senhaAtual !== conta.senha) {
      return responderErro(400, {
        erro: "Senha atual incorreta",
        codigo: "SENHA_ATUAL_INCORRETA",
        campos: [{ caminho: "senhaAtual", mensagem: "Senha atual incorreta" }],
      });
    }
    const problemas = problemasDaSenha(novaSenha);
    const parteDoEmail = conta.usuario.email.split("@")[0];
    if (novaSenha.toLowerCase().includes(parteDoEmail)) problemas.push("não use o seu e-mail na senha");
    if (problemas.length > 0) {
      return responderDadosInvalidos({ novaSenha: problemas.join("; ") });
    }
    return HttpResponse.json({ token: criarTokenValido(conta.usuario) });
  }),
];
