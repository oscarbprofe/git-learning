import { useEffect } from 'preact/hooks';
import { markSectionVisited } from '../../lib/progress';
import { useInitializedProgress } from './useProgress';
import type { ComponentChildren } from 'preact';

interface Props {
  unitSlug: string;
  children?: ComponentChildren;
}

/** Marca la sección "ejemplos" como visitada cuando se monta. */
export default function ExampleSection({ unitSlug, children }: Props) {
  const { user, ready } = useInitializedProgress();
  useEffect(() => {
    if (ready && user) void markSectionVisited(unitSlug, 'ejemplos');
  }, [ready, user?.email, unitSlug]);

  return <div class="example-marker">{children}</div>;
}
