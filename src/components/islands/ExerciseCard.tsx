import { useEffect, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { $state, recordExercise } from '../../lib/progress';
import { matchAny } from '../../lib/matcher';
import { useInitializedProgress } from './useProgress';
import { ATTEMPT_FACTORS, exerciseScore } from '../../lib/scoring';

interface Props {
  unitSlug: string;
  id: string;
  prompt: string;
  scenario?: string;
  accept: string[];
  hint?: string;
  expectedHint?: string;
  value: number;
  index: number;
  total: number;
}

export default function ExerciseCard(props: Props) {
  const { unitSlug, id, prompt, scenario, accept, hint, expectedHint, value, index, total } =
    props;
  const { user, ready, error, authChecked } = useInitializedProgress();
  const state = useStore($state);

  const stored = state?.units[unitSlug]?.exercises[id];
  const [answer, setAnswer] = useState(stored?.answer ?? '');
  const [attempts, setAttempts] = useState(stored?.attempts ?? 0);
  const [feedback, setFeedback] = useState<
    null | { kind: 'ok' | 'fail' | 'done'; message: string }
  >(null);

  useEffect(() => {
    if (stored) {
      setAnswer(stored.answer);
      setAttempts(stored.attempts);
      setFeedback({
        kind: stored.correct ? 'ok' : 'done',
        message: stored.correct
          ? `Correcto. Obtuviste ${stored.score} de ${value} puntos.`
          : `Ejercicio cerrado. Obtuviste ${stored.score} de ${value} puntos.`,
      });
    }
  }, [stored?.answer]);

  const closed = Boolean(stored?.correct) || attempts >= ATTEMPT_FACTORS.length;

  async function handleCheck(e: Event) {
    e.preventDefault();
    if (!user || !ready || closed) return;
    const next = attempts + 1;
    const correct = matchAny(answer, accept);
    setAttempts(next);
    if (correct) {
      const sc = exerciseScore(value, next - 1, true);
      setFeedback({ kind: 'ok', message: `¡Correcto! Obtuviste ${sc} de ${value} puntos.` });
      await recordExercise({
        unitSlug,
        exerciseId: id,
        answer,
        attempts: next,
        correct: true,
        maxValue: value,
      });
    } else if (next >= ATTEMPT_FACTORS.length) {
      setFeedback({
        kind: 'done',
        message: `Sin intentos restantes. ${expectedHint ? `Una respuesta válida es: ${expectedHint}` : 'Revisa la teoría e intenta más adelante.'}`,
      });
      await recordExercise({
        unitSlug,
        exerciseId: id,
        answer,
        attempts: next,
        correct: false,
        maxValue: value,
      });
    } else {
      setFeedback({
        kind: 'fail',
        message: `Aún no. Te quedan ${ATTEMPT_FACTORS.length - next} intento(s).${hint ? ` Pista: ${hint}` : ''}`,
      });
    }
  }

  if (authChecked && !user) return <div class="ex-card card disabled">Inicia sesión para resolver el ejercicio.</div>;
  if (error) {
    return (
      <div class="ex-card card" style="background:#ffebee;color:#c62828;border-color:#ef9a9a;">
        ⚠ {error}
      </div>
    );
  }
  if (!ready) {
    return (
      <div class="ex-card card loading-card">
        <span class="spinner" aria-hidden="true" /> Cargando tu avance…
        <style>{`
          .loading-card { display: flex; align-items: center; gap: 10px; color: var(--color-text-soft); }
          .spinner {
            width: 16px; height: 16px; border-radius: 50%;
            border: 2px solid var(--color-border); border-top-color: var(--duoc-amarillo);
            animation: spin 0.8s linear infinite; display: inline-block;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  const isCorrect = Boolean(stored?.correct);
  const isFailed = closed && !isCorrect;

  return (
    <div class={`ex-card card ${isCorrect ? 'closed-ok' : isFailed ? 'closed-fail' : ''}`}>
      <div class="head">
        <span class="num">Ejercicio {index} de {total}</span>
        <span class="value">Vale {value} pts</span>
      </div>
      <div class="prompt">{prompt}</div>
      {scenario && <div class="scenario">{scenario}</div>}

      {isCorrect && (
        <div class="result-banner result-ok">
          <span class="result-icon">✓</span>
          <div>
            <strong>Correcto</strong>
            <span class="result-score">{stored!.score} / {value} pts · intento {stored!.attempts}</span>
          </div>
          <code class="result-answer">{stored!.answer}</code>
        </div>
      )}

      {isFailed && (
        <div class="result-banner result-fail">
          <span class="result-icon">✗</span>
          <div>
            <strong>Intentos agotados</strong>
            <span class="result-score">{stored!.score} / {value} pts</span>
          </div>
          {expectedHint && <code class="result-answer">Respuesta: {expectedHint}</code>}
        </div>
      )}

      {!closed && (
        <form onSubmit={handleCheck}>
          <label>
            Escribe tu respuesta
            <textarea
              rows={2}
              value={answer}
              onInput={(e) => setAnswer((e.target as HTMLTextAreaElement).value)}
              spellcheck={false}
              placeholder="Ej.: git commit -m &quot;Mi cambio&quot;"
            />
          </label>
          <div class="row">
            <button type="submit" class="btn btn-primary" disabled={!answer.trim()}>
              Verificar respuesta
            </button>
            <span class="hint-text">
              Intento {attempts + 1} de {ATTEMPT_FACTORS.length} ·
              {' '}Factor: {(ATTEMPT_FACTORS[attempts] ?? 0) * 100}%
            </span>
          </div>
          {feedback && (
            <div class={`feedback feedback-${feedback.kind}`} role="status">
              {feedback.message}
            </div>
          )}
        </form>
      )}

      <style>{`
        .ex-card { margin-bottom: var(--sp-4); }
        .head {
          display: flex; justify-content: space-between;
          font-size: var(--fs-xs); color: var(--color-text-soft);
          text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700;
          margin-bottom: var(--sp-2);
        }
        .num { color: var(--duoc-azul-escuela-oscuro); }
        .value { color: var(--duoc-amarillo-oscuro); }
        .prompt { font-weight: 700; font-size: var(--fs-md); margin-bottom: var(--sp-2); }
        .scenario {
          background: var(--duoc-gris-fondo);
          padding: var(--sp-3); border-radius: var(--radius-sm);
          font-size: var(--fs-sm); margin-bottom: var(--sp-3);
          color: var(--color-text);
        }
        label { display: flex; flex-direction: column; gap: 4px; font-weight: 700; }
        textarea {
          font-family: var(--font-mono);
          background: var(--duoc-negro-80);
          color: var(--duoc-blanco);
          border: 2px solid transparent;
          border-radius: var(--radius-md);
          padding: 10px 12px;
          font-size: var(--fs-sm);
          resize: vertical;
        }
        textarea:focus { border-color: var(--duoc-amarillo); outline: none; }
        .row { display: flex; align-items: center; gap: var(--sp-3); margin-top: var(--sp-3); flex-wrap: wrap; }
        .hint-text { color: var(--color-text-soft); font-size: var(--fs-xs); }
        .feedback {
          margin-top: var(--sp-3); padding: var(--sp-3);
          border-radius: var(--radius-md); font-size: var(--fs-sm);
        }
        .feedback-ok { background: #e8f5e9; color: var(--color-success); }
        .feedback-fail { background: #fff4e5; color: var(--color-warning); }
        .feedback-done { background: #ffebee; color: var(--color-error); }

        /* estados completado / agotado */
        .ex-card.closed-ok { border-color: #66bb6a; }
        .ex-card.closed-fail { border-color: #ef9a9a; }

        .result-banner {
          display: flex; flex-wrap: wrap; align-items: center; gap: var(--sp-3);
          padding: var(--sp-3) var(--sp-4);
          border-radius: var(--radius-md);
          margin-top: var(--sp-2);
        }
        .result-ok { background: #e8f5e9; color: #2e7d32; }
        .result-fail { background: #ffebee; color: #c62828; }
        .result-icon { font-size: 1.4rem; font-weight: 900; line-height: 1; }
        .result-banner > div { display: flex; flex-direction: column; gap: 2px; }
        .result-score { font-size: var(--fs-xs); opacity: 0.8; }
        .result-answer {
          width: 100%; margin-top: var(--sp-2);
          font-family: var(--font-mono); font-size: var(--fs-sm);
          background: rgba(0,0,0,0.06); padding: 6px 10px;
          border-radius: var(--radius-sm); word-break: break-all;
        }
        .ex-card.disabled { background: var(--duoc-gris-fondo); color: var(--color-text-soft); }
      `}</style>
    </div>
  );
}
