import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useT } from '@/i18n';
import { getAllLevelKeys, getTopicsByLevel } from '@/lib/dataLoader.js';
import { useProgressStore } from '@/store/useProgressStore.js';
import { computeTopicProgress } from '@/lib/topicProgress.js';

export function TopicsIndexPage() {
  const { t } = useT();
  const levelKeys = getAllLevelKeys();
  const exercisesState = useProgressStore((s) => s.exercises);

  return (
    <div className="section-gap max-w-content-list">
      <header className="space-y-3 mb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-reader-muted">
          Temari
        </p>
        <h1 className="font-serif font-medium text-4xl sm:text-5xl tracking-tight text-reader-ink">
          {t('topics.title')}
        </h1>
        <p className="font-serif italic text-lg text-reader-ink-2 max-w-prose">
          {t('topics.intro')}
        </p>
      </header>

      {levelKeys.length === 0 && (
        <p className="font-serif text-reader-ink-2">{t('topics.empty')}</p>
      )}

      {levelKeys.map((levelKey) => {
        const topics = getTopicsByLevel(levelKey);
        return (
          <section key={levelKey} className="space-y-4 mt-10 first:mt-0">
            <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-reader-ink border-b border-reader-rule pb-2">
              {levelKey.toUpperCase()}
            </h2>
            <ul className="grid gap-0 divide-y divide-reader-rule">
              {topics.map((topic) => {
                const { total, completed, pct, allDone } =
                  computeTopicProgress(topic, exercisesState);
                const hasExercises = total > 0;
                return (
                  <li key={topic.id}>
                    <Link
                      to={`/temari/${topic.id}`}
                      className={[
                        'group flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6',
                        'py-5 px-2 -mx-2',
                        'hover:bg-reader-paper-2',
                        'transition-colors duration-fast ease-standard',
                      ].join(' ')}
                    >
                      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-reader-muted sm:w-20 flex-shrink-0">
                        {topic.id}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-serif text-xl text-reader-ink group-hover:text-reader-ink tracking-tight">
                          {topic.shortTitle}
                        </span>
                        <span className="block font-serif italic text-sm text-reader-ink-2 mt-1">
                          {topic.description}
                        </span>
                      </span>

                      <span className="flex-shrink-0 sm:w-32 flex items-center gap-2">
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
                              <Check size={14} className="text-reader-ok" aria-hidden="true" />
                            ) : (
                              <span className="font-mono text-[10px] text-reader-muted w-8 text-right">
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
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
