const PESOS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

function digitoVerificador(base: string): string {
  const pesos = PESOS.slice(PESOS.length - base.length);
  const soma = [...base].reduce((total, algarismo, i) => total + Number(algarismo) * pesos[i], 0);
  const resto = 11 - (soma % 11);
  return String(resto >= 10 ? 0 : resto);
}

/**
 * CNPJ válido e diferente a cada chamada: o cadastro recusa CNPJ repetido, então um valor fixo
 * faria o caso passar na primeira execução e falhar nas seguintes.
 */
export function cnpjValido(): string {
  const base = String(Date.now()).slice(-8).padStart(8, "1") + "0001";
  const primeiro = digitoVerificador(base);
  const segundo = digitoVerificador(base + primeiro);
  return base + primeiro + segundo;
}
