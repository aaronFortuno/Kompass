# CLAUDE.md · Kompass

> Instruccions per a sessions de Claude Code al repositori Kompass.
> Llegeix aquest document al començament de cada sessió nova.

---

## Què és Kompass

Kompass és una web d'autoaprenentatge d'alemany de nivell A1 (A1a + A1b, amb previsió d'A2 en el futur). És una SPA estàtica desplegada a GitHub Pages, pensada perquè l'usuari estudiï al seu ritme, en mode lliure o seguint rutes seqüencials.

**Audiència:** estudiants catalanoparlants d'alemany. Les explicacions i la UI són en català; el contingut d'estudi és alemany.

**Autor:** mestre de primària que programa com a hobby, amb experiència en projectes vanilla JS + Firebase. És estudiant actiu d'A1b, o sigui que el projecte també serveix com a eina personal. Publicat open source (MIT) a GitHub Pages.

**Filosofia:** zero fricció per a l'usuari (sense login, sense backend, funciona offline), contingut com a dades (afegir temes = afegir JSON, mai tocar React), mantenible en solitari.

---

## Documents canònics

**Llegeix aquests dos abans de canviar qualsevol cosa estructural:**

- [`DATA-MODEL.md`](https://claude.ai/chat/DATA-MODEL.md) — El *què*: entitats, tipus d'estímul/interacció/validació, format del progrés de l'usuari, esquema d'export/import. És la font de veritat per a l'estructura de dades.
- [`ARCHITECTURE.md`](https://claude.ai/chat/ARCHITECTURE.md) — El *com*: stack, estructura de carpetes, routing, gestió d'estat, build, deploy, convencions de codi, milestones.

**Regla d'or:** si una decisió estructural no està en aquests documents o en aquest CLAUDE.md, atura't. No improvisis. Consulta amb el desenvolupador, decidiu junts, i actualitzeu el document corresponent **abans** d'escriure codi. Els documents van primer, el codi segon.

---

## Stack (resum)

- **React 18** + **Vite 5** + **React Router 6** (HashRouter)
- **Zustand** per a gestió d'estat (amb `persist` middleware per a localStorage)
- **Tailwind CSS** per a estils
- **Zod** per a validació runtime dels JSON de contingut
- **Vitest** per a tests unitaris
- Deploy amb **GitHub Actions** a **GitHub Pages**

Base path: `/kompass/`. URLs amb hash per evitar problemes amb rutes profundes.

---

## Regles específiques per a Claude Code

### Sempre

1. **Llegeix DATA-MODEL.md i ARCHITECTURE.md al començament de cada sessió nova**, encara que creguis que els recordes. Poden haver canviat.
2. **Valida cada JSON de contingut amb Zod** abans de donar-lo per bo. L'script `npm run validate-content` existeix per això; crida'l en acabar qualsevol tasca que afegeixi contingut.
3. **Actualitza els documents abans del codi.** Si canvies un schema, DATA-MODEL.md s'actualitza abans que el Zod schema i abans dels components que el consumeixen.
4. **Mantén el criteri MVP.** El document ARCHITECTURE secció 15 diu què entra a l'MVP i què no. No ampliïs l'abast sense consulta.
5. **Fes commits atòmics i descriptius.** Un commit = un canvi lògic complet (p. ex. "Afegeix tema A1a-3 amb 4 exercicis", no "WIP").
6. **Escriu comentaris en català**, però noms de variables, funcions i fitxers en anglès. Els strings visibles a la UI passen pel sistema i18n (`t()`), no són literals al JSX.
7. **Tot estil consumeix tokens semàntics** (ARCHITECTURE §17.1). `bg-surface`, `text-content`, `rounded-md`, `shadow-soft`… Mai colors, mides ni radis hardcoded. Si cal un valor nou, primer s'afegeix als tokens.
8. **Tota cadena visible a la UI passa per `t('namespace.key')`** i la clau s'afegeix a `src/i18n/ca.json` i `src/i18n/es.json` (ARCHITECTURE §17.3). Excepció: noms propis i contingut d'estudi en alemany dins dels JSON de `src/data/`.
9. **El contingut didàctic (gramàtica, exemples, feedback pedagògic) el proporciona el desenvolupador.** La teva feina és estructurar-lo segons DATA-MODEL, no inventar-lo. Si detectes que en caldria més, pregunta; no ompliguis amb contingut propi.

### Mai

1. **No afegeixis dependències noves sense consultar.** Cada `npm install` nou és una decisió que cal documentar.
2. **No toquis el schema de persistència de `localStorage` sense bumpejar la versió** i proporcionar una migració a `src/lib/migrations/`.
3. **No introdueixis TypeScript al MVP.** S'adoptarà més endavant de forma gradual amb JSDoc + `checkJs` si escau.
4. **No creïs cap backend ni cap servei extern.** Si sembla que cal, és que s'està malentenent el requisit.
5. **No inventis ids de tema o exercici.** Segueixen un format estricte: `A1a-14`, `A1b-19-ex-02`. Documenta qualsevol novetat.
6. **No facis refactor "de passada".** Si detectes una millora, anota-la i pregunta abans de dur-la a terme en la mateixa sessió d'una feina diferent.
7. **No posis colors hex, `rgb()`, `hsl()`, ni mides amb píxels arbitraris als components.** Només tokens semàntics (§17.1). Si cal un color nou, actualitza `src/styles/index.css` i `tailwind.config.js`.
8. **No introdueixis llibreries d'i18n pesades** (react-i18next, FormatJS) sense consultar. El hook propi de `src/i18n/` cobreix les necessitats actuals.

---

## Convencions ràpides

| Element                   | Format                                                |
| ------------------------- | ----------------------------------------------------- |
| Components React          | `PascalCase.jsx`, un component per fitxer, funcional  |
| Hooks                     | `useXxx.js` amb prefix `use`                          |
| Utilitats a `lib/`        | `camelCase.js`                                        |
| Fitxers JSON de contingut | `kebab-case.json`                                     |
| Ids de tema               | `{level}{sublevel}-{number}` → `A1b-19`               |
| Ids d'exercici            | `{topicId}-ex-{number}` → `A1b-19-ex-02`              |
| Clau de localStorage      | `kompass.progress.v1` (progrés), `kompass.theme`, `kompass.locale` (§17.5 ARCH) |
| Alias d'imports           | `@` → `src/` (configurat a `vite.config.js`)          |
| Claus de i18n             | `namespace.subkey` camelCase → `nav.topics`, `home.ctaStart` |
| Tokens de color           | Classes Tailwind semàntiques: `bg-surface`, `text-content`, `text-accent`, `border-border` |

---

## Workflows comuns

### Afegir un tema nou

1. Crea `src/data/topics/{nivell}/{num}-{slug}.json` seguint el schema `Topic` de DATA-MODEL §3.1.
2. Crea la carpeta `src/data/exercises/{nivell}/{num}/` amb els fitxers JSON dels exercicis.
3. Si el tema pertany a eixos temàtics existents, referencia'ls al camp `axes`. Si cal un eix nou, afegeix-lo a `src/data/axes.json` i documenta-ho.
4. Executa `npm run validate-content`. Si falla, corregeix.
5. Comprova visualment al browser que el tema renderitza i els exercicis funcionen.
6. Commit: `Afegeix tema {id} ({title curt})`.

### Afegir un exercici a un tema existent

1. Crea el fitxer JSON a la carpeta d'exercicis del tema, amb id correlatiu.
2. Afegeix l'id al camp `exerciseIds` del JSON del tema.
3. Valida i prova.
4. Commit: `Afegeix exercici {id}`.

### Afegir un tipus d'interacció nou

Això és més invasiu i requereix planificació:

1. Obre consulta amb el desenvolupador. Justifica per què els 7 tipus existents no cobreixen el cas.
2. Si es confirma, actualitza DATA-MODEL §6 amb el nou tipus.
3. Actualitza el schema Zod a `src/lib/schemas/exercise.js`.
4. Crea el component a `src/components/exercise/interactions/`.
5. Afegeix la lògica de validació al validator.
6. Documenta la forma del `response` a ARCHITECTURE §9.
7. Escriu almenys un test unitari del nou cas.
8. Crea un exercici d'exemple per provar-ho.

### Afegir una clau de traducció

1. Afegeix la clau a `src/i18n/ca.json` amb la traducció catalana.
2. Afegeix-la també a `src/i18n/es.json`. Si no pots traduir, deixa-hi la versió catalana prefixada amb `[ca] ` per detectar-ho més tard.
3. Usa-la al component via `t('namespace.key')`.
4. Commit: `i18n: afegeix {namespace.key}`.

### Afegir un token de disseny

1. Defineix el valor cru a `src/styles/index.css` (bloc `:root` i, si canvia amb el tema, bloc `.dark`).
2. Exposa'l a Tailwind via `tailwind.config.js` amb un nom semàntic.
3. Usa'l a components com a classe Tailwind (`bg-nou-token`, `text-nou-token`).
4. Actualitza ARCHITECTURE §17.1 si la categoria és nova.
5. Commit: `tokens: afegeix {nom}`.

### Afegir una ruta d'aprenentatge

1. Crea el fitxer a `src/data/paths/{id}.json` seguint el schema `LearningPath` de DATA-MODEL §3.4.
2. Valida.
3. Commit.

### Fer un release

1. Tots els tests passen (`npm run test`).
2. `npm run validate-content` passa.
3. `npm run build` genera sense warnings.
4. Bump de versió a `package.json`.
5. Push a `main` — el workflow de GitHub Actions desplega automàticament.

---

## Comandes disponibles

```bash
npm run dev                 # Servidor de desenvolupament
npm run build               # Build de producció a ./dist
npm run preview             # Prova el build localment
npm run test                # Tests unitaris amb Vitest
npm run validate-content    # Valida tots els JSON amb Zod
npm run lint                # (si es configura ESLint)
```

---

## Context del desenvolupament

- **Llengua principal de comunicació:** català.
- **Moment del curs:** el desenvolupador està actualment al bloc 2 d'A1b (preposicions i casos). Els temes que més li costen són els que millor pot dissenyar pedagògicament, però també són els que més suscitables són a errors. Cal contrast amb fonts externes estàndard (Deutsche Welle, Goethe-Institut, dwds.de) per a continguts de gramàtica.
- **Cadència esperada:** sessions curtes, entregues petites. Millor 3 sessions amb 1 entregable cadascuna que 1 sessió amb 3 entregables barrejats.

---

## Quan dubtis

- **Si el model de dades no sap com representar una cosa:** atura't, documenta-ho com a pregunta, consulta.
- **Si veus que caldria una decisió arquitectònica nova:** atura't, documenta-ho, consulta.
- **Si detectes inconsistències entre DATA-MODEL.md, ARCHITECTURE.md i el codi:** avisa. El codi no és mai la font de veritat.
- **Si tens una proposta de millora fora de l'abast de la feina actual:** anota-la però no la facis. Proposa-la al final.

---

*Última actualització: inici del projecte. Aquest document evoluciona a mesura que Kompass creix.*
