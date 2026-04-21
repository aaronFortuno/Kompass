import { Check, X } from 'lucide-react';
import { InlineRichText } from '@/components/ui/InlineRichText.jsx';

/*
 * SingleChoiceRenderer · DATA-MODEL §6.1
 *
 * Mostra l'estímul (text o imatge) i una llista d'opcions com a botons
 * tipus radio. Una sola opció seleccionable. Quan l'exercici està
 * locked, es deshabilita la interacció i es mostra visualment:
 *   - la triada per l'usuari (correcta o incorrecta)
 *   - la correcta quan l'usuari s'ha equivocat.
 *
 * perBlank (opcional) prové del validator. Per a exactMatch el
 * validator emet perBlank buit; aquí deduïm el resultat a partir de
 * la resposta + l'expected al prop `expectedId`.
 *
 * Contracte de resposta: string (id de l'opció triada).
 */

function optionStateClass({ isSelected, isCorrectAnswer, locked, correctOverall }) {
  if (!locked) {
    return isSelected
      ? 'border-accent bg-accent/10 text-content'
      : 'border-border bg-surface text-content hover:bg-surface-raised';
  }
  if (isCorrectAnswer) {
    return 'border-success bg-success/10 text-content';
  }
  if (isSelected && !correctOverall) {
    return 'border-danger bg-danger/10 text-content';
  }
  return 'border-border bg-surface text-content-muted opacity-70';
}

export function SingleChoiceRenderer({
  exercise,
  response,
  onChoose,
  disabled,
  correctOverall,
}) {
  const { stimulus, interaction, validation } = exercise;
  const locked = Boolean(disabled);
  const selectedId = typeof response === 'string' ? response : '';
  const expectedId = validation?.type === 'exactMatch' ? validation.answer : null;

  return (
    <div className="space-y-4">
      <StimulusBlock stimulus={stimulus} />

      <ul role="radiogroup" className="space-y-2">
        {interaction.options.map((opt) => {
          const isSelected = selectedId === opt.id;
          const isCorrectAnswer = expectedId != null && opt.id === expectedId;
          const cls = optionStateClass({
            isSelected,
            isCorrectAnswer,
            locked,
            correctOverall,
          });
          return (
            <li key={opt.id}>
              <button
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={locked}
                onClick={() => onChoose(opt.id)}
                className={`w-full min-h-[44px] flex items-center gap-3 rounded-md border px-3 py-2 text-left motion-hover focus:outline-none focus:ring-2 focus:ring-accent disabled:cursor-default ${cls}`}
              >
                <OptionMarker
                  isSelected={isSelected}
                  isCorrectAnswer={isCorrectAnswer}
                  locked={locked}
                  correctOverall={correctOverall}
                />
                <span className="flex-1 leading-snug">
                  <InlineRichText text={opt.label} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function OptionMarker({ isSelected, isCorrectAnswer, locked, correctOverall }) {
  if (locked) {
    if (isCorrectAnswer) {
      return (
        <span
          aria-hidden="true"
          className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-success text-accent-content"
        >
          <Check size={14} />
        </span>
      );
    }
    if (isSelected && !correctOverall) {
      return (
        <span
          aria-hidden="true"
          className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-danger text-accent-content"
        >
          <X size={14} />
        </span>
      );
    }
    return (
      <span
        aria-hidden="true"
        className="shrink-0 inline-block w-5 h-5 rounded-full border border-border"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`shrink-0 inline-block w-5 h-5 rounded-full border-2 ${
        isSelected ? 'border-accent bg-accent' : 'border-border bg-surface'
      }`}
    />
  );
}

function StimulusBlock({ stimulus }) {
  if (stimulus.type === 'text') {
    return (
      <p className="text-content text-lg leading-snug">
        <InlineRichText text={stimulus.content} />
      </p>
    );
  }
  if (stimulus.type === 'image') {
    return (
      <figure className="space-y-2">
        <img
          src={stimulus.src}
          alt={stimulus.alt}
          loading="lazy"
          className="max-h-64 w-auto mx-auto rounded-md border border-border bg-surface"
        />
        {stimulus.caption && (
          <figcaption className="text-center text-sm text-content-muted">
            <InlineRichText text={stimulus.caption} />
          </figcaption>
        )}
      </figure>
    );
  }
  return null;
}
