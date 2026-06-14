import { useStore } from '@nanostores/preact';
import {
  $summaries,
  $totalScore,
  $totalMax,
  $globalPercent,
  $isJourneyComplete,
  $state,
  clearProgress,
} from '../../lib/progress';
import { pctToNota, notaLabel } from '../../lib/scoring';
import { useInitializedProgress } from './useProgress';
import LoginCard from './LoginCard';
import { useState } from 'preact/hooks';
import { computeIntegrity } from '../../lib/storage';
import type { ActivityCatalog } from '../../lib/pdf';

interface Props {
  catalog: ActivityCatalog;
}

export default function SummaryView({ catalog }: Props) {
  const { user, ready, error, authChecked } = useInitializedProgress();
  const summaries = useStore($summaries);
  const totalScore = useStore($totalScore);
  const totalMax = useStore($totalMax);
  const pct = useStore($globalPercent);
  const isComplete = useStore($isJourneyComplete);
  const state = useStore($state);

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  if (!authChecked) return <p class="loading">Cargando…</p>;
  if (!user) return <LoginCard />;
  if (error) {
    return (
      <div role="alert" style="text-align:center;padding:2rem;background:#ffebee;color:#c62828;border-radius:12px;">
        <p>⚠ {error}</p>
        <button type="button" class="btn btn-primary" onClick={() => location.reload()}>
          Reintentar
        </button>
      </div>
    );
  }
  if (!ready || !state) return <p class="loading">Cargando…</p>;

  const nota = pctToNota(pct);
  const completedCount = summaries.filter((s) => s.status === 'completed').length;

  async function handleExport() {
    if (!state) return;
    setExporting(true);
    setExportError(null);
    try {
      const { exportReport } = await import('../../lib/pdf');
      const { recordReport } = await import('../../lib/storage');
      const integrityHash = await computeIntegrity(state);
      await exportReport({
        state,
        metas: summaries.map((s) => s.meta),
        summaries,
        catalog,
        totalScore,
        totalMax,
        integrityHash,
      });
      // Guarda el sello de esta exportación en Firestore (auditoría/verificación).
      await recordReport(state.student.email, {
        hash: integrityHash,
        at: new Date().toISOString(),
        pct,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[git-challenge] Error al generar el PDF:', err);
      setExportError(`No se pudo generar el PDF: ${msg}`);
    } finally {
      setExporting(false);
    }
  }

  async function handleReset() {
    if (
      confirm(
        '¿Reiniciar todo tu avance? Esta acción no se puede deshacer. Tu cuenta no cambia, sólo tus respuestas guardadas.',
      ) &&
      confirm('Confirmación final: se borrarán todas las respuestas guardadas.')
    ) {
      await clearProgress();
      location.reload();
    }
  }

  return (
    <div class="summary">
      <header class="hero">
        <div class="hero-left">
          <h1>Resumen del viaje</h1>
          <p class="muted">
            {isComplete
              ? '¡Felicitaciones! Has completado el viaje completo. La nota mostrada es tu nota final.'
              : 'Aquí ves tu avance actualizado. La nota se actualiza con cada respuesta. Puedes descargar el informe parcial cuando quieras.'}
          </p>
        </div>

        <div class={`nota-box ${isComplete ? 'final' : 'provisoria'}`}>
          <div class="label">{notaLabel(isComplete).toUpperCase()}</div>
          <div class="value">{nota.toFixed(1)}</div>
          <div class="sub">
            {totalScore.toFixed(1)} / {totalMax} pts · {pct}%
          </div>
          <div class="rule">Exigencia 60% — nota 4.0 con 60 puntos</div>
        </div>
      </header>

      <section class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Unidad</th>
              <th>Estado</th>
              <th>Puntaje</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((s) => (
              <tr>
                <td>{s.meta.order}</td>
                <td>
                  <a href={`/unidades/${s.meta.slug}`}>{s.meta.title}</a>
                </td>
                <td>
                  <span class={`badge badge-${statusBadge(s.status)}`}>
                    {statusLabel(s.status)}
                  </span>
                </td>
                <td>
                  <strong>{s.score.toFixed(1)}</strong> / {s.maxScore}
                </td>
                <td>{s.percent}%</td>
              </tr>
            ))}
            <tr class="total">
              <td colSpan={2}>
                <strong>TOTAL</strong>
              </td>
              <td>{completedCount}/{summaries.length} unidades</td>
              <td>
                <strong>{totalScore.toFixed(1)}</strong> / {totalMax}
              </td>
              <td>
                <strong>{pct}%</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="actions">
        <button
          type="button"
          class="btn btn-primary"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? 'Generando PDF…' : isComplete ? 'Descargar informe final (PDF)' : 'Descargar informe parcial (PDF)'}
        </button>
        <a href="/" class="btn btn-secondary">Volver al mapa</a>
        <button type="button" class="btn btn-ghost reset" onClick={handleReset}>
          Reiniciar mi avance
        </button>
      </section>

      {exportError && (
        <div class="export-error" role="alert">⚠ {exportError}</div>
      )}

      <p class="footnote">
        El informe descargado se rotula como <strong>parcial</strong> mientras tu viaje no esté
        100% completo, e incluye el detalle de respuestas hasta el punto actual.
      </p>

      <style>{`
        .summary { display: flex; flex-direction: column; gap: var(--sp-6); }
        .export-error {
          background: #ffebee; color: var(--color-error);
          border: 1px solid #ef9a9a; border-radius: var(--radius-md);
          padding: var(--sp-3) var(--sp-4); font-size: var(--fs-sm);
        }
        .hero {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: var(--sp-5);
          align-items: stretch;
        }
        .hero h1 { margin-bottom: var(--sp-2); }
        .muted { color: var(--color-text-soft); }
        .nota-box {
          padding: var(--sp-4) var(--sp-5);
          border-radius: var(--radius-lg);
          border: 3px solid var(--duoc-amarillo);
          background: #fffbf0;
          min-width: 220px;
          text-align: center;
        }
        .nota-box .label {
          font-size: var(--fs-xs); text-transform: uppercase;
          letter-spacing: 0.05em; color: var(--color-text-soft); font-weight: 700;
        }
        .nota-box .value {
          font-family: var(--font-serif); font-weight: 900;
          font-size: 3.5rem; color: var(--duoc-negro); line-height: 1;
          margin: 4px 0;
        }
        .nota-box .sub { font-size: var(--fs-sm); font-weight: 700; }
        .nota-box .rule { font-size: var(--fs-xs); color: var(--color-text-soft); margin-top: 6px; }
        .nota-box.final { border-color: var(--color-success); background: #f3fbf3; }

        .table-wrap { overflow-x: auto; }
        table { background: white; border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; }
        td a { color: var(--duoc-negro); font-weight: 700; }
        tr.total { background: var(--duoc-amarillo); }
        tr.total td { font-size: var(--fs-md); }

        .actions { display: flex; gap: var(--sp-3); flex-wrap: wrap; }
        .actions .reset { color: var(--color-error); margin-left: auto; }

        .footnote {
          color: var(--color-text-soft);
          font-size: var(--fs-sm); font-style: italic;
        }

        @media (max-width: 720px) {
          .hero { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

function statusLabel(s: string): string {
  if (s === 'completed') return 'Completada';
  if (s === 'in-progress') return 'En curso';
  if (s === 'locked') return 'Bloqueada';
  return 'No iniciada';
}

function statusBadge(s: string): string {
  if (s === 'completed') return 'success';
  if (s === 'in-progress') return 'warning';
  if (s === 'locked') return 'neutral';
  return 'info';
}
