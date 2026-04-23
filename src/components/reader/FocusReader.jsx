import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Compass,
  Dumbbell,
  Info,
  Lightbulb,
  AlertTriangle,
  Settings as SettingsIcon,
  Play,
  Pause,
  Copy,
  Check,
  X as CloseIcon,
  ZoomIn,
  List as ListIcon,
} from 'lucide-react';
import { useT } from '@/i18n';
import { useSettings, useSettingsStore } from '@/store/useSettingsStore.js';
import { useProgressStore } from '@/store/useProgressStore.js';
import { getExercise, getTopicsByLevel } from '@/lib/dataLoader.js';
import { buildBeats, isRichStep, stepKind } from '@/lib/reader/buildBeats.js';
import { legacyBlocksToBeats } from '@/lib/reader/legacyBlocksToBeats.js';
import {
  resolveTransition,
  resolveTypewriterSpeed,
  prefersReducedMotion,
} from '@/lib/reader/beatTransitions.js';
import { parseInline, stripRichMarkers } from '@/lib/reader/parseInline.js';
import { Typed } from '@/components/reader/Typed.jsx';
import {
  SpeakableText,
  markNextSpeakableClickProgrammatic,
} from '@/components/reader/SpeakableText.jsx';
import { ReaderExerciseEngine } from '@/components/reader/ReaderExerciseEngine.jsx';
import { ReaderEntrySplash } from '@/components/reader/ReaderEntrySplash.jsx';

/*
 * Focus Reader · ARCHITECTURE §18
 *
 * Overlay fullscreen editorial amb 3 nivells de navegació (beat/step/bloc).
 * Renderitza els steps del tema via dispatcher: format ric → buildBeats,
 * format llegat → legacyBlocksToBeats.
 *
 * Estat:
 *   - stepIdx: step actual (sincronitzat amb la URL via useParams/navigate)
 *   - beatIdx: beat actual dins del step (estat local, no a la URL)
 *
 * Teclat (§18.1):
 *   ← →                          : beat prev/next
 *   Ctrl/⌘ + ← →                 : step prev/next
 *   Ctrl/⌘ + Shift + ← →         : bloc prev/next
 *   Esc                          : tanca i torna al temari
 *   Dins d'inputs, ← → sense modificador continuen movent el cursor.
 *
 * Tàctil: swipe horitzontal per beat (mínim 50 px, dominant h, < 800 ms).
 *
 * Modes (§18.4):
 *   - studyMode: "fragment" (default) → un beat alhora
 *   - studyMode: "full" → tots els beats del step apilats
 */

// ───────────────────────────────────────────── helpers

function stepToBeats(step) {
  if (isRichStep(step)) return buildBeats(step);
  return legacyBlocksToBeats(step);
}

/*
 * Helper: detecta si un text alemany ja conté pills audibles internes
 * (marcadors `!!...!!`). En aquest cas, el render del beat NO ha
 * d'envoltar el conjunt amb un wrapper SpeakableText extern — els
 * pills interiors ja són autònoms i fer-ne un wrapper provocaria doble
 * reproducció (event bubbling) i un àudio sencer de la frase amb
 * separadors "·" pronunciats literalment. Quan no hi ha pills
 * interiors, mantenim el comportament clàssic (wrapper per tota la
 * frase). §98 polit.
 */
function hasInlineSpeakable(text) {
  return typeof text === 'string' && text.includes('!!');
}

/*
 * Compta els pills audibles d'un beat per fer una estimació del temps
 * d'àudio (timer de canvi de beat). Mira els camps del beat rellevants
 * segons el tipus i compta tant els `!!...!!` inline com els camps
 * estructurats que el wrapper acabaria convertint en pill.
 */
function countSpeakablesInBeat(beat) {
  if (!beat) return 0;
  let n = 0;
  const countInline = (s) => {
    if (typeof s !== 'string') return 0;
    const m = s.match(/!!([^!]+?)!!/g);
    return m ? m.length : 0;
  };
  switch (beat.type) {
    case 'example':
      if (beat.ex?.de) {
        const inline = countInline(beat.ex.de);
        n += inline > 0 ? inline : 1; // wrapper = 1 pill
      }
      break;
    case 'pron':
      n += 1; // tab.pron sempre pill
      if (beat.tab?.example?.de) {
        const inline = countInline(beat.tab.example.de);
        n += inline > 0 ? inline : 1;
      }
      if (beat.tab?.note) n += countInline(beat.tab.note);
      break;
    case 'compare':
      (beat.rows || []).forEach((r) => {
        if (r.de) {
          const inline = countInline(r.de);
          n += inline > 0 ? inline : 1;
        }
      });
      break;
    default:
      // Beats narratius, si mai porten !!...!! al body, lead, points, etc.
      n += countInline(beat.text);
      n += countInline(beat.body);
      n += countInline(beat.lead);
      if (Array.isArray(beat.points)) beat.points.forEach((p) => { n += countInline(p); });
      if (beat.callout?.body) n += countInline(beat.callout.body);
  }
  return n;
}

/*
 * Estima caràcters "visibles" del contingut principal del beat, net de
 * markers rich. S'usa per escalar la durada del temporitzador d'autoplay
 * (§87/§98): un beat de 20 chars no mereix els mateixos segons que un
 * de 200. Usem 50 chars com a referència neutra — a aquesta llargada
 * el delay és el que marca el setting. Els beats més curts van més
 * ràpid, els més llargs més lents.
 */
function estimateBeatChars(beat) {
  if (!beat) return 0;
  const clean = (s) => {
    if (typeof s !== 'string') return '';
    return s.replace(/\*\*|==|_|`|!!/g, '').trim();
  };
  const len = (s) => clean(s).length;
  switch (beat.type) {
    case 'heading':
    case 'lead':
    case 'body':
    case 'point':
    case 'rule':
      return len(beat.text);
    case 'example':
      return len(beat.ex?.de) + len(beat.ex?.ca) + len(beat.ex?.note);
    case 'pron':
      return len(beat.tab?.pron) + len(beat.tab?.gloss) + len(beat.tab?.note)
        + len(beat.tab?.example?.de) + len(beat.tab?.example?.ca);
    case 'pair':
      return len(beat.pair?.personal) + len(beat.pair?.possessive)
        + len(beat.pair?.gloss);
    case 'pitfall':
      return len(beat.pit?.bad) + len(beat.pit?.good) + len(beat.pit?.why);
    case 'callout':
      return len(beat.callout?.title) + len(beat.callout?.body);
    case 'compare': {
      let n = 0;
      (beat.rows || []).forEach((r) => {
        n += len(r.de) + len(r.ca) + len(r.es) + len(r.en);
      });
      return n;
    }
    case 'syn-table': {
      let n = len(beat.table?.title);
      (beat.table?.rows || []).forEach((row) => {
        row.forEach((cell) => {
          n += typeof cell === 'object' ? len(cell.text) : len(cell);
        });
      });
      return n;
    }
    default:
      return len(beat.text) + len(beat.body) + len(beat.lead);
  }
}

/*
 * Calcula la durada real de l'animació del temporitzador d'auto-advance.
 *
 * El setting autoPlayDelay és ara un NIVELL 1–5 (ràpid–lent) coherent
 * amb el slider del typewriter. Aquí el convertim a segons base per a
 * un beat "típic" de 50 caràcters i escalem linealment segons els
 * caràcters reals. Clamp a [1.2s, 12s] perquè un beat buit no avanci
 * instantani i un de molt llarg no s'aturi eternament.
 */
const AUTOPLAY_LEVEL_SECONDS = {
  1: 1.8,
  2: 2.4,
  3: 3.0,
  4: 4.0,
  5: 5.5,
};
function computeAutoPlayDuration(beat, level) {
  const baseSeconds = AUTOPLAY_LEVEL_SECONDS[level] ?? 3.0;
  const chars = estimateBeatChars(beat);
  if (!chars) return Math.max(1.2, baseSeconds);
  const factor = chars / 50;
  const scaled = baseSeconds * factor;
  return Math.min(12, Math.max(1.2, scaled));
}

/*
 * Hook d'orquestració d'autoplay seqüencial de pills dins d'un beat.
 * §98 polit (refactor autoplay).
 *
 * Quan `shouldStart` passa a true, cerca els elements `.kf-speak` dins
 * del containerRef i els reprodueix **seqüencialment**: clica el primer,
 * espera l'event `kompass:speakable-ended` o un timeout de seguretat,
 * fa pausa de `gapMs` ms, i continua. Entre pills fem una pausa més
 * generosa (per defecte 400 ms) perquè l'usuari pugui digerir cada un.
 *
 * Es cancel·la automàticament si:
 *   - shouldStart passa a false (beat deixa de ser current, es canvia
 *     de beat, el settings canvia).
 *   - El component es desmunta.
 *   - Arriba un event `kompass:speak-stop` global (p. ex. barra d'espai).
 */
function useBeatAutoPlaySequence(containerRef, shouldStart, gapMs = 400) {
  useEffect(() => {
    if (!shouldStart) return undefined;
    const container = containerRef.current;
    if (!container) return undefined;
    const pills = Array.from(container.querySelectorAll('.kf-speak'));
    if (pills.length === 0) return undefined;

    let cancelled = false;
    const onStop = () => { cancelled = true; };
    window.addEventListener('kompass:speak-stop', onStop);

    function wait(ms) {
      return new Promise((resolve) => {
        const t = window.setTimeout(resolve, ms);
        // Si cancel·lem, resolgues immediatament
        const cancel = () => { window.clearTimeout(t); resolve(); };
        if (cancelled) cancel();
      });
    }

    function waitForEnded() {
      return new Promise((resolve) => {
        let done = false;
        const onEnd = () => {
          if (done) return;
          done = true;
          window.removeEventListener('kompass:speakable-ended', onEnd);
          resolve();
        };
        window.addEventListener('kompass:speakable-ended', onEnd);
        // Salvaguarda: si per algun motiu l'event no arriba (p. ex. el
        // fallback de Web Speech, que no emet 'ended'), resolgues al cap
        // d'un temps raonable. Mai quedem enganxats.
        window.setTimeout(() => {
          if (done) return;
          done = true;
          window.removeEventListener('kompass:speakable-ended', onEnd);
          resolve();
        }, 6000);
      });
    }

    (async () => {
      // Delay inicial perquè l'usuari vegi el beat abans que comenci a sonar.
      await wait(250);
      for (let i = 0; i < pills.length; i++) {
        if (cancelled) return;
        // Marquem el click com a programàtic perquè el listener global
        // de 'kompass:speakable-activated' al FocusReader no ens pausi
        // l'autoplay timer.
        markNextSpeakableClickProgrammatic();
        pills[i].click();
        await waitForEnded();
        if (cancelled) return;
        if (i < pills.length - 1) await wait(gapMs);
      }
      // Tots els pills reproduïts: avisa al reader que pot disparar el
      // temporitzador de canvi de beat (si autoPlay també està actiu).
      if (!cancelled) {
        window.dispatchEvent(new CustomEvent('kompass:beat-audio-complete'));
      }
    })();

    return () => {
      cancelled = true;
      window.removeEventListener('kompass:speak-stop', onStop);
      // Dispara un stop perquè si hi havia un àudio sonant, es pausi.
      window.dispatchEvent(new CustomEvent('kompass:speak-stop'));
    };
    // containerRef és un ref; no cal ser dependència.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldStart, gapMs]);
}

function computeBlocks(steps) {
  // Un "bloc" pedagògic = un narrative o synthesis que obre una secció
  // nova (primer del topic, o vingut després d'un exercise) + tots els
  // steps que el segueixen fins al proper bloc. Això casa amb el
  // separador visual del progress bar: cada glyph amb línia és inici de
  // bloc. Ctrl+⇧+←→ salta entre aquests punts, no step per step.
  const starts = [];
  steps.forEach((s, i) => {
    const kind = stepKind(s);
    if (kind === 'exercise' || kind === 'assessment') return;
    const prev = i > 0 ? steps[i - 1] : null;
    const prevKind = prev ? stepKind(prev) : null;
    const isBlockStart =
      i === 0 || prevKind === 'exercise' || prevKind === 'assessment';
    if (isBlockStart) starts.push(i);
  });
  return starts;
}

/*
 * Estima ms d'animació del beat (typewriter inclòs). Usat per l'auto-play
 * per calcular quan pot avançar de manera que l'usuari tingui temps de
 * llegir el contingut "típic" del beat abans del delay configurat.
 * Beats sense text dinàmic (pair, compare, syn-table) retornen 0 + un
 * petit marge per a la fade-in visual.
 */
function estimateBeatReadMs(beat, speedMs, typewriterOn) {
  if (!beat) return 0;
  if (!typewriterOn) return 400; // fade-in més marge
  const pickText = () => {
    switch (beat.type) {
      case 'heading':
      case 'lead':
      case 'body':
      case 'point':
      case 'rule':
        return beat.text || '';
      case 'pitfall':
        return beat.pit?.why || '';
      case 'callout':
        return beat.callout?.body || '';
      case 'example':
        return beat.ex?.de || '';
      case 'pron':
        return beat.tab?.note || '';
      default:
        return '';
    }
  };
  const len = pickText().length;
  if (!len) return 500; // beats estàtics amb petit marge
  return len * speedMs + 220;
}

function resolveStepIndex(topic, stepId) {
  if (!stepId) return 0;
  const i = topic.steps.findIndex((s) => s.id === stepId);
  return i < 0 ? 0 : i;
}

/*
 * Troba el topic següent al mateix sublevel (A1a-1 → A1a-2 → …). Si no
 * queda cap topic més al sublevel, retorna null. El fan servir el flux
 * d'exit del reader per encadenar lliçons.
 *
 * IMPORTANT: el dataLoader indexa els levels amb la forma canònica tal
 * com apareix al JSON (p. ex. "A1" + "a" → "A1a"), no normalitzada. Cap
 * toLowerCase, o no troba el bucket.
 */
function findNextTopic(topic) {
  if (!topic || !topic.level) return null;
  const levelKey = `${topic.level}${topic.sublevel || ''}`;
  const topics = getTopicsByLevel(levelKey) || [];
  const idx = topics.findIndex((t) => t.id === topic.id);
  if (idx < 0 || idx >= topics.length - 1) return null;
  return topics[idx + 1];
}

// ───────────────────────────────────────────── sub-components

function StepGlyph({ step, i, stepIdx, exercisesState, onClick }) {
  const kind = stepKind(step);
  const isActive = i === stepIdx;
  const isDone = i < stepIdx;
  const label =
    kind === 'exercise'
      ? 'Comprovació'
      : kind === 'assessment'
        ? 'Avaluació'
        : step.heading || step.id || `Step ${i + 1}`;
  const sub = kind === 'exercise' || kind === 'assessment'
    ? exerciseIdOf(step) || ''
    : step.id || '';

  // Estat de resultat si és un step d'exercici amb attempts registrats.
  let status = '';
  if ((kind === 'exercise' || kind === 'assessment') && exercisesState) {
    const exId = exerciseIdOf(step);
    const entry = exId ? exercisesState[exId] : null;
    if (entry) {
      if (entry.firstCorrectAt && entry.lastAttemptCorrect !== false) status = 'ok';
      else if (entry.lastAttemptCorrect === false) status = 'err';
    }
  }

  const stateClass = [
    isActive ? 'active' : '',
    isDone && !status ? 'done' : '',
    status === 'ok' ? 'status-ok' : '',
    status === 'err' ? 'status-err' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={`kf-step kind-${kind} ${stateClass}`}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <span className="glyph" aria-hidden="true" />
      <span className="tip">
        {label}
        <span className="sub">{sub}</span>
      </span>
    </button>
  );
}

function exerciseIdOf(step) {
  if (!step) return null;
  if (step.kind === 'exercise') return step.exerciseId;
  if (Array.isArray(step.blocks)) {
    const b = step.blocks.find((x) => x.type === 'exercise');
    return b ? b.exerciseId : null;
  }
  return null;
}

function BlockSeparator() {
  return <span className="kf-block-sep" aria-hidden="true" />;
}

function ProgressBar({ topic, stepIdx, beatIdx, beats, onJumpStep, onJumpBeat, exercisesState }) {
  const steps = topic.steps;
  return (
    <div className="kf-progress" aria-label={`step ${stepIdx + 1}/${steps.length}`}>
      <div className="kf-row-steps">
        {steps.map((s, i) => {
          const kind = stepKind(s);
          const prev = i > 0 ? steps[i - 1] : null;
          const prevKind = prev ? stepKind(prev) : null;
          const needsSep = i > 0 && kind !== 'exercise' && kind !== 'assessment'
            && (prevKind === 'exercise' || prevKind === 'assessment');
          return (
            <span key={i} className="kf-step-wrap">
              {needsSep ? <BlockSeparator /> : null}
              <StepGlyph
                step={s}
                i={i}
                stepIdx={stepIdx}
                exercisesState={exercisesState}
                onClick={() => onJumpStep(i)}
              />
            </span>
          );
        })}
      </div>
      <div className="kf-row-beats" aria-label={`beat ${beatIdx + 1}/${beats.length}`}>
        {beats.map((_, j) => (
          <button
            key={j}
            type="button"
            className={`kf-seg ${j === beatIdx ? 'here' : j < beatIdx ? 'done' : ''}`}
            onClick={() => onJumpBeat(j)}
            aria-label={`beat ${j + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

/*
 * Counter flotant de la cantonada inferior esquerra del body (§98).
 * Mostra "Pas N · M/T" i un botó de copiar que escriu al clipboard una
 * referència interna del format `A1a-2 · declarative · 5/9` — pensada
 * perquè l'usuari l'enganxi quan vulgui notificar un error a un punt
 * concret del curs. Al clic, l'icona es torna un check temporal.
 *
 * El contenidor té `pointer-events: none` perquè no bloquegi el clic
 * al contingut del body, però el botó té `pointer-events: auto` per
 * rebre hover/clic. El text és seleccionable (user-select: text).
 */
function BodyCounter({
  topic,
  step,
  stepIdx,
  beatIdx,
  beatsCount,
  currentBlock,
  blockStartsCount,
  isFullMode,
}) {
  const [copied, setCopied] = useState(false);
  const label = isFullMode
    ? `Pas ${String(stepIdx + 1).padStart(2, '0')} · Bloc ${String(currentBlock + 1).padStart(2, '0')}/${blockStartsCount}`
    : `Pas ${String(stepIdx + 1).padStart(2, '0')} · ${beatIdx + 1}/${beatsCount}`;
  const reference = `${topic.id} · ${step?.id || `pas-${stepIdx + 1}`} · ${beatIdx + 1}/${beatsCount}`;
  const onCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Silenci: el text també és al label i selcionable.
    }
  };
  return (
    <div className="kf-body-counter" aria-live="polite">
      <span className="kf-body-counter-label">{label}</span>
      <button
        type="button"
        className="kf-body-counter-copy"
        onClick={onCopy}
        title={copied ? `Copiat: ${reference}` : `Copiar referència — ${reference}`}
        aria-label="Copia la referència del beat per notificar un error"
      >
        {copied ? (
          <Check size={11} aria-hidden="true" />
        ) : (
          <Copy size={11} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

function Backdrop({ topic }) {
  // Vel tipogràfic molt difuminat al fons — tres columnes de text del tema.
  const txt = useMemo(() => {
    const parts = [];
    topic.steps.forEach((s) => {
      if (s.heading) parts.push(s.heading + '.');
      if (s.lead) parts.push(s.lead);
      if (s.body) parts.push(s.body);
      if (Array.isArray(s.blocks)) {
        s.blocks.forEach((b) => {
          if (b.type === 'explanation' && b.body) parts.push(b.body);
        });
      }
    });
    return parts.join(' ¶ ').replace(/[*=_`!]+/g, '');
  }, [topic]);
  return <div className="kf-backdrop" aria-hidden="true">{txt}</div>;
}

// ───────────────────────────────────────────── beat renderers

function BeatKicker({ stepIdx, step, beatKicker }) {
  return (
    <div className="kf-chapter">
      <span>Pas {String(stepIdx + 1).padStart(2, '0')}</span>
      <span className="kf-sep" />
      <span>{beatKicker || step.id || ''}</span>
    </div>
  );
}

function HeadingBeat({ beat, step, stepIdx, showKicker, typewriterActive, speed }) {
  return (
    <>
      {showKicker ? (
        <div className="kf-chapter">
          <span>{beat.kicker || step.id || `Pas ${stepIdx + 1}`}</span>
        </div>
      ) : null}
      <Typed
        text={beat.text}
        as="h1"
        className="kf-beat-heading"
        active={typewriterActive}
        speed={Math.min(speed + 3, 95)}
      />
    </>
  );
}

function LeadBeat({ beat, step, stepIdx, showKicker, typewriterActive, speed }) {
  return (
    <>
      {showKicker ? <BeatKicker step={step} stepIdx={stepIdx} beatKicker={step.id} /> : null}
      <Typed
        text={beat.text}
        as="p"
        className="kf-beat-lead"
        active={typewriterActive}
        speed={speed}
      />
    </>
  );
}

function BodyBeat({ beat, step, stepIdx, showKicker, typewriterActive, speed }) {
  return (
    <>
      {showKicker ? <BeatKicker step={step} stepIdx={stepIdx} beatKicker={step.id} /> : null}
      <Typed
        text={beat.text}
        as="p"
        className="kf-beat-body"
        active={typewriterActive}
        speed={Math.max(speed - 6, 10)}
      />
    </>
  );
}

function PointBeat({ beat, step, stepIdx, showKicker, typewriterActive, speed }) {
  return (
    <>
      {showKicker ? <BeatKicker step={step} stepIdx={stepIdx} beatKicker={step.id} /> : null}
      <div className="kf-beat-point">
        <span className="kf-marker">Punt {beat.idx} de {beat.total}</span>
        <Typed text={beat.text} as="span" active={typewriterActive} speed={speed - 4} />
      </div>
    </>
  );
}

function RuleBeat({ beat, step, stepIdx, showKicker, typewriterActive, speed }) {
  return (
    <>
      {showKicker ? <BeatKicker step={step} stepIdx={stepIdx} beatKicker={step.id} /> : null}
      <div className="kf-beat-point">
        <span className="kf-marker">Regla {beat.idx} de {beat.total}</span>
        <Typed text={beat.text} as="span" active={typewriterActive} speed={speed - 4} />
      </div>
    </>
  );
}

function ExampleBeat({
  beat,
  step,
  stepIdx,
  showKicker,
  typewriterActive,
  speed,
  audioAutoplay = false,
}) {
  const [deDone, setDeDone] = useState(!typewriterActive);
  useEffect(() => { setDeDone(!typewriterActive); }, [typewriterActive, beat]);
  const hasPills = hasInlineSpeakable(beat.ex.de);
  const containerRef = useRef(null);
  const fullAudioRef = useRef(null);
  // Text net de la frase sencera (sense markers ni "·") per a la
  // lectura final: primer l'usuari sent les peces, després la frase
  // completa amb prosòdia natural. §98 polit. Només per exemples
  // partits amb pills — els wrapper-only ja reprodueixen la frase.
  const cleanFullText = useMemo(() => {
    if (!hasPills || !beat.ex?.de) return null;
    return stripRichMarkers(beat.ex.de)
      .replace(/\s*·\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }, [beat.ex?.de, hasPills]);

  /*
   * Integració typewriter + àudio (§98 polit):
   *   - Si audioAutoplay i la frase té pills `!!...!!`, el typewriter
   *     para a cada fi de pill, reprodueix l'àudio, espera 200ms i
   *     continua. Flux exacte demanat per l'usuari.
   *   - Si no té pills però sí wrapper, al final de tot s'executa el
   *     fallback (useBeatAutoPlaySequence iterant l'únic .kf-speak
   *     del contenidor).
   *   - Si audioAutoplay desactivat, tot manual com abans.
   */
  const handleSpeakable = useCallback(async (idx) => {
    const pills = containerRef.current?.querySelectorAll('.kf-speak');
    const pill = pills && pills[idx];
    if (!pill) return;
    // Click programàtic — el listener del reader no pausarà l'autoplay.
    markNextSpeakableClickProgrammatic();
    pill.click();
    await new Promise((resolve) => {
      let done = false;
      const onEnd = () => {
        if (done) return;
        done = true;
        window.removeEventListener('kompass:speakable-ended', onEnd);
        resolve();
      };
      window.addEventListener('kompass:speakable-ended', onEnd);
      // Salvaguarda per Web Speech fallback que no emet 'ended'.
      window.setTimeout(() => {
        if (done) return;
        done = true;
        window.removeEventListener('kompass:speakable-ended', onEnd);
        resolve();
      }, 6000);
    });
    await new Promise((r) => window.setTimeout(r, 200));
  }, []);

  // Per al cas wrapper (frase sencera sense pills), seguim usant
  // l'orquestrador seqüencial — no hi ha fase "typewriter dins d'audio",
  // simplement reproduïm tot al final.
  useBeatAutoPlaySequence(containerRef, audioAutoplay && deDone && !hasPills);

  return (
    <>
      {showKicker ? <BeatKicker step={step} stepIdx={stepIdx} beatKicker={step.id} /> : null}
      <div className={`kf-beat-ex${beat.ex?.image ? ' kf-beat-ex--with-image' : ''}`} ref={containerRef}>
        {beat.ex?.image ? (
          <TabImage
            image={beat.ex.image}
            variant="example"
            context={{
              de: beat.ex.de,
              ca: beat.ex.ca,
              note: beat.ex.note,
            }}
          />
        ) : null}
        <span className="kf-marker">Exemple {beat.idx} / {beat.total}</span>
        {deDone ? (
          hasPills ? (
            <p className="kf-beat-ex-de">{parseInline(beat.ex.de)}</p>
          ) : (
            <p className="kf-beat-ex-de">
              <SpeakableText text={stripRichMarkers(beat.ex.de)}>
                {parseInline(beat.ex.de)}
              </SpeakableText>
            </p>
          )
        ) : (
          <Typed
            text={beat.ex.de}
            as="p"
            className="kf-beat-ex-de"
            active={typewriterActive}
            speed={speed + 4}
            onDone={() => {
              setDeDone(true);
              // Després dels pills, reproduïm la frase sencera com a
              // cloenda — so natural i prosòdia correcta. Quan acaba,
              // avisem al reader perquè comenci el temporitzador de
              // canvi de beat. Si no hi ha pills, el timer s'activa
              // directament al final del typewriter.
              if (audioAutoplay && hasPills && fullAudioRef.current) {
                window.setTimeout(() => {
                  const pill = fullAudioRef.current?.querySelector('.kf-speak');
                  if (!pill) {
                    window.dispatchEvent(
                      new CustomEvent('kompass:beat-audio-complete'),
                    );
                    return;
                  }
                  markNextSpeakableClickProgrammatic();
                  pill.click();
                  const onEnd = () => {
                    window.removeEventListener('kompass:speakable-ended', onEnd);
                    window.dispatchEvent(
                      new CustomEvent('kompass:beat-audio-complete'),
                    );
                  };
                  window.addEventListener('kompass:speakable-ended', onEnd);
                  window.setTimeout(() => {
                    window.removeEventListener('kompass:speakable-ended', onEnd);
                    window.dispatchEvent(
                      new CustomEvent('kompass:beat-audio-complete'),
                    );
                  }, 6000);
                }, 400);
              } else if (audioAutoplay && hasPills) {
                window.dispatchEvent(
                  new CustomEvent('kompass:beat-audio-complete'),
                );
              }
            }}
            onSpeakableReached={
              audioAutoplay && hasPills ? handleSpeakable : undefined
            }
          />
        )}
        {deDone && beat.ex.ca ? (
          <p className="kf-beat-ex-ca kf-fade-in">{parseInline(beat.ex.ca)}</p>
        ) : null}
        {deDone && beat.ex.note ? (
          <p className="kf-beat-ex-note kf-fade-in">{parseInline(beat.ex.note)}</p>
        ) : null}
        {/* Pill de la frase sencera (§98 polit). Només apareix quan
            l'exemple té pills i ja s'ha mostrat tot el text. Visual
            discret: etiqueta mono "Sencera" + pill audible amb el text
            net. Viu en un contenidor separat amb fullAudioRef perquè
            l'orquestrador d'autoplay el pugui invocar després dels
            pills individuals sense barrejar-lo al querySelectorAll
            del contenidor principal. */}
        {deDone && hasPills && cleanFullText ? (
          <div
            className="kf-beat-ex-whole kf-fade-in"
            ref={fullAudioRef}
          >
            <span className="kf-beat-ex-whole-label">Sencera</span>
            <SpeakableText text={cleanFullText}>{cleanFullText}</SpeakableText>
          </div>
        ) : null}
      </div>
    </>
  );
}

/*
 * TabImage · DATA-MODEL §3.10
 * Miniatura il·lustrativa inline per a tabs i exemples. Render petit
 * amb badge de zoom visible; al clicar publica un event
 * `kompass:open-lightbox` amb la imatge i el context. Un singleton
 * a nivell de FocusReader renderitza un únic modal — així, quan
 * l'usuari canvia de beat, el reader tanca el modal sense que cada
 * TabImage mantingui estat propi.
 */
function TabImage({ image, variant = 'side', context = null }) {
  if (!image) return null;
  const width = image.width || 200;
  const style = { maxWidth: width + 'px' };
  const triggerOpen = () => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('kompass:open-lightbox', { detail: { image, context } }),
    );
  };
  return (
    <figure
      className={`kf-tab-image kf-tab-image--${variant} kf-fade-in`}
      style={style}
      role="button"
      tabIndex={0}
      onClick={triggerOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          triggerOpen();
        }
      }}
      aria-label={`Ampliar imatge: ${image.alt}`}
      title="Clic per ampliar"
    >
      <img
        className="kf-tab-image-img"
        src={image.src}
        {...(image.srcset ? { srcSet: image.srcset } : {})}
        {...(image.sizes ? { sizes: image.sizes } : {})}
        alt={image.alt}
        loading="lazy"
      />
      <span className="kf-tab-image-zoom" aria-hidden="true">
        <ZoomIn size={14} strokeWidth={2} />
      </span>
      {image.caption ? (
        <figcaption className="kf-tab-image-caption">{parseInline(image.caption)}</figcaption>
      ) : null}
    </figure>
  );
}

/*
 * TabImageLightbox · modal d'ampliació d'una TabImage.
 * Patró sempre-muntat (com AboutModal): el modal viu al DOM amb
 * opacity 0 i pointer-events none quan està tancat; `is-open` activa
 * la transició d'opacitat i escala. Tant l'obertura com el tancament
 * passen pel mateix fade suau, consistent amb la resta de modals del
 * projecte. Mostra la variant més gran disponible (via srcset) i el
 * context textual associat — pron, exemple DE/CA i nota — perquè
 * l'usuari pugui llegir el vocabulari al costat de la imatge quan
 * aquesta és una descripció d'escena o similar.
 * Es tanca amb Esc, clic al backdrop o al botó ✕.
 */
function TabImageLightbox({ state, open, onClose }) {
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
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  // Quan encara no s'ha obert cap imatge, renderitzem un shell buit
  // perquè el component estigui muntat (així la primera obertura també
  // té transició) però sense contingut que carregui recursos.
  const image = state?.image || null;
  const context = state?.context || null;

  return (
    <>
      <div
        className={['kf-img-lightbox-backdrop', open ? 'is-open' : ''].join(' ')}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={['kf-img-lightbox', open ? 'is-open' : ''].join(' ')}
        role="dialog"
        aria-modal={open}
        aria-hidden={!open}
        aria-label={image?.alt || ''}
        onClick={(e) => e.stopPropagation()}
      >
        {image ? (
          <>
            <button
              type="button"
              className="kf-img-lightbox-close"
              onClick={onClose}
              aria-label="Tancar"
            >
              <CloseIcon size={18} aria-hidden="true" />
            </button>
            <div className="kf-img-lightbox-media">
              <img
                className="kf-img-lightbox-img"
                src={image.src}
                {...(image.srcset ? { srcSet: image.srcset } : {})}
                sizes="(min-width: 900px) 60vw, 90vw"
                alt={image.alt}
              />
            </div>
            <aside className="kf-img-lightbox-aside">
              {context?.title ? (
                <h3 className="kf-img-lightbox-title">{parseInline(context.title)}</h3>
              ) : null}
              {context?.de ? (
                <p className="kf-img-lightbox-de">{parseInline(context.de)}</p>
              ) : null}
              {context?.ca ? (
                <p className="kf-img-lightbox-ca">{parseInline(context.ca)}</p>
              ) : null}
              {context?.note ? (
                <p className="kf-img-lightbox-note">{parseInline(context.note)}</p>
              ) : null}
              {image.caption ? (
                <p className="kf-img-lightbox-caption">{parseInline(image.caption)}</p>
              ) : null}
              {image.credit ? (
                <p className="kf-img-lightbox-credit">{image.credit}</p>
              ) : null}
            </aside>
          </>
        ) : null}
      </div>
    </>
  );
}

function PronBeat({
  beat,
  step,
  stepIdx,
  showKicker,
  typewriterActive,
  speed,
  audioAutoplay = false,
}) {
  const tab = beat.tab;
  const [noteDone, setNoteDone] = useState(!typewriterActive);
  useEffect(() => { setNoteDone(!typewriterActive); }, [typewriterActive, beat]);
  const containerRef = useRef(null);
  // L'autoplay del beat de pronom inclou tots els pills del contenidor
  // (pron + example si ja és visible), en ordre seqüencial amb pausa.
  useBeatAutoPlaySequence(containerRef, audioAutoplay && noteDone);
  return (
    <>
      {showKicker ? <BeatKicker step={step} stepIdx={stepIdx} beatKicker={step.id} /> : null}
      <div className={`kf-beat-pron${tab.image ? ' kf-beat-pron--with-image' : ''}`} ref={containerRef}>
        {tab.image ? (
          <TabImage
            image={tab.image}
            variant="pron"
            context={{
              title: tab.pron,
              de: tab.example?.de,
              ca: tab.example?.ca,
              note: tab.note,
            }}
          />
        ) : null}
        <span className="kf-marker">Pronom</span>
        <h2 className="kf-beat-pron-huge">
          <SpeakableText text={stripRichMarkers(tab.pron)}>
            {parseInline(tab.pron)}
          </SpeakableText>
        </h2>
        {tab.gloss ? <p className="kf-beat-pron-gloss">= {parseInline(tab.gloss)}</p> : null}
        {tab.note ? (
          <Typed
            text={tab.note}
            as="p"
            className="kf-beat-pron-note"
            active={typewriterActive}
            speed={speed - 8}
            onDone={() => setNoteDone(true)}
          />
        ) : null}
        {noteDone && tab.example ? (
          <div className="kf-beat-pron-ex kf-fade-in">
            <div className="de">
              {hasInlineSpeakable(tab.example.de) ? (
                parseInline(tab.example.de)
              ) : (
                <SpeakableText text={stripRichMarkers(tab.example.de)}>
                  {parseInline(tab.example.de)}
                </SpeakableText>
              )}
            </div>
            {tab.example.ca ? <div className="ca">{parseInline(tab.example.ca)}</div> : null}
          </div>
        ) : null}
      </div>
    </>
  );
}

function PairBeat({ beat, step, stepIdx, showKicker }) {
  const pair = beat.pair;
  return (
    <>
      {showKicker ? <BeatKicker step={step} stepIdx={stepIdx} beatKicker={step.id} /> : null}
      <div className="kf-beat-pair kf-fade-in">
        <span className="kf-marker kf-block-wide">Possessiu {beat.idx} / {beat.total}</span>
        <span className="kf-beat-pair-personal">{parseInline(pair.personal)}</span>
        <span className="kf-beat-pair-arrow">→</span>
        <span className="kf-beat-pair-poss">{parseInline(pair.possessive)}</span>
        {pair.gloss ? <span className="kf-beat-pair-gloss">{parseInline(pair.gloss)}</span> : null}
      </div>
    </>
  );
}

function CompareBeat({ beat, step, stepIdx, showKicker, tableAnim, audioAutoplay = false }) {
  const containerRef = useRef(null);
  useBeatAutoPlaySequence(containerRef, audioAutoplay);
  return (
    <>
      {showKicker ? <BeatKicker step={step} stepIdx={stepIdx} beatKicker={step.id} /> : null}
      <div className="kf-beat-compare" ref={containerRef}>
        <div className="kf-marker">Comparativa entre llengües</div>
        <table>
          <thead>
            <tr>
              <th>Castellà</th>
              <th>Català</th>
              <th>Alemany</th>
              <th>Anglès</th>
            </tr>
          </thead>
          <tbody>
            {beat.rows.map((r, i) => (
              <tr
                key={i}
                className={tableAnim ? 'kf-row-reveal' : ''}
                style={tableAnim ? { animationDelay: `${120 + i * 80}ms` } : undefined}
              >
                <td>{r.es}</td>
                <td>{r.ca}</td>
                <td className="de">
                  {hasInlineSpeakable(r.de) ? (
                    parseInline(r.de)
                  ) : (
                    <SpeakableText text={stripRichMarkers(r.de)}>
                      {parseInline(r.de)}
                    </SpeakableText>
                  )}
                </td>
                <td>{r.en}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function PitfallBeat({ beat, step, stepIdx, showKicker, typewriterActive, speed, audioAutoplay = false }) {
  const pit = beat.pit;
  const containerRef = useRef(null);
  // Els àudios del pitfall (bad + good) només s'autoreprodueixen quan
  // acaba el typewriter del "why" — així no comencen a sonar mentre
  // encara s'està escrivint la justificació.
  const [whyDone, setWhyDone] = useState(!typewriterActive || !pit.why);
  useEffect(() => {
    setWhyDone(!typewriterActive || !pit.why);
  }, [typewriterActive, pit.why, beat]);
  useBeatAutoPlaySequence(containerRef, audioAutoplay && whyDone);
  return (
    <>
      {showKicker ? <BeatKicker step={step} stepIdx={stepIdx} beatKicker={step.id} /> : null}
      <div className="kf-beat-pitfall" ref={containerRef}>
        <span className="kf-marker">Error freqüent {beat.idx} / {beat.total}</span>
        <div className="kf-beat-pit-bad">{parseInline(pit.bad)}</div>
        <div className="kf-beat-pit-arrow">→</div>
        <div className="kf-beat-pit-good">{parseInline(pit.good)}</div>
        {pit.why ? (
          <Typed
            text={pit.why}
            as="div"
            className="kf-beat-pit-why"
            active={typewriterActive}
            speed={speed - 10}
            onDone={() => setWhyDone(true)}
          />
        ) : null}
      </div>
    </>
  );
}

const CALLOUT_ICONS = {
  info: Info,
  tip: Lightbulb,
  warning: AlertTriangle,
  danger: AlertTriangle,
  example: Info,
};

function CalloutBeat({ beat, step, stepIdx, showKicker, typewriterActive, speed }) {
  const c = beat.callout;
  const Icon = CALLOUT_ICONS[c.variant] || Info;
  return (
    <>
      {showKicker ? <BeatKicker step={step} stepIdx={stepIdx} beatKicker={step.id} /> : null}
      <div className={`kf-beat-callout variant-${c.variant || 'info'}`}>
        <div className="kf-beat-callout-icon">
          <Icon size={20} aria-hidden="true" />
        </div>
        <div className="kf-beat-callout-body">
          {c.title ? <h4>{parseInline(c.title)}</h4> : null}
          {c.body ? (
            <Typed
              text={c.body}
              as="p"
              active={typewriterActive}
              speed={speed - 8}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}

/*
 * VisualBeat · §77
 * Un beat que mostra una imatge (raster via src) o un SVG inline (via
 * svg). Caption opcional en italic sota. SVG inline s'injecta amb
 * dangerouslySetInnerHTML (el contingut ve del JSON controlat del
 * projecte); usa currentColor per heretar la tinta del reader.
 */
function VisualBeat({ beat, step, stepIdx, showKicker }) {
  const v = beat.visual;
  const style = v.width ? { maxWidth: v.width + 'px' } : undefined;
  return (
    <>
      {showKicker ? <BeatKicker step={step} stepIdx={stepIdx} beatKicker={step.id} /> : null}
      <figure className="kf-beat-visual kf-fade-in" style={style}>
        {v.svg ? (
          <div
            className="kf-beat-visual-svg"
            role="img"
            aria-label={v.alt}
            dangerouslySetInnerHTML={{ __html: v.svg }}
          />
        ) : v.src ? (
          <img
            className="kf-beat-visual-img"
            src={v.src}
            {...(v.srcset ? { srcSet: v.srcset } : {})}
            {...(v.sizes ? { sizes: v.sizes } : {})}
            alt={v.alt}
            loading="lazy"
          />
        ) : null}
        {v.caption ? (
          <figcaption className="kf-beat-visual-caption">
            {parseInline(v.caption)}
          </figcaption>
        ) : null}
        {v.credit ? (
          <small className="kf-beat-visual-credit">{parseInline(v.credit)}</small>
        ) : null}
      </figure>
    </>
  );
}

function SynTableBeat({ beat, tableAnim }) {
  const table = beat.table;
  return (
    <div className="kf-beat-syn">
      <div className="kf-marker">Síntesi</div>
      {table.title ? <h2 className="kf-beat-syn-title">{table.title}</h2> : null}
      <table>
        <thead>
          <tr>
            {(table.headers || []).map((h, j) => (
              <th key={j}>{typeof h === 'object' ? h.text : h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(table.rows || []).map((row, j) => (
            <tr
              key={j}
              className={tableAnim ? 'kf-row-reveal' : ''}
              style={tableAnim ? { animationDelay: `${180 + j * 90}ms` } : undefined}
            >
              {row.map((cell, k) => (
                <td key={k}>{parseInline(typeof cell === 'object' ? cell.text : cell)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExerciseBeatCard({ beat, stepIdx, onFinish, peek = false, navRef = null }) {
  const { t } = useT();
  const exercise = useMemo(() => getExercise(beat.exerciseId), [beat.exerciseId]);
  if (!exercise) {
    return (
      <div className="kf-chapter">
        <Dumbbell size={12} aria-hidden="true" />
        <span>{t('exercise.notFound', { id: beat.exerciseId })}</span>
      </div>
    );
  }
  const isAssessment = beat.variant === 'assessment';
  const label = isAssessment
    ? t('exercise.variantAssessment')
    : t('exercise.variantQuickCheck');
  // El chip i títol ja viuen dins la .kf-ex-card; no duplicarem un
  // kf-chapter fora. El número de pas el dóna la sidebar lateral.
  return (
    <div className="kf-ex-wrap">
      <div className="kf-ex-card">
        <div className="kf-ex-header">
          <span
            className={
              'kf-ex-chip ' + (isAssessment ? 'kf-ex-chip-assessment' : '')
            }
          >
            {label}
          </span>
          <h3 className="kf-ex-title">{parseInline(exercise.title)}</h3>
        </div>
        <ReaderExerciseEngine exercise={exercise} peek={peek} navRef={navRef} />
      </div>
    </div>
  );
}

// ───────────────────────────────────────────── dispatcher

/*
 * Deriva un títol curt per a un beat, usat a la BeatSidebar com a label
 * clicable. Prioritza la lectura curta — no és el contingut sencer.
 */
function beatLabel(beat, idx) {
  if (!beat) return `Fragment ${idx + 1}`;
  const cap = (s, n = 48) => {
    const t = String(s || '').replace(/[*=_`!]/g, '').trim();
    return t.length > n ? t.slice(0, n).trimEnd() + '…' : t;
  };
  switch (beat.type) {
    case 'heading':
      return cap(beat.text, 42);
    case 'lead':
      return cap(beat.text, 48);
    case 'body':
      return cap(beat.text, 44);
    case 'point':
      return `Punt ${beat.idx} — ${cap(beat.text, 32)}`;
    case 'rule':
      return `Regla ${beat.idx}`;
    case 'example':
      return `Exemple ${beat.idx} — ${cap(beat.ex?.de, 28)}`;
    case 'pron':
      return beat.tab?.pron || 'Pronom';
    case 'pair':
      return `${beat.pair?.personal} → ${beat.pair?.possessive}`;
    case 'callout':
      return beat.callout?.title || 'Nota';
    case 'compare':
      return 'Comparativa';
    case 'pitfall':
      return `Parany ${beat.idx}`;
    case 'syn-table':
      return beat.table?.title || 'Taula';
    case 'exercise':
      return beat.variant === 'assessment' ? 'Avaluació' : 'Comprovació';
    default:
      return `Fragment ${idx + 1}`;
  }
}

function stepLabel(step, i) {
  if (!step) return `Pas ${i + 1}`;
  if (step.heading) return step.heading;
  // Format ric · exercici amb exerciseId al mateix step
  if (step.kind === 'exercise' && step.exerciseId) {
    const ex = getExercise(step.exerciseId);
    if (ex?.title) return ex.title;
    return step.variant === 'assessment' ? 'Avaluació' : 'Comprovació';
  }
  // Format llegat · intentem derivar un label humà:
  //   1. Si conté un bloc exercise → títol humà de l'exercici.
  //   2. Si conté un bloc explanation → primer encapçalament ### o ####.
  //   3. Fallback final: id kebab-case → Title Case (última defensa).
  if (Array.isArray(step.blocks)) {
    const exBlock = step.blocks.find((b) => b?.type === 'exercise');
    if (exBlock?.exerciseId) {
      const ex = getExercise(exBlock.exerciseId);
      if (ex?.title) return ex.title;
      return exBlock.variant === 'assessment' ? 'Avaluació' : 'Comprovació';
    }
    const explBlock = step.blocks.find(
      (b) => b?.type === 'explanation' && typeof b.body === 'string',
    );
    if (explBlock) {
      const m = /^#{3,4}\s+(.+)$/m.exec(explBlock.body);
      if (m) return m[1].replace(/\*\*|==|_|`/g, '').trim();
    }
  }
  if (step.id) {
    return step.id
      .split('-')
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(' ');
  }
  return `Pas ${i + 1}`;
}

/*
 * BeatSidebar · índex navegable a la dreta del body
 *
 * Llista de steps del topic; el step actual s'expandeix per mostrar els
 * seus beats amb un títol curt. Clic = salta a l'step/beat (usa els
 * mateixos handlers que el progress bar del header).
 *
 * S'amaga en viewports sota 1200 px per no envair l'espai del contingut.
 */
function BeatSidebar({
  topic,
  beats,
  stepIdx,
  beatIdx,
  onJumpStep,
  onJumpBeat,
  isOpen = false,
  onToggle = () => {},
  onClose = () => {},
}) {
  // A amples mitjans, clicar qualsevol ítem tanca el drawer després
  // de navegar: l'usuari ja ha fet la tria i vol tornar al contingut.
  // A ≥1500px el sidebar és pinned i el flag no afecta res visual.
  const jumpStepAndClose = (i) => {
    onJumpStep(i);
    onClose();
  };
  const jumpBeatAndClose = (j) => {
    onJumpBeat(j);
    onClose();
  };
  return (
    <>
      <button
        type="button"
        className={`kf-sidebar-handle${isOpen ? ' is-open' : ''}`}
        onClick={onToggle}
        aria-label={isOpen ? 'Amagar índex de la lliçó' : 'Mostrar índex de la lliçó'}
        aria-expanded={isOpen}
        title={isOpen ? 'Amagar índex' : 'Índex de la lliçó'}
      >
        <ListIcon size={18} aria-hidden="true" strokeWidth={1.75} />
      </button>
      <div
        className={`kf-sidebar-backdrop${isOpen ? ' is-open' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-hidden="true"
      />
      <aside
        className={`kf-sidebar${isOpen ? ' is-drawer-open' : ''}`}
        aria-label="Índex de la lliçó"
      >
      <div className="kf-sidebar-kicker">
        <span>Pas {String(stepIdx + 1).padStart(2, '0')}</span>
        <span className="kf-sidebar-kicker-sep" />
        <span>{topic.shortTitle || topic.title}</span>
      </div>
      <ol className="kf-sidebar-steps">
        {topic.steps.map((s, i) => {
          const isCurrent = i === stepIdx;
          const isDone = i < stepIdx;
          const label = stepLabel(s, i);
          const kind = stepKind(s);
          const isExerciseKind = kind === 'exercise' || kind === 'assessment';
          return (
            <li
              key={i}
              className={[
                'kf-sidebar-step',
                `kind-${kind}`,
                isCurrent ? 'is-current' : '',
                isDone ? 'is-done' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <button
                type="button"
                onClick={() => jumpStepAndClose(i)}
                title={isExerciseKind
                  ? `${kind === 'assessment' ? 'Avaluació' : 'Exercici'} · ${label}`
                  : label}
              >
                <span className="kf-sidebar-step-num">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {isExerciseKind ? (
                  <span
                    className={`kf-sidebar-step-glyph kind-${kind}`}
                    aria-hidden="true"
                  />
                ) : null}
                <span className="kf-sidebar-step-label">{label}</span>
              </button>
              {isCurrent && beats.length > 1 ? (
                <ol className="kf-sidebar-beats">
                  {beats.map((b, j) => {
                    const beatIsCurrent = j === beatIdx;
                    const beatIsDone = j < beatIdx;
                    return (
                      <li
                        key={j}
                        className={[
                          'kf-sidebar-beat',
                          beatIsCurrent ? 'is-current' : '',
                          beatIsDone ? 'is-done' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <button
                          type="button"
                          onClick={() => jumpBeatAndClose(j)}
                          title={beatLabel(b, j)}
                        >
                          {beatLabel(b, j)}
                        </button>
                      </li>
                    );
                  })}
                </ol>
              ) : null}
            </li>
          );
        })}
      </ol>
      </aside>
    </>
  );
}

/*
 * BeatStagePeek · §73
 *
 * En mode fragment, el focus està al beat actiu però l'usuari veu un
 * "peek" atenuat del beat anterior (desplaçat cap amunt, més petit) i
 * del següent (desplaçat cap avall). Això dóna sensació de scroll
 * contextual: saps d'on vens i on vas, sense perdre la concentració a
 * la frase actual.
 *
 * Implementació: renderitzem TOTS els beats del step dins un contenidor
 * relatiu amb `position: absolute` per a cada beat. Cada beat rep una
 * classe segons el seu rol (delta a beatIdx): current, prev, next,
 * prev-far, next-far. Les classes tenen transform+opacity predefinits;
 * el canvi de className dispara una CSS transition. D'aquesta manera
 * el beat que passa de current → prev es "desplaça" suaument sense
 * desmuntar-se, i el nou current/next entra directament al seu lloc
 * (els far ja eren invisibles, simplement es fan visibles en el nou
 * rol).
 *
 * El beat current és l'únic amb typewriter actiu (si ho està
 * globalment); els peek es renderitzen sempre amb fastMode=true (text
 * complet, sense caret). El kicker de Capítol només es mostra al
 * current, perquè els peek queden atenuats.
 */
/*
 * Amb llista flat de beats del topic (cada entrada amb el seu stepIdx /
 * beatIdx / step originals), la transició entre passos és igual que la
 * transició entre beats dins d'un mateix pas: el darrer beat d'un pas
 * passa a `prev`, el primer del pas següent passa a `current`, etc.
 * Keys per posició global estable → React reconcilia els elements i
 * les CSS transitions animen el canvi de rol.
 */
function BeatStagePeek({
  allBeats,
  globalIdx,
  settings,
  speed,
  fastMode,
  exerciseNavRef,
}) {
  return (
    <>
      {allBeats.map((entry, i) => {
        const delta = i - globalIdx;
        let role;
        if (delta === 0) role = 'current';
        else if (delta === -1) role = 'prev';
        else if (delta === 1) role = 'next';
        else if (delta < -1) role = 'prev-far';
        else role = 'next-far';

        const isCurrent = role === 'current';
        // `inert` desactiva focus, clic i tab a tots els descendants del
        // peek no-current. Així evitem que els inputs/selects dels beats
        // d'exercici al peek-far agafin focus accidentalment (per ex.
        // l'auto-focus del ReaderExerciseEngine), cosa que disparava un
        // scroll cap a un element a 110vh i trencava el layout.
        const peekProps = isCurrent ? {} : { inert: '' };
        return (
          <div
            key={`s${entry.stepIdx}-b${entry.beatIdx}`}
            className={`kf-peek kf-peek-${role}`}
            {...peekProps}
          >
            {/* Coixí de paper al darrere, independent de l'opacity del
                content perquè funcioni tant al current com al prev/next. */}
            <div className="kf-peek-bg" aria-hidden="true" />
            <div className="kf-peek-content">
              <BeatBody
                beat={entry.beat}
                step={entry.step}
                stepIdx={entry.stepIdx}
                showKicker={isCurrent}
                settings={settings}
                speed={speed}
                fastMode={isCurrent ? fastMode : true}
                isCurrent={isCurrent}
                exerciseNavRef={isCurrent ? exerciseNavRef : null}
              />
            </div>
          </div>
        );
      })}
    </>
  );
}

function BeatBody({
  beat,
  step,
  stepIdx,
  showKicker,
  settings,
  speed,
  onFinishExercise,
  fastMode,
  isCurrent = true,
  exerciseNavRef = null,
}) {
  if (!beat) return null;

  const tx = resolveTransition(beat, settings);
  // fastMode (↑/↓) força la revelació immediata: desactiva el typewriter
  // i la reveal-clip de taules per a aquest beat.
  const typewriterActive = tx === 'typewriter' && !fastMode;
  const tableAnim = tx === 'reveal-clip' && !fastMode;

  switch (beat.type) {
    case 'heading':
      return <HeadingBeat {...{ beat, step, stepIdx, showKicker, typewriterActive, speed }} />;
    case 'lead':
      return <LeadBeat {...{ beat, step, stepIdx, showKicker, typewriterActive, speed }} />;
    case 'body':
      return <BodyBeat {...{ beat, step, stepIdx, showKicker, typewriterActive, speed }} />;
    case 'point':
      return <PointBeat {...{ beat, step, stepIdx, showKicker, typewriterActive, speed }} />;
    case 'rule':
      return <RuleBeat {...{ beat, step, stepIdx, showKicker, typewriterActive, speed }} />;
    case 'example':
      return <ExampleBeat {...{ beat, step, stepIdx, showKicker, typewriterActive, speed, audioAutoplay: isCurrent && settings.audioAutoplay }} />;
    case 'pron':
      return <PronBeat {...{ beat, step, stepIdx, showKicker, typewriterActive, speed, audioAutoplay: isCurrent && settings.audioAutoplay }} />;
    case 'pair':
      return <PairBeat {...{ beat, step, stepIdx, showKicker }} />;
    case 'compare':
      return (
        <CompareBeat
          {...{ beat, step, stepIdx, showKicker, tableAnim, audioAutoplay: isCurrent && settings.audioAutoplay }}
        />
      );
    case 'pitfall':
      return <PitfallBeat {...{ beat, step, stepIdx, showKicker, typewriterActive, speed, audioAutoplay: isCurrent && settings.audioAutoplay }} />;
    case 'callout':
      return <CalloutBeat {...{ beat, step, stepIdx, showKicker, typewriterActive, speed }} />;
    case 'syn-table':
      return <SynTableBeat beat={beat} tableAnim={tableAnim} />;
    case 'visual':
      return <VisualBeat {...{ beat, step, stepIdx, showKicker }} />;
    case 'exercise':
      return (
        <ExerciseBeatCard
          beat={beat}
          stepIdx={stepIdx}
          onFinish={onFinishExercise}
          peek={!isCurrent}
          navRef={exerciseNavRef}
        />
      );
    default:
      return null;
  }
}

// ───────────────────────────────────────────── FocusReader

const IS_MAC =
  typeof navigator !== 'undefined' &&
  /Mac|iP(hone|ad|od)/.test(navigator.platform || navigator.userAgent);
const MODKEY = IS_MAC ? '⌘' : 'Ctrl';

export function FocusReader({ topic }) {
  const { t } = useT();
  const navigate = useNavigate();
  const { stepId } = useParams();
  const settings = useSettings();
  const markStepVisited = useProgressStore((s) => s.markStepVisited);
  const exercisesState = useProgressStore((s) => s.exercises);

  const [stepIdx, setStepIdx] = useState(() => resolveStepIndex(topic, stepId));
  const [beatIdx, setBeatIdx] = useState(0);
  // fastMode: activat amb ↓/↑. Força la revelació instantània del beat
  // actual. Si ja està actiu quan l'usuari torna a prémer ↓/↑, avança al
  // següent/anterior beat preservant fastMode (salt continu).
  const [fastMode, setFastMode] = useState(false);
  // Drawer de settings (§79): s'obre amb "c" o el botó ⚙ del peu.
  // §112: el drawer d'ajustaments del reader ha estat substituït per
  // el modal global (src/components/settings/SettingsModal.jsx). El
  // reader llegeix el mateix flag del store i l'obre amb cog/tecla c.
  const settingsOpen = useSettingsStore((s) => s.settingsOpen);
  const setSettingsOpen = useSettingsStore((s) => s.setSettingsOpen);
  // Sidebar (índex de la lliçó) · a ≥1500px és pinned a la dreta; entre
  // 900-1499px funciona com a drawer amb tirador i backdrop — evita que
  // es solapi amb el backdrop del beat a amples mitjans. Sota 900px
  // roman ocult. Estat mantingut aquí perquè BeatSidebar és pur.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Lightbox singleton · §110 polit. Centralitzem l'estat aquí perquè
  // cada TabImage (n'hi ha tantes com tabs al topic, rendertzades via
  // BeatStagePeek) no en pugui obrir una còpia pròpia. Dos estats:
  //   - lightboxState: { image, context } actuals. Persistents entre
  //     obertures per mantenir el contingut DURANT el fade-out.
  //   - lightboxOpen: booleà que controla la classe `is-open` al modal
  //     perquè tant l'obertura com el tancament passin per una transició
  //     CSS suau d'opacitat i escala.
  const [lightboxState, setLightboxState] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  // Splash d'entrada a una nova lliçó (§80). Es mostra la primera vegada
  // que es munta aquest reader per a un topic.id concret; auto-dismiss
  // després de 2 s o bé amb tecla d'acció / clic.
  const [splashVisible, setSplashVisible] = useState(true);
  // Flux de sortida al final de la lliçó: el primer → al darrer beat
  // activa el mode "ready to exit" (mostra avís de la pròxima lliçó);
  // el segon → navega a la lliçó següent.
  const [readyToExit, setReadyToExit] = useState(false);
  const rootRef = useRef(null);
  // Ref que l'exercici current escriu amb { handleArrow(d) }. El reader
  // consulta aquesta ref abans de fer goBeat quan l'usuari prem ← / →
  // fora d'un input: si l'exercici encara té preguntes pendents, gestiona
  // la navegació internament i el beat no canvia. Si retorna false (cap
  // gestió interna), el reader segueix amb goBeat.
  const exerciseNavRef = useRef(null);

  const step = topic.steps[stepIdx];
  const totalSteps = topic.steps.length;
  const beats = useMemo(() => stepToBeats(step), [step]);
  const beat = beats[Math.min(beatIdx, Math.max(beats.length - 1, 0))];
  const nextTopic = useMemo(() => findNextTopic(topic), [topic]);
  const isAtEnd =
    stepIdx === totalSteps - 1 &&
    beatIdx >= Math.max(beats.length - 1, 0);

  // Llista plana de beats del topic sencer — permet al peek animar les
  // transicions entre passos de la mateixa manera que les transicions
  // entre beats dins d'un pas (§73).
  const allBeats = useMemo(() => {
    const flat = [];
    topic.steps.forEach((s, sIdx) => {
      const sBeats = stepToBeats(s);
      sBeats.forEach((b, bIdx) => {
        flat.push({ beat: b, step: s, stepIdx: sIdx, beatIdx: bIdx });
      });
    });
    return flat;
  }, [topic]);

  const globalIdx = useMemo(() => {
    let idx = 0;
    for (let i = 0; i < stepIdx; i++) {
      idx += stepToBeats(topic.steps[i]).length;
    }
    return idx + Math.min(beatIdx, Math.max(beats.length - 1, 0));
  }, [topic, stepIdx, beatIdx, beats.length]);
  const isFullMode = settings.studyMode === 'full';
  const blockStarts = useMemo(() => computeBlocks(topic.steps), [topic.steps]);
  const currentBlock = useMemo(() => {
    let b = 0;
    for (let i = 0; i < blockStarts.length; i++) {
      if (blockStarts[i] <= stepIdx) b = i;
    }
    return b;
  }, [stepIdx, blockStarts]);

  const speed = resolveTypewriterSpeed(settings.typewriterSpeed);

  // Sincronitzem stepIdx ↔ URL (:stepId). Quan canviem stepIdx internament,
  // actualitzem la URL; quan canvia :stepId (per exemple, navegació des de
  // fora), actualitzem stepIdx.
  useEffect(() => {
    const current = topic.steps[stepIdx];
    if (current?.id) {
      const path = `/temari/${topic.id}/${current.id}`;
      if (window.location.hash !== `#${path}`) {
        navigate(path, { replace: true });
      }
    } else {
      const path = `/temari/${topic.id}`;
      if (window.location.hash !== `#${path}`) {
        navigate(path, { replace: true });
      }
    }
  }, [stepIdx, topic.id, topic.steps, navigate]);

  // Quan canvia stepId des de fora (deep-link), adapta stepIdx.
  useEffect(() => {
    const resolved = resolveStepIndex(topic, stepId);
    if (resolved !== stepIdx) {
      setStepIdx(resolved);
      setBeatIdx(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepId, topic.id]);

  // Registrem step visitat al progress store.
  useEffect(() => {
    if (step?.id) markStepVisited(topic.id, step.id);
  }, [markStepVisited, topic.id, step?.id]);

  // Reset del splash quan canvia de topic (per exemple, navegació a un
  // altre tema des de fora del reader).
  useEffect(() => {
    setSplashVisible(true);
    setReadyToExit(false);
  }, [topic.id]);

  // Lightbox d'imatge · singleton. TabImage dispara `kompass:open-lightbox`
  // amb { image, context }; aquí registrem l'estat + obrim amb fade.
  // No netejem el state en tancar — només togglem lightboxOpen perquè
  // la transició CSS d'opacitat puguí fer el fade-out amb el contingut
  // encara visible. El següent open el substituirà.
  useEffect(() => {
    const onOpen = (e) => {
      setLightboxState(e.detail || null);
      setLightboxOpen(true);
    };
    window.addEventListener('kompass:open-lightbox', onOpen);
    return () => window.removeEventListener('kompass:open-lightbox', onOpen);
  }, []);
  useEffect(() => {
    setLightboxOpen(false);
  }, [stepIdx, beatIdx, topic.id]);

  // Esc tanca el sidebar-drawer quan està obert (només afecta el rang
  // mig d'amplada; en pinned no hi ha "obert/tancat" visual).
  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [sidebarOpen]);

  // Si l'usuari surt del darrer beat (amb ←, clic al sidebar…), tornem a
  // deixar readyToExit a fals perquè el seu proper → al final torni a
  // avisar.
  useEffect(() => {
    if (!isAtEnd) setReadyToExit(false);
  }, [isAtEnd]);

  // Helper internat: moure un beat (o step en mode full). No toca fastMode.
  const moveBeat = useCallback(
    (d) => {
      if (isFullMode) {
        const next = Math.max(0, Math.min(totalSteps - 1, stepIdx + d));
        if (next !== stepIdx) {
          setStepIdx(next);
          setBeatIdx(0);
        }
        return;
      }
      const ni = beatIdx + d;
      if (ni < 0) {
        if (stepIdx === 0) return;
        const prevBeats = stepToBeats(topic.steps[stepIdx - 1]);
        setStepIdx(stepIdx - 1);
        setBeatIdx(Math.max(0, prevBeats.length - 1));
      } else if (ni >= beats.length) {
        if (stepIdx === totalSteps - 1) return;
        setStepIdx(stepIdx + 1);
        setBeatIdx(0);
      } else {
        setBeatIdx(ni);
      }
    },
    [beatIdx, beats.length, stepIdx, totalSteps, topic.steps, isFullMode],
  );

  // Navegació normal: reseteja fastMode (el typewriter torna al ritme habitual).
  // Al darrer beat del darrer step, el primer → activa el mode
  // "ready to exit" (apareix el banner de pròxima lliçó); el segon →
  // navega a la lliçó següent, o torna al temari si no hi ha més.
  const goBeat = useCallback(
    (d) => {
      setFastMode(false);
      if (d === 1 && isAtEnd) {
        if (readyToExit) {
          if (nextTopic) {
            navigate('/temari/' + nextTopic.id);
          } else {
            navigate('/temari');
          }
          return;
        }
        setReadyToExit(true);
        return;
      }
      // Si estàvem en readyToExit i ara ens movem enrere, el useEffect
      // del isAtEnd ja el reseteja.
      moveBeat(d);
    },
    [moveBeat, isAtEnd, readyToExit, nextTopic, navigate],
  );

  const goStep = useCallback(
    (d) => {
      setFastMode(false);
      const next = Math.max(0, Math.min(totalSteps - 1, stepIdx + d));
      if (next === stepIdx) return;
      setStepIdx(next);
      setBeatIdx(0);
    },
    [stepIdx, totalSteps],
  );

  const goBlock = useCallback(
    (d) => {
      setFastMode(false);
      if (d > 0) {
        const next = blockStarts[currentBlock + 1];
        if (next != null) {
          setStepIdx(next);
          setBeatIdx(0);
        }
      } else if (stepIdx !== blockStarts[currentBlock]) {
        setStepIdx(blockStarts[currentBlock]);
        setBeatIdx(0);
      } else if (currentBlock > 0) {
        setStepIdx(blockStarts[currentBlock - 1]);
        setBeatIdx(0);
      }
    },
    [blockStarts, currentBlock, stepIdx],
  );

  const jumpStep = useCallback((i) => {
    setFastMode(false);
    setStepIdx(i);
    setBeatIdx(0);
  }, []);

  const jumpBeat = useCallback((j) => {
    setFastMode(false);
    setBeatIdx(j);
  }, []);

  // Skip/advance ràpid amb ↑/↓: primer press revela instantàniament el beat;
  // segon press (o més) avança al següent/anterior mantenint fastMode=true
  // perquè els següents beats també es revelin sense typewriter.
  const skipOrAdvance = useCallback(
    (d) => {
      // Si ja estem en fastMode o el typewriter està globalment
      // desactivat (no hi ha res a saltar), avancem directament. Si no,
      // el primer ↓ acaba el typewriter i el segon avança.
      if (fastMode || settings.typewriter === false) {
        moveBeat(d);
        return;
      }
      setFastMode(true);
    },
    [fastMode, moveBeat, settings.typewriter],
  );

  const closeReader = useCallback(() => {
    navigate('/temari');
  }, [navigate]);

  // Teclat global.
  useEffect(() => {
    const onKey = (e) => {
      // Si el drawer està obert o el splash està actiu, ignorem dreceres
      // del reader (cada un té el seu propi handler que absorbeix).
      if (settingsOpen || splashVisible) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        // Si som a focus mode, Esc el desactiva en comptes de tancar
        // el reader — l'usuari veu de nou la UI sense perdre la lliçó.
        if (settings.focusMode) {
          useSettingsStore.getState().setFocusMode(false);
          return;
        }
        closeReader();
        return;
      }

      const tag = document.activeElement?.tagName?.toLowerCase();
      const inInput = ['input', 'textarea', 'select'].includes(tag);

      // "c" per obrir el drawer de config (§79). Sense modificadors,
      // ignora inputs perquè no trenquem l'escriptura d'exercicis.
      if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (inInput) return;
        e.preventDefault();
        setSettingsOpen(true);
        return;
      }

      // "p" toggle auto-play (§86).
      if ((e.key === 'p' || e.key === 'P') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (inInput) return;
        e.preventDefault();
        useSettingsStore.getState().setAutoPlay(!settings.autoPlay);
        return;
      }

      // Barra d'espai: pausa/reprèn la barra d'auto-play (§87) i
      // atura qualsevol àudio en reproducció (§98 polit). Quan autoPlay
      // no està encès, l'únic que fa l'espai és aturar l'àudio.
      if ((e.key === ' ' || e.code === 'Space') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (inInput) return;
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('kompass:speak-stop'));
        if (settings.autoPlay) setAutoPlayPaused((v) => !v);
        return;
      }

      // "t" surt del reader cap al temari sencer. Gest ràpid per
      // explorar altres lliçons sense haver de passar per Esc → ratolí.
      // Passem ?focus=<id> perquè la pàgina del temari hi posicioni
      // aquesta lliçó al terç superior i la ressalti — igual que el
      // clic al títol del reader.
      if ((e.key === 't' || e.key === 'T') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (inInput) return;
        e.preventDefault();
        navigate(`/temari?focus=${topic.id}`);
        return;
      }

      // "f" toggle mode focus/no distraccions (§103). Amaga header, peu,
      // sidebar, counter i barra d'autoplay perquè només resti el contingut.
      if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (inInput) return;
        e.preventDefault();
        useSettingsStore.getState().toggleFocusMode();
        return;
      }

      // ↓ / ↑ : skip typewriter. Primer press revela el beat actual;
      // següents presses avancen mantenint el skip actiu.
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (inInput) return;
        e.preventDefault();
        e.stopPropagation();
        skipOrAdvance(e.key === 'ArrowDown' ? 1 : -1);
        return;
      }

      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const mod = e.ctrlKey || e.metaKey;

      // Dins d'un input sense modificador: cedim el control al cursor.
      if (inInput && !mod) return;

      const d = e.key === 'ArrowRight' ? 1 : -1;
      e.preventDefault();
      e.stopPropagation();
      if (mod && e.shiftKey) {
        goBlock(d);
      } else if (mod) {
        goStep(d);
      } else {
        // Si l'exercici del beat actual té preguntes pendents, el deixem
        // gestionar la navegació internament. Només fem goBeat si
        // l'exercici retorna false (ja no li queda res per gestionar).
        const handled = exerciseNavRef.current?.handleArrow?.(d);
        if (handled) return;
        goBeat(d);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [closeReader, goBeat, goStep, goBlock, skipOrAdvance, settingsOpen, splashVisible, settings.autoPlay, navigate, topic.id]);

  // Tap/clic a l'àrea de contingut (fora de botons i pills interactives):
  // acaba el typewriter del beat actual i pausa l'autoplay. Un gest
  // natural per "deixem de llegir en cadena".
  // A mobile (touch), el onTouchEnd gestiona zones; aquest handler
  // s'aplica només als clics de ratolí reals. Per evitar doble
  // processament dels clicks "synthetic" post-tap, ignorem si el darrer
  // touchEnd és més recent que 400 ms.
  const lastTouchRef = useRef(0);
  const onContentClick = useCallback(
    (e) => {
      if (splashVisible || settingsOpen) return;
      if (Date.now() - lastTouchRef.current < 400) return;
      const el = e.target;
      if (!el || typeof el.closest !== 'function') return;
      if (el.closest('button, a, input, select, textarea, .kf-speak, .kf-step, .kf-seg, .kf-rex-dot, .kf-rex-choice, .kf-sidebar')) {
        return;
      }
      setFastMode(true);
      if (settings.autoPlay) setAutoPlayPaused(true);
    },
    [splashVisible, settingsOpen, settings.autoPlay],
  );

  // Navegació amb scroll del ratolí / trackpad. Cada scroll amunt/avall
  // equival a prémer ← / → (beat prev/next). Throttled per evitar que
  // un swipe de trackpad dispari 10 beats de cop.
  const wheelTsRef = useRef(0);
  const onWheel = useCallback(
    (e) => {
      if (splashVisible || settingsOpen) return;
      if (isFullMode) return; // al mode full, el scroll natural del contingut manda
      const tag = document.activeElement?.tagName?.toLowerCase();
      // Dins d'un input/textarea no interceptem (podrien voler seleccionar text)
      if (['input', 'textarea'].includes(tag)) return;
      // Si l'usuari està fent scroll dins d'un element scrollable (per
      // exemple una taula de síntesi llarga amb overflow-y:auto), deixem
      // que l'element scrolli internament i només passem a beat nou
      // quan arriba al topall superior o inferior. Evita el "scroll
      // hijacking" en taules grans.
      const target = e.target;
      if (target && typeof target.closest === 'function') {
        const scrollable = target.closest('.kf-beat-syn, .kf-img-lightbox-aside, .settings-modal-body');
        if (scrollable) {
          const dy = e.deltaY;
          const atTop = scrollable.scrollTop <= 0;
          const atBottom =
            Math.ceil(scrollable.scrollTop + scrollable.clientHeight) >= scrollable.scrollHeight;
          // Si encara hi ha camí per scrollar dins del contenidor en
          // la direcció desitjada, deixem passar el scroll natiu i no
          // canviem de beat.
          if ((dy > 0 && !atBottom) || (dy < 0 && !atTop)) return;
        }
      }
      const now = performance.now();
      if (now - wheelTsRef.current < 380) return;
      const dy = e.deltaY;
      if (Math.abs(dy) < 10) return;
      wheelTsRef.current = now;
      const d = dy > 0 ? 1 : -1;
      // Primer donem oportunitat a l'exercici current de gestionar-ho
      const handled = exerciseNavRef.current?.handleArrow?.(d);
      if (handled) return;
      goBeat(d);
    },
    [splashVisible, settingsOpen, isFullMode, goBeat],
  );

  // Ref estable a goBeat per cridar-lo des de timers/altres effects sense
  // afegir deps que disparen re-execució contínua.
  const goBeatRef = useRef(goBeat);
  useEffect(() => {
    goBeatRef.current = goBeat;
  }, [goBeat]);

  /*
   * Auto-play amb barra de progrés visible. Dues fases:
   *   Fase 1 — lectura: esperem readMs (temps estimat del typewriter o
   *     de l'animació del beat). Durant aquesta fase, la barra no és
   *     visible.
   *   Fase 2 — delay: mostrem la barra animada durant autoPlayDelay
   *     segons. Al final de l'animació, avancem al beat següent.
   *
   * El flux es pausa amb barra d'espai (autoPlayPaused=true) → l'estat
   * CSS animation-play-state:paused atura la barra mid-progress.
   *
   * Condicions que pausen totalment l'auto-play:
   *   - settings.autoPlay desactivat
   *   - beat actual és exercici
   *   - mode studyMode=full
   *   - splash o drawer oberts
   *   - final del topic
   */
  const [autoPlayBarActive, setAutoPlayBarActive] = useState(false);
  const [autoPlayPaused, setAutoPlayPaused] = useState(false);

  // Auto-advance estrictament controlat per `settings.autoPlay`.
  //
  // Un intent previ derivava l'auto-advance també de `audioAutoplay + beat
  // amb pills` (la idea: si l'àudio sona, és natural que el reader
  // avanci tot sol). Però provocava dues confusions:
  //   1. El temporitzador arrencava tot i tenir autoplay off.
  //   2. Els clics no el pausaven (el gate dels handlers mira
  //      `settings.autoPlay`, no la derivada).
  // Ara cada setting és independent: `audioAutoplay` només reprodueix
  // àudio; `autoPlay` avança beats. Si l'usuari vol encadenar tots dos
  // efectes, activa les dues opcions explícitament.
  const autoPlayEligible =
    settings.autoPlay &&
    !isFullMode &&
    !splashVisible &&
    !settingsOpen &&
    !!beat &&
    beat.type !== 'exercise' &&
    !isAtEnd;

  // Reset de l'estat pausat només quan canvia de beat (no quan canvia
  // fastMode). Així l'usuari pot fer setAutoPlayPaused(true) via click o
  // barra d'espai i no queda anul·lat pel fastMode-toggle.
  useEffect(() => {
    setAutoPlayPaused(false);
  }, [stepIdx, beatIdx]);

  // Si l'usuari clica un pill audible (dispara kompass:speakable-activated),
  // pausem l'autoplay — està intentant llegir/escoltar en lloc d'avançar.
  // IMPORTANT: ignorem els clicks disparats per l'orquestrador d'autoplay
  // (detail.programmatic === true); si no, l'autoplay es pausaria a si
  // mateix just quan fa sonar el primer pill i el timer mai avança.
  useEffect(() => {
    const onSpeak = (e) => {
      if (e && e.detail && e.detail.programmatic) return;
      if (settings.autoPlay) setAutoPlayPaused(true);
    };
    window.addEventListener('kompass:speakable-activated', onSpeak);
    return () => window.removeEventListener('kompass:speakable-activated', onSpeak);
  }, [settings.autoPlay]);

  useEffect(() => {
    setAutoPlayBarActive(false);
    if (!autoPlayEligible) return undefined;
    const readMs = fastMode
      ? 300
      : estimateBeatReadMs(beat, speed, settings.typewriter !== false);
    let started = false;
    const startBar = () => {
      if (started) return;
      started = true;
      setAutoPlayBarActive(true);
    };
    // Si l'usuari té audioAutoplay actiu, esperem l'event explícit
    // que dispara el beat quan tota l'àudio s'ha reproduit (§98 polit).
    // Alternativament, un timer fallback amb estimació que inclou el
    // temps estimat dels pills per si l'event mai arribés (p. ex.
    // beat sense pills però audioAutoplay on, o error de reproducció).
    const onAudioDone = () => startBar();
    window.addEventListener('kompass:beat-audio-complete', onAudioDone);
    // Comptatge aproximat de pills al beat (spans `!!...!!` al text).
    const speakableCount = countSpeakablesInBeat(beat);
    const audioExtraMs = settings.audioAutoplay && speakableCount > 0
      ? speakableCount * 2400 + (speakableCount - 1) * 200
      : 0;
    const t = window.setTimeout(startBar, readMs + audioExtraMs);
    return () => {
      window.removeEventListener('kompass:beat-audio-complete', onAudioDone);
      window.clearTimeout(t);
    };
  }, [
    stepIdx,
    beatIdx,
    beat,
    autoPlayEligible,
    fastMode,
    speed,
    settings.typewriter,
    settings.audioAutoplay,
  ]);

  // Gest tàctil · §96
  //
  // Desambiguem entre tres gestos:
  //   - Tap (dx, dy < 10 px, dt < 300 ms) → zones verticals:
  //       top 33%   → goBeat(-1)
  //       middle    → skip typewriter + pausa autoplay (equivalent al clic)
  //       bottom 33% → goBeat(+1)
  //   - Swipe vertical (|dy| > 50, dominant, dt < 800) → infinite-scroll
  //     típic de mòbil: amunt = beat següent, avall = beat anterior.
  //   - Swipe horitzontal (|dx| > 50, dominant, dt < 800) → beat prev/next.
  //
  // S'aplica al .kf-body (no al .kf-root), perquè els taps a header/peu
  // no han d'activar cap zona. En mode full, deixem el scroll natural
  // (desactivem la detecció vertical; els swipes horitzontals segueixen
  // funcionant perquè no entren en conflicte amb el scroll natural).
  //
  // Després d'un tap processat, marquem lastTouchRef perquè el synthetic
  // click post-tap que dispara el browser no es processi dues vegades
  // a onContentClick.
  const touchRef = useRef({ x: 0, y: 0, t: 0, active: false });
  const onTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    const t0 = e.touches[0];
    touchRef.current = { x: t0.clientX, y: t0.clientY, t: Date.now(), active: true };
  };
  const onTouchEnd = (e) => {
    if (!touchRef.current.active) return;
    touchRef.current.active = false;
    if (splashVisible || settingsOpen) return;
    const t0 = e.changedTouches[0];
    const dx = t0.clientX - touchRef.current.x;
    const dy = t0.clientY - touchRef.current.y;
    const dt = Date.now() - touchRef.current.t;
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (['input', 'textarea', 'select'].includes(tag)) return;

    const isTap = Math.abs(dx) < 10 && Math.abs(dy) < 10 && dt < 300;
    if (isTap) {
      // En mode full, el scroll natural del contingut té prioritat; no
      // apliquem zones perquè l'usuari podria estar intentant desplaçar-se.
      if (isFullMode) return;
      // Protegim els mateixos elements interactius que onContentClick
      // (botons, pills de àudio, sidebar, dots d'exercici…).
      const el = e.target;
      if (el && typeof el.closest === 'function') {
        if (el.closest('button, a, input, select, textarea, .kf-speak, .kf-step, .kf-seg, .kf-rex-dot, .kf-rex-choice, .kf-sidebar')) {
          return;
        }
      }
      const vh = window.innerHeight || 0;
      const y = t0.clientY;
      if (y < vh * 0.33) {
        goBeat(-1);
      } else if (y > vh * 0.67) {
        goBeat(1);
      } else {
        // Zona central: equivalent al clic al contingut.
        setFastMode(true);
        if (settings.autoPlay) setAutoPlayPaused(true);
      }
      lastTouchRef.current = Date.now();
      return;
    }

    // Swipe · desambiguem l'eix dominant. Llindar mínim 50 px, ratio
    // 1.2 sobre l'altre eix per evitar que diagonals ambigües disparin
    // res, i dt < 800 ms per considerar-ho un gest ràpid.
    if (dt > 800) return;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (Math.max(absDx, absDy) < 50) return;
    const isVertical = absDy > absDx * 1.2;
    const isHorizontal = absDx > absDy * 1.2;
    // Swipe vertical: amunt (dy < 0) → beat següent, avall → beat
    // anterior. Patró clàssic d'scroll infinit a mòbil. En isFullMode
    // el scroll natural del contingut té prioritat i no interceptem.
    if (isVertical && !isFullMode) {
      goBeat(dy < 0 ? 1 : -1);
      lastTouchRef.current = Date.now();
      return;
    }
    // Swipe horitzontal: esquerra (dx < 0) → següent, dreta → anterior.
    if (isHorizontal) {
      goBeat(dx < 0 ? 1 : -1);
      lastTouchRef.current = Date.now();
    }
  };

  const reduced = prefersReducedMotion();

  return (
    <div
      className={`kf-root${settings.focusMode ? ' kf-focus-mode' : ''}`}
      ref={rootRef}
      onWheel={onWheel}
    >
      {/* HEADER editorial — 3 columnes: left (logo) · center (títol) · right (progress).
          El botó "← TORNA AL TEMARI" s'ha eliminat perquè el clic al títol
          central ja porta al temari amb focus a la lliçó actual; la navegació
          redundant desordenava la cantonada esquerra. §103 polit. */}
      <div className="kf-head">
        <div className="kf-head-left">
          <button
            type="button"
            className="kf-head-exit"
            onClick={() => navigate(`/temari?focus=${topic.id}`)}
            aria-label="Tornar al temari"
            title="Tornar al temari"
          >
            <ArrowLeft size={22} aria-hidden="true" strokeWidth={1.75} />
          </button>
          <Link
            to="/"
            className="kf-logo"
            aria-label={t('app.name') + ' · anar a l\'inici'}
            title={t('app.name') + ' · anar a l\'inici'}
          >
            <Compass size={22} aria-hidden="true" strokeWidth={1.75} />
            <b>Kompass</b>
          </Link>
          <span className="kf-muted kf-logo-id">{topic.id}</span>
          {topic.reviewed ? null : (
            <span
              className="kf-provisional-badge"
              title="Capítol encara no revisat pedagògicament — pot tenir errors o ajustos pendents."
            >
              provisional
            </span>
          )}
        </div>

        <button
          type="button"
          className="kf-title kf-title-btn"
          onClick={() => navigate(`/temari?focus=${topic.id}`)}
          title="Obre l'índex del temari"
        >
          {topic.title}
        </button>

        <ProgressBar
          topic={topic}
          stepIdx={stepIdx}
          beatIdx={beatIdx}
          beats={beats}
          onJumpStep={jumpStep}
          onJumpBeat={jumpBeat}
          exercisesState={exercisesState}
        />
      </div>

      {/* BODY */}
      <div
        className="kf-body"
        data-mode={isFullMode ? 'full' : 'peek'}
        onClick={onContentClick}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <Backdrop topic={topic} />

        {isFullMode ? (
          <div className="kf-stage kf-stage-full" key={`s${stepIdx}-full`}>
            {beats.map((b, i) => (
              <div
                key={i}
                className={reduced ? 'kf-full-beat-static' : 'kf-full-beat'}
                style={reduced ? undefined : { animationDelay: `${i * 80}ms` }}
              >
                <BeatBody
                  beat={b}
                  step={step}
                  stepIdx={stepIdx}
                  showKicker={i === 0}
                  settings={settings}
                  speed={speed}
                  fastMode={true}
                />
              </div>
            ))}
          </div>
        ) : (
          <>
            <BeatStagePeek
              allBeats={allBeats}
              globalIdx={globalIdx}
              settings={settings}
              speed={speed}
              fastMode={fastMode}
              exerciseNavRef={exerciseNavRef}
            />
            <BeatSidebar
              topic={topic}
              beats={beats}
              stepIdx={stepIdx}
              beatIdx={beatIdx}
              onJumpStep={jumpStep}
              onJumpBeat={jumpBeat}
              isOpen={sidebarOpen}
              onToggle={() => setSidebarOpen((v) => !v)}
              onClose={() => setSidebarOpen(false)}
            />
          </>
        )}
      </div>

      {/* Counter flotant "Pas 09 · 5/9" a la cantonada inferior esquerra
          del body (§98). Abans vivia al peu; mou-lo al body perquè
          sempre estigui a la mateixa posició i serveixi de referència
          per detectar i comentar errors sense dependre del footer.
          Inclou un botó de copiar la referència interna (topic · step ·
          beat) per facilitar notificar errors amb precisió. */}
      <BodyCounter
        topic={topic}
        step={step}
        stepIdx={stepIdx}
        beatIdx={beatIdx}
        beatsCount={beats.length}
        currentBlock={currentBlock}
        blockStartsCount={blockStarts.length}
        isFullMode={isFullMode}
      />

      {/* Barra de progrés de l'auto-play (§87). Entre body i foot, s'anima
          d'esquerra a dreta durant autoPlayDelay segons; pot pausar-se
          amb la barra d'espai. Al final, goBeat(1). */}
      {autoPlayBarActive ? (
        <div className="kf-autoplay-bar" aria-hidden="true">
          <div
            key={`${stepIdx}-${beatIdx}-${autoPlayPaused ? 'p' : 'r'}`}
            className="kf-autoplay-bar-fill"
            style={{
              // Durada escalada per la llargada del beat (§87/§98 polit).
              // Un beat "típic" de 50 chars triga autoPlayDelay segons;
              // un de 20 chars va proporcionalment més ràpid, un de 150
              // més lent. Això fa que el ritme del curs s'adapti al
              // contingut en lloc de ser constant.
              animationDuration: `${computeAutoPlayDuration(beat, settings.autoPlayDelay || 3)}s`,
              animationPlayState: autoPlayPaused ? 'paused' : 'running',
            }}
            onAnimationEnd={() => goBeatRef.current?.(1)}
          />
        </div>
      ) : null}

      {/* PEU */}
      <div className="kf-foot">
        <button
          type="button"
          className="kf-btn"
          onClick={() => goBeat(-1)}
          disabled={isFullMode ? stepIdx === 0 : stepIdx === 0 && beatIdx === 0}
        >
          <ArrowLeft size={12} aria-hidden="true" />
          <span>{t('step.previous')}</span>
        </button>

        <div className="kf-foot-mid">
          <span className="kf-keyhint">
            {/* Columna 1 · navegació direccional.
                Grid intern de 4 columnes: [mod] [shift] [fletxes] [label].
                Cada fila té sempre els 4 slots; els no aplicables es
                marquen .is-empty per mantenir la mesura i que les fletxes
                quedin alineades verticalment entre files (v. §96-97). */}
            {!isFullMode ? (
              <span className="kf-keyhint-col kf-keyhint-col-nav">
                {/* fragment · sense modificadors */}
                <span className="k-mod is-empty" aria-hidden="true">
                  <kbd>{MODKEY}</kbd>
                  <span className="plus">+</span>
                </span>
                <span className="k-shift is-empty" aria-hidden="true">
                  <kbd>⇧</kbd>
                  <span className="plus">+</span>
                </span>
                <span className="k-arrows">
                  <kbd>←</kbd>
                  <kbd>→</kbd>
                </span>
                <span className="lbl">fragment</span>

                {/* pas · mod + fletxes */}
                <span className="k-mod">
                  <kbd>{MODKEY}</kbd>
                  <span className="plus">+</span>
                </span>
                <span className="k-shift is-empty" aria-hidden="true">
                  <kbd>⇧</kbd>
                  <span className="plus">+</span>
                </span>
                <span className="k-arrows">
                  <kbd>←</kbd>
                  <kbd>→</kbd>
                </span>
                <span className="lbl">pas</span>

                {/* bloc · mod + shift + fletxes */}
                <span className="k-mod">
                  <kbd>{MODKEY}</kbd>
                  <span className="plus">+</span>
                </span>
                <span className="k-shift">
                  <kbd>⇧</kbd>
                  <span className="plus">+</span>
                </span>
                <span className="k-arrows">
                  <kbd>←</kbd>
                  <kbd>→</kbd>
                </span>
                <span className="lbl">bloc</span>
              </span>
            ) : (
              <span className="kf-keyhint-col kf-keyhint-col-nav">
                <span className="k-mod">
                  <kbd>{MODKEY}</kbd>
                  <span className="plus">+</span>
                </span>
                <span className="k-shift is-empty" aria-hidden="true">
                  <kbd>⇧</kbd>
                  <span className="plus">+</span>
                </span>
                <span className="k-arrows">
                  <kbd>←</kbd>
                  <kbd>→</kbd>
                </span>
                <span className="lbl">pas</span>

                <span className="k-mod">
                  <kbd>{MODKEY}</kbd>
                  <span className="plus">+</span>
                </span>
                <span className="k-shift">
                  <kbd>⇧</kbd>
                  <span className="plus">+</span>
                </span>
                <span className="k-arrows">
                  <kbd>←</kbd>
                  <kbd>→</kbd>
                </span>
                <span className="lbl">bloc</span>
              </span>
            )}

            {/* Columna 2 · control de ritme (saltar + auto/pause) */}
            <span className="kf-keyhint-col kf-keyhint-col-grid">
              <span
                className={'kgroup' + (fastMode ? ' kf-keyhint-active' : '')}
                title={
                  fastMode
                    ? 'Salt actiu — el contingut es revela instantàniament'
                    : 'Salta el typewriter i avança'
                }
              >
                <span className="kgroup-keys">
                  <kbd>↑</kbd>
                  <kbd>↓</kbd>
                </span>
                <span className="lbl">{fastMode ? 'saltant' : 'saltar'}</span>
              </span>
              <span
                className={'kgroup' + (settings.autoPlay ? ' kf-keyhint-active' : '')}
                title={
                  settings.autoPlay
                    ? autoPlayPaused
                      ? 'Auto-play pausat (espai reprèn)'
                      : 'Auto-play actiu (espai pausa)'
                    : 'Activa l\'auto-play'
                }
              >
                <span className="kgroup-keys">
                  <kbd>p</kbd>
                </span>
                <span className="lbl">
                  {settings.autoPlay
                    ? autoPlayPaused
                      ? 'pause'
                      : 'auto'
                    : 'play'}
                </span>
              </span>
            </span>

            {/* Columna 3 · utilitats (config + temari + sortir) */}
            <span className="kf-keyhint-col kf-keyhint-col-grid">
              <span className="kgroup">
                <span className="kgroup-keys">
                  <kbd>c</kbd>
                </span>
                <span className="lbl">config</span>
              </span>
              <span className="kgroup">
                <span className="kgroup-keys">
                  <kbd>t</kbd>
                </span>
                <span className="lbl">temari</span>
              </span>
              <span
                className={'kgroup' + (settings.focusMode ? ' kf-keyhint-active' : '')}
                title={settings.focusMode ? 'Mode focus activat (f o Esc per sortir)' : 'Mode focus · amaga UI'}
              >
                <span className="kgroup-keys">
                  <kbd>f</kbd>
                </span>
                <span className="lbl">{settings.focusMode ? 'focus' : 'focus'}</span>
              </span>
              <span className="kgroup">
                <span className="kgroup-keys">
                  <kbd>Esc</kbd>
                </span>
                <span className="lbl">sortir</span>
              </span>
            </span>
          </span>
        </div>

        <div className="kf-foot-right">
          {isAtEnd && readyToExit ? (
            <div className="kf-next-lesson" role="status" aria-live="polite">
              <span className="kf-next-kicker">
                {nextTopic ? 'Propera lliçó' : 'Has acabat'}
              </span>
              <span className="kf-next-title">
                {nextTopic
                  ? nextTopic.shortTitle || nextTopic.title
                  : topic.title}
              </span>
            </div>
          ) : null}
          <button
            type="button"
            className="kf-foot-icon"
            onClick={() => setSettingsOpen(true)}
            aria-label={t('nav.settings')}
            title={t('nav.settings') + ' (c)'}
          >
            <SettingsIcon size={16} aria-hidden="true" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className="kf-btn kf-btn-primary"
            onClick={() => goBeat(1)}
          >
            <span>
              {isAtEnd
                ? readyToExit
                  ? nextTopic ? 'Continuar' : 'Al temari'
                  : 'Final'
                : t('step.next')}
            </span>
            <ArrowRight size={12} aria-hidden="true" />
          </button>
        </div>
      </div>

      {settings.focusMode ? (
        <div className="kf-focus-hint" aria-hidden="true">
          Mode focus · <kbd>f</kbd> o <kbd>Esc</kbd> per sortir
        </div>
      ) : null}

      {/* El modal d'ajustaments viu global a App.jsx (§112). Aquí
          només obrim el flag; no renderitzem cap component propi. */}

      <TabImageLightbox
        state={lightboxState}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />


      {splashVisible ? (
        <ReaderEntrySplash
          topic={topic}
          onDismiss={() => setSplashVisible(false)}
        />
      ) : null}
    </div>
  );
}
