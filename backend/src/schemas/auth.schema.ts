import { z } from "zod";
import { objetoEstrito, semCaracteresDeControle } from "./comum.schema";

/** Limite folgado: o bcrypt só usa os primeiros 72 bytes, mas a API não deve aceitar corpos absurdos. */
const TAMANHO_MAXIMO_SENHA = 1024;

function senha(nome: string) {
  return z
    .string({ error: "informe " + nome })
    .min(1, "informe " + nome)
    .max(TAMANHO_MAXIMO_SENHA, "senha longa demais");
}

export const loginSchema = objetoEstrito({
  email: z
    .string({ error: "informe o e-mail" })
    .trim()
    .toLowerCase()
    .min(1, "informe o e-mail")
    .max(254, "e-mail longo demais")
    .refine(semCaracteresDeControle, "o e-mail tem caracteres inválidos"),
  senha: senha("a senha"),
});

/** A política de senha é aplicada no serviço, porque depende do e-mail do usuário. */
export const trocarSenhaSchema = objetoEstrito({
  senhaAtual: senha("a senha atual"),
  novaSenha: senha("a nova senha"),
});

export type LoginEntrada = z.infer<typeof loginSchema>;
export type TrocarSenhaEntrada = z.infer<typeof trocarSenhaSchema>;
