/** Allowlist institucional Duoc UC.
 * Comparación EXACTA del dominio — un endsWith aceptaría "otraduoc.cl".
 */
export const ALLOWED_DOMAINS = ['duocuc.cl', 'profesor.duoc.cl', 'duoc.cl'] as const;

export function isInstitutionalEmail(email: string): boolean {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.indexOf('@');
  if (at < 0 || at === trimmed.length - 1) return false;
  const domain = trimmed.slice(at + 1);
  return (ALLOWED_DOMAINS as readonly string[]).includes(domain);
}

export const ALLOWED_DOMAINS_LABEL = ALLOWED_DOMAINS.map((d) => `@${d}`).join(', ');

/** Dominios de personal (docentes/funcionarios) habilitados para verificar informes. */
export const STAFF_DOMAINS = ['profesor.duoc.cl', 'duoc.cl'] as const;

export function isStaffEmail(email: string): boolean {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.indexOf('@');
  if (at < 0 || at === trimmed.length - 1) return false;
  return (STAFF_DOMAINS as readonly string[]).includes(trimmed.slice(at + 1));
}

export const STAFF_DOMAINS_LABEL = STAFF_DOMAINS.map((d) => `@${d}`).join(', ');
