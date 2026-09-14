import { z } from "zod";

/** Maior id que cabe na coluna INT4 do banco; acima dele, a consulta falharia no banco. */
const ID_MAXIMO = 2_147_483_647;

/** Parâmetro :id de PATCH /api/alertas/:id/resolver: inteiro positivo que cabe no INT4. */
export const alertaIdParam = z.object({
  id: z.coerce
    .number("Informe o alerta pelo id numérico")
    .int("Informe o alerta pelo id numérico")
    .positive("Informe o alerta pelo id numérico")
    .max(ID_MAXIMO, "Informe o alerta pelo id numérico"),
});

export type ParametroAlerta = z.output<typeof alertaIdParam>;

/** Consulta de GET /api/alertas. Sem situação, lista só os alertas abertos. */
export const listarAlertasQuery = z.strictObject(
  {
    situacao: z
      .enum(["ABERTO", "RESOLVIDO", "TODAS"], "Use a situação ABERTO, RESOLVIDO ou TODAS")
      .default("ABERTO"),
  },
  {
    error: (problema) =>
      problema.code === "unrecognized_keys" ? `Campo não permitido: ${problema.keys.join(", ")}` : undefined,
  }
);

export type ConsultaAlertas = z.output<typeof listarAlertasQuery>;
