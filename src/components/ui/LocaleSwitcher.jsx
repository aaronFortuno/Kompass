import { Languages } from 'lucide-react';
import { useT } from '@/i18n';

export function LocaleSwitcher() {
  const { t, locale, setLocale, availableLocales } = useT();

  const nextLocale =
    availableLocales[(availableLocales.indexOf(locale) + 1) % availableLocales.length];
  const currentLabel = t(`locale.${locale}`);
  const nextLabel = t(`locale.${nextLocale}`);

  return (
    <button
      type="button"
      className="btn-ghost p-2 rounded-sm relative"
      aria-label={`${t('locale.label')}: ${currentLabel}. ${nextLabel}`}
      title={`${t('locale.label')}: ${currentLabel}`}
      onClick={() => setLocale(nextLocale)}
    >
      <Languages size={20} aria-hidden="true" />
      <span className="absolute -bottom-0.5 -right-0.5 text-[10px] font-semibold bg-accent text-accent-content rounded-sm px-1 leading-tight uppercase">
        {locale}
      </span>
    </button>
  );
}
