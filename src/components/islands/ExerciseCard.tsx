import { useEffect, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { $state, recordExercise, markSectionVisited } from '../../lib/progress';
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
  const { user, ready } = useInitializedProgress();
  const state = useStore($state);

  const stored = state?.units[unitSlug]?.exercises[id];
  const [answer, setAnswer] = useState(stored?.answer ?? '');
  const [attempts, setAttempts] = useState(stored?.attempts ?? 0);
  const [feedback, setFeedback] = useState<
    null | { kind: 'ok' | 'fail' | 'done'; message: string }
  >(
    stored
      ? {
          kind: stored.correct ? 'ok' : 'done',
          message: stored.correct
            ? `Correcto. Obtuviste ${stored.score} de ${value} puntos.`
            : `Ejercicio cerrado. Obtuviste ${stored.score} de ${value} puntos.`,
        }
      : null,
  );

  useEffect(() => {
    if (ready && user) void markSectionVisited(unitSlug, 'ejercicios');
  }, [ready, user?.email, unitSlug]);

  const closed = Boolean(stored?.correct) || attempts >= ATTEMPT_FACTORS.length;
  const remainingAttempts = ATTEMPT_FACTORS.length - attempts;

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

  if (!user) return <div class="ex-card card disabled">Inicia sesión para resolver el ejercicio.</div>;

  return (
    <div class={`ex-card card ${closed ? 'closed' : ''}`}>
      <div class="head">
        <span class="num">Ejercicio {index} de {total}</span>
        <span class="value">Vale {value} pts</span>
      </div>
      <div class="prompt">{prompt}</div>
      {scenario && <div class="scenario">{scenario}</div>}

      <form onSubmit={handleCheck}>
        <label>
          Escribe tu respuesta
          <textarea
            rows={2}
            value={answer}
            onInput={(e) => setAnswer((e.target as HTMLTextAreaElement).value)}
            spellcheck={false}
            disabled={closed}
            placeholder="Ej.: git commit -m &quot;Mi cambio&quot;"
          />
        </label>
        {!closed && (
          <div class="row">
            <button type="submit" class="btn btn-primary" disabled={!answer.trim()}>
              Verificar respuesta
            </button>
            <span class="hint-text">
              Intento {attempts + 1} de {ATTEMPT_FACTORS.length} ·
              {' '}Factor: {(ATTEMPT_FACTORS[attempts] ?? 0) * 100}%
            </span>
          </div>
        )}
      </form>

      {feedback && (
        <div class={`feedback feedback-${feedback.kind}`} role="status">
          {feedback.message}
        </div>
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
        textarea:disabled { opacity: 0.7; }
        .row { display: flex; align-items: center; gap: var(--sp-3); margin-top: var(--sp-3); flex-wrap: wrap; }
        .hint-text { color: var(--color-text-soft); font-size: var(--fs-xs); }
        .feedback {
          margin-top: var(--sp-3); padding: var(--sp-3);
          border-radius: var(--radius-md); font-size: var(--fs-sm);
        }
        .feedback-ok { background: #e8f5e9; color: var(--color-success); }
        .feedback-fail { background: #fff4e5; color: var(--color-warning); }
        .feedback-done { background: #ffebee; color: var(--color-error); }
        .ex-card.closed { opacity: 0.95; border-color: #c8e6c9; }
        .ex-card.disabled { background: var(--duoc-gris-fondo); color: var(--color-text-soft); }
      `}</style>
    </div>
  );
}
