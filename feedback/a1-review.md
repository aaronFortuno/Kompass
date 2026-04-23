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
  - [A1a-0 · how-it-works · 5/5] podem mostrar aquest svg directament dins del beat [A1a-0 · how-it-works · 3/5], no per separat (eliminem Fragment 5 quan ho haguem fet)
  - [A1a-0 · local-first · 5/5] igual que abans, aquest SVG el volem al beat [A1a-0 · local-first · 3/5] (eliminem Fragment 5 quan ho haguem fet)
  - [pendent secundari] A1a-0 en general: el suggeriment d'afegir un pas sobre autoplay, typewriter i 3 settings rellevants com a onboarding tècnic queda anotat com a feina futura.
- **Tècnic:**
- **Estructural:**

### A1a-1 · Pronomen

- **Contingut:**
- **Tècnic:***
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

### A1a-V1 · Zahlen

- **Contingut:**
  - [synthesis · àudio "play all"] pendent — feature nova per un commit dedicat.
- **Tècnic:**
- **Estructural:**
  - *(Les taules de `teens` i `decenas` ja tenen tots els nombres audibles. El comentari queda cobert.)*

### A1a-V2 · Alphabet

- **Contingut:**
- **Tècnic:**
- **Estructural:**

### A1a-V3 · Familie

- **Contingut:**
- **Tècnic:**
- **Estructural:**

### A1a-V4 · Länder

- **Contingut:**
- **Tècnic:**
- **Estructural:**

### A1a-V5 · Farben

- **Contingut:**
- **Tècnic:**
- **Estructural:**

### A1a-V6 · Essen und Trinken

- **Contingut:**
- **Tècnic:**
- **Estructural:**

### A1a-V7 · Tagesablauf

- **Contingut:**
- **Tècnic:**
- **Estructural:**

---

## A1b

*(Estructures per omplir quan es revisin. Els temes A1b-11..20 estan
actualment en procés d'agent de revisió pedagògica + migració al
format ric.)*

---

## Tècnic global (no lligat a un tema)

### Reader

- **Bug:** 
  - *
- **Polit:**
  - Hem de decidir a les pàgines de parany com [A1a-1 · pitfalls · 3/6] si volem generar i reproduir àudios erronis o no, però fer-ho o mai o sempre. En aquesta lliçó tenim àudios d'exemples incorrectes, però en altres pitfalls no els tenim, pedagògicament no sé què val més la pena.  — *pendent de decisió teva*

### Temari / Progrés / Home

- **Bug:**
  - *
- **Polit:**
  - Si estem navegant pels beats amb fletxa avall - fletxa avall... quan arribem a un exercici amb múltiples preguntes, "fletxa avall" ens porta al següent beat en comptes de la següent pregunta. El comportament dins d'un exercici amb múltiples preguntes hauria de ser "següent pregunta". Fletxa avall també hauria de servir per l'acció de validar (ara ho fem amb enter o fletxa dreta)  — *pendent*
  - A l'índex del sidebar, les icones d'exercici: alienar-les verticalment amb les xifres del pas. I ara el layout de l'índex és a 2 "columnes", una amb les xifres de nombre de pas, i l'altra amb el nom del capítol. Crec que les separaria una mica entre elles i posaria una segona columna precisament amb la icona d'exercici, perquè quedaria més visible que com està ara. En capítols que tenen dues files la icona queda en una posició estranya, potser així ho podem resoldre elegantment (si no ja ho canviarem)  — *pendent*

### Accessibilitat / mobile

- **Bug:**
- **Polit:**
  - El flow per resoldre exercicis dropdown és una mica confús en general, sobretot quan venim de moure'ns amb teclat. Cal fer un plantejament de com ho volem fer perquè sigui intuïtiu. Ara mateix no ho definiria com intuïtiu, sincerament. No és que sigui molt difícil, però tampoc surt espontàniament. Bàsicament és tema de tabuladors, focus, funcionalitat de fletxes, etc. No sé com ho hem de resoldre, potser cal investigar com ho solucionen altres plataformes reconegudes.
- Músiques background que volem tenir pels loops d'estudi:
  - [Ocean wave loops | Royalty-free Music - Pixabay](https://pixabay.com/music/upbeat-ocean-wave-loops-377890/)
  - [Ocean wave loops | Royalty-free Music - Pixabay](https://pixabay.com/music/electronic-ocean-wave-loops-377887/)
  - [Soft Aesthetic Glow Lofi Background Music for Relax and Study | Royalty-free Music - Pixabay](https://pixabay.com/music/beats-soft-aesthetic-glow-lofi-background-music-for-relax-and-study-509719/)
  - [Quiet Evening in the Village – Peaceful Rural Ambience | Royalty-free Music - Pixabay](https://pixabay.com/music/celtic-quiet-evening-in-the-village-peaceful-rural-ambience-510903/)

### Estructural

- Segons la lliçó i segons l'agent que l'ha fet les rutes de url són en anglès, en català o fins i tot en castellà (desconec si alguna pot ser fins i tot en alemany). Cal homogeneïtzar-ho i que sigui consistent, ara és molt inconsistent.

- Alguns exercicis (com per exemple els de V1-Zahlen), en comptes de mostrar-nos sempre els mateixos nombres estaria bé disposar d'una bateria més àmplia de possibilitats i que aparegueissin aleatòriament. O si més no disposar d'un mode d'activitat "repàs" o "matxacar" que servís per fer molts exercicis d'un mateix tipus. Així que ens faltarà material aquí per tenir major diversitat.

- Mostrar a l'app les **fonts i llicències dels àudios, imatges i música** que fem servir. Ara tenim el detall a `attribution/` (v5-farben.md, v6-essen-trinken.md, v7-tagesablauf.md, music.md) però l'usuari no hi té accés visible. Proposta: una secció nova a l'AboutModal — "Crèdits" — amb la llista agrupada (veu TTS Azure Seraphina, fotos Unsplash + autors, música Pixabay + DesiFreeMusic, etc.). Generat automàticament des dels manifests si pot ser, no hardcoded.

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
