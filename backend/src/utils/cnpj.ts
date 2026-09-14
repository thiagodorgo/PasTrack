/** CNPJ numérico com 14 dígitos, sem máscara ou no formato 00.000.000/0000-00. */
const SEM_MASCARA = /^\d{14}$/;
const COM_MASCARA = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
const SEQUENCIA_REPETIDA = /^(\d)\1{13}$/;

const PESOS_PRIMEIRO_DIGITO = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_SEGUNDO_DIGITO = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

function digitoVerificador(digitos: string, pesos: number[]): number {
  const soma = pesos.reduce((total, peso, posicao) => total + Number(digitos[posicao]) * peso, 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

/** Confere o formato e os dois dígitos verificadores. Recusa sequências repetidas, como 11111111111111. */
export function validarCnpj(cnpj: string): boolean {
  if (!SEM_MASCARA.test(cnpj) && !COM_MASCARA.test(cnpj)) return false;
  const digitos = cnpj.replace(/\D/g, "");
  if (SEQUENCIA_REPETIDA.test(digitos)) return false;
  return (
    digitoVerificador(digitos, PESOS_PRIMEIRO_DIGITO) === Number(digitos[12]) &&
    digitoVerificador(digitos, PESOS_SEGUNDO_DIGITO) === Number(digitos[13])
  );
}

/** Devolve o CNPJ no formato 00.000.000/0000-00, que é o gravado no banco. Lança erro se for inválido. */
export function formatarCnpj(cnpj: string): string {
  if (!validarCnpj(cnpj)) throw new Error("CNPJ inválido");
  const d = cnpj.replace(/\D/g, "");
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}
