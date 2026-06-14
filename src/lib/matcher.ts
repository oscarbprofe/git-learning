/** Normalización y matching de respuestas de ejercicios.
 * Acepta variantes equivalentes (comillas simples/dobles, espacios múltiples).
 * Nunca usa eval — sólo RegExp.test sobre entrada normalizada.
 */

export function normalize(input: string): string {
  return input
    .trim()
    .replace(/[‘’“”]/g, '"') // comillas tipográficas → "
    .replace(/'/g, '"')
    .replace(/\s+/g, ' ');
}

export function matchAny(input: string, patterns: string[]): boolean {
  const value = normalize(input);
  for (const p of patterns) {
    try {
      const re = new RegExp(p, 'i');
      if (re.test(value)) return true;
    } catch {
      // patrón inválido — ignorar
    }
  }
  return false;
}
