/** Conversión puntaje 0–100 → nota chilena 1.0–7.0 con exigencia 60%. */
export function pctToNota(pct: number): number {
  const p = Math.max(0, Math.min(100, pct));
  const nota = p >= 60 ? 4 + (3 * (p - 60)) / 40 : 1 + (3 * p) / 60;
  return Math.round(nota * 10) / 10;
}

/** Factor de puntaje por intento usado en ejercicios (1.0 / 0.7 / 0.4). */
export const ATTEMPT_FACTORS = [1, 0.7, 0.4] as const;

export function exerciseScore(value: number, attemptIndex: number, correct: boolean): number {
  if (!correct) return 0;
  const factor = ATTEMPT_FACTORS[attemptIndex] ?? 0;
  return Math.round(value * factor * 100) / 100;
}

export function notaLabel(complete: boolean): 'Nota final' | 'Nota provisoria' {
  return complete ? 'Nota final' : 'Nota provisoria';
}
