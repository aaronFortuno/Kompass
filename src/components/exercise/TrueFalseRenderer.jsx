import { Check, X } from 'lucide-react';
import { useT } from '@/i18n';
import { InlineRichText } from '@/components/ui/InlineRichText.jsx';

/*
 * TrueFalseRenderer · DATA-MODEL §6.3
 *
 * Mostra l'estímul textual seguit d'una llista d'afirmacions. Per a
 * cada una, dos botons "Cert" / "Fals". Un sol pot estar actiu per
 * afirmació. Al mode locked (post-comprovació), els botons mostren
 * quina era la resposta correcta via perBlank.
 *
 * Contracte de resposta: { [statementId]: boolean }
 */

function statementWrapperClass(perBlankEntry) {
  if (!perBlankEntry) return 'border-border bg-surface';
  return perBlankEntry.correct
    ? 'border-success bg-success/5'
    : 'border-danger bg-danger/5';
}

function buttonClass({ active, locked, isCorrectAnswer, wasWrongPick }) {
  if (!locked) {
    return active
      ? 'border-accent bg-accent/10 text-content'
      : 'border-border bg-surface text-content hover:bg-surface-raised';
  }
  if (isCorrectAnswer) {
    return 'border-success bg-success/10 text-content';
  }
  if (wasWrongPick) {
    return 'border-danger bg-danger/10 text-content';
  }
  return 'border-border bg-surface text-content-muted opacity-70';
}

export function TrueFalseRenderer({
  exercise,
  response,
  onChoose,
  disabled,
  perBlank,
}) {
  const { t } = useT();
  const { stimulus, interaction, validation } = exercise;
  const locked = Boolean(disabled);
  const labels = {
    true: t('exercise.statements.true'),
    false: t('exercise.statements.false'),
  };

  return (
    <div className="space-y-4">
      {stimulus.type === 'text' && (
        <p className="text-content text-lg leading-snug">
          <InlineRichText text={stimulus.content} />
        </p>
      )}

      <ul className="space-y-3">
        {interaction.statements.map((st) => {
          const picked = response?.[st.id];
          const entry = perBlank?.[st.id];
          const expectedBool = validation?.answers?.[st.id];
          return (
            <li
              key={st.id}
              className={`rounded-md border ${statementWrapperClass(entry)} p-3 sm:flex sm:items-center sm:gap-4`}
            >
              <p className="text-content leading-snug flex-1">
                <InlineRichText text={st.text} />
              </p>
              <div
                role="radiogroup"
                aria-label={`Cert o fals · ${st.id}`}
                className="mt-2 sm:mt-0 flex gap-2 shrink-0"
              >
                {[true, false].map((value) => {
                  const active = picked === value;
                  const isCorrectAnswer =
                    locked && expectedBool === value;
                  const wasWrongPick = locked && active && picked !== expectedBool;
                  const cls = buttonClass({
                    active,
                    locked,
                    isCorrectAnswer,
                    wasWrongPick,
                  });
                  return (
                    <button
                      type="button"
                      role="radio"
                      aria-checked={active}
                      disabled={locked}
                      key={String(value)}
                      onClick={() => onChoose(st.id, value)}
                      className={`min-h-[44px] min-w-[88px] inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium motion-hover focus:outline-none focus:ring-2 focus:ring-accent disabled:cursor-default ${cls}`}
                    >
                      {locked && isCorrectAnswer && (
                        <Check size={14} aria-hidden="true" />
                      )}
                      {locked && wasWrongPick && (
                        <X size={14} aria-hidden="true" />
                      )}
                      {value ? labels.true : labels.false}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
