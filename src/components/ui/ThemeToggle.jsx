import { useT } from '@/i18n';
import { useTheme } from '@/theme';

const OPTIONS = ['light', 'dark', 'system'];

export function ThemeToggle() {
  const { t } = useT();
  const { preference, setPreference } = useTheme();

  return (
    <label className="flex items-center gap-2 text-sm text-content-muted">
      <span className="sr-only sm:not-sr-only">{t('theme.label')}</span>
      <select
        className="bg-surface text-content border border-border rounded-sm px-2 py-1"
        value={preference}
        onChange={(e) => setPreference(e.target.value)}
      >
        {OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {t(`theme.${opt}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
