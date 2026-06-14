/** Autenticación Firebase Email Link con allowlist institucional Duoc UC.
 *
 * Modo dev (PUBLIC_AUTH_DISABLED=true): salta Firebase y autentica como dev@duocuc.cl.
 * Producción: importa Firebase de forma dinámica al primer uso (no entra en el bundle
 * inicial del cliente cuando AUTH_DISABLED está activo).
 */

import { isInstitutionalEmail, ALLOWED_DOMAINS_LABEL } from './domains';

export interface SessionUser {
  name: string;
  email: string;
}

const PENDING_EMAIL_KEY = 'gc:pendingEmail';
const PENDING_NAME_KEY = 'gc:pendingName';

const env = (key: string): string | undefined =>
  (import.meta.env as Record<string, string | undefined>)[key];

const AUTH_DISABLED = env('PUBLIC_AUTH_DISABLED') === 'true';

const DEV_USER_FALLBACK: SessionUser = { name: 'Estudiante Demo', email: 'demo@duocuc.cl' };
const DEV_SESSION_KEY = 'gc:devSession';

/* ---------- Lazy Firebase (sólo en producción) ---------- */

type FirebaseAuthModule = typeof import('firebase/auth');
type FirebaseAppModule = typeof import('firebase/app');

interface FirebaseBundle {
  app: FirebaseAuthModule;
  appCore: FirebaseAppModule;
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
    import('firebase/app'),
    import('firebase/auth'),
  ]);

  const fbApp = appCore.initializeApp({ apiKey, authDomain, projectId, appId });
  const fbAuth = auth.getAuth(fbApp);
  await auth.setPersistence(fbAuth, auth.browserLocalPersistence).catch(() => {});

  _firebase = { app: auth, appCore, auth: fbAuth };
  return _firebase;
}

/* ---------- Helpers comunes ---------- */

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
      try {
        return JSON.parse(raw) as SessionUser;
      } catch {
        return null;
      }
    }
    return null;
  }
  // En producción no podemos resolverlo sincrónicamente — devolvemos null y el
  // caller debe escuchar onAuthChange.
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

  // Firebase real (lazy)
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

export async function sendLoginLink(name: string, email: string): Promise<void> {
  if (!name.trim()) throw new Error('NOMBRE_REQUERIDO');
  if (!isInstitutionalEmail(email)) throw new Error('DOMINIO_INVALIDO');

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedName = name.trim();

  if (AUTH_DISABLED) {
    const session: SessionUser = { name: normalizedName, email: normalizedEmail };
    window.sessionStorage.setItem(DEV_SESSION_KEY, JSON.stringify(session));
    window.dispatchEvent(new Event('gc:devauth'));
    return;
  }

  const { app, auth } = await getFirebase();
  window.localStorage.setItem(PENDING_EMAIL_KEY, normalizedEmail);
  window.localStorage.setItem(PENDING_NAME_KEY, normalizedName);

  await app.sendSignInLinkToEmail(auth, normalizedEmail, {
    url: window.location.origin + '/',
    handleCodeInApp: true,
  });
}

export async function completeLoginIfLink(): Promise<SessionUser | null> {
  if (typeof window === 'undefined' || AUTH_DISABLED) return null;

  const { app, auth } = await getFirebase();
  if (!app.isSignInWithEmailLink(auth, window.location.href)) return null;

  let email = window.localStorage.getItem(PENDING_EMAIL_KEY);
  if (!email) {
    email = window.prompt('Confirma tu correo institucional Duoc UC para completar el ingreso');
    if (!email) return null;
  }

  if (!isInstitutionalEmail(email)) {
    throw new Error(`DOMINIO_INVALIDO: solo ${ALLOWED_DOMAINS_LABEL}`);
  }

  const cred = await app.signInWithEmailLink(auth, email, window.location.href);
  if (!cred.user.email || !isInstitutionalEmail(cred.user.email)) {
    await app.signOut(auth);
    throw new Error('DOMINIO_INVALIDO');
  }

  const pendingName = window.localStorage.getItem(PENDING_NAME_KEY);
  if (pendingName && !cred.user.displayName) {
    await app.updateProfile(cred.user, { displayName: pendingName });
  }

  window.localStorage.removeItem(PENDING_EMAIL_KEY);
  window.localStorage.removeItem(PENDING_NAME_KEY);

  try {
    window.history.replaceState({}, document.title, window.location.pathname);
  } catch {
    /* noop */
  }

  return userFromFirebase(cred.user);
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

// Suprime el warning de variable no usada (lo dejamos disponible si en el futuro
// queremos mostrar un fallback de usuario por defecto).
void DEV_USER_FALLBACK;
