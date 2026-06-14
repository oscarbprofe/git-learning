import ExerciseCard from './ExerciseCard';
import QuizQuestion from './QuizQuestion';

interface Exercise {
  id: string;
  prompt: string;
  scenario?: string;
  accept: string[];
  hint?: string;
  expectedHint?: string;
  value: number;
}

interface QuizItem {
  id: string;
  prompt: string;
  options: { key: string; label: string }[];
  correct: string;
  explanation: string;
  value: number;
}

interface Props {
  unitSlug: string;
  exercises: Exercise[];
  quiz: QuizItem[];
}

export default function UnitActivities({ unitSlug, exercises, quiz }: Props) {
  return (
    <div class="unit-activities">
      <section id="ejercicios" class="section">
        <h2>Ejercicios</h2>
        <p class="intro">
          Tienes hasta 3 intentos por ejercicio. Los puntajes se aplican con factor decreciente
          (100% / 70% / 40%).
        </p>
        {exercises.map((ex, i) => (
          <ExerciseCard
            unitSlug={unitSlug}
            id={ex.id}
            prompt={ex.prompt}
            scenario={ex.scenario}
            accept={ex.accept}
            hint={ex.hint}
            expectedHint={ex.expectedHint}
            value={ex.value}
            index={i + 1}
            total={exercises.length}
          />
        ))}
      </section>

      <section id="quiz" class="section">
        <h2>Quiz teórico</h2>
        <p class="intro">Cada pregunta tiene un solo intento. Recibes retroalimentación inmediata.</p>
        {quiz.map((q, i) => (
          <QuizQuestion
            unitSlug={unitSlug}
            id={q.id}
            prompt={q.prompt}
            options={q.options}
            correct={q.correct}
            explanation={q.explanation}
            value={q.value}
            index={i + 1}
            total={quiz.length}
          />
        ))}
      </section>

      <style>{`
        .unit-activities { margin-top: var(--sp-6); }
        .section { margin-top: var(--sp-8); scroll-margin-top: 80px; }
        .section h2 { font-family: var(--font-serif); }
        .intro { color: var(--color-text-soft); font-size: var(--fs-sm); }
      `}</style>
    </div>
  );
}
