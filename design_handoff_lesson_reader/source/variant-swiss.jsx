// Variació 2 — Swiss Grid (Minimal tipogràfic)
// Concepte: graella rígida de 12 columnes, tipografia sans geomètrica
// (Space Grotesk / Archivo), negres profunds, un accent taronja (signals
// alemanys DIN). Index lateral fix, contingut a la dreta. Exercicis
// pregunta-a-pregunta amb gran número + frase monumentalment gran.

function VariantSwiss({ artboard = false }) {
  const [stepIdx, setStepIdx] = React.useState(0);
  const step = TOPIC.steps[stepIdx];
  const total = TOPIC.steps.length;
  const go = (d) => setStepIdx((i) => Math.max(0, Math.min(total - 1, i + d)));

  return (
    <div className="ks-root" style={{width:"100%",height:"100%"}}>
      <style>{`
        .ks-root{
          --ink:#0a0a0a; --bg:#f4f2ed; --bg-2:#e8e4d9; --muted:#666;
          --rule:#0a0a0a; --thin:#cfc9bb; --accent:#e84d1c;
          font-family:'Space Grotesk', 'Archivo', system-ui, sans-serif;
          background: var(--bg); color: var(--ink);
          height:100%; display:grid;
          grid-template-rows: 48px 1fr 44px;
          overflow:hidden;
        }
        .ks-root *{box-sizing:border-box;}
        .ks-top{
          display:grid; grid-template-columns:260px 1fr auto;
          align-items:center; padding:0 20px; gap:20px;
          border-bottom:2px solid var(--ink);
          font-family:'JetBrains Mono', ui-monospace, monospace;
          font-size:11px; letter-spacing:.08em; text-transform:uppercase;
        }
        .ks-top b{font-family:'Space Grotesk'; font-weight:700; font-size:15px; letter-spacing:-.01em; text-transform:none;}
        .ks-top .meta{display:flex; gap:16px; align-items:center;}
        .ks-top .lang{background:var(--ink); color:var(--bg); padding:3px 8px;}
        .ks-body{display:grid; grid-template-columns:260px 1fr; min-height:0;}

        /* Index lateral */
        .ks-index{
          border-right:2px solid var(--ink); background:var(--bg-2);
          padding:20px 18px; overflow-y:auto; min-height:0;
        }
        .ks-index h3{margin:0 0 12px; font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:.2em; text-transform:uppercase;}
        .ks-index ol{list-style:none; padding:0; margin:0; counter-reset:s;}
        .ks-index li{counter-increment:s; margin-bottom:2px;}
        .ks-index button{
          display:grid; grid-template-columns:32px 1fr auto; gap:8px;
          width:100%; padding:7px 8px; border:none; background:transparent;
          text-align:left; cursor:pointer; font-family:inherit; font-size:13px;
          color:var(--ink); border-left:3px solid transparent;
        }
        .ks-index button::before{content:counter(s, decimal-leading-zero); font-family:'JetBrains Mono',monospace; font-size:10px; color:var(--muted);}
        .ks-index button:hover{background:rgba(0,0,0,.06);}
        .ks-index button.active{background:var(--ink); color:var(--bg); border-left-color:var(--accent);}
        .ks-index button.active::before{color:var(--accent);}
        .ks-index button .kind{font-family:'JetBrains Mono',monospace; font-size:9px; letter-spacing:.1em; text-transform:uppercase; color:var(--muted);}
        .ks-index button.active .kind{color:var(--bg-2);}
        .ks-index .marker{width:6px;height:6px;border-radius:50%;background:var(--thin);}
        .ks-index button.done .marker{background:var(--accent);}
        .ks-index button.active .marker{background:var(--bg);}

        /* Main */
        .ks-main{
          padding:28px 36px 20px; overflow-y:auto; min-height:0;
          background:
            linear-gradient(to right, transparent 0, transparent calc(100% - 1px), var(--thin) calc(100% - 1px)) 16.666% 0 / 16.666% 100% no-repeat,
            linear-gradient(to right, transparent 0, transparent calc(100% - 1px), var(--thin) calc(100% - 1px)) 33.333% 0 / 33.333% 100% no-repeat,
            linear-gradient(to right, transparent 0, transparent calc(100% - 1px), var(--thin) calc(100% - 1px)) 50% 0 / 50% 100% no-repeat,
            linear-gradient(to right, transparent 0, transparent calc(100% - 1px), var(--thin) calc(100% - 1px)) 66.666% 0 / 66.666% 100% no-repeat,
            linear-gradient(to right, transparent 0, transparent calc(100% - 1px), var(--thin) calc(100% - 1px)) 83.333% 0 / 83.333% 100% no-repeat;
        }
        .ks-step-num{
          font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.14em; text-transform:uppercase;
          color:var(--accent); margin-bottom:8px; display:flex; gap:12px; align-items:center;
        }
        .ks-step-num .bar{flex:1; height:2px; background:var(--ink);}
        .ks-heading{
          font-family:'Space Grotesk'; font-weight:700; font-size:54px; line-height:.95;
          letter-spacing:-.03em; margin:0 0 14px;
        }
        .ks-lead{
          font-size:20px; line-height:1.35; margin:0 0 18px; max-width:640px;
          font-weight:500;
        }
        .ks-body-text{font-size:14px; line-height:1.55; color:var(--ink); max-width:560px; margin:0 0 14px;}

        .k-mark{background:var(--accent); color:#fff; padding:0 3px;}

        .ks-grid-2{display:grid; grid-template-columns:2fr 1fr; gap:24px; align-items:start;}
        .ks-examples{display:flex; flex-direction:column; gap:0;}
        .ks-ex{
          display:grid; grid-template-columns: 1fr; gap:2px;
          padding:12px 0; border-top:1px solid var(--ink);
        }
        .ks-ex:last-child{border-bottom:1px solid var(--ink);}
        .ks-ex .de{font-family:'Space Grotesk'; font-size:24px; font-weight:500; letter-spacing:-.01em;}
        .ks-ex .ca{font-size:13px; color:var(--muted);}

        .ks-callout{
          padding:16px; background:var(--ink); color:var(--bg);
          border-left:4px solid var(--accent);
        }
        .ks-callout.warning{border-left-color:#ffcc00;}
        .ks-callout.tip{border-left-color:#00d084;}
        .ks-callout .tag{font-family:'JetBrains Mono',monospace; font-size:9px; letter-spacing:.2em; text-transform:uppercase; color:var(--accent); margin-bottom:6px;}
        .ks-callout.warning .tag{color:#ffcc00;}
        .ks-callout.tip .tag{color:#00d084;}
        .ks-callout h4{margin:0 0 6px; font-size:16px; font-family:'Space Grotesk'; font-weight:600;}
        .ks-callout p{margin:0; font-size:13px; line-height:1.5; opacity:.85;}

        /* Pronom tabs — monument */
        .ks-pron-grid{display:grid; grid-template-columns:repeat(5, 1fr); gap:1px; background:var(--ink); border:1px solid var(--ink); margin-bottom:16px;}
        .ks-pron-grid button{
          padding:14px 8px; background:var(--bg); border:none; cursor:pointer;
          font-family:'Space Grotesk'; font-weight:700; font-size:22px; letter-spacing:-.02em;
          color:var(--ink); transition:background .15s;
        }
        .ks-pron-grid button:hover{background:var(--bg-2);}
        .ks-pron-grid button.active{background:var(--accent); color:#fff;}
        .ks-pron-detail{
          display:grid; grid-template-columns:200px 1fr; gap:20px; padding:22px;
          border:2px solid var(--ink); background:#fff;
        }
        .ks-pron-detail .big{font-family:'Space Grotesk'; font-weight:700; font-size:96px; line-height:.9; letter-spacing:-.04em;}
        .ks-pron-detail .gloss{font-size:14px; color:var(--muted); margin-top:4px;}
        .ks-pron-detail .note{font-size:14px; line-height:1.5; margin:0 0 12px;}
        .ks-pron-detail .ex-de{font-family:'Space Grotesk'; font-weight:500; font-size:20px;}
        .ks-pron-detail .ex-ca{font-size:12px; color:var(--muted); font-style:italic;}

        /* Compare */
        .ks-compare{width:100%; border-collapse:collapse; font-size:13px;}
        .ks-compare th{text-align:left; padding:8px; background:var(--ink); color:var(--bg); font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:.1em; text-transform:uppercase; font-weight:500;}
        .ks-compare td{padding:10px 8px; border-bottom:1px solid var(--thin);}
        .ks-compare td.de{font-family:'Space Grotesk'; font-weight:600; font-size:16px;}

        /* Pairs */
        .ks-pairs{display:grid; grid-template-columns:1fr 1fr; gap:1px; background:var(--ink); border:1px solid var(--ink);}
        .ks-pair{background:#fff; padding:12px 14px;}
        .ks-pair .p{font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:.1em;}
        .ks-pair .pos{font-family:'Space Grotesk'; font-weight:700; font-size:26px; letter-spacing:-.02em;}
        .ks-pair .g{font-size:12px; color:var(--muted); font-style:italic;}

        /* Pitfalls */
        .ks-pit{border:2px solid var(--ink); margin-bottom:8px; display:grid; grid-template-columns:1fr 1fr;}
        .ks-pit .col{padding:14px 16px;}
        .ks-pit .bad{background:var(--ink); color:var(--bg); border-right:2px solid var(--ink);}
        .ks-pit .bad .tag{color:var(--accent);}
        .ks-pit .good{background:#fff;}
        .ks-pit .good .tag{color:#00a060;}
        .ks-pit .tag{font-family:'JetBrains Mono',monospace; font-size:9px; letter-spacing:.2em; text-transform:uppercase; margin-bottom:6px;}
        .ks-pit .line{font-family:'Space Grotesk'; font-size:17px; font-weight:500;}
        .ks-pit .why{grid-column:1/-1; padding:8px 16px; font-size:11px; color:var(--muted); font-family:'JetBrains Mono',monospace; border-top:1px solid var(--thin); background:var(--bg);}

        /* Exercise */
        .ks-ex-wrap{padding:0;}
        .ks-ex-head{display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:20px; border-bottom:2px solid var(--ink); padding-bottom:10px;}
        .ks-ex-head .t{font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:var(--muted);}
        .ks-ex-head .n{font-family:'Space Grotesk'; font-weight:700; font-size:64px; line-height:.9; color:var(--accent);}
        .ks-ex-head .n small{font-size:22px; color:var(--muted); margin-left:6px;}
        .ks-q{
          font-family:'Space Grotesk'; font-size:36px; font-weight:500; line-height:1.2;
          letter-spacing:-.02em; margin:12px 0 20px; min-height:100px;
        }
        .ks-slot{
          display:inline-block; min-width:90px; padding:0 10px;
          background:var(--accent); color:#fff; border-radius:2px;
        }
        .ks-slot.empty{background:transparent; color:var(--accent); border-bottom:3px solid var(--accent);}
        .ks-slot.ok{background:#00a060;}
        .ks-slot.bad{background:var(--ink); color:var(--accent);}
        .ks-choices{display:grid; grid-template-columns:repeat(2, 1fr); gap:8px; max-width:520px;}
        .ks-choice{
          padding:14px 16px; background:#fff; border:2px solid var(--ink);
          font-family:'Space Grotesk'; font-size:18px; font-weight:600;
          cursor:pointer; text-align:left; display:flex; justify-content:space-between; align-items:center;
        }
        .ks-choice:hover{background:var(--bg-2);}
        .ks-choice.picked{background:var(--ink); color:var(--bg);}
        .ks-choice .k{font-family:'JetBrains Mono',monospace; font-size:11px; opacity:.5;}
        .ks-type{font:inherit; border:none; border-bottom:3px solid var(--accent); outline:none; width:160px; padding:0 8px; background:transparent; font-family:inherit; font-size:inherit; font-weight:500; color:var(--ink);}
        .ks-feedback{margin-top:14px; padding:10px 14px; font-size:13px; font-family:'JetBrains Mono',monospace;}
        .ks-feedback.ok{background:#00a060; color:#fff;}
        .ks-feedback.bad{background:var(--accent); color:#fff;}

        /* Synthesis */
        .ks-syn{display:grid; grid-template-columns:1fr 1fr; gap:20px;}
        .ks-syn-table{border:2px solid var(--ink);}
        .ks-syn-table caption{padding:8px 12px; background:var(--ink); color:var(--bg); text-align:left; font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:.14em; text-transform:uppercase;}
        .ks-syn-table table{width:100%; border-collapse:collapse;}
        .ks-syn-table th{text-align:left; padding:6px 10px; border-bottom:1px solid var(--ink); font-family:'JetBrains Mono',monospace; font-size:10px; text-transform:uppercase; letter-spacing:.1em; color:var(--muted); font-weight:500;}
        .ks-syn-table td{padding:8px 10px; border-bottom:1px solid var(--thin); font-size:14px;}

        /* Foot */
        .ks-foot{
          display:grid; grid-template-columns:260px 1fr auto; align-items:center;
          border-top:2px solid var(--ink); padding:0 20px; background:var(--ink); color:var(--bg);
          font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase;
        }
        .ks-foot .arrow{
          display:inline-flex; align-items:center; gap:8px; padding:6px 14px;
          border:1px solid var(--bg); background:transparent; color:var(--bg);
          font-family:inherit; font-size:10px; letter-spacing:.14em; text-transform:uppercase; cursor:pointer;
        }
        .ks-foot .arrow:hover:not(:disabled){background:var(--accent); border-color:var(--accent);}
        .ks-foot .arrow:disabled{opacity:.3; cursor:not-allowed;}
      `}</style>

      <div className="ks-top">
        <div><b>Kompass</b></div>
        <div className="meta">
          <span>Tema {String(TOPIC.number).padStart(2,"0")} · {TOPIC.title}</span>
          <span style={{color:'var(--muted)'}}>— {TOPIC.subtitle}</span>
        </div>
        <div className="meta">
          <span className="lang">CA</span>
          <span>DE / A1a</span>
        </div>
      </div>

      <div className="ks-body">
        <aside className="ks-index">
          <h3>Ruta / {String(stepIdx+1).padStart(2,"0")}/{String(total).padStart(2,"0")}</h3>
          <ol>
            {TOPIC.steps.map((s, i) => (
              <li key={i}>
                <button className={(i===stepIdx?"active ":"") + (i<stepIdx?"done":"")}
                  onClick={() => setStepIdx(i)}>
                  <span></span>
                  <span>
                    <div className="kind">{s.kind === "exercise" ? (s.variant === "assessment" ? "Avaluació" : "Exercici") : s.kind === "synthesis" ? "Síntesi" : "Lliçó"}</div>
                    <div>{s.heading || s.id}</div>
                  </span>
                  <span className="marker" />
                </button>
              </li>
            ))}
          </ol>
        </aside>

        <main className="ks-main">
          <SwissStage step={step} idx={stepIdx} />
        </main>
      </div>

      <div className="ks-foot">
        <button className="arrow" onClick={() => go(-1)} disabled={stepIdx === 0}>← Prev</button>
        <div style={{textAlign:"center"}}>
          {step.heading || step.id}
        </div>
        <button className="arrow" onClick={() => go(1)} disabled={stepIdx === total-1}>Next →</button>
      </div>
    </div>
  );
}

function SwissStage({ step, idx }) {
  if (step.kind === "exercise") {
    const ex = EXERCISES[step.exerciseId];
    return <SwissExercise ex={ex} variant={step.variant} idx={idx} />;
  }
  if (step.kind === "synthesis") {
    return (
      <div>
        <div className="ks-step-num">
          <span>§ {String(idx+1).padStart(2,"0")} · Síntesi</span><div className="bar"/>
        </div>
        <h1 className="ks-heading">{step.heading}</h1>
        <div className="ks-syn">
          {step.tables.map((t, i) => (
            <div key={i} className="ks-syn-table">
              <caption>{t.title}</caption>
              <table>
                <thead><tr>{t.headers.map((h, j) => <th key={j}>{h}</th>)}</tr></thead>
                <tbody>{t.rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}>{parseInline(c)}</td>)}</tr>)}</tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="ks-step-num">
        <span>§ {String(idx+1).padStart(2,"0")} · {step.id}</span><div className="bar"/>
      </div>
      <h1 className="ks-heading">{step.heading}</h1>
      {step.lead && <p className="ks-lead">{parseInline(step.lead)}</p>}
      {step.body && <p className="ks-body-text">{parseInline(step.body)}</p>}

      <div className="ks-grid-2">
        <div>
          {step.examples && (
            <div className="ks-examples">
              {step.examples.map((e, i) => (
                <div key={i} className="ks-ex">
                  <div className="de">{parseInline(e.de)}</div>
                  <div className="ca">{e.ca}</div>
                </div>
              ))}
            </div>
          )}
          {step.tabs && <SwissPronTabs tabs={step.tabs}/>}
          {step.pairs && (
            <div className="ks-pairs">
              {step.pairs.map((p, i) => (
                <div key={i} className="ks-pair">
                  <div className="p">{p.personal}</div>
                  <div className="pos">{p.possessive}</div>
                  <div className="g">{p.gloss}</div>
                </div>
              ))}
            </div>
          )}
          {step.rule && (
            <ul style={{margin:"14px 0", paddingLeft:18, fontSize:14, lineHeight:1.6}}>
              {step.rule.map((r, i) => <li key={i}>{parseInline(r)}</li>)}
            </ul>
          )}
          {step.points && (
            <ul style={{margin:"14px 0", paddingLeft:18, fontSize:14, lineHeight:1.6}}>
              {step.points.map((p, i) => <li key={i}>{parseInline(p)}</li>)}
            </ul>
          )}
          {step.comparison && (
            <table className="ks-compare">
              <thead><tr><th>Castellà</th><th>Català</th><th>Alemany</th><th>Anglès</th></tr></thead>
              <tbody>{step.comparison.map((r, i) => (
                <tr key={i}>
                  <td>{r.es}</td><td>{r.ca}</td>
                  <td className="de">{parseInline(r.de)}</td>
                  <td>{r.en}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
          {step.pitfalls && step.pitfalls.map((p, i) => (
            <div key={i} className="ks-pit">
              <div className="col bad">
                <div className="tag">✗ Incorrecte</div>
                <div className="line">{parseInline(p.bad)}</div>
              </div>
              <div className="col good">
                <div className="tag">✓ Correcte</div>
                <div className="line">{parseInline(p.good)}</div>
              </div>
              <div className="why">{p.why}</div>
            </div>
          ))}
        </div>
        <div>
          {step.callout && (
            <div className={"ks-callout " + step.callout.variant}>
              <div className="tag">{step.callout.variant}</div>
              <h4>{step.callout.title}</h4>
              <p>{parseInline(step.callout.body)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SwissPronTabs({ tabs }) {
  const [i, setI] = React.useState(0);
  const t = tabs[i];
  return (
    <div>
      <div className="ks-pron-grid">
        {tabs.map((tab, j) => (
          <button key={j} className={i===j?"active":""} onClick={() => setI(j)}>{tab.pron}</button>
        ))}
      </div>
      <div className="ks-pron-detail">
        <div>
          <div className="big">{t.pron}</div>
          <div className="gloss">= {t.gloss}</div>
        </div>
        <div>
          <p className="note">{parseInline(t.note)}</p>
          <div className="ex-de">{parseInline(t.example.de)}</div>
          <div className="ex-ca">{t.example.ca}</div>
        </div>
      </div>
    </div>
  );
}

function SwissExercise({ ex, variant, idx }) {
  const { state, answer, next, prev, goto } = useExerciseState(ex.items.length);
  const item = ex.items[state.idx];
  const picked = state.answers[state.idx];
  const revealed = state.revealed[state.idx];
  const correct = revealed && picked === item.answer;

  return (
    <div className="ks-ex-wrap">
      <div className="ks-step-num">
        <span>§ {String(idx+1).padStart(2,"0")} · {variant === "assessment" ? "Avaluació" : "Comprovació ràpida"}</span><div className="bar"/>
      </div>
      <div className="ks-ex-head">
        <div>
          <div className="t">{ex.title}</div>
          <div style={{fontSize:14, marginTop:4, color:"var(--muted)"}}>{ex.prompt}</div>
        </div>
        <div className="n">{String(state.idx+1).padStart(2,"0")}<small>/{String(ex.items.length).padStart(2,"0")}</small></div>
      </div>

      <div className="ks-q">
        {ex.interaction === "typeIn" ? (
          <>
            {item.before}
            {revealed
              ? <span className={"ks-slot " + (correct ? "ok" : "bad")}>{picked}</span>
              : <SwissTypeSlot idx={state.idx} onCommit={(v) => answer(state.idx, v)} />}
            {item.after}
          </>
        ) : (
          (() => {
            const parts = item.sentence.split("__");
            return (
              <>
                {parts[0]}
                <span className={"ks-slot " + (revealed ? (correct ? "ok" : "bad") : "empty")}>
                  {picked || "———"}
                </span>
                {parts[1]}
              </>
            );
          })()
        )}
      </div>

      {ex.interaction === "singleChoice" && (
        <div className="ks-choices">
          {item.options.map((o, j) => (
            <button key={o} className={"ks-choice " + (picked===o?"picked":"")} onClick={() => answer(state.idx, o)}>
              <span>{o}</span>
              <span className="k">{String.fromCharCode(65+j)}</span>
            </button>
          ))}
        </div>
      )}

      {revealed && (
        <div className={"ks-feedback " + (correct ? "ok" : "bad")}>
          {correct ? "→ Correcte. " : "→ La resposta és " + item.answer + ". "}
          {item.hint && <span style={{opacity:.85}}>{item.hint}</span>}
        </div>
      )}

      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:22, paddingTop:14, borderTop:"2px solid var(--ink)"}}>
        <button className="ks-choice" style={{padding:"8px 16px"}} onClick={prev} disabled={state.idx === 0}>← Anterior</button>
        <div style={{display:"flex", gap:6}}>
          {ex.items.map((_, i) => (
            <button key={i} onClick={() => goto(i)}
              style={{
                width:24, height:24, border:"2px solid var(--ink)",
                background: state.answers[i] === ex.items[i].answer ? "#00a060"
                  : state.revealed[i] ? "var(--accent)"
                  : i === state.idx ? "var(--ink)"
                  : "var(--bg)",
                color: i === state.idx ? "var(--bg)" : "var(--ink)",
                fontFamily:"'JetBrains Mono',monospace", fontSize:10,
                cursor:"pointer",
              }}>{i+1}</button>
          ))}
        </div>
        <button className="ks-choice" style={{padding:"8px 16px", background:revealed?"var(--ink)":"var(--bg)", color:revealed?"var(--bg)":"var(--ink)"}} onClick={next} disabled={state.idx === ex.items.length-1 || !revealed}>Següent →</button>
      </div>
    </div>
  );
}

function SwissTypeSlot({ idx, onCommit }) {
  const [v, setV] = React.useState("");
  React.useEffect(() => { setV(""); }, [idx]);
  return (
    <input className="ks-type" value={v} autoFocus
      placeholder="___"
      onChange={(e) => setV(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && v.trim() && onCommit(v.trim())}
      onBlur={() => v.trim() && onCommit(v.trim())} />
  );
}

Object.assign(window, { VariantSwiss });
