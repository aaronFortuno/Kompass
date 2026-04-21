// Kompass App Shell
// Editorial minimal: mateixes tokens que el reader. El reader apareix
// fullscreen (overlay) quan estem a una ruta de tema; sortir = Esc o X.

function AppShell() {
  const [theme, setTheme] = useTheme();
  const [settings, updateSettings] = useSettings();
  const { path, navigate } = useHashRoute();

  // Aplicar la mida del text globalment com a variable CSS (la usen reader i shell).
  React.useEffect(() => {
    document.documentElement.style.setProperty("--kf-type-scale", String(settings.textScale));
  }, [settings.textScale]);

  // Detectar si estem en una ruta de tema → render reader fullscreen.
  // Atenció: hem de distingir un id de capítol (A1a, A1b...) d'un id de
  // tema (A1a-1). Només els ids que apareixen a .topics obren el reader;
  // la resta són capítols → ChapterView.
  const topicMatch = path.match(/^\/temari\/([A-Za-z0-9-]+)$/);
  const candidateId = topicMatch ? topicMatch[1] : null;
  const isTopicId = React.useMemo(() => {
    if (!candidateId) return false;
    for (const L of SYLLABUS) {
      for (const ch of L.chapters) {
        if (ch.topics.some((t) => t.id === candidateId)) return true;
      }
    }
    return false;
  }, [candidateId]);
  const readerTopicId = isTopicId ? candidateId : null;

  // Esc tanca el reader, tornant al capítol pare si el coneixem.
  const parentChapterId = React.useMemo(() => {
    if (!readerTopicId) return null;
    for (const L of SYLLABUS) {
      for (const ch of L.chapters) {
        if (ch.topics.some((t) => t.id === readerTopicId)) return ch.id;
      }
    }
    return null;
  }, [readerTopicId]);
  const exitReader = React.useCallback(() => {
    navigate(parentChapterId ? "/temari/" + parentChapterId : "/temari");
  }, [parentChapterId, navigate]);
  React.useEffect(() => {
    if (!readerTopicId) return;
    const onKey = (e) => {
      if (e.key === "Escape") exitReader();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [readerTopicId, exitReader]);

  // Sincronitzem el tema del reader amb el global quan entrem/sortim
  // (el VariantFocus llegeix el mateix localStorage a la inicialització).

  return (
    <div className="ks-root" data-theme={theme}>
      <GlobalStyles/>
      {!readerTopicId && (
        <>
          <ShellHeader path={path} navigate={navigate}/>
          <ShellBody path={path} navigate={navigate}/>
        </>
      )}
      {readerTopicId && (
        <ReaderOverlay topicId={readerTopicId} onExit={exitReader}/>
      )}
    </div>
  );
}

function GlobalStyles() {
  return (
    <style>{`
      :root, .ks-root{
        --ink:#1b1d22; --ink-2:#4b4f58; --muted:#8b8e95;
        --paper:#f6f2ea; --paper-2:#ece5d6; --rule:#d9d0bd;
        --accent:#3a2e1f; --mark:#e8d36a;
        --ok:#1f6a3a; --bad:#8b2a1e;
        --kbd-bg:#ffffff;
      }
      .ks-root[data-theme="dark"]{
        --ink:#f1ece0; --ink-2:#c8c2b2; --muted:#858177;
        --paper:#141210; --paper-2:#1d1a16; --rule:#3a342a;
        --accent:#e8d9b8; --mark:#d6b53a;
        --ok:#6fbb7e; --bad:#e8806f;
        --kbd-bg:#1d1a16;
      }
      html, body{margin:0; padding:0; background:var(--paper); color:var(--ink);}
      body{font-family:'Newsreader', Georgia, serif;}
      *{box-sizing:border-box;}
      a{color:inherit; text-decoration:none;}
      button{font-family:inherit;}

      .ks-root{
        min-height:100vh; display:flex; flex-direction:column;
        background:var(--paper); color:var(--ink);
        transition: background .25s ease, color .25s ease;
      }

      /* ── Shell header ─────────────────────────────────── */
      .ks-head{
        display:flex; align-items:center; gap:20px;
        padding:16px 36px; border-bottom:1px solid var(--rule);
        font-family:'IBM Plex Mono', ui-monospace, monospace;
        font-size:11px; letter-spacing:.14em; text-transform:uppercase;
        color:var(--ink-2);
      }
      .ks-head .logo{display:flex; align-items:center; gap:8px; color:var(--ink);}
      .ks-head .logo b{font-family:'Newsreader',serif; font-weight:600; font-size:16px; letter-spacing:0; text-transform:none;}
      .ks-head .nav{display:flex; gap:18px; align-items:center; flex:1;}
      .ks-head .nav a{
        padding:6px 0; color:var(--ink-2); cursor:pointer; position:relative;
        transition: color .15s;
      }
      .ks-head .nav a:hover{color:var(--ink);}
      .ks-head .nav a.active{color:var(--ink);}
      .ks-head .nav a.active::after{
        content:""; position:absolute; left:0; right:0; bottom:-2px; height:2px; background:var(--ink);
      }
      .ks-head .spacer{flex:1;}
      .ks-head .crumbs{
        color:var(--muted); font-size:10px; display:flex; gap:6px; align-items:center;
      }
      .ks-head .crumbs .sep{color:var(--rule);}
      .ks-head .crumbs a{color:var(--ink-2); cursor:pointer;}
      .ks-head .crumbs a:hover{color:var(--ink);}

      .ks-theme{
        width:32px; height:32px; border-radius:16px; border:1px solid var(--rule);
        background:transparent; color:var(--ink-2); cursor:pointer;
        display:flex; align-items:center; justify-content:center;
        transition: background .15s, color .15s, border-color .15s;
      }
      .ks-theme:hover{background:var(--paper-2); color:var(--ink); border-color:var(--ink-2);}

      /* ── Body container ────────────────────────────────── */
      .ks-body{
        flex:1; padding: 60px 36px 80px; max-width: 1100px; width:100%;
        margin: 0 auto;
      }

      /* Home */
      .ks-hero{margin-bottom:64px;}
      .ks-kicker{
        font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.16em;
        text-transform:uppercase; color:var(--muted); margin-bottom:12px;
      }
      .ks-hero h1{
        font-family:'Newsreader',serif; font-weight:400; font-style:italic;
        font-size:clamp(44px, 6vw, 78px); line-height:1.04; margin:0 0 20px;
        letter-spacing:-.01em; color:var(--ink); max-width:18ch;
      }
      .ks-hero p{
        font-family:'Newsreader',serif; font-size:clamp(18px, 2.2vw, 22px);
        line-height:1.55; color:var(--ink-2); max-width: 55ch; margin:0;
      }

      .ks-section-label{
        font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.16em;
        text-transform:uppercase; color:var(--muted);
        display:flex; align-items:center; gap:16px; margin: 48px 0 24px;
      }
      .ks-section-label::after{content:""; flex:1; height:1px; background:var(--rule);}

      /* Level cards */
      .ks-levels{display:flex; flex-direction:column; gap:0;}
      .ks-level{
        display:grid; grid-template-columns: 120px 1fr 140px;
        gap: 24px; padding: 28px 0; border-bottom: 1px solid var(--rule);
        align-items:baseline; cursor:pointer;
        transition: padding-left .25s ease;
      }
      .ks-level:first-child{border-top:1px solid var(--rule);}
      .ks-level:hover{padding-left:12px;}
      .ks-level .badge{
        font-family:'IBM Plex Mono',monospace; font-size:36px; color:var(--ink);
        letter-spacing:-.02em; font-weight:500;
      }
      .ks-level .meta h3{
        font-family:'Newsreader',serif; font-style:italic; font-weight:500;
        font-size:26px; margin:0 0 6px; color:var(--ink);
      }
      .ks-level .meta p{
        font-size:15px; color:var(--ink-2); margin:0; line-height:1.5;
        font-family:'Newsreader',serif;
      }
      .ks-level .progress{
        font-family:'IBM Plex Mono',monospace; font-size:11px;
        letter-spacing:.14em; text-transform:uppercase; color:var(--muted);
        text-align:right;
      }
      .ks-level .progress .bar{
        width:120px; height:3px; background:var(--rule); margin-top:8px;
        margin-left:auto; position:relative;
      }
      .ks-level .progress .fill{
        position:absolute; left:0; top:0; bottom:0; background:var(--ink);
      }

      /* Topic list inside a chapter page */
      .ks-chapter-head h1{
        font-family:'Newsreader',serif; font-weight:400; font-style:italic;
        font-size:56px; line-height:1.08; margin:0 0 12px;
      }
      .ks-chapter-head .sub{
        font-family:'Newsreader',serif; font-size:20px; color:var(--ink-2);
        margin-bottom: 40px;
      }
      .ks-topics{display:flex; flex-direction:column;}
      .ks-topic{
        display:grid; grid-template-columns: 80px 1fr 80px 40px;
        gap:20px; padding: 22px 0; border-bottom: 1px solid var(--rule);
        align-items:center; cursor:pointer;
        transition: padding-left .2s ease, background .2s ease;
      }
      .ks-topic:first-child{border-top:1px solid var(--rule);}
      .ks-topic:hover{padding-left:12px;}
      .ks-topic .num{
        font-family:'IBM Plex Mono',monospace; font-size:13px; color:var(--muted);
        letter-spacing:.08em;
      }
      .ks-topic .ttl{
        font-family:'Newsreader',serif; font-style:italic; font-size:22px;
        color:var(--ink);
      }
      .ks-topic .ttl .small{
        display:block; font-style:normal; font-family:'IBM Plex Mono',monospace;
        font-size:11px; letter-spacing:.1em; text-transform:uppercase;
        color:var(--muted); margin-top:4px;
      }
      .ks-topic .dur{
        font-family:'IBM Plex Mono',monospace; font-size:11px; color:var(--muted);
        letter-spacing:.12em; text-transform:uppercase; text-align:right;
      }
      .ks-topic .arrow{color:var(--muted); text-align:right;}
      .ks-topic:hover .arrow{color:var(--ink);}

      .ks-chip{
        display:inline-flex; align-items:center; gap:6px;
        padding:3px 10px; border:1px solid var(--rule); border-radius:999px;
        font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.12em;
        text-transform:uppercase; color:var(--ink-2);
      }
      .ks-chip.active{background:var(--ink); color:var(--paper); border-color:var(--ink);}
      .ks-chip.partial .dot{width:6px; height:6px; border-radius:50%; background:var(--mark);}
      .ks-chip.done .dot{width:6px; height:6px; border-radius:50%; background:var(--ok);}

      /* Settings */
      .ks-settings{max-width: 680px;}
      .ks-setting-group{
        font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.16em;
        text-transform:uppercase; color:var(--muted);
        margin: 40px 0 4px; padding-bottom:4px;
      }
      .ks-setting-group:first-child{margin-top:0;}
      .ks-setting-row{
        display:grid; grid-template-columns: 1fr auto;
        gap:24px; padding:20px 0; border-bottom:1px solid var(--rule);
        align-items:center;
      }
      .ks-setting-group + .ks-setting-row{border-top:1px solid var(--rule);}
      .ks-setting-row .lbl{
        font-family:'Newsreader',serif; font-size:18px; color:var(--ink);
      }
      .ks-setting-row .lbl .hint{
        display:block; font-family:'IBM Plex Mono',monospace; font-size:10px;
        letter-spacing:.12em; text-transform:uppercase; color:var(--muted);
        margin-top:4px;
      }
      .ks-toggle{
        display:inline-flex; padding:3px; background:var(--paper-2); border-radius:999px;
        border:1px solid var(--rule);
      }
      .ks-toggle button{
        border:none; background:transparent; color:var(--ink-2);
        padding:6px 14px; border-radius:999px; cursor:pointer;
        font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.14em;
        text-transform:uppercase;
      }
      .ks-toggle button.on{background:var(--ink); color:var(--paper);}

      .ks-size-control{
        display:flex; align-items:center; gap:10px;
      }
      .ks-size-btn{
        width:30px; height:30px; border-radius:15px; border:1px solid var(--rule);
        background:transparent; color:var(--ink-2); cursor:pointer;
        font-family:'IBM Plex Mono',monospace; font-size:11px;
        display:flex; align-items:center; justify-content:center;
        transition: background .15s, color .15s, border-color .15s;
      }
      .ks-size-btn.big{font-size:13px;}
      .ks-size-btn:hover{background:var(--paper-2); color:var(--ink); border-color:var(--ink-2);}
      .ks-size-control input[type="range"]{accent-color: var(--ink);}

      /* Reader overlay */
      .ks-reader-overlay{
        position:fixed; inset:0; z-index:100; background:var(--paper);
        display:flex; flex-direction:column;
      }
      /* Fletxa "← Tornar a [capítol]": subtil, posicionada sota el header
         del reader, cantonada superior esquerra. */
      .ks-reader-back{
        position:absolute; top:12px; left:16px; z-index:110;
        display:inline-flex; align-items:center; gap:8px;
        padding:7px 12px 7px 8px; border:1px solid transparent;
        background:transparent; color:var(--muted); cursor:pointer;
        font-family:'IBM Plex Mono',monospace; font-size:10px;
        letter-spacing:.12em; text-transform:uppercase;
        transition: color .15s, border-color .15s, background .15s;
        max-width: 360px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
      }
      .ks-reader-back:hover{
        color:var(--ink); border-color:var(--rule); background:var(--paper-2);
      }
      .ks-reader-back svg{flex-shrink:0;}

      /* Ajuda "Esc per sortir" al peu del reader overlay, sota del footer.
         Només visible en desktop (no ocupa al mòbil). */
      .ks-reader-esc-hint{
        position:absolute; bottom:16px; right:16px;
        font-family:'IBM Plex Mono',monospace; font-size:9px;
        letter-spacing:.14em; text-transform:uppercase; color:var(--muted);
        pointer-events:none; opacity:.6;
        display:flex; align-items:center; gap:6px;
        z-index:110;
      }
      .ks-reader-esc-hint kbd{
        font-family:'IBM Plex Mono',monospace; font-size:9px;
        border:1px solid var(--rule); padding:1px 5px; border-radius:3px;
        background:var(--kbd-bg); color:var(--ink-2);
      }

      /* ── Mobile ─────────────────────────────────────────── */
      @media (max-width: 720px){
        .ks-head{padding:12px 16px; gap:12px; flex-wrap:wrap; font-size:10px;}
        .ks-head .logo b{font-size:14px;}
        .ks-head .nav{gap:12px; order:3; flex-basis:100%;}
        .ks-head .crumbs{order:3; flex-basis:100%; font-size:9px;}
        .ks-body{padding: 30px 20px 60px;}
        .ks-hero h1{font-size: clamp(32px, 9vw, 44px);}
        .ks-level{grid-template-columns: 1fr; gap:8px; padding: 20px 0;}
        .ks-level .badge{font-size:22px;}
        .ks-level .meta h3{font-size:20px;}
        .ks-level .progress{text-align:left;}
        .ks-level .progress .bar{margin-left:0;}
        .ks-topic{grid-template-columns: 40px 1fr 40px; gap:10px; padding: 18px 0;}
        .ks-topic .dur{display:none;}
        .ks-topic .ttl{font-size:17px;}
        .ks-chapter-head h1{font-size:34px;}
        .ks-reader-back{top:8px; left:8px; padding:6px 10px 6px 6px; font-size:9px; max-width:60vw;}
        .ks-reader-esc-hint{display:none;}
      }
    `}</style>
  );
}

function ShellHeader({ path, navigate }) {
  const isHome = path === "/home" || path === "/";
  const isSyll = path.startsWith("/temari");
  const isSets = path.startsWith("/settings");

  // Breadcrumb si estem a una subruta de temari
  let crumbs = null;
  if (path.startsWith("/temari/")) {
    // chapter or topic (ex. /temari/A1a or /temari/A1a-1). Tots dos són
    // ids; si és un id de tema (A?a-N) trobem el capítol pare.
    const parts = path.replace(/^\/temari\//, "").split("/");
    const id = parts[0];
    // Descomponem: topic ids tenen forma "A1a-1"
    let chapter = null, topic = null, level = null;
    SYLLABUS.forEach((L) => {
      L.chapters.forEach((ch) => {
        if (ch.id === id) { chapter = ch; level = L; }
        ch.topics.forEach((t) => {
          if (t.id === id) { topic = t; chapter = ch; level = L; }
        });
      });
    });
    crumbs = (
      <div className="crumbs">
        <a onClick={() => navigate("/temari")}>Temari</a>
        {level && <><span className="sep">/</span><span>{level.level}</span></>}
        {chapter && <><span className="sep">/</span><a onClick={() => navigate("/temari/" + chapter.id)}>{chapter.id}</a></>}
        {topic && <><span className="sep">/</span><span>{topic.id}</span></>}
      </div>
    );
  }

  return (
    <header className="ks-head">
      <div className="logo" onClick={() => navigate("/home")} style={{cursor:"pointer"}}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
          <circle cx="8" cy="8" r="7"/>
          <path d="M8 1.5 L10 8 L8 14.5 L6 8 Z" fill="currentColor"/>
        </svg>
        <b>Kompass</b>
      </div>
      <nav className="nav">
        <a className={isHome ? "active" : ""} onClick={() => navigate("/home")}>Home</a>
        <a className={isSyll ? "active" : ""} onClick={() => navigate("/temari")}>Temari</a>
        <a className={isSets ? "active" : ""} onClick={() => navigate("/settings")}>Settings</a>
      </nav>
      {crumbs}
      <div className="spacer"/>
    </header>
  );
}

function ShellBody({ path, navigate }) {
  // Routing simple
  if (path === "/" || path === "/home") return <HomeView navigate={navigate}/>;
  if (path === "/temari") return <SyllabusView navigate={navigate}/>;
  if (path.startsWith("/temari/")) {
    const id = path.replace(/^\/temari\//, "").split("/")[0];
    // Si és un capítol, mostrem llista de temes
    for (const L of SYLLABUS) {
      for (const ch of L.chapters) {
        if (ch.id === id) return <ChapterView chapter={ch} level={L} navigate={navigate}/>;
      }
    }
    // Topic no és responsabilitat del shell — el maneja ReaderOverlay
    return <NotFound navigate={navigate}/>;
  }
  if (path === "/settings") return <SettingsView/>;
  return <NotFound navigate={navigate}/>;
}

function HomeView({ navigate }) {
  return (
    <div className="ks-body">
      <div className="ks-hero">
        <div className="ks-kicker">Kompass · Aprén alemany</div>
        <h1>Una lliçó es llegeix. Una idea es viu.</h1>
        <p>
          Kompass divideix cada lliçó en fragments curts i centrats. No llegeixes un mur de text:
          segueixes una conversa. Les preguntes apareixen una a una. El progrés és tangible.
        </p>
      </div>

      <div className="ks-section-label">Nivells</div>
      <div className="ks-levels">
        {SYLLABUS.map((L) => {
          const totalTopics = L.chapters.reduce((n, ch) => n + ch.topics.length, 0);
          const doneCount = L.chapters.reduce((n, ch) =>
            n + ch.topics.filter(t => (MOCK_PROGRESS[t.id]?.done ?? 0) >= 1).length, 0);
          const partial = L.chapters.reduce((n, ch) =>
            n + ch.topics.filter(t => {
              const p = MOCK_PROGRESS[t.id]?.done ?? 0;
              return p > 0 && p < 1;
            }).length, 0);
          const pct = totalTopics ? Math.round(((doneCount + partial * 0.5) / totalTopics) * 100) : 0;
          return (
            <div key={L.level} className="ks-level"
              onClick={() => {
                // primer capítol del nivell
                const firstCh = L.chapters[0];
                if (firstCh) navigate("/temari/" + firstCh.id);
                else navigate("/temari");
              }}>
              <div className="badge">{L.level}</div>
              <div className="meta">
                <h3>{L.title}</h3>
                <p>{L.blurb}</p>
              </div>
              <div className="progress">
                {pct}% · {doneCount}/{totalTopics}
                <div className="bar"><div className="fill" style={{width: pct + "%"}}/></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SyllabusView({ navigate }) {
  return (
    <div className="ks-body">
      <div className="ks-kicker">Temari complet</div>
      <h1 style={{
        fontFamily:"'Newsreader',serif", fontWeight:400, fontStyle:"italic",
        fontSize:"clamp(40px, 5vw, 64px)", lineHeight:1.05, margin:"8px 0 40px",
      }}>
        Del primer pronom al primer paràgraf.
      </h1>
      {SYLLABUS.map((L) => (
        <div key={L.level}>
          <div className="ks-section-label">{L.level} · {L.title.replace(/^Alemany · /, "")}</div>
          <div className="ks-topics">
            {L.chapters.map((ch) => (
              <div key={ch.id} className="ks-topic" onClick={() => navigate("/temari/" + ch.id)}>
                <div className="num">{ch.id}</div>
                <div className="ttl">
                  {ch.title.replace(/^[A-Z0-9]+ · /, "")}
                  <span className="small">{ch.subtitle} · {ch.topics.length} temes</span>
                </div>
                <div className="dur">
                  {ch.topics.length ? ch.topics.reduce((s, t) => s + (t.minutes || 0), 0) + " min" : "—"}
                </div>
                <div className="arrow">→</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ChapterView({ chapter, level, navigate }) {
  return (
    <div className="ks-body">
      <div className="ks-kicker">{level.level} · {chapter.id}</div>
      <div className="ks-chapter-head">
        <h1>{chapter.title.replace(/^[A-Z0-9]+ · /, "")}</h1>
        <div className="sub">{chapter.subtitle}</div>
      </div>
      <div className="ks-topics">
        {chapter.topics.map((t, i) => {
          const prog = MOCK_PROGRESS[t.id];
          const pct = prog?.done ?? 0;
          return (
            <div key={t.id} className="ks-topic" onClick={() => navigate("/temari/" + t.id)}>
              <div className="num">{String(i+1).padStart(2, "0")}</div>
              <div className="ttl">
                {t.title}
                <span className="small">{t.subtitle}
                  {pct >= 1
                    ? <span className="ks-chip done" style={{marginLeft:10}}><span className="dot"/> Completat</span>
                    : pct > 0
                      ? <span className="ks-chip partial" style={{marginLeft:10}}><span className="dot"/> {Math.round(pct*100)}%</span>
                      : null}
                </span>
              </div>
              <div className="dur">{t.minutes} min</div>
              <div className="arrow">→</div>
            </div>
          );
        })}
        {chapter.topics.length === 0 && (
          <div style={{padding:"40px 0", color:"var(--muted)", fontFamily:"'Newsreader',serif", fontStyle:"italic"}}>
            Aquest capítol encara no té temes publicats.
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsView() {
  const [theme, setTheme] = useTheme();
  const [settings, updateSettings, resetSettings] = useSettings();

  return (
    <div className="ks-body">
      <div className="ks-kicker">Configuració</div>
      <h1 style={{
        fontFamily:"'Newsreader',serif", fontWeight:400, fontStyle:"italic",
        fontSize:"clamp(40px, 5vw, 64px)", lineHeight:1.05, margin:"8px 0 16px",
      }}>
        Ajustos.
      </h1>
      <p style={{fontFamily:"'Newsreader',serif", fontSize:18, color:"var(--ink-2)", margin:"0 0 40px", maxWidth:"50ch"}}>
        Controla la sensació del reader. Els canvis s'apliquen immediatament i
        es recorden entre sessions.
      </p>

      <div className="ks-settings">
        {/* Aparença */}
        <div className="ks-setting-group">Aparença</div>

        <div className="ks-setting-row">
          <div className="lbl">Tema
            <span className="hint">Clar o fosc</span>
          </div>
          <div className="ks-toggle">
            <button className={theme === "light" ? "on" : ""} onClick={() => setTheme("light")}>Clar</button>
            <button className={theme === "dark" ? "on" : ""} onClick={() => setTheme("dark")}>Fosc</button>
          </div>
        </div>

        <div className="ks-setting-row">
          <div className="lbl">Mida del text
            <span className="hint">Afecta tot el contingut del reader · {Math.round(settings.textScale * 100)}%</span>
          </div>
          <div className="ks-size-control">
            <button className="ks-size-btn" onClick={() => updateSettings({ textScale: Math.max(0.85, +(settings.textScale - 0.05).toFixed(2)) })} aria-label="Reduir mida">A−</button>
            <input type="range" min="0.85" max="1.25" step="0.05" value={settings.textScale}
              onChange={(e) => updateSettings({ textScale: parseFloat(e.target.value) })}
              style={{width:140}}/>
            <button className="ks-size-btn big" onClick={() => updateSettings({ textScale: Math.min(1.25, +(settings.textScale + 0.05).toFixed(2)) })} aria-label="Ampliar mida">A+</button>
          </div>
        </div>

        {/* Experiència de lectura */}
        <div className="ks-setting-group">Experiència de lectura</div>

        <div className="ks-setting-row">
          <div className="lbl">Mode d'estudi
            <span className="hint">Fragment per fragment (immersiu) o pas complet d'una vegada</span>
          </div>
          <div className="ks-toggle">
            <button className={settings.studyMode === "fragment" ? "on" : ""} onClick={() => updateSettings({ studyMode: "fragment" })}>Fragment</button>
            <button className={settings.studyMode === "full" ? "on" : ""} onClick={() => updateSettings({ studyMode: "full" })}>Pas complet</button>
          </div>
        </div>

        <div className="ks-setting-row">
          <div className="lbl">Efecte typewriter
            <span className="hint">Anima el text del primer beat lletra a lletra</span>
          </div>
          <div className="ks-toggle">
            <button className={!settings.typewriter ? "on" : ""} onClick={() => updateSettings({ typewriter: false })}>Off</button>
            <button className={settings.typewriter ? "on" : ""} onClick={() => updateSettings({ typewriter: true })}>On</button>
          </div>
        </div>

        <div className="ks-setting-row">
          <div className="lbl">Taules animades
            <span className="hint">Les taules es construeixen fila a fila a l'entrar</span>
          </div>
          <div className="ks-toggle">
            <button className={!settings.tableAnim ? "on" : ""} onClick={() => updateSettings({ tableAnim: false })}>Off</button>
            <button className={settings.tableAnim ? "on" : ""} onClick={() => updateSettings({ tableAnim: true })}>On</button>
          </div>
        </div>

        <div style={{marginTop:40, display:"flex", gap:12}}>
          <button onClick={resetSettings} style={{
            border:"1px solid var(--rule)", background:"transparent", color:"var(--ink-2)",
            padding:"10px 16px", cursor:"pointer",
            fontFamily:"'IBM Plex Mono',monospace", fontSize:10, letterSpacing:".14em", textTransform:"uppercase",
          }}>Restaurar per defecte</button>
        </div>
      </div>
    </div>
  );
}

function NotFound({ navigate }) {
  return (
    <div className="ks-body" style={{textAlign:"center", paddingTop:120}}>
      <div className="ks-kicker">404</div>
      <h1 style={{fontFamily:"'Newsreader',serif", fontStyle:"italic", fontWeight:400, fontSize:48, margin:"16px 0"}}>
        Aquesta ruta no existeix.
      </h1>
      <button className="ks-theme" style={{width:"auto", padding:"10px 18px", fontFamily:"'IBM Plex Mono',monospace", fontSize:11, letterSpacing:".14em", textTransform:"uppercase"}}
        onClick={() => navigate("/home")}>Torna a l'inici</button>
    </div>
  );
}

function ReaderOverlay({ topicId, onExit }) {
  // Ara mateix només tenim data del tema A1a-1 carregat a VariantFocus.
  // Per topics no-implementats, mostrem un placeholder.
  const isImplemented = topicId === "A1a-1";

  // Label del capítol pare per la fletxa de tornar
  const parentLabel = React.useMemo(() => {
    for (const L of SYLLABUS) {
      for (const ch of L.chapters) {
        if (ch.topics.some((t) => t.id === topicId)) {
          return ch.id + " · " + ch.title.replace(/^[A-Z0-9]+ · /, "");
        }
      }
    }
    return "Temari";
  }, [topicId]);

  return (
    <div className="ks-reader-overlay">
      <button className="ks-reader-back" onClick={onExit} aria-label={"Tornar a " + parentLabel}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        <span>{parentLabel}</span>
      </button>
      {isImplemented
        ? <VariantFocus artboard={false}/>
        : <ReaderPlaceholder topicId={topicId} onExit={onExit}/>}
      <div className="ks-reader-esc-hint" aria-hidden="true">
        <kbd>Esc</kbd> per sortir
      </div>
    </div>
  );
}

function ReaderPlaceholder({ topicId, onExit }) {
  return (
    <div style={{
      flex:1, display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", textAlign:"center", padding: 40,
      background:"var(--paper)", color:"var(--ink)",
    }}>
      <div style={{fontFamily:"'IBM Plex Mono',monospace", fontSize:11, letterSpacing:".16em", textTransform:"uppercase", color:"var(--muted)", marginBottom:16}}>
        {topicId} · Aviat
      </div>
      <h2 style={{fontFamily:"'Newsreader',serif", fontStyle:"italic", fontWeight:400, fontSize:"clamp(32px, 5vw, 52px)", margin:"0 0 18px", maxWidth:600}}>
        Aquest tema encara no s'ha portat al format Focus Mode.
      </h2>
      <p style={{fontFamily:"'Newsreader',serif", fontSize:18, color:"var(--ink-2)", maxWidth:520, lineHeight:1.55, margin:"0 0 28px"}}>
        De moment només <i>A1a-1 · Pronomen</i> té el contingut migrat. Quan portis aquest tema al
        nou format al teu repo, apareixerà aquí automàticament.
      </p>
      <button onClick={onExit} style={{
        border:"1px solid var(--ink)", background:"transparent", color:"var(--ink)",
        padding:"10px 18px", cursor:"pointer",
        fontFamily:"'IBM Plex Mono',monospace", fontSize:11, letterSpacing:".14em", textTransform:"uppercase",
      }}>← Torna al temari</button>
    </div>
  );
}

Object.assign(window, { AppShell });
