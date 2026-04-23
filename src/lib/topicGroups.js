/*
 * topicGroups · agrupaments temàtics per nivell.
 *
 * Usat per TopicsIndexPage (navegació temàtica) i ProgressPage
 * (cards de progrés per bloc). Canviar l'agrupació = editar la
 * constant; no cal tocar cap JSON.
 *
 * Cada grup té un range [start, end] inclusiu per número d'id
 * (A1a-N / A1b-N → N).
 */

export const TOPIC_GROUPS = {
  A1a: [
    { id: 'primers', title: 'Primeres frases', range: [1, 4] },
    { id: 'generes', title: 'Gèneres, articles i possessius', range: [5, 9] },
    { id: 'fonetica', title: 'Fonètica, plurals i declinació', range: [10, 14] },
    { id: 'variants', title: 'Variants verbals i expressions', range: [15, 19] },
    { id: 'temps', title: 'Temps i seqüències', range: [20, 24] },
    { id: 'modals', title: 'Modals i casos bàsics', range: [25, 30] },
    { id: 'compar', title: 'Comparatives i vocabulari útil', range: [31, 36] },
    { id: 'vocab', title: 'Vocabulari temàtic', range: [37, 43] },
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
 * Extreu el número de la id d'un topic (A1a-12 → 12).
 * Retorna NaN si la id no segueix el format.
 */
export function topicNumber(topic) {
  const m = /-([\d]+)$/.exec(topic?.id || '');
  return m ? parseInt(m[1], 10) : NaN;
}

/**
 * Agrupa una llista de temes segons TOPIC_GROUPS del nivell indicat.
 * Retorna [{ group, topics: [...] }, ...]. Els temes sense grup natural
 * van a una entrada final "Altres" (defensiu; no hauria de passar amb
 * el corpus actual).
 */
export function groupTopics(levelKey, topics) {
  const groups = TOPIC_GROUPS[levelKey] || [];
  const buckets = groups.map((g) => ({ group: g, topics: [] }));
  const orphans = [];
  for (const topic of topics) {
    const n = topicNumber(topic);
    if (Number.isNaN(n)) { orphans.push(topic); continue; }
    const idx = groups.findIndex(
      (g) => n >= g.range[0] && n <= g.range[1],
    );
    if (idx === -1) orphans.push(topic);
    else buckets[idx].topics.push(topic);
  }
  const out = buckets.filter((b) => b.topics.length > 0);
  if (orphans.length) {
    out.push({ group: { id: 'altres', title: 'Altres' }, topics: orphans });
  }
  return out;
}
