# Handoff — Kompass · Lesson Reader Redesign

## Overview

Aquest paquet conté un redisseny complet del **reader de lliçons** de
[Kompass](https://aaronfortuno.github.io/Kompass/), enfocat a reduir la
densitat cognitiva: en lloc de mostrar 300–400 paraules seguides, la
nova experiència presenta el contingut **fragment a fragment** ("beats"),
grans, amb animació typewriter opcional, i els exercicis **pregunta a
pregunta**. Inclou també una app-shell nova (Home · Temari · Settings)
que embolcalla el reader, un mode fosc pensat com "biblioteca a mitja
llum", i ajustos personalitzables per a l'usuari.

El redisseny respecta l'ànima de Kompass (sobriament editorial, serif,
multilingüe CA ↔ DE) però puja el to a "llibre de text bonic i tranquil":
tipografia gran, molt d'aire, fletxes de teclat com a mecànica principal.

---

## About the Design Files

**Els fitxers a `source/` són referències de disseny en HTML+JSX — són
prototips que mostren l'aspecte i el comportament pretès, NO codi de
producció per copiar literalment.** Es carreguen via Babel al navegador
(tot `text/babel`) i fan servir globals a `window` perquè es comunicava
més fàcilment durant el disseny.

La teva feina és **recrear aquests dissenys al codebase de Kompass**
(React, Vite, CSS Modules / Tailwind / el que sigui que hi hagi) seguint
els patrons establerts del repositori — imports normals, arquitectura de
components pròpia, i la seva convenció de rutes.

**Important:** El projecte original ja documenta que **totes les
transicions entre vistes han de ser animades**. El prototip NO té
animades les transicions entre seccions de l'app-shell (Home → Temari →
Settings) perquè es va prioritzar el polit del reader i dels settings.
Apliqueu les animacions de transició entre seccions tal com està
documentat al repo principal (CLAUDE.md / design docs del projecte).

---

## Fidelity

**High-fidelity.** Els tokens de color, tipografia, espais, radis i
estats estan tots fixats. Les preguntes de copy estan escrites en català
amb els termes correctes del temari alemany (pronoms, possessius,
exercicis de completar). El desenvolupador hauria d'aconseguir paritat
pixel-perfect amb els prototips, ajustant només el mapeig a les
llibreries/patrons del codebase real.

---

## What's new, at a glance

1. **App shell** amb 3 seccions: `#/home`, `#/temari` (inclou sub-rutes
   per capítol `#/temari/A1a` i per tema `#/temari/A1a-1`), i
   `#/settings`.
2. **Reader immersiu** (Focus Mode) que apareix fullscreen sobre l'app
   shell quan s'entra a un tema. Se surt amb **Esc** o amb el botó
   "← [capítol]" a dalt a l'esquerra. Sense botó "×" (es va treure
   conscientment).
3. **Beats**: cada step (capítol intern de la lliçó) es talla en
   fragments petits. Un beat = una idea. Només en veus un alhora, molt
   gran. Teclat: `←`/`→` beats · `Ctrl/⌘+←/→` steps · `Ctrl+⇧+←/→` blocs
   (un bloc = un step narratiu + tots els seus exercicis fins al
   següent).
4. **Exercicis** pregunta-a-pregunta dins una targeta gran amb feedback
   inline (correcte/erroni), progress dots clicables i opció "Repetir
   exercici" o "Saltar amb errors" si l'usuari vol tirar endavant.
5. **Progress bar** amb glifs **diferenciats per tipus de step**:
   **cercle** (lliçó narrativa / síntesi), **triangle** (exercici de
   comprovació), **rombe** (avaluació integradora). Tooltip amb nom
   complet en hover. Clic per saltar-hi.
6. **Typewriter animation** als beats textuals. Velocitat estàndard
   ~40ms/char.
7. **Dark mode** complet, tokens paper-càlid / tinta-càlida, pensat com
   "biblioteca de nit".
8. **Settings** centralitzats a `#/settings` amb 5 controls:
   - **Tema** (Clar/Fosc) — controla el tema globalment; **el switch
     només existeix aquí**, no als headers.
   - **Mida del text** (A−, slider 0.85–1.25, A+) — afecta tot el
     contingut del reader via la CSS var `--kf-type-scale`.
   - **Mode d'estudi**: `fragment` (default, un beat a la vegada) o
     `full` (tots els beats del step apilats d'una vegada, amb fade-in
     escalat). En mode `full`, les fletxes `←`/`→` salten de **step**,
     no de beat.
   - **Efecte typewriter** On/Off.
   - **Taules animades** On/Off (animació fila-a-fila amb clip-path).
   - Botó "Restaurar per defecte".

   Persistit a `localStorage` sota la clau `kompass-settings` i
   sincronitzat amb un `CustomEvent('kompass-settings-change')`.
9. **Responsive mobile**: swipe horitzontal per canviar de beat al
   reader, progress bar compactat, hit-targets ≥44px, typography
   clamp(...)-ejada.

---

## Screens / Views

### 1. `#/home` · App Home

**Purpose**: pantalla d'entrada. Hero amb tagline editorial (serif
italic, ~78px desktop), llista de nivells (A1, A2...) amb progrés
agregat.

**Layout**:
- Container centrat, `max-width: 1100px`, padding `60px 36px 80px`.
- Hero: kicker IBM Plex Mono 11px letter-spaced, h1 Newsreader italic
  clamp(44px, 6vw, 78px), paràgraf Newsreader 22px.
- Secció "Nivells" amb rule superior i label mono kicker. Cada nivell
  és un grid 3 columnes: `120px | 1fr | 140px`
  (badge · meta · progress). Hover: el row avança 12px a la dreta.
- Progrés: bar horitzontal 120px × 3px amb fill ink.

### 2. `#/temari` · Syllabus

**Purpose**: vista general de tots els nivells, capítols i temes.

**Layout**: mateix container. H1 italic. Per cada nivell, un grup amb
label i llista de capítols. Cada capítol és un row grid
`80px | 1fr | 80px | 40px` amb número, títol + subtítol, durada
agregada, fletxa.

### 3. `#/temari/:chapterId` · Chapter detail

**Purpose**: llistat dels temes dins un capítol (ex. `A1a` →
Pronomen, Sein & Haben, Verbs regulars).

**Layout**: kicker amb ID, h1 56px italic, subtitle 20px. Llista de
temes amb progrés inline (chip "Completat" · ok-green, "XX%" · mark-
yellow, o res).

### 4. `#/temari/:topicId` · Reader (Focus Mode)

**Purpose**: experiència immersiva d'una lliçó. Apareix FULLSCREEN
sobre l'app shell. Es surt amb Esc o amb el botó "← [capítol]" de
dalt-esquerra.

**Layout**: columna flex full-height amb 3 seccions:
- **Header** (~60px): logo esquerra · títol del tema al mig · progress bar dreta (amaga el theme toggle; es controla des de Settings).
- **Body** (flex:1): centrat verticalment. Renderitza 1 beat (o tots en
  mode `full`). Amplada màxima del stage: 880px. Backdrop amb tota la
  lliçó en 3 columnes molt difuminades (opacity .05).
- **Footer** (~56px): botó "← Anterior" · comptador "Step 01 · 3/7 ·
  Bloc 02/05" + pistes de teclat · botó "Següent →".

**Navegació de dalt a l'esquerra** (sota header):

```
← A1a · Fonaments
```

Botó amb padding `7px 12px 7px 8px`, color `--muted`, sense vora; al
hover mostra vora `--rule` i bg `--paper-2`. Label
`font-family:'IBM Plex Mono',monospace; font-size:10px;
letter-spacing:.12em; text-transform:uppercase`. Amplada màxima 360px
(amb ellipsis).

**Ajuda de tancar** al peu-dreta:
```
[Esc] per sortir
```
Opacitat 0.6, kbd amb vora `--rule`. Amagada a mobile.

### 5. `#/settings` · Settings

**Purpose**: preferències globals persistents.

**Layout**: container `max-width: 680px`. Kicker + h1 + paràgraf intro.
5 rows divididos en 2 grups: "Aparença" i "Experiència de lectura".
Cada row és `grid-template-columns: 1fr auto` amb label+hint a
l'esquerra i control a la dreta. Labels de grup en mono 10px amb
letter-spacing .16em a 40px de marge.

**Controls usats**:
- **Toggle segmentat** (`.ks-toggle`) per opcions de 2–3 valors.
  Pill background `--paper-2`, botó actiu `--ink` · text `--paper`.
- **Slider natiu** amb `accent-color: var(--ink)` + botons A− / A+ de
  30px rodons.

---

## Beat types (al reader)

Cada step del contingut es talla en beats amb `buildBeats(step)`. Els
tipus possibles (a `variant-focus.jsx`):

| type        | Visual                                                                                  | Used for                              |
|-------------|-----------------------------------------------------------------------------------------|---------------------------------------|
| `heading`   | H1 serif 68px (54 en mode full), medium, max-width 16ch, text-wrap:balance              | Títol d'un step o secció              |
| `lead`      | P italic 42px, max-width 22ch                                                           | Frase principal / tesi                |
| `body`      | P 30px, line-height 1.38, max-width 26ch                                                | Paràgraf de cos                       |
| `point`     | 34px amb marker mono "Punt X de Y"                                                      | Un punt d'una llista                  |
| `example`   | "de" 54px medium + "ca" 24px italic sota                                                | Exemple bilingüe                      |
| `pron`      | Pronom 140px ultra-gran + gloss + note + exemple                                        | Un pronom personal destacat           |
| `pair`      | personal mono 26px → possessiu 84px                                                     | Relació pronom/possessiu              |
| `rule`      | Similar a point amb marker "Regla X de Y"                                               | Regla gramatical                      |
| `compare`   | Taula 4 columnes ES/CA/DE/EN, files amb animació opcional                               | Comparativa entre llengües            |
| `pitfall`   | Bad (tachado 40px, color bad) → arrow → Good (48px medium, color ok) + why mono         | Error freqüent + correcció            |
| `callout`   | Caixa amb vora esquerra (ink/warning/tip), h4 + p                                       | Nota destacada                        |
| `syn-table` | H2 42px + taula amb files animables                                                     | Síntesi (taula gran)                  |
| `exercise`  | Targeta d'exercici amb flux pregunta-a-pregunta                                         | Step d'exercici sencer                |

La funció `buildBeats` és a `source/variant-focus.jsx`, línia ~724.

---

## Exercise component (detallat)

Targeta gran (820px max) amb bg `--kbd-bg`, vora 1px `--rule`, padding
36px 40px. A dins:
- Top: label de títol (mono 12px) + comptador `X / N`.
- Prompt italic 20px.
- Frase gran 44px serif medium amb **slot** destacat (bg
  `#fff8e0` light / buit dark, bottom-border 3px). El slot canvia a
  verd/vermell un cop revealed.
- Si `interaction === "singleChoice"`: grid de botons amb opcions.
  Picked → bg ink color paper.
- Si `interaction === "typeIn"`: input inline que hereda les mides.
  `Enter` o `ArrowRight` al final valida i revela.
- Feedback inline: verd "Correcte!" o vermell "La resposta correcta és
  **X**".
- Progress dots al peu (un per pregunta). Verd si OK, vermell si error,
  gris si no respost. Clic per saltar-hi. El dot actiu es fa ample.
- Botons Prev · Next grans al peu. Next és intel·ligent:
  - Si no has respost: intenta validar el camp actual (llegint el
    DOM). Si no pot: flash de "⚠ Escriu una resposta".
  - Si la pregunta ja està revealed: passa a la següent.
  - Si és la darrera i no hi ha errors: surt de l'exercici al següent
    step.
  - Si és la darrera i hi ha errors: la primera premuda arma
    `skipArmed` i mostra "Has fallat X/N. Prem → una altra vegada per
    continuar — ja hi tornaràs més tard". La segona fa el salt.

L'exercici exposa una `apiRef` al pare que li permet delegar les
fletxes globals del reader (`← →` de teclat) quan estem dins.

---

## Interactions & Behavior

### Keyboard (reader)
- `←` / `→`: beat anterior/següent. Si estem a un exercici, la fletxa
  la gestiona l'exercici primer.
- `Ctrl/⌘ + ←/→`: step anterior/següent (salta tots els beats del step
  actual).
- `Ctrl/⌘ + Shift + ←/→`: bloc anterior/següent (un bloc = narrative
  step + tots els exercicis que el segueixen fins al proper narrative).
- `Esc`: tanca el reader i torna al capítol pare.
- `Enter` dins inputs de typeIn: valida.

### Touch (mobile)
- Swipe horitzontal ≥50px al body: navega beats. Ignorat si el gest
  comença dins un input.

### Navegació
- Clic a qualsevol glyph del progress bar: salta a aquell step.
- Clic a qualsevol seg de la barra de beats: salta a aquell beat.
- Clic a qualsevol dot d'exercici: salta a aquella pregunta.

### Transicions
- **Entre beats**: re-render amb `key={stepIdx + "." + beatIdx}` perquè
  el typewriter es reinicia.
- **Entre steps en mode full**: fade-in escalat per beat
  (`animation: kf-full-in .45s ease both`, delay `i * 60ms`).
- **Taules (fila-a-fila)**: `kf-row-in` 0.55s cubic-bezier, amb
  `clip-path: inset(0 100% 0 0)` → `inset(0 0 0 0)`, delay `120 + i*80ms`.
- **Transicions entre seccions del shell (Home/Temari/Settings)**:
  **NO implementades al prototip**. Implementeu-les seguint la
  documentació del repo principal.

### Reduced motion
El prototip no inclou `prefers-reduced-motion` gates; afegiu-los al
codebase real.

---

## State Management

### Global (app level)
```ts
// persisteix a localStorage (claus: "kompass-theme", "kompass-settings")
type Theme = "light" | "dark";
type Settings = {
  textScale: number;      // 0.85–1.25, step 0.05
  studyMode: "fragment" | "full";
  typewriter: boolean;
  tableAnim: boolean;
};
```

### Reader state (VariantFocus)
```ts
stepIdx: number           // index al TOPIC.steps
beatIdx: number           // index dins el step actual
exerciseApiRef            // ref per delegar fletxes a l'exercici
```

### Exercise state (useExerciseState)
```ts
state: {
  idx: number;
  answers: (string | null)[];   // una per pregunta
  revealed: boolean[];           // si la pregunta ja s'ha validat
}
answer(idx, value)
next() · prev() · goto(idx)
reset()
```

---

## Design Tokens

Valors extrets directament del CSS (tots en `variant-focus.jsx` i
`shell-app.jsx`). Copieu-los al sistema de tokens del codebase.

### Colors — Light theme
```
--ink         #1b1d22   (primary text)
--ink-2       #4b4f58   (secondary text)
--muted       #8b8e95   (tertiary/mono labels)
--paper       #f6f2ea   (bg primary, warm cream)
--paper-2     #ece5d6   (bg secondary, surfaces)
--rule        #d9d0bd   (borders/separators)
--accent      #3a2e1f   (deep warm brown, currently unused)
--mark        #e8d36a   (highlight yellow)
--ok          #1f6a3a   (success green)
--bad         #8b2a1e   (error red)
--ok-bg       #e8f5ea   (success surface)
--bad-bg      #fce8e4   (error surface)
--kbd-bg      #ffffff   (keyboard/card bg)
```

### Colors — Dark theme
```
--ink         #f1ece0
--ink-2       #c8c2b2
--muted       #858177
--paper       #141210
--paper-2     #1d1a16
--rule        #3a342a
--accent      #e8d9b8
--mark        #d6b53a
--ok          #6fbb7e
--bad         #e8806f
--ok-bg       #1a2a1e
--bad-bg      #2a1a16
--kbd-bg      #1d1a16
```

Concepte dark: biblioteca a mitja llum, negre càlid (#141210 és
gairebé negre però amb tint marró), tinta crema càlida, no blanc pur.

### Typography
Fonts via Google Fonts (ja carregades a `Kompass App.html` i als
prototips):
- **Newsreader** (display + body serif). Weights usats: 400, 500, 600.
  Italic per a tots els leads i H1.
- **IBM Plex Mono** (kickers, labels, keyboard hints, counters).
  Weights: 400, 500.

**Escala tipogràfica (desktop, pre-`--kf-type-scale`)**:
```
Hero h1         : 78px  Newsreader italic 400
Section h1      : 56px  Newsreader italic 400
Beat heading    : 68px  Newsreader medium 500   (54 en mode full)
Beat lead       : 42px  Newsreader italic 400   (34 en mode full)
Beat body       : 30px  Newsreader 400          (24 en mode full)
Beat point/rule : 34px  Newsreader 400
Example .de     : 54px  Newsreader medium 500   (40 en mode full)
Example .ca     : 24px  Newsreader italic 400
Pronom .huge    : 140px Newsreader medium 500   (96 en mode full)
Pair possessive : 84px                          (56 en mode full)
Pitfall .bad    : 40px  Newsreader line-through
Pitfall .good   : 48px  Newsreader medium 500
Exercise sentence: 44px Newsreader medium 500
Shell level h3  : 26px  Newsreader italic 500
Topic title     : 22px  Newsreader italic 400
Kicker/mono     : 11px  IBM Plex Mono 500 letter-spacing .14-.22em uppercase
Body paragraph  : 18-22px Newsreader 400 line-height 1.55
```

Totes les midas del **reader** es multipliquen per la CSS var
`--kf-type-scale` (default 1, slider 0.85–1.25) aplicada al
`<html>` des dels settings.

### Spacing
Ús típic: múltiples de 4px. Exemples clau:
```
Header padding       : 16px 36px
Body padding         : 60px 36px 80px (max-width 1100px)
Stage gap (beats)    : 20px
Stage gap (full)     : 40px
Row padding          : 20–28px vertical
Reader stage maxW    : 880px
Exercise card maxW   : 820px
Settings maxW        : 680px
```

### Borders / Shadows / Radius
```
Borders: 1px solid var(--rule)  (editorial rules, minimal)
Radius : 0 a la majoria de superfícies (editorial, sec).
         999px a toggle pills i chips.
         16–18px a botons circulars (A−/A+).
Shadows: **cap** (el disseny és pla, basat en rules i tokens de paper).
```

### Motion
```
Theme transition    : background .25s ease, color .25s ease
Hover ink/border    : .15s
Row hover shift     : padding-left .25s ease
Typewriter          : ~40ms/char, startDelay ~180–500ms
Full beat fade      : .45s ease (each beat +60ms stagger)
Table row reveal    : .55s cubic-bezier(.2,.7,.2,1) (+80ms stagger)
Caret blink         : 1.1s step-end infinite
Swipe hint fade     : 3.4s ease forwards (mobile only)
```

---

## Assets

Cap imatge. Totes les "icones" són SVG inline (Lucide-style, definides
a `primitives.jsx` → `Icon` i `CalloutIcon`). El logo és un SVG de
compàs senzill dibuixat inline al header.

Tipografies carregades via Google Fonts a `Kompass App.html`:
```
https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,500;0,600;1,400;1,500&family=IBM+Plex+Mono:wght@400;500&display=swap
```

---

## File map (source/)

Tots els fitxers són JSX en-babel per al prototip. Són **referència**;
porta-les al codebase com a components React idiomàtics.

| File                             | Purpose                                                                        |
|----------------------------------|--------------------------------------------------------------------------------|
| `Kompass App.html`               | Entry point del prototip complet (app shell + reader).                         |
| `app.jsx`                        | Munta `<AppShell/>` al `#root`. Trivial.                                       |
| `shell-app.jsx`                  | **Shell app**: header, rutes hash-based, Home/Syllabus/Chapter/Settings/Reader overlay. |
| `shell-theme.jsx`                | **Hooks globals**: `useTheme`, `useSettings`, `useHashRoute`, `SYLLABUS`, `MOCK_PROGRESS`. |
| `variant-focus.jsx`              | **Reader (Focus Mode)**: VariantFocus + buildBeats + BeatBody + ExerciseView + tots els beat components. Aquest és el fitxer més important. |
| `primitives.jsx`                 | `parseInline` (markdown-lite: `**bold**`, `==mark==`), `useTypewriter`, `Icon`, `CalloutIcon`, `useExerciseState`. |
| `lesson-data.jsx`                | Dades de la lliçó A1a-1 (Pronomen) en format `TOPIC.steps[]` + `EXERCISES`. Mireu l'estructura per veure com cal modelar futures lliçons. |
| `Kompass Lesson Redesign.html`   | Design canvas amb les 3 variacions originals (Focus/Kartei/Swiss). Només referència. |
| `variant-kartei.jsx`             | Variació alternativa "targetes" — referència només.                           |
| `variant-swiss.jsx`              | Variació alternativa "brutalist swiss" — referència només.                    |
| `design-canvas.jsx`              | Starter del canvas de variacions — NO portar al producte.                     |

**La variació canònica a implementar és `variant-focus.jsx`.** Les
altres dues són exploracions que es van descartar.

---

## Implementation notes for the developer

1. **Prioritza el Focus Mode**. És el cor de la UX. Totes les decisions
   de contingut, tipografia i ritme s'hi han fet.

2. **Mantén la mecànica "un beat a la vegada"**. És la diferenciació
   principal respecte a l'actual reader dens de Kompass. El mode `full`
   està pensat com a "escape hatch" per a repàs ràpid, no com a default.

3. **Typewriter és expressiu, no decoratiu**. Els usuaris haurien de
   poder llegir al ritme que es revela, no esperar que acabi. Velocitat
   per defecte ~40ms/char. Si l'animació estorba, respectea el setting
   `typewriter: false`.

4. **Les transicions entre seccions de l'app-shell (Home/Temari/Settings)
   s'han d'implementar segons les directrius documentades al repo
   principal.** El prototip deixa la navegació crua perquè és fora de
   l'abast del redisseny del reader.

5. **Estat dels settings**: els 4 settings nous (a més del tema) han de
   ser accessibles globalment. El patró recomanat: context React o
   store (zustand/signals/segons el codebase). La CSS var
   `--kf-type-scale` s'aplica al `<html>` o al root del reader.

6. **Markup de contingut**: `parseInline` processa dos patrons dins
   cadenes:
   - `**text**` → `<strong>` (bold)
   - `==text==` → `<span class="k-mark">` (highlight yellow)
   Porta aquest helper al codebase o substitueix-lo per MDX/markdown-it
   si ja en teniu.

7. **Dades de lliçó**: el format de `TOPIC.steps[]` amb `kind:
   "narrative" | "synthesis" | "exercise"` és una proposta. Adapteu-lo
   al model de Kompass actual o migreu el model actual cap a aquesta
   forma (és més expressiva per al nou reader: els camps opcionals com
   `lead`, `points`, `pairs`, `comparison`, `pitfalls`, `callout` són
   el que permet que `buildBeats` funcioni).

8. **Progress tracking**: al prototip hi ha `MOCK_PROGRESS` fals. Al
   producte, llegiu del backend/store real. El shape esperat és:
   `{ [topicId]: { done: 0–1, lastStep: number } }`.

9. **Accessibility**:
   - Proveïu tots els `aria-label` als botons del progress bar, back-
     navigation, toggles, etc. El prototip ja en té (reviseu-los).
   - Feu que `Esc` tanqui el reader fins i tot dins d'inputs.
   - Doneu focus visible als targets interactius (el prototip en té
     per defecte del navegador, però considereu ringlets personalitzats
     que encaixin amb els tokens).
   - Respecteu `prefers-reduced-motion` desactivant typewriter i
     table-anim per a aquests usuaris (i/o fes-ho configurable).

10. **Mobile**:
    - Hit targets ≥44px.
    - Swipe horitzontal al body del reader.
    - Header i progress bar compactats (amaga la fila de steps, deixa
      només la de beats).
    - Pistes de teclat amagades.

---

## Testing checklist (per a QA)

- [ ] `#/home` carrega correctament amb els nivells visibles i progrés.
- [ ] Clic a un nivell navega al primer capítol.
- [ ] `#/temari` mostra tots els capítols agrupats per nivell.
- [ ] `#/temari/A1a` mostra la llista de temes amb progrés inline.
- [ ] Clic a un tema obre el reader en FULLSCREEN.
- [ ] El botó "← A1a · Fonaments" torna al capítol pare.
- [ ] `Esc` tanca el reader des de qualsevol punt.
- [ ] Fletxes `← →` naveguen beats (mode fragment).
- [ ] Els glyphs del progress bar tenen el símbol correcte per tipus
      (cercle/triangle/rombe).
- [ ] Tooltip apareix en hover a sobre d'un glyph.
- [ ] Clic a un glyph salta a aquell step.
- [ ] L'exercici valida quan escrius una resposta i prems `→`.
- [ ] L'exercici mostra feedback verd/vermell adequadament.
- [ ] A la darrera pregunta amb errors, `→` arma "Saltar amb errors" i
      una segona `→` surt de l'exercici.
- [ ] `#/settings`: els 5 controls apliquen immediatament al reader.
- [ ] Cap header (shell, reader) mostra el switch de tema. Només a
      Settings.
- [ ] Canviar "Mida del text" canvia les midas del reader en viu.
- [ ] Canviar "Mode d'estudi → Pas complet" fa que el reader mostri
      tot el step d'una vegada i `→` salti de step.
- [ ] Canviar "Typewriter → Off" elimina l'animació del caret.
- [ ] Canviar "Taules animades → Off" desactiva el fade-in fila a fila.
- [ ] Refresh manté tots els settings (persistència localStorage).
- [ ] Dark mode es veu càlid, no blau/violeta (paper #141210, ink
      #f1ece0).
- [ ] Swipe horitzontal al body del reader mobile canvia beat.
- [ ] Les transicions entre seccions del shell són animades (a
      implementar segons doc del repo principal).

---

## Questions / deviations from the original

- El **model de dades `TOPIC.steps`** és més granular que el del
  Kompass actual. Si el migreu, algunes lliçons actuals amb blocs de
  text grans ("body" llarg) hauran de ser trossejades en steps +
  points/examples per aprofitar el format beat. No caldrà tocar el
  text; només estructurar-lo.
- El **theme toggle global** només viu a `#/settings`. Això és
  intencional: simplifica els headers i unifica tots els ajustos.
- Les **3 variacions inicials** (Focus, Kartei, Swiss) estan a
  `Kompass Lesson Redesign.html` com a referència històrica. Només
  Focus es porta a producte.

---

*Si alguna cosa és ambigua, obriu `source/Kompass App.html` al
navegador — és la font canònica del redisseny.*
