import { describe, it, expect } from 'vitest';
import { parseInlineRichText } from '@/lib/inlineRichText.js';

describe('parseInlineRichText', () => {
  it('retorna array buit per a input buit', () => {
    expect(parseInlineRichText('')).toEqual([]);
    expect(parseInlineRichText(null)).toEqual([]);
    expect(parseInlineRichText(undefined)).toEqual([]);
  });

  it('text pla sense tokens és un únic segment text', () => {
    expect(parseInlineRichText('Hallo Welt')).toEqual([
      { type: 'text', text: 'Hallo Welt' },
    ]);
  });

  it('detecta **bold**', () => {
    expect(parseInlineRichText('**sein**')).toEqual([
      { type: 'bold', text: 'sein' },
    ]);
  });

  it('detecta ==highlight==', () => {
    expect(parseInlineRichText('==accent==')).toEqual([
      { type: 'highlight', text: 'accent' },
    ]);
  });

  it('combina text i bold en segments ordenats', () => {
    expect(parseInlineRichText('**s**ein')).toEqual([
      { type: 'bold', text: 's' },
      { type: 'text', text: 'ein' },
    ]);
  });

  it('text, bold, text, highlight, text', () => {
    expect(parseInlineRichText('a **b** c ==d== e')).toEqual([
      { type: 'text', text: 'a ' },
      { type: 'bold', text: 'b' },
      { type: 'text', text: ' c ' },
      { type: 'highlight', text: 'd' },
      { type: 'text', text: ' e' },
    ]);
  });

  it('escapa \\* i \\=', () => {
    expect(parseInlineRichText('\\*\\*literal\\*\\*')).toEqual([
      { type: 'text', text: '**literal**' },
    ]);
    expect(parseInlineRichText('\\=\\=foo\\=\\=')).toEqual([
      { type: 'text', text: '==foo==' },
    ]);
  });

  it('escapa backslash amb \\\\', () => {
    expect(parseInlineRichText('foo\\\\bar')).toEqual([
      { type: 'text', text: 'foo\\bar' },
    ]);
  });

  it('token mal tancat es tracta com a text', () => {
    expect(parseInlineRichText('**unclosed text')).toEqual([
      { type: 'text', text: '**unclosed text' },
    ]);
  });
});
