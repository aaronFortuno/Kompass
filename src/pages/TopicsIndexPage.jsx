import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
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
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-content">{t('topics.title')}</h1>
        <p className="text-content-muted">{t('topics.intro')}</p>
      </header>

      {levelKeys.length === 0 && (
        <p className="text-content-muted">{t('topics.empty')}</p>
      )}

      {levelKeys.map((levelKey) => {
        const topics = getTopicsByLevel(levelKey);
        return (
          <section key={levelKey} className="space-y-3">
            <h2 className="text-xl font-semibold text-content">{levelKey.toUpperCase()}</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {topics.map((topic) => {
                const { total, completed, pct, allDone } =
                  computeTopicProgress(topic, exercisesState);
                const hasExercises = total > 0;
                return (
                  <li key={topic.id}>
                    <Link
                      to={`/temes/${topic.id}`}
                      className="card block hover:border-accent"
                    >
                      <span className="block text-xs uppercase tracking-wide text-content-muted">
                        {topic.id}
                      </span>
                      <span className="block text-lg font-semibold text-content mt-1">
                        {topic.shortTitle}
                      </span>
                      <span className="block text-sm text-content-muted mt-1">
                        {topic.description}
                      </span>

                      {hasExercises ? (
                        <div className="mt-3 space-y-1.5">
                          <div
                            className="h-1.5 bg-border rounded-full overflow-hidden"
                            role="progressbar"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={pct}
                          >
                            <div
                              className={[
                                'h-full rounded-full transition-[width] duration-base ease-standard',
                                allDone ? 'bg-success' : 'bg-accent',
                              ].join(' ')}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          {allDone ? (
                            <span className="flex items-center gap-1 text-xs text-success">
                              <CheckCircle2 size={14} aria-hidden="true" />
                              {t('topics.progress.completed')}
                            </span>
                          ) : (
                            <span className="block text-xs text-content-muted">
                              {t('topics.progress.progressLabel', {
                                completed,
                                total,
                              })}
                              {' — '}
                              {t('topics.progress.progressPct', { pct })}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="block mt-3 text-xs text-content-muted">
                          {t('topics.progress.noExercises')}
                        </span>
                      )}
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
