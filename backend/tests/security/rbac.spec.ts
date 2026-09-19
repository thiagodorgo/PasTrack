import { PerfilUsuario } from "@prisma/client";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { app } from "../../src/app";
import { Acao, pode } from "../../src/config/permissoes";
import { prisma } from "../../src/config/prisma";
import { rotas } from "../../src/routes";
import { api, autorizacao } from "../helpers/api";
import {
  criarFabricante,
  criarFornecedor,
  criarPastilha,
  criarUsuario,
  SENHA_PADRAO,
} from "../helpers/fabricas";

type Metodo = "get" | "post" | "put" | "patch";
type Ator = PerfilUsuario | "ANONIMO";
type DadosRota = { caminho: string; corpo?: Record<string, unknown> };
type Rota = {
  metodo: Metodo;
  caminho: string;
  acao: Acao | "publica";
  sucesso: number;
  montar: () => Promise<DadosRota>;
};

const PERFIS: PerfilUsuario[] = ["ADMINISTRADOR", "GESTOR", "OPERADOR", "COMPRADOR"];
const ATORES: Ator[] = ["ANONIMO", ...PERFIS];
const fixa = (caminho: string, corpo?: Record<string, unknown>) => async () => ({ caminho, corpo });

/** Cada linha declara a rota, a ação e os dados mínimos para alcançar o controller. */
const ROTAS: Rota[] = [
  { metodo: "get", caminho: "/api/health", acao: "publica", sucesso: 200, montar: fixa("/api/health") },
  {
    metodo: "post",
    caminho: "/api/auth/login",
    acao: "publica",
    sucesso: 200,
    montar: async () => {
      const { usuario } = await criarUsuario();
      return { caminho: "/api/auth/login", corpo: { email: usuario.email, senha: SENHA_PADRAO } };
    },
  },
  { metodo: "get", caminho: "/api/auth/me", acao: "consultar", sucesso: 200, montar: fixa("/api/auth/me") },
  {
    metodo: "patch",
    caminho: "/api/auth/senha",
    acao: "consultar",
    sucesso: 200,
    montar: fixa("/api/auth/senha", {
      senhaAtual: SENHA_PADRAO,
      novaSenha: "NovaSenhaForte2026",
    }),
  },
  {
    metodo: "get",
    caminho: "/api/usuarios",
    acao: "gerenciarUsuarios",
    sucesso: 200,
    montar: fixa("/api/usuarios"),
  },
  {
    metodo: "post",
    caminho: "/api/usuarios",
    acao: "gerenciarUsuarios",
    sucesso: 201,
    montar: fixa("/api/usuarios", { nome: "Novo Usuário", email: "novo@teste.local", perfil: "OPERADOR" }),
  },
  {
    metodo: "put",
    caminho: "/api/usuarios/:id",
    acao: "gerenciarUsuarios",
    sucesso: 200,
    montar: async () => ({
      caminho: "/api/usuarios/" + (await criarUsuario()).usuario.id,
      corpo: { nome: "Nome Atualizado" },
    }),
  },
  {
    metodo: "patch",
    caminho: "/api/usuarios/:id/ativo",
    acao: "gerenciarUsuarios",
    sucesso: 200,
    montar: async () => ({
      caminho: "/api/usuarios/" + (await criarUsuario()).usuario.id + "/ativo",
      corpo: { ativo: false },
    }),
  },
  {
    metodo: "post",
    caminho: "/api/usuarios/:id/redefinir-senha",
    acao: "gerenciarUsuarios",
    sucesso: 200,
    montar: async () => ({
      caminho: "/api/usuarios/" + (await criarUsuario()).usuario.id + "/redefinir-senha",
      corpo: {},
    }),
  },
  {
    metodo: "get",
    caminho: "/api/painel/resumo",
    acao: "consultar",
    sucesso: 200,
    montar: fixa("/api/painel/resumo"),
  },
  {
    metodo: "get",
    caminho: "/api/pastilhas",
    acao: "consultar",
    sucesso: 200,
    montar: fixa("/api/pastilhas"),
  },
  {
    metodo: "get",
    caminho: "/api/pastilhas/:id",
    acao: "consultar",
    sucesso: 200,
    montar: async () => ({ caminho: "/api/pastilhas/" + (await criarPastilha()).id }),
  },
  {
    metodo: "post",
    caminho: "/api/pastilhas",
    acao: "gerenciarPastilhas",
    sucesso: 201,
    montar: async () => ({
      caminho: "/api/pastilhas",
      corpo: { codigo: "PT-NOVA", descricao: "Pastilha Nova", fabricanteId: (await criarFabricante()).id },
    }),
  },
  {
    metodo: "put",
    caminho: "/api/pastilhas/:id",
    acao: "gerenciarPastilhas",
    sucesso: 200,
    montar: async () => ({
      caminho: "/api/pastilhas/" + (await criarPastilha()).id,
      corpo: { descricao: "Descrição Atualizada" },
    }),
  },
  {
    metodo: "get",
    caminho: "/api/fabricantes",
    acao: "consultar",
    sucesso: 200,
    montar: fixa("/api/fabricantes"),
  },
  {
    metodo: "get",
    caminho: "/api/fabricantes/:id",
    acao: "consultar",
    sucesso: 200,
    montar: async () => ({ caminho: "/api/fabricantes/" + (await criarFabricante()).id }),
  },
  {
    metodo: "post",
    caminho: "/api/fabricantes",
    acao: "gerenciarFabricantes",
    sucesso: 201,
    montar: fixa("/api/fabricantes", { nome: "Fabricante Novo" }),
  },
  {
    metodo: "put",
    caminho: "/api/fabricantes/:id",
    acao: "gerenciarFabricantes",
    sucesso: 200,
    montar: async () => ({
      caminho: "/api/fabricantes/" + (await criarFabricante()).id,
      corpo: { nome: "Fabricante Atualizado" },
    }),
  },
  {
    metodo: "get",
    caminho: "/api/fornecedores",
    acao: "consultar",
    sucesso: 200,
    montar: fixa("/api/fornecedores"),
  },
  {
    metodo: "get",
    caminho: "/api/fornecedores/:id",
    acao: "consultar",
    sucesso: 200,
    montar: async () => ({ caminho: "/api/fornecedores/" + (await criarFornecedor()).id }),
  },
  {
    metodo: "post",
    caminho: "/api/fornecedores",
    acao: "gerenciarFornecedores",
    sucesso: 201,
    montar: fixa("/api/fornecedores", { nome: "Fornecedor Novo" }),
  },
  {
    metodo: "put",
    caminho: "/api/fornecedores/:id",
    acao: "gerenciarFornecedores",
    sucesso: 200,
    montar: async () => ({
      caminho: "/api/fornecedores/" + (await criarFornecedor()).id,
      corpo: { nome: "Fornecedor Atualizado" },
    }),
  },
  {
    metodo: "get",
    caminho: "/api/movimentacoes",
    acao: "consultar",
    sucesso: 200,
    montar: fixa("/api/movimentacoes"),
  },
  {
    metodo: "post",
    caminho: "/api/movimentacoes",
    acao: "registrarEntrada",
    sucesso: 201,
    montar: async () => ({
      caminho: "/api/movimentacoes",
      corpo: {
        tipo: "ENTRADA",
        pastilhaId: (await criarPastilha()).id,
        fornecedorId: (await criarFornecedor()).id,
        quantidade: 2,
      },
    }),
  },
  { metodo: "get", caminho: "/api/alertas", acao: "consultar", sucesso: 200, montar: fixa("/api/alertas") },
  {
    metodo: "patch",
    caminho: "/api/alertas/:id/resolver",
    acao: "resolverAlerta",
    sucesso: 200,
    montar: async () => {
      const pastilha = await criarPastilha();
      const alerta = await prisma.alerta.create({ data: { pastilhaId: pastilha.id } });
      return { caminho: "/api/alertas/" + alerta.id + "/resolver" };
    },
  },
];

function chave(metodo: string, caminho: string) {
  return metodo.toUpperCase() + " " + caminho;
}

async function requisitar(rota: Rota, dados: DadosRota, token?: string) {
  const pedido = api()[rota.metodo](dados.caminho);
  if (token) pedido.set(autorizacao(token));
  if (dados.corpo !== undefined) pedido.send(dados.corpo);
  return pedido;
}

function perfisNoContrato(rota: Rota): string {
  if (rota.acao === "publica") return "Público";
  const permitidos = PERFIS.filter((perfil) => pode(perfil, rota.acao as Acao));
  const descricao = permitidos.length === PERFIS.length ? "Todos" : permitidos.join(", ");
  if (rota.caminho !== "/api/movimentacoes" || rota.metodo !== "post") return descricao;
  const saida = PERFIS.filter((perfil) => pode(perfil, "registrarSaida")).join(", ");
  return descricao + " (SAIDA: " + saida + ")";
}

interface Camada {
  regexp: RegExp;
  handle?: { stack?: Camada[] };
  route?: { path: string; methods: Record<string, boolean> };
}

/** Extrai somente montagens literais do Express; uma montagem nova exige revisão deste teste. */
function prefixoDaMontagem(camada: Camada): string {
  const expressao = camada.regexp.source.replace(/\\\//g, "/");
  const sufixo = "/?(?=/|$)";
  if (!expressao.startsWith("^") || !expressao.endsWith(sufixo)) {
    throw new Error("Montagem do router não reconhecida: " + expressao);
  }
  return expressao.slice(1, -sufixo.length);
}

function juntarCaminho(prefixo: string, caminho: string): string {
  return (prefixo + caminho).replace(/\/+/g, "/").replace(/\/$/, "");
}

function listarRotas(camadas: Camada[], prefixo: string): string[] {
  return camadas.flatMap((camada) => {
    if (camada.route) {
      if (typeof camada.route.path !== "string") throw new Error("Caminho de rota não reconhecido.");
      return Object.keys(camada.route.methods)
        .filter((metodo) => camada.route!.methods[metodo])
        .map((metodo) => chave(metodo, juntarCaminho(prefixo, camada.route!.path)));
    }
    if (camada.handle?.stack) {
      return listarRotas(camada.handle.stack, juntarCaminho(prefixo, prefixoDaMontagem(camada)));
    }
    return [];
  });
}

describe("permissões em todas as rotas", () => {
  for (const rota of ROTAS) {
    for (const ator of ATORES) {
      it(chave(rota.metodo, rota.caminho) + " para " + ator, async () => {
        const usuario = ator === "ANONIMO" ? undefined : await criarUsuario({ perfil: ator });
        const dados = await rota.montar();
        const resposta = await requisitar(rota, dados, usuario?.token);
        const esperado =
          rota.acao === "publica"
            ? rota.sucesso
            : ator === "ANONIMO"
              ? 401
              : pode(ator, rota.acao)
                ? rota.sucesso
                : 403;
        expect(resposta.status).toBe(esperado);
      });
    }
  }

  for (const rota of ROTAS.filter(
    (item) => item.acao !== "publica" && item.caminho !== "/api/auth/me" && item.caminho !== "/api/auth/senha"
  )) {
    it(chave(rota.metodo, rota.caminho) + " exige troca da senha temporária", async () => {
      const { token } = await criarUsuario({ perfil: "ADMINISTRADOR", deveTrocarSenha: true });
      const resposta = await requisitar(rota, await rota.montar(), token);
      expect(resposta.status).toBe(403);
      expect(resposta.body.codigo).toBe("TROCA_SENHA_OBRIGATORIA");
    });
  }

  for (const rota of ROTAS.filter(
    (item) => item.caminho === "/api/auth/me" || item.caminho === "/api/auth/senha"
  )) {
    it(chave(rota.metodo, rota.caminho) + " aceita senha temporária", async () => {
      const { token } = await criarUsuario({ perfil: "OPERADOR", deveTrocarSenha: true });
      const resposta = await requisitar(rota, await rota.montar(), token);
      expect(resposta.status).toBe(rota.sucesso);
    });
  }

  it("a tabela corresponde às 26 rotas do contrato e aos perfis da matriz", () => {
    const arquivo = path.resolve(__dirname, "../../../docs/api.md");
    const texto = readFileSync(arquivo, "utf8");
    const inicio = texto.indexOf("## 2. Resumo das rotas");
    const fim = texto.indexOf("\n## 3.", inicio);
    expect(inicio).toBeGreaterThanOrEqual(0);
    expect(fim).toBeGreaterThan(inicio);
    const declaradas = new Map<string, string>();
    for (const linha of texto.slice(inicio, fim).split(/\r?\n/)) {
      const partes = /^\|\s*`(GET|POST|PUT|PATCH|DELETE)`\s*\|\s*`([^`]+)`\s*\|\s*([^|]+)\|$/.exec(
        linha.trim()
      );
      if (!partes) continue;
      const identificador = chave(partes[1], partes[2]);
      expect(declaradas.has(identificador)).toBe(false);
      declaradas.set(identificador, partes[3].trim().replace(/\s+/g, " "));
    }
    const esperadas = ROTAS.map((rota) => chave(rota.metodo, rota.caminho));
    expect(ROTAS).toHaveLength(26);
    expect(new Set(esperadas).size).toBe(26);
    expect([...declaradas.keys()].sort()).toEqual(esperadas.sort());
    for (const rota of ROTAS) {
      expect(declaradas.get(chave(rota.metodo, rota.caminho))).toBe(perfisNoContrato(rota));
    }
  });

  it("a tabela corresponde às rotas montadas no Express", () => {
    const pilha = (app as unknown as { _router: { stack: Camada[] } })._router.stack;
    const montagens = pilha.filter((camada) => camada.handle === rotas);
    expect(montagens).toHaveLength(1);
    const prefixo = prefixoDaMontagem(montagens[0]);
    expect(prefixo).toBe("/api");
    const encontradas = listarRotas(montagens[0].handle!.stack!, prefixo);
    const esperadas = ROTAS.map((rota) => chave(rota.metodo, rota.caminho));
    expect(encontradas.sort()).toEqual(esperadas.sort());
  });
});
