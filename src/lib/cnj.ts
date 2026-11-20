/**
 * Numeração única de processos do CNJ (Resolução 65/2008):
 * NNNNNNN-DD.AAAA.J.TR.OOOO, com dígito verificador pelo módulo 97.
 */

function resto97(digitos: string): number {
  let resto = 0;
  for (const caractere of digitos) {
    resto = (resto * 10 + Number(caractere)) % 97;
  }
  return resto;
}

export function calcularDigitoCNJ(sequencial: string, ano: string, segmento: string, tribunal: string, origem: string): string {
  const base = `${sequencial}${ano}${segmento}${tribunal}${origem}00`;
  return String(98 - resto97(base)).padStart(2, "0");
}

/** Monta um número CNJ válido a partir das partes. */
export function montarCNJ(sequencial: number, ano: number, segmento: number, tribunal: number, origem: number): string {
  const n = String(sequencial).padStart(7, "0");
  const a = String(ano);
  const j = String(segmento);
  const tr = String(tribunal).padStart(2, "0");
  const o = String(origem).padStart(4, "0");
  const dd = calcularDigitoCNJ(n, a, j, tr, o);
  return `${n}-${dd}.${a}.${j}.${tr}.${o}`;
}

/** Aplica a máscara conforme a pessoa digita. */
export function mascararCNJ(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 20);
  const partes = [d.slice(0, 7), d.slice(7, 9), d.slice(9, 13), d.slice(13, 14), d.slice(14, 16), d.slice(16, 20)];
  let saida = partes[0];
  if (partes[1]) saida += `-${partes[1]}`;
  if (partes[2]) saida += `.${partes[2]}`;
  if (partes[3]) saida += `.${partes[3]}`;
  if (partes[4]) saida += `.${partes[4]}`;
  if (partes[5]) saida += `.${partes[5]}`;
  return saida;
}

export function validarCNJ(valor: string): boolean {
  const d = valor.replace(/\D/g, "");
  if (d.length !== 20) return false;
  const esperado = calcularDigitoCNJ(d.slice(0, 7), d.slice(9, 13), d.slice(13, 14), d.slice(14, 16), d.slice(16, 20));
  return d.slice(7, 9) === esperado;
}
