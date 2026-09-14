import { z } from "zod";

/** Limite folgado: o bcrypt só usa os primeiros 72 bytes, mas o login não deve aceitar corpos absurdos. */
const TAMANHO_MAXIMO_SENHA = 1024;

export const loginSchema = z
  .object({
    email: z
      .string({ error: "informe o e-mail" })
      .trim()
      .toLowerCase()
      .min(1, "informe o e-mail")
      .max(254, "e-mail longo demais"),
    senha: z
      .string({ error: "informe a senha" })
      .min(1, "informe a senha")
      .max(TAMANHO_MAXIMO_SENHA, "senha longa demais"),
  })
  .strict();

export type LoginEntrada = z.infer<typeof loginSchema>;
