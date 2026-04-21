// Dades reals del tema A1a-1 (Pronomen) del repositori Kompass.
// Extret de src/data/topics/a1a/01-pronomen.json + exercicis associats.
// He abreujat algunes explicacions per adaptar-les al format píndola
// sense perdre l'estructura (cada bloc manté el seu "pes pedagògic").

const TOPIC = {
  id: "A1a-1",
  level: "A1",
  sublevel: "a",
  number: 1,
  title: "Pronomen",
  subtitle: "pronoms",
  description: "Pronoms personals (ich, du, er…) i possessius (mein, dein, sein…) amb comparativa ES/CA/DE/EN.",
  axes: ["pronoms-verbs"],
  steps: [
    {
      id: "intro",
      kind: "narrative",
      heading: "Context i motivació",
      lead: "Els pronoms són, literalment, les paraules que fem servir **en lloc del nom**.",
      body:
        "Quan vols dir «jo em dic Anna», «tu ets estudiant» o «ella viu a Berlín», el pronom (jo, tu, ella) és la primera peça de la frase. Per això, si comences a aprendre alemany, els pronoms són **l'eina número u**: sense ells, no pots ni presentar-te ni parlar d'algú altre.",
      points: [
        "**Pronoms personals** (_Personalpronomen_): _ich, du, er, sie, es, wir, ihr, sie, Sie_. Indiquen **qui** fa o és alguna cosa.",
        "**Pronoms possessius** (_Possessivpronomen_): _mein, dein, sein, ihr…_ Indiquen **de qui** és alguna cosa.",
      ],
      examples: [
        { de: "Ich heiße Marc.", ca: "Em dic Marc." },
        { de: "Mein Name ist Marc.", ca: "El meu nom és Marc." },
        { de: "Wie ist Ihre Telefonnummer?", ca: "Quin és el seu telèfon, de Vostè?" },
      ],
      callout: {
        variant: "info",
        title: "Substantius en majúscula",
        body: "En alemany, **tots els substantius** s'escriuen amb majúscula inicial, sempre. Per això veuràs _Name, Adresse, Telefonnummer_ amb majúscula.",
      },
    },
    {
      id: "personal-singular",
      kind: "narrative",
      heading: "Singular: jo, tu, ell/ella/això",
      lead: "La persona gramatical indica de qui parlem. Primera persona = jo. Segona = tu. Tercera = algú altre.",
      body: "Els pronoms personals alemanys són set formes, igual que en català.",
      tabs: [
        {
          pron: "ich",
          gloss: "jo",
          note: "A diferència del català (_jo_), **_ich_ s'escriu sempre en minúscula**, fins i tot al mig de la frase.",
          example: { de: "Ich bin Student.", ca: "Sóc estudiant." },
        },
        {
          pron: "du",
          gloss: "tu",
          note: "El tracte **informal**: amics, família, companys joves, nens.",
          example: { de: "Du heißt Anna.", ca: "Et dius Anna." },
        },
        {
          pron: "er",
          gloss: "ell",
          note: "Masculí. L'alemany **sí que distingeix gènere** a la 3a persona singular.",
          example: { de: "Er kommt aus Berlin.", ca: "Ell ve de Berlín." },
        },
        {
          pron: "sie",
          gloss: "ella",
          note: "Femení. No confondre amb _sie_ «ells» ni _Sie_ «Vostè».",
          example: { de: "Sie wohnt in Barcelona.", ca: "Ella viu a Barcelona." },
        },
        {
          pron: "es",
          gloss: "això",
          note: "Neutre. L'alemany té **tres gèneres**: _es_ s'usa per a substantius neutres com _das Buch_.",
          example: { de: "Es ist neu.", ca: "És nou." },
        },
      ],
      callout: {
        variant: "warning",
        title: "Els gèneres no sempre coincideixen",
        body: "En català «el llibre» és masculí, però en alemany _das Buch_ és **neutre**. Quan parles d'un objecte neutre, _es_ pot voler dir «ell» o «ella» en la traducció catalana.",
      },
    },
    {
      id: "personal-plural",
      kind: "narrative",
      heading: "Plural i cortesia",
      lead: "L'alemany no distingeix masculí/femení al plural, però sí formal/informal.",
      tabs: [
        {
          pron: "wir",
          gloss: "nosaltres",
          note: "Sense distinció de gènere (a diferència del castellà _nosotros/nosotras_).",
          example: { de: "Wir lernen Deutsch.", ca: "Estudiem alemany." },
        },
        {
          pron: "ihr",
          gloss: "vosaltres",
          note: "Plural **informal** de _du_.",
          example: { de: "Ihr seid jung.", ca: "Sou joves." },
        },
        {
          pron: "sie",
          gloss: "ells/elles",
          note: "Sense distinció de gènere.",
          example: { de: "Sie wohnen in München.", ca: "Viuen a Munic." },
        },
        {
          pron: "Sie",
          gloss: "Vostè / Vostès",
          note: "Forma de **cortesia**. Sempre amb majúscula. Val tant per 1 persona com per diverses.",
          example: { de: "Wie heißen Sie?", ca: "Com es diu, Vostè?" },
        },
      ],
      callout: {
        variant: "tip",
        title: "Quan dubtis, formal",
        body: "Errar pel costat formal mai ofèn; tractar algú de _du_ sense confiança sí que pot quedar brusc.",
      },
    },
    {
      id: "check-personal",
      kind: "exercise",
      exerciseId: "A1a-1-ex-01",
      variant: "quick-check",
    },
    {
      id: "possessive-concordance",
      kind: "narrative",
      heading: "Els possessius: doble concordança",
      lead: "El possessiu alemany concorda amb el **substantiu posseït**, no amb el posseïdor.",
      body: "Cada pronom personal té el seu possessiu corresponent:",
      pairs: [
        { personal: "ich", possessive: "mein-", gloss: "el meu / la meva" },
        { personal: "du", possessive: "dein-", gloss: "el teu / la teva" },
        { personal: "er", possessive: "sein-", gloss: "el seu / la seva (d'ell)" },
        { personal: "sie (ella)", possessive: "ihr-", gloss: "el seu / la seva (d'ella)" },
        { personal: "Sie (vostè)", possessive: "Ihr-", gloss: "el seu / la seva (de Vostè)" },
      ],
      rule: [
        "Davant de substantiu **masculí o neutre** → forma curta: _mein, dein, sein, ihr, Ihr_.",
        "Davant de substantiu **femení** → forma amb **-e**: _meine, deine, seine, ihre, Ihre_.",
      ],
      examples: [
        { de: "**Mein** Name ist Anna.", ca: "(der Name, masculí)" },
        { de: "**Meine** Adresse ist…", ca: "(die Adresse, femení)" },
      ],
    },
    {
      id: "check-possessive",
      kind: "exercise",
      exerciseId: "A1a-1-ex-02",
      variant: "quick-check",
    },
    {
      id: "sein-vs-ihr",
      kind: "narrative",
      heading: "El cas delicat: sein vs ihr",
      lead: "En català, «el seu nom» no distingeix posseïdor. **L'alemany sí.**",
      comparison: [
        { es: "su nombre (de él)", ca: "el seu nom (d'ell)", de: "==s==ein Name", en: "his name" },
        { es: "su nombre (de ella)", ca: "el seu nom (d'ella)", de: "i==hr== Name", en: "her name" },
        { es: "su dirección (de él)", ca: "la seva adreça (d'ell)", de: "==s==eine Adresse", en: "his address" },
        { es: "su dirección (de ella)", ca: "la seva adreça (d'ella)", de: "i==hr==e Adresse", en: "her address" },
      ],
      rule: [
        "La **s** inicial de _sein_ marca «d'ell».",
        "El digraf **hr** al mig de _ihr_ marca «d'ella» (pensa en anglès _her_).",
      ],
      callout: {
        variant: "tip",
        title: "Dues preguntes, cada cop",
        body: "**1.** Qui posseeix, és home o dona? → tria entre _sein-_ i _ihr-_.  \n**2.** Què es posseeix, és masculí/neutre o femení? → afegeix o no la _-e_ final.",
      },
    },
    {
      id: "check-sein-vs-ihr",
      kind: "exercise",
      exerciseId: "A1a-1-ex-03",
      variant: "quick-check",
    },
    {
      id: "pitfalls",
      kind: "narrative",
      heading: "Paranys habituals",
      lead: "Errors típics dels catalanoparlants. Coneix-los per avançat.",
      pitfalls: [
        {
          bad: "Anna und **sein** Name",
          good: "Anna und **ihr** Name",
          why: "Anna és dona → _ihr_.",
        },
        {
          bad: "**mein** Adresse",
          good: "**meine** Adresse",
          why: "die Adresse és femení → cal _-e_.",
        },
        {
          bad: "**meine** Name",
          good: "**mein** Name",
          why: "der Name és masculí → forma curta.",
        },
        {
          bad: "Heute bin **Ich** müde.",
          good: "Heute bin **ich** müde.",
          why: "_ich_ sempre minúscula al mig de frase.",
        },
      ],
    },
    {
      id: "assessment",
      kind: "exercise",
      exerciseId: "A1a-1-ex-04",
      variant: "assessment",
    },
    {
      id: "synthesis",
      kind: "synthesis",
      heading: "Síntesi",
      tables: [
        {
          title: "Personalpronomen",
          headers: ["Persona", "Pronom"],
          rows: [
            ["1a sg.", "**ich**"],
            ["2a sg.", "**du**"],
            ["3a sg. (m./f./n.)", "**er / sie / es**"],
            ["1a pl.", "**wir**"],
            ["2a pl.", "**ihr**"],
            ["3a pl.", "**sie**"],
            ["Cortesia", "**Sie**"],
          ],
        },
        {
          title: "Possessivpronomen",
          headers: ["m./n.", "fem."],
          rows: [
            ["**mein**", "**meine**"],
            ["**dein**", "**deine**"],
            ["**sein** · **ihr**", "**seine** · **ihre**"],
            ["**Ihr**", "**Ihre**"],
          ],
        },
      ],
    },
  ],
};

// Exercicis reals (A1a-1-ex-01 … ex-04) del repo, simplificats per al prototip.
// Cada slot/blank té un enunciat frase-a-frase, perquè el mode "pregunta a
// pregunta" pugui presentar-los d'un en un en comptes de tots junts.
const EXERCISES = {
  "A1a-1-ex-01": {
    id: "A1a-1-ex-01",
    title: "Els pronoms personals en context",
    prompt: "Escriu el pronom personal correcte.",
    interaction: "typeIn",
    items: [
      {
        before: "Hallo, ",
        after: " heiße Marc.",
        answer: "ich",
        hint: "1a sg. (jo) — minúscula!",
      },
      {
        before: "Das ist Anna, und hier wohnt ",
        after: ".",
        answer: "sie",
        hint: "3a sg. femení (ella)",
      },
      {
        before: "Entschuldigung, wie heißen ",
        after: "?",
        answer: "Sie",
        hint: "cortesia (Vostè) — majúscula",
      },
      {
        before: "In Kompass lernen ",
        after: " Deutsch.",
        answer: "wir",
        hint: "1a pl. (nosaltres)",
      },
    ],
  },
  "A1a-1-ex-02": {
    id: "A1a-1-ex-02",
    title: "Mein o meine?",
    prompt: "Tria la forma correcta del possessiu de 1a persona.",
    interaction: "singleChoice",
    items: [
      {
        sentence: "__ Name ist Marc.",
        options: ["mein", "meine"],
        answer: "mein",
        hint: "der Name, masculí",
      },
      {
        sentence: "__ Adresse ist Hauptstraße 5.",
        options: ["mein", "meine"],
        answer: "meine",
        hint: "die Adresse, femení",
      },
      {
        sentence: "__ Vorname ist Anna.",
        options: ["mein", "meine"],
        answer: "mein",
        hint: "der Vorname, masculí",
      },
      {
        sentence: "__ Telefonnummer ist 030 12345.",
        options: ["mein", "meine"],
        answer: "meine",
        hint: "die Telefonnummer, femení",
      },
    ],
  },
  "A1a-1-ex-03": {
    id: "A1a-1-ex-03",
    title: "Sein, Seine, Ihr o Ihre?",
    prompt: "Aplica la doble concordança: qui posseeix i què es posseeix.",
    interaction: "singleChoice",
    items: [
      {
        sentence: "Das ist Markus. __ Name ist Markus Weber.",
        options: ["Sein", "Seine", "Ihr", "Ihre"],
        answer: "Sein",
        hint: "ell + der Name",
      },
      {
        sentence: "__ Adresse ist Hauptstraße 5.",
        options: ["Sein", "Seine", "Ihr", "Ihre"],
        answer: "Seine",
        hint: "ell + die Adresse",
      },
      {
        sentence: "Das ist Anna. __ Vorname ist Anna.",
        options: ["Sein", "Seine", "Ihr", "Ihre"],
        answer: "Ihr",
        hint: "ella + der Vorname",
      },
      {
        sentence: "__ Telefonnummer ist 030 12345.",
        options: ["Sein", "Seine", "Ihr", "Ihre"],
        answer: "Ihre",
        hint: "ella + die Telefonnummer",
      },
    ],
  },
  "A1a-1-ex-04": {
    id: "A1a-1-ex-04",
    title: "Avaluació: pronoms en context",
    prompt: "Tria el pronom que correspon a cada frase.",
    interaction: "singleChoice",
    items: [
      {
        sentence: "__ bin aus Spanien. (jo)",
        options: ["Ich", "Du", "Er", "Sie"],
        answer: "Ich",
      },
      {
        sentence: "Wie heißt __? (tu, informal)",
        options: ["Sie", "du", "ihr", "er"],
        answer: "du",
      },
      {
        sentence: "Das ist Paul. __ kommt aus Köln.",
        options: ["Sie", "Es", "Er", "Du"],
        answer: "Er",
      },
      {
        sentence: "__ Name ist Frau Schmidt? (de Vostè)",
        options: ["Ihr", "Ihre", "Sein", "Seine"],
        answer: "Ihr",
      },
    ],
  },
};

Object.assign(window, { TOPIC, EXERCISES });
