import { StatusAlerta, TipoMovimentacao } from "@prisma/client";
import { prisma } from "../../src/config/prisma";
import { api, autorizacao } from "./api";
import { criarFornecedor } from "./fabricas";

/** POST /api/movimentacoes com o corpo exatamente como informado. */
export function registrarMovimentacao(token: string, corpo: Record<string, unknown>) {
  return api().post("/api/movimentacoes").set(autorizacao(token)).send(corpo);
}

/** ENTRADA pela API. Sem fornecedor informado, cria um para a entrada ser válida. */
export async function registrarEntrada(
  token: string,
  pastilhaId: number,
  quantidade: number,
  fornecedorId?: number
) {
  const fornecedor = fornecedorId ?? (await criarFornecedor()).id;
  return registrarMovimentacao(token, { tipo: "ENTRADA", pastilhaId, quantidade, fornecedorId: fornecedor });
}

/** SAÍDA pela API. */
export function registrarSaida(token: string, pastilhaId: number, quantidade: number) {
  return registrarMovimentacao(token, { tipo: "SAIDA", pastilhaId, quantidade });
}

export interface DadosMovimentacao {
  pastilhaId: number;
  usuarioId: number;
  tipo?: TipoMovimentacao;
  quantidade?: number;
  fornecedorId?: number | null;
  dataHora?: Date;
}

/** Grava movimentações direto no banco, sem mexer no saldo. Serve para montar históricos. */
export async function criarMovimentacoes(lista: DadosMovimentacao[]) {
  await prisma.movimentacao.createMany({
    data: lista.map((dados) => ({
      tipo: dados.tipo ?? "SAIDA",
      quantidade: dados.quantidade ?? 1,
      pastilhaId: dados.pastilhaId,
      usuarioId: dados.usuarioId,
      fornecedorId: dados.fornecedorId ?? null,
      dataHora: dados.dataHora,
    })),
  });
}

export interface DadosAlerta {
  pastilhaId: number;
  situacao?: StatusAlerta;
  dataGeracao?: Date;
  dataResolucao?: Date | null;
  resolvidoPorId?: number | null;
}

/** Grava um alerta direto no banco. O alerta RESOLVIDO sem data informada ganha a data atual. */
export function criarAlerta(dados: DadosAlerta) {
  const situacao = dados.situacao ?? "ABERTO";
  return prisma.alerta.create({
    data: {
      pastilhaId: dados.pastilhaId,
      situacao,
      dataGeracao: dados.dataGeracao,
      dataResolucao: dados.dataResolucao ?? (situacao === "RESOLVIDO" ? new Date() : null),
      resolvidoPorId: dados.resolvidoPorId ?? null,
    },
  });
}

/**
 * Abre de antemão as conexões que as requisições simultâneas vão usar. Abrir uma conexão pode
 * levar segundos em algumas máquinas (no Windows, com "localhost" na URL, cada conexão nova levou
 * cerca de 2 s; com 127.0.0.1, milissegundos), e o Prisma espera só 2 s para iniciar uma
 * transação. Os testes de concorrência verificam a regra de negócio, não a latência de conexão.
 */
export async function aquecerConexoes(quantidade: number) {
  await Promise.all(Array.from({ length: quantidade }, () => prisma.$executeRaw`SELECT pg_sleep(0.05)`));
}
