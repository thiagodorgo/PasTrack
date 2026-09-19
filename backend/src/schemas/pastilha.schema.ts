import { z } from "zod";
import { ID_MAXIMO, objetoEstrito, texto } from "./comum.schema";

/** Texto opcional: vazio ou null grava null; ausente mantém o valor atual. */
const textoOpcional = (maximo: number) =>
  texto()
    .max(maximo)
    .transform((valor) => valor || null)
    .nullish();

const algumCampo = (dados: object) => Object.values(dados).some((valor) => valor !== undefined);

/** Campos que o cadastro pode alterar. Código e saldo ficam de fora: o saldo só muda por movimentação. */
const camposEditaveis = {
  descricao: texto().min(1).max(200),
  modelo: textoOpcional(60),
  aplicacao: textoOpcional(200),
  unidade: texto().min(1).max(10),
  estoqueMinimo: z.int().min(0).max(1_000_000),
  fabricanteId: z.int().positive().max(ID_MAXIMO),
};

export const criarPastilhaSchema = objetoEstrito({
  // gravado em maiúsculas: "cnmg 120408" e "CNMG 120408" são o mesmo código
  codigo: texto().toUpperCase().min(1).max(40),
  ...camposEditaveis,
  unidade: camposEditaveis.unidade.default("un"),
  estoqueMinimo: camposEditaveis.estoqueMinimo.default(0),
});

export const atualizarPastilhaSchema = objetoEstrito(camposEditaveis)
  .partial()
  .refine(algumCampo, "Informe ao menos um campo para atualizar");

export const consultaPastilhasSchema = objetoEstrito({
  busca: texto().max(100).optional(),
  criticas: z
    .enum(["true", "false"])
    .transform((valor) => valor === "true")
    .optional(),
});

export type CriarPastilha = z.infer<typeof criarPastilhaSchema>;
export type AtualizarPastilha = z.infer<typeof atualizarPastilhaSchema>;
export type ConsultaPastilhas = z.infer<typeof consultaPastilhasSchema>;
