import { useT } from '@/i18n';

/*
 * ContentBlock type="exercise" · DATA-MODEL §3.2
 * Placeholder. El motor d'exercicis es construirà en una iteració
 * posterior. El bloc actual renderitza una targeta informativa amb
 * el chip de variant, de manera que la posició de l'exercici dins
 * del recorregut ja és visible.
 */
export function ExerciseBlock({ block }) {
  const { t } = useT();
  const { exerciseId, variant = 'quick-check' } = block;

  const variantLabel =
    variant === 'assessment'
      ? t('exercise.variantAssessment')
      : t('exercise.variantQuickCheck');

  return (
    <section className="card border-dashed">
      <span className="inline-block text-xs uppercase tracking-wide font-semibold text-accent mb-2">
        {variantLabel}
      </span>
      <h3 className="text-lg font-semibold text-content mb-1">
        {t('exercise.placeholderTitle')}
      </h3>
      <p className="text-content-muted text-sm">
        {t('exercise.placeholderBody', { id: exerciseId })}
      </p>
    </section>
  );
}
