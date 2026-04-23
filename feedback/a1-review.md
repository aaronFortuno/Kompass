# Backlog de revisió A1 · Kompass

> Espai de notes mentre l'Aarón repassa cada lliçó amb lupa. L'objectiu
> és acumular observacions agrupades per tema perquè quan vulgui fer
> una sessió de polits, Claude tingui aquí el punt exacte del problema
> i la correcció desitjada.
> 
> No cal que sigui exhaustiu ni formal: prioritza anotar ràpidament. Ja
> filtrarem després.

## Com omplir-ho

Cada tema té tres caixes:

- **Contingut** — problemes de gramàtica, lèxic, traducció, exemples,
  ordre d'explicació, referències circulars, to editorial…
- **Tècnic** — coses que es mostren malament, bugs visuals, taules que
  no caben, àudios que no sonen, etc.
- **Estructural** — "aquest step va abans", "aquesta taula s'hauria de
  partir en dues", "aquest exercici està mal ubicat"…

Format suggerit per apunt:

```
- [step-id · beat 3/8] descripció del problema → correcció proposada
```

Per copiar la referència ràpidament, recorda la icona de copiar del
comptador del reader (p. ex. `A1a-5 · synthesis · 3/4`).

---

## A1a

### A1a-0 · Benvinguda

- **Contingut:** 
  - [✓] [A1a-0 · welcome · 5/6] "és profundament lògica." -> "és profundament lògic." (parla de l'idioma)
  - [✓] [A1a-0 · welcome · 6/6] el dibuix de la brúixola no té gaire sentit. De fet el footer ja ho diu "Imatge provisional"  — *fet: visual eliminat*
  - [✓] [A1a-0 · why-german-2 · 3/4] surt per primera vegada la paraula "cognat". No és una paraula molt habitual al vocabulari català comú, així que tenint en compte que la fem servir en força ocasions posteriorment crec que aquí afegeria una anotació al peu que ens digui que és un cognat. O això o un beat que ho aclareixi  — *fet: callout info "Què és un cognat?" afegit*
  - [✓] [A1a-0 · mindset · 7/7] revisar si "a un exercici" és correcte o hauria de ser "en un exercici". Tinc dubtes sobre la forma més correcta d'expressar-ho  — *fet: canviat a "en un exercici"*
  - [✓] [A1a-0 · pivot · 1/2] Aquesta pregunta juntament amb la següent costa una mica de veure-les enllaçades: I tu com ho faràs aquí? Fins aquí el per què. Ara, el com. Potser es pot reescriure d'una forma una mica més clara.  — *fet: heading "Com funciona Kompass" + lead més explícit sobre ritme/exercicis/progrés*
  - [A1a-0 · how-it-works · 3/4] aquí seria genial un svg animat de les fletxes del teclat o el swipe del dit al mòbil, ens mostraria claríssimament les eines de navegació. Si necessitem algun pas extra per parlar del mode autoplay, de l'efecte typewriter i les 3 coses més rellevants a nivell de settings val la pena aturar-s'hi. És l'onboarding tècnic i ho podem fer molt amable.  — *pendent: SVG animats requereixen sessió dedicada*
  - [A1a-0 · local-first · 4/4] aquí i en el punt anterior també trobo a faltar alguns svg animats blanc-negre- fons transparent  que il·lustrin això: dades locals, exportació, etc.  — *pendent: agrupat amb l'anterior en una sessió d'SVG animats per A1a-0*
  - [✓] [A1a-0 · begin · 5/6] Fem el "ich bin" que sigui audible (la gravació ja deu existir, suposo)  — *fet: `!!Ich bin!!` audible; si cal, el manifest el regenera automàticament*
  - [✓] [A1a-0 · begin · 6/6] No és només "la fletxa dreta", ja que tenim opció de clic a mòbil, o swipe, revisar-ho.  — *fet: "avança amb la fletxa dreta del teclat, un clic a la pantalla o un swipe cap amunt (a mòbil)"*
- **Tècnic:**
- **Estructural:**

### A1a-1 · Pronomen

- **Contingut:**
- **Tècnic:**
- **Estructural:**

### A1a-2 · Satzstruktur

- **Contingut:**
- **Tècnic:**
- **Estructural:**

### A1a-3 · Konjugation

- **Contingut:**
- **Tècnic:**
- **Estructural:**

### A1a-4 · Nein/Nicht/Kein

- **Contingut:**
- **Tècnic:**
- **Estructural:**

### A1a-5 · Artikels + Plural

- **Contingut:**
- **Tècnic:**
- **Estructural:**

### A1a-6 · Nominatiu/Acusatiu presentació

- **Contingut:**
- **Tècnic:**
- **Estructural:**

### A1a-7 · Possessivpronomen

- **Contingut:**
- **Tècnic:**
- **Estructural:**

### A1a-8 · Verbs separables

- **Contingut:**
- **Tècnic:**
- **Estructural:**

### A1a-9 · Komposita

- **Contingut:**
- **Tècnic:**
- **Estructural:**

### A1a-10..36

(Afegeix-ne les seccions que vagis trobant. No cal crear-les totes
per endavant — només les que tinguin feedback real.)

---

## A1a · Vocabulari

### A1a-V3 · Familie

- **Contingut:**
- **Tècnic:**
- **Estructural:**

### A1a-V5 · Farben

- **Contingut:**
- **Tècnic:**
- **Estructural:**

(V1 Zahlen, V2 Alphabet, V4 Länder, V6 Essen+Trinken, V7 Tagesablauf
s'afegiran a mesura que els integrem.)

---

## A1b

*(Estructures per omplir quan es revisin. Els temes A1b-11..20 estan
actualment en procés d'agent de revisió pedagògica + migració al
format ric.)*

---

## Tècnic global (no lligat a un tema)

### Reader

- **Bug:** 
  - [✓] En algunes situacions desactivem el mode automàtic a /settings però igualment arrenca el temporitzador per passar de pàgina. Crecq ue té a veure amb els àudios: esbrinar si és possible que encara uqe tinguem el mode automàtic de navegació entre beats, si hi ha un àudio que acaba de reproduir-se pot estar llançant un trigger que posa en marxa el temporitzador.  — *fet: derivada treta. `settings.autoPlay` és ara l'única font de veritat per l'auto-advance; `audioAutoplay` només reprodueix àudio*
  - [✓] En algunes ocasions el temporitzador automàtic es posa en marxa i encara que fem clic a la pantalla no s'atura. Quan la diapositiva següent no té àudios, si la config global és no mode automàtic llavors no actua el temporitzador. És estrany, sembla que hi ha alguna cosa lògica mal connectada en algun punt  — *fet: mateixa causa que l'anterior; amb la simplificació, el gate del click ara coincideix amb el gate del timer*
- **Polit:**

### Temari / Progrés / Home

- **Bug:**
- **Polit:**

### Accessibilitat / mobile

- **Bug:**
- **Polit:**

---

## Notes a llarg termini

### Nous tipus d'exercici

- [ ] Audio comprehension: diàleg/monòleg + identificar paraules o
  sentit. Schema amb `context: { type: "audioClip", src, transcript? }`
  i `questions[]` (cada question = interaction+validation pròpies).
- [ ] Reading comprehension: text llarg + múltiples preguntes sobre el
  mateix. Mateix patró que audio però amb `context.type = "longText"`.

### Rutes pedagògiques

- [ ] Disseny quan el contingut A1 estigui complet. Actualment el
  schema `LearningPath` (§3.4 DATA-MODEL) existeix però no hi ha cap
  ruta publicada.
