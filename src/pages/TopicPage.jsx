import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTopic } from '@/hooks/useTopic.js';
import { useT } from '@/i18n';
import { FocusReader } from '@/components/reader/FocusReader.jsx';

/*
 * TopicPage · §18 ARCHITECTURE
 *
 * Punt d'entrada a un tema. Es renderitza fora de l'AppShell (vegeu
 * src/App.jsx) per permetre que el FocusReader ocupi la viewport
 * sencera sense el header/footer del shell.
 *
 * Si el topic no existeix, mostrem una pàgina d'error amb accés al
 * temari. Es renderitza amb el fons paper i la mateixa tipografia
 * editorial per coherència.
 */
export function TopicPage() {
  const { topicId } = useParams();
  const { t } = useT();
  const topic = useTopic(topicId);

  if (!topic) {
    return (
      <div className="min-h-screen bg-reader-paper text-reader-ink px-6 py-12">
        <div className="max-w-content-read mx-auto section-gap">
          <Link
            to="/temari"
            className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.14em] text-reader-ink-2 hover:text-reader-ink transition-colors duration-fast ease-standard"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            <span>{t('topic.backToIndex')}</span>
          </Link>
          <h1 className="font-serif text-4xl font-medium text-reader-ink">
            {t('topic.notFoundTitle')}
          </h1>
          <p className="font-serif text-reader-ink-2">
            {t('topic.notFoundBody', { id: topicId })}
          </p>
        </div>
      </div>
    );
  }

  return <FocusReader topic={topic} />;
}
