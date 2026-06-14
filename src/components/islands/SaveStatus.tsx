import { useStore } from '@nanostores/preact';
import { $saveStatus } from '../../lib/progress';
import { useSession } from './useProgress';

/** Indicador discreto del estado de sincronización con Firestore. */
export default function SaveStatus() {
  const user = useSession();
  const status = useStore($saveStatus);

  if (!user || status === 'idle') return null;

  const config = {
    saving: { icon: '⟳', text: 'Guardando…', cls: 'saving' },
    saved: { icon: '✓', text: 'Guardado', cls: 'saved' },
    error: { icon: '⚠', text: 'Sin guardar — revisa tu conexión', cls: 'error' },
  }[status];

  return (
    <div class={`save-status ${config.cls}`} role="status" aria-live="polite">
      <span class="icon" aria-hidden="true">{config.icon}</span>
      <span class="text">{config.text}</span>
      <style>{`
        .save-status {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: var(--fs-xs); font-weight: 700;
          padding: 4px 10px; border-radius: 999px;
          white-space: nowrap;
        }
        .save-status .icon { font-size: 0.9rem; line-height: 1; }
        .saving { background: rgba(255,255,255,0.12); color: var(--duoc-gris-claro); }
        .saving .icon { animation: spin 1s linear infinite; }
        .saved { background: rgba(102,187,106,0.18); color: #a5d6a7; }
        .error { background: rgba(239,83,80,0.2); color: #ef9a9a; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .save-status .text { display: none; }
        }
      `}</style>
    </div>
  );
}
