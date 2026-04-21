import { useEffect, useState } from 'react';

/*
 * ReaderEntrySplash · §80
 *
 * Overlay d'entrada quan es comença una nova lliçó al Focus Reader.
 * Mostra el codi del tema (p. ex. A1a-2), el títol editorial i la
 * descripció breu. Fade-in suau, pausa ~2.2 s i fade-out cap al
 * contingut del reader.
 *
 * L'usuari pot saltar-se'l amb qualsevol tecla d'acció (Enter, Space,
 * →, Esc) o clic sobre l'splash.
 */
export function ReaderEntrySplash({ topic, onDismiss }) {
  const [leaving, setLeaving] = useState(false);

  const dismiss = () => {
    if (leaving) return;
    setLeaving(true);
    // Esperem que acabi l'animació de sortida abans de desmuntar.
    window.setTimeout(onDismiss, 320);
  };

  useEffect(() => {
    // Auto-dismiss després del temps de pausa.
    const t = window.setTimeout(dismiss, 2200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (
        e.key === 'Enter' ||
        e.key === ' ' ||
        e.key === 'ArrowRight' ||
        e.key === 'Escape'
      ) {
        e.preventDefault();
        e.stopPropagation();
        dismiss();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={'kf-entry-splash' + (leaving ? ' is-leaving' : '')}
      onClick={dismiss}
      role="dialog"
      aria-label={topic.title}
    >
      <div className="kf-entry-splash-inner">
        <p className="kf-entry-splash-kicker">
          <span>Kompass</span>
          <span className="kf-entry-splash-kicker-sep" />
          <span>{topic.id}</span>
        </p>
        <h1 className="kf-entry-splash-title">{topic.title}</h1>
        {topic.description ? (
          <p className="kf-entry-splash-desc">{topic.description}</p>
        ) : null}
        <p className="kf-entry-splash-hint">
          Prem <kbd>→</kbd> o clica per començar
        </p>
      </div>
    </div>
  );
}
