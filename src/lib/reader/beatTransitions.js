/*
 * Registre de transicions de beat · ARCHITECTURE §17.6
 *
 * Cada beat té un tipus de transició que determina com "apareix" en pantalla.
 * El registre centralitza:
 *   - el default per tipus de beat (`DEFAULT_TRANSITION_BY_BEAT_TYPE`)
 *   - la resolució final segons settings globals i prefers-reduced-motion
 *     (`resolveTransition`)
 *
 * Valors possibles:
 *   typewriter  - caràcter a caràcter amb caret parpellejant
 *   fade-in     - opacity + slide-up curta
 *   reveal-clip - clip-path fila a fila (taules)
 *   slide-up    - entrada vertical (mode full)
 *   none        - sense animació
 */

export const TRANSITIONS = ['typewriter', 'fade-in', 'reveal-clip', 'slide-up', 'none'];

export const DEFAULT_TRANSITION_BY_BEAT_TYPE = {
  heading: 'typewriter',
  lead: 'typewriter',
  body: 'typewriter',
  point: 'typewriter',
  rule: 'typewriter',
  example: 'typewriter',   // només DE; el CA fa fade-in un cop acabat
  pron: 'typewriter',      // només la nota; el pronom gran apareix amb fade-in
  pair: 'fade-in',
  compare: 'reveal-clip',
  pitfall: 'typewriter',
  callout: 'typewriter',
  'syn-table': 'reveal-clip',
  visual: 'fade-in',
  exercise: 'none',
};

export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/*
 * Decideix la transició efectiva d'un beat. Ordre de prioritat:
 *   1. prefers-reduced-motion → 'none'
 *   2. override explícit al beat (`beat.transition`)
 *   3. setting global (`typewriter: false` degrada 'typewriter' → 'fade-in';
 *       `tableAnim: false` degrada 'reveal-clip' → 'none')
 *   4. default per tipus
 */
export function resolveTransition(beat, settings) {
  if (prefersReducedMotion()) return 'none';

  const explicit = beat.transition;
  const def = DEFAULT_TRANSITION_BY_BEAT_TYPE[beat.type] || 'fade-in';
  let chosen = explicit || def;

  if (chosen === 'typewriter' && settings && settings.typewriter === false) {
    chosen = 'fade-in';
  }
  if (chosen === 'reveal-clip' && settings && settings.tableAnim === false) {
    chosen = 'none';
  }
  return chosen;
}

/*
 * Mapping velocitat typewriter (1-5) → ms/char.
 * 1: molt LENT, 5: molt RÀPID. Default: 3 (mig).
 * El slider es visualitza esquerra=lent → dreta=ràpid per intuïció
 * (valor numèric creixent = més ràpid).
 */
export const TYPEWRITER_SPEED_MS = {
  1: 85,
  2: 62,
  3: 42,
  4: 26,
  5: 15,
};

export function resolveTypewriterSpeed(level = 3) {
  return TYPEWRITER_SPEED_MS[level] || TYPEWRITER_SPEED_MS[3];
}
