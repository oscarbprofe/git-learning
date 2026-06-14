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

/** Estado de sesión con bandera `checked`: false mientras Firebase aún resuelve
 * si hay sesión persistida; true una vez que respondió (con usuario o sin él).
 * Permite no mostrar el login "parpadeando" antes de saber si hay sesión. */
export function useSessionState(): { user: SessionUser | null; checked: boolean } {
  const [state, setState] = useState<{ user: SessionUser | null; checked: boolean }>({
    user: null,
    checked: false,
  });
  useEffect(() => {
    try {
      return onAuthChange((u) => setState({ user: u, checked: true }));
    } catch (err) {
      console.error('[git-challenge] onAuthChange falló:', err);
      setState({ user: null, checked: true });
      return undefined;
    }
  }, []);
  return state;
}

export function useSession(): SessionUser | null {
  return useSessionState().user;
}

export function useInitializedProgress(): {
  user: SessionUser | null;
  ready: boolean;
  error: string | null;
  authChecked: boolean;
} {
  const { user, checked: authChecked } = useSessionState();
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

  return { user, ready, error, authChecked };
}

export { useStore, $state, $unitsMeta };
