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
    steps: [
      {
        id: 'intro',
        blocks: [{ type: 'explanation', body: 'Text.' }],
      },
    ],
  };

  it('accepta un tema mínim vàlid amb steps', () => {
    expect(TopicSchema.safeParse(minimalValidTopic).success).toBe(true);
  });

  it('accepta un tema amb múltiples steps i exercicis intercalats', () => {
    const topic = {
      ...minimalValidTopic,
      steps: [
        { id: 'intro', blocks: [{ type: 'explanation', body: '…' }] },
        {
          id: 'check-1',
          blocks: [
            { type: 'exercise', exerciseId: 'A1a-1-ex-01', variant: 'quick-check' },
          ],
        },
        { id: 'synthesis', blocks: [{ type: 'table', rows: [['a', 'b']] }] },
      ],
    };
    expect(TopicSchema.safeParse(topic).success).toBe(true);
  });

  it('rebutja un tema sense steps', () => {
    const bad = { ...minimalValidTopic, steps: [] };
    expect(TopicSchema.safeParse(bad).success).toBe(false);
  });

  it('rebutja id de step amb format incorrecte', () => {
    const bad = {
      ...minimalValidTopic,
      steps: [{ id: 'Intro Step', blocks: [{ type: 'explanation', body: 'x' }] }],
    };
    expect(TopicSchema.safeParse(bad).success).toBe(false);
  });

  it('rebutja step ids duplicats', () => {
    const bad = {
      ...minimalValidTopic,
      steps: [
        { id: 'a', blocks: [{ type: 'explanation', body: 'x' }] },
        { id: 'a', blocks: [{ type: 'explanation', body: 'y' }] },
      ],
    };
    expect(TopicSchema.safeParse(bad).success).toBe(false);
  });

  it('rebutja id de tema amb format incorrecte', () => {
    const bad = { ...minimalValidTopic, id: 'Pronomen' };
    expect(TopicSchema.safeParse(bad).success).toBe(false);
  });

  it('rebutja schemaVersion != 1', () => {
    const bad = { ...minimalValidTopic, schemaVersion: 2 };
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

  it('accepta headers amb cel·les riques (colspan)', () => {
    const block = {
      type: 'table',
      headers: [
        { text: 'Spanisch', colspan: 2 },
        'Englisch',
      ],
      rows: [['su', 'nombre', 'his']],
    };
    expect(ContentBlockSchema.safeParse(block).success).toBe(true);
  });

  it('accepta un bloc exercise amb exerciseId vàlid', () => {
    const block = { type: 'exercise', exerciseId: 'A1a-1-ex-02' };
    expect(ContentBlockSchema.safeParse(block).success).toBe(true);
  });

  it('rebutja un bloc exercise amb exerciseId malformat', () => {
    const block = { type: 'exercise', exerciseId: 'ex-01' };
    expect(ContentBlockSchema.safeParse(block).success).toBe(false);
  });

  it('accepta un bloc exercise amb variant assessment', () => {
    const block = {
      type: 'exercise',
      exerciseId: 'A1b-19-ex-03',
      variant: 'assessment',
    };
    expect(ContentBlockSchema.safeParse(block).success).toBe(true);
  });

  it('accepta un bloc callout amb variant vàlida', () => {
    const block = {
      type: 'callout',
      variant: 'tip',
      title: 'Truc',
      body: 'Recorda que _der Name_ és masculí.',
    };
    expect(ContentBlockSchema.safeParse(block).success).toBe(true);
  });

  it('rebutja un bloc callout amb variant desconeguda', () => {
    const block = {
      type: 'callout',
      variant: 'bananas',
      body: 'x',
    };
    expect(ContentBlockSchema.safeParse(block).success).toBe(false);
  });
});
