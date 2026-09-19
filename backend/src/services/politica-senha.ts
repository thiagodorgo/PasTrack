import { randomBytes } from "node:crypto";

/** Política mínima de senha do PasTrack. */
export const TAMANHO_MINIMO_SENHA = 10;
/** O bcrypt considera no máximo 72 bytes; acentos ocupam 2 bytes em UTF-8. */
export const BYTES_MAXIMOS_SENHA = 72;

const SENHAS_COMUNS = new Set([
  "1234567890",
  "0123456789",
  "12345678910",
  "1234567890a",
  "a1234567890",
  "1q2w3e4r5t",
  "senha12345",
  "senha123456",
  "mudar12345",
  "trocar12345",
  "admin12345",
  "admin123456",
  "administrador1",
  "password12",
  "password123",
  "qwerty12345",
  "qwertyuiop1",
  "abc1234567",
  "abcd123456",
  "abcdef1234",
  "welcome123",
  "brasil12345",
  "pastrack123",
  "pastrack2026",
  "usinagem123",
  "estoque123",
]);

/** Devolve a lista de problemas da senha; lista vazia significa senha aceita. */
export function validarPoliticaDeSenha(senha: string, email?: string): string[] {
  const problemas: string[] = [];
  if (senha.length < TAMANHO_MINIMO_SENHA)
    problemas.push(`use pelo menos ${TAMANHO_MINIMO_SENHA} caracteres`);
  if (Buffer.byteLength(senha, "utf8") > BYTES_MAXIMOS_SENHA)
    problemas.push(`use no máximo ${BYTES_MAXIMOS_SENHA} bytes`);
  if (!/\p{L}/u.test(senha)) problemas.push("inclua pelo menos uma letra");
  if (!/\p{N}/u.test(senha)) problemas.push("inclua pelo menos um número");
  const usuario = email?.split("@")[0]?.trim().toLowerCase();
  if (usuario && usuario.length >= 3 && senha.toLowerCase().includes(usuario)) {
    problemas.push("não use o seu e-mail na senha");
  }
  if (SENHAS_COMUNS.has(senha.toLowerCase())) problemas.push("essa senha é comum demais");
  return problemas;
}

/**
 * Gera uma senha aleatória de 22 caracteres (120 bits sorteados) que sempre atende à política:
 * letra e número garantidos e, se o e-mail for informado, sem conter o nome de usuário dele.
 */
export function gerarSenhaAleatoria(email?: string): string {
  for (;;) {
    const senha = randomBytes(15).toString("base64url") + "a1";
    if (validarPoliticaDeSenha(senha, email).length === 0) {
      return senha;
    }
  }
}
