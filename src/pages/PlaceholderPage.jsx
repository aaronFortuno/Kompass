import { Link } from 'react-router-dom';
import { useT } from '@/i18n';

export function PlaceholderPage({ titleKey }) {
  const { t } = useT();

  return (
    <div className="section-gap max-w-content-read">
      <h1 className="text-3xl font-semibold text-content">
        {titleKey ? t(titleKey) : t('placeholder.title')}
      </h1>
      <p className="text-content-muted">{t('placeholder.body')}</p>
      <Link to="/" className="btn-ghost inline">
        {t('placeholder.backHome')}
      </Link>
    </div>
  );
}
