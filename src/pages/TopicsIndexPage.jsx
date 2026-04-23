import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { useT } from '@/i18n';
import { getAllLevelKeys, getTopicsByLevel } from '@/lib/dataLoader.js';
import { useProgressStore } from '@/store/useProgressStore.js';
import { computeTopicProgress } from '@/lib/topicProgress.js';
import { groupTopics, isVocabulary } from '@/lib/topicGroups.js';

/*
 * TopicsIndexPage · temari com a navegador temàtic.
 *
 * Layout: dos nivells (A1a, A1b) com a seccions <details>. Dins de cada
 * nivell, els temes s'agrupen en CARDS TEMÀTIQUES (p. ex. "Primeres
 * frases", "Gèneres i articles"…) que es disposen en un grid de 3
 * columnes a desktop. Cada card conté els seus temes com a files
 * compactes amb id mono + shortTitle + barra de progrés.
 *
 * Objectiu: d'un cop d'ull poder veure l'estructura temàtica del nivell
 * sense scroll infinit, amb la lògica narrativa del curs preservada.
 *
 * Decisions:
 *   - Agrupacions definides per ranges d'id al fitxer (TOPIC_GROUPS).
 *     Canviar l'agrupació = editar la constant; no cal tocar JSON.
 *   - Títols dels grups en català, curts, editorials.
 *   - Cerca: input al costat del kicker "Temes" (dreta), no al mig.
 *   - h1 "Temari" suprimit per evitar redundància amb el kicker.
 *   - A1a-0 està exclòs (onboarding, viu a la landing).
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

/* Fila compacta d'un tema dins d'una card temàtica.
 * id · shortTitle · indicador final (% o check). Sense barra.
 * El fons mosquetejat al hover indica interactivitat; el pct es
 * manté discret en mono a la dreta. */
function TopicRow({ topic, progress, t, isFocus, focusRef, revealIndex }) {
  const { total, pct, allDone } = progress;
  const hasExercises = total > 0;
  const delayMs = Math.min(revealIndex * 35, 500);
  return (
    <Link
      ref={isFocus ? focusRef : null}
      to={`/temari/${topic.id}`}
      className={[
        'group flex items-baseline gap-3',
        'py-2.5 px-2 -mx-2',
        'hover:bg-reader-paper-2',
        'transition-colors duration-fast ease-standard',
        'progress-row-reveal',
        isVocabulary(topic) ? 'is-vocab' : '',
        isFocus ? 'topics-focus' : '',
      ].join(' ')}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <span className="font-mono text-[11px] uppercase tracking-[0.16em] w-7 flex-shrink-0 text-right topic-row-id">
        {topic.id.replace(/^A1[ab]-/, '')}
      </span>
      <span className="flex-1 min-w-0 font-serif text-base text-reader-ink tracking-tight truncate topic-row-title">
        {topic.shortTitle}
      </span>
      <span className="flex-shrink-0">
        {hasExercises ? (
          allDone ? (
            <Check size={14} className="text-reader-ok" aria-hidden="true" />
          ) : pct > 0 ? (
            <span className="font-mono text-[10px] text-reader-muted">
              {pct}%
            </span>
          ) : (
            <span className="font-mono text-[10px] text-reader-muted">·</span>
          )
        ) : (
          <span className="font-mono text-[10px] text-reader-muted">—</span>
        )}
      </span>
    </Link>
  );
}

/* Bloc temàtic editorial: títol curt (mono kicker) + border-top + llista
 * de temes amb divisions horitzontals. Sense card box — estil obert,
 * coherent amb els blocs de /progres. Viu dins d'un grid de 3 col. */
function GroupBlock({
  group,
  topics,
  exercisesState,
  t,
  focusId,
  focusRef,
  startIndex,
}) {
  return (
    <div className="flex flex-col">
      <h3 className="font-mono text-[11px] uppercase tracking-[0.22em] text-reader-muted pt-4 pb-3 border-t-2 border-reader-rule">
        {group.title}
      </h3>
      <ul className="flex flex-col">
        {topics.map((topic, i) => {
          const progress = computeTopicProgress(topic, exercisesState);
          const isFocus = topic.id === focusId;
          return (
            <li key={topic.id} className="border-b border-reader-rule last:border-b-0">
              <TopicRow
                topic={topic}
                progress={progress}
                t={t}
                isFocus={isFocus}
                focusRef={focusRef}
                revealIndex={startIndex + i}
              />
            </li>
          );
        })}
      </ul>
    </div>
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

      <div className="pb-5 pt-3">
        {shownCount === 0 ? (
          <p className="font-serif italic text-sm text-reader-ink-2 px-2 py-4">
            {t('topics.emptyForSearch')}
          </p>
        ) : (
          // Temes agrupats temàticament en blocs editorials (sense
          // card box). 3 columnes a desktop amb prou aire; 2 a tablet,
          // 1 a mòbil. Gap generós per separar visualment els blocs.
          <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {(() => {
              const groups = groupTopics(levelKey, topics);
              let cum = 0;
              return groups.map((entry) => {
                const startIndex = cum;
                cum += entry.topics.length;
                return (
                  <GroupBlock
                    key={entry.group.id}
                    group={entry.group}
                    topics={entry.topics}
                    exercisesState={exercisesState}
                    t={t}
                    focusId={focusId}
                    focusRef={focusRef}
                    startIndex={startIndex}
                  />
                );
              });
            })()}
          </div>
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
      {/* Capçalera editorial com a ProgressPage: kicker mono + h1 serif
          + subtítol italic. La cerca s'alinea a la dreta del h1 per
          estalviar una fila i mantenir l'estructura ordenada. */}
      <header className="mb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-reader-muted">
          {t('topics.kicker')}
        </p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="font-serif font-medium text-4xl sm:text-5xl tracking-tight text-reader-ink">
            {t('topics.title')}
          </h1>
          {levelKeys.length > 0 && (
            <div className="relative flex items-center w-full sm:w-auto sm:min-w-[320px]">
              <Search
                size={14}
                className="absolute left-3 text-reader-muted pointer-events-none"
                aria-hidden="true"
              />
              <label htmlFor="topics-search" className="sr-only">
                {t('topics.searchLabel')}
              </label>
              <input
                id="topics-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('topics.searchPlaceholder')}
                autoComplete="off"
                spellCheck={false}
                className={[
                  'w-full',
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
          )}
        </div>
        <p className="mt-4 font-serif italic text-lg text-reader-ink-2 max-w-prose">
          {t('topics.intro')}
        </p>
      </header>

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
