import { z } from "zod";

/** Parâmetro :id numérico, inteiro e positivo. */
export const idParam = z.object({ id: z.coerce.number().int().positive() });
