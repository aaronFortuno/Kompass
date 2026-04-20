import { Sun, Moon, Monitor } from 'lucide-react';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';

const CYCLE = ['light', 'dark', 'system'];
const ICONS = { light: Sun, dark: Moon, system: Monitor };

export function ThemeToggle() {
  const { t } = useT();
  const { preference, setPreference } = useTheme();

  const Icon = ICONS[preference] ?? Monitor;
  const currentLabel = t(`theme.${preference}`);
  const nextPreference = CYCLE[(CYCLE.indexOf(preference) + 1) % CYCLE.length];
  const nextLabel = t(`theme.${nextPreference}`);

  return (
    <button
      type="button"
      className="btn-ghost p-2 rounded-sm"
      aria-label={`${t('theme.label')}: ${currentLabel}. ${nextLabel}`}
      title={`${t('theme.label')}: ${currentLabel}`}
      onClick={() => setPreference(nextPreference)}
    >
      <Icon size={20} aria-hidden="true" />
    </button>
  );
}
