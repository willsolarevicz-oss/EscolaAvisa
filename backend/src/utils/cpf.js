/**
 * Valida um CPF (somente dígitos) pelos dois dígitos verificadores.
 * Rejeita sequências repetidas (ex.: 111.111.111-11), que passam no cálculo mas não existem.
 */
export function isValidCpf(digits) {
  if (!/^\d{11}$/.test(digits) || /^(\d)\1{10}$/.test(digits)) return false;

  const calcDigit = (length) => {
    let sum = 0;
    for (let i = 0; i < length; i += 1) {
      sum += Number(digits[i]) * (length + 1 - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return calcDigit(9) === Number(digits[9]) && calcDigit(10) === Number(digits[10]);
}
