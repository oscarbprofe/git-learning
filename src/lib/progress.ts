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
  sections: string[]; // ej. ['conceptos', 'ejemplos', 'ejercicios', 'quiz']
}

export const $state = atom<ProgressState | null>(null);
export const $unitsMeta = atom<UnitMeta[]>([]);

export async function initProgressForUser(user: SessionUser, units: UnitMeta[]): Promise<void> {
  $unitsMeta.set(units);
  const st = await getOrCreateState(user);
  $state.set(st);
}

export function clearProgress(): void {
  const s = $state.get();
  if (s) clearState(s.student.email);
  $state.set(null);
}

async function commit(mutator: (state: ProgressState) => void): Promise<void> {
  const current = $state.get();
  if (!current) return;
  const next: ProgressState = JSON.parse(JSON.stringify(current));
  mutator(next);
  await saveState(next);
  $state.set(next);
}

/* ------- mutaciones ------- */

export async function markSectionVisited(unitSlug: string, section: string): Promise<void> {
  await commit((s) => {
    const u = ensureUnit(s, unitSlug);
    if (!u.sectionsVisited.includes(section)) u.sectionsVisited.push(section);
    maybeCompleteUnit(s, unitSlug);
    maybeCompleteJourney(s);
  });
}

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

  const allSections = meta.sections.every((s) => u.sectionsVisited.includes(s));
  const allExercises = Object.keys(u.exercises).length >= meta.exerciseCount;
  const allQuiz = Object.keys(u.quiz).length >= meta.quizCount;

  if (allSections && allExercises && allQuiz && !u.completedAt) {
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
  else if (unit && (unit.sectionsVisited.length > 0 || Object.keys(unit.exercises).length || Object.keys(unit.quiz).length)) status = 'in-progress';

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

/** Progreso de actividades del viaje (secciones visitadas + ejercicios + quiz). */
export const $activityProgress = computed([$state, $unitsMeta], (state, metas) => {
  let total = 0;
  let done = 0;
  for (const m of metas) {
    total += m.sections.length + m.exerciseCount + m.quizCount;
    const u = state?.units[m.slug];
    if (!u) continue;
    done += u.sectionsVisited.length + Object.keys(u.exercises).length + Object.keys(u.quiz).length;
  }
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
});
