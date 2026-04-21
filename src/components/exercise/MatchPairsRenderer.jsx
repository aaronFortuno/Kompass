import { useMemo } from 'react';
import { Link2, Check, X } from 'lucide-react';
import { InlineRichText } from '@/components/ui/InlineRichText.jsx';

/*
 * MatchPairsRenderer · DATA-MODEL §6.7
 *
 * Implementació inicial en mode "dropdown": cada card del grup A mostra
 * el seu contingut i un selector per triar el parell del grup B.
 * Funcional i accessible amb teclat i lector de pantalla; no depèn de
 * drag-and-drop. Podem fer-ne una versió visual més tard sense tocar
 * el contracte de resposta.
 *
 * Contracte de resposta: Array<[cardIdA, cardIdB]>
 * (ordre dels elements del parell irrellevant; el validator normalitza.)
 *
 * L'estímul és un cardSet amb cards que tenen un camp `group`. La
 * primera aparició d'un grup és "grup A", la segona "grup B". Si hi
 * ha més de dos grups, s'ignoren els addicionals (warn en dev).
 */

function groupCards(cards) {
  const groups = new Map();
  for (const card of cards) {
    if (!groups.has(card.group)) groups.set(card.group, []);
    groups.get(card.group).push(card);
  }
  return groups;
}

function CardContent({ content }) {
  if (content.type === 'text') {
    return (
      <span className="text-content leading-snug">
        <InlineRichText text={content.content} />
      </span>
    );
  }
  if (content.type === 'image') {
    return (
      <img
        src={content.src}
        alt={content.alt}
        loading="lazy"
        className="max-h-24 w-auto rounded-sm"
      />
    );
  }
  return null;
}

function getPairFor(cardId, pairs) {
  for (const pair of pairs) {
    if (!Array.isArray(pair)) continue;
    if (pair[0] === cardId) return pair[1];
    if (pair[1] === cardId) return pair[0];
  }
  return '';
}

function perBlankEntryFor(cardIdA, pairedWith, perBlank) {
  if (!perBlank || !pairedWith) return null;
  // Les claus de perBlank són canòniques ("a|b" ordenades alfabèticament).
  const key = [cardIdA, pairedWith].sort().join('|');
  return perBlank[key] ?? null;
}

function cardStateClass({ entry, locked, hasPick }) {
  if (!locked) {
    return hasPick
      ? 'border-accent bg-accent/5'
      : 'border-border bg-surface';
  }
  if (!entry) {
    // locked + no entry: l'usuari no ha creat cap parella amb aquesta
    // card (o n'ha creada una extra no esperada). Neutre.
    return 'border-border bg-surface opacity-70';
  }
  return entry.correct
    ? 'border-success bg-success/5'
    : 'border-danger bg-danger/5';
}

export function MatchPairsRenderer({
  exercise,
  response,
  onPair,
  disabled,
  perBlank,
}) {
  const { stimulus, interaction } = exercise;
  const locked = Boolean(disabled);
  const pairs = Array.isArray(response) ? response : [];

  const { groupA, groupB, labelA, labelB } = useMemo(() => {
    const groups = groupCards(stimulus.cards || []);
    const keys = [...groups.keys()];
    if (import.meta.env?.DEV && keys.length > 2) {
      // eslint-disable-next-line no-console
      console.warn(
        `[MatchPairsRenderer] el cardSet té ${keys.length} grups; només s'usen els 2 primers.`
      );
    }
    const aKey = keys[0];
    const bKey = keys[1];
    return {
      groupA: groups.get(aKey) ?? [],
      groupB: groups.get(bKey) ?? [],
      labelA: interaction.groupALabel || aKey || 'A',
      labelB: interaction.groupBLabel || bKey || 'B',
    };
  }, [stimulus.cards, interaction.groupALabel, interaction.groupBLabel]);

  // Cards del grup B ja assignades a alguna del grup A: si `allowReuse`
  // no està definit al DATA-MODEL per matchPairs, assumim que una card
  // només pot formar part d'una parella (tret de la que canviem ara).
  const usedBIds = new Set(
    pairs
      .filter((p) => Array.isArray(p))
      .map((p) => (groupA.some((c) => c.id === p[0]) ? p[1] : p[0]))
      .filter(Boolean)
  );

  const handleSelect = (cardA, newB) => {
    if (locked) return;
    // Construïm la llista nova de parelles: eliminem la parella anterior
    // de cardA (si existia) i afegim la nova si newB no és buit.
    const next = pairs.filter((p) => {
      if (!Array.isArray(p)) return false;
      return p[0] !== cardA.id && p[1] !== cardA.id;
    });
    if (newB) next.push([cardA.id, newB]);
    onPair(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-content-muted">
        <Link2 size={16} aria-hidden="true" />
        <span>
          {labelA} <span aria-hidden="true">↔</span> {labelB}
        </span>
      </div>

      <ul className="space-y-3">
        {groupA.map((cardA) => {
          const pairedWith = getPairFor(cardA.id, pairs);
          const entry = perBlankEntryFor(cardA.id, pairedWith, perBlank);
          const wrapperCls = cardStateClass({
            entry,
            locked,
            hasPick: Boolean(pairedWith),
          });
          const selectId = `match-${exercise.id}-${cardA.id}`;
          return (
            <li
              key={cardA.id}
              className={`rounded-md border ${wrapperCls} p-3 flex flex-col sm:flex-row sm:items-center gap-3`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {locked && entry && (
                  <span
                    aria-hidden="true"
                    className={`shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full ${
                      entry.correct
                        ? 'bg-success text-accent-content'
                        : 'bg-danger text-accent-content'
                    }`}
                  >
                    {entry.correct ? <Check size={14} /> : <X size={14} />}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <CardContent content={cardA.content} />
                </div>
              </div>

              <label htmlFor={selectId} className="sr-only">
                {`Tria el parell de ${labelA} ${cardA.id}`}
              </label>
              <select
                id={selectId}
                value={pairedWith || ''}
                onChange={(e) => handleSelect(cardA, e.target.value)}
                disabled={locked}
                className={`min-h-[44px] bg-surface text-content border rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-70 shrink-0 sm:min-w-[12rem] ${
                  locked && entry
                    ? entry.correct
                      ? 'border-success'
                      : 'border-danger'
                    : 'border-border'
                }`}
              >
                <option value="">—</option>
                {groupB.map((cardB) => {
                  const takenByOther =
                    usedBIds.has(cardB.id) && cardB.id !== pairedWith;
                  const label = cardB.content.type === 'text'
                    ? cardB.content.content
                    : cardB.content.alt;
                  return (
                    <option
                      key={cardB.id}
                      value={cardB.id}
                      disabled={takenByOther}
                    >
                      {label}
                    </option>
                  );
                })}
              </select>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
