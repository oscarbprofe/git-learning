import { useStore } from '@nanostores/preact';
import { $activityProgress } from '../../lib/progress';
import { useSession } from './useProgress';

export default function HeaderProgress() {
  const user = useSession();
  const prog = useStore($activityProgress);

  if (!user) return null;
  const remaining = prog.total - prog.done;

  return (
    <div class="header-progress" role="status" aria-live="polite">
      <div class="bar" aria-hidden="true">
        <div class="fill" style={`width: ${prog.percent}%`} />
      </div>
      <div class="label">
        <strong>{prog.percent}%</strong>
        <span class="muted">
          {' '}· Llevas {prog.done}/{prog.total} actividades
          {remaining > 0 ? ` · te faltan ${remaining}` : ' · ¡viaje completo!'}
        </span>
      </div>
      <style>{`
        .header-progress {
          flex: 1;
          min-width: 180px;
          max-width: 380px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .bar {
          height: 10px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 999px;
          overflow: hidden;
        }
        .fill {
          height: 100%;
          background: linear-gradient(90deg, var(--duoc-amarillo) 0%, var(--duoc-amarillo-oscuro) 100%);
          transition: width 0.4s ease;
          border-radius: 999px;
        }
        .label {
          font-size: var(--fs-xs);
          color: var(--duoc-blanco);
        }
        .muted { color: var(--duoc-gris-claro); }
        @media (max-width: 640px) { .header-progress { max-width: none; width: 100%; } }
      `}</style>
    </div>
  );
}
