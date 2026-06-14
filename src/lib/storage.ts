/** Esquema localStorage v1 con hash de integridad SHA-256. */

export interface ExerciseResult {
  answer: string;
  attempts: number;
  correct: boolean;
  score: number;
  maxScore: number;
  answeredAt: string;
}

export interface QuizResult {
  selected: string;
  correct: boolean;
  score: number;
  maxScore: number;
  answeredAt: string;
}

export interface UnitProgress {
  sectionsVisited: string[];
  exercises: Record<string, ExerciseResult>;
  quiz: Record<string, QuizResult>;
  completedAt: string | null;
}

export interface ProgressState {
  version: 1;
  student: { name: string; email: string };
  startedAt: string;
  lastActivityAt: string;
  completedAt: string | null;
  units: Record<string, UnitProgress>;
  integrity?: string;
}

const SCHEMA_VERSION = 1;
const INTEGRITY_SALT = 'gitchallenge-duoc-2026';

export function storageKey(email: string): string {
  return `gitchallenge:v1:${email.toLowerCase()}`;
}

export function emptyState(student: { name: string; email: string }): ProgressState {
  const now = new Date().toISOString();
  return {
    version: SCHEMA_VERSION,
    student,
    startedAt: now,
    lastActivityAt: now,
    completedAt: null,
    units: {},
  };
}

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text + INTEGRITY_SALT);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function stripIntegrity(state: ProgressState): ProgressState {
  const { integrity: _i, ...rest } = state;
  return rest as ProgressState;
}

export async function computeIntegrity(state: ProgressState): Promise<string> {
  return sha256(JSON.stringify(stripIntegrity(state)));
}

export async function verifyIntegrity(state: ProgressState): Promise<boolean> {
  if (!state.integrity) return false;
  const expected = await computeIntegrity(state);
  return expected === state.integrity;
}

export async function loadState(email: string): Promise<ProgressState | null> {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(storageKey(email));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ProgressState;
    if (parsed.version !== SCHEMA_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveState(state: ProgressState): Promise<void> {
  if (typeof window === 'undefined') return;
  const updated: ProgressState = { ...state, lastActivityAt: new Date().toISOString() };
  updated.integrity = await computeIntegrity(updated);
  window.localStorage.setItem(storageKey(state.student.email), JSON.stringify(updated));
}

export function clearState(email: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(storageKey(email));
}

export function getOrCreateState(student: {
  name: string;
  email: string;
}): Promise<ProgressState> {
  return loadState(student.email).then((existing) => {
    if (existing) {
      // refrescar nombre por si cambió
      if (existing.student.name !== student.name) {
        existing.student.name = student.name;
      }
      return existing;
    }
    const fresh = emptyState(student);
    return saveState(fresh).then(() => fresh);
  });
}

export function ensureUnit(state: ProgressState, unitSlug: string): UnitProgress {
  if (!state.units[unitSlug]) {
    state.units[unitSlug] = {
      sectionsVisited: [],
      exercises: {},
      quiz: {},
      completedAt: null,
    };
  }
  return state.units[unitSlug];
}
