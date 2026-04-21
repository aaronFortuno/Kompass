// Shell global — tema i utilitats compartides.
// El reader (VariantFocus) té el seu propi estat local de tema que també
// llegeix "kompass-theme" de localStorage. Així tots dos es sincronitzen.

function useTheme() {
  const [theme, setTheme] = React.useState(() => {
    try {
      const saved = localStorage.getItem("kompass-theme");
      if (saved === "light" || saved === "dark") return saved;
    } catch {}
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  });
  React.useEffect(() => {
    try { localStorage.setItem("kompass-theme", theme); } catch {}
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);
    // Avisem a altres components que llegeixen el mateix storage (ex. el reader)
    window.dispatchEvent(new CustomEvent("kompass-theme-change", { detail: theme }));
  }, [theme]);
  // Escoltem canvis fets per altres components (ex. el toggle dins el reader)
  React.useEffect(() => {
    const onExt = (e) => {
      const v = e.detail || (() => {
        try { return localStorage.getItem("kompass-theme"); } catch { return null; }
      })();
      if ((v === "light" || v === "dark") && v !== theme) setTheme(v);
    };
    window.addEventListener("kompass-theme-change", onExt);
    window.addEventListener("storage", onExt);
    return () => {
      window.removeEventListener("kompass-theme-change", onExt);
      window.removeEventListener("storage", onExt);
    };
  }, [theme]);
  return [theme, setTheme];
}

// Rutes hash-based simples: #/path/to/thing
function useHashRoute() {
  const [hash, setHash] = React.useState(() =>
    typeof window !== "undefined" ? (window.location.hash || "#/home") : "#/home"
  );
  React.useEffect(() => {
    const onHash = () => setHash(window.location.hash || "#/home");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const navigate = (to) => { window.location.hash = to; };
  // Ruta sense el "#" inicial
  const path = hash.replace(/^#/, "") || "/home";
  return { hash, path, navigate };
}

// Progrés global fictici per demostració (en producció vindria d'API/store)
const MOCK_PROGRESS = {
  "A1a-1": { done: 0.6, lastStep: 6 },
  "A1a-2": { done: 0.1, lastStep: 1 },
  "A1a-3": { done: 0, lastStep: 0 },
  "A1b-1": { done: 0, lastStep: 0 },
};

// Index del temari (estructura del curs)
const SYLLABUS = [
  {
    level: "A1", title: "Alemany · Principiant",
    blurb: "Sistema de pronoms, present d'indicatiu, vocabulari bàsic, situacions quotidianes.",
    chapters: [
      {
        id: "A1a", title: "A1a · Fonaments", subtitle: "Persones, pronoms, present",
        topics: [
          { id: "A1a-1", title: "Pronomen", subtitle: "Personals i possessius", minutes: 18 },
          { id: "A1a-2", title: "Sein & Haben", subtitle: "Els dos verbs bàsics", minutes: 22 },
          { id: "A1a-3", title: "Regular verbs", subtitle: "Present d'indicatiu", minutes: 20 },
        ],
      },
      {
        id: "A1b", title: "A1b · Descriure el món", subtitle: "Substantius, gènere, article",
        topics: [
          { id: "A1b-1", title: "Der / Die / Das", subtitle: "Gèneres i article definit", minutes: 20 },
          { id: "A1b-2", title: "Plurals", subtitle: "Formació del plural", minutes: 18 },
        ],
      },
    ],
  },
  {
    level: "A2", title: "Alemany · Bàsic",
    blurb: "Passat simple, preposicions, subordinades bàsiques.",
    chapters: [
      { id: "A2a", title: "A2a · Passat", subtitle: "Perfekt i Präteritum", topics: [] },
    ],
  },
];

// ---------- SETTINGS GLOBALS ----------
// Centralitzem aquí els ajustos que afecten el reader. Persistim a localStorage
// sota "kompass-settings". El reader els llegeix via useSettings().
const SETTINGS_KEY = "kompass-settings";
const DEFAULT_SETTINGS = {
  textScale: 1.0,          // 0.85 — 1.25
  studyMode: "fragment",   // "fragment" | "full"
  typewriter: true,        // efecte typewriter al primer beat
  tableAnim: true,         // animació fila-a-fila a les taules
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch { return { ...DEFAULT_SETTINGS }; }
}

function useSettings() {
  const [settings, setSettings] = React.useState(loadSettings);
  React.useEffect(() => {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch {}
    window.dispatchEvent(new CustomEvent("kompass-settings-change", { detail: settings }));
  }, [settings]);
  React.useEffect(() => {
    const onExt = (e) => {
      const v = e.detail || loadSettings();
      setSettings((prev) => {
        // Evitar bucles: només actualitzar si realment canvia
        const same = Object.keys(DEFAULT_SETTINGS).every(k => prev[k] === v[k]);
        return same ? prev : { ...prev, ...v };
      });
    };
    window.addEventListener("kompass-settings-change", onExt);
    window.addEventListener("storage", onExt);
    return () => {
      window.removeEventListener("kompass-settings-change", onExt);
      window.removeEventListener("storage", onExt);
    };
  }, []);
  const update = (patch) => setSettings((s) => ({ ...s, ...patch }));
  const reset = () => setSettings({ ...DEFAULT_SETTINGS });
  return [settings, update, reset];
}

Object.assign(window, { useTheme, useHashRoute, useSettings, MOCK_PROGRESS, SYLLABUS, DEFAULT_SETTINGS });
