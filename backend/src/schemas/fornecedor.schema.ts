import { z } from "zod";
import { formatarCnpj, validarCnpj } from "../utils/cnpj";
import { idParam } from "./comum.schema";

/** Id limitado ao INT4 do banco. Acima disso o Postgres recusa a consulta e a API responderia 500. */
export const fornecedorIdParam = idParam.extend({ id: idParam.shape.id.max(2_147_483_647) });

/** A listagem não recebe filtros: qualquer parâmetro na query vira 400. */
export const consultaFornecedoresSchema = z.strictObject({});

/** CNPJ com ou sem máscara, gravado como 00.000.000/0000-00. Vazio ou null grava null. */
const cnpj = z
  .string()
  .trim()
  .refine((valor) => valor === "" || validarCnpj(valor), "CNPJ inválido")
  .transform((valor) => (valor === "" ? null : formatarCnpj(valor)))
  .nullish();

const campos = {
  nome: z.string().trim().min(2).max(150),
  cnpj,
  contato: z
    .string()
    .trim()
    .max(150)
    .transform((valor) => valor || null)
    .nullish(),
};

export const criarFornecedorSchema = z.strictObject(campos);

export const atualizarFornecedorSchema = z
  .strictObject(campos)
  .partial()
  .refine(
    (dados) => Object.values(dados).some((valor) => valor !== undefined),
    "Informe ao menos um campo para atualizar"
  );

export type CriarFornecedor = z.infer<typeof criarFornecedorSchema>;
export type AtualizarFornecedor = z.infer<typeof atualizarFornecedorSchema>;
