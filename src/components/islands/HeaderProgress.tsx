import { useStore } from '@nanostores/preact';
import { $activityProgress } from '../../lib/progress';
import { useSession } from './useProgress';

export default function HeaderProgress() {
  const user = useSession();
  const prog = useStore($activityProgress);

  if (!user) return null;
  const remaining = prog.total - prog.done;

  return (
    <div class="hp-row">
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
      </div>

      <a href="/resumen" class="btn btn-primary resumen-btn" aria-label="Ver resumen e informe">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="M6 2h9l5 5v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm8 1.5V8h4.5L14 3.5zM8 12h8v1.6H8V12zm0 3.4h8V17H8v-1.6zM8 8.6h4v1.6H8V8.6z"/>
        </svg>
        <span class="resumen-text">Ver mi resumen e informe</span>
      </a>

      <style>{`
        .hp-row {
          display: flex;
          align-items: center;
          gap: var(--sp-3);
          width: 100%;
          max-width: 560px;
        }
        .header-progress {
          flex: 1;
          min-width: 0;
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

        /* Reutiliza .btn .btn-primary del sistema de diseño; sólo ajusta el
         * tamaño para que calce en la altura del header. */
        .resumen-btn {
          flex-shrink: 0;
          padding: 8px 16px;
          font-size: var(--fs-sm);
          white-space: nowrap;
        }

        @media (max-width: 640px) {
          .resumen-btn .resumen-text { display: none; }
          .resumen-btn { padding: 8px; }
        }
      `}</style>
    </div>
  );
}
