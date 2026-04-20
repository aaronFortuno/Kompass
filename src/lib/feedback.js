/*
 * Selector de feedback (DATA-MODEL §8).
 * - Si la resposta és correcta, retorna feedback.correct tal qual.
 * - Si no, recorre feedback.incorrect.byResponse i retorna el primer
 *   que coincideix (match parcial sobre response); si cap coincideix,
 *   torna el default amb wrapper { message }.
 */

function matchesResponse(match, response) {
  return Object.entries(match).every(([k, v]) => {
    if (response == null) return false;
    return response[k] === v;
  });
}

export function selectFeedback(exercise, response, isCorrect) {
  if (isCorrect) return exercise.feedback.correct;
  const { byResponse = [], default: defaultMessage } = exercise.feedback.incorrect;
  for (const item of byResponse) {
    if (matchesResponse(item.match, response)) return item;
  }
  return { message: defaultMessage };
}
