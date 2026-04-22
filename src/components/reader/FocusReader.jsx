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
import { parseInline } from '@/lib/reader/parseInline.js';
import { Typed } from '@/components/reader/Typed.jsx';
import { SpeakableText } from '@/components/reader/SpeakableText.jsx';
import { ReaderSettingsDrawer } from '@/components/reader/ReaderSettingsDrawer.jsx';
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
    return parts.join(' ¶ ').replace(/[*=_`]+/g, '');
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

function ExampleBeat({ beat, step, stepIdx, showKicker, typewriterActive, speed }) {
  const [deDone, setDeDone] = useState(!typewriterActive);
  useEffect(() => { setDeDone(!typewriterActive); }, [typewriterActive, beat]);
  return (
    <>
      {showKicker ? <BeatKicker step={step} stepIdx={stepIdx} beatKicker={step.id} /> : null}
      <div className="kf-beat-ex">
        <span className="kf-marker">Exemple {beat.idx} / {beat.total}</span>
        {deDone ? (
          <p className="kf-beat-ex-de">
            <SpeakableText text={beat.ex.de} />
          </p>
        ) : (
          <Typed
            text={beat.ex.de}
            as="p"
            className="kf-beat-ex-de"
            active={typewriterActive}
            speed={speed + 4}
            onDone={() => setDeDone(true)}
          />
        )}
        {deDone && beat.ex.ca ? (
          <p className="kf-beat-ex-ca kf-fade-in">{parseInline(beat.ex.ca)}</p>
        ) : null}
        {deDone && beat.ex.note ? (
          <p className="kf-beat-ex-note kf-fade-in">{parseInline(beat.ex.note)}</p>
        ) : null}
      </div>
    </>
  );
}

function PronBeat({ beat, step, stepIdx, showKicker, typewriterActive, speed }) {
  const tab = beat.tab;
  const [noteDone, setNoteDone] = useState(!typewriterActive);
  useEffect(() => { setNoteDone(!typewriterActive); }, [typewriterActive, beat]);
  return (
    <>
      {showKicker ? <BeatKicker step={step} stepIdx={stepIdx} beatKicker={step.id} /> : null}
      <div className="kf-beat-pron">
        <span className="kf-marker">Pronom</span>
        <h2 className="kf-beat-pron-huge">
          <SpeakableText text={tab.pron} />
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
            <div className="de"><SpeakableText text={tab.example.de} /></div>
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

function CompareBeat({ beat, step, stepIdx, showKicker, tableAnim }) {
  return (
    <>
      {showKicker ? <BeatKicker step={step} stepIdx={stepIdx} beatKicker={step.id} /> : null}
      <div className="kf-beat-compare">
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
                <td className="de"><SpeakableText text={r.de} /></td>
                <td>{r.en}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function PitfallBeat({ beat, step, stepIdx, showKicker, typewriterActive, speed }) {
  const pit = beat.pit;
  return (
    <>
      {showKicker ? <BeatKicker step={step} stepIdx={stepIdx} beatKicker={step.id} /> : null}
      <div className="kf-beat-pitfall">
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
          <h3 className="kf-ex-title">{exercise.title}</h3>
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
    const t = String(s || '').replace(/[*=_`]/g, '').trim();
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
}) {
  return (
    <aside className="kf-sidebar" aria-label="Índex de la lliçó">
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
          return (
            <li
              key={i}
              className={[
                'kf-sidebar-step',
                isCurrent ? 'is-current' : '',
                isDone ? 'is-done' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <button
                type="button"
                onClick={() => onJumpStep(i)}
                title={label}
              >
                <span className="kf-sidebar-step-num">
                  {String(i + 1).padStart(2, '0')}
                </span>
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
                          onClick={() => onJumpBeat(j)}
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
      return <ExampleBeat {...{ beat, step, stepIdx, showKicker, typewriterActive, speed }} />;
    case 'pron':
      return <PronBeat {...{ beat, step, stepIdx, showKicker, typewriterActive, speed }} />;
    case 'pair':
      return <PairBeat {...{ beat, step, stepIdx, showKicker }} />;
    case 'compare':
      return (
        <CompareBeat
          {...{ beat, step, stepIdx, showKicker, tableAnim }}
        />
      );
    case 'pitfall':
      return <PitfallBeat {...{ beat, step, stepIdx, showKicker, typewriterActive, speed }} />;
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
  const [drawerOpen, setDrawerOpen] = useState(false);
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
      if (!fastMode) {
        setFastMode(true);
        return;
      }
      moveBeat(d);
    },
    [fastMode, moveBeat],
  );

  const closeReader = useCallback(() => {
    navigate('/temari');
  }, [navigate]);

  // Teclat global.
  useEffect(() => {
    const onKey = (e) => {
      // Si el drawer està obert o el splash està actiu, ignorem dreceres
      // del reader (cada un té el seu propi handler que absorbeix).
      if (drawerOpen || splashVisible) return;

      if (e.key === 'Escape') {
        e.preventDefault();
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
        setDrawerOpen(true);
        return;
      }

      // "p" toggle auto-play (§86).
      if ((e.key === 'p' || e.key === 'P') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (inInput) return;
        e.preventDefault();
        useSettingsStore.getState().setAutoPlay(!settings.autoPlay);
        return;
      }

      // Barra d'espai: pausa/reprèn la barra d'auto-play (§87). Només
      // activa quan autoPlay està encès i tenim la barra visible.
      if ((e.key === ' ' || e.code === 'Space') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (inInput) return;
        if (!settings.autoPlay) return;
        e.preventDefault();
        setAutoPlayPaused((v) => !v);
        return;
      }

      // "t" surt del reader cap al temari sencer. Gest ràpid per
      // explorar altres lliçons sense haver de passar per Esc → ratolí.
      if ((e.key === 't' || e.key === 'T') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (inInput) return;
        e.preventDefault();
        navigate('/temari');
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
  }, [closeReader, goBeat, goStep, goBlock, skipOrAdvance, drawerOpen, splashVisible, settings.autoPlay]);

  // Tap/clic a l'àrea de contingut (fora de botons i pills interactives):
  // acaba el typewriter del beat actual i pausa l'autoplay. Un gest
  // natural per "deixem de llegir en cadena".
  const onContentClick = useCallback(
    (e) => {
      if (splashVisible || drawerOpen) return;
      const el = e.target;
      if (!el || typeof el.closest !== 'function') return;
      // Respecta clics a elements interactius: botons, inputs, selects,
      // enllaços, pills speakable, i qualsevol altre marcador.
      if (el.closest('button, a, input, select, textarea, .kf-speak, .kf-step, .kf-seg, .kf-rex-dot, .kf-rex-choice, .kf-sidebar')) {
        return;
      }
      setFastMode(true);
      if (settings.autoPlay) setAutoPlayPaused(true);
    },
    [splashVisible, drawerOpen, settings.autoPlay],
  );

  // Navegació amb scroll del ratolí / trackpad. Cada scroll amunt/avall
  // equival a prémer ← / → (beat prev/next). Throttled per evitar que
  // un swipe de trackpad dispari 10 beats de cop.
  const wheelTsRef = useRef(0);
  const onWheel = useCallback(
    (e) => {
      if (splashVisible || drawerOpen) return;
      if (isFullMode) return; // al mode full, el scroll natural del contingut manda
      const tag = document.activeElement?.tagName?.toLowerCase();
      // Dins d'un input/textarea no interceptem (podrien voler seleccionar text)
      if (['input', 'textarea'].includes(tag)) return;
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
    [splashVisible, drawerOpen, isFullMode, goBeat],
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

  const autoPlayEligible =
    settings.autoPlay &&
    !isFullMode &&
    !splashVisible &&
    !drawerOpen &&
    !!beat &&
    beat.type !== 'exercise' &&
    !isAtEnd;

  useEffect(() => {
    setAutoPlayBarActive(false);
    setAutoPlayPaused(false);
    if (!autoPlayEligible) return undefined;
    const readMs = fastMode
      ? 300
      : estimateBeatReadMs(beat, speed, settings.typewriter !== false);
    const t = window.setTimeout(() => setAutoPlayBarActive(true), readMs);
    return () => window.clearTimeout(t);
  }, [
    stepIdx,
    beatIdx,
    beat,
    autoPlayEligible,
    fastMode,
    speed,
    settings.typewriter,
  ]);

  // Swipe tàctil.
  const touchRef = useRef({ x: 0, y: 0, t: 0, active: false });
  const onTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    const t0 = e.touches[0];
    touchRef.current = { x: t0.clientX, y: t0.clientY, t: Date.now(), active: true };
  };
  const onTouchEnd = (e) => {
    if (!touchRef.current.active) return;
    touchRef.current.active = false;
    const t0 = e.changedTouches[0];
    const dx = t0.clientX - touchRef.current.x;
    const dy = t0.clientY - touchRef.current.y;
    const dt = Date.now() - touchRef.current.t;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.2 || dt > 800) return;
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (['input', 'textarea', 'select'].includes(tag)) return;
    goBeat(dx < 0 ? 1 : -1);
  };

  const reduced = prefersReducedMotion();

  return (
    <div
      className="kf-root"
      ref={rootRef}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onWheel={onWheel}
    >
      {/* HEADER editorial — 3 columnes: left (back+logo) · center (títol) · right (progress) */}
      <div className="kf-head">
        <div className="kf-head-left">
          <button
            type="button"
            className="kf-back"
            onClick={closeReader}
            aria-label={t('topic.backToIndex')}
            title={t('topic.backToIndex')}
          >
            <ArrowLeft size={14} aria-hidden="true" />
            <span>{t('topic.backToIndex')}</span>
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
        </div>

        <div className="kf-title">{topic.title}</div>

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
            />
          </>
        )}
      </div>

      {/* Barra de progrés de l'auto-play (§87). Entre body i foot, s'anima
          d'esquerra a dreta durant autoPlayDelay segons; pot pausar-se
          amb la barra d'espai. Al final, goBeat(1). */}
      {autoPlayBarActive ? (
        <div className="kf-autoplay-bar" aria-hidden="true">
          <div
            key={`${stepIdx}-${beatIdx}-${autoPlayPaused ? 'p' : 'r'}`}
            className="kf-autoplay-bar-fill"
            style={{
              animationDuration: `${Math.max(1, settings.autoPlayDelay || 3)}s`,
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
          <span className="kf-foot-counter">
            {isFullMode
              ? `Pas ${String(stepIdx + 1).padStart(2, '0')} · Bloc ${String(currentBlock + 1).padStart(2, '0')}/${blockStarts.length}`
              : `Pas ${String(stepIdx + 1).padStart(2, '0')} · ${beatIdx + 1}/${beats.length}`}
          </span>
          <span className="kf-keyhint">
            {/* Columna 1 · navegació direccional (fletxes ←→) */}
            {!isFullMode ? (
              <span className="kf-keyhint-col">
                <span className="kgroup">
                  <kbd>←</kbd>
                  <kbd>→</kbd>
                  <span className="lbl">fragment</span>
                </span>
                <span className="kgroup">
                  <kbd>{MODKEY}</kbd>
                  <span className="plus">+</span>
                  <kbd>←</kbd>
                  <kbd>→</kbd>
                  <span className="lbl">pas</span>
                </span>
                <span className="kgroup">
                  <kbd>{MODKEY}</kbd>
                  <span className="plus">+</span>
                  <kbd>⇧</kbd>
                  <span className="plus">+</span>
                  <kbd>←</kbd>
                  <kbd>→</kbd>
                  <span className="lbl">bloc</span>
                </span>
              </span>
            ) : (
              <span className="kf-keyhint-col">
                <span className="kgroup">
                  <kbd>{MODKEY}</kbd>
                  <span className="plus">+</span>
                  <kbd>←</kbd>
                  <kbd>→</kbd>
                  <span className="lbl">pas</span>
                </span>
                <span className="kgroup">
                  <kbd>{MODKEY}</kbd>
                  <span className="plus">+</span>
                  <kbd>⇧</kbd>
                  <span className="plus">+</span>
                  <kbd>←</kbd>
                  <kbd>→</kbd>
                  <span className="lbl">bloc</span>
                </span>
              </span>
            )}

            {/* Columna 2 · control de ritme (saltar + auto/pause) */}
            <span className="kf-keyhint-col">
              <span
                className={'kgroup' + (fastMode ? ' kf-keyhint-active' : '')}
                title={
                  fastMode
                    ? 'Salt actiu — el contingut es revela instantàniament'
                    : 'Salta el typewriter i avança'
                }
              >
                <kbd>↑</kbd>
                <kbd>↓</kbd>
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
                <kbd>p</kbd>
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
            <span className="kf-keyhint-col">
              <span className="kgroup">
                <kbd>c</kbd>
                <span className="lbl">config</span>
              </span>
              <span className="kgroup">
                <kbd>t</kbd>
                <span className="lbl">temari</span>
              </span>
              <span className="kgroup">
                <kbd>Esc</kbd>
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
            onClick={() => setDrawerOpen(true)}
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

      <ReaderSettingsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
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
