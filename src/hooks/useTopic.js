import { getTopic } from '@/lib/dataLoader.js';

export function useTopic(id) {
  return getTopic(id);
}
