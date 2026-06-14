/** Hook unificado para inicializar progreso + estado de usuario en las islas Preact. */
import { useEffect, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { onAuthChange, type SessionUser } from '../../lib/auth';
import {
  initProgressForUser,
  $state,
  $unitsMeta,
  $loadError,
  resetLocalState,
} from '../../lib/progress';
import { UNITS_META } from '../../lib/unitsMeta';

/** Deduplica la inicialización entre las múltiples islas montadas en la misma
 * página: todas comparten la misma promesa de carga por email. */
let _initEmail: string | null = null;
let _initPromise: Promise<void> | null = null;

function initOnce(user: SessionUser): Promise<void> {
  if (_initEmail === user.email && _initPromise) return _initPromise;
  _initEmail = user.email;
  _initPromise = initProgressForUser(user, UNITS_META);
  return _initPromise;
}

export function useSession(): SessionUser | null {
  const [user, setUser] = useState<SessionUser | null>(null);
  useEffect(() => {
    try {
      return onAuthChange(setUser);
    } catch (err) {
      console.error('[git-challenge] onAuthChange falló:', err);
      return undefined;
    }
  }, []);
  return user;
}

export function useInitializedProgress(): {
  user: SessionUser | null;
  ready: boolean;
  error: string | null;
} {
  const user = useSession();
  const [ready, setReady] = useState(false);
  const error = useStore($loadError);

  useEffect(() => {
    let cancelled = false;
    try {
      if (!user) {
        $unitsMeta.set(UNITS_META);
        _initEmail = null;
        _initPromise = null;
        $loadError.set(null);
        resetLocalState(); // solo memoria; NO borra Firestore
        setReady(false);
        return;
      }
      setReady(false);
      initOnce(user)
        .then(() => {
          if (!cancelled) setReady(true);
        })
        .catch((err: unknown) => {
          console.error('[git-challenge] initProgressForUser falló:', err);
          // El init ya registró el mensaje en $loadError; marcamos ready para
          // que las islas rendericen el estado de error (no spinner infinito).
          if (!cancelled) setReady(true);
        });
    } catch (err) {
      console.error('[git-challenge] init progress falló:', err);
    }
    return () => {
      cancelled = true;
    };
  }, [user?.email]);

  return { user, ready, error };
}

export { useStore, $state, $unitsMeta };
