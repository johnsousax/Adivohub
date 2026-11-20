/**
 * Decide se uma requisição que altera dados veio do próprio site.
 * Sem dependências, para poder ser testada isoladamente.
 */

export interface CabecalhosDeOrigem {
  origin: string | null;
  secFetchSite: string | null;
  /** Host pelo qual o site foi acessado (x-forwarded-host ou host). */
  host: string | null;
}

export function origemPermitida({ origin, secFetchSite, host }: CabecalhosDeOrigem): boolean {
  // Navegadores atuais dizem de onde partiu a chamada. Só "same-origin" passa.
  if (secFetchSite && secFetchSite !== "same-origin") return false;

  if (origin) {
    if (!host) return false;
    try {
      return new URL(origin).host.toLowerCase() === host.toLowerCase();
    } catch {
      return false;
    }
  }

  // Sem Origin e sem Sec-Fetch-Site: não é um navegador (curl, monitoramento, teste).
  // Um ataque de CSRF precisa do navegador da vítima, que sempre envia Origin em POST.
  return secFetchSite === "same-origin" || secFetchSite === null;
}
