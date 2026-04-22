import { describe, it, expect, vi } from 'vitest';
import {
  tokenizeInline,
  parseInline,
  stripRichMarkers,
} from '@/lib/reader/parseInline.js';

/*
 * Tests del parser d'inline rich text (§3.6 + §98).
 *
 * Cobreix els cinc operadors i en particular la interacció del nou
 * operador `!!...!!` amb els existents (`**`, `==`, `_`, `` ` ``).
 *
 * Nota: no munten l'entorn React ni miren el DOM renderitzat; comproven
 * la forma dels tokens i dels elements React retornats.
 */

// Mock de SpeakableText per aïllar el parser del component real (evita
// arrossegar Web Speech, hooks, import.meta.env…). La funció retornada
// és reconeixible via name i expose els props via displayName.
vi.mock('@/components/reader/SpeakableText.jsx', () => ({
  SpeakableText: function SpeakableTextMock(props) {
    return { __mock: 'SpeakableText', props };
  },
}));

describe('stripRichMarkers', () => {
  it('retorna cadena buida per a input buit o null', () => {
    expect(stripRichMarkers('')).toBe('');
    expect(stripRichMarkers(null)).toBe('');
    expect(stripRichMarkers(undefined)).toBe('');
  });

  it('elimina els delimitadors però conserva el text', () => {
    expect(stripRichMarkers('Ich **bin** hier')).toBe('Ich bin hier');
    expect(stripRichMarkers('==Hallo== Welt')).toBe('Hallo Welt');
    expect(stripRichMarkers('_wohn-_en')).toBe('wohn-en');
    expect(stripRichMarkers('`sein`')).toBe('sein');
  });

  it('elimina els delimitadors !!...!! preservant el contingut net', () => {
    expect(stripRichMarkers('!!Ich **bin** hier!!')).toBe('Ich bin hier');
    expect(stripRichMarkers('!!Hallo!!')).toBe('Hallo');
  });

  it('conserva la puntuació', () => {
    expect(stripRichMarkers('!!Hallo!!')).toBe('Hallo');
    expect(stripRichMarkers('!!Hallo!!!')).toBe('Hallo!'); // el darrer ! queda com a text
  });
});

describe('tokenizeInline amb !!...!!', () => {
  it('detecta !!Hallo!! com un sol token speakable', () => {
    expect(tokenizeInline('!!Hallo!!')).toEqual([
      { type: 'speakable', content: 'Hallo' },
    ]);
  });

  it('permet altres operadors dins del token speakable', () => {
    // El tokenizer exterior captura tot entre !! !! sense processar-ho;
    // el contingut "Ich **bin** hier" es tokenitza recursivament al
    // render, no aquí.
    expect(tokenizeInline('!!Ich **bin** hier!!')).toEqual([
      { type: 'speakable', content: 'Ich **bin** hier' },
    ]);
  });

  it('speakable envoltat de bold extern: el bold té prioritat', () => {
    // Al nivell extern del tokenizer, **!!Danke!!** és un token strong
    // que conté "!!Danke!!". La recursió al render descomposa el
    // speakable dins del strong.
    expect(tokenizeInline('**!!Danke!!**')).toEqual([
      { type: 'strong', content: '!!Danke!!' },
    ]);
  });

  it('no interfereix amb ** sol', () => {
    expect(tokenizeInline('**fett**')).toEqual([
      { type: 'strong', content: 'fett' },
    ]);
  });

  it('no interfereix amb == sol', () => {
    expect(tokenizeInline('==hervor==')).toEqual([
      { type: 'mark', content: 'hervor' },
    ]);
  });

  it('no interfereix amb _ sol', () => {
    expect(tokenizeInline('_kursiv_')).toEqual([
      { type: 'em', content: 'kursiv' },
    ]);
  });

  it('no interfereix amb ` sol', () => {
    expect(tokenizeInline('`code`')).toEqual([
      { type: 'code', content: 'code' },
    ]);
  });

  it('!!...!! mal tancat es tracta com a text', () => {
    expect(tokenizeInline('!!unclosed')).toEqual([
      { type: 'text', content: '!!unclosed' },
    ]);
  });

  it('escapament \\! literalitza el !', () => {
    expect(tokenizeInline('\\!\\!literal\\!\\!')).toEqual([
      { type: 'text', content: '!' },
      { type: 'text', content: '!' },
      { type: 'text', content: 'literal' },
      { type: 'text', content: '!' },
      { type: 'text', content: '!' },
    ]);
  });

  it('text + speakable + text', () => {
    expect(tokenizeInline('Digues !!Hallo!! a tothom')).toEqual([
      { type: 'text', content: 'Digues ' },
      { type: 'speakable', content: 'Hallo' },
      { type: 'text', content: ' a tothom' },
    ]);
  });
});

describe('parseInline amb !!...!!', () => {
  /*
   * parseInline retorna arrays de fills React. Els tokens speakable
   * s'emboliquen amb el component SpeakableText (mockejat al top del
   * fitxer). Comprovem:
   *   - el `text` prop passat a SpeakableText està net (sense markers).
   *   - el `children` passat es correspon amb el contingut tokenitzat
   *     internament (amb els fills formatats que correspon).
   */

  it('!!Hallo!! produeix UN SpeakableText amb text "Hallo"', () => {
    const out = parseInline('!!Hallo!!');
    expect(out).toHaveLength(1);
    const node = out[0];
    // React.createElement retorna { type, props, key, ... }
    expect(node.type).toBeDefined();
    // El mock retorna el component tal qual, el React element tindrà
    // type = function SpeakableTextMock.
    expect(node.type.name).toBe('SpeakableTextMock');
    expect(node.props.text).toBe('Hallo');
  });

  it('!!Ich **bin** hier!! → SpeakableText amb text net i bold intern', () => {
    const out = parseInline('!!Ich **bin** hier!!');
    expect(out).toHaveLength(1);
    const node = out[0];
    expect(node.type.name).toBe('SpeakableTextMock');
    // El `text` prop ha de ser net (sense ** markers).
    expect(node.props.text).toBe('Ich bin hier');
    // Els children han de contenir 3 segments: "Ich ", <strong>bin</strong>, " hier"
    const children = Array.isArray(node.props.children)
      ? node.props.children
      : [node.props.children];
    expect(children).toHaveLength(3);
    expect(children[0]).toBe('Ich ');
    expect(children[1].type).toBe('strong');
    expect(children[2]).toBe(' hier');
  });

  it('**!!Danke!!** → <strong> amb SpeakableText dins', () => {
    const out = parseInline('**!!Danke!!**');
    expect(out).toHaveLength(1);
    const strongNode = out[0];
    expect(strongNode.type).toBe('strong');
    const inner = Array.isArray(strongNode.props.children)
      ? strongNode.props.children
      : [strongNode.props.children];
    expect(inner).toHaveLength(1);
    expect(inner[0].type.name).toBe('SpeakableTextMock');
    expect(inner[0].props.text).toBe('Danke');
  });

  it('text pla segueix funcionant sense tocar-lo', () => {
    const out = parseInline('Hallo Welt');
    expect(out).toHaveLength(1);
    expect(out[0]).toBe('Hallo Welt');
  });

  it('els altres operadors sols continuen funcionant', () => {
    expect(parseInline('**x**')[0].type).toBe('strong');
    expect(parseInline('==x==')[0].type).toBe('mark');
    expect(parseInline('_x_')[0].type).toBe('em');
    expect(parseInline('`x`')[0].type).toBe('code');
  });
});
