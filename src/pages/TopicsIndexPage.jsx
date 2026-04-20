import { Link } from 'react-router-dom';
import { useT } from '@/i18n';
import { getAllLevelKeys, getTopicsByLevel } from '@/lib/dataLoader.js';

export function TopicsIndexPage() {
  const { t } = useT();
  const levelKeys = getAllLevelKeys();

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
              {topics.map((topic) => (
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
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
