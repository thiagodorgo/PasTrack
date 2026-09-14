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

/** Data ISO (2026-09-14) ou data e hora ISO com fuso (2026-09-14T08:00:00Z, 2026-09-14T08:00:00-03:00). */
const dataIso = z.union(
  [z.iso.date(), z.iso.datetime({ offset: true })],
  "Use uma data ISO, como 2026-09-14 ou 2026-09-14T08:00:00Z"
);

/** Início do período, inclusivo. A data sem hora vale desde 00:00 (UTC). */
const inicioDoPeriodo = dataIso.transform((texto) => new Date(texto));

/** Fim do período, inclusivo. A data sem hora vale até o último milissegundo do dia (UTC). */
const fimDoPeriodo = dataIso.transform(
  (texto) => new Date(texto.length === 10 ? `${texto}T23:59:59.999Z` : texto)
);

/** Consulta de GET /api/movimentacoes. Sem página, a resposta é a lista das 100 mais recentes. */
export const listarMovimentacoesQuery = objetoEstrito({
  pastilhaId: z.coerce
    .number("Informe a pastilha pelo id numérico")
    .int("Informe a pastilha pelo id numérico")
    .positive("Informe a pastilha pelo id numérico")
    .optional(),
  tipo: z.enum(["ENTRADA", "SAIDA"], "Use o tipo ENTRADA ou SAIDA").optional(),
  de: inicioDoPeriodo.optional(),
  ate: fimDoPeriodo.optional(),
  pagina: z.coerce
    .number("A página deve ser um número")
    .int("A página deve ser um número inteiro")
    .min(1, "A página começa em 1")
    .optional(),
  tamanho: z.coerce
    .number("O tamanho da página deve ser um número")
    .int("O tamanho da página deve ser um número inteiro")
    .min(1, "O tamanho da página vai de 1 a 100")
    .max(100, "O tamanho da página vai de 1 a 100")
    .default(20),
}).refine((consulta) => !consulta.de || !consulta.ate || consulta.de <= consulta.ate, {
  message: "A data final deve ser igual ou posterior à inicial",
  path: ["ate"],
});

export type ConsultaMovimentacoes = z.output<typeof listarMovimentacoesQuery>;
