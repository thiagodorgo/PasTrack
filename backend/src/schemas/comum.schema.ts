import { z } from "zod";

/** Maior id que cabe na coluna INT4 do banco. Acima disso o Postgres recusa a consulta e a API responderia 500. */
export const ID_MAXIMO = 2_147_483_647;

/** Parâmetro :id numérico, inteiro, positivo e dentro do INT4. */
export const idParam = z.object({ id: z.coerce.number().int().positive().max(ID_MAXIMO) });

/** Objeto que recusa campos fora do esquema e diz quais foram enviados. */
export function objetoEstrito<Forma extends z.core.$ZodLooseShape>(forma: Forma) {
  return z.strictObject(forma, {
    error: (problema) =>
      problema.code === "unrecognized_keys" ? `Campo não permitido: ${problema.keys.join(", ")}` : undefined,
  });
}

/**
 * O Postgres recusa o caractere nulo (U+0000) em colunas de texto e em filtros. Sem esta regra, a
 * requisição cairia no 500.
 */
export function semCaractereNulo(valor: string): boolean {
  return !valor.includes("\u0000");
}

/** Texto sem os espaços das pontas e sem o caractere nulo. */
export const texto = () =>
  z.string().trim().refine(semCaractereNulo, "Não pode conter o caractere nulo (U+0000)");

/**
 * Recusa caracteres de controle (U+0000 a U+001F e U+007F). O banco não aceita o byte nulo em texto, e nenhum
 * desses caracteres pertence a um nome ou e-mail digitado.
 */
export function semCaracteresDeControle(valor: string): boolean {
  for (const caractere of valor) {
    const codigo = caractere.charCodeAt(0);
    if (codigo < 32 || codigo === 127) return false;
  }
  return true;
}
