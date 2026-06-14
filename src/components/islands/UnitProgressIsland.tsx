import { useStore } from '@nanostores/preact';
import { $summaries } from '../../lib/progress';
import { useInitializedProgress } from './useProgress';
import { useEffect } from 'preact/hooks';
import { markSectionVisited } from '../../lib/progress';

interface Props {
  unitSlug: string;
}

const SECTION_LABELS: Record<string, string> = {
  conceptos: 'Conceptos',
  ejemplos: 'Ejemplos',
  ejercicios: 'Ejercicios',
  quiz: 'Quiz',
};

export default function UnitProgressIsland({ unitSlug }: Props) {
  const { user, ready } = useInitializedProgress();
  const summaries = useStore($summaries);

  // Marcar "conceptos" como visitada automáticamente al cargar la unidad,
  // ya que esta página renderiza la teoría introductoria.
  useEffect(() => {
    if (ready && user) {
      void markSectionVisited(unitSlug, 'conceptos');
    }
  }, [ready, user?.email, unitSlug]);

  if (!user || !ready) return null;
  const summary = summaries.find((s) => s.meta.slug === unitSlug);
  if (!summary) return null;
  if (summary.status === 'locked') {
    return (
      <div class="locked-banner">
        🔒 Esta unidad está bloqueada. Completa la unidad anterior para desbloquearla.
        <a href="/" class="btn btn-secondary">Volver al mapa</a>
      </div>
    );
  }

  const visited = new Set(summary.unit?.sectionsVisited ?? []);

  return (
    <nav class="unit-stepper" aria-label="Secciones de la unidad">
      {Object.entries(SECTION_LABELS).map(([key, label]) => {
        const done = visited.has(key);
        return (
          <a href={`#${key}`} class={`step ${done ? 'done' : ''}`}>
            <span class="dot" aria-hidden="true">{done ? '✓' : '·'}</span>
            <span>{label}</span>
          </a>
        );
      })}
      <div class="unit-score">
        <strong>{summary.score.toFixed(1)}</strong>/{summary.maxScore} pts
      </div>
      <style>{`
        .unit-stepper {
          display: flex; gap: var(--sp-2); flex-wrap: wrap;
          padding: var(--sp-3); margin: var(--sp-4) 0;
          background: var(--duoc-gris-fondo);
          border-radius: var(--radius-md);
          align-items: center;
        }
        .step {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 12px; border-radius: 999px;
          background: white; text-decoration: none; color: var(--color-text);
          font-size: var(--fs-sm); font-weight: 700;
          border: 1px solid var(--color-border);
        }
        .step .dot {
          width: 18px; height: 18px; border-radius: 50%;
          background: var(--duoc-gris-claro); color: white;
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 0.7rem;
        }
        .step.done .dot { background: var(--color-success); }
        .step.done { background: #eaf6ea; border-color: #c8e6c9; }
        .unit-score {
          margin-left: auto;
          color: var(--color-text-soft);
          font-size: var(--fs-sm);
        }
        .locked-banner {
          padding: var(--sp-4); background: #fff4e5;
          border-left: 4px solid var(--color-warning);
          border-radius: var(--radius-md);
          display: flex; align-items: center; gap: var(--sp-3); flex-wrap: wrap;
        }
      `}</style>
    </nav>
  );
}
