/** Stores reactivos (nanostores) sobre el estado del viaje. */

import { atom, computed } from 'nanostores';
import type { ProgressState, UnitProgress } from './storage';
import { ensureUnit, getOrCreateState, saveState, clearState } from './storage';
import { exerciseScore } from './scoring';
import type { SessionUser } from './auth';

export interface UnitMeta {
  slug: string;
  order: number;
  title: string;
  description: string;
  points: number;
  exerciseCount: number;
  quizCount: number;
}

export const $state = atom<ProgressState | null>(null);
export const $unitsMeta = atom<UnitMeta[]>([]);

/** Estado de la sincronización con Firestore, para feedback en la UI. */
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
export const $saveStatus = atom<SaveStatus>('idle');

/** Mensaje de error de carga del avance (Firestore inaccesible). null = sin error. */
export const $loadError = atom<string | null>(null);

export async function initProgressForUser(user: SessionUser, units: UnitMeta[]): Promise<void> {
  $unitsMeta.set(units);
  $loadError.set(null);
  try {
    const st = await getOrCreateState(user);
    // Reconcilia la compleción con los datos actuales (repara estados guardados
    // antes de cambios en la lógica) y persiste si algo cambió.
    if (reconcileCompletion(st, units)) {
      await saveState(st);
    }
    $state.set(st);
  } catch (err) {
    // No pudimos leer/crear el avance en Firestore: NO seteamos un estado vacío
    // (eso arriesgaría sobrescribir datos al guardar). Mostramos error y dejamos
    // que el estudiante reintente recargando.
    console.error('[git-challenge] No se pudo cargar el avance:', err);
    $state.set(null);
    $loadError.set(
      'No pudimos cargar tu avance. Revisa tu conexión a internet y vuelve a cargar la página.',
    );
    throw err;
  }
}

/** Recalcula completedAt de cada unidad y del viaje según ejercicios + quiz.
 * Devuelve true si modificó el estado. */
function reconcileCompletion(state: ProgressState, units: UnitMeta[]): boolean {
  let changed = false;
  for (const meta of units) {
    const u = state.units[meta.slug];
    if (!u) continue;
    const done =
      Object.keys(u.exercises).length >= meta.exerciseCount &&
      Object.keys(u.quiz).length >= meta.quizCount;
    if (done && !u.completedAt) {
      u.completedAt = new Date().toISOString();
      changed = true;
    } else if (!done && u.completedAt) {
      u.completedAt = null;
      changed = true;
    }
  }
  const allDone = units.length > 0 && units.every((m) => state.units[m.slug]?.completedAt);
  const journeyDone = allDone ? state.completedAt ?? new Date().toISOString() : null;
  if (journeyDone !== state.completedAt) {
    state.completedAt = journeyDone;
    changed = true;
  }
  return changed;
}

/** Limpia SOLO el estado en memoria (al cerrar sesión / sin usuario).
 * No toca los datos guardados en Firestore. */
export function resetLocalState(): void {
  $state.set(null);
}

/** Borra el progreso guardado del estudiante (acción explícita "Reiniciar"). */
export async function clearProgress(): Promise<void> {
  const s = $state.get();
  if (s) await clearState(s.student.email);
  $state.set(null);
}

async function commit(mutator: (state: ProgressState) => void): Promise<void> {
  const current = $state.get();
  if (!current) return;
  const next: ProgressState = JSON.parse(JSON.stringify(current));
  mutator(next);
  // Actualización optimista: la UI refleja el cambio de inmediato…
  $state.set(next);
  $saveStatus.set('saving');
  try {
    // …y luego confirmamos la escritura en Firestore.
    await saveState(next);
    $saveStatus.set('saved');
    window.setTimeout(() => {
      if ($saveStatus.get() === 'saved') $saveStatus.set('idle');
    }, 2000);
  } catch (err) {
    console.error('[git-challenge] No se pudo guardar la respuesta:', err);
    $saveStatus.set('error');
    // El dato sigue en memoria; el próximo guardado exitoso lo persistirá.
  }
}

/* ------- mutaciones ------- */

export async function recordExercise(args: {
  unitSlug: string;
  exerciseId: string;
  answer: string;
  attempts: number;
  correct: boolean;
  maxValue: number;
}): Promise<void> {
  const { unitSlug, exerciseId, answer, attempts, correct, maxValue } = args;
  const score = exerciseScore(maxValue, attempts - 1, correct);
  await commit((s) => {
    const u = ensureUnit(s, unitSlug);
    u.exercises[exerciseId] = {
      answer,
      attempts,
      correct,
      score,
      maxScore: maxValue,
      answeredAt: new Date().toISOString(),
    };
    maybeCompleteUnit(s, unitSlug);
    maybeCompleteJourney(s);
  });
}

export async function recordQuiz(args: {
  unitSlug: string;
  questionId: string;
  selected: string;
  correct: boolean;
  maxValue: number;
}): Promise<void> {
  const { unitSlug, questionId, selected, correct, maxValue } = args;
  await commit((s) => {
    const u = ensureUnit(s, unitSlug);
    u.quiz[questionId] = {
      selected,
      correct,
      score: correct ? maxValue : 0,
      maxScore: maxValue,
      answeredAt: new Date().toISOString(),
    };
    maybeCompleteUnit(s, unitSlug);
    maybeCompleteJourney(s);
  });
}

/* ------- lógica de completado ------- */

function maybeCompleteUnit(state: ProgressState, unitSlug: string): void {
  const meta = $unitsMeta.get().find((m) => m.slug === unitSlug);
  if (!meta) return;
  const u = state.units[unitSlug];
  if (!u) return;

  const allExercises = Object.keys(u.exercises).length >= meta.exerciseCount;
  const allQuiz = Object.keys(u.quiz).length >= meta.quizCount;

  if (allExercises && allQuiz && !u.completedAt) {
    u.completedAt = new Date().toISOString();
  }
}

function maybeCompleteJourney(state: ProgressState): void {
  const metas = $unitsMeta.get();
  if (!metas.length) return;
  const allDone = metas.every((m) => state.units[m.slug]?.completedAt);
  if (allDone && !state.completedAt) {
    state.completedAt = new Date().toISOString();
  } else if (!allDone) {
    state.completedAt = null;
  }
}

/* ------- selectores ------- */

export interface UnitSummary {
  meta: UnitMeta;
  unit: UnitProgress | null;
  score: number;
  maxScore: number;
  percent: number;
  status: 'completed' | 'in-progress' | 'not-started' | 'locked';
  unlocked: boolean;
}

export function summarizeUnit(state: ProgressState | null, meta: UnitMeta, prevDone: boolean): UnitSummary {
  const unit = state?.units[meta.slug] ?? null;
  let score = 0;
  if (unit) {
    for (const e of Object.values(unit.exercises)) score += e.score;
    for (const q of Object.values(unit.quiz)) score += q.score;
  }
  const unlocked = meta.order === 1 || prevDone;
  let status: UnitSummary['status'] = 'not-started';
  if (!unlocked) status = 'locked';
  else if (unit?.completedAt) status = 'completed';
  else if (unit && (Object.keys(unit.exercises).length || Object.keys(unit.quiz).length)) status = 'in-progress';

  return {
    meta,
    unit,
    score: Math.round(score * 100) / 100,
    maxScore: meta.points,
    percent: meta.points ? Math.round((score / meta.points) * 100) : 0,
    status,
    unlocked,
  };
}

export const $summaries = computed([$state, $unitsMeta], (state, metas) => {
  const ordered = [...metas].sort((a, b) => a.order - b.order);
  const out: UnitSummary[] = [];
  let prevDone = true; // unidad 1 siempre desbloqueada
  for (const meta of ordered) {
    const summary = summarizeUnit(state, meta, prevDone);
    out.push(summary);
    prevDone = summary.status === 'completed';
  }
  return out;
});

export const $totalScore = computed($summaries, (summaries) =>
  Math.round(summaries.reduce((sum, s) => sum + s.score, 0) * 100) / 100,
);

export const $totalMax = computed($summaries, (summaries) =>
  summaries.reduce((sum, s) => sum + s.maxScore, 0),
);

export const $globalPercent = computed([$totalScore, $totalMax], (score, max) =>
  max > 0 ? Math.round((score / max) * 100) : 0,
);

export const $isJourneyComplete = computed($state, (s) => Boolean(s?.completedAt));

/** Progreso de actividades del viaje (ejercicios + quiz respondidos). */
export const $activityProgress = computed([$state, $unitsMeta], (state, metas) => {
  let total = 0;
  let done = 0;
  for (const m of metas) {
    total += m.exerciseCount + m.quizCount;
    const u = state?.units[m.slug];
    if (!u) continue;
    done += Math.min(Object.keys(u.exercises).length, m.exerciseCount);
    done += Math.min(Object.keys(u.quiz).length, m.quizCount);
  }
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
});
