/** Remove tudo o que não for dígito. */
export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

/** Deixa só as letras e os dígitos do CNPJ, com as letras em maiúsculas. */
export function normalizarCnpj(valor: string): string {
  return valor.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

/**
 * Dígito verificador do CNPJ pelo módulo 11. Cada caractere vale o seu código ASCII menos 48
 * (os dígitos valem eles mesmos e "A" vale 17), e os pesos vão de 2 a 9 da direita para a esquerda,
 * recomeçando depois do 9.
 */
function digitoVerificador(base: string): number {
  let soma = 0;
  let peso = 2;
  for (let i = base.length - 1; i >= 0; i--) {
    soma += (base.charCodeAt(i) - 48) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

// 12 posições de letra ou dígito e 2 dígitos verificadores, com ou sem a máscara 00.000.000/0000-00
const FORMATO_CNPJ = /^[0-9A-Z]{2}\.?[0-9A-Z]{3}\.?[0-9A-Z]{3}\/?[0-9A-Z]{4}-?\d{2}$/;

/**
 * Valida o CNPJ pelos dígitos verificadores, no formato numérico ou no alfanumérico, em que as 12
 * primeiras posições podem ter letras. Aceita com ou sem máscara e com letras minúsculas. Como o
 * backend, recusa só a sequência de 14 dígitos iguais, como 11111111111111.
 */
export function validarCnpj(cnpj: string): boolean {
  const valor = cnpj.trim().toUpperCase();
  if (!FORMATO_CNPJ.test(valor)) return false;
  const caracteres = normalizarCnpj(valor);
  if (/^(\d)\1{13}$/.test(caracteres)) return false;
  const base = caracteres.slice(0, 12);
  const primeiro = digitoVerificador(base);
  const segundo = digitoVerificador(base + primeiro);
  return caracteres.slice(12) === `${primeiro}${segundo}`;
}

/**
 * Aplica a máscara 00.000.000/0000-00, mantendo as letras do CNPJ alfanumérico em maiúsculas.
 * Funciona também com parte dos caracteres, para formatar o campo enquanto a pessoa digita;
 * o que passar de 14 caracteres é descartado.
 */
export function formatarCnpj(valor: string): string {
  return normalizarCnpj(valor)
    .slice(0, 14)
    .replace(/^([0-9A-Z]{2})([0-9A-Z])/, "$1.$2")
    .replace(/^([0-9A-Z]{2})\.([0-9A-Z]{3})([0-9A-Z])/, "$1.$2.$3")
    .replace(/\.([0-9A-Z]{3})([0-9A-Z])/, ".$1/$2")
    .replace(/([0-9A-Z]{4})([0-9A-Z])/, "$1-$2");
}

const FORMATO_DATA_HORA = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Data e hora locais no formato 14/09/2026 10:05. Valor ausente ou inválido vira "-". */
export function formatarDataHora(valor: string | null | undefined): string {
  if (!valor) return "-";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "-";
  const partes: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {};
  for (const { type, value } of FORMATO_DATA_HORA.formatToParts(data)) partes[type] = value;
  return `${partes.day}/${partes.month}/${partes.year} ${partes.hour}:${partes.minute}`;
}

const FORMATO_NUMERO = new Intl.NumberFormat("pt-BR");

/** Quantidade com separador de milhar e, quando informada, a unidade: "1.500 un". */
export function formatarQuantidade(quantidade: number, unidade?: string): string {
  const numero = FORMATO_NUMERO.format(quantidade);
  return unidade ? `${numero} ${unidade}` : numero;
}
