import { useT } from '@/i18n';

export function LocaleSwitcher() {
  const { t, locale, setLocale, availableLocales } = useT();

  return (
    <label className="flex items-center gap-2 text-sm text-content-muted">
      <span className="sr-only sm:not-sr-only">{t('locale.label')}</span>
      <select
        className="bg-surface text-content border border-border rounded-sm px-2 py-1"
        value={locale}
        onChange={(e) => setLocale(e.target.value)}
      >
        {availableLocales.map((loc) => (
          <option key={loc} value={loc}>
            {t(`locale.${loc}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
