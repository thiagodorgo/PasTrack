import { z } from "zod";

/** Parâmetro :id numérico, inteiro e positivo. */
/**
 * Recusa caracteres de controle (U+0000 a U+001F e U+007F). O banco não aceita o byte nulo em texto, e nenhum
 * desses caracteres pertence a um nome ou e-mail digitado.
 */
export function semCaracteresDeControle(texto: string): boolean {
  for (const caractere of texto) {
    const codigo = caractere.charCodeAt(0);
    if (codigo < 32 || codigo === 127) return false;
  }
  return true;
}

export const idParam = z.object({ id: z.coerce.number().int().positive() });
