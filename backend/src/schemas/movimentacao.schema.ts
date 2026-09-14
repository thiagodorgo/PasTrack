import { z } from "zod";

/** Maior quantidade aceita numa única movimentação. */
export const QUANTIDADE_MAXIMA = 1_000_000;

/** Objeto que recusa campos fora do esquema e diz quais foram enviados. */
function objetoEstrito<Forma extends z.core.$ZodLooseShape>(forma: Forma) {
  return z.strictObject(forma, {
    error: (problema) =>
      problema.code === "unrecognized_keys" ? `Campo não permitido: ${problema.keys.join(", ")}` : undefined,
  });
}

function identificador(mensagem: string) {
  return z.number(mensagem).int(mensagem).positive(mensagem);
}

const camposComuns = {
  pastilhaId: identificador("Informe a pastilha pelo id numérico"),
  quantidade: z
    .number("A quantidade deve ser um número")
    .int("A quantidade deve ser um número inteiro")
    .min(1, "A quantidade deve ser de pelo menos 1")
    .max(QUANTIDADE_MAXIMA, `A quantidade deve ser de no máximo ${QUANTIDADE_MAXIMA}`),
  documento: z
    .string("O documento deve ser um texto")
    .trim()
    .max(100, "O documento deve ter até 100 caracteres")
    .optional(),
  observacao: z
    .string("A observação deve ser um texto")
    .trim()
    .max(500, "A observação deve ter até 500 caracteres")
    .optional(),
};

/**
 * Corpo de POST /api/movimentacoes, discriminado pelo tipo:
 * a ENTRADA exige o fornecedor e a SAIDA não aceita fornecedor.
 */
export const registrarMovimentacaoBody = z.discriminatedUnion(
  "tipo",
  [
    objetoEstrito({
      tipo: z.literal("ENTRADA"),
      fornecedorId: identificador("Informe o fornecedor da entrada pelo id numérico"),
      ...camposComuns,
    }),
    objetoEstrito({
      tipo: z.literal("SAIDA"),
      fornecedorId: z.never("A saída não tem fornecedor").optional(),
      ...camposComuns,
    }),
  ],
  "Informe o tipo: ENTRADA ou SAIDA"
);

export type RegistrarMovimentacao = z.output<typeof registrarMovimentacaoBody>;
