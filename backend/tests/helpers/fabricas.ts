import { PerfilUsuario } from "@prisma/client";
import bcrypt from "bcryptjs";
import { env } from "../../src/config/env";
import { prisma } from "../../src/config/prisma";
import { gerarToken } from "../../src/services/auth.service";

let sequencia = 0;
const proximo = () => ++sequencia;

export const SENHA_PADRAO = "SenhaForte123";

interface DadosUsuario {
  nome?: string;
  email?: string;
  senha?: string;
  perfil?: PerfilUsuario;
  ativo?: boolean;
  deveTrocarSenha?: boolean;
}

export async function criarUsuario(dados: DadosUsuario = {}) {
  const n = proximo();
  const senha = dados.senha ?? SENHA_PADRAO;
  const usuario = await prisma.usuario.create({
    data: {
      nome: dados.nome ?? `Usuário ${n}`,
      email: dados.email ?? `usuario${n}@teste.local`,
      senhaHash: await bcrypt.hash(senha, env.BCRYPT_CUSTO),
      perfil: dados.perfil ?? "OPERADOR",
      ativo: dados.ativo ?? true,
      deveTrocarSenha: dados.deveTrocarSenha ?? false,
    },
  });
  return { usuario, senha, token: gerarToken(usuario) };
}

export function criarFabricante(nome?: string) {
  return prisma.fabricante.create({ data: { nome: nome ?? `Fabricante ${proximo()}` } });
}

export function criarFornecedor(nome?: string) {
  return prisma.fornecedor.create({ data: { nome: nome ?? `Fornecedor ${proximo()}` } });
}

interface DadosPastilha {
  codigo?: string;
  descricao?: string;
  saldoAtual?: number;
  estoqueMinimo?: number;
  unidade?: string;
  fabricanteId?: number;
}

export async function criarPastilha(dados: DadosPastilha = {}) {
  const fabricanteId = dados.fabricanteId ?? (await criarFabricante()).id;
  const n = proximo();
  return prisma.pastilha.create({
    data: {
      codigo: dados.codigo ?? `PT-${n}`,
      descricao: dados.descricao ?? `Pastilha ${n}`,
      unidade: dados.unidade ?? "un",
      estoqueMinimo: dados.estoqueMinimo ?? 0,
      saldoAtual: dados.saldoAtual ?? 0,
      fabricanteId,
    },
  });
}
