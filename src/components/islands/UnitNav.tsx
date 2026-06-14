import { useStore } from '@nanostores/preact';
import { $summaries } from '../../lib/progress';
import { useInitializedProgress } from './useProgress';

interface Props {
  unitSlug: string;
  order: number;
}

export default function UnitNav({ unitSlug, order }: Props) {
  const { user, ready } = useInitializedProgress();
  const summaries = useStore($summaries);
  if (!user || !ready) return null;

  const current = summaries.find((s) => s.meta.slug === unitSlug);
  const next = summaries.find((s) => s.meta.order === order + 1);
  const prev = summaries.find((s) => s.meta.order === order - 1);

  const canGoNext = next && next.unlocked;
  const nextWaiting = next && !next.unlocked;

  return (
    <nav class="unit-nav" aria-label="Navegación entre unidades">
      {prev ? (
        <a href={`/unidades/${prev.meta.slug}`} class="btn btn-ghost">
          ← Unidad {prev.meta.order}: {prev.meta.title}
        </a>
      ) : (
        <a href="/" class="btn btn-ghost">← Mapa del viaje</a>
      )}

      {current?.status === 'completed' ? (
        canGoNext ? (
          <a href={`/unidades/${next.meta.slug}`} class="btn btn-primary">
            Continuar a Unidad {next.meta.order} →
          </a>
        ) : (
          <a href="/resumen" class="btn btn-primary">Ver mi resumen e informe →</a>
        )
      ) : nextWaiting ? (
        <div class="hint">
          Completa todas las actividades de esta unidad para desbloquear la Unidad {next.meta.order}.
        </div>
      ) : null}

      <style>{`
        .unit-nav {
          display: flex; gap: var(--sp-3); justify-content: space-between;
          align-items: center; flex-wrap: wrap;
          margin-top: var(--sp-8);
          padding-top: var(--sp-5);
          border-top: 1px solid var(--color-border);
        }
        .hint {
          color: var(--color-text-soft);
          font-size: var(--fs-sm);
          font-style: italic;
        }
      `}</style>
    </nav>
  );
}
