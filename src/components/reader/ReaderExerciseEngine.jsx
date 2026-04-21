import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, X as XIcon, RotateCcw, Sparkle } from 'lucide-react';
import { useT } from '@/i18n';
import { useProgressStore } from '@/store/useProgressStore.js';
import { parseInline } from '@/lib/reader/parseInline.js';

/*
 * ReaderExerciseEngine · pregunta a pregunta · §79 (post-Fase 4)
 *
 * Versió paginada de l'ExerciseEngine per al Focus Reader. Cada "ítem"
 * es mostra sol; l'usuari respon, valida (Enter / → / Comprovar) i
 * avança al següent ítem. Al final, agregem totes les respostes i
 * registrem l'attempt global al progress store.
 *
 * Items per tipus d'interacció:
 *  - dropdownFill / typeIn amb stimulus.textWithBlanks: una línia del
 *    template = un ítem (dividim per \n). Dins una línia poden haver-hi
 *    1+ blanks (rar).
 *  - trueFalse: un statement = un ítem.
 *  - singleChoice / matchPairs / altres: tot l'exercici és un sol ítem.
 *
 * Navegació:
 *  - Tab: entre camps dins l'ítem (nadiu del navegador).
 *  - Enter: valida l'ítem actual (sinó ja validat); si ja validat,
 *    avança al següent.
 *  - → al final d'un input (cursor atEnd) o al select amb valor: valida
 *    o avança.
 *  - Click "Comprovar" → valida. Click "Següent" → avança.
 *
 * La navegació ← → global del reader continua gestionant el canvi de
 * beat: quan l'usuari és dins un input, la fletxa dreta només dispara
 * el submit si el cursor és al final; en altres casos deixa moure el
 * cursor.
 */

function deriveItems(exercise) {
  const { stimulus, interaction } = exercise;
  if (!interaction) return [{ key: 'whole', kind: 'whole' }];
  const type = interaction.type;

  if ((type === 'dropdownFill' || type === 'typeIn') && stimulus?.type === 'textWithBlanks') {
    const template = stimulus.template || '';
    const lines = template.split(/\n/).map((l) => l.trim()).filter(Boolean);
    const items = lines
      .map((line, idx) => {
        const blankIds = Array.from(line.matchAll(/\{\{([^}]+)\}\}/g)).map((m) => m[1]);
        if (blankIds.length === 0) return null;
        return { key: `line-${idx}`, kind: 'slot-line', lineTemplate: line, blankIds };
      })
      .filter(Boolean);
    if (items.length > 0) return items;
  }

  if (type === 'trueFalse' && Array.isArray(interaction.statements)) {
    return interaction.statements.map((s) => ({
      key: `st-${s.id}`,
      kind: 'statement',
      statementId: s.id,
      statement: s,
    }));
  }

  return [{ key: 'whole', kind: 'whole' }];
}

function slotOptions(exercise, blankId) {
  const slots = exercise.interaction?.slots || [];
  const hit = slots.find((s) => String(s.blankId) === String(blankId));
  return hit?.options || [];
}

function blankLabel(exercise, blankId) {
  const b = (exercise.stimulus?.blanks || []).find((x) => String(x.id) === String(blankId));
  return b?.label;
}

function expectedForBlank(exercise, blankId) {
  const v = exercise.validation;
  if (v?.type === 'slotMap') return v.answers?.[blankId];
  if (v?.type === 'slotMapMultiple') return (v.answers?.[blankId] || [])[0];
  return null;
}

function normalizeForMatch(s) {
  return String(s || '').trim().toLowerCase();
}

function isAnswerCorrect(exercise, blankId, value) {
  const v = exercise.validation;
  if (v?.type === 'slotMap') {
    return normalizeForMatch(value) === normalizeForMatch(v.answers?.[blankId]);
  }
  if (v?.type === 'slotMapMultiple') {
    const arr = v.answers?.[blankId] || [];
    return arr.some((a) => normalizeForMatch(value) === normalizeForMatch(a));
  }
  if (v?.type === 'truthMap') {
    return v.answers?.[blankId] === value;
  }
  return false;
}

function expectedDisplay(exercise, blankId) {
  const v = exercise.validation;
  if (v?.type === 'slotMap') return String(v.answers?.[blankId] ?? '');
  if (v?.type === 'slotMapMultiple') return (v.answers?.[blankId] || []).join(' / ');
  if (v?.type === 'truthMap') return String(v.answers?.[blankId]);
  return '';
}

// Renderer d'una línia (template amb {{N}} → inputs/selects)
function SlotLineRenderer({
  exercise,
  item,
  responses,
  onAnswer,
  revealed,
  lineCorrect,
  onSubmit,
  focusFirstInput,
}) {
  const type = exercise.interaction.type;
  const inputRefs = useRef({});
  const parts = item.lineTemplate.split(/(\{\{[^}]+\}\})/g);

  useEffect(() => {
    if (!focusFirstInput || revealed) return;
    const first = item.blankIds[0];
    const el = inputRefs.current[first];
    if (el && typeof el.focus === 'function') {
      // preventScroll: evita que el navegador scrolli cap a l'element
      // quan rep focus. Sense això, al navegar a un beat d'exercici
      // des del sidebar/progress bar, el browser pot empènyer tot el
      // layout cap amunt per "fer visible" l'input — trenca la posició
      // absoluta dels peeks i els far apareixen en primer pla. (§83)
      try {
        el.focus({ preventScroll: true });
      } catch {
        el.focus();
      }
      if ('selectionStart' in el) {
        try {
          el.selectionStart = el.value?.length ?? 0;
          el.selectionEnd = el.selectionStart;
        } catch {
          /* no-op */
        }
      }
    }
  }, [focusFirstInput, revealed, item.key]);

  return (
    <p className="kf-rex-sentence">
      {parts.map((part, i) => {
        const m = part.match(/^\{\{([^}]+)\}\}$/);
        if (!m) return <span key={i}>{parseInline(part)}</span>;
        const blankId = m[1];
        const value = responses[blankId] ?? '';
        const correctAns = expectedForBlank(exercise, blankId);
        const isCorrect = revealed && normalizeForMatch(value) === normalizeForMatch(correctAns);
        const isWrong = revealed && !isCorrect;

        if (type === 'dropdownFill') {
          return (
            <select
              key={i}
              ref={(el) => {
                if (el) inputRefs.current[blankId] = el;
              }}
              className={[
                'kf-rex-slot',
                isCorrect ? 'is-ok' : '',
                isWrong ? 'is-bad' : '',
              ].join(' ')}
              value={value}
              disabled={revealed}
              onChange={(e) => onAnswer(blankId, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  onSubmit();
                } else if (e.key === 'ArrowRight' && value) {
                  // Si ja hi ha valor al select, permetem saltar endavant
                  e.preventDefault();
                  e.stopPropagation();
                  onSubmit();
                }
              }}
              aria-label={blankLabel(exercise, blankId) || `buit ${blankId}`}
            >
              <option value="">—</option>
              {slotOptions(exercise, blankId).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          );
        }

        // typeIn
        return (
          <input
            key={i}
            ref={(el) => {
              if (el) inputRefs.current[blankId] = el;
            }}
            className={[
              'kf-rex-slot kf-rex-slot-input',
              isCorrect ? 'is-ok' : '',
              isWrong ? 'is-bad' : '',
            ].join(' ')}
            type="text"
            value={value}
            disabled={revealed}
            onChange={(e) => onAnswer(blankId, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                onSubmit();
                return;
              }
              if (e.key === 'ArrowRight') {
                const el = e.currentTarget;
                const atEnd =
                  el.selectionStart === el.value.length &&
                  el.selectionEnd === el.value.length;
                if (atEnd) {
                  e.preventDefault();
                  e.stopPropagation();
                  onSubmit();
                }
              }
            }}
            aria-label={blankLabel(exercise, blankId) || `buit ${blankId}`}
            placeholder="…"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        );
      })}
    </p>
  );
}

// Renderer d'un statement (trueFalse)
function StatementRenderer({
  item,
  value,
  onAnswer,
  revealed,
  correctBool,
  onSubmit,
}) {
  const isCorrect = revealed && value === correctBool;
  return (
    <div className="kf-rex-statement">
      <p className="kf-rex-sentence">{parseInline(item.statement.text)}</p>
      <div className="kf-rex-choices">
        {[
          { val: true, label: 'Cert' },
          { val: false, label: 'Fals' },
        ].map((opt) => {
          const picked = value === opt.val;
          const isThisCorrect = revealed && opt.val === correctBool;
          return (
            <button
              key={String(opt.val)}
              type="button"
              className={[
                'kf-rex-choice',
                picked && !revealed ? 'is-picked' : '',
                revealed && isThisCorrect ? 'is-ok' : '',
                revealed && picked && !isCorrect ? 'is-bad' : '',
              ].join(' ')}
              onClick={() => !revealed && onAnswer(opt.val)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  onSubmit();
                }
              }}
              disabled={revealed}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Renderer singleChoice (whole exercice - un sol ítem)
function SingleChoiceRenderer({ exercise, response, onAnswer, revealed, onSubmit }) {
  const options = exercise.interaction.options || [];
  const expectedId = exercise.validation?.type === 'exactMatch' ? exercise.validation.answer : null;
  return (
    <div className="kf-rex-statement">
      {exercise.stimulus?.type === 'text' ? (
        <p className="kf-rex-sentence">{parseInline(exercise.stimulus.content)}</p>
      ) : null}
      <div className="kf-rex-choices kf-rex-choices-column">
        {options.map((opt) => {
          const picked = response === opt.id;
          const isCorrectAnswer = expectedId != null && opt.id === expectedId;
          return (
            <button
              key={opt.id}
              type="button"
              className={[
                'kf-rex-choice',
                picked && !revealed ? 'is-picked' : '',
                revealed && isCorrectAnswer ? 'is-ok' : '',
                revealed && picked && !isCorrectAnswer ? 'is-bad' : '',
              ].join(' ')}
              onClick={() => !revealed && onAnswer(opt.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  onSubmit();
                }
              }}
              disabled={revealed}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// —————— Engine principal ——————

export function ReaderExerciseEngine({ exercise, peek = false, navRef = null }) {
  const { t } = useT();
  const recordExerciseAttempt = useProgressStore((s) => s.recordExerciseAttempt);

  const items = useMemo(() => deriveItems(exercise), [exercise]);
  const [responses, setResponses] = useState({}); // { [blankId|statementId|'whole']: value }
  const [revealedByItem, setRevealedByItem] = useState({}); // { [itemKey]: bool }
  const [itemIdx, setItemIdx] = useState(0);
  const [finished, setFinished] = useState(false);
  const attemptRecorded = useRef(false);

  const currentItem = items[itemIdx];
  const revealed = Boolean(revealedByItem[currentItem?.key]);

  // Reseteja en canvi d'exercici
  useEffect(() => {
    setResponses({});
    setRevealedByItem({});
    setItemIdx(0);
    setFinished(false);
    attemptRecorded.current = false;
  }, [exercise.id]);

  const setBlankResponse = (blankId, value) => {
    setResponses((r) => ({ ...r, [blankId]: value }));
  };

  // Valida l'ítem actual. Si és slot-line: comprova tots els seus blanks.
  // Si és statement: comprova la resposta. Si és whole (singleChoice):
  // comprova la resposta global.
  const validateCurrent = () => {
    if (!currentItem) return false;
    if (currentItem.kind === 'slot-line') {
      return currentItem.blankIds.every((bid) =>
        isAnswerCorrect(exercise, bid, responses[bid]),
      );
    }
    if (currentItem.kind === 'statement') {
      return isAnswerCorrect(exercise, currentItem.statementId, responses[currentItem.statementId]);
    }
    if (currentItem.kind === 'whole') {
      const v = exercise.validation;
      const ans = responses.whole;
      if (v?.type === 'exactMatch') return normalizeForMatch(ans) === normalizeForMatch(v.answer);
      return false;
    }
    return false;
  };

  // Comprova si l'ítem té resposta suficient (per evitar submit buit).
  const hasAnswer = () => {
    if (!currentItem) return false;
    if (currentItem.kind === 'slot-line') {
      return currentItem.blankIds.every(
        (bid) => responses[bid] != null && String(responses[bid]).trim() !== '',
      );
    }
    if (currentItem.kind === 'statement') {
      return typeof responses[currentItem.statementId] === 'boolean';
    }
    if (currentItem.kind === 'whole') {
      return responses.whole != null && responses.whole !== '';
    }
    return false;
  };

  const submit = () => {
    if (!currentItem) return;
    if (revealed) {
      advance();
      return;
    }
    if (!hasAnswer()) return;
    setRevealedByItem((r) => ({ ...r, [currentItem.key]: true }));
  };

  const advance = () => {
    if (itemIdx < items.length - 1) {
      setItemIdx(itemIdx + 1);
    } else {
      // Últim ítem: consolidem l'attempt global.
      setFinished(true);
    }
  };

  const back = () => {
    if (itemIdx > 0) setItemIdx(itemIdx - 1);
  };

  const retry = () => {
    setResponses({});
    setRevealedByItem({});
    setItemIdx(0);
    setFinished(false);
    attemptRecorded.current = false;
  };

  // Quan un ítem es revela, desenfoquem el control actiu. Així el
  // següent ← / → el captura el listener global del reader (via
  // navRef.handleArrow), no un input/select disabled que es quedaria
  // sense gestor i semblaria que la navegació no respon.
  useEffect(() => {
    if (!revealed) return;
    const el = document.activeElement;
    if (el && typeof el.blur === 'function') {
      const tag = el.tagName?.toLowerCase();
      if (['input', 'select', 'textarea', 'button'].includes(tag)) el.blur();
    }
  }, [revealed]);

  // Exposem handleArrow via navRef perquè el FocusReader el consulti
  // abans de fer goBeat. Cada render re-escriu la funció (captura l'estat
  // actual). El cleanup neteja la ref si el component es desmunta (p.ex.
  // canvi de beat).
  useEffect(() => {
    if (!navRef) return undefined;
    navRef.current = {
      handleArrow: (d) => {
        if (d === 1) {
          // Avançar
          if (finished) return false; // ja acabat: deixem que el reader surti
          if (!revealed) {
            if (!hasAnswer()) return true; // estem a mitges, no sortim
            setRevealedByItem((r) => ({ ...r, [currentItem.key]: true }));
            return true;
          }
          // revealed
          if (itemIdx < items.length - 1) {
            setItemIdx(itemIdx + 1);
            return true;
          }
          // última pregunta revealed → marquem com a finished però no
          // sortim (l'usuari veurà el resum); el següent → el farà goBeat.
          setFinished(true);
          return true;
        }
        if (d === -1) {
          if (finished) {
            // Tornem a mode preguntes a l'última pregunta (per si vol
            // repassar).
            setFinished(false);
            setItemIdx(items.length - 1);
            return true;
          }
          if (itemIdx > 0) {
            setItemIdx(itemIdx - 1);
            return true;
          }
          return false; // primera pregunta: deixem sortir del beat
        }
        return false;
      },
    };
    return () => {
      if (navRef) navRef.current = null;
    };
  });

  // Quan finished, enregistrem l'attempt global una vegada.
  useEffect(() => {
    if (!finished || attemptRecorded.current) return;
    attemptRecorded.current = true;
    // correctOverall: tots els ítems correctes?
    const allCorrect = items.every((it) => {
      const r = revealedByItem[it.key];
      if (!r) return false;
      if (it.kind === 'slot-line') {
        return it.blankIds.every((bid) => isAnswerCorrect(exercise, bid, responses[bid]));
      }
      if (it.kind === 'statement') {
        return isAnswerCorrect(exercise, it.statementId, responses[it.statementId]);
      }
      if (it.kind === 'whole') {
        const v = exercise.validation;
        return v?.type === 'exactMatch' &&
          normalizeForMatch(responses.whole) === normalizeForMatch(v.answer);
      }
      return false;
    });
    recordExerciseAttempt(exercise.topicId, exercise.id, allCorrect);
  }, [finished, items, revealedByItem, responses, exercise, recordExerciseAttempt]);

  if (!currentItem) return null;

  // ——— Estat de finalització ———
  if (finished) {
    const allCorrect = items.every((it) => {
      if (it.kind === 'slot-line') {
        return it.blankIds.every((bid) => isAnswerCorrect(exercise, bid, responses[bid]));
      }
      if (it.kind === 'statement') {
        return isAnswerCorrect(exercise, it.statementId, responses[it.statementId]);
      }
      return true;
    });
    return (
      <div className="kf-rex">
        <div className={['kf-rex-final', allCorrect ? 'is-ok' : 'is-partial'].join(' ')}>
          {allCorrect ? (
            <>
              <Check size={18} aria-hidden="true" />
              <span>
                {t('exercise.correct')}{' '}
                <span className="kf-rex-muted">
                  — {items.length}/{items.length}
                </span>
              </span>
            </>
          ) : (
            <>
              <XIcon size={18} aria-hidden="true" />
              <span>
                {t('exercise.incorrect')}{' '}
                <span className="kf-rex-muted">
                  — has fallat algunes preguntes
                </span>
              </span>
            </>
          )}
        </div>
        {exercise.feedback?.correct?.message && allCorrect ? (
          <p className="kf-rex-feedback-msg">
            {parseInline(exercise.feedback.correct.message)}
          </p>
        ) : null}
        {!allCorrect && exercise.feedback?.incorrect?.default ? (
          <p className="kf-rex-feedback-msg">
            {parseInline(exercise.feedback.incorrect.default)}
          </p>
        ) : null}
        <div className="kf-rex-nav">
          <button
            type="button"
            className="kf-rex-btn"
            onClick={retry}
          >
            <RotateCcw size={12} aria-hidden="true" />
            <span>{t('exercise.tryAgain')}</span>
          </button>
        </div>
      </div>
    );
  }

  // ——— Render de l'ítem actual ———
  const prompt = exercise.prompt;
  const hint = exercise.hint;

  const currentIsCorrect = revealed ? validateCurrent() : null;
  const isLast = itemIdx === items.length - 1;

  return (
    <div className="kf-rex">
      <div className="kf-rex-meta">
        {prompt ? <p className="kf-rex-prompt">{parseInline(prompt)}</p> : null}
        <span className="kf-rex-count">
          {itemIdx + 1} / {items.length}
        </span>
      </div>

      <div className="kf-rex-row">
        <div className="kf-rex-item">
          {currentItem.kind === 'slot-line' ? (
            <SlotLineRenderer
              exercise={exercise}
              item={currentItem}
              responses={responses}
              onAnswer={setBlankResponse}
              revealed={revealed}
              onSubmit={submit}
              focusFirstInput={!peek && !revealed}
            />
          ) : currentItem.kind === 'statement' ? (
            <StatementRenderer
              item={currentItem}
              value={responses[currentItem.statementId]}
              onAnswer={(v) => setResponses((r) => ({ ...r, [currentItem.statementId]: v }))}
              revealed={revealed}
              correctBool={exercise.validation?.answers?.[currentItem.statementId]}
              onSubmit={submit}
            />
          ) : (
            <SingleChoiceRenderer
              exercise={exercise}
              response={responses.whole}
              onAnswer={(id) => setResponses((r) => ({ ...r, whole: id }))}
              revealed={revealed}
              onSubmit={submit}
            />
          )}
        </div>

        {revealed ? (
          <div
            className={[
              'kf-rex-feedback-aside',
              currentIsCorrect ? 'is-ok' : 'is-bad',
            ].join(' ')}
            role="status"
            aria-live="polite"
          >
            {currentIsCorrect ? (
              <>
                <Check size={14} aria-hidden="true" />
                <span>Correcte</span>
              </>
            ) : (
              <>
                <XIcon size={14} aria-hidden="true" />
                <div>
                  <span className="kf-rex-feedback-label">Correcta:</span>{' '}
                  <b>
                    {currentItem.kind === 'slot-line'
                      ? currentItem.blankIds.map((b) => expectedDisplay(exercise, b)).join(' / ')
                      : currentItem.kind === 'statement'
                        ? String(exercise.validation?.answers?.[currentItem.statementId])
                        : String(exercise.validation?.answer ?? '')}
                  </b>
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>

      {!revealed && hint ? (
        <p className="kf-rex-hint">
          <Sparkle size={12} aria-hidden="true" /> {parseInline(hint)}
        </p>
      ) : null}

      <div className="kf-rex-nav">
        <div className="kf-rex-nav-left">
          <button
            type="button"
            className="kf-rex-btn kf-rex-btn-icon"
            onClick={back}
            disabled={itemIdx === 0}
            aria-label="Pregunta anterior"
            title="Pregunta anterior (←)"
          >
            <ArrowLeft size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="kf-rex-btn kf-rex-btn-icon kf-rex-btn-ghost"
            onClick={retry}
            aria-label="Reiniciar exercici"
            title="Reiniciar exercici"
          >
            <RotateCcw size={13} aria-hidden="true" />
          </button>
        </div>
        <div className="kf-rex-dots">
          {items.map((_, i) => {
            const r = revealedByItem[items[i].key];
            const ok = r
              ? (() => {
                  const it = items[i];
                  if (it.kind === 'slot-line') {
                    return it.blankIds.every((bid) =>
                      isAnswerCorrect(exercise, bid, responses[bid]),
                    );
                  }
                  if (it.kind === 'statement') {
                    return isAnswerCorrect(exercise, it.statementId, responses[it.statementId]);
                  }
                  return false;
                })()
              : false;
            return (
              <button
                key={i}
                type="button"
                className={[
                  'kf-rex-dot',
                  i === itemIdx ? 'is-current' : '',
                  r && ok ? 'is-ok' : '',
                  r && !ok ? 'is-bad' : '',
                ].join(' ')}
                onClick={() => setItemIdx(i)}
                aria-label={`Pregunta ${i + 1}`}
              />
            );
          })}
        </div>
        {!revealed ? (
          <button
            type="button"
            className="kf-rex-btn kf-rex-btn-primary"
            onClick={submit}
            disabled={!hasAnswer()}
          >
            <span>{t('exercise.check')}</span>
          </button>
        ) : isLast ? (
          <button
            type="button"
            className="kf-rex-btn kf-rex-btn-primary"
            onClick={submit}
          >
            <span>Finalitzar</span>
            <Check size={14} aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            className="kf-rex-btn kf-rex-btn-primary kf-rex-btn-icon"
            onClick={submit}
            aria-label="Pregunta següent"
            title="Pregunta següent"
          >
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
