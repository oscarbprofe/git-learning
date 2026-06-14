import { useState, useEffect } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { $state, recordQuiz } from '../../lib/progress';
import { useInitializedProgress } from './useProgress';

interface Option {
  key: string;
  label: string;
}

interface Props {
  unitSlug: string;
  id: string;
  prompt: string;
  options: Option[];
  correct: string;
  explanation: string;
  value: number;
  index: number;
  total: number;
}

export default function QuizQuestion(props: Props) {
  const { unitSlug, id, prompt, options, correct, explanation, value, index, total } = props;
  const { user, ready, error } = useInitializedProgress();
  const state = useStore($state);
  const stored = state?.units[unitSlug]?.quiz[id];

  const [selected, setSelected] = useState<string | null>(stored?.selected ?? null);
  const [submitted, setSubmitted] = useState(Boolean(stored));

  useEffect(() => {
    if (stored) {
      setSelected(stored.selected);
      setSubmitted(true);
    }
  }, [stored?.selected]);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!user || !ready || submitted || !selected) return;
    const ok = selected === correct;
    setSubmitted(true);
    await recordQuiz({
      unitSlug,
      questionId: id,
      selected,
      correct: ok,
      maxValue: value,
    });
  }

  if (!user) return <div class="card">Inicia sesión para responder el quiz.</div>;
  if (error) {
    return (
      <div class="card" style="background:#ffebee;color:#c62828;border:1px solid #ef9a9a;">
        ⚠ {error}
      </div>
    );
  }
  if (!ready) {
    return (
      <div class="card" style="color:var(--color-text-soft);">Cargando tu avance…</div>
    );
  }

  const isCorrect = submitted && selected === correct;

  return (
    <div class={`quiz card ${submitted ? 'done' : ''}`}>
      <div class="head">
        <span class="num">Pregunta {index} de {total}</span>
        <span class="value">{value} pt{value === 1 ? '' : 's'}</span>
      </div>
      <p class="prompt">{prompt}</p>

      <form onSubmit={handleSubmit}>
        <ul class="options">
          {options.map((o) => {
            const checked = selected === o.key;
            const isAnswer = submitted && o.key === correct;
            const wasPicked = submitted && o.key === selected;
            return (
              <li
                class={`option ${isAnswer ? 'option-correct' : ''} ${wasPicked && !isCorrect ? 'option-wrong' : ''}`}
              >
                <label>
                  <input
                    type="radio"
                    name={`q-${id}`}
                    value={o.key}
                    checked={checked}
                    disabled={submitted}
                    onChange={() => setSelected(o.key)}
                  />
                  <span class="key">{o.key.toUpperCase()})</span>
                  <span class="text">{o.label}</span>
                </label>
              </li>
            );
          })}
        </ul>

        {!submitted ? (
          <button type="submit" class="btn btn-primary" disabled={!selected}>
            Responder
          </button>
        ) : (
          <div class={`result result-${isCorrect ? 'ok' : 'no'}`}>
            <strong>{isCorrect ? '¡Correcto!' : 'Incorrecto.'}</strong>{' '}
            {isCorrect
              ? `Sumas ${value} pt${value === 1 ? '' : 's'} en esta pregunta. `
              : `La alternativa correcta es ${correct.toUpperCase()}). `}
            {explanation}
          </div>
        )}
      </form>

      <style>{`
        .quiz { margin-bottom: var(--sp-4); }
        .head {
          display: flex; justify-content: space-between;
          font-size: var(--fs-xs); color: var(--color-text-soft);
          text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700;
          margin-bottom: var(--sp-2);
        }
        .num { color: var(--duoc-azul-escuela-oscuro); }
        .value { color: var(--duoc-amarillo-oscuro); }
        .prompt { font-weight: 700; font-size: var(--fs-md); margin-bottom: var(--sp-3); }
        .options { list-style: none; padding: 0; margin: 0 0 var(--sp-3); display: flex; flex-direction: column; gap: var(--sp-2); }
        .option label {
          display: grid;
          grid-template-columns: auto auto 1fr;
          align-items: start;
          gap: 8px;
          padding: 10px 12px;
          border: 2px solid var(--color-border);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: border-color .15s ease;
        }
        .option label:hover { border-color: var(--duoc-amarillo); }
        .option input { margin-top: 4px; }
        .key { font-weight: 700; color: var(--duoc-azul-escuela-oscuro); }
        .option-correct label { border-color: var(--color-success); background: #f3fbf3; }
        .option-wrong label { border-color: var(--color-error); background: #fff4f4; }
        .result {
          padding: var(--sp-3); border-radius: var(--radius-md);
          margin-top: var(--sp-2); font-size: var(--fs-sm);
        }
        .result-ok { background: #e8f5e9; color: var(--color-success); }
        .result-no { background: #ffebee; color: var(--color-error); }
        .quiz.done .option label { cursor: default; }
      `}</style>
    </div>
  );
}
