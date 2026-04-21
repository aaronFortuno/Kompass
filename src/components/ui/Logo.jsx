import { Compass } from 'lucide-react';
import { useT } from '@/i18n';

/*
 * Logo de Kompass — versió editorial.
 * Icona Compass + wordmark en serif (Newsreader). Color ink, no accent —
 * la família UI cromàtica original s'ha substituït per la paper/ink càlida
 * a tot el shell (§17.1 ARCHITECTURE).
 */
export function Logo({ showWordmark = true, size = 18 }) {
  const { t } = useT();

  return (
    <span className="inline-flex items-center gap-2 text-reader-ink">
      <Compass
        size={size}
        className="shrink-0"
        strokeWidth={1.75}
        aria-hidden={showWordmark ? 'true' : undefined}
        aria-label={showWordmark ? undefined : t('app.name')}
      />
      {showWordmark && (
        <span className="font-serif font-semibold text-[15px] tracking-tight">
          {t('app.name')}
        </span>
      )}
    </span>
  );
}
