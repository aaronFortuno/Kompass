import { Sun, Moon } from 'lucide-react';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';

const ICONS = { light: Sun, dark: Moon };

export function ThemeToggle() {
  const { t } = useT();
  const { preference, toggle } = useTheme();

  const Icon = ICONS[preference] ?? Sun;
  const currentLabel = t(`theme.${preference}`);
  const nextLabel = t(`theme.${preference === 'dark' ? 'light' : 'dark'}`);

  return (
    <button
      type="button"
      className="btn-ghost p-2 rounded-sm"
      aria-label={`${t('theme.label')}: ${currentLabel}. ${nextLabel}`}
      title={`${t('theme.label')}: ${currentLabel}`}
      onClick={toggle}
    >
      <Icon size={20} aria-hidden="true" />
    </button>
  );
}
