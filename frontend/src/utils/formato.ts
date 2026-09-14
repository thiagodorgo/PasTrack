/** Remove tudo o que não for dígito. */
export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

/** Dígito verificador do CNPJ: pesos de 2 a 9 da direita para a esquerda, recomeçando depois do 9. */
function digitoVerificador(base: string): number {
  let soma = 0;
  let peso = 2;
  for (let i = base.length - 1; i >= 0; i--) {
    soma += Number(base[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

/**
 * Valida o CNPJ pelos dígitos verificadores.
 * Aceita os 14 dígitos puros ou com a máscara 00.000.000/0000-00; sequências repetidas são recusadas.
 */
export function validarCnpj(cnpj: string): boolean {
  const valor = cnpj.trim();
  if (!/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/.test(valor)) return false;
  const digitos = somenteDigitos(valor);
  if (/^(\d)\1{13}$/.test(digitos)) return false;
  const primeiro = digitoVerificador(digitos.slice(0, 12));
  const segundo = digitoVerificador(digitos.slice(0, 12) + primeiro);
  return digitos.slice(12) === `${primeiro}${segundo}`;
}

/**
 * Aplica a máscara 00.000.000/0000-00. Funciona também com parte dos dígitos,
 * para formatar o campo enquanto a pessoa digita; o que passar de 14 dígitos é descartado.
 */
export function formatarCnpj(valor: string): string {
  return somenteDigitos(valor)
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
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
