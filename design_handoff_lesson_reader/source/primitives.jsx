// Primitives compartides entre variacions.
// - parseInline: processa **bold** i ==highlight== (DATA-MODEL §3.6 del repo).
// - useTypewriter: animació typewriter.
// - CalloutIcon: icones simples Lucide-style (info/warning/tip/check/x).

function parseInline(text) {
  if (!text) return null;
  // Tokenize **bold**, _italic_, ==mark==, `code`
  const out = [];
  const re = /(\*\*[^*]+\*\*|==[^=]+==|_[^_]+_|`[^`]+`)/g;
  let last = 0, m, key = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) {
      out.push(<strong key={key++}>{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith("==")) {
      out.push(<mark key={key++} className="k-mark">{tok.slice(2, -2)}</mark>);
    } else if (tok.startsWith("_")) {
      out.push(<em key={key++}>{tok.slice(1, -1)}</em>);
    } else if (tok.startsWith("`")) {
      out.push(<code key={key++}>{tok.slice(1, -1)}</code>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function useTypewriter(text, { speed = 42, startDelay = 120, active = true } = {}) {
  // speed = ms per caràcter. Ara per defecte força més lent perquè es
  // percebi la presència del typewriter (era ~14 ms/char; ara 42 ms/char).
  const [n, setN] = React.useState(active ? 0 : (text || "").length);
  const [done, setDone] = React.useState(!active);
  React.useEffect(() => {
    if (!active) { setN((text || "").length); setDone(true); return; }
    setN(0); setDone(false);
    let raf, start;
    const total = (text || "").length;
    const step = (t) => {
      if (!start) start = t + startDelay;
      const elapsed = Math.max(0, t - start);
      const c = Math.min(total, Math.floor(elapsed / speed));
      setN(c);
      if (c < total) raf = requestAnimationFrame(step);
      else setDone(true);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [text, speed, startDelay, active]);
  return { text: (text || "").slice(0, n), done };
}

function Icon({ name, size = 18, stroke = 2 }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "info":
      return <svg {...common}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>;
    case "warning":
      return <svg {...common}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4M12 17h.01"/></svg>;
    case "tip":
      return <svg {...common}><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2Z"/></svg>;
    case "check":
      return <svg {...common}><path d="M20 6 9 17l-5-5"/></svg>;
    case "x":
      return <svg {...common}><path d="M18 6 6 18M6 6l12 12"/></svg>;
    case "arrow-right":
      return <svg {...common}><path d="M5 12h14M12 5l7 7-7 7"/></svg>;
    case "arrow-left":
      return <svg {...common}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>;
    case "dumbbell":
      return <svg {...common}><path d="M6.5 6.5 17.5 17.5M21 21l-1-1M3 3l1 1M18 22l4-4M2 6l4-4M3 10l7-7M14 21l7-7"/></svg>;
    case "award":
      return <svg {...common}><circle cx="12" cy="8" r="6"/><path d="m15.477 12.89 1.515 8.526-5-3-5 3 1.517-8.526"/></svg>;
    case "compass":
      return <svg {...common}><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>;
    case "book":
      return <svg {...common}><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>;
    case "ear":
      return <svg {...common}><path d="M6 8.5a6.5 6.5 0 1 1 13 0c0 6-6 6-6 10a3.5 3.5 0 1 1-7 0"/><path d="M15 8.5a2.5 2.5 0 0 0-5 0v1a2 2 0 0 1-2 2"/></svg>;
    case "sparkle":
      return <svg {...common}><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4"/></svg>;
    default: return null;
  }
}

function CalloutIcon({ variant }) {
  return <Icon name={variant === "warning" ? "warning" : variant === "tip" ? "tip" : "info"} size={16} />;
}

// Mesclar resultats d'exercici en un estat simple
function useExerciseState(itemCount) {
  const [state, setState] = React.useState({ idx: 0, answers: {}, revealed: {} });
  const answer = (i, val) => setState((s) => ({
    ...s,
    answers: { ...s.answers, [i]: val },
    revealed: { ...s.revealed, [i]: true },
  }));
  const next = () => setState((s) => ({ ...s, idx: Math.min(itemCount - 1, s.idx + 1) }));
  const prev = () => setState((s) => ({ ...s, idx: Math.max(0, s.idx - 1) }));
  const goto = (i) => setState((s) => ({ ...s, idx: Math.max(0, Math.min(itemCount - 1, i)) }));
  const reset = () => setState({ idx: 0, answers: {}, revealed: {} });
  return { state, answer, next, prev, goto, reset };
}

Object.assign(window, { parseInline, useTypewriter, Icon, CalloutIcon, useExerciseState });
