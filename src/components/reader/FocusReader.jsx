import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Compass,
  Dumbbell,
  Info,
  Lightbulb,
  AlertTriangle,
  Settings as SettingsIcon,
} from 'lucide-react';
import { useT } from '@/i18n';
import { useSettings } from '@/store/useSettingsStore.js';
import { useProgressStore } from '@/store/useProgressStore.js';
import { getExercise } from '@/lib/dataLoader.js';
import { buildBeats, isRichStep, stepKind } from '@/lib/reader/buildBeats.js';
import { legacyBlocksToBeats } from '@/lib/reader/legacyBlocksToBeats.js';
import {
  resolveTransition,
  resolveTypewriterSpeed,
  prefersReducedMotion,
} from '@/lib/reader/beatTransitions.js';
import { parseInline } from '@/lib/reader/parseInline.js';
import { Typed } from '@/components/reader/Typed.jsx';
import { ReaderSettingsDrawer } from '@/components/reader/ReaderSettingsDrawer.jsx';
import { ReaderExerciseEngine } from '@/components/reader/ReaderExerciseEngine.jsx';

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
  // Un "bloc" comença a cada step no-exercice. Inclou els exercicis
  // que segueixen fins al proper narrative/synthesis.
  const starts = [];
  steps.forEach((s, i) => {
    const kind = stepKind(s);
    if (kind !== 'exercise' && kind !== 'assessment') starts.push(i);
  });
  return starts;
}

function resolveStepIndex(topic, stepId) {
  if (!stepId) return 0;
  const i = topic.steps.findIndex((s) => s.id === stepId);
  return i < 0 ? 0 : i;
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
        <Typed
          text={beat.ex.de}
          as="p"
          className="kf-beat-ex-de"
          active={typewriterActive}
          speed={speed + 4}
          onDone={() => setDeDone(true)}
        />
        {deDone && beat.ex.ca ? (
          <p className="kf-beat-ex-ca kf-fade-in">{beat.ex.ca}</p>
        ) : null}
        {deDone && beat.ex.note ? (
          <p className="kf-beat-ex-note kf-fade-in">{beat.ex.note}</p>
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
        <h2 className="kf-beat-pron-huge">{tab.pron}</h2>
        {tab.gloss ? <p className="kf-beat-pron-gloss">= {tab.gloss}</p> : null}
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
            <div className="de">{parseInline(tab.example.de)}</div>
            {tab.example.ca ? <div className="ca">{tab.example.ca}</div> : null}
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
        <span className="kf-beat-pair-personal">{pair.personal}</span>
        <span className="kf-beat-pair-arrow">→</span>
        <span className="kf-beat-pair-poss">{pair.possessive}</span>
        {pair.gloss ? <span className="kf-beat-pair-gloss">{pair.gloss}</span> : null}
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
                <td className="de">{parseInline(r.de)}</td>
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
          {c.title ? <h4>{c.title}</h4> : null}
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

function ExerciseBeatCard({ beat, stepIdx, onFinish, peek = false }) {
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
        <ReaderExerciseEngine exercise={exercise} peek={peek} />
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
  if (step.id) return step.id;
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
            <BeatBody
              beat={entry.beat}
              step={entry.step}
              stepIdx={entry.stepIdx}
              showKicker={isCurrent}
              settings={settings}
              speed={speed}
              fastMode={isCurrent ? fastMode : true}
              isCurrent={isCurrent}
            />
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
    case 'exercise':
      return (
        <ExerciseBeatCard
          beat={beat}
          stepIdx={stepIdx}
          onFinish={onFinishExercise}
          peek={!isCurrent}
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
  const rootRef = useRef(null);

  const step = topic.steps[stepIdx];
  const totalSteps = topic.steps.length;
  const beats = useMemo(() => stepToBeats(step), [step]);
  const beat = beats[Math.min(beatIdx, Math.max(beats.length - 1, 0))];

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
  const goBeat = useCallback(
    (d) => {
      setFastMode(false);
      moveBeat(d);
    },
    [moveBeat],
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
      // Si el drawer està obert, ignorem dreceres del reader (l'ESC
      // el captura el drawer mateix en el seu propi handler).
      if (drawerOpen) return;

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
        goBeat(d);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [closeReader, goBeat, goStep, goBlock, skipOrAdvance, drawerOpen]);

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

          <div className="kf-logo">
            <Compass size={16} aria-hidden="true" strokeWidth={1.75} />
            <b>Kompass</b>
            <span className="kf-muted">{topic.id}</span>
          </div>
        </div>

        <div className="kf-title">
          <i>{topic.title}</i>
        </div>

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
      <div className="kf-body" data-mode={isFullMode ? 'full' : 'peek'}>
        <Backdrop topic={topic} />

        {isFullMode ? (
          <div className="kf-stage kf-stage-full" key={`s${stepIdx}-full`}>
            {beats.map((b, i) => (
              <div
                key={i}
                className={reduced ? '' : 'kf-full-beat'}
                style={reduced ? undefined : { animationDelay: `${i * 60}ms` }}
              >
                <BeatBody
                  beat={b}
                  step={step}
                  stepIdx={stepIdx}
                  showKicker={i === 0}
                  settings={settings}
                  speed={speed}
                  fastMode={fastMode}
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
            {!isFullMode ? (
              <>
                <span className="kgroup">
                  <kbd>←</kbd>
                  <kbd>→</kbd>
                  <span className="lbl">fragment</span>
                </span>
                <span className="kf-sep" />
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
                <span className="kf-sep" />
              </>
            ) : null}
            <span className="kgroup">
              <kbd>{MODKEY}</kbd>
              <span className="plus">+</span>
              <kbd>←</kbd>
              <kbd>→</kbd>
              <span className="lbl">pas</span>
            </span>
            <span className="kf-sep" />
            <span className="kgroup">
              <kbd>{MODKEY}</kbd>
              <span className="plus">+</span>
              <kbd>⇧</kbd>
              <span className="plus">+</span>
              <kbd>←</kbd>
              <kbd>→</kbd>
              <span className="lbl">bloc</span>
            </span>
            <span className="kf-sep" />
            <span className="kgroup">
              <kbd>c</kbd>
              <span className="lbl">config</span>
            </span>
            <span className="kf-sep" />
            <span className="kgroup">
              <kbd>Esc</kbd>
              <span className="lbl">sortir</span>
            </span>
          </span>
        </div>

        <div className="kf-foot-right">
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
            disabled={
              isFullMode
                ? stepIdx === totalSteps - 1
                : stepIdx === totalSteps - 1 && beatIdx === beats.length - 1
            }
          >
            <span>{t('step.next')}</span>
            <ArrowRight size={12} aria-hidden="true" />
          </button>
        </div>
      </div>

      <ReaderSettingsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
