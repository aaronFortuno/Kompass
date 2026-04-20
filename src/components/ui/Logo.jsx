import { Compass } from 'lucide-react';
import { useT } from '@/i18n';

/*
 * Logo de Kompass.
 * Provisional: icona Compass de Lucide + wordmark.
 * Quan tinguem una icona de marca definitiva, es substituirà el
 * contingut d'aquest component i la resta del projecte no ha de canviar.
 */
export function Logo({ showWordmark = true, size = 22 }) {
  const { t } = useT();

  return (
    <span className="inline-flex items-center gap-2">
      <Compass
        size={size}
        className="text-accent shrink-0"
        aria-hidden={showWordmark ? 'true' : undefined}
        aria-label={showWordmark ? undefined : t('app.name')}
      />
      {showWordmark && (
        <span className="font-semibold text-content">{t('app.name')}</span>
      )}
    </span>
  );
}
