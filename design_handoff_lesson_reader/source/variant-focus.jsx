// Variació 1 — Focus Mode v2 (Editorial refinat, beats)
// Cada step es talla en una seqüència de "beats" (fragments petits).
// Un beat = una idea. Només es mostra un beat alhora, gran.
// Typewriter lent a TOTS els beats textuals. Fletxes ← → del teclat
// naveguen entre beats i entre steps.

const IS_MAC = typeof navigator !== "undefined" && /Mac|iP(hone|ad|od)/.test(navigator.platform || navigator.userAgent);
const MODKEY = IS_MAC ? "⌘" : "Ctrl";

function VariantFocus({ artboard = false }) {
  const [stepIdx, setStepIdx] = React.useState(0);
  const [beatIdx, setBeatIdx] = React.useState(0);
  // Tema i settings globals (gestionats pel shell)
  const [theme] = (typeof useTheme === "function") ? useTheme() : [typeof document !== "undefined" ? document.documentElement.getAttribute("data-theme") || "light" : "light"];
  const [settings] = (typeof useSettings === "function") ? useSettings() : [{ textScale: 1, studyMode: "fragment", typewriter: true, tableAnim: true }];
  const rootRef = React.useRef(null);
  // Intent delegat cap als exercicis: quan un step és exercise i l'usuari
  // prem ← → fora dels inputs, cal que l'exercici "capturi" la fletxa.
  const exerciseApiRef = React.useRef(null);

  const step = TOPIC.steps[stepIdx];
  const total = TOPIC.steps.length;
  const beats = React.useMemo(() => buildBeats(step), [step]);
  const beat = beats[Math.min(beatIdx, beats.length - 1)];
  const isFullMode = settings.studyMode === "full";

  const goStep = (d) => {
    const next = Math.max(0, Math.min(total - 1, stepIdx + d));
    if (next === stepIdx) return;
    setStepIdx(next);
    setBeatIdx(d > 0 ? 0 : 0); // sempre comencem pel primer beat
  };

  const goBeat = (d) => {
    // Si som a un step d'exercici i l'exercici té API, delega la fletxa dins ell.
    if (step.kind === "exercise" && exerciseApiRef.current) {
      const handled = exerciseApiRef.current.handleArrow(d);
      if (handled) return;
      // Si l'exercici diu "no capturat", deixem passar al següent/anterior step.
    }
    // Mode "pas complet": no hi ha navegació per beats; ← → salten de step.
    if (isFullMode) {
      const next = Math.max(0, Math.min(total - 1, stepIdx + d));
      if (next === stepIdx) return;
      setStepIdx(next);
      setBeatIdx(0);
      return;
    }
    const ni = beatIdx + d;
    if (ni < 0) {
      if (stepIdx === 0) return;
      const prevStep = TOPIC.steps[stepIdx - 1];
      const prevBeats = buildBeats(prevStep);
      setStepIdx(stepIdx - 1);
      setBeatIdx(prevBeats.length - 1);
    } else if (ni >= beats.length) {
      if (stepIdx === total - 1) return;
      setStepIdx(stepIdx + 1);
      setBeatIdx(0);
    } else {
      setBeatIdx(ni);
    }
  };

  // "Blocs": un bloc comença a cada narrative/synthesis step i inclou tots
  // els exercicis que el segueixen fins a la propera narrativa.
  const blockStarts = React.useMemo(() => {
    const starts = [];
    TOPIC.steps.forEach((s, i) => {
      if (s.kind !== "exercise") starts.push(i);
    });
    return starts;
  }, []);

  // Index del bloc actual (el blockStart <= stepIdx més gran)
  const currentBlock = React.useMemo(() => {
    let b = 0;
    for (let i = 0; i < blockStarts.length; i++) {
      if (blockStarts[i] <= stepIdx) b = i;
    }
    return b;
  }, [stepIdx, blockStarts]);

  const goBlock = (d) => {
    if (d > 0) {
      // Següent bloc: salta al primer step del bloc següent (o final)
      const next = blockStarts[currentBlock + 1];
      if (next != null) { setStepIdx(next); setBeatIdx(0); }
    } else {
      // Anterior: si no som a l'inici del bloc actual, tornem a l'inici.
      // Si ja hi som, saltem a l'inici del bloc anterior.
      if (stepIdx !== blockStarts[currentBlock]) {
        setStepIdx(blockStarts[currentBlock]); setBeatIdx(0);
      } else if (currentBlock > 0) {
        setStepIdx(blockStarts[currentBlock - 1]); setBeatIdx(0);
      }
    }
  };

  const goStepNav = (d) => {
    // Ctrl + fletxa: step anterior/següent (ignora beats)
    const next = Math.max(0, Math.min(total - 1, stepIdx + d));
    if (next === stepIdx) return;
    setStepIdx(next);
    setBeatIdx(0);
  };

  // Touch swipe (mobile): swipe horitzontal navega per beats.
  // Evitem conflictes quan l'usuari interactua amb un input o un botó d'opció.
  const touchRef = React.useRef({ x: 0, y: 0, t: 0, active: false });
  const onTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY, t: Date.now(), active: true };
  };
  const onTouchEnd = (e) => {
    if (!touchRef.current.active) return;
    touchRef.current.active = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchRef.current.x;
    const dy = t.clientY - touchRef.current.y;
    const dt = Date.now() - touchRef.current.t;
    // Fling: min 50px, dominant horizontal, fast enough
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.2 || dt > 800) return;
    // Ignora si el gest comença dins un input (escriure)
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (["input", "textarea", "select"].includes(tag)) return;
    goBeat(dx < 0 ? 1 : -1);
  };

  //   ← →                        : beat prev/next (inline typewriter)
  //   Ctrl/Cmd + ← →              : step prev/next
  //   Ctrl/Cmd + Shift + ← →      : block prev/next (salta per lliçons)
  // Capture:true + stopPropagation perquè el DesignCanvas overlay no
  // canviï d'artboard en fullscreen.
  React.useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      const inInput = ["input", "textarea", "select"].includes(tag);
      const mod = e.ctrlKey || e.metaKey;
      if (!(e.key === "ArrowRight" || e.key === "ArrowLeft")) return;

      // Dins d'un input, només actuem si hi ha modificador — deixem que
      // ← → moguin el cursor com és habitual.
      if (inInput && !mod) return;

      const d = e.key === "ArrowRight" ? 1 : -1;
      e.preventDefault(); e.stopPropagation();
      if (mod && e.shiftKey) {
        goBlock(d);
      } else if (mod) {
        goStepNav(d);
      } else {
        goBeat(d);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [stepIdx, beatIdx, beats.length, currentBlock, blockStarts]);

  return (
    <div className="kf-root" ref={rootRef} data-theme={theme} style={{ width: "100%", height: "100%" }}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <style>{`
        .kf-root{
          /* Light tokens (per defecte) */
          --ink:#1b1d22; --ink-2:#4b4f58; --muted:#8b8e95;
          --paper:#f6f2ea; --paper-2:#ece5d6; --rule:#d9d0bd;
          --accent:#3a2e1f; --mark:#e8d36a;
          --ok:#1f6a3a; --bad:#8b2a1e;
          --ok-bg:#e8f5ea; --bad-bg:#fce8e4;
          --kbd-bg:#ffffff;
          --kf-scale: var(--kf-type-scale, 1);
          font-family:'Newsreader', Georgia, serif;
          background: var(--paper); color: var(--ink);
          display:flex; flex-direction:column; height:100%;
          overflow:hidden; position:relative;
          transition: background .25s ease, color .25s ease;
        }
        .kf-root[data-theme="dark"]{
          /* Dark tokens: negre càlid, tipus biblioteca a mitja llum */
          --ink:#f1ece0; --ink-2:#c8c2b2; --muted:#858177;
          --paper:#141210; --paper-2:#1d1a16; --rule:#3a342a;
          --accent:#e8d9b8; --mark:#d6b53a;
          --ok:#6fbb7e; --bad:#e8806f;
          --ok-bg:#1a2a1e; --bad-bg:#2a1a16;
          --kbd-bg:#1d1a16;
        }
        .kf-root *{ box-sizing:border-box; }

        .kf-head{
          display:flex; align-items:center; justify-content:space-between;
          padding:16px 36px; border-bottom:1px solid var(--rule);
          font-family:'IBM Plex Mono', ui-monospace, monospace;
          font-size:11px; letter-spacing:.14em; text-transform:uppercase;
          color:var(--ink-2); flex-shrink:0;
        }
        .kf-head .kf-logo{display:flex;align-items:center;gap:8px;color:var(--ink);}
        .kf-head b{font-family:'Newsreader',serif; font-weight:600; font-size:15px; letter-spacing:0; text-transform:none;}
        .kf-title{font-family:'Newsreader',serif; font-style:italic; font-size:15px; text-transform:none; letter-spacing:0; color:var(--ink);}

        .kf-head-right{display:flex; align-items:center; gap:18px;}
        .kf-theme{
          width:32px; height:32px; border-radius:16px; border:1px solid var(--rule);
          background:transparent; color:var(--ink-2); cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          transition: background .15s, color .15s, border-color .15s;
          flex-shrink:0;
        }
        .kf-theme:hover{background:var(--paper-2); color:var(--ink); border-color:var(--ink-2);}

        /* Progrés: dues files. Ara diferenciem visualment narrative /
           quick-check / assessment i permetem clic + tooltip. */
        .kf-progress{display:flex; flex-direction:column; align-items:flex-end; gap:6px;}
        .kf-progress .row-steps{display:flex; align-items:center; gap:8px;}
        .kf-progress .block-sep{
          width:1px; height:14px; background:var(--rule); margin:0 4px;
          align-self:center; display:inline-block;
        }
        .kf-progress .step{
          width:10px; height:10px; padding:0; border:none; background:transparent;
          display:flex; align-items:center; justify-content:center; cursor:pointer;
          position:relative;
        }
        .kf-progress .step .glyph{
          width:8px; height:8px; background:var(--rule); border-radius:50%;
          transition: background .18s, transform .18s;
        }
        /* Narrative: cercle. Quick-check: triangle. Assessment: quadrat rotat (rombe). */
        .kf-progress .step.kind-exercise .glyph{
          width:0; height:0; background:transparent; border-radius:0;
          border-left:5px solid transparent; border-right:5px solid transparent;
          border-bottom:9px solid var(--rule);
        }
        .kf-progress .step.kind-assessment .glyph{
          width:10px; height:10px; background:var(--rule); border-radius:1px;
          transform: rotate(45deg);
        }
        .kf-progress .step.done .glyph{background:var(--ink-2);}
        .kf-progress .step.kind-exercise.done .glyph{border-bottom-color:var(--ink-2); background:transparent;}
        .kf-progress .step.active .glyph{background:var(--ink); transform:scale(1.3);}
        .kf-progress .step.kind-exercise.active .glyph{
          border-bottom-color:var(--ink); background:transparent; transform:scale(1.25);
        }
        .kf-progress .step.kind-assessment.active .glyph{background:var(--ink); transform:rotate(45deg) scale(1.25);}
        /* "Errors" / "completed" d'exercici — estats expressius */
        .kf-progress .step.status-ok .glyph{background:var(--ok);}
        .kf-progress .step.kind-exercise.status-ok .glyph{border-bottom-color:var(--ok); background:transparent;}
        .kf-progress .step.status-err .glyph{background:var(--bad);}
        .kf-progress .step.kind-exercise.status-err .glyph{border-bottom-color:var(--bad); background:transparent;}
        .kf-progress .step:hover .glyph{transform:scale(1.5);}
        .kf-progress .step.kind-exercise:hover .glyph{transform:scale(1.35);}
        .kf-progress .step.kind-assessment:hover .glyph{transform:rotate(45deg) scale(1.35);}
        .kf-progress .step .tip{
          position:absolute; top:calc(100% + 10px); right:50%; transform:translateX(50%);
          background:var(--ink); color:var(--paper); padding:6px 10px;
          font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.08em;
          text-transform:uppercase; white-space:nowrap;
          opacity:0; pointer-events:none; transition: opacity .15s;
          z-index:20; text-align:center;
        }
        .kf-progress .step .tip::after{
          content:""; position:absolute; bottom:100%; right:50%; transform:translateX(50%);
          border:4px solid transparent; border-bottom-color:var(--ink);
        }
        .kf-progress .step:hover .tip{opacity:1;}
        .kf-progress .step .tip .sub{display:block; color:var(--muted); font-size:9px; margin-top:2px;}

        .kf-progress .row-beats{display:flex; gap:2px; height:4px; align-items:stretch; min-width:120px; justify-content:flex-end;}
        .kf-progress .row-beats .seg{
          flex:1; min-width:8px; max-width:22px; background:var(--rule); border-radius:1px;
          transition: background .2s; border:none; padding:0; cursor:pointer;
        }
        .kf-progress .row-beats .seg.done{background:var(--ink-2);}
        .kf-progress .row-beats .seg.here{background:var(--ink);}

        .kf-body{
          flex:1; display:flex; align-items:center; justify-content:center;
          min-height:0; position:relative; overflow:hidden;
          padding: 20px 40px;
        }
        .kf-backdrop{
          position:absolute; inset:0; padding:40px 80px;
          font-family:'Newsreader',serif; font-size:12px; line-height:1.8; color:var(--ink);
          opacity:.05; pointer-events:none; user-select:none;
          column-count:3; column-gap:50px; column-fill:auto;
          overflow:hidden; mask-image:linear-gradient(to bottom, black 30%, transparent 95%);
        }

        .kf-stage{
          position:relative; z-index:2;
          width:100%; max-width: 880px;
          display:flex; flex-direction:column; align-items:flex-start;
          gap:20px;
        }
        .kf-chapter{
          font-family:'IBM Plex Mono',monospace; font-size:11px;
          letter-spacing:.22em; text-transform:uppercase; color:var(--muted);
          display:flex; align-items:center; gap:10px;
        }
        .kf-chapter .sep{width:36px; height:1px; background:var(--rule);}

        /* Beat types */
        .kf-beat-heading{
          font-family:'Newsreader',serif; font-weight:500; font-size:calc(68px * var(--kf-scale));
          line-height:1.02; letter-spacing:-.02em; color:var(--ink); margin:0;
          max-width: 16ch; text-wrap:balance;
        }
        .kf-beat-lead{
          font-family:'Newsreader',serif; font-weight:400; font-style:italic;
          font-size:calc(42px * var(--kf-scale)); line-height:1.22; color:var(--ink); margin:0;
          max-width: 22ch; letter-spacing:-.01em;
        }
        .kf-beat-lead strong{font-style:normal; font-weight:600;}
        .kf-beat-body{
          font-family:'Newsreader',serif; font-weight:400;
          font-size:calc(30px * var(--kf-scale)); line-height:1.38; color:var(--ink); margin:0;
          max-width: 26ch; letter-spacing:-.005em;
        }
        .kf-beat-point{
          font-family:'Newsreader',serif; font-size:calc(34px * var(--kf-scale)); line-height:1.3;
          letter-spacing:-.01em; color:var(--ink); margin:0; max-width: 24ch;
        }
        .kf-beat-point .marker{
          display:block; font-family:'IBM Plex Mono',monospace;
          font-size:12px; letter-spacing:.2em; text-transform:uppercase;
          color:var(--muted); margin-bottom:12px;
        }

        .k-mark{background:var(--mark); padding:0 4px; border-radius:2px; color:var(--ink);}
        code{font-family:'IBM Plex Mono',monospace; font-size:.85em; background:var(--paper-2); padding:1px 6px; border-radius:3px;}
        em{font-style:italic;}

        /* Exemple individual */
        .kf-beat-ex{
          display:flex; flex-direction:column; gap:14px; width:100%;
        }
        .kf-beat-ex .marker{
          font-family:'IBM Plex Mono',monospace; font-size:11px;
          letter-spacing:.2em; text-transform:uppercase; color:var(--muted);
        }
        .kf-beat-ex .de{
          font-family:'Newsreader',serif; font-weight:500; font-size:calc(54px * var(--kf-scale));
          line-height:1.1; letter-spacing:-.02em; color:var(--ink); margin:0;
        }
        .kf-beat-ex .ca{
          font-family:'Newsreader',serif; font-style:italic; font-size:calc(24px * var(--kf-scale));
          color:var(--ink-2); margin:0; opacity:.85;
        }

        /* Pronom destacat */
        .kf-beat-pron{display:flex; flex-direction:column; gap:16px; width:100%;}
        .kf-beat-pron .marker{
          font-family:'IBM Plex Mono',monospace; font-size:11px;
          letter-spacing:.2em; text-transform:uppercase; color:var(--muted);
        }
        .kf-beat-pron .huge{
          font-family:'Newsreader',serif; font-weight:500; font-size:calc(140px * var(--kf-scale));
          line-height:.95; letter-spacing:-.04em; color:var(--ink); margin:0;
        }
        .kf-beat-pron .gloss{
          font-family:'Newsreader',serif; font-style:italic;
          font-size:calc(28px * var(--kf-scale)); color:var(--ink-2); margin:0;
        }
        .kf-beat-pron .note{
          font-family:'Newsreader',serif; font-size:calc(24px * var(--kf-scale)); line-height:1.35;
          color:var(--ink); margin:0; max-width:28ch;
        }
        .kf-beat-pron .ex{
          border-top:1px solid var(--rule); padding-top:12px; margin-top:4px;
        }
        .kf-beat-pron .ex .de{font-family:'Newsreader'; font-size:28px; color:var(--ink);}
        .kf-beat-pron .ex .ca{font-family:'Newsreader'; font-style:italic; font-size:18px; color:var(--muted); margin-top:4px;}

        /* Pair possessius */
        .kf-beat-pair{display:flex; align-items:baseline; gap:28px; flex-wrap:wrap;}
        .kf-beat-pair .marker{font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.2em; text-transform:uppercase; color:var(--muted); width:100%; margin-bottom:6px;}
        .kf-beat-pair .personal{font-family:'IBM Plex Mono',monospace; font-size:26px; color:var(--muted);}
        .kf-beat-pair .arrow{font-family:'Newsreader'; font-size:32px; color:var(--muted);}
        .kf-beat-pair .possessive{font-family:'Newsreader',serif; font-weight:500; font-size:calc(84px * var(--kf-scale)); letter-spacing:-.02em; color:var(--ink);}
        .kf-beat-pair .gloss{font-family:'Newsreader'; font-style:italic; font-size:22px; color:var(--ink-2); width:100%; margin-top:6px;}

        /* Pitfall */
        .kf-beat-pit{display:flex; flex-direction:column; gap:14px; width:100%;}
        .kf-beat-pit .marker{font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.2em; text-transform:uppercase; color:var(--muted);}
        .kf-beat-pit .bad{
          font-family:'Newsreader'; font-size:40px; line-height:1.1;
          color:var(--bad); text-decoration:line-through; text-decoration-thickness:2px;
          max-width: 22ch;
        }
        .kf-beat-pit .arrow{font-family:'IBM Plex Mono',monospace; font-size:14px; color:var(--muted); letter-spacing:.2em;}
        .kf-beat-pit .good{
          font-family:'Newsreader'; font-weight:500; font-size:48px; line-height:1.1;
          color:var(--ok); letter-spacing:-.01em; max-width: 22ch;
        }
        .kf-beat-pit .why{
          font-family:'IBM Plex Mono',monospace; font-size:13px; color:var(--muted);
          letter-spacing:.02em; max-width:48ch; line-height:1.5; padding-top:8px;
          border-top:1px dashed var(--rule);
        }

        /* Callout */
        .kf-beat-callout{
          display:grid; grid-template-columns: 32px 1fr; gap:18px;
          padding:22px 26px; background:var(--kbd-bg); border:1px solid var(--rule);
          border-left:4px solid var(--ink); max-width:44em;
        }
        .kf-beat-callout.warning{border-left-color:#c0392b;}
        .kf-beat-callout.tip{border-left-color:#1f8a4c;}
        .kf-beat-callout .ico{color:var(--ink); padding-top:6px;}
        .kf-beat-callout.warning .ico{color:#c0392b;}
        .kf-beat-callout.tip .ico{color:#1f8a4c;}
        .kf-beat-callout h4{margin:0 0 8px; font-family:'IBM Plex Mono',monospace; font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:var(--ink); font-weight:500;}
        .kf-beat-callout p{margin:0; font-family:'Newsreader'; font-size:24px; line-height:1.4; color:var(--ink);}

        /* Comparison / tables / syn — més grans */
        .kf-beat-compare{width:100%;}
        .kf-beat-compare .marker{font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.2em; text-transform:uppercase; color:var(--muted); margin-bottom:16px;}
        .kf-beat-compare table{border-collapse:collapse; font-family:'Newsreader'; font-size:22px; width:100%;}
        .kf-beat-compare th{text-align:left; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:var(--muted); font-weight:500; padding:8px 12px 8px 0; border-bottom:1px solid var(--rule);}
        .kf-beat-compare td{padding:10px 12px 10px 0; border-bottom:1px dotted var(--rule); color:var(--ink-2);}
        .kf-beat-compare td.de{color:var(--ink); font-weight:500; font-size:26px;}

        /* Synthesis: mostrem una taula per beat */
        .kf-beat-syn{width:100%;}
        .kf-beat-syn .marker{font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.2em; text-transform:uppercase; color:var(--muted); margin-bottom:16px;}
        .kf-beat-syn h2{font-family:'Newsreader'; font-weight:500; font-size:42px; margin:0 0 18px; letter-spacing:-.015em;}
        .kf-beat-syn table{border-collapse:collapse; font-family:'Newsreader'; font-size:24px; width:100%; max-width:720px;}
        .kf-beat-syn th{text-align:left; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:var(--muted); font-weight:500; padding:10px 14px 10px 0; border-bottom:1px solid var(--rule);}
        .kf-beat-syn td{padding:12px 14px 12px 0; border-bottom:1px dotted var(--rule); color:var(--ink);}

        /* EXERCICI gran, un pas a la vegada */
        .kf-ex-card{
          background:var(--kbd-bg); border:1px solid var(--rule);
          padding:36px 40px; width:100%; max-width: 820px;
        }
        .kf-ex-top{display:flex; justify-content:space-between; align-items:center; margin-bottom:22px; font-family:'IBM Plex Mono',monospace;}
        .kf-ex-top .label{font-size:12px; letter-spacing:.2em; text-transform:uppercase; color:var(--muted);}
        .kf-ex-top .count{font-size:14px; color:var(--ink);}
        .kf-ex-prompt{font-family:'Newsreader'; font-style:italic; font-size:20px; color:var(--ink-2); margin:0 0 24px;}
        .kf-sentence{
          font-family:'Newsreader',serif; font-weight:500; font-size:calc(44px * var(--kf-scale));
          line-height:1.22; letter-spacing:-.015em; color:var(--ink);
          min-height:130px; margin:14px 0 20px;
        }
        .kf-slot{
          display:inline-block; min-width:110px; padding:0 12px;
          border-bottom:3px solid var(--ink); background:#fff8e0;
          font-weight:500;
        }
        .kf-slot.ok{border-color:var(--ok); background:var(--ok-bg); color:var(--ok);}
        .kf-slot.bad{border-color:var(--bad); background:var(--bad-bg); color:var(--bad);}
        .kf-input{
          font:inherit; border:none; outline:none; background:transparent;
          width:200px; border-bottom:3px solid var(--ink); padding:0 8px;
          text-align:center; font-weight:500; color:var(--ink);
        }
        .kf-choices{display:flex; flex-wrap:wrap; gap:12px; margin-top:14px;}
        .kf-choices button{
          font-family:'Newsreader',serif; font-size:24px; font-weight:500;
          padding:14px 24px; border:1.5px solid var(--ink); background:var(--kbd-bg);
          cursor:pointer; color:var(--ink); letter-spacing:-.01em;
          transition: all .15s;
        }
        .kf-choices button:hover{background:var(--paper-2);}
        .kf-choices button.picked{background:var(--ink); color:var(--paper);}
        .kf-hint{margin-top:16px; font-family:'IBM Plex Mono',monospace; font-size:12px; letter-spacing:.08em; color:var(--muted);}
        .kf-feedback{
          margin-top:18px; padding:14px 18px; font-family:'Newsreader';
          font-size:20px; line-height:1.4;
        }
        .kf-feedback.ok{background:var(--ok-bg); color:var(--ok);}
        .kf-feedback.bad{background:var(--bad-bg); color:var(--bad);}
        .kf-feedback b{font-weight:600;}
        .kf-ex-dots{display:flex; gap:6px; justify-content:center; margin-top:22px;}
        .kf-ex-dots button{
          height:10px; border:none; border-radius:5px; cursor:pointer;
          background: var(--rule); transition: all .2s;
        }

        /* Caret typewriter */
        .kf-caret::after{content:"▍"; animation: blink 1.1s step-end infinite; color:var(--ink); margin-left:2px; opacity:.8;}
        @keyframes blink{50%{opacity:0;}}

        /* Foot */
        .kf-foot{
          display:flex; align-items:center; justify-content:space-between;
          padding:14px 36px; border-top:1px solid var(--rule); flex-shrink:0;
          font-family:'IBM Plex Mono',monospace; font-size:11px;
          letter-spacing:.1em; color:var(--muted);
        }
        .kf-btn{
          display:inline-flex; align-items:center; gap:8px;
          padding:10px 16px; border:1px solid var(--ink); background:transparent;
          color:var(--ink); cursor:pointer; font-family:inherit; font-size:11px;
          letter-spacing:.14em; text-transform:uppercase; font-weight:500;
        }
        .kf-btn:hover{background:var(--ink); color:var(--paper);}
        .kf-btn.primary{background:var(--ink); color:var(--paper);}
        .kf-btn.primary:hover{background:#000;}
        .kf-btn:disabled{opacity:.25; cursor:not-allowed;}
        .kf-btn:disabled:hover{background:transparent;color:var(--ink);}
        .kf-foot .mid{display:flex; align-items:center; gap:14px; flex-wrap:wrap; justify-content:center;}
        .kf-keyhint{
          display:inline-flex; align-items:center; gap:6px; color:var(--ink-2);
          font-size:10px;
        }
        .kf-keyhint .sep{width:1px; height:10px; background:var(--rule); margin:0 4px;}
        .kf-keyhint kbd{
          font-family:'IBM Plex Mono',monospace; font-size:10px;
          border:1px solid var(--rule); padding:1px 6px; border-radius:3px;
          background:var(--kbd-bg); color:var(--ink); min-width:18px; text-align:center;
          line-height:1.3;
        }
        .kf-keyhint .kgroup{display:inline-flex; align-items:center; gap:2px;}
        .kf-keyhint .plus{color:var(--muted); font-size:9px; margin:0 1px;}
        .kf-keyhint .lbl{color:var(--muted); margin-left:4px; letter-spacing:.1em; text-transform:uppercase; font-size:9px;}

        /* Swipe hint on mobile */
        .kf-swipe-hint{
        @media (max-width: 720px){
          .kf-head{
            flex-wrap:wrap; padding:10px 14px; gap:8px;
            font-size:10px;
          }
          .kf-head .kf-title{
            order:3; flex-basis:100%; font-size:12px; margin-top:2px;
            white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
          }
          .kf-head .kf-logo{font-size:10px;}
          .kf-head b{font-size:13px;}
          .kf-head-right{gap:8px; order:2;}

          /* Progrés compacte: amaguem la fila de steps (es torna una sola
             barra), i deixem només la fila de beats i un comptador. */
          .kf-progress{flex-direction:row; align-items:center; gap:8px;}
          .kf-progress .row-steps{display:none;}
          .kf-progress .row-beats{min-width:80px; height:3px;}

          .kf-theme{width:28px; height:28px;}

          .kf-body{padding:12px 18px;}

          /* Tipografies més modestes */
          .kf-beat-heading, .kf-beat-heading *{font-size:clamp(28px, 8vw, 56px) !important; line-height:1.08 !important;}
          .kf-beat-lead{font-size:clamp(18px, 4.6vw, 26px) !important; line-height:1.35 !important;}
          .kf-beat-body{font-size:clamp(16px, 4vw, 22px) !important; line-height:1.4 !important;}

          .kf-stage{gap:14px;}
          .kf-chapter{font-size:10px;}

          /* Peu: amaguem llegenda de teclat i mostrem grans botons amb
             hit-targets mòbils. */
          .kf-foot{padding:12px 14px; gap:8px; flex-wrap:nowrap;}
          .kf-foot .mid{gap:6px;}
          .kf-foot .mid > span:first-child{font-size:10px;}
          .kf-keyhint{display:none;}
          .kf-btn{padding:12px 14px; font-size:10px; min-height:44px; min-width:44px;}

          .kf-input{font-size:18px; padding:10px 14px;}

          /* Exercici */
          .kf-ex-card{padding:18px !important;}
          .kf-ex-prompt{font-size:14px !important;}
          .kf-sentence{font-size:clamp(18px, 4.6vw, 26px) !important;}
          .kf-choices button{padding:12px 14px !important; font-size:14px !important; min-height:44px;}
          .kf-ex-dots button{height:14px !important;}
        }

        /* Very narrow: amaguem també el subtítol del tema al header */
        @media (max-width: 420px){
          .kf-head .kf-title{display:none;}
          .kf-body{padding:8px 12px;}
        }

        /* Swipe hint on mobile */
        .kf-swipe-hint{
          display:none; position:absolute; bottom:72px; left:50%; transform:translateX(-50%);
          font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.1em;
          text-transform:uppercase; color:var(--muted); pointer-events:none;
          animation: kf-swipe-hint-fade 3.4s ease forwards;
          z-index:5;
        }
        @keyframes kf-swipe-hint-fade{
          0%, 70% { opacity: .7; }
          100% { opacity: 0; }
        }
        @media (max-width: 720px){
          .kf-swipe-hint{display:block;}
        }

        /* ─── Mode "pas complet": totes les beats del step apilades ─── */
        .kf-stage-full{
          gap: 40px; padding: 20px 0 40px;
          overflow-y: auto; max-height: 100%;
        }
        .kf-stage-full .kf-chapter{margin-bottom: -6px;}
        .kf-full-beat{
          animation: kf-full-in .45s ease both;
          opacity: 0;
          width: 100%;
        }
        @keyframes kf-full-in{
          from{opacity:0; transform:translateY(14px);}
          to{opacity:1; transform:translateY(0);}
        }
        .kf-stage-full > .kf-full-beat + .kf-full-beat{
          padding-top: 28px; border-top: 1px solid var(--rule);
        }
        /* En mode full, les tipografies gegants es reduiexen lleugerament
           perquè diversos beats grans apilats no siguin aclaparadors. */
        .kf-stage-full .kf-beat-heading{font-size:calc(54px * var(--kf-scale));}
        .kf-stage-full .kf-beat-lead{font-size:calc(34px * var(--kf-scale));}
        .kf-stage-full .kf-beat-body{font-size:calc(24px * var(--kf-scale));}
        .kf-stage-full .kf-beat-ex .de{font-size:calc(40px * var(--kf-scale));}
        .kf-stage-full .kf-beat-pron .huge{font-size:calc(96px * var(--kf-scale));}
        .kf-stage-full .kf-beat-pair .possessive{font-size:calc(56px * var(--kf-scale));}
        .kf-stage-full .kf-beat-point{font-size:calc(26px * var(--kf-scale));}

        /* ─── Animacions de taula fila-a-fila ─── */
        .kf-table-row-anim{
          animation: kf-row-in .55s cubic-bezier(.2,.7,.2,1) both;
          opacity: 0;
        }
        @keyframes kf-row-in{
          from{
            opacity: 0;
            transform: translateX(-14px);
            clip-path: inset(0 100% 0 0);
          }
          to{
            opacity: 1;
            transform: translateX(0);
            clip-path: inset(0 0 0 0);
          }
        }
      `}</style>

      <div className="kf-head">
        <div className="kf-logo">
          <Icon name="compass" size={14} />
          <b>Kompass</b>
          <span style={{color:'var(--muted)'}}>A1a · 01</span>
        </div>
        <div className="kf-title">
          <i>{TOPIC.title}</i> <span style={{color:'var(--muted)', fontStyle:'normal'}}>— {TOPIC.subtitle}</span>
        </div>
        <div className="kf-head-right">
        <div className="kf-progress" aria-label={`step ${stepIdx+1}/${total}`}>
          <div className="row-steps">
            {TOPIC.steps.map((s, i) => {
              const kind = s.kind === "exercise"
                ? (s.variant === "assessment" ? "assessment" : "exercise")
                : s.kind;
              const label = s.kind === "exercise"
                ? (s.variant === "assessment" ? "Avaluaci\u00f3 integradora" : "Exercici de comprovaci\u00f3")
                : (s.heading || s.id);
              const sub = s.kind === "exercise" ? s.exerciseId : s.id;
              const isBlockStart = s.kind !== "exercise";
              return (
                <React.Fragment key={i}>
                  {isBlockStart && i > 0 && <span className="block-sep" aria-hidden="true"/>}
                  <button type="button"
                    className={[
                      "step",
                      "kind-" + kind,
                      i === stepIdx ? "active" : i < stepIdx ? "done" : "",
                    ].join(" ")}
                    onClick={() => { setStepIdx(i); setBeatIdx(0); }}
                    aria-label={label}>
                    <span className="glyph"/>
                    <span className="tip">{label}<span className="sub">{sub}</span></span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>
          <div className="row-beats" aria-label={`beat ${beatIdx+1}/${beats.length}`}>
            {beats.map((_, j) => (
              <button key={j} type="button"
                className={"seg " + (j === beatIdx ? "here" : j < beatIdx ? "done" : "")}
                onClick={() => setBeatIdx(j)}
                aria-label={`beat ${j+1}`}/>
            ))}
          </div>
        </div>
        </div>
      </div>

      <div className="kf-body">
        <DensityBackdrop step={step} />
        <FocusBeat key={stepIdx + "." + (isFullMode ? "full" : beatIdx)} step={step} beat={beat} beatIdx={beatIdx} stepIdx={stepIdx} exerciseApiRef={exerciseApiRef} allBeats={beats} fullMode={isFullMode}/>
        {stepIdx === 0 && beatIdx === 0 && <div className="kf-swipe-hint">← swipe →</div>}
      </div>

      <div className="kf-foot">
        <button className="kf-btn" onClick={() => goBeat(-1)} disabled={isFullMode ? stepIdx === 0 : (stepIdx === 0 && beatIdx === 0)}>
          <Icon name="arrow-left" size={12} /> Anterior
        </button>
        <div className="mid">
          <span>{isFullMode
            ? `Step ${String(stepIdx+1).padStart(2,"0")} · Bloc ${String(currentBlock+1).padStart(2,"0")}/${blockStarts.length}`
            : `Step ${String(stepIdx+1).padStart(2,"0")} · ${beatIdx+1}/${beats.length} · Bloc ${String(currentBlock+1).padStart(2,"0")}/${blockStarts.length}`
          }</span>
          <span className="kf-keyhint">
            {!isFullMode && (<>
              <span className="kgroup"><kbd>←</kbd><kbd>→</kbd><span className="lbl">fragment</span></span>
              <span className="sep"/>
            </>)}
            <span className="kgroup"><kbd>{MODKEY}</kbd><span className="plus">+</span><kbd>←</kbd><kbd>→</kbd><span className="lbl">pas</span></span>
            <span className="sep"/>
            <span className="kgroup"><kbd>{MODKEY}</kbd><span className="plus">+</span><kbd>⇧</kbd><span className="plus">+</span><kbd>←</kbd><kbd>→</kbd><span className="lbl">bloc</span></span>
          </span>
        </div>
        <button className="kf-btn primary"
          onClick={() => goBeat(1)}
          disabled={isFullMode ? stepIdx === total - 1 : (stepIdx === total - 1 && beatIdx === beats.length - 1)}>
          Següent <Icon name="arrow-right" size={12} />
        </button>
      </div>
    </div>
  );
}

// Construeix la llista de "beats" (fragments) d'un step.
// Cada beat és { type, ... }. Els types dicten com es renderitzen grans.
function buildBeats(step) {
  const beats = [];
  if (step.kind === "exercise") {
    // L'exercici sencer és un sol beat — ja gestiona intern l'avanç pregunta-a-pregunta.
    beats.push({ type: "exercise", exerciseId: step.exerciseId, variant: step.variant });
    return beats;
  }
  if (step.kind === "synthesis") {
    if (step.heading) beats.push({ type: "heading", text: step.heading, kicker: "Síntesi" });
    (step.tables || []).forEach((t) => beats.push({ type: "syn-table", table: t }));
    return beats;
  }
  // Narrative
  if (step.heading) beats.push({ type: "heading", text: step.heading, kicker: step.id });
  if (step.lead) beats.push({ type: "lead", text: step.lead });
  if (step.body) {
    // Si és molt llarg, trosseja per frases (però normalment ja és curt)
    step.body.split(/(?<=[.!?])\s+/).filter(Boolean).forEach((s) => {
      beats.push({ type: "body", text: s });
    });
  }
  (step.points || []).forEach((p, i) => beats.push({ type: "point", text: p, idx: i+1, total: step.points.length }));
  (step.examples || []).forEach((e, i) => beats.push({ type: "example", ex: e, idx: i+1, total: step.examples.length }));
  (step.tabs || []).forEach((tab) => beats.push({ type: "pron", tab }));
  (step.pairs || []).forEach((p, i) => beats.push({ type: "pair", pair: p, idx: i+1, total: step.pairs.length }));
  (step.rule || []).forEach((r, i) => beats.push({ type: "rule", text: r, idx: i+1, total: step.rule.length }));
  if (step.comparison) beats.push({ type: "compare", rows: step.comparison });
  (step.pitfalls || []).forEach((p, i) => beats.push({ type: "pitfall", pit: p, idx: i+1, total: step.pitfalls.length }));
  if (step.callout) beats.push({ type: "callout", callout: step.callout });
  if (beats.length === 0) beats.push({ type: "heading", text: step.id, kicker: "" });
  return beats;
}

function DensityBackdrop({ step }) {
  const all = React.useMemo(() => TOPIC.steps.map((s) => {
    const parts = [];
    if (s.heading) parts.push(s.heading + ".");
    if (s.lead) parts.push(s.lead);
    if (s.body) parts.push(s.body);
    if (s.examples) parts.push(s.examples.map(e => e.de + " — " + e.ca).join(" "));
    if (s.tabs) parts.push(s.tabs.map(t => t.pron + ": " + t.note).join(" "));
    if (s.pairs) parts.push(s.pairs.map(p => p.personal + "→" + p.possessive).join(" "));
    if (s.pitfalls) parts.push(s.pitfalls.map(p => p.good + " (" + p.why + ")").join(" "));
    if (s.callout) parts.push(s.callout.title + ": " + s.callout.body);
    return parts.join(" ");
  }).join("  ¶  ").replace(/\*\*|==|_/g, ""), []);
  return <div className="kf-backdrop">{all}</div>;
}

function FocusBeat({ step, beat, beatIdx, stepIdx, exerciseApiRef, allBeats, fullMode }) {
  if (!beat) return null;
  if (beat.type === "exercise") {
    return (
      <div className="kf-stage">
        <div className="kf-chapter">
          <Icon name="dumbbell" size={12}/>
          <span>Exercici · {beat.variant === "assessment" ? "Avaluació" : "Comprovació ràpida"}</span>
          <span className="sep"/>
          <span>Step {String(stepIdx+1).padStart(2,"0")}</span>
        </div>
        <ExerciseView ex={EXERCISES[beat.exerciseId]} apiRef={exerciseApiRef}/>
      </div>
    );
  }
  if (fullMode && allBeats && allBeats.length > 1) {
    // Mostrem tots els beats del step apilats. El primer inclou el kicker;
    // la resta només el cos. Desactivem typewriter intern component-per-
    // component (ja s'aplica via `settings.typewriter`), i afegim fade-in
    // suau escalat per no aclaparar l'usuari amb tot d'una vegada.
    return (
      <div className="kf-stage kf-stage-full">
        {allBeats.map((b, i) => (
          <div key={i} className="kf-full-beat" style={{animationDelay: (i * 60) + "ms"}}>
            <BeatBody step={step} beat={b} stepIdx={stepIdx} beatIdx={i} showKicker={i === 0}/>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="kf-stage">
      <BeatBody step={step} beat={beat} stepIdx={stepIdx} beatIdx={beatIdx} showKicker={true}/>
    </div>
  );
}

function Kicker({ children }) {
  return <div className="kf-chapter">{children}</div>;
}

// Typewriter wrapper: renderitza text amb parseInline mantenint el caret.
// Si settings.typewriter és false, mostra el text complet immediatament.
function Typed({ text, speed = 42, className, as = "p" }) {
  const [settings] = (typeof useSettings === "function") ? useSettings() : [{ typewriter: true }];
  const active = settings.typewriter !== false;
  const { text: typed, done } = useTypewriter(text, { speed, startDelay: active ? 180 : 0, active });
  const Tag = as;
  const shown = active ? typed : text;
  const showCaret = active && !done;
  return (
    <Tag className={className}>
      <span className={showCaret ? "kf-caret" : ""}>{parseInline(shown)}</span>
    </Tag>
  );
}

function BeatBody({ step, beat, stepIdx, beatIdx, showKicker = true }) {
  const stepKicker = showKicker ? (
    <Kicker>
      <span>Capítol {String(stepIdx+1).padStart(2,"0")}</span>
      <span className="sep"/>
      <span>{step.id || ""}</span>
    </Kicker>
  ) : null;
  switch (beat.type) {
    case "heading":
      return (
        <>
          {showKicker && <Kicker>{beat.kicker || step.id}</Kicker>}
          <Typed text={beat.text} as="h1" className="kf-beat-heading" speed={45} />
        </>
      );
    case "lead":
      return (<>
        {stepKicker}
        <Typed text={beat.text} as="p" className="kf-beat-lead" speed={40}/>
      </>);
    case "body":
      return (<>
        {stepKicker}
        <Typed text={beat.text} as="p" className="kf-beat-body" speed={36}/>
      </>);
    case "point":
      return (<>
        {stepKicker}
        <div className="kf-beat-point">
          <span className="marker">Punt {beat.idx} de {beat.total}</span>
          <Typed text={beat.text} as="span" className="" speed={38}/>
        </div>
      </>);
    case "example":
      return <ExampleBeat ex={beat.ex} idx={beat.idx} total={beat.total} kicker={stepKicker}/>;
    case "pron":
      return <PronBeat tab={beat.tab} kicker={stepKicker}/>;
    case "pair":
      return <PairBeat pair={beat.pair} idx={beat.idx} total={beat.total} kicker={stepKicker}/>;
    case "rule":
      return (<>
        {stepKicker}
        <div className="kf-beat-point">
          <span className="marker">Regla {beat.idx} de {beat.total}</span>
          <Typed text={beat.text} as="span" speed={38}/>
        </div>
      </>);
    case "compare":
      return <CompareBeat rows={beat.rows} kicker={stepKicker}/>;
    case "pitfall":
      return <PitfallBeat pit={beat.pit} idx={beat.idx} total={beat.total} kicker={stepKicker}/>;
    case "callout":
      return <CalloutBeat callout={beat.callout} kicker={stepKicker}/>;
    case "syn-table":
      return <SynTableBeat table={beat.table}/>;
    default:
      return null;
  }
}

function ExampleBeat({ ex, idx, total, kicker }) {
  const [settings] = (typeof useSettings === "function") ? useSettings() : [{ typewriter: true }];
  const tw = settings.typewriter !== false;
  const de = useTypewriter(ex.de, { speed: 46, startDelay: tw ? 200 : 0, active: tw });
  return (
    <>
      {kicker}
      <div className="kf-beat-ex">
        <span className="marker">Exemple {idx} / {total}</span>
        <p className="de"><span className={tw && !de.done ? "kf-caret" : ""}>{parseInline(de.text)}</span></p>
        {de.done && <p className="ca">{ex.ca}</p>}
      </div>
    </>
  );
}

function PronBeat({ tab, kicker }) {
  const [settings] = (typeof useSettings === "function") ? useSettings() : [{ typewriter: true }];
  const tw = settings.typewriter !== false;
  const note = useTypewriter(tab.note, { speed: 34, startDelay: tw ? 400 : 0, active: tw });
  return (
    <>
      {kicker}
      <div className="kf-beat-pron">
        <span className="marker">Pronom personal</span>
        <h2 className="huge">{tab.pron}</h2>
        <p className="gloss">= {tab.gloss}</p>
        <p className="note"><span className={tw && !note.done ? "kf-caret" : ""}>{parseInline(note.text)}</span></p>
        {note.done && (
          <div className="ex">
            <div className="de">{parseInline(tab.example.de)}</div>
            <div className="ca">{tab.example.ca}</div>
          </div>
        )}
      </div>
    </>
  );
}

function PairBeat({ pair, idx, total, kicker }) {
  return (
    <>
      {kicker}
      <div className="kf-beat-pair">
        <span className="marker">Possessiu {idx} / {total}</span>
        <span className="personal">{pair.personal}</span>
        <span className="arrow">→</span>
        <span className="possessive">{pair.possessive}</span>
        <span className="gloss">{pair.gloss}</span>
      </div>
    </>
  );
}

function CompareBeat({ rows, kicker }) {
  const [settings] = (typeof useSettings === "function") ? useSettings() : [{ tableAnim: true }];
  const anim = settings.tableAnim !== false;
  return (
    <>
      {kicker}
      <div className="kf-beat-compare">
        <div className="marker">Comparativa entre llengües</div>
        <table>
          <thead><tr><th>Castellà</th><th>Català</th><th>Alemany</th><th>Anglès</th></tr></thead>
          <tbody>{rows.map((r, i) => (
            <tr key={i}
              className={anim ? "kf-table-row-anim" : ""}
              style={anim ? { animationDelay: (120 + i * 80) + "ms" } : undefined}>
              <td>{r.es}</td>
              <td>{r.ca}</td>
              <td className="de">{parseInline(r.de)}</td>
              <td>{r.en}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </>
  );
}

function PitfallBeat({ pit, idx, total, kicker }) {
  const [settings] = (typeof useSettings === "function") ? useSettings() : [{ typewriter: true }];
  const tw = settings.typewriter !== false;
  const why = useTypewriter(pit.why, { speed: 30, startDelay: tw ? 500 : 0, active: tw });
  return (
    <>
      {kicker}
      <div className="kf-beat-pit">
        <span className="marker">Error freqüent {idx} / {total}</span>
        <div className="bad">{parseInline(pit.bad)}</div>
        <div className="arrow">→</div>
        <div className="good">{parseInline(pit.good)}</div>
        <div className="why">
          <span className={tw && !why.done ? "kf-caret" : ""}>{why.text}</span>
        </div>
      </div>
    </>
  );
}

function CalloutBeat({ callout, kicker }) {
  const [settings] = (typeof useSettings === "function") ? useSettings() : [{ typewriter: true }];
  const tw = settings.typewriter !== false;
  const body = useTypewriter(callout.body, { speed: 32, startDelay: tw ? 350 : 0, active: tw });
  return (
    <>
      {kicker}
      <div className={"kf-beat-callout " + callout.variant}>
        <div className="ico"><CalloutIcon variant={callout.variant}/></div>
        <div>
          <h4>{callout.title}</h4>
          <p><span className={tw && !body.done ? "kf-caret" : ""}>{parseInline(body.text)}</span></p>
        </div>
      </div>
    </>
  );
}

function SynTableBeat({ table }) {
  const [settings] = (typeof useSettings === "function") ? useSettings() : [{ tableAnim: true }];
  const anim = settings.tableAnim !== false;
  return (
    <div className="kf-beat-syn">
      <div className="marker">Síntesi</div>
      <h2>{table.title}</h2>
      <table>
        <thead><tr>{table.headers.map((h, j) => <th key={j}>{h}</th>)}</tr></thead>
        <tbody>{table.rows.map((r, j) => (
          <tr key={j}
            className={anim ? "kf-table-row-anim" : ""}
            style={anim ? { animationDelay: (180 + j * 90) + "ms" } : undefined}>
            {r.map((c, k) => <td key={k}>{parseInline(c)}</td>)}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

// ── Exercici (gran, pregunta a pregunta) ───────────────────────────────────

function ExerciseView({ ex, apiRef }) {
  const { state, answer, next, prev, goto, reset } = useExerciseState(ex.items.length);
  const item = ex.items[state.idx];
  const picked = state.answers[state.idx];
  const revealed = state.revealed[state.idx];
  const correct = revealed && picked === item.answer;
  const inputRef = React.useRef(null);
  const [flashHint, setFlashHint] = React.useState(null);
  const [skipArmed, setSkipArmed] = React.useState(false);

  const allAnswered = ex.items.every((_, i) => state.revealed[i]);
  const anyWrong = ex.items.some((it, i) => state.revealed[i] && state.answers[i] !== it.answer);
  const isLast = state.idx === ex.items.length - 1;

  const flash = (msg) => { setFlashHint(msg); clearTimeout(flash._t); flash._t = setTimeout(() => setFlashHint(null), 2200); };

  // Intenta validar la resposta actual sense dependre d'Enter.
  // typeIn: llegeix el valor del DOM de l'input (viu, encara que no s'hagi
  //   fet commit). Si hi ha text, el validem. Si està buit, no.
  // singleChoice: si ja hi ha picked però no revealed, el revela.
  const tryValidate = () => {
    if (revealed) return true;
    if (ex.interaction === "typeIn") {
      const v = (inputRef.current?.value || "").trim();
      if (v) { answer(state.idx, v); return true; }
      return false;
    }
    if (picked) { answer(state.idx, picked); return true; }
    return false;
  };

  // Intent d'avanç "intel·ligent": validar si cal, saltar si ja, mostrar ajuda
  // si no es pot. Usat tant pel botó Següent del peu com per la fletxa → global.
  const tryAdvance = () => {
    if (!revealed) {
      const ok = tryValidate();
      if (!ok) {
        flash(ex.interaction === "typeIn"
          ? "Escriu una resposta abans d'avançar (després prem → per continuar)."
          : "Tria una opció abans d'avançar.");
        return "stay";
      }
      // Validat: ens quedem per llegir el feedback.
      return "stay";
    }
    if (!isLast) { next(); return "stay"; }
    // última pregunta, revealed
    if (!anyWrong) return "exit"; // tot OK → surt al següent step
    if (!skipArmed) { setSkipArmed(true); return "stay"; }
    setSkipArmed(false);
    return "exit";
  };

  React.useEffect(() => {
    if (!apiRef) return;
    apiRef.current = {
      handleArrow: (d) => {
        if (d < 0) {
          setSkipArmed(false);
          if (state.idx > 0) { prev(); return true; }
          return false;
        }
        const r = tryAdvance();
        return r === "stay"; // true = no sortim de l'exercici
      },
    };
    return () => { if (apiRef) apiRef.current = null; };
  }, [state.idx, revealed, allAnswered, anyWrong, isLast, picked, skipArmed]);

  // Auto-reset del "skipArmed" al canviar de pregunta
  React.useEffect(() => { setSkipArmed(false); }, [state.idx]);

  return (
    <div className="kf-ex-card">
      <div className="kf-ex-top">
        <div className="label">{ex.title}</div>
        <div className="count">{state.idx + 1} / {ex.items.length}</div>
      </div>
      <p className="kf-ex-prompt">{ex.prompt}</p>

      <div className="kf-sentence">
        {ex.interaction === "typeIn" ? (
          <>
            {item.before}
            <TypeSlot ref={inputRef} item={item} idx={state.idx} answer={answer} revealed={revealed} picked={picked} correct={correct} onAdvance={tryAdvance}/>
            {item.after}
          </>
        ) : (
          (() => {
            const parts = item.sentence.split("__");
            return (<>
              {parts[0]}
              <span className={"kf-slot " + (revealed ? (correct ? "ok" : "bad") : "")}>
                {picked || "____"}
              </span>
              {parts[1]}
            </>);
          })()
        )}
      </div>

      {ex.interaction === "singleChoice" && (
        <div className="kf-choices">
          {item.options.map((o) => (
            <button key={o} className={picked === o ? "picked" : ""} onClick={() => answer(state.idx, o)}>
              {o}
            </button>
          ))}
        </div>
      )}

      {item.hint && !revealed && <div className="kf-hint">💡 {item.hint}</div>}
      {flashHint && (
        <div className="kf-hint" style={{
          color:"var(--bad)",
          marginTop:14,
          padding:"10px 14px",
          background:"var(--bad-bg)",
          borderLeft:"3px solid var(--bad)",
        }}>⚠ {flashHint}</div>
      )}
      {revealed && (
        <div className={"kf-feedback " + (correct ? "ok" : "bad")}>
          {correct
            ? <><Icon name="check" size={14}/> &nbsp;Correcte!</>
            : <><Icon name="x" size={14}/> &nbsp;La resposta correcta és <b>{item.answer}</b>.</>}
        </div>
      )}

      {isLast && revealed && anyWrong && (
        <div style={{marginTop:18, padding:"14px 18px", background:"var(--bad-bg)", display:"flex", justifyContent:"space-between", alignItems:"center", gap:16, flexWrap:"wrap"}}>
          <span style={{fontFamily:"'Newsreader'", fontSize:18, color:"var(--bad)"}}>
            Has fallat {ex.items.filter((it, i) => state.revealed[i] && state.answers[i] !== it.answer).length} de {ex.items.length} preguntes.
          </span>
          <div style={{display:"flex", gap:8}}>
            <button className="kf-btn" onClick={reset}>
              <Icon name="sparkle" size={12}/> Repetir exercici
            </button>
          </div>
          {skipArmed && (
            <div style={{flexBasis:"100%", marginTop:8, fontFamily:"'IBM Plex Mono'", fontSize:11, letterSpacing:".08em", color:"var(--bad)"}}>
              Saltar lliçó? Has tingut errors. Prem <kbd style={{fontFamily:"'IBM Plex Mono'",fontSize:11,border:"1px solid var(--bad)",padding:"1px 6px",borderRadius:3,background:"var(--kbd-bg)"}}>→</kbd> una altra vegada per continuar — ja hi tornaràs més tard.
            </div>
          )}
        </div>
      )}
      {isLast && revealed && !anyWrong && (
        <div style={{marginTop:18, padding:"14px 18px", background:"var(--ok-bg)", fontFamily:"'Newsreader'", fontSize:18, color:"var(--ok)", display:"flex", alignItems:"center", gap:10}}>
          <Icon name="check" size={14}/> Perfecte! Prem <kbd style={{fontFamily:"'IBM Plex Mono'",fontSize:12,border:"1px solid var(--rule)",padding:"1px 6px",borderRadius:3,background:"var(--kbd-bg)"}}>→</kbd> per avançar al següent apartat.
        </div>
      )}

      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:26}}>
        <button className="kf-btn" onClick={prev} disabled={state.idx === 0}>
          <Icon name="arrow-left" size={12}/> Prev
        </button>
        <div className="kf-ex-dots">
          {ex.items.map((_, i) => (
            <button key={i} onClick={() => goto(i)}
              style={{
                width: i === state.idx ? 26 : 10,
                background: state.answers[i] === ex.items[i].answer ? "var(--ok)"
                  : state.revealed[i] ? "var(--bad)"
                  : i === state.idx ? "var(--ink)"
                  : "var(--rule)",
              }} />
          ))}
        </div>
        <button className="kf-btn primary" onClick={() => tryAdvance()}>
          Next <Icon name="arrow-right" size={12}/>
        </button>
      </div>
    </div>
  );
}

const TypeSlot = React.forwardRef(function TypeSlot({ item, idx, answer, revealed, picked, correct, onAdvance }, ref) {
  const [val, setVal] = React.useState("");
  React.useEffect(() => { setVal(""); }, [idx]);
  const commit = () => { if (val.trim()) answer(idx, val.trim()); };
  if (revealed) {
    return <span className={"kf-slot " + (correct ? "ok" : "bad")}>{picked}</span>;
  }
  return (
    <input ref={ref} className="kf-input" value={val}
      onChange={(e) => setVal(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); commit(); return; }
        if (e.key === "ArrowRight") {
          // Si el cursor està al final (o el camp és buit), la fletxa
          // no serveix per moure el cursor: la fem servir per validar/
          // avançar. Si l'usuari està enmig del text, deixem passar.
          const el = e.currentTarget;
          const atEnd = el.selectionStart === el.value.length && el.selectionEnd === el.value.length;
          if (atEnd) {
            e.preventDefault();
            e.stopPropagation();
            if (onAdvance) onAdvance();
          }
        }
      }}
      onBlur={commit}
      autoFocus
      placeholder="…" />
  );
});

Object.assign(window, { VariantFocus });
