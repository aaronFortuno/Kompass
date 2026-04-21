/*
 * buildBeats · DATA-MODEL §3.8
 *
 * Converteix un step en format ric (amb camp `kind`) a una llista
 * ordenada de beats. Pure function: mateix input → mateix output.
 * No llegeix settings ni DOM.
 *
 * Ordre canònic dels beats (segueix la columna "Admet en" de §3.1.1):
 *   heading → lead → body (per frases) → points → examples → tabs
 *   → pairs → rule → comparison → pitfalls → callout
 *   (synthesis: heading → tables)
 *   (exercise: un sol beat 'exercise')
 */

function splitSentences(text) {
  if (!text) return [];
  const parts = text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return [text];
  return parts;
}

export function buildBeats(step) {
  if (!step) return [];
  const beats = [];

  if (step.kind === 'exercise') {
    beats.push({
      type: 'exercise',
      exerciseId: step.exerciseId,
      variant: step.variant || 'quick-check',
    });
    return beats;
  }

  if (step.kind === 'synthesis') {
    if (step.heading) {
      beats.push({ type: 'heading', text: step.heading, kicker: step.id || 'Síntesi' });
    }
    (step.tables || []).forEach((t) => beats.push({ type: 'syn-table', table: t }));
    if (step.callout) {
      beats.push({ type: 'callout', callout: step.callout });
    }
    return beats.length ? beats : [{ type: 'heading', text: step.id || 'Síntesi', kicker: '' }];
  }

  // narrative (o sense kind → tractat com a narrative)
  if (step.heading) {
    beats.push({ type: 'heading', text: step.heading, kicker: step.id });
  }
  if (step.lead) {
    beats.push({ type: 'lead', text: step.lead });
  }
  if (step.body) {
    splitSentences(step.body).forEach((sentence) => {
      beats.push({ type: 'body', text: sentence });
    });
  }
  if (Array.isArray(step.points) && step.points.length) {
    step.points.forEach((p, i) => {
      beats.push({ type: 'point', text: p, idx: i + 1, total: step.points.length });
    });
  }
  if (Array.isArray(step.examples) && step.examples.length) {
    step.examples.forEach((e, i) => {
      beats.push({ type: 'example', ex: e, idx: i + 1, total: step.examples.length });
    });
  }
  if (Array.isArray(step.tabs) && step.tabs.length) {
    step.tabs.forEach((tab) => beats.push({ type: 'pron', tab }));
  }
  if (Array.isArray(step.pairs) && step.pairs.length) {
    step.pairs.forEach((p, i) => {
      beats.push({ type: 'pair', pair: p, idx: i + 1, total: step.pairs.length });
    });
  }
  if (Array.isArray(step.rule) && step.rule.length) {
    step.rule.forEach((r, i) => {
      beats.push({ type: 'rule', text: r, idx: i + 1, total: step.rule.length });
    });
  }
  if (step.comparison && Array.isArray(step.comparison) && step.comparison.length) {
    beats.push({ type: 'compare', rows: step.comparison });
  }
  if (Array.isArray(step.pitfalls) && step.pitfalls.length) {
    step.pitfalls.forEach((p, i) => {
      beats.push({ type: 'pitfall', pit: p, idx: i + 1, total: step.pitfalls.length });
    });
  }
  if (step.callout) {
    beats.push({ type: 'callout', callout: step.callout });
  }

  if (beats.length === 0) {
    beats.push({ type: 'heading', text: step.id || '(sense contingut)', kicker: '' });
  }
  return beats;
}

/*
 * Tipus canònic del step per al sistema de progrés.
 * Retorna un de: 'narrative' | 'synthesis' | 'exercise' | 'assessment'.
 * Per a steps en format llegat (sense `kind`) s'infereix (vegeu
 * legacyBlocksToBeats per als criteris).
 */
export function stepKind(step) {
  if (!step) return 'narrative';
  if (step.kind === 'exercise') {
    return step.variant === 'assessment' ? 'assessment' : 'exercise';
  }
  if (step.kind) return step.kind;
  return inferredLegacyKind(step);
}

function inferredLegacyKind(step) {
  if (!step.blocks) return 'narrative';
  const types = step.blocks.map((b) => b.type);
  if (types.length === 1 && types[0] === 'exercise') {
    const ex = step.blocks[0];
    return ex.variant === 'assessment' ? 'assessment' : 'exercise';
  }
  if (types.every((t) => t === 'table' || t === 'explanation')) {
    const hasTables = types.includes('table');
    const explanationShort = step.blocks
      .filter((b) => b.type === 'explanation')
      .every((b) => (b.body || '').length < 200);
    if (hasTables && explanationShort && step.id === 'synthesis') return 'synthesis';
  }
  return 'narrative';
}

/*
 * Conveniència: detecta si un step és en format ric (té `kind`).
 * Els adapters la usen per dispatchar entre buildBeats / legacyBlocksToBeats.
 */
export function isRichStep(step) {
  return step && typeof step.kind === 'string';
}
