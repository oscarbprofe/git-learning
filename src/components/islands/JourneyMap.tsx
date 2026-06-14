import { useStore } from '@nanostores/preact';
import { $summaries } from '../../lib/progress';
import { useInitializedProgress } from './useProgress';
import LoginCard from './LoginCard';

export default function JourneyMap() {
  const { user, ready, error, authChecked } = useInitializedProgress();
  const summaries = useStore($summaries);

  // Mientras Firebase aún resuelve si hay sesión, mostramos carga (no el login),
  // para que al volver al mapa no parpadee el botón de Google.
  if (!authChecked) {
    return <p class="loading">Cargando tu avance…</p>;
  }
  if (!user) {
    return <LoginCard />;
  }
  if (error) {
    return (
      <div class="load-error" role="alert">
        <p>⚠ {error}</p>
        <button type="button" class="btn btn-primary" onClick={() => location.reload()}>
          Reintentar
        </button>
        <style>{`
          .load-error {
            text-align: center; padding: var(--sp-6);
            background: #ffebee; color: #c62828;
            border-radius: var(--radius-lg); display: flex;
            flex-direction: column; gap: var(--sp-3); align-items: center;
          }
        `}</style>
      </div>
    );
  }
  if (!ready) {
    return <p class="loading">Cargando tu avance…</p>;
  }

  return (
    <div class="journey">
      <header class="hello">
        <h2>Hola, {user.name.split(' ')[0]} 👋</h2>
        <p>
          Este es el mapa de tu viaje. Avanza unidad a unidad: cada una se desbloquea cuando
          completas la anterior.
        </p>
      </header>

      <ol class="units">
        {summaries.map((s) => {
          const clickable = s.unlocked;
          const href = `/unidades/${s.meta.slug}`;
          const icon =
            s.status === 'completed' ? '✓' : s.status === 'locked' ? '🔒' : s.status === 'in-progress' ? '▶' : '○';
          const inner = (
            <>
              <div class="row">
                <span class={`badge-status status-${s.status}`} aria-hidden="true">
                  {icon}
                </span>
                <div class="text">
                  <div class="title">
                    <span class="num">Unidad {s.meta.order}</span> · {s.meta.title}
                  </div>
                  <div class="desc">{s.meta.description}</div>
                </div>
                <div class="score">
                  {s.status === 'completed' || s.status === 'in-progress' ? (
                    <>
                      <strong>{s.score.toFixed(1)}</strong>/{s.maxScore} pts
                    </>
                  ) : (
                    <span>{s.maxScore} pts</span>
                  )}
                </div>
              </div>
              {s.status === 'in-progress' && (
                <div class="mini-bar" aria-hidden="true">
                  <div style={`width:${s.percent}%`} />
                </div>
              )}
            </>
          );

          return (
            <li class={`unit unit-${s.status}`}>
              {clickable ? (
                <a href={href}>{inner}</a>
              ) : (
                <div class="disabled" aria-disabled="true" title="Completa la unidad anterior para desbloquear">
                  {inner}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div class="cta-row">
        <a href="/resumen" class="btn btn-secondary">
          Ver mi resumen e informe ↗
        </a>
      </div>

      <style>{`
        .journey { display: flex; flex-direction: column; gap: var(--sp-5); }
        .hello h2 { font-size: var(--fs-2xl); margin-bottom: var(--sp-1); }
        .hello p { color: var(--color-text-soft); }

        .units { list-style: none; padding: 0; margin: 0;
          display: flex; flex-direction: column; gap: var(--sp-3); }

        .unit a, .unit .disabled {
          display: block; text-decoration: none; color: inherit;
          background: var(--duoc-blanco);
          border: 2px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--sp-4) var(--sp-5);
          transition: transform .15s ease, border-color .15s ease, box-shadow .15s ease;
        }
        .unit a:hover {
          border-color: var(--duoc-amarillo);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }
        .unit-completed a { border-color: #c8e6c9; background: #f3fbf3; }
        .unit-in-progress a { border-color: var(--duoc-amarillo-claro); background: #fffdf5; }
        .unit-locked .disabled { opacity: 0.55; cursor: not-allowed; }

        .row {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: var(--sp-4);
          align-items: center;
        }

        .badge-status {
          width: 44px; height: 44px; border-radius: 50%;
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 1.2rem; font-weight: 900;
          background: var(--duoc-gris-fondo);
        }
        .status-completed { background: var(--color-success); color: white; }
        .status-in-progress { background: var(--duoc-amarillo); color: var(--duoc-negro); }
        .status-locked { background: var(--duoc-gris-claro); color: var(--duoc-gris-oscuro); }

        .title { font-weight: 700; font-family: var(--font-serif); }
        .num { color: var(--color-text-soft); font-weight: 400; }
        .desc { font-size: var(--fs-sm); color: var(--color-text-soft); margin-top: 4px; }
        .score { font-size: var(--fs-sm); color: var(--color-text-soft); white-space: nowrap; }

        .mini-bar {
          height: 4px; background: var(--duoc-gris-fondo); border-radius: 2px;
          margin-top: var(--sp-3); overflow: hidden;
        }
        .mini-bar > div { height: 100%; background: var(--duoc-amarillo); }

        .cta-row { text-align: center; margin-top: var(--sp-3); }

        .loading { color: var(--color-text-soft); text-align: center; }
      `}</style>
    </div>
  );
}
