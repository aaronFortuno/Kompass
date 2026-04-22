import { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { useSpeak } from '@/lib/audio/useSpeak.js';
import { parseInline } from '@/lib/reader/parseInline.js';

/*
 * SpeakableText · §92
 *
 * Envolta un text alemany amb un wrapper clickable (pill editorial)
 * que, al clicar, reprodueix l'àudio via Web Speech API. Mostra una
 * icona de speaker subtil per indicar l'interactivitat. Al hover i al
 * focus, el fons s'enfosqueix lleugerament per reforçar l'affordance.
 *
 * Si el navegador no suporta speechSynthesis, el wrapper es renderitza
 * com a text pla (sense interacció) per no confondre l'usuari.
 *
 * parseInline s'aplica al text perquè els marcadors d'inline rich
 * (**, ==, _, `) continuïn renderitzant-se correctament dins del pill.
 */
export function SpeakableText({ text, as: Tag = 'span', className }) {
  const { speak, isSupported, hasGermanVoice } = useSpeak();
  const [active, setActive] = useState(false);

  // Si no hi ha Web Speech API, o no hi ha veu alemanya disponible al
  // sistema, renderitzem com a text pla — millor cap pill interactiva
  // que una pill que reproduiria alemany amb fonètica errònia (p. ex.
  // veu catalana llegint "Ich heiße Marc").
  if (!isSupported || !hasGermanVoice) {
    return <Tag className={className}>{parseInline(text)}</Tag>;
  }

  // Per al clic: si l'usuari vol llegir silenciós el text, ha de poder
  // fer-ho sense activar àudio. Solució: el clic sí que activa speak,
  // però el hover només mostra l'affordance.
  const onActivate = () => {
    setActive(true);
    speak(text);
    // Reset després d'un temps raonable (estimació ms/char).
    window.setTimeout(() => setActive(false), Math.min(200 * text.length, 6000));
  };

  return (
    <Tag
      className={[
        'kf-speak',
        active ? 'is-playing' : '',
        className || '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="button"
      tabIndex={0}
      onClick={onActivate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onActivate();
        }
      }}
      aria-label={`Escolta: ${text.replace(/[*=_`]/g, '')}`}
      title="Escolta la pronúncia"
    >
      {parseInline(text)}
      <Volume2
        className="kf-speak-icon"
        size={12}
        strokeWidth={2}
        aria-hidden="true"
      />
    </Tag>
  );
}
