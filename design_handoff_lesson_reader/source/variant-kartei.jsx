// Variació 3 — Kartei (Fitxes apilades, estil Bauhaus)
// Concepte: cada step és una fitxa (card) que es pot apilar/desapilar.
// Fons crema profund, tipografia DIN/geometric, tres colors primaris
// (vermell Bauhaus, blau DIN, groc signal). La "pila" al fons suggereix
// que hi ha més contingut; al front, una targeta enorme amb UNA idea.
// Exercicis: una fitxa per pregunta, girades a l'estil flashcard.

function VariantKartei({ artboard = false }) {
  const [stepIdx, setStepIdx] = React.useState(0);
  const step = TOPIC.steps[stepIdx];
  const total = TOPIC.steps.length;
  const go = (d) => setStepIdx((i) => Math.max(0, Math.min(total - 1, i + d)));

  return (
    <div className="kk-root" style={{width:"100%", height:"100%"}}>
      <style>{`
        .kk-root{
          --ink:#141414; --paper:#eae3d2; --paper-2:#ded4bb;
          --cream:#f4eedd; --red:#d1381c; --blue:#1f3e8c; --yellow:#f0c419;
          --muted:#706651;
          font-family:'Archivo', 'Inter', system-ui, sans-serif;
          background:
            radial-gradient(circle at 20% 10%, rgba(240,196,25,.25) 0, transparent 40%),
            radial-gradient(circle at 90% 85%, rgba(209,56,28,.18) 0, transparent 45%),
            var(--paper);
          color:var(--ink); height:100%; display:flex; flex-direction:column;
          overflow:hidden; position:relative;
        }
        .kk-root *{box-sizing:border-box;}

        .kk-head{
          display:flex; align-items:center; justify-content:space-between;
          padding:16px 28px; flex-shrink:0; position:relative; z-index:3;
        }
        .kk-logo{display:flex; align-items:center; gap:10px;}
        .kk-logo .mark{
          width:28px; height:28px; position:relative;
          background:var(--ink);
        }
        .kk-logo .mark::before{content:""; position:absolute; inset:0;
          background: conic-gradient(from 0deg, var(--red) 0 90deg, var(--blue) 90deg 180deg, var(--yellow) 180deg 270deg, var(--ink) 270deg 360deg);}
        .kk-logo b{font-family:'Archivo'; font-weight:800; font-size:18px; letter-spacing:-.02em;}
        .kk-crumb{font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:var(--muted);}

        .kk-rail{
          display:flex; gap:4px; padding:0 28px 12px; flex-shrink:0; position:relative; z-index:3;
          overflow-x:auto;
        }
        .kk-rail button{
          flex:0 0 auto; padding:6px 10px; border:2px solid var(--ink); background:var(--cream);
          font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:.1em; text-transform:uppercase;
          cursor:pointer; color:var(--ink); display:flex; align-items:center; gap:6px;
        }
        .kk-rail button .dot{width:8px; height:8px; border-radius:50%; background:var(--paper-2); border:1.5px solid var(--ink);}
        .kk-rail button.active{background:var(--ink); color:var(--cream);}
        .kk-rail button.active .dot{background:var(--yellow);}
        .kk-rail button.done .dot{background:var(--blue);}
        .kk-rail button.exercise.active .dot{background:var(--red);}

        .kk-stage{
          flex:1; position:relative; min-height:0;
          display:flex; align-items:center; justify-content:center;
          padding:0 40px;
        }

        /* Pila de fitxes darrere la fitxa principal */
        .kk-stack{position:absolute; inset:20px 40px 40px; pointer-events:none;}
        .kk-stack .ghost{
          position:absolute; inset:0; background:var(--cream);
          border:2px solid var(--ink); box-shadow:6px 6px 0 var(--ink);
        }
        .kk-stack .ghost:nth-child(1){transform:translate(10px, 14px) rotate(1.2deg); opacity:.55;}
        .kk-stack .ghost:nth-child(2){transform:translate(-12px, 8px) rotate(-1.5deg); opacity:.4;}
        .kk-stack .ghost:nth-child(3){transform:translate(4px, 20px) rotate(.6deg); opacity:.3;}

        .kk-card{
          position:relative; width:100%; max-width:720px; height:100%;
          max-height:calc(100% - 40px);
          background:var(--cream);
          border:3px solid var(--ink);
          box-shadow: 8px 8px 0 var(--ink);
          display:flex; flex-direction:column; z-index:2;
          overflow:hidden;
        }
        .kk-card-head{
          display:grid; grid-template-columns:auto 1fr auto; align-items:center;
          padding:12px 18px; border-bottom:2px solid var(--ink);
          background:var(--cream); gap:12px;
        }
        .kk-tag{
          font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:.14em; text-transform:uppercase;
          padding:3px 8px; background:var(--ink); color:var(--cream);
        }
        .kk-tag.ex{background:var(--red);}
        .kk-tag.syn{background:var(--blue); color:#fff;}
        .kk-card-head .mid{font-family:'Archivo'; font-weight:700; font-size:14px;}
        .kk-card-head .n{font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--muted);}

        .kk-card-body{
          flex:1; overflow:auto; padding:24px 28px; min-height:0;
          position:relative;
        }
        /* Decoració geomètrica Bauhaus: cercle / quadrat / triangle a cantonades */
        .kk-card-body::before{
          content:""; position:absolute; top:14px; right:18px;
          width:36px; height:36px; border-radius:50%; background:var(--red);
          opacity:.15; pointer-events:none;
        }

        .kk-h{
          font-family:'Archivo'; font-weight:800; font-size:40px; line-height:1.02;
          letter-spacing:-.03em; margin:0 0 14px; color:var(--ink);
        }
        .kk-lead{font-size:18px; line-height:1.4; margin:0 0 14px; max-width:48em;}
        .kk-p{font-size:13.5px; line-height:1.55; margin:0 0 10px; color:#2c2820; max-width:48em;}

        .k-mark{background:var(--yellow); padding:0 3px;}

        .kk-examples{margin:12px 0 14px;}
        .kk-ex-row{
          display:grid; grid-template-columns:16px 1fr auto;
          gap:10px; padding:10px 12px; background:#fff;
          border:2px solid var(--ink); margin-bottom:-2px; align-items:center;
        }
        .kk-ex-row:nth-child(3n+1) .bullet{background:var(--red);}
        .kk-ex-row:nth-child(3n+2) .bullet{background:var(--blue);}
        .kk-ex-row:nth-child(3n+3) .bullet{background:var(--yellow);}
        .kk-ex-row .bullet{width:12px; height:12px;}
        .kk-ex-row .de{font-family:'Archivo'; font-weight:600; font-size:15px;}
        .kk-ex-row .ca{font-size:12px; color:var(--muted); font-style:italic;}

        .kk-callout{
          display:grid; grid-template-columns:auto 1fr; gap:12px; padding:14px 16px;
          background:var(--ink); color:var(--cream); margin:14px 0;
          border-left:8px solid var(--yellow);
        }
        .kk-callout.tip{border-left-color:var(--blue);}
        .kk-callout.warning{border-left-color:var(--red);}
        .kk-callout .ico{width:32px; height:32px; background:var(--yellow); color:var(--ink); display:flex; align-items:center; justify-content:center;}
        .kk-callout.tip .ico{background:var(--blue); color:#fff;}
        .kk-callout.warning .ico{background:var(--red); color:#fff;}
        .kk-callout h4{margin:0 0 4px; font-family:'Archivo'; font-size:15px; font-weight:700;}
        .kk-callout p{margin:0; font-size:13px; line-height:1.5; opacity:.9;}

        /* Pronom stack: 5 fitxes apilades que es poden navegar */
        .kk-pron-wrap{margin:14px 0 10px;}
        .kk-pron-nav{display:flex; gap:6px; margin-bottom:12px; flex-wrap:wrap;}
        .kk-pron-nav button{
          padding:8px 14px; border:2px solid var(--ink); background:var(--cream);
          font-family:'Archivo'; font-weight:700; font-size:18px; cursor:pointer;
          letter-spacing:-.01em;
        }
        .kk-pron-nav button.active{background:var(--red); color:#fff;}
        .kk-pron-card{
          position:relative; padding:20px 22px; background:#fff; border:2px solid var(--ink);
          box-shadow:4px 4px 0 var(--ink); display:grid; grid-template-columns:1fr 1.5fr; gap:18px;
        }
        .kk-pron-card .huge{
          font-family:'Archivo'; font-weight:800; font-size:80px; line-height:.9;
          letter-spacing:-.04em; color:var(--ink);
        }
        .kk-pron-card .sub{font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:var(--muted); margin-top:4px;}
        .kk-pron-card .note{font-size:13px; line-height:1.5; margin:0 0 10px;}
        .kk-pron-card .ex-de{font-family:'Archivo'; font-weight:600; font-size:16px;}
        .kk-pron-card .ex-ca{font-size:11px; color:var(--muted); font-style:italic;}

        /* Pitfalls as flashcard-pairs */
        .kk-pit{display:grid; grid-template-columns:1fr 24px 1fr; gap:0; align-items:stretch; margin-bottom:10px;}
        .kk-pit .cell{padding:12px 14px; background:#fff; border:2px solid var(--ink);}
        .kk-pit .bad{background:#ffe7e2; border-color:var(--red);}
        .kk-pit .good{background:#e7f2ff; border-color:var(--blue);}
        .kk-pit .sep{display:flex; align-items:center; justify-content:center; font-family:'Archivo'; font-weight:800; font-size:22px; color:var(--ink);}
        .kk-pit .tag{font-family:'JetBrains Mono',monospace; font-size:9px; letter-spacing:.2em; text-transform:uppercase; margin-bottom:4px; color:var(--muted);}
        .kk-pit .line{font-family:'Archivo'; font-weight:600; font-size:15px;}
        .kk-pit-why{font-size:11.5px; color:var(--muted); margin:4px 0 12px; font-family:'JetBrains Mono',monospace;}

        /* Compare */
        .kk-compare{width:100%; border-collapse:separate; border-spacing:0; font-size:13px; margin:10px 0;}
        .kk-compare th{background:var(--ink); color:var(--cream); padding:8px 10px; text-align:left; font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:.1em; text-transform:uppercase; font-weight:500;}
        .kk-compare td{padding:8px 10px; background:#fff; border-bottom:2px solid var(--ink); border-right:1px solid var(--paper-2);}
        .kk-compare td.de{font-family:'Archivo'; font-weight:700; font-size:15px; background:var(--yellow);}

        /* Pairs */
        .kk-pairs{display:grid; grid-template-columns:repeat(auto-fit, minmax(140px,1fr)); gap:8px; margin:12px 0;}
        .kk-pair{padding:12px; background:#fff; border:2px solid var(--ink); box-shadow:3px 3px 0 var(--ink);}
        .kk-pair .p{font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:var(--muted);}
        .kk-pair .pos{font-family:'Archivo'; font-weight:800; font-size:24px; letter-spacing:-.02em; margin:2px 0;}
        .kk-pair:nth-child(5n+1) .pos{color:var(--red);}
        .kk-pair:nth-child(5n+2) .pos{color:var(--blue);}
        .kk-pair:nth-child(5n+3) .pos{color:var(--ink);}
        .kk-pair:nth-child(5n+4) .pos{color:var(--red);}
        .kk-pair:nth-child(5n+5) .pos{color:var(--blue);}
        .kk-pair .g{font-size:11px; color:var(--muted); font-style:italic;}

        /* Exercise flashcard */
        .kk-ex-card{padding:10px 0;}
        .kk-ex-prompt{font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:var(--muted); margin-bottom:14px;}
        .kk-q-big{
          font-family:'Archivo'; font-weight:700; font-size:32px; line-height:1.25;
          letter-spacing:-.02em; margin:18px 0 22px; min-height:100px;
        }
        .kk-slot{
          display:inline-block; min-width:90px; padding:0 12px;
          background:var(--yellow); border:2px solid var(--ink);
        }
        .kk-slot.empty{background:transparent; border-style:dashed;}
        .kk-slot.ok{background:#9dd4a4; border-color:#1a6a2d;}
        .kk-slot.bad{background:#f4a89a; border-color:var(--red);}
        .kk-type-in{font:inherit; background:var(--yellow); border:2px solid var(--ink); padding:2px 10px; width:150px; outline:none; text-align:center; font-weight:700;}
        .kk-choices{display:grid; grid-template-columns:repeat(2,1fr); gap:8px;}
        .kk-choice{
          padding:12px 14px; background:#fff; border:2px solid var(--ink);
          box-shadow:3px 3px 0 var(--ink); font-family:'Archivo'; font-weight:700;
          font-size:16px; cursor:pointer; text-align:left; display:flex; justify-content:space-between; align-items:center;
          transition:transform .1s;
        }
        .kk-choice:hover{transform:translate(-1px,-1px); box-shadow:4px 4px 0 var(--ink);}
        .kk-choice:active{transform:translate(2px,2px); box-shadow:1px 1px 0 var(--ink);}
        .kk-choice.picked{background:var(--ink); color:var(--cream);}
        .kk-choice .key{font-family:'JetBrains Mono',monospace; font-size:10px; width:22px; height:22px; border:1.5px solid currentColor; display:flex; align-items:center; justify-content:center;}
        .kk-feedback{margin-top:14px; padding:10px 14px; font-size:13px; border:2px solid var(--ink); font-family:'JetBrains Mono',monospace;}
        .kk-feedback.ok{background:#9dd4a4;}
        .kk-feedback.bad{background:#f4a89a;}
        .kk-hint{margin-top:10px; font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:.1em; text-transform:uppercase; color:var(--muted);}

        /* Syn */
        .kk-syn{display:grid; grid-template-columns:1fr 1fr; gap:14px;}
        .kk-syn-box{background:#fff; border:2px solid var(--ink); box-shadow:4px 4px 0 var(--ink); padding:12px 14px;}
        .kk-syn-box h3{margin:0 0 8px; font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:.14em; text-transform:uppercase;}
        .kk-syn-box table{width:100%; border-collapse:collapse; font-size:13px;}
        .kk-syn-box th{text-align:left; padding:4px 6px; border-bottom:1.5px solid var(--ink); font-family:'JetBrains Mono',monospace; font-size:10px; text-transform:uppercase; letter-spacing:.1em; color:var(--muted); font-weight:500;}
        .kk-syn-box td{padding:6px; border-bottom:1px dotted var(--paper-2);}

        /* Foot */
        .kk-foot{
          display:flex; align-items:center; justify-content:space-between;
          padding:14px 28px; flex-shrink:0; position:relative; z-index:3;
          border-top:2px solid var(--ink); background:var(--cream);
        }
        .kk-foot .btn{
          display:inline-flex; align-items:center; gap:8px; padding:9px 16px;
          border:2px solid var(--ink); background:var(--cream); cursor:pointer;
          font-family:'Archivo'; font-weight:700; font-size:13px; color:var(--ink);
          box-shadow:3px 3px 0 var(--ink); transition:transform .1s;
        }
        .kk-foot .btn:hover:not(:disabled){transform:translate(-1px,-1px); box-shadow:4px 4px 0 var(--ink);}
        .kk-foot .btn:active{transform:translate(2px,2px); box-shadow:1px 1px 0 var(--ink);}
        .kk-foot .btn.primary{background:var(--red); color:#fff;}
        .kk-foot .btn:disabled{opacity:.4; cursor:not-allowed; box-shadow:none;}
        .kk-foot .mid{font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:var(--muted);}
      `}</style>

      <div className="kk-head">
        <div className="kk-logo">
          <div className="mark"/>
          <b>KOMPASS</b>
          <span className="kk-crumb">/ {TOPIC.id} · {TOPIC.title}</span>
        </div>
        <div className="kk-crumb">Fitxa {String(stepIdx+1).padStart(2,"0")} de {String(total).padStart(2,"0")}</div>
      </div>

      <div className="kk-rail">
        {TOPIC.steps.map((s, i) => (
          <button key={i}
            className={(i===stepIdx?"active ":"") + (i<stepIdx?"done ":"") + (s.kind === "exercise" ? "exercise" : "")}
            onClick={() => setStepIdx(i)}>
            <span className="dot"/>
            <span>{String(i+1).padStart(2,"0")}</span>
          </button>
        ))}
      </div>

      <div className="kk-stage">
        <div className="kk-stack"><div className="ghost"/><div className="ghost"/><div className="ghost"/></div>
        <KarteiCard step={step} idx={stepIdx} total={total} />
      </div>

      <div className="kk-foot">
        <button className="btn" onClick={() => go(-1)} disabled={stepIdx === 0}>
          <Icon name="arrow-left" size={14}/> Anterior
        </button>
        <div className="mid">{step.heading || step.id}</div>
        <button className="btn primary" onClick={() => go(1)} disabled={stepIdx === total-1}>
          Següent <Icon name="arrow-right" size={14}/>
        </button>
      </div>
    </div>
  );
}

function KarteiCard({ step, idx, total }) {
  const label = step.kind === "exercise"
    ? (step.variant === "assessment" ? "Avaluació" : "Übung")
    : step.kind === "synthesis" ? "Síntese" : "Lektion";
  const tagCls = step.kind === "exercise" ? "ex" : step.kind === "synthesis" ? "syn" : "";
  return (
    <div className="kk-card" key={idx}>
      <div className="kk-card-head">
        <span className={"kk-tag " + tagCls}>{label}</span>
        <div className="mid">{step.heading || step.id}</div>
        <div className="n">{String(idx+1).padStart(2,"0")}/{String(total).padStart(2,"0")}</div>
      </div>
      <div className="kk-card-body">
        <KarteiContent step={step} />
      </div>
    </div>
  );
}

function KarteiContent({ step }) {
  if (step.kind === "exercise") {
    return <KarteiExercise ex={EXERCISES[step.exerciseId]} variant={step.variant}/>;
  }
  if (step.kind === "synthesis") {
    return (
      <div>
        <h1 className="kk-h">{step.heading}</h1>
        <div className="kk-syn">
          {step.tables.map((t, i) => (
            <div key={i} className="kk-syn-box">
              <h3>{t.title}</h3>
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
      <h1 className="kk-h">{step.heading}</h1>
      {step.lead && <p className="kk-lead">{parseInline(step.lead)}</p>}
      {step.body && <p className="kk-p">{parseInline(step.body)}</p>}
      {step.points && (
        <ul style={{margin:"10px 0 14px", paddingLeft:18, fontSize:13.5, lineHeight:1.55}}>
          {step.points.map((p, i) => <li key={i} style={{marginBottom:4}}>{parseInline(p)}</li>)}
        </ul>
      )}
      {step.examples && (
        <div className="kk-examples">
          {step.examples.map((e, i) => (
            <div key={i} className="kk-ex-row">
              <span className="bullet"/>
              <span className="de">{parseInline(e.de)}</span>
              <span className="ca">{e.ca}</span>
            </div>
          ))}
        </div>
      )}
      {step.tabs && <KarteiPron tabs={step.tabs}/>}
      {step.pairs && (
        <div className="kk-pairs">
          {step.pairs.map((p, i) => (
            <div key={i} className="kk-pair">
              <div className="p">{p.personal}</div>
              <div className="pos">{p.possessive}</div>
              <div className="g">{p.gloss}</div>
            </div>
          ))}
        </div>
      )}
      {step.rule && (
        <ul style={{margin:"10px 0", paddingLeft:18, fontSize:13.5, lineHeight:1.55}}>
          {step.rule.map((r, i) => <li key={i} style={{marginBottom:4}}>{parseInline(r)}</li>)}
        </ul>
      )}
      {step.comparison && (
        <table className="kk-compare">
          <thead><tr><th>Castellà</th><th>Català</th><th>Alemany</th><th>Anglès</th></tr></thead>
          <tbody>{step.comparison.map((r, i) => (
            <tr key={i}><td>{r.es}</td><td>{r.ca}</td><td className="de">{parseInline(r.de)}</td><td>{r.en}</td></tr>
          ))}</tbody>
        </table>
      )}
      {step.pitfalls && step.pitfalls.map((p, i) => (
        <div key={i}>
          <div className="kk-pit">
            <div className="cell bad"><div className="tag">✗ Incorrecte</div><div className="line">{parseInline(p.bad)}</div></div>
            <div className="sep">→</div>
            <div className="cell good"><div className="tag">✓ Correcte</div><div className="line">{parseInline(p.good)}</div></div>
          </div>
          <div className="kk-pit-why">↪ {p.why}</div>
        </div>
      ))}
      {step.callout && (
        <div className={"kk-callout " + step.callout.variant}>
          <div className="ico"><CalloutIcon variant={step.callout.variant}/></div>
          <div>
            <h4>{step.callout.title}</h4>
            <p>{parseInline(step.callout.body)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function KarteiPron({ tabs }) {
  const [i, setI] = React.useState(0);
  const t = tabs[i];
  return (
    <div className="kk-pron-wrap">
      <div className="kk-pron-nav">
        {tabs.map((tab, j) => (
          <button key={j} className={i===j?"active":""} onClick={() => setI(j)}>{tab.pron}</button>
        ))}
      </div>
      <div className="kk-pron-card">
        <div>
          <div className="huge">{t.pron}</div>
          <div className="sub">= {t.gloss}</div>
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

function KarteiExercise({ ex, variant }) {
  const { state, answer, next, prev, goto } = useExerciseState(ex.items.length);
  const item = ex.items[state.idx];
  const picked = state.answers[state.idx];
  const revealed = state.revealed[state.idx];
  const correct = revealed && picked === item.answer;
  return (
    <div className="kk-ex-card">
      <div className="kk-ex-prompt">{ex.title} · {ex.prompt}</div>
      <div className="kk-q-big">
        {ex.interaction === "typeIn" ? (
          <>
            {item.before}
            {revealed
              ? <span className={"kk-slot " + (correct ? "ok" : "bad")}>{picked}</span>
              : <KarteiTypeSlot idx={state.idx} onCommit={(v) => answer(state.idx, v)}/>}
            {item.after}
          </>
        ) : (() => {
          const parts = item.sentence.split("__");
          return (
            <>
              {parts[0]}
              <span className={"kk-slot " + (revealed ? (correct ? "ok" : "bad") : "empty")}>
                {picked || "____"}
              </span>
              {parts[1]}
            </>
          );
        })()}
      </div>
      {ex.interaction === "singleChoice" && (
        <div className="kk-choices">
          {item.options.map((o, j) => (
            <button key={o} className={"kk-choice " + (picked===o?"picked":"")} onClick={() => answer(state.idx, o)}>
              <span>{o}</span>
              <span className="key">{String.fromCharCode(65+j)}</span>
            </button>
          ))}
        </div>
      )}
      {!revealed && item.hint && <div className="kk-hint">💡 {item.hint}</div>}
      {revealed && (
        <div className={"kk-feedback " + (correct ? "ok" : "bad")}>
          {correct ? "✓ Correcte!" : "✗ Resposta: " + item.answer}
          {item.hint && <span style={{display:"block", marginTop:4, opacity:.7}}>{item.hint}</span>}
        </div>
      )}
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:20}}>
        <button className="kk-choice" style={{boxShadow:"none", padding:"6px 12px"}} onClick={prev} disabled={state.idx===0}>← Prev</button>
        <div style={{display:"flex", gap:4}}>
          {ex.items.map((_, i) => (
            <span key={i}
              style={{
                width:12, height:12, border:"1.5px solid var(--ink)",
                background: state.answers[i] === ex.items[i].answer ? "#9dd4a4"
                  : state.revealed[i] ? "var(--red)"
                  : i === state.idx ? "var(--yellow)"
                  : "#fff",
                cursor:"pointer",
              }}
              onClick={() => goto(i)} />
          ))}
        </div>
        <button className="kk-choice" style={{boxShadow:"none", padding:"6px 12px"}} onClick={next} disabled={state.idx===ex.items.length-1 || !revealed}>Next →</button>
      </div>
    </div>
  );
}

function KarteiTypeSlot({ idx, onCommit }) {
  const [v, setV] = React.useState("");
  React.useEffect(() => { setV(""); }, [idx]);
  return (
    <input className="kk-type-in" value={v} autoFocus placeholder="___"
      onChange={(e) => setV(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && v.trim() && onCommit(v.trim())}
      onBlur={() => v.trim() && onCommit(v.trim())} />
  );
}

Object.assign(window, { VariantKartei });
