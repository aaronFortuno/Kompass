import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { useT } from '@/i18n';
import { getAllLevelKeys, getTopicsByLevel } from '@/lib/dataLoader.js';
import { useProgressStore } from '@/store/useProgressStore.js';
import { computeTopicProgress } from '@/lib/topicProgress.js';

/*
 * TopicsIndexPage · temari com a navegador d'un cop d'ull.
 *
 * Inspirat en ProgressPage v2 (chips + <details> per nivell) però
 * orientat a navegació pura: id + shortTitle + barra de progrés.
 *
 * Decisions:
 *   - Seccions <details>/<summary> natives, un per nivell. Accessibilitat
 *     gratuïta i sense JS de col·lapse. S'obre per defecte només la secció
 *     que conté el "tema actual" (l'últim visitat no completat) o, si no
 *     n'hi ha, el primer nivell. Si la URL porta ?focus=<id>, s'obre la
 *     secció que conté aquest tema (prioritat sobre "actual").
 *   - Cada nivell mostra comptador "X / Y" al summary: X = visibles segons
 *     filtre de cerca, Y = total del nivell.
 *   - Graella 2 col·lumnes a lg+; cards fines amb id mono + shortTitle +
 *     barra de progrés. Al mòbil, 1 col·lumna.
 *   - Cerca: input de text a dalt que filtra per id o shortTitle. Cada
 *     secció mostra la quantitat filtrada; es col·lapsa automàticament
 *     quan el seu contingut buit si hi ha query.
 *   - A1a-0 està exclòs del temari regular (lliçó d'onboarding).
 */

/* Troba el topic "actual" de l'usuari: visitat, no completat, amb
 * l'activitat més recent (via firstVisitedAt — no existeix lastVisitedAt
 * al store, així que agafem el max de firstVisitedAt entre els topics
 * amb visitats i no all-done). Retorna topicId o null. */
function findActiveTopicId(allLevels, topicsProgress, exercisesState) {
  let bestId = null;
  let bestDate = 0;
  for (const topics of allLevels) {
    for (const topic of topics) {
      const entry = topicsProgress?.[topic.id];
      if (!entry || !entry.visitedStepIds?.length) continue;
      const { allDone } = computeTopicProgress(topic, exercisesState);
      if (allDone) continue;
      const ts = entry.firstVisitedAt ? Date.parse(entry.firstVisitedAt) : 0;
      if (ts > bestDate) {
        bestDate = ts;
        bestId = topic.id;
      }
    }
  }
  return bestId;
}

/* Normalitza una cadena per cerca (lowercase, sense accents). */
function normalize(str) {
  return (str ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function topicMatchesQuery(topic, q) {
  if (!q) return true;
  const nq = normalize(q);
  return (
    normalize(topic.id).includes(nq) ||
    normalize(topic.shortTitle).includes(nq)
  );
}

/* Card densa d'un tema: id · shortTitle · barra de progrés. */
function TopicCard({ topic, progress, t, isFocus, focusRef, revealIndex }) {
  const { total, pct, allDone } = progress;
  const hasExercises = total > 0;
  // Stagger de revel: cada card es revela amb un petit retard respecte
  // la seva posició al grid. Limitem el delay màxim per no allargar la
  // revelació del nivell sencer.
  const delayMs = Math.min(revealIndex * 40, 600);
  return (
    <Link
      ref={isFocus ? focusRef : null}
      to={`/temari/${topic.id}`}
      className={[
        'group flex items-baseline gap-3',
        'py-3 px-3 -mx-3',
        'border-b border-reader-rule',
        'hover:bg-reader-paper-2',
        'transition-colors duration-fast ease-standard',
        'progress-row-reveal',
        isFocus ? 'topics-focus' : '',
      ].join(' ')}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-reader-muted w-14 flex-shrink-0">
        {topic.id}
      </span>
      <span className="flex-1 min-w-0 font-serif text-base text-reader-ink tracking-tight truncate">
        {topic.shortTitle}
      </span>
      <span className="flex-shrink-0 w-24 sm:w-28 flex items-center gap-2">
        {hasExercises ? (
          <>
            <div
              className="h-[2px] flex-1 bg-reader-rule overflow-hidden"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
            >
              <div
                className={[
                  'h-full transition-[width] duration-base ease-standard',
                  allDone ? 'bg-reader-ok' : 'bg-reader-ink',
                ].join(' ')}
                style={{ width: `${pct}%` }}
              />
            </div>
            {allDone ? (
              <Check size={14} className="text-reader-ok flex-shrink-0" aria-hidden="true" />
            ) : (
              <span className="font-mono text-[10px] text-reader-muted w-8 text-right flex-shrink-0">
                {pct}%
              </span>
            )}
          </>
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-wider text-reader-muted">
            {t('topics.progress.noExercises')}
          </span>
        )}
      </span>
    </Link>
  );
}

/* Secció col·lapsable per nivell. Contenidor <details> natiu. */
function LevelSection({
  levelKey,
  topics,
  exercisesState,
  t,
  open,
  onToggle,
  focusId,
  focusRef,
  totalCount,
}) {
  const shownCount = topics.length;
  return (
    <details
      open={open}
      onToggle={(e) => onToggle(levelKey, e.currentTarget.open)}
      className={[
        'group border-t border-reader-rule',
        'transition-colors duration-fast ease-standard',
      ].join(' ')}
    >
      <summary
        className={[
          'flex items-center justify-between gap-4',
          'py-3 px-2 -mx-2 cursor-pointer list-none',
          'hover:bg-reader-paper-2',
          'transition-colors duration-fast ease-standard',
          '[&::-webkit-details-marker]:hidden',
        ].join(' ')}
      >
        <span className="flex items-baseline gap-3">
          <ChevronDown
            size={14}
            aria-hidden="true"
            className={[
              'text-reader-muted flex-shrink-0',
              'transition-transform duration-base ease-standard',
              'group-open:rotate-0 -rotate-90',
            ].join(' ')}
          />
          <span className="font-mono text-xs uppercase tracking-[0.22em] text-reader-ink">
            {levelKey.toUpperCase()}
          </span>
        </span>
        <span className="font-mono text-[11px] text-reader-ink-2">
          {t('topics.levelCount', { shown: shownCount, total: totalCount })}
        </span>
      </summary>

      <div className="pb-4 pt-1">
        {shownCount === 0 ? (
          <p className="font-serif italic text-sm text-reader-ink-2 px-2 py-4">
            {t('topics.emptyForSearch')}
          </p>
        ) : (
          <ul className="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-8 border-t border-reader-rule">
            {topics.map((topic, i) => {
              const progress = computeTopicProgress(topic, exercisesState);
              const isFocus = topic.id === focusId;
              return (
                <li key={topic.id} className="contents">
                  <TopicCard
                    topic={topic}
                    progress={progress}
                    t={t}
                    isFocus={isFocus}
                    focusRef={focusRef}
                    revealIndex={i}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </details>
  );
}

export function TopicsIndexPage() {
  const { t } = useT();
  const levelKeys = getAllLevelKeys();
  const exercisesState = useProgressStore((s) => s.exercises);
  const topicsProgress = useProgressStore((s) => s.topics);

  // Enllaç contextual des del reader: el títol del reader navega aquí
  // amb ?focus=<topicId>. Posicionem el tema al terç superior de la
  // finestra i hi apliquem una marca visual temporal.
  const [searchParams] = useSearchParams();
  const focusId = searchParams.get('focus');
  const focusRef = useRef(null);

  // Topics per nivell (sense A1a-0, que viu només a la landing).
  const topicsByLevel = useMemo(() => {
    const map = new Map();
    for (const levelKey of levelKeys) {
      const list = getTopicsByLevel(levelKey).filter((x) => x.id !== 'A1a-0');
      map.set(levelKey, list);
    }
    return map;
  }, [levelKeys]);

  // Totals per nivell (abans de filtrar) per a "X / Y".
  const totalsByLevel = useMemo(() => {
    const map = new Map();
    for (const [k, list] of topicsByLevel) map.set(k, list.length);
    return map;
  }, [topicsByLevel]);

  // Cerca.
  const [query, setQuery] = useState('');
  const trimmedQuery = query.trim();

  const filteredByLevel = useMemo(() => {
    const map = new Map();
    for (const [k, list] of topicsByLevel) {
      map.set(k, list.filter((topic) => topicMatchesQuery(topic, trimmedQuery)));
    }
    return map;
  }, [topicsByLevel, trimmedQuery]);

  // Nivell del "tema actual" (últim visitat no completat).
  const activeTopicId = useMemo(
    () => findActiveTopicId(Array.from(topicsByLevel.values()), topicsProgress, exercisesState),
    [topicsByLevel, topicsProgress, exercisesState],
  );

  // Nivell que conté l'id amb ?focus=
  const focusLevelKey = useMemo(() => {
    if (!focusId) return null;
    for (const [k, list] of topicsByLevel) {
      if (list.some((x) => x.id === focusId)) return k;
    }
    return null;
  }, [focusId, topicsByLevel]);

  // Nivell per defecte obert.
  const defaultOpenLevelKey = useMemo(() => {
    if (focusLevelKey) return focusLevelKey;
    if (activeTopicId) {
      for (const [k, list] of topicsByLevel) {
        if (list.some((x) => x.id === activeTopicId)) return k;
      }
    }
    return levelKeys[0] ?? null;
  }, [focusLevelKey, activeTopicId, topicsByLevel, levelKeys]);

  // Estat d'obertura per nivell. Clau: levelKey → bool.
  const [openMap, setOpenMap] = useState(() => {
    const initial = {};
    for (const k of levelKeys) initial[k] = k === defaultOpenLevelKey;
    return initial;
  });

  function handleToggle(levelKey, isOpen) {
    setOpenMap((prev) => (prev[levelKey] === isOpen ? prev : { ...prev, [levelKey]: isOpen }));
  }

  // Quan hi ha cerca, força obertura dels nivells amb matches; quan
  // es buida, torna a l'estat per defecte. (No persistim preferència
  // de l'usuari més enllà de l'interacció actual — la cerca és el
  // driver explícit de l'obertura.)
  useEffect(() => {
    if (trimmedQuery) {
      setOpenMap((prev) => {
        const next = { ...prev };
        for (const k of levelKeys) {
          next[k] = (filteredByLevel.get(k)?.length ?? 0) > 0;
        }
        return next;
      });
    }
    // Sense query: no fem res; deixem l'estat manual de l'usuari intacte.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmedQuery]);

  // Focus scroll: quan hi ha ?focus, posiciona el tema i assegura
  // que la seva secció estigui oberta.
  useEffect(() => {
    if (!focusId) return;
    // Força l'obertura del nivell amb el focus.
    if (focusLevelKey) {
      setOpenMap((prev) =>
        prev[focusLevelKey] ? prev : { ...prev, [focusLevelKey]: true },
      );
    }
  }, [focusId, focusLevelKey]);

  useEffect(() => {
    if (!focusId || !focusRef.current) return;
    const el = focusRef.current;
    // Petit retard perquè el <details> obri abans de l'scroll.
    const id = window.setTimeout(() => {
      const rect = el.getBoundingClientRect();
      const target = window.scrollY + rect.top - window.innerHeight / 3;
      window.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
    }, 80);
    return () => window.clearTimeout(id);
  }, [focusId, openMap]);

  return (
    <div className="section-gap max-w-content-list">
      <header className="space-y-3 mb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-reader-muted">
          {t('topics.kicker')}
        </p>
        <h1 className="font-serif font-medium text-4xl sm:text-5xl tracking-tight text-reader-ink">
          {t('topics.title')}
        </h1>
        <p className="font-serif italic text-lg text-reader-ink-2 max-w-prose">
          {t('topics.intro')}
        </p>
      </header>

      {/* Cerca — filtra per id o shortTitle. */}
      {levelKeys.length > 0 && (
        <div className="mb-6">
          <label htmlFor="topics-search" className="sr-only">
            {t('topics.searchLabel')}
          </label>
          <div className="relative flex items-center">
            <Search
              size={14}
              className="absolute left-3 text-reader-muted pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="topics-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('topics.searchPlaceholder')}
              autoComplete="off"
              spellCheck={false}
              className={[
                'w-full sm:max-w-md',
                'pl-9 pr-9 py-2',
                'bg-transparent border border-reader-rule rounded-sm',
                'font-serif text-sm text-reader-ink',
                'placeholder:text-reader-muted placeholder:italic',
                'focus:outline-none focus:border-reader-ink',
                'transition-colors duration-fast ease-standard',
              ].join(' ')}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label={t('topics.searchClear')}
                className={[
                  'absolute right-2 p-1',
                  'text-reader-muted hover:text-reader-ink',
                  'transition-colors duration-fast ease-standard',
                ].join(' ')}
              >
                <X size={14} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      )}

      {levelKeys.length === 0 && (
        <p className="font-serif text-reader-ink-2">{t('topics.empty')}</p>
      )}

      <div>
        {levelKeys.map((levelKey) => {
          const filtered = filteredByLevel.get(levelKey) ?? [];
          const total = totalsByLevel.get(levelKey) ?? 0;
          return (
            <LevelSection
              key={levelKey}
              levelKey={levelKey}
              topics={filtered}
              exercisesState={exercisesState}
              t={t}
              open={!!openMap[levelKey]}
              onToggle={handleToggle}
              focusId={focusId}
              focusRef={focusRef}
              totalCount={total}
            />
          );
        })}
        {levelKeys.length > 0 && <div className="border-t border-reader-rule" />}
      </div>
    </div>
  );
}
