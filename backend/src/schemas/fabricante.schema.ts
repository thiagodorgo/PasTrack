import { z } from "zod";
import { objetoEstrito, texto } from "./comum.schema";

/** A listagem não recebe filtros: qualquer parâmetro na query vira 400. */
export const consultaFabricantesSchema = objetoEstrito({});

/** A criação e a atualização seguem a mesma regra. */
export const fabricanteSchema = objetoEstrito({
  nome: texto().min(2).max(100),
});

export type DadosFabricante = z.infer<typeof fabricanteSchema>;
