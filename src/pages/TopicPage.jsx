import { useParams, Link } from 'react-router-dom';
import { useTopic } from '@/hooks/useTopic.js';
import { useT } from '@/i18n';
import { ContentBlock } from '@/components/topic/ContentBlock.jsx';

export function TopicPage() {
  const { topicId } = useParams();
  const { t } = useT();
  const topic = useTopic(topicId);

  if (!topic) {
    return (
      <div className="section-gap max-w-content-read">
        <h1 className="text-3xl font-semibold text-content">
          {t('topic.notFoundTitle')}
        </h1>
        <p className="text-content-muted">
          {t('topic.notFoundBody', { id: topicId })}
        </p>
        <Link to="/temes" className="btn-ghost inline">
          {t('topic.backToIndex')}
        </Link>
      </div>
    );
  }

  return (
    <article className="section-gap max-w-content-read">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-content-muted">
          {topic.id} · {t('topic.levelLabel', { level: `${topic.level}${topic.sublevel ?? ''}` })}
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold text-content">
          {topic.title}
        </h1>
        <p className="text-content-muted">{topic.description}</p>
      </header>

      <div className="space-y-8">
        {topic.content.map((block, i) => (
          <ContentBlock key={i} block={block} />
        ))}
      </div>

      <footer className="pt-4 border-t border-border">
        <Link to="/temes" className="btn-ghost inline">
          {t('topic.backToIndex')}
        </Link>
      </footer>
    </article>
  );
}
