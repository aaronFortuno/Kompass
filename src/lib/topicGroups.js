/*
 * topicGroups · agrupaments temàtics per nivell.
 *
 * Usat per TopicsIndexPage (navegació temàtica) i ProgressPage
 * (cards de progrés per bloc). Canviar l'agrupació = editar la
 * constant; no cal tocar cap JSON.
 *
 * Cada grup té:
 *   - `range`: [start, end] inclusiu per número d'id gramatical
 *     (A1a-N / A1b-N → N).
 *   - `vocab`: (opcional) llista d'ids complets de vocabulari
 *     (A1a-V1, A1a-V2…) que s'insereixen en aquest bloc temàtic.
 *     La numeració V* és pròpia del vocabulari i va alhora que
 *     la gramatical, però manté el fil temàtic del bloc.
 */

export const TOPIC_GROUPS = {
  A1a: [
    {
      id: 'primers',
      title: 'Primeres frases',
      range: [1, 4],
      // V1 Zahlen i V4 Länder són vocabulari essencial des del dia 1.
      vocab: ['A1a-V1', 'A1a-V4'],
    },
    {
      id: 'generes',
      title: 'Gèneres, articles i possessius',
      range: [5, 9],
      // V3 Familie aplica directament els possessius d'A1a-7.
      vocab: ['A1a-V3'],
    },
    {
      id: 'fonetica',
      title: 'Fonètica, plurals i declinació',
      range: [10, 14],
      // V2 Alphabet és pedagògicament fonètic — viu al costat
      // d'A1a-10 Wortakzent i A1a-11 Intonation.
      vocab: ['A1a-V2'],
    },
    { id: 'variants', title: 'Variants verbals i expressions', range: [15, 19] },
    {
      id: 'temps',
      title: 'Temps i seqüències',
      range: [20, 24],
      // V7 Tagesablauf integra les seqüències d'A1a-23 amb verbs
      // de rutina.
      vocab: ['A1a-V7'],
    },
    {
      id: 'modals',
      title: 'Modals i casos bàsics',
      range: [25, 30],
      // V6 Essen und Trinken reforça el möchten+acusatiu d'aquest bloc.
      vocab: ['A1a-V6'],
    },
    {
      id: 'compar',
      title: 'Comparatives i vocabulari útil',
      range: [31, 36],
      // V5 Farben complementa la pregunta qualitativa Welche Farbe hat...?
      vocab: ['A1a-V5'],
    },
  ],
  A1b: [
    { id: 'preposicions', title: 'Preposicions de lloc', range: [1, 4] },
    { id: 'preferences', title: 'Preferències i emocions', range: [5, 9] },
    { id: 'imperatiu', title: 'Imperatiu i modals II', range: [10, 16] },
    { id: 'genitiu', title: 'Genitiu i Wechselpräp', range: [17, 23] },
    { id: 'passat', title: 'Temps verbals del passat', range: [24, 30] },
    { id: 'durada', title: 'Durada i dates', range: [31, 35] },
    { id: 'datiu', title: 'Declinació i Datiu', range: [36, 41] },
  ],
};

/**
 * Extreu el número de la id d'un topic (A1a-12 → 12, A1a-V3 → 3
 * amb categoria vocab). Retorna NaN si no és gramatical.
 * S'usa per ordenar i per al matching de range.
 */
export function topicNumber(topic) {
  const m = /-([\d]+)$/.exec(topic?.id || '');
  return m ? parseInt(m[1], 10) : NaN;
}

/**
 * Retorna true si el topic (de vocabulari) té un número V al seu id.
 */
export function isVocabulary(topic) {
  if (topic?.category === 'vocabulary') return true;
  return /^A\d[ab]-V\d+$/.test(topic?.id || '');
}

/**
 * Agrupa una llista de temes segons TOPIC_GROUPS del nivell indicat.
 * Intercala els temes de gramàtica (per number dins del range) amb
 * els de vocabulari (per ordre alfabètic de l'id dins de la llista
 * `group.vocab`). Retorna [{ group, topics: [...] }, ...].
 */
export function groupTopics(levelKey, topics) {
  const groups = TOPIC_GROUPS[levelKey] || [];
  const buckets = groups.map((g) => ({ group: g, topics: [] }));
  const orphans = [];

  // Mapa id → topic per trobar ràpidament els de vocabulari.
  const byId = new Map();
  for (const t of topics) byId.set(t.id, t);

  // Primera passada: assignar vocabulari als seus grups explícits.
  const assignedIds = new Set();
  groups.forEach((g, idx) => {
    if (!Array.isArray(g.vocab)) return;
    for (const vId of g.vocab) {
      const t = byId.get(vId);
      if (t) {
        buckets[idx].topics.push(t);
        assignedIds.add(vId);
      }
    }
  });

  // Segona passada: assignar gramàtica per range (ignorant ja assignats).
  for (const topic of topics) {
    if (assignedIds.has(topic.id)) continue;
    const n = topicNumber(topic);
    if (Number.isNaN(n) || /^A\d[ab]-V\d+$/.test(topic.id)) {
      // Vocabulari no assignat explícitament → orphan.
      orphans.push(topic);
      continue;
    }
    const idx = groups.findIndex(
      (g) => n >= g.range[0] && n <= g.range[1],
    );
    if (idx === -1) orphans.push(topic);
    else buckets[idx].topics.push(topic);
  }

  // Ordena dins de cada bucket: primer gramatical per number, després
  // vocabulari per V-number. Així el vocabulari queda al final del
  // bloc de forma coherent i visual.
  for (const b of buckets) {
    b.topics.sort((a, c) => {
      const aVocab = /^A\d[ab]-V(\d+)$/.exec(a.id || '');
      const cVocab = /^A\d[ab]-V(\d+)$/.exec(c.id || '');
      if (aVocab && !cVocab) return 1;
      if (!aVocab && cVocab) return -1;
      if (aVocab && cVocab) return parseInt(aVocab[1], 10) - parseInt(cVocab[1], 10);
      return (topicNumber(a) || 0) - (topicNumber(c) || 0);
    });
  }

  const out = buckets.filter((b) => b.topics.length > 0);
  if (orphans.length) {
    out.push({ group: { id: 'altres', title: 'Altres' }, topics: orphans });
  }
  return out;
}
