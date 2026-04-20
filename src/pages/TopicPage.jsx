import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTopic } from '@/hooks/useTopic.js';
import { useT } from '@/i18n';
import { StepViewer } from '@/components/topic/StepViewer.jsx';

function BackLink() {
  const { t } = useT();
  return (
    <Link
      to="/temes"
      className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content motion-hover"
    >
      <ArrowLeft size={16} aria-hidden="true" />
      <span>{t('topic.backToIndex')}</span>
    </Link>
  );
}

export function TopicPage() {
  const { topicId } = useParams();
  const { t } = useT();
  const topic = useTopic(topicId);

  if (!topic) {
    return (
      <div className="section-gap max-w-content-read">
        <BackLink />
        <h1 className="text-3xl font-semibold text-content">
          {t('topic.notFoundTitle')}
        </h1>
        <p className="text-content-muted">
          {t('topic.notFoundBody', { id: topicId })}
        </p>
      </div>
    );
  }

  return (
    <article className="section-gap max-w-content-read">
      <header className="space-y-3">
        <BackLink />
        <p className="text-sm uppercase tracking-wide text-content-muted">
          {topic.id}
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold text-content">
          {topic.title}
        </h1>
        <p className="text-content-muted">{topic.description}</p>
      </header>

      <StepViewer topic={topic} />
    </article>
  );
}
