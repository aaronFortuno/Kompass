# ARCHITECTURE.md · Kompass

> Especificació tècnica de **Kompass**: stack, estructura de carpetes, fluxos de dades, i decisions de disseny.
> Acompanya `DATA-MODEL.md` (el *què*) com a especificació del *com*.
> Qualsevol decisió tècnica estructural s'ha de reflectir aquí abans d'implementar-se.

---

## 1. Visió general

**Kompass** és una Single Page Application (SPA) estàtica desplegada a GitHub Pages. Funciona completament offline un cop carregada (tret de possibles assets multimèdia externs). No hi ha backend. L'estat de l'usuari persisteix al `localStorage` del navegador i és exportable com a JSON.

**Filosofia tècnica:**

1. **Zero fricció per a l'usuari.** Sense login, sense comptes, sense costos. Obre la web i comença.
2. **Contingut com a dades.** Afegir temes i exercicis = afegir fitxers JSON. Mai s'han de tocar components React per a afegir material.
3. **Escalabilitat del contingut.** El bundle ha d'aguantar centenars de temes sense patir. Codi splitting per nivell quan calgui.
4. **Mantenible en solitari.** El projecte l'ha de poder mantenir una sola persona amb ajuda d'IA. Stack simple, convencions clares, documentació al dia.
5. **Pedagogia primer.** La qualitat del feedback i la claredat visual importen més que les features tècniques avançades.

---

## 2. Stack

| Capa               | Tria                          | Justificació                                                                                                                                                      |
| ------------------ | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Llenguatge         | JavaScript (ES2022+)          | El desenvolupador ve de vanilla JS. TypeScript es podria adoptar més endavant de forma gradual amb JSDoc + `checkJs`.                                             |
| Framework UI       | React 18                      | Familiar, estàndard, ecosistema enorme.                                                                                                                           |
| Build              | Vite 5+                       | Més ràpid i simple que CRA. Excel·lent DX per a GitHub Pages.                                                                                                     |
| Routing            | React Router 6                | Estàndard de facto. `HashRouter` per compatibilitat amb GitHub Pages (evita problemes amb rutes profundes).                                                       |
| State              | Zustand                       | Mínim boilerplate, `persist` middleware integrat per a `localStorage`, API senzilla. Alternativa: Context API + `useReducer` (zero dependències, més verbositat). |
| Styling            | Tailwind CSS                  | Iteració ràpida de UI, bona integració amb React i Vite, fàcil de mantenir. Compensa la corba inicial amb velocitat posterior.                                    |
| Validació de dades | Zod                           | Validació runtime dels JSON de contingut. Evita errors silenciosos en afegir temes.                                                                               |
| Testing            | Vitest                        | Integrat amb Vite. Per a tests unitaris dels validadors i de la lògica d'exercicis. L'UI es pot provar amb Testing Library més endavant.                          |
| Deploy             | GitHub Actions → GitHub Pages | Flux estàndard. Workflow a `.github/workflows/deploy.yml`.                                                                                                        |

**Dependències opcionals (no MVP):**

- `react-markdown` — per renderitzar els `ContentBlock` de tipus `explanation` (ja que vénen en Markdown).
- `@dnd-kit/core` — per a exercicis `dragToSlot`. Més accessible que `react-dnd`.
- `clsx` o `class-variance-authority` — per a composar classes de Tailwind netament.

---

## 3. Estructura de carpetes

```
kompass/
├── public/
│   ├── images/                    # Imatges de contingut (referenciades des de JSON)
│   │   ├── a1a-5-schloss.jpg
│   │   └── ...
│   ├── audio/                     # Àudios de contingut
│   └── favicon.ico
│
├── src/
│   ├── data/                      # Contingut com a dades (vegeu DATA-MODEL.md)
│   │   ├── axes.json
│   │   ├── paths/
│   │   │   ├── a1-complete-sequential.json
│   │   │   └── ...
│   │   ├── topics/
│   │   │   ├── a1a/
│   │   │   │   ├── 01-pronomen.json
│   │   │   │   └── ...
│   │   │   └── a1b/
│   │   └── exercises/
│   │       ├── a1a/
│   │       │   ├── 01/
│   │       │   │   ├── ex-01.json
│   │       │   │   └── ...
│   │       └── a1b/
│   │
│   ├── i18n/                       # Claus de UI i hook useT (§17.3)
│   │   ├── ca.json
│   │   ├── es.json
│   │   └── index.jsx
│   ├── theme/                      # ThemeProvider i toggle (§17.2)
│   │   └── index.jsx
│   │
│   ├── components/
│   │   ├── ui/                    # Primitius reutilitzables
│   │   │   ├── Button.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── ProgressBar.jsx
│   │   │   └── ...
│   │   ├── layout/
│   │   │   ├── AppShell.jsx       # Layout global
│   │   │   ├── Header.jsx
│   │   │   └── Sidebar.jsx
│   │   ├── topic/
│   │   │   ├── TopicView.jsx      # Vista completa d'un tema
│   │   │   ├── TopicHeader.jsx
│   │   │   ├── ContentBlock.jsx   # Dispatcher per tipus de bloc
│   │   │   └── blocks/
│   │   │       ├── ExplanationBlock.jsx
│   │   │       ├── TableBlock.jsx
│   │   │       ├── LerntippBlock.jsx
│   │   │       ├── ExampleBlock.jsx
│   │   │       ├── AudioBlock.jsx
│   │   │       └── VideoBlock.jsx
│   │   └── exercise/
│   │       ├── ExerciseEngine.jsx # Orquestra stimulus+interaction+validation
│   │       ├── ExerciseFeedback.jsx
│   │       ├── stimuli/
│   │       │   ├── TextStimulus.jsx
│   │       │   ├── TextWithBlanksStimulus.jsx
│   │       │   ├── TextWithHighlightsStimulus.jsx
│   │       │   ├── ImageStimulus.jsx
│   │       │   ├── AudioStimulus.jsx
│   │       │   ├── VideoStimulus.jsx
│   │       │   └── CardSetStimulus.jsx
│   │       └── interactions/
│   │           ├── SingleChoiceInteraction.jsx
│   │           ├── MultiChoiceInteraction.jsx
│   │           ├── TrueFalseInteraction.jsx
│   │           ├── DropdownFillInteraction.jsx
│   │           ├── TypeInInteraction.jsx
│   │           ├── DragToSlotInteraction.jsx
│   │           └── MatchPairsInteraction.jsx
│   │
│   ├── lib/
│   │   ├── dataLoader.js          # Carrega i indexa els JSON
│   │   ├── schemas/               # Zod schemas
│   │   │   ├── topic.js
│   │   │   ├── exercise.js
│   │   │   ├── path.js
│   │   │   └── progress.js
│   │   ├── validator.js           # Valida JSON contra schemas
│   │   ├── exerciseValidator.js   # Lògica de validació d'una resposta
│   │   ├── feedback.js            # Selecció del feedback adequat
│   │   ├── progress.js            # Lògica de progrés (completat, en curs, etc.)
│   │   ├── exportImport.js        # Serialitza i parseja ExportFile
│   │   └── migrations/
│   │       └── v1.js              # Reservat per a futures migracions
│   │
│   ├── store/
│   │   ├── useProgressStore.js    # Progrés de l'usuari (persistent)
│   │   └── useUIStore.js          # Estat UI volàtil (modals, etc.)
│   │
│   ├── hooks/
│   │   ├── useTopic.js
│   │   ├── useExercise.js
│   │   └── useActivePath.js
│   │
│   ├── pages/
│   │   ├── HomePage.jsx
│   │   ├── TopicsByLevelPage.jsx  # Vista per tema oficial
│   │   ├── TopicsByAxisPage.jsx   # Vista per eix temàtic
│   │   ├── TopicPage.jsx          # Un tema concret
│   │   ├── ExercisePage.jsx       # Un exercici concret (full-screen opcional)
│   │   ├── PathsPage.jsx          # Índex de rutes
│   │   ├── PathPage.jsx           # Vista d'una ruta
│   │   ├── ProgressPage.jsx       # Progrés, export/import
│   │   ├── AboutPage.jsx
│   │   └── NotFoundPage.jsx
│   │
│   ├── styles/
│   │   └── index.css              # Tailwind base + custom utilities
│   │
│   ├── App.jsx                    # Router setup
│   └── main.jsx                   # Entry point
│
├── tests/
│   ├── schemas.test.js
│   ├── exerciseValidator.test.js
│   └── feedback.test.js
│
├── scripts/
│   └── validateAllContent.js      # Valida tots els JSON abans del build
│
├── .github/
│   └── workflows/
│       └── deploy.yml
│
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── .gitignore
├── README.md
├── DATA-MODEL.md
├── ARCHITECTURE.md
├── LICENSE                        # MIT
└── CLAUDE.md                      # Notes per a sessions de Claude Code
```

**Justificació de decisions clau:**

- **`public/` per a assets referenciables des de JSON:** les URLs són estables i conegudes (`/images/a1a-5-schloss.jpg`). Si aquests assets anessin a `src/assets/`, Vite els renombraria amb hashes i caldria resoldre les URLs en runtime.
- **JSON de contingut a `src/data/`:** Vite els importa com a mòduls i els inclou al bundle (tree-shakeable si cal). Més simple que fetch dinàmic.
- **Components d'exercici dividits en `stimuli/` i `interactions/`:** reflecteix directament l'arquitectura de 3 eixos de `DATA-MODEL.md`. Un exercici nou només cal combinar peces existents.
- **`lib/schemas/` separat:** els schemas Zod són la primera línia de defensa contra JSON malformats. Viuen aïllats per poder fer-los servir tant al build com als tests.

---

## 4. Configuració del build (Vite)

### 4.1. `vite.config.js`

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/kompass/',           // Obligat per a GitHub Pages project site
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Separa el contingut per nivell per a lazy-loading futur.
          // En MVP no cal activar-ho, deixem el chunk únic.
        },
      },
    },
  },
});
```

### 4.2. Base path i deploy

GitHub Pages serveix el projecte des de `https://<user>.github.io/kompass/`. Per tant:

- `vite.config.js` → `base: '/kompass/'`.
- `HashRouter` de React Router (no `BrowserRouter`) per evitar problemes amb refresh de rutes profundes.
- Les URLs finals són `https://<user>.github.io/kompass/#/temes/A1b-19`.

### 4.3. Workflow `deploy.yml`

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run validate-content    # Valida tots els JSON
      - run: npm run test                # Tests unitaris
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist
      - uses: actions/deploy-pages@v4
```

---

## 5. Routing

Patró d'URLs (amb hash routing):

| Ruta                             | Component           | Descripció                                   |
| -------------------------------- | ------------------- | -------------------------------------------- |
| `/`                              | `HomePage`          | Benvinguda, mode continuar, enllaços ràpids. |
| `/temes`                         | `TopicsByLevelPage` | Index per A1a / A1b.                         |
| `/eixos`                         | `TopicsByAxisPage`  | Index per eix temàtic.                       |
| `/temes/:topicId`                | `TopicPage`         | Vista del tema (contingut + exercicis).      |
| `/temes/:topicId/ex/:exerciseId` | `ExercisePage`      | Exercici individual (full-screen).           |
| `/rutes`                         | `PathsPage`         | Llista de rutes.                             |
| `/rutes/:pathId`                 | `PathPage`          | Vista d'una ruta.                            |
| `/progres`                       | `ProgressPage`      | Progrés global, export/import.               |
| `/about`                         | `AboutPage`         | Sobre el projecte.                           |
| `*`                              | `NotFoundPage`      | 404.                                         |

**Navegació contextual:**

- Quan l'usuari té una ruta activa, a qualsevol pàgina hi ha un botó "Següent pas" visible que el porta al següent tema/exercici de la ruta.
- Quan està en mode lliure, no apareix aquest botó.

---

## 6. Gestió d'estat (Zustand)

### 6.1. `useProgressStore`

Estat persistent, emmagatzemat a `localStorage` sota la clau `kompass.progress.v1`.

```js
// src/store/useProgressStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useProgressStore = create(
  persist(
    (set, get) => ({
      schemaVersion: 1,
      createdAt: null,
      lastUpdated: null,
      activePathId: null,
      pathPositions: {},
      topics: {},
      exercises: {},

      // Accions
      startTopic: (topicId) => { /* ... */ },
      completeExercise: (exerciseId, response, correct, timeSpent) => { /* ... */ },
      setActivePath: (pathId) => { /* ... */ },
      advancePath: () => { /* ... */ },
      exportJson: () => { /* ... */ },
      importJson: (json) => { /* ... */ },
      reset: () => { /* ... */ },
    }),
    {
      name: 'kompass.progress.v1',
      version: 1,
      migrate: (persistedState, version) => {
        // Futures migracions van aquí.
        return persistedState;
      },
    }
  )
);
```

### 6.2. `useUIStore`

Estat volàtil (no persistent).

```js
// src/store/useUIStore.js
import { create } from 'zustand';

export const useUIStore = create((set) => ({
  sidebarOpen: false,
  currentFeedback: null,
  importDialogOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  showFeedback: (feedback) => set({ currentFeedback: feedback }),
  clearFeedback: () => set({ currentFeedback: null }),
}));
```

---

## 7. Flux de dades

### 7.1. Càrrega inicial

```
main.jsx
  ↓ renderitza <App />
App.jsx
  ↓ inicialitza Router
  ↓ dataLoader.init() (sync: tots els JSON ja estan al bundle)
      ↓ importa tots els JSON de src/data/
      ↓ valida amb Zod (només en dev / quan es crida validate-content)
      ↓ construeix índexs:
          - topicsById: Map<topicId, Topic>
          - topicsByLevel: Map<level+sublevel, Topic[]>
          - topicsByAxis: Map<axis, Topic[]>
          - exercisesById: Map<exerciseId, Exercise>
          - pathsById: Map<pathId, LearningPath>
  ↓ Zustand rehidrata useProgressStore des de localStorage
App listo.
```

### 7.2. Execució d'un exercici

```
Usuari navega a /temes/A1b-19/ex/A1b-19-ex-02
  ↓
ExercisePage llegeix :topicId i :exerciseId de la URL
  ↓
useExercise(exerciseId) retorna l'objecte Exercise
  ↓
<ExerciseEngine exercise={exercise} />
  ↓ renderitza:
      <StimulusComponent type={exercise.stimulus.type} data={exercise.stimulus} />
      <InteractionComponent
        type={exercise.interaction.type}
        data={exercise.interaction}
        onResponse={handleResponse}
      />
  ↓
Usuari completa interacció → handleResponse(response)
  ↓
ExerciseEngine crida exerciseValidator.validate(exercise, response)
  ↓ retorna { correct: boolean, feedback: FeedbackMessage }
ExerciseEngine:
  - mostra <ExerciseFeedback feedback={feedback} correct={correct} />
  - crida useProgressStore.completeExercise(...)
  - si hi ha path actiu, ofereix botó "Següent pas"
```

### 7.3. Export/Import

**Export:** l'usuari fa clic a "Exporta progrés" a `/progres`.
→ `exportImport.serialize(progressState)` retorna un objecte `ExportFile`.
→ Es descarrega com `kompass-progress-YYYYMMDD-HHMM.json`.

**Import:** usuari selecciona un fitxer al mateix lloc.
→ Es parseja el JSON.
→ Es valida amb Zod (schema `ExportFile`).
→ Si `schemaVersion < current`, s'aplica migració.
→ Es demana confirmació si ja hi ha progrés local.
→ Es reemplaça l'estat del store.

---

## 8. Validació de contingut (Zod)

Cada entitat de `DATA-MODEL.md` té un schema Zod corresponent a `src/lib/schemas/`. Exemple:

```js
// src/lib/schemas/exercise.js
import { z } from 'zod';

const StimulusSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), content: z.string() }),
  z.object({ type: z.literal('image'), src: z.string(), alt: z.string(), caption: z.string().optional() }),
  // ... la resta de tipus
]);

const InteractionSchema = z.discriminatedUnion('type', [ /* ... */ ]);
const ValidationSchema = z.discriminatedUnion('type', [ /* ... */ ]);
const FeedbackSchema = z.object({ /* ... */ });

export const ExerciseSchema = z.object({
  id: z.string().regex(/^A\d[ab]-\d+-ex-\d+$/),
  topicId: z.string(),
  title: z.string(),
  prompt: z.string(),
  difficulty: z.number().int().min(1).max(3),
  tags: z.array(z.string()),
  stimulus: StimulusSchema,
  interaction: InteractionSchema,
  validation: ValidationSchema,
  feedback: FeedbackSchema,
  hint: z.string().optional(),
  relatedTopicIds: z.array(z.string()).optional(),
});
```

**Script `validateAllContent.js`:** carrega tots els JSON, els passa pel schema corresponent, i falla si algun no valida. Es crida al CI abans de `build`.

---

## 9. Components d'exercici (convenció)

Cada component d'estímul i d'interacció rep:

- `data`: l'objecte corresponent del JSON de l'exercici.
- `onResponse` (només interaccions): callback quan l'usuari produeix una resposta.
- `disabled` (només interaccions): true quan ja s'ha respost (lock abans de feedback).

**Contracte de resposta:** cada tipus d'interacció produeix un objecte `response` amb forma coneguda pel validator:

| Interaction    | Response shape                 |
| -------------- | ------------------------------ |
| `singleChoice` | `string` (optionId)            |
| `multiChoice`  | `string[]` (optionIds)         |
| `trueFalse`    | `Record<statementId, boolean>` |
| `dropdownFill` | `Record<blankId, string>`      |
| `typeIn`       | `Record<blankId, string>`      |
| `dragToSlot`   | `Record<blankId, bankItemId>`  |
| `matchPairs`   | `Array<[cardIdA, cardIdB]>`    |

---

## 10. Estratègia de feedback

`lib/feedback.js` implementa la selecció del missatge adequat donat `exercise` i `response`:

```js
export function selectFeedback(exercise, response, isCorrect) {
  if (isCorrect) return exercise.feedback.correct;

  const byResponse = exercise.feedback.incorrect.byResponse || [];
  for (const item of byResponse) {
    if (matchesResponse(item.match, response)) {
      return item;
    }
  }
  return { message: exercise.feedback.incorrect.default };
}

function matchesResponse(match, response) {
  // Cada clau de `match` ha de coincidir amb la corresponent de `response`.
  return Object.entries(match).every(([k, v]) => response[k] === v);
}
```

---

## 11. Convencions de codi

- **Naming:**
  
  - Components: `PascalCase.jsx`
  - Hooks: `useXxx.js` (camelCase amb prefix `use`)
  - Utilities: `camelCase.js`
  - JSON de dades: `kebab-case.json`
  - Ids dins dels JSON: segons `DATA-MODEL.md` (p. ex. `A1b-19-ex-02`)

- **Imports:**
  
  - Mòduls interns amb path absolut configurat amb alias `@` → `src/` (configurar a `vite.config.js`).
  - Ordre: react/libraries → alias internes → relatius → styles.

- **Components:**
  
  - Funcional, sense classes.
  
  - Un component per fitxer.
  
  - Props tipades amb JSDoc quan la forma sigui complexa:
    
    ```js
    /** * @param {{ exercise: Exercise }} props */export function ExerciseEngine({ exercise }) { ... }
    ```

- **Comentaris:**
  
  - En català (el desenvolupador principal).
  - Els strings visibles a l'UI també en català.
  - Els noms de variables i funcions en anglès.

---

## 12. Accessibilitat

**Obligatori a l'MVP:**

- Navegació amb teclat funcional a tots els components d'interacció.
- `aria-label` i `aria-describedby` correctes.
- Contrast AA mínim per a text (Tailwind ajuda).
- `alt` obligatori a `ImageStimulus`.
- `transcript` opcional però recomanat a `AudioStimulus`.

**A afinar més endavant:**

- Announcements ARIA per a feedback dinàmic.
- Tests amb lector de pantalla.
- Suport per a `prefers-reduced-motion`.

---

## 13. Performance

**MVP:**

- Bundle únic. Sense code splitting inicial.
- Tailwind en mode JIT (per defecte amb Vite).
- Imatges amb `loading="lazy"` a components de contingut llarg.

**Optimitzacions futures quan calgui:**

- Code splitting per nivell (A1a, A1b, A2a…). `React.lazy` + `Suspense`.
- WebP per a totes les imatges.
- Preload dels JSON del tema actual + pròxim.
- Service worker per a offline real (PWA).

---

## 14. Error handling

- **ErrorBoundary** global a `App.jsx` que captura errors de renderitzat i mostra una pàgina amb opció d'exportar el progrés abans d'intentar recuperar.
- **JSON malformat al build:** el `validateAllContent` script ho detecta i falla el build.
- **JSON malformat en runtime** (per exemple, un export importat corruput): es mostra un missatge clar i el progrés actual no es toca.
- **Missing asset** (imatge o àudio): fallback amb placeholder i missatge log al console.

---

## 15. Primer milestone (MVP)

**Objectiu del MVP:** tenir Kompass funcional amb 1 tema complet i totes les peces de l'arquitectura provades.

**Criteri d'acceptació:**

1. Stack muntat: Vite + React + Tailwind + Zustand + Zod.
2. Schemas Zod de totes les entitats de `DATA-MODEL.md`, amb tests bàsics.
3. `dataLoader` funcionant amb indexat.
4. Routing operatiu amb les rutes principals.
5. Components d'estímul i d'interacció per a **4 tipus d'exercici** (suficients per al primer tema):
   - `singleChoice` amb estímul `image`
   - `dropdownFill` amb estímul `textWithBlanks`
   - `matchPairs` amb estímul `cardSet`
   - `typeIn` amb estímul `textWithBlanks`
6. Tema A1a-1 (Pronomen) complet: contingut + 4-5 exercicis variats.
7. `UserProgressStore` amb persist a localStorage.
8. Export/Import JSON funcional a `/progres`.
9. Deploy a GitHub Pages funcionant.
10. Tema clar/fosc operatiu amb toggle i respecte de `prefers-color-scheme` (§17.2).
11. Selector d'idioma de UI funcional (ca/es); tota la UI visible passa per `t()` (§17.3).
12. Layout responsive verificat a 375 px, 768 px i 1280 px (§17.4).

**Què no entra a l'MVP:**

- Drag-to-slot, àudio, vídeo (tipus d'exercici més complexos).
- Rutes (`LearningPath`). Es pot navegar per temes però encara no hi ha seqüencial.
- Vista per eix (només per nivell).
- LLM feedback.
- Estadístiques o repàs espaiat.

Un cop MVP validat, es van afegint progressivament els tipus d'exercici que falten i més temes. El model de dades ja els acomoda; cal només construir els components.

---

## 16. Convencions per a sessions de Claude Code

Aquest document i `DATA-MODEL.md` són la font de veritat. A més, `CLAUDE.md` a l'arrel del repo ha de contenir:

- Context resumit del projecte (què és Kompass, a qui va dirigit).
- Instruccions específiques per a l'agent (sempre validar amb Zod, sempre actualitzar DATA-MODEL abans de canviar el schema en codi, convencions de naming).
- Checklist de tasques comunes (afegir un tema, afegir un tipus d'exercici nou, fer un release).

**Principi:** cap sessió de Claude Code hauria de necessitar inventar decisions estructurals. Si una decisió no és al `DATA-MODEL`, `ARCHITECTURE` o `CLAUDE.md`, cal aturar-se, decidir-la amb el desenvolupador, i afegir-la al document corresponent abans de continuar.

---

## 17. Design tokens, tema i i18n

Aquesta secció cobreix quatre transversals de presentació que afecten tots els components: tokens de disseny, mode clar/fosc, internacionalització i responsive. Són tan vinculants com les seccions anteriors.

### 17.1 Design tokens

**Principi:** cap component hardcoda colors, mides o radis. Tot consumeix tokens semàntics centralitzats. Si es vol canviar la identitat visual de Kompass, es canvia a un sol lloc.

**Dues capes:**

1. **Variables CSS** a `src/styles/index.css` — defineixen els valors crus, amb un bloc per `:root` (tema clar) i un per `.dark` (tema fosc). Són la font de veritat dels valors.
2. **`tailwind.config.js`** — mapeja aquestes variables a utilitats de Tailwind amb nom semàntic (`bg-surface`, `text-content`, `border-border`, `shadow-soft`…).

**Categories de tokens:**

- **Color (semàntic, no literal):**
  
  - `bg` — fons de pàgina.
  - `surface` — fons de targetes i panells.
  - `surface-raised` — variant elevada (modals, popovers).
  - `content` — text principal.
  - `content-muted` — text secundari, metadades.
  - `border` — línies divisòries.
  - `accent` — color de marca (per a CTA i enllaços).
  - `accent-content` — text sobre fons `accent`.
  - `success`, `danger`, `warning` — feedback d'exercici (correcte, error, avís).

- **Tipografia:** `fontFamily.sans` (stack amb Inter + system fallback), escala `fontSize` estàndard de Tailwind (`xs / sm / base / lg / xl / 2xl / 3xl / 4xl`).

- **Radis:** `radius.sm` (2px), `radius.md` (8px), `radius.lg` (16px).

- **Ombres:** `shadow.soft`, `shadow.raised`.

- **Espaiat:** es manté l'escala estàndard de Tailwind (0, 0.5, 1, 2, 3, 4…). Per a patrons repetits (gutter de pàgina, gap entre seccions de tema) es defineixen classes `@apply` reutilitzables a `src/styles/index.css` (p. ex. `.page-gutter`, `.section-gap`).

**Regla vinculant (a reforçar a CLAUDE.md):**

- Res de `bg-gray-800`, `text-[#333]`, `p-[17px]`, `border` amb color hardcoded, `rgb()`/`hex` en classes arbitraries.
- Només tokens semàntics: `bg-surface`, `text-content`, `border-border`, `rounded-md`, `shadow-soft`.
- Si un disseny requereix un valor que no existeix, s'afegeix com a token abans d'usar-lo.

### 17.2 Tema clar/fosc

- **Mecanisme:** `darkMode: 'class'` a `tailwind.config.js`. L'arrel `<html>` té o no la classe `dark`.
- **Valors possibles:** només `"light"` i `"dark"`. No hi ha mode "system" explícit: s'ha descartat per simplificar el mental model (el toggle sempre decideix).
- **First-visit:** si no hi ha preferència guardada a `localStorage`, es llegeix `prefers-color-scheme` una única vegada per fixar el valor inicial i s'escriu immediatament. A partir d'aquí, el canvi del sistema no afecta la preferència.
- **Override manual:** toggle a l'header que alterna entre `light` i `dark`.
- **Persistència:** clau `kompass.theme` a `localStorage`, amb valors `"light" | "dark"`. Clau independent del `UserProgress` per no afectar-ne l'esquema ni les migracions.
- **Implementació:** `src/theme/index.jsx` exposa `ThemeProvider`, hook `useTheme()` i component `ThemeToggle`. Es munta a `App.jsx` per sobre del router.

### 17.3 Internacionalització (i18n)

**Distinció important:** la **UI** és internacionalitzable (català, castellà inicialment, angles potser més endavant); el **contingut d'estudi** (explicacions gramaticals, enunciats d'exercicis, feedback pedagògic, glosses catalanes dels exemples alemanys) **no és** i18n. Viu a `src/data/` i es manté en català, perquè és contingut autoral graduat pel desenvolupador. Si mai es tradueix el contingut didàctic, es farà com a variant del JSON de tema, no via sistema i18n.

**Implementació (sense dependències externes):**

- `src/i18n/ca.json`, `src/i18n/es.json` — claus de UI, organitzades per namespace.
- `src/i18n/index.jsx` — context React amb `I18nProvider` i hook `useT()` que retorna `{ t, locale, setLocale, availableLocales }`.
- `t('nav.topics')` busca la clau al locale actiu i retorna la traducció. Si la clau no existeix:
  - Cau al locale per defecte (`ca`).
  - Si tampoc hi és, retorna la clau sense traduir i emet `console.warn` en mode dev.
- Interpolació simple amb `{nomVariable}`: `t('home.welcome', { name: 'Aaron' })`. Sense plurals complexos ni format de dates.
- **Locale persistit** a `localStorage.kompass.locale` amb valors `"ca" | "es"`. Default `ca`.
- **Aplicació al document:** el provider actualitza `document.documentElement.lang` amb el locale actiu.

**Organització de claus:**

```json
{
  "nav": { "home": "Inici", "topics": "Temes", "paths": "Rutes", "progress": "Progrés" },
  "home": { "title": "…", "ctaStart": "…" },
  "exercise": { "check": "Comprovar", "next": "Següent", "correct": "Correcte!" },
  "theme": { "light": "Clar", "dark": "Fosc", "system": "Sistema" }
}
```

**Regla vinculant:** cap string visible a l'UI és un literal al JSX; sempre passa per `t('…')`. Cada PR que afegeixi una clau nova l'afegeix als dos locales. Si una queda sense traduir al castellà temporalment, es deixa amb la forma catalana i es marca amb el prefix `[ca]` al valor per facilitar-ne la detecció.

### 17.4 Responsive

- **Mobile-first.** Cada component es dissenya partint de 320 px d'amplada i s'escala cap amunt.
- **Breakpoints estàndard de Tailwind:** `sm 640 / md 768 / lg 1024 / xl 1280`.
- **Layout base:**
  
  - **Mòbil** (< `md`): columna única; navegació principal en un menú col·lapsable (hamburguesa).
  - **Tauleta i desktop** (`md+`): header fix a dalt amb navegació inline; contingut centrat amb `max-w-3xl` per a vistes de tema i `max-w-6xl` per a llistats.

- **Targets tàctils mínim** 44×44 px (WCAG 2.5.5 Level AAA recomanat).
- **Verificació obligatòria** abans de commit d'UI significativa: 375 px (iPhone mini), 768 px (iPad), 1280 px (laptop).
- **Sense deps afegides.** Tailwind ja ho cobreix tot.

### 17.5 Icones

**Biblioteca única:** [Lucide](https://lucide.dev/) via `lucide-react`. No es combinen jocs d'icones ni s'importen SVGs d'altres fonts per mantenir coherència visual (mateix gruix, mateix estil geomètric, mateixes proporcions).

**Ús:**

```jsx
import { Languages } from 'lucide-react';
<Languages size={20} aria-hidden="true" />
```

**Convencions:**

- `color` sempre per `currentColor` (heretat del contenidor); mai `color` com a prop numèric o hex.
- `size` per defecte 20 px (quadra bé amb l'alçada de línia del text base). Es poden fer servir també 16 (inline-small) i 24 (focal).
- Tota icona purament decorativa porta `aria-hidden="true"`. Si l'icona és el contingut *únic* d'un control (p. ex. un botó sense text visible), el control ha de tenir `aria-label`.
- Stroke amb el default de Lucide (2). No es canvia puntualment; si es volgués canviar, es fa globalment via prop al wrapper comú.

**Per què Lucide:** biblioteca oberta, mantenida, estil homogeni, tree-shakeable (un import = una icona al bundle), bon coverage funcional.

### 17.6 Motion (transicions i animacions)

**Principi:** tot canvi d'estat visible s'anima. Obrir/tancar menús, modals, panells, feedback d'encert/error, aparició de contingut després de càrrega, canvis de pàgina. La immediatesa "dura" es reserva per a interaccions tàctils directes (hover de focus bàsic).

**Tokens de motion** (definits a `src/styles/index.css` i exposats a Tailwind):

| Token                 | Valor                            | Ús                                                   |
| --------------------- | -------------------------------- | ---------------------------------------------------- |
| `--duration-fast`     | 120 ms                           | Hover, tap feedback, micro-canvis                    |
| `--duration-base`     | 220 ms                           | Obrir/tancar menús, popovers, tooltips               |
| `--duration-slow`     | 360 ms                           | Modals, transicions de pàgina, contingut gran        |
| `--ease-standard`     | `cubic-bezier(0.2, 0, 0, 1)`     | Transicions generals (accelera + decelera)           |
| `--ease-enter`        | `cubic-bezier(0, 0, 0, 1)`       | Entrada d'elements (només decelera)                  |
| `--ease-exit`         | `cubic-bezier(0.3, 0, 1, 1)`     | Sortida d'elements (només accelera)                  |
| `--ease-emphasized`   | `cubic-bezier(0.3, 0, 0, 1)`     | Canvis d'estat amb pes visual (accent)               |

Mapejats a Tailwind com a `transition-duration`, `transition-timing-function` i com a classes compostes reutilitzables (`.motion-enter`, `.motion-exit`, `.motion-hover`).

**Regles vinculants:**

1. **No `transition-none` ni `transition: none` implícits.** Si un element té un canvi d'estat, ha de tenir tokens de motion aplicats.
2. **No durades ni easings inline.** Sempre via tokens (`duration-base ease-standard`). Si el patró actual no hi és, s'afegeix com a token primer.
3. **`prefers-reduced-motion: reduce` es respecta globalment.** El CSS desactiva o escurça les animacions per a aquests usuaris (al bloc `@media (prefers-reduced-motion: reduce)` de `styles/index.css`).
4. **Mai s'anima `width` ni `height` directament** si es pot fer amb `transform` o `grid-template-rows` (patró `0fr → 1fr`). Són més barates i no forcen reflow.
5. **Animacions d'entrada i de sortida coherents:** si una cosa puja entrant, baixa sortint; si apareix des de la dreta, surt cap a la dreta.

**Patrons reutilitzables** (a `styles/index.css`, layer `components`):

- `.motion-hover` — transició `colors + opacity` amb `duration-fast ease-standard` per botons i enllaços.
- `.motion-panel` — `duration-base ease-standard` per panells i menús col·lapsables.
- `.motion-modal` — `duration-slow ease-emphasized` per modals.

Components d'exercici amb feedback (correcte/incorrecte) usen els mateixos tokens — això també garanteix que la resposta pedagògica se senti integrada, no un afegitó tècnic.

### 17.7 Claus de `localStorage` (taula completa)

| Clau                  | Contingut                 | Esquema                      |
| --------------------- | ------------------------- | ---------------------------- |
| `kompass.progress.v1` | Progrés d'usuari          | `UserProgress` (DM §3.5)     |
| `kompass.theme`       | Preferència de tema       | `"light" \| "dark"`          |
| `kompass.locale`      | Idioma de la UI           | `"ca" \| "es"`               |

Qualsevol canvi al `schemaVersion` d'alguna d'aquestes claus requereix migració (vegeu §2 de DATA-MODEL).

---

*Fi del document.*
