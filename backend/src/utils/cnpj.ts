/**
 * CNPJ numérico ou alfanumérico, sem máscara ou no formato XX.XXX.XXX/XXXX-XX.
 * As 12 primeiras posições aceitam 0-9 e A-Z (maiúsculas ou minúsculas); os 2 dígitos verificadores são numéricos.
 */
const SEM_MASCARA = /^[0-9A-Z]{12}\d{2}$/i;
const COM_MASCARA = /^[0-9A-Z]{2}\.[0-9A-Z]{3}\.[0-9A-Z]{3}\/[0-9A-Z]{4}-\d{2}$/i;
const SEQUENCIA_REPETIDA = /^(\d)\1{13}$/;

const PESOS_PRIMEIRO_DIGITO = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_SEGUNDO_DIGITO = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

/** Cada posição vale o código ASCII menos 48: de 0 a 9 valem 0 a 9, e de A a Z valem 17 a 42. */
const valor = (caractere: string) => caractere.charCodeAt(0) - 48;

function digitoVerificador(caracteres: string, pesos: number[]): number {
  const soma = pesos.reduce((total, peso, posicao) => total + valor(caracteres[posicao]) * peso, 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

/** Tira a máscara e passa para maiúsculas. Só use depois de conferir o formato. */
const semMascara = (cnpj: string) => cnpj.toUpperCase().replace(/[./-]/g, "");

/** Confere o formato e os dois dígitos verificadores. Recusa sequências repetidas, como 11111111111111. */
export function validarCnpj(cnpj: string): boolean {
  if (!SEM_MASCARA.test(cnpj) && !COM_MASCARA.test(cnpj)) return false;
  const caracteres = semMascara(cnpj);
  if (SEQUENCIA_REPETIDA.test(caracteres)) return false;
  return (
    digitoVerificador(caracteres, PESOS_PRIMEIRO_DIGITO) === Number(caracteres[12]) &&
    digitoVerificador(caracteres, PESOS_SEGUNDO_DIGITO) === Number(caracteres[13])
  );
}

/** Devolve o CNPJ em maiúsculas no formato XX.XXX.XXX/XXXX-XX, que é o gravado no banco. Lança erro se for inválido. */
export function formatarCnpj(cnpj: string): string {
  if (!validarCnpj(cnpj)) throw new Error("CNPJ inválido");
  const c = semMascara(cnpj);
  return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`;
}
