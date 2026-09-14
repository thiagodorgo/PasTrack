import { z } from "zod";
import { idParam } from "./comum.schema";

/** Id limitado ao INT4 do banco. Acima disso o Postgres recusa a consulta e a API responderia 500. */
export const fabricanteIdParam = idParam.extend({ id: idParam.shape.id.max(2_147_483_647) });

/** A listagem não recebe filtros: qualquer parâmetro na query vira 400. */
export const consultaFabricantesSchema = z.strictObject({});

/** A criação e a atualização seguem a mesma regra. */
export const fabricanteSchema = z.strictObject({
  nome: z.string().trim().min(2).max(100),
});

export type DadosFabricante = z.infer<typeof fabricanteSchema>;
