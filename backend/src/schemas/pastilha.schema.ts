import { z } from "zod";
import { idParam } from "./comum.schema";

/** Maior id que cabe no INT4 do banco. Acima disso o Postgres recusa a consulta e a API responderia 500. */
const MAIOR_ID = 2_147_483_647;

/** Texto opcional: vazio ou null grava null; ausente mantém o valor atual. */
const textoOpcional = (maximo: number) =>
  z
    .string()
    .trim()
    .max(maximo)
    .transform((valor) => valor || null)
    .nullish();

const algumCampo = (dados: object) => Object.values(dados).some((valor) => valor !== undefined);

export const pastilhaIdParam = idParam.extend({ id: idParam.shape.id.max(MAIOR_ID) });

/** Campos que o cadastro pode alterar. Código e saldo ficam de fora: o saldo só muda por movimentação. */
const camposEditaveis = {
  descricao: z.string().trim().min(1).max(200),
  modelo: textoOpcional(60),
  aplicacao: textoOpcional(200),
  unidade: z.string().trim().min(1).max(10),
  estoqueMinimo: z.int().min(0).max(1_000_000),
  fabricanteId: z.int().positive().max(MAIOR_ID),
};

export const criarPastilhaSchema = z.strictObject({
  codigo: z.string().trim().min(1).max(40),
  ...camposEditaveis,
  unidade: camposEditaveis.unidade.default("un"),
  estoqueMinimo: camposEditaveis.estoqueMinimo.default(0),
});

export const atualizarPastilhaSchema = z
  .strictObject(camposEditaveis)
  .partial()
  .refine(algumCampo, "Informe ao menos um campo para atualizar");

export const consultaPastilhasSchema = z.strictObject({
  busca: z.string().trim().max(100).optional(),
  criticas: z
    .enum(["true", "false"])
    .transform((valor) => valor === "true")
    .optional(),
});

export type CriarPastilha = z.infer<typeof criarPastilhaSchema>;
export type AtualizarPastilha = z.infer<typeof atualizarPastilhaSchema>;
export type ConsultaPastilhas = z.infer<typeof consultaPastilhasSchema>;
