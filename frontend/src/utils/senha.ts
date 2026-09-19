/**
 * Espelho das regras de formato da política de senha do backend (backend/src/services/politica-senha.ts),
 * para avisar antes do envio. As regras que dependem do servidor (e-mail e senhas comuns) ficam só lá.
 */
export const TAMANHO_MINIMO_SENHA = 12;
/** O bcrypt considera no máximo 72 bytes; letras acentuadas ocupam 2 bytes em UTF-8. */
export const BYTES_MAXIMOS_SENHA = 72;

/** Problemas da nova senha; lista vazia significa que ela passa na validação do cliente. */
export function problemasDaSenha(senha: string): string[] {
  const problemas: string[] = [];
  if (senha.length < TAMANHO_MINIMO_SENHA)
    problemas.push(`use pelo menos ${TAMANHO_MINIMO_SENHA} caracteres`);
  if (new TextEncoder().encode(senha).length > BYTES_MAXIMOS_SENHA) {
    problemas.push(`use no máximo ${BYTES_MAXIMOS_SENHA} bytes (letras acentuadas contam 2)`);
  }
  if (!/\p{L}/u.test(senha)) problemas.push("inclua pelo menos uma letra");
  if (!/\p{N}/u.test(senha)) problemas.push("inclua pelo menos um número");
  return problemas;
}
