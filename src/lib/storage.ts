/** Persistencia en Firestore (con fallback a localStorage si Firebase no está configurado). */

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
}

const SCHEMA_VERSION = 1;

const env = (key: string): string | undefined =>
  (import.meta.env as Record<string, string | undefined>)[key];

/* ---------- Firestore lazy init ---------- */

type FirestoreModule = typeof import('firebase/firestore');
type AppModule = typeof import('firebase/app');

interface FirestoreBundle {
  db: ReturnType<FirestoreModule['getFirestore']>;
  fs: FirestoreModule;
}

let _bundle: FirestoreBundle | null = null;
let _bundleError: Error | null = null;

async function getFirestore(): Promise<FirestoreBundle> {
  if (_bundle) return _bundle;
  if (_bundleError) throw _bundleError;

  const apiKey = env('PUBLIC_FIREBASE_API_KEY');
  const authDomain = env('PUBLIC_FIREBASE_AUTH_DOMAIN');
  const projectId = env('PUBLIC_FIREBASE_PROJECT_ID');
  const appId = env('PUBLIC_FIREBASE_APP_ID');

  if (!apiKey || !authDomain || !projectId || !appId) {
    _bundleError = new Error('Faltan variables PUBLIC_FIREBASE_*');
    throw _bundleError;
  }

  const [appCore, fs] = await Promise.all([
    import('firebase/app') as Promise<AppModule>,
    import('firebase/firestore') as Promise<FirestoreModule>,
  ]);

  // Reutiliza la app Firebase si ya fue inicializada por auth.ts
  let fbApp;
  try {
    fbApp = appCore.getApp();
  } catch {
    fbApp = appCore.initializeApp({ apiKey, authDomain, projectId, appId });
  }

  const db = fs.getFirestore(fbApp);
  _bundle = { db, fs };
  return _bundle;
}

/* ---------- Helpers ---------- */

function docPath(email: string) {
  return `students/${email.toLowerCase()}`;
}

function localKey(email: string) {
  return `gitchallenge:v1:${email.toLowerCase()}`;
}

/** ¿Está Firebase configurado? Si no, se opera en modo dev con localStorage. */
function isFirebaseConfigured(): boolean {
  return Boolean(
    env('PUBLIC_FIREBASE_API_KEY') &&
      env('PUBLIC_FIREBASE_AUTH_DOMAIN') &&
      env('PUBLIC_FIREBASE_PROJECT_ID') &&
      env('PUBLIC_FIREBASE_APP_ID'),
  );
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

/* ---------- API pública ---------- */

function loadLocal(email: string): ProgressState | null {
  const raw = window.localStorage.getItem(localKey(email));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ProgressState;
    if (parsed.version !== SCHEMA_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function loadState(email: string): Promise<ProgressState | null> {
  if (typeof window === 'undefined') return null;

  // Modo dev sin Firebase: localStorage.
  if (!isFirebaseConfigured()) return loadLocal(email);

  // Producción: Firestore. Los errores se PROPAGAN para que la UI los muestre
  // (no caemos a localStorage en silencio, lo que rompería la sincronización).
  const { db, fs } = await getFirestore();
  const ref = fs.doc(db, docPath(email));
  const snap = await fs.getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as ProgressState;
  if (data.version !== SCHEMA_VERSION) return null;
  return data;
}

export async function saveState(state: ProgressState): Promise<void> {
  if (typeof window === 'undefined') return;
  const updated: ProgressState = { ...state, lastActivityAt: new Date().toISOString() };

  if (!isFirebaseConfigured()) {
    window.localStorage.setItem(localKey(state.student.email), JSON.stringify(updated));
    return;
  }

  const { db, fs } = await getFirestore();
  const ref = fs.doc(db, docPath(state.student.email));
  await fs.setDoc(ref, updated); // si falla (offline), el error sube al llamador
}

export async function clearState(email: string): Promise<void> {
  if (typeof window === 'undefined') return;

  if (!isFirebaseConfigured()) {
    window.localStorage.removeItem(localKey(email));
    return;
  }

  const { db, fs } = await getFirestore();
  const ref = fs.doc(db, docPath(email));
  await fs.deleteDoc(ref);
}

export async function getOrCreateState(student: {
  name: string;
  email: string;
}): Promise<ProgressState> {
  const existing = await loadState(student.email);
  if (existing) {
    if (existing.student.name !== student.name) {
      existing.student.name = student.name;
    }
    return existing;
  }
  const fresh = emptyState(student);
  await saveState(fresh);
  return fresh;
}

export function ensureUnit(state: ProgressState, unitSlug: string): UnitProgress {
  if (!state.units[unitSlug]) {
    state.units[unitSlug] = {
      exercises: {},
      quiz: {},
      completedAt: null,
    };
  }
  return state.units[unitSlug];
}

/* ---------- Sello de integridad para el informe PDF ---------- */

const INTEGRITY_SALT = 'gitchallenge-duoc-2026';

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text + INTEGRITY_SALT);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Hash del estado de progreso usado como sello de verificación en el PDF. */
export async function computeIntegrity(state: ProgressState): Promise<string> {
  const { integrity: _omit, ...rest } = state as ProgressState & { integrity?: string };
  return sha256(JSON.stringify(rest));
}
