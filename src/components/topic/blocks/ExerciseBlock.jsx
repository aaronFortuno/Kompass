import { useT } from '@/i18n';
import { useExercise } from '@/hooks/useExercise.js';
import { ExerciseEngine } from '@/components/exercise/ExerciseEngine.jsx';

/*
 * ContentBlock type="exercise" · DATA-MODEL §3.2
 * Carrega l'exercici del dataLoader i el lliura a ExerciseEngine.
 * El chip de variant (quick-check / assessment) s'ensenya a dalt per
 * donar context a l'usuari sobre la naturalesa del pas.
 */
export function ExerciseBlock({ block }) {
  const { t } = useT();
  const { exerciseId, variant = 'quick-check' } = block;
  const exercise = useExercise(exerciseId);

  const variantLabel =
    variant === 'assessment'
      ? t('exercise.variantAssessment')
      : t('exercise.variantQuickCheck');

  if (!exercise) {
    return (
      <section className="card border-danger border-2">
        <span className="text-danger text-sm">
          {t('exercise.notFound', { id: exerciseId })}
        </span>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <span className="inline-block text-xs uppercase tracking-wide font-semibold text-accent">
        {variantLabel}
      </span>
      {exercise.title && (
        <h3 className="text-xl font-semibold text-content">{exercise.title}</h3>
      )}
      <ExerciseEngine exercise={exercise} />
    </section>
  );
}
