import { http, HttpResponse } from "msw";
import type { AtualizacaoUsuario, NovoUsuario } from "../../../src/services/usuarios";
import type { UsuarioCriado, UsuarioGerenciado } from "../../../src/types";
import { ehPerfil } from "../../../src/utils/permissoes";
import {
  proximoId,
  recusarAcesso,
  responderDadosInvalidos,
  responderErro,
  usuarioDaRequisicao,
} from "../acesso";
import { usuariosDeExemplo } from "./auth";

/** Senha temporária devolvida pela criação e pela redefinição simuladas. */
export const SENHA_TEMPORARIA = "Provisoria3q8w1z";

/** Usuários da gestão: as contas de exemplo, ativas, e um operador desativado. */
export const usuariosGerenciados: UsuarioGerenciado[] = [
  ...usuariosDeExemplo.map((usuario) => ({ ...usuario, ativo: true })),
  {
    id: 6,
    nome: "Pedro Alves",
    email: "pedro@pastrack.com",
    perfil: "OPERADOR",
    ativo: false,
    deveTrocarSenha: false,
  },
];

// cópia alterável: as mudanças valem até o fim do teste (setup.ts reinicia depois de cada um)
let registros: UsuarioGerenciado[] = [];

export function reiniciarUsuarios() {
  registros = usuariosGerenciados.map((usuario) => ({ ...usuario }));
}
reiniciarUsuarios();

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const naoEncontrado = () => responderErro(404, { erro: "Usuário não encontrado", codigo: "NAO_ENCONTRADO" });

function ultimoAdministradorAtivo(usuario: UsuarioGerenciado) {
  const ativos = registros.filter(({ perfil, ativo }) => perfil === "ADMINISTRADOR" && ativo);
  return usuario.perfil === "ADMINISTRADOR" && usuario.ativo && ativos.length === 1;
}

function ehOProprio(request: Request, usuario: UsuarioGerenciado) {
  return usuarioDaRequisicao(request)?.id === usuario.id;
}

export const usuariosHandlers = [
  http.get("*/api/usuarios", ({ request }) => {
    const recusa = recusarAcesso(request, "gerenciarUsuarios");
    if (recusa) return recusa;
    return HttpResponse.json(registros);
  }),

  http.post("*/api/usuarios", async ({ request }) => {
    const recusa = recusarAcesso(request, "gerenciarUsuarios");
    if (recusa) return recusa;
    const { nome, email, perfil } = (await request.json()) as Partial<NovoUsuario>;
    const nomeAparado = nome?.trim() ?? "";
    const emailNormalizado = email?.trim().toLowerCase() ?? "";
    if (!nomeAparado || !EMAIL_VALIDO.test(emailNormalizado) || !ehPerfil(perfil)) {
      const campos: Record<string, string> = {};
      if (!nomeAparado) campos.nome = "Informe o nome";
      if (!EMAIL_VALIDO.test(emailNormalizado)) campos.email = "Informe um e-mail válido";
      if (!ehPerfil(perfil)) campos.perfil = "Informe um perfil válido";
      return responderDadosInvalidos(campos);
    }
    if (registros.some((usuario) => usuario.email === emailNormalizado)) {
      return responderErro(409, { erro: "Já existe um usuário com este e-mail", codigo: "DUPLICADO" });
    }
    const criado: UsuarioGerenciado = {
      id: proximoId(registros),
      nome: nomeAparado,
      email: emailNormalizado,
      perfil,
      ativo: true,
      deveTrocarSenha: true,
    };
    registros.push(criado);
    const resposta: UsuarioCriado = { ...criado, senhaTemporaria: SENHA_TEMPORARIA };
    return HttpResponse.json(resposta, { status: 201 });
  }),

  http.put("*/api/usuarios/:id", async ({ request, params }) => {
    const recusa = recusarAcesso(request, "gerenciarUsuarios");
    if (recusa) return recusa;
    const usuario = registros.find(({ id }) => id === Number(params.id));
    if (!usuario) return naoEncontrado();
    const { nome, perfil } = (await request.json()) as AtualizacaoUsuario;
    const campos: Record<string, string> = {};
    if (nome !== undefined && !nome.trim()) campos.nome = "Informe o nome";
    if (perfil !== undefined && !ehPerfil(perfil)) campos.perfil = "Informe um perfil válido";
    if (Object.keys(campos).length > 0) return responderDadosInvalidos(campos);

    const rebaixa = perfil !== undefined && perfil !== "ADMINISTRADOR" && usuario.perfil === "ADMINISTRADOR";
    if (rebaixa && ehOProprio(request, usuario)) {
      return responderErro(409, { erro: "Você não pode rebaixar o seu próprio perfil" });
    }
    if (rebaixa && ultimoAdministradorAtivo(usuario)) {
      return responderErro(409, { erro: "Não é possível rebaixar o último administrador ativo" });
    }
    if (nome !== undefined) usuario.nome = nome.trim();
    if (perfil !== undefined) usuario.perfil = perfil;
    return HttpResponse.json(usuario);
  }),

  http.patch("*/api/usuarios/:id/ativo", async ({ request, params }) => {
    const recusa = recusarAcesso(request, "gerenciarUsuarios");
    if (recusa) return recusa;
    const usuario = registros.find(({ id }) => id === Number(params.id));
    if (!usuario) return naoEncontrado();
    const { ativo } = (await request.json()) as { ativo?: unknown };
    if (typeof ativo !== "boolean") return responderDadosInvalidos({ ativo: "Informe verdadeiro ou falso" });
    if (!ativo && ehOProprio(request, usuario)) {
      return responderErro(409, { erro: "Você não pode desativar a si mesmo" });
    }
    if (!ativo && ultimoAdministradorAtivo(usuario)) {
      return responderErro(409, { erro: "Não é possível desativar o último administrador ativo" });
    }
    usuario.ativo = ativo;
    return HttpResponse.json(usuario);
  }),

  http.post("*/api/usuarios/:id/redefinir-senha", ({ request, params }) => {
    const recusa = recusarAcesso(request, "gerenciarUsuarios");
    if (recusa) return recusa;
    const usuario = registros.find(({ id }) => id === Number(params.id));
    if (!usuario) return naoEncontrado();
    usuario.deveTrocarSenha = true;
    return HttpResponse.json({ senhaTemporaria: SENHA_TEMPORARIA });
  }),
];
