import { z } from "zod";
import { formatarCnpj, validarCnpj } from "../utils/cnpj";
import { objetoEstrito, texto } from "./comum.schema";

/** A listagem não recebe filtros: qualquer parâmetro na query vira 400. */
export const consultaFornecedoresSchema = objetoEstrito({});

/**
 * CNPJ numérico ou alfanumérico, com ou sem máscara, gravado em maiúsculas como XX.XXX.XXX/XXXX-XX.
 * Vazio ou null grava null. O formato aceito já deixa de fora o caractere nulo.
 */
const cnpj = z
  .string()
  .trim()
  .refine((valor) => valor === "" || validarCnpj(valor), "CNPJ inválido")
  .transform((valor) => (valor === "" ? null : formatarCnpj(valor)))
  .nullish();

const campos = {
  nome: texto().min(2).max(150),
  cnpj,
  contato: texto()
    .max(150)
    .transform((valor) => valor || null)
    .nullish(),
};

export const criarFornecedorSchema = objetoEstrito(campos);

export const atualizarFornecedorSchema = objetoEstrito(campos)
  .partial()
  .refine(
    (dados) => Object.values(dados).some((valor) => valor !== undefined),
    "Informe ao menos um campo para atualizar"
  );

export type CriarFornecedor = z.infer<typeof criarFornecedorSchema>;
export type AtualizarFornecedor = z.infer<typeof atualizarFornecedorSchema>;
