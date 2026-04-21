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

  // Key={topic.id}: quan l'usuari salta d'una lliçó a l'altra
  // (navigate('/temari/A1a-2') des del final d'A1a-1), forcem un re-mount
  // complet del reader. Així tot l'estat intern (stepIdx, beatIdx,
  // splashVisible, readyToExit, fastMode…) es reseteja de cop i evitem
  // loops d'updates entre renders intermedis on el topic és nou però
  // els states encara vells.
  return <FocusReader topic={topic} key={topic.id} />;
}
