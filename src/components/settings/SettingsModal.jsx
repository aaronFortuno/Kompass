import { useEffect } from 'react';
import { X as CloseIcon, Settings as SettingsIcon } from 'lucide-react';
import { useT } from '@/i18n';
import { useSettingsStore } from '@/store/useSettingsStore.js';
import { SettingsBody } from '@/components/settings/SettingsBody.jsx';

/*
 * SettingsModal · §112
 *
 * Modal global d'ajustaments. Únic punt d'entrada per a tot el
 * contingut de /settings — abans hi havia dues implementacions
 * (pàgina i drawer del reader) que divergien. Ara totes dues
 * aguulen cap a aquest modal.
 *
 * Desencadenat per:
 *   - cog al header (totes les rutes d'AppShell).
 *   - cog al peu del reader i drecera `c` dins del reader.
 *   - ruta /settings (redirigeix a / i obre el modal — manté bookmarks).
 *
 * Sempre muntat a nivell de <HashRouter> (App.jsx) perquè el toggle
 * sobrevisqui a canvis de ruta. Patró sempre-present amb classe
 * `is-open` per permetre fade in/out com els altres modals
 * (AboutModal, TabImageLightbox).
 */
export function SettingsModal() {
  const { t } = useT();
  const open = useSettingsStore((s) => s.settingsOpen);
  const close = useSettingsStore((s) => s.setSettingsOpen);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close]);

  return (
    <>
      <div
        className={['settings-backdrop', open ? 'is-open' : ''].join(' ')}
        onClick={() => close(false)}
        aria-hidden="true"
      />
      <div
        className={['settings-modal', open ? 'is-open' : ''].join(' ')}
        role="dialog"
        aria-modal={open}
        aria-labelledby="settings-modal-title"
        aria-hidden={!open}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="settings-modal-header">
          <h2 id="settings-modal-title" className="settings-modal-title">
            <SettingsIcon size={18} aria-hidden="true" strokeWidth={1.75} />
            <span>{t('settings.title')}</span>
          </h2>
          <button
            type="button"
            className="settings-modal-close"
            onClick={() => close(false)}
            aria-label="Tancar ajustaments"
          >
            <CloseIcon size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="settings-modal-body">
          <SettingsBody />
        </div>
      </div>
    </>
  );
}
