# DATA-MODEL.md · Kompass

> Especificació del model de dades de **Kompass**, una web per a l'autoaprenentatge d'alemany A1.
> Aquest document és la font de veritat per a l'estructura de continguts, exercicis, progrés d'usuari i rutes d'aprenentatge.
> Qualsevol desviació en codi s'ha de reflectir aquí primer.

---

## 1. Principis de disseny

**1.1. Separació contingut / interacció / validació.** Cada exercici és la combinació de tres eixos independents (què es mostra, com respon l'usuari, com es valida). Això permet afegir tipus nous d'exercici combinant peces existents sense refactoritzar les antigues.

**1.2. Contingut com a dades, no com a codi.** Tots els temes i exercicis són JSON. Els components React són purs i es renderitzen a partir de les dades. Afegir un tema no requereix tocar React.

**1.3. Identificadors estables i auto-descriptius.** `A1a-14`, `A1b-19-ex-03`. No es reutilitzen mai. Si un tema canvia radicalment, es deprecia i se'n crea un de nou.

**1.4. Escalabilitat a A2 i superior.** El model de dades suporta qualsevol nivell/subnivell sense canvis. Afegir A2a consisteix en afegir fitxers de contingut nous, no modificar el schema.

**1.5. Progrés transportable.** L'estat de l'usuari viu a localStorage i és exportable/importable com a JSON. Cap dependència de backend per a funcionalitat bàsica.

**1.6. Feedback pedagògic de primera classe.** Cada exercici porta explicacions diagnòstiques per a respostes incorrectes previsibles. El feedback és part del model de dades, no un afegit.

---

## 2. Schema versioning

Tot fitxer JSON exportable porta el camp `schemaVersion: <enter>` a l'arrel. La versió actual és `1`.

```json
{
  "schemaVersion": 1,
  "…": "…"
}
```

Quan el schema evolucioni, cal mantenir una funció de migració `migrate(data, fromVersion, toVersion)` que permeti importar exports antics. Aquesta funció viu a `src/lib/migrations/` i té tests propis.

**Regla de migració:** mai s'elimina un camp antic en la mateixa versió en què se n'introdueix un de nou. Sempre hi ha almenys una versió intermèdia on coexisteixen.

---

## 3. Entitats principals

### 3.1. `Topic`

Un tema del curs. Correspon a una unitat de la taula de continguts.

```json
{
  "id": "A1b-19",
  "level": "A1",
  "sublevel": "b",
  "number": 19,
  "title": "Die lokalen Präpositionen: Wechselpräpositionen",
  "shortTitle": "Wechselpräpositionen",
  "description": "Les nou preposicions que canvien de cas segons Wo? o Wohin?",
  "axes": ["preposicions", "casos"],
  "prerequisites": ["A1a-28", "A1a-34", "A1b-18"],
  "estimatedMinutes": 25,
  "content": [
    { "type": "explanation", "…": "…" },
    { "type": "table", "…": "…" },
    { "type": "lerntipp", "…": "…" }
  ],
  "exerciseIds": [
    "A1b-19-ex-01",
    "A1b-19-ex-02",
    "A1b-19-ex-03"
  ]
}
```

**Camps:**

- `id` *(string, únic)*: identificador canònic. Format `{level}{sublevel}-{number}`.
- `level` *(string)*: `"A1"`, `"A2"`, `"B1"`…
- `sublevel` *(string)*: `"a"`, `"b"`. Opcional si el nivell no se subdivideix.
- `number` *(integer)*: número d'ordre dins el sublevel.
- `title` *(string)*: títol oficial del tema, tal com apareix a la taula de continguts.
- `shortTitle` *(string)*: versió curta per a navegació i breadcrumbs.
- `description` *(string)*: resum d'una frase per a vista d'índex i tooltips.
- `axes` *(string[])*: eixos temàtics transversals als quals pertany (per a la vista "per eix"). Vegeu §4.
- `prerequisites` *(string[])*: ids de temes que convé haver vist abans. No bloqueja l'accés, només es mostra com a suggeriment.
- `estimatedMinutes` *(integer)*: temps estimat per completar el tema. Usat per mostrar a l'UI i calcular progrés de rutes.
- `content` *(ContentBlock[])*: contingut conceptual del tema. Vegeu §3.2.
- `exerciseIds` *(string[])*: ids dels exercicis associats, en ordre de presentació suggerit.

### 3.2. `ContentBlock`

Un bloc de contingut conceptual dins d'un tema. És la unitat mínima del material explicatiu. Cada tema pot tenir N blocs de tipus diferents.

**Tipus de bloc:**

```json
{ "type": "explanation", "title": "…", "body": "markdown string" }
```

Text explicatiu principal en Markdown. Pot incloure imatges, taules senzilles i èmfasis.

```json
{
  "type": "table",
  "title": "Articles en datiu",
  "headers": ["Gènere", "Article"],
  "rows": [
    ["Masculí", "dem"],
    ["Femení", "der"],
    ["Neutre", "dem"],
    ["Plural", "den (+n)"]
  ],
  "caption": "…"
}
```

Taula estructurada amb cel·les riques.

**Forma de cada cel·la:**

- `string` — text pla (pot contenir *inline rich text*, vegeu §3.6).
- `object { text, rowspan?, colspan?, emphasis?, align? }` — cel·la amb atributs.
  - `text` *(string)*: contingut. Admet inline rich text.
  - `rowspan` *(integer ≥ 1)*: nombre de files que cobreix la cel·la. Les files següents ometen la cel·la coberta (semàntica HTML).
  - `colspan` *(integer ≥ 1)*: nombre de columnes que cobreix.
  - `emphasis` *(string)*: marca semàntica per al renderer. Valors previstos: `"header"`, `"accent"`, `"muted"`. Permet estilar una cel·la sense canviar el text.
  - `align` *(string)*: `"left" | "center" | "right"`. Per defecte `"left"`.
- `null` — *no* és vàlid. Les cel·les "tapades" per un rowspan/colspan previ simplement s'ometen de la fila corresponent (és a dir, una fila pot tenir menys elements que columnes té la taula).

**Exemple amb cel·les fusionades (taula comparativa ES/CA/DE/EN):**

```json
{
  "type": "table",
  "title": "Vergleichen Sie",
  "headers": ["Spanisch", "", "Katalanisch", "", "Deutsch", "", "Englisch"],
  "rows": [
    [
      { "text": "su", "rowspan": 4 },
      "nombre (de él)",
      { "text": "el seu", "rowspan": 2 },
      "nom (d'ell)",
      "**s**ein",
      "Name",
      "his"
    ],
    [
      "nombre (de ella)",
      "nom (d'ella)",
      "**i**hr",
      "Name",
      "her"
    ],
    [
      "dirección (de él)",
      { "text": "la seva", "rowspan": 2 },
      "adreça (d'ell)",
      "**s**eine",
      "Adresse",
      "his"
    ],
    [
      "dirección (de ella)",
      "adreça (d'ella)",
      "**i**hre",
      "Adresse",
      "her"
    ]
  ]
}
```

Les files 2-4 tenen menys cel·les que columnes: les posicions "tapades" per `rowspan` de files prèvies s'ometen. El renderer les reconstrueix a l'hora de generar l'HTML.

```json
{
  "type": "lerntipp",
  "title": "El mètode de les tres preguntes",
  "body": "markdown",
  "icon": "lightbulb"
}
```

Ajuda visual, truc mnemotècnic o diagrama de decisió. Renderitzat amb estil diferenciat.

```json
{
  "type": "example",
  "items": [
    { "de": "Ich sitze am Tisch.", "ca": "Sóc assegut a la taula.", "annotation": "Wo? → datiu" },
    { "de": "Ich gehe an den Tisch.", "ca": "Vaig a la taula.", "annotation": "Wohin? → acusatiu" }
  ]
}
```

Conjunt d'exemples bilingües amb anotacions gramaticals opcionals.

```json
{
  "type": "audio",
  "title": "Pronunciació",
  "src": "/audio/a1a-10-wortakzent-01.mp3",
  "transcript": "Guten Morgen, wie geht es Ihnen?"
}
```

Àudio amb transcripció i controls de velocitat.

```json
{
  "type": "video",
  "title": "Explicació visual",
  "src": "https://www.youtube.com/embed/…",
  "durationSeconds": 180
}
```

Vídeo incrustat (YouTube, Vimeo) o local.

### 3.3. `Exercise`

Un exercici. Modelat com a combinació de tres eixos: estímul, interacció, validació.

```json
{
  "id": "A1b-19-ex-01",
  "topicId": "A1b-19",
  "title": "Preposicions amb verbs de permanència",
  "prompt": "Tria l'opció correcta per a cada buit.",
  "difficulty": 2,
  "tags": ["wechselpraepositionen", "dativ", "wo"],
  "stimulus": { "…": "…" },
  "interaction": { "…": "…" },
  "validation": { "…": "…" },
  "feedback": { "…": "…" },
  "hint": "Pregunta't: 'sitzen' indica moviment o permanència?",
  "relatedTopicIds": ["A1b-19", "A1b-21"]
}
```

**Camps:**

- `id` *(string, únic)*: format `{topicId}-ex-{number}`.
- `topicId` *(string)*: tema al qual pertany.
- `title` *(string)*: títol curt per a llistats.
- `prompt` *(string)*: instrucció visible per a l'usuari.
- `difficulty` *(integer 1-3)*: dificultat relativa dins el tema. Usat per ordenar i filtrar.
- `tags` *(string[])*: etiquetes per a filtratge i recomanació.
- `stimulus` *(Stimulus)*: què es mostra. Vegeu §5.
- `interaction` *(Interaction)*: com respon l'usuari. Vegeu §6.
- `validation` *(Validation)*: com es comprova. Vegeu §7.
- `feedback` *(Feedback)*: explicacions per a encerts i errors. Vegeu §8.
- `hint` *(string, opcional)*: pista breu si l'usuari la demana.
- `relatedTopicIds` *(string[])*: temes on l'usuari pot anar a repassar si falla.

### 3.4. `LearningPath`

Una seqüència ordenada de temes. Suporta múltiples rutes i el mode lliure (absència de ruta activa).

```json
{
  "id": "a1-complete-sequential",
  "title": "A1 complet en ordre",
  "description": "Els 77 temes d'A1a i A1b en l'ordre oficial del curs.",
  "level": "A1",
  "estimatedHours": 40,
  "steps": [
    { "topicId": "A1a-1", "required": true },
    { "topicId": "A1a-2", "required": true },
    "…",
    { "topicId": "A1b-41", "required": true }
  ]
}
```

**Camps:**

- `id` *(string, únic)*
- `title`, `description`, `level`, `estimatedHours`: metadades per a l'UI.
- `steps` *(PathStep[])*: array ordenat d'objectes `{ topicId, required }`. El camp `required` permet tenir passes opcionals dins d'una ruta (útil per a ampliacions).

**Rutes previstes inicialment:**

- `a1-complete-sequential` — els 77 temes en ordre.
- `a1a-only` — només A1a (36 temes).
- `a1b-only` — només A1b (41 temes).
- `preposicions-casos` — només els temes dels eixos preposicions i casos, en ordre de complexitat creixent (ruta temàtica).

Afegir noves rutes és afegir fitxers JSON. No requereix canvis de codi.

### 3.5. `UserProgress`

Estat de l'usuari. Viu a localStorage sota la clau `kompass.progress.v1`.

```json
{
  "schemaVersion": 1,
  "createdAt": "2026-04-20T10:00:00Z",
  "lastUpdated": "2026-04-20T12:45:32Z",
  "activePathId": "a1-complete-sequential",
  "pathPositions": {
    "a1-complete-sequential": { "currentStepIndex": 14 }
  },
  "topics": {
    "A1a-1": {
      "status": "completed",
      "firstVisitedAt": "2026-04-18T09:00:00Z",
      "completedAt": "2026-04-18T09:25:00Z",
      "exercisesCompleted": ["A1a-1-ex-01", "A1a-1-ex-02", "A1a-1-ex-03"]
    },
    "A1b-19": {
      "status": "in-progress",
      "firstVisitedAt": "2026-04-20T12:00:00Z",
      "exercisesCompleted": ["A1b-19-ex-01"]
    }
  },
  "exercises": {
    "A1b-19-ex-01": {
      "attempts": [
        {
          "at": "2026-04-20T12:15:00Z",
          "response": { "…": "…" },
          "correct": false,
          "timeSpentSeconds": 23
        },
        {
          "at": "2026-04-20T12:17:00Z",
          "response": { "…": "…" },
          "correct": true,
          "timeSpentSeconds": 8
        }
      ],
      "firstCorrectAt": "2026-04-20T12:17:00Z",
      "attemptCount": 2
    }
  }
}
```

**Estats de tema:** `"not-started"` (no aparèixer al JSON equivalent), `"in-progress"`, `"completed"`.

**Criteri d'exercici completat:** primera vegada que `correct === true`. Els intents posteriors es guarden però no canvien l'estat.

**Criteri de tema completat:** tots els `exerciseIds` del tema apareixen a `exercisesCompleted`.

### 3.6. `InlineRichText`

Qualsevol camp de text de contingut teòric (cel·les de taula, cos d'explicacions, text d'exemples, feedback d'exercicis) admet un subconjunt mínim d'inline rich text. El parser és intern al projecte, no depenem d'una llibreria Markdown per a això.

**Sintaxi admesa:**

- `**text**` → `<strong>` — èmfasi fort, general. Negreta.
- `==text==` → destacat cromàtic amb color `accent`. Ús: marcar patrons, arrels, lletres clau. És la sintaxi per a l'èmfasi pedagògic que el PDF font sovint representa en color.

**No admès a l'MVP:** cursiva, subratllat, codi inline, enllaços, imatges. Si calen, es consideren via blocs dedicats (`example`, `explanation` amb Markdown complet més endavant) o extensió explícita d'aquest schema.

**Escapament:** per literalitzar `**` o `==`, precedir amb `\` (`\*\*`, `\=\=`). Un `\` literal s'escriu `\\`.

**Regles d'aplicació:**

1. Aquesta sintaxi **només** és vàlida dins de camps marcats com a "admet inline rich text". La resta de camps (ids, tipus, urls…) són text pla.
2. El renderer aplica la transformació al client; el JSON guarda la notació en cru.
3. Aplicable en: cel·les de `table`, `text` d'examples, `message` de `feedback`, `body` d'`explanation` (on ja conviu amb Markdown complet — la subsintaxi és compatible).

### 3.7. `ExportFile`

Format del fitxer d'exportació/importació que l'usuari pot descarregar.

```json
{
  "schemaVersion": 1,
  "type": "userProgressExport",
  "exportedAt": "2026-04-20T13:00:00Z",
  "appVersion": "0.3.1",
  "progress": { "…": "objecte UserProgress complet" }
}
```

Import: valida `schemaVersion`, aplica migracions si cal, substitueix el `UserProgress` actual (amb confirmació prèvia de l'usuari si ja hi ha progrés guardat).

---

## 4. Eixos temàtics

Els eixos permeten una vista transversal del temari. Un tema pot pertànyer a més d'un eix.

| Eix                           | Descripció                                                                               |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| `pronoms-verbs`               | Conjugació, pronoms personals, verbs irregulars, modals, separables.                     |
| `generes-articles-declinacio` | Gèneres, articles definits/indefinits, possessius, declinacions.                         |
| `preposicions`                | Preposicions locals, Wechselpräpositionen, preposicions fixes.                           |
| `casos`                       | Nominatiu, acusatiu, datiu, genitiu (contingut transversal a preposicions i declinació). |
| `sintaxi-ordre-paraules`      | Estructura de la frase, Satzklammer, inversió, verbs separables.                         |
| `temps-verbals`               | Present, Perfekt, Präteritum, futur.                                                     |
| `vocabulari-tematic`          | Temps, números, direccions, família, etc.                                                |
| `fonetica`                    | Pronunciació, accent, entonació.                                                         |
| `expressions-i-funcions`      | Gustos, preferències, ordres, recomanacions.                                             |

La llista és ampliable. Un eix és només una etiqueta; la llista canònica viu a `src/data/axes.json`.

---

## 5. Catàleg de tipus d'estímul (`Stimulus`)

### 5.1. `text`

```json
{ "type": "text", "content": "Wie heißt die Hauptstadt von Deutschland?" }
```

### 5.2. `textWithBlanks`

Text amb marques de posició on l'usuari ha d'omplir alguna cosa.

```json
{
  "type": "textWithBlanks",
  "template": "Ich sitze {{1}} Tisch und {{2}} ein Buch.",
  "blanks": [
    { "id": "1", "label": "preposició + article" },
    { "id": "2", "label": "verb conjugat" }
  ]
}
```

### 5.3. `textWithHighlights`

Text amb paraules marcades que es poden referenciar des de les preguntes.

```json
{
  "type": "textWithHighlights",
  "content": "Der Mann geht in das Kino mit seiner Freundin.",
  "highlights": [
    { "id": "h1", "text": "Der Mann", "position": [0, 8] },
    { "id": "h2", "text": "in das Kino", "position": [14, 25] },
    { "id": "h3", "text": "seiner Freundin", "position": [31, 46] }
  ]
}
```

### 5.4. `image`

```json
{
  "type": "image",
  "src": "/images/a1a-6-schloss.jpg",
  "alt": "Ein Schloss",
  "caption": "Neuschwanstein"
}
```

### 5.5. `audio`

```json
{
  "type": "audio",
  "src": "/audio/a1b-18-dialog-01.mp3",
  "durationSeconds": 42,
  "transcript": "…"
}
```

### 5.6. `video`

```json
{
  "type": "video",
  "src": "https://www.youtube.com/embed/…",
  "startSeconds": 0,
  "endSeconds": 90
}
```

### 5.7. `cardSet`

Conjunt de fitxes per a exercicis d'emparellar.

```json
{
  "type": "cardSet",
  "cards": [
    { "id": "c1", "group": "A", "content": { "type": "image", "src": "/img/hund.jpg" } },
    { "id": "c2", "group": "A", "content": { "type": "text", "content": "der Hund" } },
    { "id": "c3", "group": "B", "content": { "type": "image", "src": "/img/katze.jpg" } },
    { "id": "c4", "group": "B", "content": { "type": "text", "content": "die Katze" } }
  ]
}
```

### 5.8. `compound`

Combinació de més d'un estímul (per exemple, text + imatge).

```json
{
  "type": "compound",
  "parts": [
    { "type": "image", "src": "/images/…" },
    { "type": "text", "content": "Llegeix la descripció i tria l'opció correcta." }
  ]
}
```

---

## 6. Catàleg de tipus d'interacció (`Interaction`)

### 6.1. `singleChoice`

```json
{
  "type": "singleChoice",
  "options": [
    { "id": "a", "label": "dem" },
    { "id": "b", "label": "der" },
    { "id": "c", "label": "den" }
  ]
}
```

### 6.2. `multiChoice`

```json
{
  "type": "multiChoice",
  "options": [
    { "id": "a", "label": "aus" },
    { "id": "b", "label": "mit" },
    { "id": "c", "label": "für" },
    { "id": "d", "label": "zu" }
  ],
  "minSelections": 1,
  "maxSelections": null
}
```

### 6.3. `trueFalse`

```json
{
  "type": "trueFalse",
  "statements": [
    { "id": "s1", "text": "Der Mann fährt nach Berlin." },
    { "id": "s2", "text": "Die Frau geht zum Supermarkt." }
  ]
}
```

### 6.4. `dropdownFill`

Cada buit del `textWithBlanks` té opcions entre les quals triar.

```json
{
  "type": "dropdownFill",
  "slots": [
    { "blankId": "1", "options": ["am", "an den", "auf dem"] },
    { "blankId": "2", "options": ["lesen", "lese", "liest"] }
  ]
}
```

### 6.5. `typeIn`

L'usuari escriu text lliure en un o més camps.

```json
{
  "type": "typeIn",
  "slots": [
    { "blankId": "1", "placeholder": "article + substantiu" }
  ],
  "caseSensitive": false,
  "trimWhitespace": true
}
```

### 6.6. `dragToSlot`

Banc de paraules i buits on arrossegar-les.

```json
{
  "type": "dragToSlot",
  "bank": [
    { "id": "w1", "label": "dem" },
    { "id": "w2", "label": "der" },
    { "id": "w3", "label": "das" },
    { "id": "w4", "label": "den" }
  ],
  "slots": [
    { "blankId": "1" },
    { "blankId": "2" },
    { "blankId": "3" }
  ],
  "allowReuse": false,
  "extraDistractors": 1
}
```

### 6.7. `matchPairs`

Emparellar elements de dos grups.

```json
{
  "type": "matchPairs",
  "groupALabel": "Imatges",
  "groupBLabel": "Paraules"
}
```

(Els elements es defineixen al `cardSet` de l'estímul.)

---

## 7. Catàleg de tipus de validació (`Validation`)

### 7.1. `exactMatch`

```json
{ "type": "exactMatch", "answer": "b" }
```

### 7.2. `setMatch`

Un conjunt d'ids correctes, l'usuari ha d'encertar-los tots (ordre irrellevant).

```json
{ "type": "setMatch", "answers": ["a", "d"] }
```

### 7.3. `slotMap`

Cada buit té la seva resposta.

```json
{
  "type": "slotMap",
  "answers": {
    "1": "am",
    "2": "lese"
  }
}
```

### 7.4. `slotMapMultiple`

Cada buit admet més d'una resposta correcta.

```json
{
  "type": "slotMapMultiple",
  "answers": {
    "1": ["am", "an dem"],
    "2": ["lese"]
  }
}
```

### 7.5. `pairMap`

Mapping correcte de parelles per a `matchPairs`.

```json
{
  "type": "pairMap",
  "pairs": [
    ["c1", "c2"],
    ["c3", "c4"]
  ]
}
```

### 7.6. `truthMap`

Per a `trueFalse`.

```json
{
  "type": "truthMap",
  "answers": {
    "s1": true,
    "s2": false
  }
}
```

### 7.7. `llmEvaluation` *(opcional, futur)*

Fallback per a respostes obertes no cobertes pel feedback predefinit. **No implementat a l'MVP.**

```json
{
  "type": "llmEvaluation",
  "rubric": "L'estudiant ha d'aplicar la regla de Wechselpräposition amb datiu correctament. Avalua només això, no altres errors.",
  "fallbackToExact": true
}
```

---

## 8. Feedback

Cada exercici porta un objecte `feedback` amb explicacions per al resultat correcte i per a errors previsibles.

```json
{
  "feedback": {
    "correct": {
      "message": "Correcte! 'sitzen' indica permanència (Wo?) → datiu. 'an dem' = 'am'.",
      "references": ["A1b-19", "A1b-21"]
    },
    "incorrect": {
      "default": "No és correcte. Pregunta't si el verb indica moviment o permanència.",
      "byResponse": [
        {
          "match": { "1": "an den" },
          "message": "Has triat acusatiu (an + den). 'sitzen' indica permanència, no moviment. Datiu seria 'am'.",
          "references": ["A1b-21"]
        },
        {
          "match": { "1": "auf dem" },
          "message": "'auf' i 'an' són preposicions diferents. 'an' = tocant, 'auf' = sobre (damunt).",
          "references": ["A1b-19"]
        }
      ]
    }
  }
}
```

**Regles de feedback:**

1. Sempre hi ha un `default` per a errors no anticipats.
2. Els items de `byResponse` es comproven en ordre; es mostra el primer que coincideix.
3. `match` és un objecte parcial que s'ha de complir completament per a activar-se.
4. `references` són ids de temes; l'UI mostra enllaços per anar a repassar.

---

## 9. Exemples complets per tipus d'exercici

### 9.1. Imatge + tria única d'un llistat

*(Tipus 1 de la llista de referència: "das Schloss / der Hafen…")*

```json
{
  "id": "A1a-5-ex-01",
  "topicId": "A1a-5",
  "title": "Gèneres amb imatges",
  "prompt": "Quin és l'article correcte?",
  "difficulty": 1,
  "tags": ["genere", "article-definit"],
  "stimulus": {
    "type": "image",
    "src": "/images/a1a-5-schloss.jpg",
    "alt": "Un castell",
    "caption": "Schloss"
  },
  "interaction": {
    "type": "singleChoice",
    "options": [
      { "id": "der", "label": "der Schloss" },
      { "id": "die", "label": "die Schloss" },
      { "id": "das", "label": "das Schloss" }
    ]
  },
  "validation": { "type": "exactMatch", "answer": "das" },
  "feedback": {
    "correct": { "message": "Correcte! Schloss és neutre: das Schloss." },
    "incorrect": {
      "default": "No és correcte. Schloss és neutre (das Schloss). Molts substantius acabats en -schloss/-s són neutres."
    }
  }
}
```

### 9.2. Frase amb dropdowns per buit

*(Tipus 2)*

```json
{
  "id": "A1b-19-ex-02",
  "topicId": "A1b-19",
  "title": "Wo? o Wohin?",
  "prompt": "Completa la frase triant l'opció correcta.",
  "difficulty": 2,
  "stimulus": {
    "type": "textWithBlanks",
    "template": "Ich lege das Buch {{1}} Tisch und dann sitze ich {{2}} Sofa.",
    "blanks": [
      { "id": "1", "label": "preposició + article" },
      { "id": "2", "label": "preposició + article" }
    ]
  },
  "interaction": {
    "type": "dropdownFill",
    "slots": [
      { "blankId": "1", "options": ["auf den", "auf dem"] },
      { "blankId": "2", "options": ["auf das", "auf dem"] }
    ]
  },
  "validation": {
    "type": "slotMap",
    "answers": { "1": "auf den", "2": "auf dem" }
  },
  "feedback": {
    "correct": { "message": "Perfecte! 'legen' = moviment (Wohin? → acusatiu). 'sitzen' = permanència (Wo? → datiu)." },
    "incorrect": {
      "default": "Fixa't en el verb: indica moviment o permanència?",
      "byResponse": [
        {
          "match": { "1": "auf dem" },
          "message": "'legen' significa 'deixar/col·locar', és un moviment. Necessites acusatiu: 'auf den Tisch'.",
          "references": ["A1b-21"]
        },
        {
          "match": { "2": "auf das" },
          "message": "'sitzen' és permanència, no moviment. Necessites datiu: 'auf dem Sofa'.",
          "references": ["A1b-21"]
        }
      ]
    }
  }
}
```

### 9.3. Àudio + richtig/falsch

*(Tipus 3)*

```json
{
  "id": "A1a-22-ex-01",
  "topicId": "A1a-22",
  "title": "L'hora",
  "prompt": "Escolta i indica si les afirmacions són certes o falses.",
  "stimulus": {
    "type": "audio",
    "src": "/audio/a1a-22-uhrzeit-01.mp3",
    "durationSeconds": 18,
    "transcript": "Es ist Viertel vor acht. Wir frühstücken um halb neun."
  },
  "interaction": {
    "type": "trueFalse",
    "statements": [
      { "id": "s1", "text": "Són les 7:45." },
      { "id": "s2", "text": "Esmorzem a les 8:00." },
      { "id": "s3", "text": "Esmorzem a les 8:30." }
    ]
  },
  "validation": {
    "type": "truthMap",
    "answers": { "s1": true, "s2": false, "s3": true }
  },
  "feedback": {
    "correct": { "message": "Molt bé!" },
    "incorrect": {
      "default": "Repassa les expressions 'Viertel vor' i 'halb' al tema 22. Viertel vor acht = 7:45, halb neun = 8:30 (no 9:30!)."
    }
  }
}
```

### 9.4. Text amb paraules ressaltades + preguntes

*(Tipus 5)*

```json
{
  "id": "A1b-20-ex-03",
  "topicId": "A1b-20",
  "title": "Identifica el cas",
  "prompt": "Per a cada expressió ressaltada, indica en quin cas està.",
  "stimulus": {
    "type": "textWithHighlights",
    "content": "Der Mann geht mit seinem Hund durch den Park und kauft dann ein Eis für seine Tochter.",
    "highlights": [
      { "id": "h1", "text": "Der Mann" },
      { "id": "h2", "text": "mit seinem Hund" },
      { "id": "h3", "text": "durch den Park" },
      { "id": "h4", "text": "für seine Tochter" }
    ]
  },
  "interaction": {
    "type": "dropdownFill",
    "slots": [
      { "blankId": "h1", "options": ["Nominatiu", "Acusatiu", "Datiu"] },
      { "blankId": "h2", "options": ["Nominatiu", "Acusatiu", "Datiu"] },
      { "blankId": "h3", "options": ["Nominatiu", "Acusatiu", "Datiu"] },
      { "blankId": "h4", "options": ["Nominatiu", "Acusatiu", "Datiu"] }
    ]
  },
  "validation": {
    "type": "slotMap",
    "answers": {
      "h1": "Nominatiu",
      "h2": "Datiu",
      "h3": "Acusatiu",
      "h4": "Acusatiu"
    }
  },
  "feedback": {
    "correct": { "message": "Perfecte! 'mit' sempre datiu, 'durch' i 'für' sempre acusatiu, i el subjecte sempre nominatiu." },
    "incorrect": {
      "default": "Recorda: el subjecte és nominatiu. Les preposicions de cas fix determinen el cas de la resta.",
      "byResponse": [
        {
          "match": { "h2": "Acusatiu" },
          "message": "'mit' sempre porta datiu. No és Wechselpräposition.",
          "references": ["A1b-20"]
        }
      ]
    }
  }
}
```

### 9.5. Memory d'emparellar imatges amb paraules

*(Tipus 7)*

```json
{
  "id": "A1a-5-ex-05",
  "topicId": "A1a-5",
  "title": "Memory: animals",
  "prompt": "Empareja cada imatge amb la paraula correcta.",
  "stimulus": {
    "type": "cardSet",
    "cards": [
      { "id": "c1", "group": "images", "content": { "type": "image", "src": "/img/hund.jpg", "alt": "gos" } },
      { "id": "c2", "group": "words", "content": { "type": "text", "content": "der Hund" } },
      { "id": "c3", "group": "images", "content": { "type": "image", "src": "/img/katze.jpg", "alt": "gat" } },
      { "id": "c4", "group": "words", "content": { "type": "text", "content": "die Katze" } },
      { "id": "c5", "group": "images", "content": { "type": "image", "src": "/img/pferd.jpg", "alt": "cavall" } },
      { "id": "c6", "group": "words", "content": { "type": "text", "content": "das Pferd" } }
    ]
  },
  "interaction": { "type": "matchPairs" },
  "validation": {
    "type": "pairMap",
    "pairs": [
      ["c1", "c2"],
      ["c3", "c4"],
      ["c5", "c6"]
    ]
  },
  "feedback": {
    "correct": { "message": "Excel·lent! Has emparellat correctament tots els animals." },
    "incorrect": { "default": "Torna-ho a intentar. Fixa't en els articles: der / die / das." }
  }
}
```

### 9.6. Arrossegar paraules a buits

*(Tipus 11)*

```json
{
  "id": "A1b-36-ex-02",
  "topicId": "A1b-36",
  "title": "Declina els articles",
  "prompt": "Arrossega l'article correcte a cada buit.",
  "stimulus": {
    "type": "textWithBlanks",
    "template": "{{1}} Mann gibt {{2}} Frau {{3}} Buch. Sie liest es {{4}} Kindern vor.",
    "blanks": [
      { "id": "1", "label": "nom. m." },
      { "id": "2", "label": "dat. f." },
      { "id": "3", "label": "acus. n." },
      { "id": "4", "label": "dat. pl." }
    ]
  },
  "interaction": {
    "type": "dragToSlot",
    "bank": [
      { "id": "w1", "label": "Der" },
      { "id": "w2", "label": "der" },
      { "id": "w3", "label": "das" },
      { "id": "w4", "label": "den" }
    ],
    "slots": [
      { "blankId": "1" },
      { "blankId": "2" },
      { "blankId": "3" },
      { "blankId": "4" }
    ],
    "allowReuse": false
  },
  "validation": {
    "type": "slotMap",
    "answers": { "1": "w1", "2": "w2", "3": "w3", "4": "w4" }
  },
  "feedback": {
    "correct": { "message": "Molt bé! Els quatre casos aplicats correctament." },
    "incorrect": { "default": "Revisa la taula de declinació del tema 36. Masc. nom. = der, fem. dat. = der (sí, igual!), neut. acus. = das, pl. dat. = den." }
  }
}
```

### 9.7. Escriure text lliure

*(Tipus 12)*

```json
{
  "id": "A1a-3-ex-04",
  "topicId": "A1a-3",
  "title": "Conjuga el verb",
  "prompt": "Escriu la forma correcta del verb 'wohnen' per a cada persona.",
  "stimulus": {
    "type": "textWithBlanks",
    "template": "Ich {{1}} in Berlin. Du {{2}} in München. Wir {{3}} in Hamburg.",
    "blanks": [
      { "id": "1", "label": "1ra sing." },
      { "id": "2", "label": "2a sing." },
      { "id": "3", "label": "1ra pl." }
    ]
  },
  "interaction": {
    "type": "typeIn",
    "slots": [
      { "blankId": "1", "placeholder": "…" },
      { "blankId": "2", "placeholder": "…" },
      { "blankId": "3", "placeholder": "…" }
    ],
    "caseSensitive": false,
    "trimWhitespace": true
  },
  "validation": {
    "type": "slotMapMultiple",
    "answers": {
      "1": ["wohne"],
      "2": ["wohnst"],
      "3": ["wohnen"]
    }
  },
  "feedback": {
    "correct": { "message": "Perfecte! Les tres formes correctes." },
    "incorrect": {
      "default": "Revisa les terminacions del present regular: -e, -st, -t, -en, -t, -en."
    }
  }
}
```

---

## 10. Estructura de fitxers (contingut)

```
src/data/
├── axes.json                      # Llista canònica d'eixos temàtics
├── paths/
│   ├── a1-complete-sequential.json
│   ├── a1a-only.json
│   ├── a1b-only.json
│   └── preposicions-casos.json
├── topics/
│   ├── a1a/
│   │   ├── 01-pronomen.json
│   │   ├── 02-satzstruktur.json
│   │   └── …
│   └── a1b/
│       ├── 01-lokale-praepositionen.json
│       └── …
└── exercises/
    ├── a1a/
    │   ├── 01/
    │   │   ├── ex-01.json
    │   │   └── ex-02.json
    │   └── …
    └── a1b/
        └── …
```

**Justificació:** un fitxer per tema (o exercici) fa que les diff de git siguin llegibles i permet treballar en paral·lel sense conflictes. El build carrega tots els JSON i els combina en un índex en memòria.

---

## 11. Consideracions futures (no MVP)

- **Feedback amb LLM (BYOK).** L'usuari pot introduir la seva clau API al localStorage. S'activa només per a exercicis que ho demanin explícitament a la seva validació. Per a l'MVP, ignorat.
- **Àudio generat (TTS).** Per als temes A1a 10-11 (fonètica) i àudios curts, es pot integrar TTS. Per a l'MVP, àudios estàtics.
- **Contingut d'A2a/A2b.** El schema ho suporta sense canvis. Afegir és posar fitxers nous a `src/data/topics/a2a/` i `a2b/`.
- **Rutes personalitzades.** L'usuari podria crear la seva ruta seleccionant temes. Requereix un editor. No MVP.
- **Estadístiques.** Temps total, precisió per tema, punts febles. Només requereix explotar dades ja presents a `UserProgress`.
- **Repàs espaiat.** Identificar exercicis fallats i tornar-los a presentar amb interval creixent. Requereix afegir un camp `lastReviewedAt` i una cua de repàs.

---

## 12. Glossari ràpid

- **Tema (Topic):** una unitat del temari. Té contingut conceptual i exercicis.
- **Exercici (Exercise):** una activitat interactiva. Combinació de estímul + interacció + validació.
- **Ruta (LearningPath):** seqüència ordenada de temes suggerida a l'usuari.
- **Eix (Axis):** etiqueta temàtica transversal per a la vista alternativa.
- **Mode lliure:** l'usuari no té ruta activa i navega on vol.
- **Mode seqüencial:** l'usuari segueix una ruta; el sistema suggereix el pas següent.

---

*Fi del document. Qualsevol canvi estructural al model de dades s'ha de reflectir aquí abans d'implementar-se en codi.*
