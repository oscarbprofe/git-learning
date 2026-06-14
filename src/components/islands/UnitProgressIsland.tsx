import { useStore } from '@nanostores/preact';
import { $summaries } from '../../lib/progress';
import { useInitializedProgress } from './useProgress';

interface Props {
  unitSlug: string;
}

export default function UnitProgressIsland({ unitSlug }: Props) {
  const { user, ready, error } = useInitializedProgress();
  const summaries = useStore($summaries);

  if (!user || !ready || error) return null;
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

  const exDone = Object.keys(summary.unit?.exercises ?? {}).length;
  const qDone = Object.keys(summary.unit?.quiz ?? {}).length;
  const exTotal = summary.meta.exerciseCount;
  const qTotal = summary.meta.quizCount;
  const completed = summary.status === 'completed';

  return (
    <nav class="unit-stepper" aria-label="Progreso de la unidad">
      <a href="#ejercicios" class={`step ${exDone >= exTotal ? 'done' : ''}`}>
        <span class="dot" aria-hidden="true">{exDone >= exTotal ? '✓' : '·'}</span>
        <span>Ejercicios <strong>{exDone}/{exTotal}</strong></span>
      </a>
      <a href="#quiz" class={`step ${qDone >= qTotal ? 'done' : ''}`}>
        <span class="dot" aria-hidden="true">{qDone >= qTotal ? '✓' : '·'}</span>
        <span>Quiz <strong>{qDone}/{qTotal}</strong></span>
      </a>

      {completed && (
        <span class="unit-complete-badge">✓ Unidad completada</span>
      )}

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
        .unit-complete-badge {
          font-size: var(--fs-sm); font-weight: 700;
          color: #2e7d32; background: #eaf6ea;
          padding: 6px 12px; border-radius: 999px;
          border: 1px solid #c8e6c9;
        }
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
