import { z } from "zod";

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
