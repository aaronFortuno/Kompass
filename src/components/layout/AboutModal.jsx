import { useEffect, useState } from 'react';
import {
  X as CloseIcon,
  GitBranch,
  Mail,
  GitPullRequest,
  Copy,
  Check,
  Briefcase,
  Zap,
  BookOpen,
  Volume2,
  Type,
  Package,
} from 'lucide-react';
import pkg from '../../../package.json';

/*
 * AboutModal · "Qui sóc" i motivació del projecte.
 *
 * S'obre des d'un botó al peu global. Fade del backdrop + scale+fade
 * del contenidor. Esc o click al backdrop el tanquen. Respecta
 * prefers-reduced-motion (sense animació).
 *
 * Contingut: presentació personal breu, motivació del projecte,
 * stack tècnic, suport V4V (Lightning), com reportar errors,
 * enllaços al repositori i al portafoli.
 */

const APP_VERSION = pkg.version ?? '0.0.1';

const LN_ADDRESS = 'aptswim903@walletofsatoshi.com';
const REPO_URL = 'https://github.com/aaronFortuno/Kompass';
const PORTFOLIO_URL = 'https://github.com/aaronFortuno';
const EMAIL = 'afortun8@xtec.cat';

/* Stack tècnic principal — llista curta, només els pilars. */
const STACK = [
  { icon: BookOpen, label: 'React 18 · Vite 5 · Tailwind' },
  { icon: Volume2, label: 'Azure Neural TTS · veu Seraphina' },
  { icon: Type, label: 'Newsreader · IBM Plex Mono' },
  { icon: Package, label: 'Zustand · Zod · Lucide icons' },
];

export function AboutModal({ open, onClose }) {
  const [copied, setCopied] = useState(false);

  // Esc tanca; capturat en fase de capture perquè no xoca amb altres
  // handlers globals (p. ex. el del reader, si mai se superposés).
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    // Bloquegem scroll del body mentre el modal està obert.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(LN_ADDRESS);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Silenci — el text ja és visible a la pantalla, pot copiar manualment.
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={['about-backdrop', open ? 'is-open' : ''].join(' ')}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal container */}
      <div
        className={['about-modal', open ? 'is-open' : ''].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        aria-hidden={!open}
      >
        <header className="about-modal-header">
          <h2 id="about-title" className="about-modal-title">
            Qui sóc
          </h2>
          <button
            type="button"
            className="about-modal-close"
            onClick={onClose}
            aria-label="Tancar"
          >
            <CloseIcon size={16} aria-hidden="true" />
          </button>
        </header>

        <div className="about-modal-body">
          {/* Presentació personal */}
          <section className="about-section">
            <p className="about-lead">
              Hola, sóc <strong>l&apos;Aarón</strong>.
            </p>
            <p className="about-paragraph">
              Entre altres coses, sóc mestre de primària, entusiasta de les
              noves tecnologies <em>agèntiques</em> — sobretot de Claude Code —
              i actualment estudiant d&apos;alemany de nivell A1. Volia una
              eina a mida per aprendre i repassar els conceptes que em costen
              més, i com que em sembla una idea útil per a qualsevol altra
              persona en la mateixa situació, he publicat Kompass en obert.
            </p>
          </section>

          {/* Motivació i repositori */}
          <section className="about-section">
            <h3 className="about-subhead">Codi obert</h3>
            <p className="about-paragraph">
              El projecte viu al repositori, sota llicència MIT. Qualsevol
              persona pot clonar-lo, adaptar-lo o contribuir-hi.
            </p>
            <a
              className="about-link-row"
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <GitBranch size={16} aria-hidden="true" />
              <span>github.com/aaronFortuno/Kompass</span>
            </a>
          </section>

          {/* Stack tècnic */}
          <section className="about-section">
            <h3 className="about-subhead">Tecnologies i fonts</h3>
            <ul className="about-stack">
              {STACK.map((s) => (
                <li key={s.label} className="about-stack-item">
                  <s.icon size={14} aria-hidden="true" />
                  <span>{s.label}</span>
                </li>
              ))}
            </ul>
            <p className="about-note">
              Els materials gramaticals estan contrastats amb{' '}
              <em>Deutsche Welle</em>, <em>Goethe-Institut</em> i{' '}
              <em>DWDS</em>. Les il·lustracions decoratives són pròpies o
              d&apos;autors citats al crèdit de cada imatge.
            </p>
          </section>

          {/* Suport via Lightning (V4V) */}
          <section className="about-section">
            <h3 className="about-subhead">
              <Zap size={14} aria-hidden="true" /> Suport · Value4Value
            </h3>
            <p className="about-paragraph">
              Kompass és gratuït i sense anuncis. Si t&apos;ha sigut útil i et
              ve de gust convidar-me a un cafè, pots fer-ho amb uns sats via{' '}
              <em>Lightning Network</em>.
            </p>
            <div className="about-v4v">
              <div className="about-v4v-qr">
                <img
                  src={`${import.meta.env.BASE_URL}qr-lightning.svg`}
                  alt={`Codi QR Lightning per a ${LN_ADDRESS}`}
                  width="148"
                  height="148"
                />
              </div>
              <div className="about-v4v-addr">
                <span className="about-v4v-label">Adreça Lightning</span>
                <code className="about-v4v-code">{LN_ADDRESS}</code>
                <button
                  type="button"
                  className="about-v4v-copy"
                  onClick={copyAddress}
                  aria-label="Copia l'adreça Lightning"
                >
                  {copied ? (
                    <>
                      <Check size={12} aria-hidden="true" /> Copiat
                    </>
                  ) : (
                    <>
                      <Copy size={12} aria-hidden="true" /> Copiar
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>

          {/* Errors i contacte */}
          <section className="about-section">
            <h3 className="about-subhead">Errors o suggeriments</h3>
            <p className="about-paragraph">
              Si detectes un error (lingüístic, tècnic, pedagògic), m&apos;ho
              pots fer saber de dues maneres:
            </p>
            <div className="about-link-grid">
              <a
                className="about-link-row"
                href={`mailto:${EMAIL}`}
              >
                <Mail size={16} aria-hidden="true" />
                <span>{EMAIL}</span>
              </a>
              <a
                className="about-link-row"
                href={`${REPO_URL}/pulls`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <GitPullRequest size={16} aria-hidden="true" />
                <span>Obrir un PR</span>
              </a>
            </div>
          </section>

          {/* Altres projectes */}
          <section className="about-section">
            <h3 className="about-subhead">Altres projectes</h3>
            <a
              className="about-link-row"
              href={PORTFOLIO_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Briefcase size={16} aria-hidden="true" />
              <span>github.com/aaronFortuno</span>
            </a>
          </section>
        </div>

        <footer className="about-modal-foot">
          <span className="about-version">
            Kompass v{APP_VERSION} · MIT
          </span>
        </footer>
      </div>
    </>
  );
}
