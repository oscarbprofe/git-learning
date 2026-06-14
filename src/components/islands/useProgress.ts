/** Hook unificado para inicializar progreso + estado de usuario en las islas Preact. */
import { useEffect, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { onAuthChange, type SessionUser } from '../../lib/auth';
import { initProgressForUser, $state, $unitsMeta, clearProgress } from '../../lib/progress';
import { UNITS_META } from '../../lib/unitsMeta';

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
} {
  const user = useSession();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    try {
      if (!user) {
        $unitsMeta.set(UNITS_META);
        clearProgress();
        setReady(false);
        return;
      }
      setReady(false);
      initProgressForUser(user, UNITS_META)
        .then(() => {
          if (!cancelled) setReady(true);
        })
        .catch((err: unknown) => {
          console.error('[git-challenge] initProgressForUser falló:', err);
          if (!cancelled) setReady(true); // muestra UI igual con estado vacío
        });
    } catch (err) {
      console.error('[git-challenge] init progress falló:', err);
    }
    return () => {
      cancelled = true;
    };
  }, [user?.email]);

  return { user, ready };
}

export { useStore, $state, $unitsMeta };
