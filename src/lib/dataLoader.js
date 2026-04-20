/*
 * dataLoader · ARCHITECTURE §7.1
 * Carrega tots els JSON de contingut al bundle via import.meta.glob i
 * construeix índexs per al consum des de hooks i components.
 *
 * L'eager load és acceptable per a l'MVP (pocs fitxers). Quan el volum
 * ho requereixi, passarem a glob lazy + React.lazy per nivell.
 */

const topicModules = import.meta.glob('../data/topics/**/*.json', {
  eager: true,
  import: 'default',
});
const exerciseModules = import.meta.glob('../data/exercises/**/*.json', {
  eager: true,
  import: 'default',
});

const topicsById = new Map();
const topicsByLevel = new Map();

for (const data of Object.values(topicModules)) {
  if (!data?.id) continue;
  topicsById.set(data.id, data);
  const levelKey = `${data.level}${data.sublevel ?? ''}`;
  if (!topicsByLevel.has(levelKey)) topicsByLevel.set(levelKey, []);
  topicsByLevel.get(levelKey).push(data);
}

for (const list of topicsByLevel.values()) {
  list.sort((a, b) => a.number - b.number);
}

const exercisesById = new Map();
for (const data of Object.values(exerciseModules)) {
  if (!data?.id) continue;
  exercisesById.set(data.id, data);
}

export function getTopic(id) {
  return topicsById.get(id) ?? null;
}

export function getAllTopics() {
  return Array.from(topicsById.values());
}

export function getTopicsByLevel(levelKey) {
  return topicsByLevel.get(levelKey) ?? [];
}

export function getAllLevelKeys() {
  return Array.from(topicsByLevel.keys()).sort();
}

export function getExercise(id) {
  return exercisesById.get(id) ?? null;
}
