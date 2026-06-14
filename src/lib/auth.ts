/** Autenticación Firebase Google OAuth con allowlist institucional Duoc UC.
 *
 * Modo dev (PUBLIC_AUTH_DISABLED=true): salta Firebase y autentica como dev@duocuc.cl.
 */

import { isInstitutionalEmail, ALLOWED_DOMAINS_LABEL } from './domains';

export interface SessionUser {
  name: string;
  email: string;
}

const env = (key: string): string | undefined =>
  (import.meta.env as Record<string, string | undefined>)[key];

const AUTH_DISABLED = env('PUBLIC_AUTH_DISABLED') === 'true';

const DEV_SESSION_KEY = 'gc:devSession';

/* ---------- Lazy Firebase ---------- */

type FirebaseAuthModule = typeof import('firebase/auth');
type FirebaseAppModule = typeof import('firebase/app');

interface FirebaseBundle {
  app: FirebaseAuthModule;
  auth: ReturnType<FirebaseAuthModule['getAuth']>;
}

let _firebase: FirebaseBundle | null = null;
let _firebaseInitError: Error | null = null;

async function getFirebase(): Promise<FirebaseBundle> {
  if (_firebase) return _firebase;
  if (_firebaseInitError) throw _firebaseInitError;

  const apiKey = env('PUBLIC_FIREBASE_API_KEY');
  const authDomain = env('PUBLIC_FIREBASE_AUTH_DOMAIN');
  const projectId = env('PUBLIC_FIREBASE_PROJECT_ID');
  const appId = env('PUBLIC_FIREBASE_APP_ID');

  if (!apiKey || !authDomain || !projectId || !appId) {
    _firebaseInitError = new Error(
      'Faltan variables PUBLIC_FIREBASE_*. Define el .env o activa PUBLIC_AUTH_DISABLED=true en desarrollo.',
    );
    throw _firebaseInitError;
  }

  const [appCore, auth] = await Promise.all([
    import('firebase/app') as Promise<FirebaseAppModule>,
    import('firebase/auth') as Promise<FirebaseAuthModule>,
  ]);

  const fbApp = appCore.initializeApp({ apiKey, authDomain, projectId, appId });
  const fbAuth = auth.getAuth(fbApp);
  await auth.setPersistence(fbAuth, auth.browserLocalPersistence).catch(() => {});

  _firebase = { app: auth, auth: fbAuth };
  return _firebase;
}

/* ---------- Helpers ---------- */

function userFromFirebase(u: { email: string | null; displayName: string | null } | null): SessionUser | null {
  if (!u || !u.email) return null;
  return { name: u.displayName ?? u.email.split('@')[0], email: u.email };
}

export function isAuthDisabled(): boolean {
  return AUTH_DISABLED;
}

/* ---------- API pública ---------- */

export function getCurrentUser(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  if (AUTH_DISABLED) {
    const raw = window.sessionStorage.getItem(DEV_SESSION_KEY);
    if (raw) {
      try { return JSON.parse(raw) as SessionUser; } catch { return null; }
    }
    return null;
  }
  return null;
}

export function onAuthChange(cb: (user: SessionUser | null) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  if (AUTH_DISABLED) {
    cb(getCurrentUser());
    const handler = () => cb(getCurrentUser());
    window.addEventListener('storage', handler);
    window.addEventListener('gc:devauth', handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('gc:devauth', handler);
    };
  }

  let unsubscribe: (() => void) | null = null;
  let cancelled = false;
  void getFirebase()
    .then(({ app, auth }) => {
      if (cancelled) return;
      unsubscribe = app.onAuthStateChanged(auth, (u) => cb(userFromFirebase(u)));
    })
    .catch(() => cb(null));

  return () => {
    cancelled = true;
    if (unsubscribe) unsubscribe();
  };
}

export async function signInWithGoogle(): Promise<SessionUser> {
  if (AUTH_DISABLED) {
    const email = 'dev@duocuc.cl';
    const session: SessionUser = { name: 'Estudiante Demo', email };
    window.sessionStorage.setItem(DEV_SESSION_KEY, JSON.stringify(session));
    window.dispatchEvent(new Event('gc:devauth'));
    return session;
  }

  const { app, auth } = await getFirebase();
  const { GoogleAuthProvider, signInWithPopup } = app;

  const provider = new GoogleAuthProvider();

  const cred = await signInWithPopup(auth, provider);
  const email = cred.user.email ?? '';

  if (!isInstitutionalEmail(email)) {
    await app.signOut(auth);
    throw new Error(`DOMINIO_INVALIDO: solo ${ALLOWED_DOMAINS_LABEL}`);
  }

  return userFromFirebase(cred.user)!;
}

export async function signOut(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (AUTH_DISABLED) {
    window.sessionStorage.removeItem(DEV_SESSION_KEY);
    window.dispatchEvent(new Event('gc:devauth'));
    return;
  }
  const { app, auth } = await getFirebase();
  await app.signOut(auth);
}
