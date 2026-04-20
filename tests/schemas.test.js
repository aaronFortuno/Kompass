import { describe, it, expect } from 'vitest';
import { TopicSchema } from '@/lib/schemas/topic.js';
import { ContentBlockSchema } from '@/lib/schemas/contentBlock.js';

describe('TopicSchema', () => {
  const minimalValidTopic = {
    schemaVersion: 1,
    id: 'A1a-1',
    level: 'A1',
    sublevel: 'a',
    number: 1,
    title: 'Pronomen',
    shortTitle: 'Pronomen',
    description: 'Pronoms personals i possessius.',
    axes: ['pronoms-verbs'],
    content: [{ type: 'explanation', body: 'Text.' }],
    exerciseIds: [],
  };

  it('accepta un tema mínim vàlid', () => {
    expect(TopicSchema.safeParse(minimalValidTopic).success).toBe(true);
  });

  it('rebutja id amb format incorrecte', () => {
    const bad = { ...minimalValidTopic, id: 'Pronomen' };
    expect(TopicSchema.safeParse(bad).success).toBe(false);
  });

  it('rebutja schemaVersion != 1', () => {
    const bad = { ...minimalValidTopic, schemaVersion: 2 };
    expect(TopicSchema.safeParse(bad).success).toBe(false);
  });

  it('rebutja exerciseIds amb format incorrecte', () => {
    const bad = { ...minimalValidTopic, exerciseIds: ['foo-bar'] };
    expect(TopicSchema.safeParse(bad).success).toBe(false);
  });
});

describe('ContentBlockSchema', () => {
  it('accepta una table amb cel·les string', () => {
    const block = {
      type: 'table',
      rows: [
        ['Masculí', 'der'],
        ['Femení', 'die'],
      ],
    };
    expect(ContentBlockSchema.safeParse(block).success).toBe(true);
  });

  it('accepta una table amb cel·les amb rowspan i emphasis', () => {
    const block = {
      type: 'table',
      rows: [
        [{ text: 'su', rowspan: 2 }, 'nombre (de él)', '**s**ein'],
        ['nombre (de ella)', '**i**hr'],
      ],
    };
    expect(ContentBlockSchema.safeParse(block).success).toBe(true);
  });

  it('rebutja una table amb rowspan 0', () => {
    const block = {
      type: 'table',
      rows: [[{ text: 'x', rowspan: 0 }]],
    };
    expect(ContentBlockSchema.safeParse(block).success).toBe(false);
  });

  it('rebutja un tipus desconegut', () => {
    const block = { type: 'pancake', body: 'dummy' };
    expect(ContentBlockSchema.safeParse(block).success).toBe(false);
  });
});
