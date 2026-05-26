// All 5 screens for the ISQ Agent prototype.

const { useState: uS, useEffect: uE, useRef: uR, useMemo: uM, useCallback: uC } = React;

// ─────────────────────────────────────────────────────────────
// Screen 1 — Landing
// ─────────────────────────────────────────────────────────────
const LandingPage = ({ navigate }) => {
  const howRef = uR(null);
  return (
    <div data-screen-label="01 Landing">
      <div className="river-ribbon" style={{ position: "relative" }}>
      <span className="river-ribbon-fill river-ribbon-fill-1" aria-hidden="true"/>
      <span className="river-ribbon-fill river-ribbon-fill-2" aria-hidden="true"/>
      <section className="container" style={{ paddingTop: 96, paddingBottom: 64, position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 760 }}>
          <div className="eyebrow" style={{ marginBottom: 18 }}>ISQ Agent · v1.0</div>
          <h1 className="h1 pretty" style={{ margin: "0 0 18px", maxWidth: 720, fontSize: 44, lineHeight: 1.1 }}>
            Answer supplier security questionnaires with grounded AI.
          </h1>
          <p className="muted pretty" style={{ fontSize: 17, lineHeight: 1.55, margin: "0 0 32px", maxWidth: 640 }}>
            Upload a questionnaire. The agent retrieves answers from your policies and historical responses,
            flags anything that needs a human, and outputs three deliverable formats.
          </p>
          <div className="row gap-4">
            <Button variant="accent" size="lg" onClick={() => navigate({ name: "upload" })} trailingIcon={<I.arrowRight size={14}/>}>
              Upload questionnaire
            </Button>
            <Button
              variant="ghost" size="lg"
              onClick={() => howRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              trailingIcon={<I.arrowDown size={13}/>}
            >
              How it works
            </Button>
          </div>
        </div>

        {/* Inline product snapshot — small, restrained */}
        <div className="card" style={{ marginTop: 64, padding: 0, overflow: "hidden", maxWidth: 880 }}>
          <div style={{ borderBottom: "1px solid var(--border)", padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, background: "var(--bg)" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--border-strong)" }}/>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--border-strong)" }}/>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--border-strong)" }}/>
            <span className="mono muted" style={{ fontSize: 11, marginLeft: 8 }}>isq-agent.local · /runs/sun-20260525-001/results</span>
          </div>
          <div style={{ padding: "22px 28px" }}>
            <div className="row between" style={{ marginBottom: 18 }}>
              <div>
                <div className="muted" style={{ fontSize: 11, fontWeight: 500, letterSpacing: 0.4 }}>RESULT</div>
                <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>Sunflowers Charity — ISQ</div>
              </div>
              <div className="row gap-2">
                <Badge variant="success" dot>Done · 42s</Badge>
                <Badge variant="warning" leadingIcon={<I.warning size={11}/>}>2 flagged</Badge>
              </div>
            </div>
            <div className="row gap-2" style={{ flexWrap: "wrap" }}>
              {[
                { q: 1, txt: "Do you maintain a formal Information Security Policy?", c: 0.93 },
                { q: 4, txt: "Do you encrypt customer data at rest and in transit?", c: 0.95 },
                { q: 6, txt: "How is privileged access to operational technology (OT) controlled?", c: 0.55, flag: true },
              ].map((r) => (
                <div key={r.q} className="card card-pad" style={{ flex: "1 1 240px", borderLeftWidth: r.flag ? 3 : 1, borderLeftColor: r.flag ? "var(--warning)" : undefined, background: r.flag ? "var(--warning-bg)" : "var(--surface)" }}>
                  <div className="row between" style={{ marginBottom: 8 }}>
                    <span className="mono muted" style={{ fontSize: 11 }}>Q{String(r.q).padStart(2, "0")}</span>
                    <ConfidenceBar score={r.c} compact/>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.45 }}>{r.txt}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      </div>

      {/* How it works */}
      <section ref={howRef} className="container" style={{ paddingTop: 32, paddingBottom: 96 }}>
        <div className="eyebrow" style={{ marginBottom: 16 }}>How it works</div>
        <h2 className="h2" style={{ margin: "0 0 28px", maxWidth: 560 }}>Three steps. Mostly the agent's, not yours.</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
          {[
            { n: "01", t: "Upload",       d: "Drop a questionnaire as PDF or XLSX, or forward it from your inbox.", icon: <I.upload size={18}/> },
            { n: "02", t: "Ground & answer", d: "Claude extracts the questions, retrieves the relevant policy chunks, and writes a vendor-tone answer per item.", icon: <I.search size={18}/> },
            { n: "03", t: "Deliver",      d: "Download a filled DOCX, a structured JSON, or the original XLSX with answers written back in.", icon: <I.download size={18}/> },
          ].map((s) => (
            <div key={s.n} className="card card-pad-lg">
              <div className="row gap-3" style={{ marginBottom: 12 }}>
                <span className="mono muted" style={{ fontSize: 11, fontWeight: 500 }}>{s.n}</span>
                <span style={{ color: "var(--fg-muted)" }}>{s.icon}</span>
              </div>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>{s.t}</div>
              <div className="muted pretty" style={{ fontSize: 13, lineHeight: 1.55 }}>{s.d}</div>
            </div>
          ))}
        </div>

        {/* Honesty strip */}
        <div className="card" style={{ marginTop: 40, padding: "20px 28px", display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Grounded, not generative.</div>
            <div className="muted" style={{ fontSize: 13 }}>Every answer cites the policy chunks it was drawn from. Low-confidence or out-of-scope answers are flagged, not hidden.</div>
          </div>
          <div className="row gap-6" style={{ fontFamily: "var(--mono)", fontSize: 12 }}>
            <div><div className="muted" style={{ fontSize: 11 }}>Median cost / ISQ</div><div style={{ fontWeight: 600 }}>$0.08</div></div>
            <div><div className="muted" style={{ fontSize: 11 }}>Median time</div><div style={{ fontWeight: 600 }}>42s</div></div>
            <div><div className="muted" style={{ fontSize: 11 }}>Flag rate</div><div style={{ fontWeight: 600 }}>~10%</div></div>
          </div>
        </div>
      </section>

      <Footer/>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Screen 2 — Upload
// ─────────────────────────────────────────────────────────────
const UploadPage = ({ navigate, onSubmit }) => {
  const [file, setFile] = uS(null);
  const [error, setError] = uS(null);
  const [phase, setPhase] = uS("idle"); // idle | validating | submitting

  const start = () => {
    setPhase("validating");
    setTimeout(() => {
      setPhase("submitting");
      setTimeout(() => {
        onSubmit(file);
      }, 700);
    }, 600);
  };

  const useExample = (ex) => {
    setError(null);
    setFile({ name: ex.name, size: parseFloat(ex.size) * (ex.size.includes("MB") ? 1024 * 1024 : 1024), type: ex.name.endsWith(".pdf") ? "application/pdf" : "spreadsheet" });
  };

  return (
    <div className="page" data-screen-label="02 Upload">
      <div className="container-narrow" style={{ paddingTop: 56, paddingBottom: 80, maxWidth: 720 }}>
        <div style={{ marginBottom: 28 }}>
          <a href="#" onClick={(e) => { e.preventDefault(); navigate({ name: "landing" }); }} className="muted" style={{ fontSize: 12, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <I.arrowRight size={11} style={{ transform: "scaleX(-1)" }}/> Home
          </a>
          <h1 className="h2" style={{ margin: "12px 0 6px" }}>Upload questionnaire</h1>
          <p className="muted" style={{ fontSize: 14, margin: 0 }}>Drop a file, or forward it from your inbox. The agent picks up the format automatically.</p>
        </div>

        {error && (
          <div style={{ marginBottom: 16 }}>
            <ErrorBanner message={error} onDismiss={() => setError(null)}/>
          </div>
        )}

        <Dropzone
          file={file}
          onFile={(f) => { setFile(f); setError(null); }}
          onRemove={() => setFile(null)}
          error={error}
          onError={(m) => setError(m)}
        />

        {/* Examples / shortcuts */}
        {!file && (
          <div style={{ marginTop: 16 }}>
            <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>Or try one of the examples</div>
            <div className="row gap-2" style={{ flexWrap: "wrap" }}>
              <button className="btn btn-secondary btn-sm" onClick={() => useExample({ name: "Sunflowers_Charity_Supplier_ISQ_Questionnaire.pdf", size: "6.2 KB" })}>
                <I.file size={12}/> Sunflowers Charity (PDF)
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => useExample({ name: "Blackridge_Wind_Energy_ISQ.pdf", size: "8.2 MB" })}>
                <I.file size={12}/> Blackridge Wind Energy (PDF)
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => useExample({ name: "Simple_Salvage_Vendor_Questionnaire.xlsx", size: "112 KB" })}>
                <I.file size={12}/> Simple Salvage (XLSX)
              </button>
            </div>
          </div>
        )}

        {/* CTA row */}
        <div className="row between" style={{ marginTop: 28 }}>
          <div className="muted" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap", minWidth: 0, overflow: "hidden" }}>
            <I.email size={13}/> <span>Or send to</span> <span className="mono" style={{ color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis" }}>isq-agent@northstar.example</span>
          </div>
          <Button
            variant="accent"
            size="lg"
            disabled={!file || phase !== "idle"}
            onClick={start}
            leadingIcon={phase === "idle" ? null : <Spinner/>}
          >
            {phase === "validating" ? "Checking file…" : phase === "submitting" ? "Sending to workflow…" : "Start processing"}
          </Button>
        </div>

        {/* Helper strip */}
        <div style={{ marginTop: 56, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
          <div className="row between" style={{ gap: 24, alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>What happens next</div>
              <div className="muted" style={{ fontSize: 12, lineHeight: 1.6 }}>
                The agent extracts the numbered questions, retrieves matching policy chunks, generates a vendor-tone answer per item,
                and assembles three formats. Most ISQs finish in under a minute. You can leave the page open — we'll redirect to the result.
              </div>
            </div>
            <div className="card" style={{ padding: 14, fontSize: 12, minWidth: 200 }}>
              <div className="muted" style={{ fontSize: 11, marginBottom: 6 }}>Backed by</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, lineHeight: 1.7 }}>
                <div>claude-sonnet-4.5</div>
                <div>voyage-3-large · 1024d</div>
                <div>pinecone · isq-agent-knowledge</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Small inline spinner
const Spinner = ({ size = 12 }) => (
  <span aria-hidden="true" style={{
    display: "inline-block", width: size, height: size, borderRadius: "50%",
    border: "2px solid currentColor", borderTopColor: "transparent",
    animation: "spin 700ms linear infinite",
  }}/>
);

// ─────────────────────────────────────────────────────────────
// Screen 3 — Processing
// ─────────────────────────────────────────────────────────────
const ProcessingPage = ({ run, navigate, onComplete, autoplay = true }) => {
  // Stages: 0 uploaded, 1 extracted, 2 answering, 3 rendering, 4 done
  const [stage, setStage] = uS(0);
  const [answered, setAnswered] = uS(0);
  const [elapsed, setElapsed] = uS(0);
  const total = 20;

  uE(() => {
    if (!autoplay) return;
    const t0 = performance.now();
    const tick = setInterval(() => setElapsed(Math.floor(performance.now() - t0)), 100);

    const seq = [
      [400,  () => setStage(1)],   // extracted
      [800,  () => setStage(2)],   // answering begins
    ];
    seq.forEach(([d, fn]) => setTimeout(fn, d));

    // answered counter, animated 0 → 20 over ~5s
    const ANS_DUR = 5000;
    const ANS_START = 900;
    const ansInterval = setInterval(() => {
      const t = performance.now() - t0 - ANS_START;
      if (t < 0) return;
      const v = Math.min(total, Math.floor((t / ANS_DUR) * total));
      setAnswered(v);
      if (v >= total) clearInterval(ansInterval);
    }, 90);

    const r1 = setTimeout(() => setStage(3), ANS_START + ANS_DUR + 100); // rendering
    const r2 = setTimeout(() => setStage(4), ANS_START + ANS_DUR + 1500); // done
    const r3 = setTimeout(() => onComplete && onComplete(), ANS_START + ANS_DUR + 2400);

    return () => {
      clearInterval(tick); clearInterval(ansInterval);
      clearTimeout(r1); clearTimeout(r2); clearTimeout(r3);
    };
  }, [autoplay, onComplete]);

  const stateOf = (idx) => stage > idx ? "done" : stage === idx ? "active" : "pending";

  const live = uM(() => ({
    answered, total,
    avgConf: 0.85 + (Math.random() * 0.02 - 0.01),
    cost: (0.0042 * answered),
  }), [answered]);

  return (
    <div className="page" data-screen-label="03 Processing">
      <div className="container" style={{ paddingTop: 40, paddingBottom: 64, maxWidth: 980 }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <a href="#" onClick={(e) => { e.preventDefault(); navigate({ name: "upload" }); }} className="muted" style={{ fontSize: 12, textDecoration: "none" }}>
            ← Upload
          </a>
          <div className="row between" style={{ marginTop: 12, gap: 16, alignItems: "flex-end" }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Run · {run.run_id}</div>
              <h1 className="h2" style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{run.filename}</h1>
            </div>
            <div className="row gap-2" aria-live="polite">
              {stage < 4 ? (
                <Badge variant="accent" leadingIcon={<Spinner size={9}/>}>Processing</Badge>
              ) : (
                <Badge variant="success" dot>Done</Badge>
              )}
              <Badge variant="default">{run.origin}</Badge>
            </div>
          </div>
        </div>

        {/* Two-column: timeline + counters */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 32 }}>
          {/* Timeline card */}
          <div className="card card-pad-lg">
            <div className="eyebrow" style={{ marginBottom: 18 }}>Pipeline</div>
            <div className="timeline">
              <TimelineStep
                state={stateOf(0) === "pending" ? "done" : "done"}
                title="Document uploaded"
                sub={`${run.filename} · received ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
              />
              <TimelineStep
                state={stateOf(1)}
                title="Questions extracted"
                sub={stage >= 1 ? `${total} questions found · ${run.origin}` : "Claude tool-use · structured JSON"}
              />
              <TimelineStep
                state={stateOf(2)}
                title={stage >= 2 ? `Answering ${answered} of ${total}` : "Answering"}
                sub={
                  stage === 2 ? <RunningStages answered={answered}/> :
                  stage > 2 ? `${total} questions answered · avg confidence ${live.avgConf.toFixed(2)}` :
                  "Retrieve · ground · generate per question"
                }
              />
              <TimelineStep
                state={stateOf(3)}
                title="Rendering outputs"
                sub={stage >= 3 ? "DOCX · XLSX · JSON" : "DOCX · XLSX · JSON"}
              />
              <TimelineStep
                state={stateOf(4)}
                title="Done"
                sub={stage >= 4 ? "Redirecting to results…" : "Awaiting"}
                last
              />
            </div>

            {/* Progress bar */}
            <div style={{ marginTop: 28 }}>
              <div className="row between" style={{ marginBottom: 6 }}>
                <span className="muted mono" style={{ fontSize: 11 }}>Overall</span>
                <span className="muted mono" style={{ fontSize: 11 }}>{Math.min(100, Math.round((stage >= 4 ? 1 : (answered / total) * 0.8 + stage * 0.05) * 100))}%</span>
              </div>
              <div className="progress">
                <span style={{ width: `${stage >= 4 ? 100 : Math.min(100, ((answered / total) * 0.8 + stage * 0.05) * 100)}%` }}/>
              </div>
            </div>
          </div>

          {/* Counters */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Stat icon={<I.hash size={13}/>} label="Answered" value={`${answered} / ${total}`} sub={`${total - answered} remaining`}/>
            <Stat icon={<I.spark size={13}/>} label="Avg confidence" value={live.avgConf.toFixed(2)} sub="weighted across 4 dims"/>
            <Stat icon={<I.zap size={13}/>}  label="Est. cost"      value={fmtCost(live.cost)} sub={`Sonnet 4.5 · ~$0.004/q`}/>
            <Stat icon={<I.clock size={13}/>} label="Elapsed"        value={fmtMs(elapsed)} sub={stage >= 4 ? "Complete" : "Live"}/>
          </div>
        </div>

        {/* Activity log */}
        <div className="card" style={{ marginTop: 24, padding: 0, overflow: "hidden" }}>
          <div className="row between" style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Activity</div>
            <div className="muted mono" style={{ fontSize: 11 }}>X-Request-Id: {run.run_id}</div>
          </div>
          <div className="mono" style={{ padding: "12px 18px", fontSize: 11, color: "var(--fg-muted)", maxHeight: 160, overflowY: "auto", lineHeight: 1.8 }}>
            <ActivityLog stage={stage} answered={answered}/>
          </div>
        </div>
      </div>
    </div>
  );
};

const RunningStages = ({ answered }) => {
  // small sub-progress: which question + which stage
  const subStages = ["embed", "vector_search", "generate", "confidence"];
  const idx = answered % subStages.length;
  return (
    <span>
      Q{String(answered + 1).padStart(2, "0")} · stage{" "}
      <span style={{ color: "var(--fg)" }}>{subStages[idx]}</span>
    </span>
  );
};

const ActivityLog = ({ stage, answered }) => {
  const lines = [
    { t: 0,    s: "POST /extract-questions → 200 · 20 questions parsed (412ms)" },
    { t: 1,    s: "POST /answer Q01 → 200 · cites_policy=1.0 · conf=0.93 (1820ms)" },
    { t: 1.5,  s: "POST /answer Q02 → 200 · cites_policy=1.0 · conf=0.91 (1640ms)" },
    { t: 2.5,  s: "POST /answer Q06 → 200 · cites_policy=0.6 · review=true (2140ms)" },
    { t: 3,    s: "POST /answer Q11 → 200 · cites_policy=0.55 · review=true (2230ms)" },
    { t: 4,    s: "POST /answer Q20 → 200 · cites_policy=1.0 · conf=0.90 (1660ms)" },
    { t: 5,    s: "render(docx) ✓ · render(xlsx) ✓ · render(json) ✓" },
    { t: 6,    s: "run sun-20260525-001 complete · 2 flagged · $0.078 · 42s" },
  ];
  // cap how many to show based on stage/answered
  const limit =
    stage <= 1 ? 1 :
    stage === 2 ? Math.min(5, 1 + Math.floor(answered / 4)) :
    stage === 3 ? 7 :
    8;
  return (
    <>
      {lines.slice(0, limit).map((l, i) => (
        <div key={i}>
          <span style={{ color: "var(--fg-subtle)" }}>{`19:30:${String(i * 5).padStart(2, "0")}`}</span>{" "}
          {l.s}
        </div>
      ))}
      {stage < 4 && (
        <div style={{ color: "var(--accent)" }}>
          <span style={{ color: "var(--fg-subtle)" }}>{`19:30:${String(20 + answered).padStart(2, "0")}`}</span>{" "}
          ▎ working…
        </div>
      )}
    </>
  );
};

// ─────────────────────────────────────────────────────────────
// Screen 4 — Results
// ─────────────────────────────────────────────────────────────
const ResultsPage = ({ run, navigate }) => {
  const [tab, setTab] = uS("answers");
  const [expanded, setExpanded] = uS(new Set([1, 6])); // open Q1 + flagged
  const [toast, setToast] = uS(null);

  const showToast = (msg) => {
    setToast({ id: Date.now(), msg });
    setTimeout(() => setToast(null), 2200);
  };

  const filtered = uM(() => {
    if (tab === "flagged") return run.answers.filter((a) => a.needs_review);
    return run.answers;
  }, [tab, run]);

  return (
    <div className="page" data-screen-label="04 Results">
      <div className="container" style={{ paddingTop: 40, paddingBottom: 80, maxWidth: 1120 }}>
        {/* Header */}
        <div className="row between" style={{ marginBottom: 12, alignItems: "flex-end" }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Run · {run.meta.run_id}</div>
            <h1 className="h2" style={{ margin: 0 }}>{run.meta.filename}</h1>
            <div className="muted" style={{ fontSize: 13, marginTop: 6, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span>{run.meta.origin}</span>
              <span style={{ width: 2, height: 2, background: "var(--fg-subtle)", borderRadius: 1 }}/>
              <span>{run.meta.total_questions} questions answered</span>
              <span style={{ width: 2, height: 2, background: "var(--fg-subtle)", borderRadius: 1 }}/>
              <span>{run.summary.flagged_count} flagged for review</span>
              <span style={{ width: 2, height: 2, background: "var(--fg-subtle)", borderRadius: 1 }}/>
              <span>{fmtMs(run.summary.total_latency_ms)}</span>
              <span style={{ width: 2, height: 2, background: "var(--fg-subtle)", borderRadius: 1 }}/>
              <span>{fmtCost(run.summary.total_cost_usd)}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" leadingIcon={<I.refresh size={13}/>} onClick={() => navigate({ name: "upload" })}>New run</Button>
        </div>

        {/* Summary + Downloads */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 16, marginTop: 24 }}>
          <div className="card card-pad-lg">
            <div className="eyebrow" style={{ marginBottom: 14 }}>Deliverables</div>
            <div className="row gap-2" style={{ flexWrap: "wrap" }}>
              <Button variant="accent" leadingIcon={<I.fileDocx size={14}/>} onClick={() => showToast("Sunflowers_Response.docx · 24 KB downloaded")}>Download DOCX</Button>
              <Button variant="secondary" leadingIcon={<I.fileXlsx size={14}/>} onClick={() => showToast("Sunflowers_Filled.xlsx · 32 KB downloaded")}>Download XLSX</Button>
              <Button variant="secondary" leadingIcon={<I.fileJson size={14}/>} onClick={() => showToast("Sunflowers_Response.json · 18 KB downloaded")}>Download JSON</Button>
              <Button variant="ghost" leadingIcon={<I.copy size={13}/>} onClick={() => showToast("Run link copied")}>Copy link</Button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginTop: 24 }}>
              <MiniStat label="Answered" value={`${run.summary.total_questions - run.summary.flagged_count}/${run.summary.total_questions}`} sub="auto-cleared"/>
              <MiniStat label="Flagged" value={String(run.summary.flagged_count)} sub="needs review" tone="warn"/>
              <MiniStat label="Avg conf." value={run.summary.average_confidence.toFixed(2)} sub="weighted"/>
              <MiniStat label="Total cost" value={fmtCost(run.summary.total_cost_usd)} sub={`${fmtNum(run.summary.total_tokens_in + run.summary.total_tokens_out)} tokens`}/>
            </div>
          </div>

          {/* Flagged summary */}
          <div className="card card-pad-lg" style={{ background: "var(--warning-bg)", borderColor: "var(--warning-border)" }}>
            <div className="row gap-2" style={{ marginBottom: 12 }}>
              <I.warning size={14} style={{ color: "#B45309" }}/>
              <span className="eyebrow" style={{ color: "#B45309" }}>Needs review</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>2 questions flagged</div>
            <div className="muted" style={{ fontSize: 13, lineHeight: 1.55, marginBottom: 14 }}>
              Both are out-of-scope (Northstar Labs is software-only). The agent flagged them rather than over-claiming.
            </div>
            <div className="row gap-2" style={{ flexWrap: "wrap" }}>
              {run.summary.flagged_indices.map((i) => (
                <button
                  key={i}
                  onClick={() => { setTab("flagged"); setExpanded(new Set([i])); }}
                  className="btn btn-secondary btn-sm"
                  style={{ background: "var(--surface)" }}
                >Q{String(i).padStart(2, "0")}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ marginTop: 36 }}>
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { id: "answers",   label: "Answers",   count: run.summary.total_questions },
              { id: "flagged",   label: "Flagged",   count: run.summary.flagged_count },
              { id: "citations", label: "Citations", count: run.top_citations.length },
              { id: "metrics",   label: "Metrics" },
            ]}
          />

          <div style={{ marginTop: 24 }}>
            {(tab === "answers" || tab === "flagged") && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {filtered.map((a) => (
                  <AnswerCard
                    key={a.index}
                    answer={a}
                    open={expanded.has(a.index)}
                    onToggle={() => {
                      const n = new Set(expanded);
                      n.has(a.index) ? n.delete(a.index) : n.add(a.index);
                      setExpanded(n);
                    }}
                  />
                ))}
              </div>
            )}
            {tab === "citations" && <CitationsTab run={run}/>}
            {tab === "metrics" && <MetricsTab run={run}/>}
          </div>
        </div>
      </div>

      <div className="toast-wrap">
        {toast && <Toast key={toast.id} message={toast.msg} icon={<I.check size={14}/>}/>}
      </div>
    </div>
  );
};

const MiniStat = ({ label, value, sub, tone }) => (
  <div>
    <div className="muted" style={{ fontSize: 11, fontWeight: 500, marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 20, fontWeight: 600, fontFamily: "var(--mono)", letterSpacing: "-0.01em", color: tone === "warn" ? "#B45309" : "var(--fg)" }}>{value}</div>
    {sub && <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{sub}</div>}
  </div>
);

// —— Answer card ——
const AnswerCard = ({ answer, open, onToggle }) => {
  const flagged = answer.needs_review;
  return (
    <div
      className="card"
      style={{
        padding: 0,
        borderLeftWidth: flagged ? 3 : 1,
        borderLeftColor: flagged ? "var(--warning)" : "var(--border)",
        background: flagged ? "var(--warning-bg)" : "var(--surface)",
        transition: "background 200ms cubic-bezier(.2,.7,.3,1)",
      }}
    >
      <button
        onClick={onToggle}
        aria-expanded={open}
        style={{
          width: "100%", textAlign: "left", padding: "16px 20px",
          background: "transparent", border: 0, cursor: "pointer",
          display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 16, alignItems: "center",
        }}
      >
        <span className="mono muted" style={{ fontSize: 11 }}>Q{String(answer.index).padStart(2, "0")}</span>
        <span style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.45, color: "var(--fg)" }}>{answer.question}</span>
        <span className="row gap-3">
          {flagged && <Badge variant="warning" leadingIcon={<I.warning size={10}/>}>Review</Badge>}
          <ConfidenceBar score={answer.confidence.score} dimensions={answer.confidence} compact/>
          <span style={{ color: "var(--fg-subtle)", transition: "transform 200ms", transform: open ? "rotate(90deg)" : "none" }}>
            <I.chevronRight size={14}/>
          </span>
        </span>
      </button>
      {open && (
        <div style={{ padding: "0 20px 20px 20px", animation: "fadein 200ms" }}>
          <div style={{ paddingTop: 6, paddingLeft: 44, fontSize: 14, lineHeight: 1.6, color: "var(--fg)" }} className="pretty">
            {answer.answer}
          </div>

          {flagged && (
            <div style={{ paddingLeft: 44, marginTop: 12, fontSize: 12, color: "#B45309", fontStyle: "italic", lineHeight: 1.55 }}>
              {answer.review_reason}
            </div>
          )}

          {/* Citations + dim breakdown */}
          <div style={{ paddingLeft: 44, marginTop: 18, display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div className="muted" style={{ fontSize: 11, fontWeight: 500, marginBottom: 8 }}>CITATIONS</div>
              <div className="row gap-2" style={{ flexWrap: "wrap" }}>
                {answer.citations.map((c, i) => (
                  <span key={i} title={`${c.source} · p${c.page}`} className="badge badge-default" style={{ fontFamily: "var(--mono)" }}>
                    <I.bookmark size={10}/> {c.id}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ minWidth: 260 }}>
              <div className="muted" style={{ fontSize: 11, fontWeight: 500, marginBottom: 8 }}>CONFIDENCE BREAKDOWN</div>
              <DimBreakdown d={answer.confidence}/>
            </div>
            <div style={{ minWidth: 130 }}>
              <div className="muted" style={{ fontSize: 11, fontWeight: 500, marginBottom: 8 }}>METRICS</div>
              <div className="mono" style={{ fontSize: 11, color: "var(--fg-muted)", lineHeight: 1.7 }}>
                <div>{fmtCost(answer.metrics.cost_usd)} · {fmtMs(answer.metrics.latency_ms)}</div>
                <div>{fmtNum(answer.metrics.tokens_in)} in / {fmtNum(answer.metrics.tokens_out)} out</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DimBreakdown = ({ d }) => {
  const dims = [
    { k: "cites_policy", v: d.cites_policy, w: 0.40 },
    { k: "on_topic",     v: d.on_topic,     w: 0.25 },
    { k: "vendor_tone",  v: d.vendor_tone,  w: 0.20 },
    { k: "complete",     v: d.complete,     w: 0.15 },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {dims.map((x) => (
        <div key={x.k} style={{ display: "grid", gridTemplateColumns: "100px 1fr 40px", gap: 8, alignItems: "center", fontSize: 11 }}>
          <span className="mono muted">{x.k} <span style={{ color: "var(--fg-subtle)" }}>×{x.w.toFixed(2)}</span></span>
          <span className="conf-bar" style={{ width: "100%" }}>
            <span style={{ width: `${x.v * 100}%`, background: x.v >= 0.8 ? "var(--success)" : x.v >= 0.5 ? "var(--warning)" : "var(--error)" }}/>
          </span>
          <span className="mono" style={{ textAlign: "right", color: x.v >= 0.8 ? "var(--success)" : x.v >= 0.5 ? "#B45309" : "var(--error)" }}>{x.v.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
};

// —— Citations tab ——
const CitationsTab = ({ run }) => (
  <div className="card" style={{ padding: 0, overflow: "hidden" }}>
    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 80px 100px 120px", padding: "12px 20px", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 500, color: "var(--fg-muted)", letterSpacing: 0.04, textTransform: "uppercase" }}>
      <span>Citation</span><span>Source</span><span style={{ textAlign: "right" }}>Page</span><span style={{ textAlign: "right" }}>Used in</span><span style={{ textAlign: "right" }}>Avg score</span>
    </div>
    {run.top_citations.map((c, i) => (
      <div key={i} style={{ display: "grid", gridTemplateColumns: "120px 1fr 80px 100px 120px", padding: "14px 20px", borderBottom: i === run.top_citations.length - 1 ? 0 : "1px solid var(--border)", fontSize: 13, alignItems: "center" }}>
        <span className="mono">{c.id}</span>
        <span className="muted" style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.source}</span>
        <span className="mono muted" style={{ textAlign: "right", fontSize: 12 }}>{c.page}</span>
        <span className="mono" style={{ textAlign: "right", fontSize: 12 }}>{c.used_in}× question{c.used_in === 1 ? "" : "s"}</span>
        <span className="mono" style={{ textAlign: "right", fontSize: 12, color: c.avg_score >= 0.85 ? "var(--success)" : "var(--fg)" }}>{c.avg_score.toFixed(2)}</span>
      </div>
    ))}
  </div>
);

// —— Metrics tab ——
const MetricsTab = ({ run }) => (
  <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 16 }}>
    <div className="card card-pad-lg">
      <div className="eyebrow" style={{ marginBottom: 14 }}>Latency by stage</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {run.stages.map((s) => {
          const max = Math.max(...run.stages.map((x) => x.latency_ms));
          const w = (s.latency_ms / max) * 100;
          return (
            <div key={s.id}>
              <div className="row between" style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 12 }}>{s.label}</span>
                <span className="mono muted" style={{ fontSize: 11 }}>{fmtMs(s.latency_ms)}</span>
              </div>
              <div className="conf-bar" style={{ width: "100%", height: 6 }}>
                <span style={{ width: `${w}%`, background: s.id === "generate" ? "var(--accent)" : "var(--fg)" }}/>
              </div>
            </div>
          );
        })}
      </div>
      <div className="muted" style={{ fontSize: 11, marginTop: 14, lineHeight: 1.5 }}>
        Generation is ~75% of total time. Embedding + search are negligible.
      </div>
    </div>

    <div className="card card-pad-lg">
      <div className="eyebrow" style={{ marginBottom: 14 }}>Cost & tokens</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <MiniStat label="Total cost"        value={fmtCost(run.summary.total_cost_usd)} sub="per ISQ"/>
        <MiniStat label="Cost / question"   value={fmtCost(run.summary.total_cost_usd / 20)} sub="median"/>
        <MiniStat label="Tokens in"         value={fmtNum(run.summary.total_tokens_in)} sub="Sonnet 4.5"/>
        <MiniStat label="Tokens out"        value={fmtNum(run.summary.total_tokens_out)}/>
      </div>
      <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
        <div className="muted" style={{ fontSize: 11, fontWeight: 500, marginBottom: 6 }}>BREAKDOWN</div>
        <div className="mono" style={{ fontSize: 11, color: "var(--fg-muted)", lineHeight: 1.8 }}>
          <div>generation     <span style={{ float: "right", color: "var(--fg)" }}>$0.071   91%</span></div>
          <div>embeddings     <span style={{ float: "right", color: "var(--fg)" }}>$0.004    5%</span></div>
          <div>query rewrite  <span style={{ float: "right", color: "var(--fg)" }}>$0.003    4%</span></div>
        </div>
      </div>
    </div>

    <div className="card card-pad-lg" style={{ gridColumn: "1 / -1" }}>
      <div className="eyebrow" style={{ marginBottom: 14 }}>Per-question telemetry</div>
      <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 90px 100px 80px", padding: "0 4px 8px", fontSize: 11, color: "var(--fg-muted)", borderBottom: "1px solid var(--border)" }}>
        <span>#</span><span>Question</span><span style={{ textAlign: "right" }}>Conf.</span><span style={{ textAlign: "right" }}>Latency</span><span style={{ textAlign: "right" }}>Cost</span>
      </div>
      <div style={{ maxHeight: 260, overflowY: "auto" }}>
        {run.answers.map((a) => (
          <div key={a.index} style={{ display: "grid", gridTemplateColumns: "40px 1fr 90px 100px 80px", padding: "8px 4px", borderBottom: "1px solid var(--border)", fontSize: 12, alignItems: "center" }}>
            <span className="mono muted">Q{String(a.index).padStart(2, "0")}</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 12 }}>{a.question}</span>
            <span style={{ textAlign: "right" }}><ConfidenceBar score={a.confidence.score} compact/></span>
            <span className="mono muted" style={{ textAlign: "right", fontSize: 11 }}>{fmtMs(a.metrics.latency_ms)}</span>
            <span className="mono muted" style={{ textAlign: "right", fontSize: 11 }}>{fmtCost(a.metrics.cost_usd)}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// Screen 5 — Settings
// ─────────────────────────────────────────────────────────────
const SettingsPage = ({ navigate }) => {
  const [model, setModel] = uS("sonnet");
  const [threshold, setThreshold] = uS(0.6);
  const [reindexing, setReindexing] = uS(false);
  const [reindexed, setReindexed] = uS(false);
  const [toast, setToast] = uS(null);
  const [keys, setKeys] = uS({
    anthropic: "sk-ant-•••••••••••••••••••••••••••••••••••3xK",
    voyage:    "pa-•••••••••••••••••••••••••••••••••••2bH",
    pinecone:  "pcsk_••••••••••••••••••••••••••••••••••aN",
  });
  const reindex = () => {
    setReindexing(true);
    setTimeout(() => { setReindexing(false); setReindexed(true); }, 1600);
  };
  const save = () => {
    setToast(Date.now());
    setTimeout(() => setToast(null), 2200);
  };

  return (
    <div className="page" data-screen-label="05 Settings">
      <div className="container-narrow" style={{ paddingTop: 56, paddingBottom: 96, maxWidth: 720 }}>
        <div style={{ marginBottom: 28 }}>
          <h1 className="h2" style={{ margin: "0 0 6px" }}>Settings</h1>
          <p className="muted" style={{ fontSize: 14, margin: 0 }}>Keys, model, and the threshold the agent uses to flag answers for review.</p>
        </div>

        <SettingSection
          title="API configuration"
          subtitle="Keys are masked on display. Saved keys are written to the encrypted local volume only."
          icon={<I.key size={16}/>}
        >
          <SettingsField label="Anthropic API key">
            <input className="input input-mono" value={keys.anthropic} onChange={(e) => setKeys({ ...keys, anthropic: e.target.value })}/>
          </SettingsField>
          <SettingsField label="Voyage API key" help="Used for embedding the corpus and per-question queries.">
            <input className="input input-mono" value={keys.voyage} onChange={(e) => setKeys({ ...keys, voyage: e.target.value })}/>
          </SettingsField>
          <SettingsField label="Pinecone API key" help="Index name is configured via PINECONE_INDEX env var.">
            <input className="input input-mono" value={keys.pinecone} onChange={(e) => setKeys({ ...keys, pinecone: e.target.value })}/>
          </SettingsField>
        </SettingSection>

        <SettingSection title="Model" subtitle="The model used for answer generation. Query rewriting always uses Haiku." icon={<I.spark size={16}/>}>
          <RadioCardGroup
            value={model} onChange={setModel}
            options={[
              { id: "sonnet", title: "Claude Sonnet 4.5", meta: "default · slower · ~$0.004/q", desc: "Best quality. Use for customer-facing ISQs." },
              { id: "haiku",  title: "Claude Haiku 4.5",  meta: "fast · ~$0.0008/q",            desc: "Use for batch backfill or non-critical runs." },
            ]}
          />
        </SettingSection>

        <SettingSection title="Confidence threshold" subtitle="Answers below this aggregate score are flagged for human review. Default 0.60." icon={<I.sliders size={16}/>}>
          <ConfidenceSlider value={threshold} onChange={setThreshold}/>
        </SettingSection>

        <SettingSection title="Knowledge base" subtitle="Re-embed the source corpus and rebuild the Pinecone index." icon={<I.database size={16}/>}>
          <div className="row between" style={{ padding: "16px 0" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Reindex knowledge base</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                {reindexed ? "Last reindex · just now · 142 chunks across 3 sources" : "Last reindex · 2026-05-24 14:12 · 142 chunks across 3 sources"}
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={reindex}
              disabled={reindexing}
              leadingIcon={reindexing ? <Spinner/> : <I.refresh size={13}/>}
            >
              {reindexing ? "Reindexing…" : reindexed ? "Reindex again" : "Reindex"}
            </Button>
          </div>
        </SettingSection>

        {/* Save bar */}
        <div className="row between" style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
          <span className="muted" style={{ fontSize: 12 }}>Changes are applied to the next run.</span>
          <div className="row gap-2">
            <Button variant="ghost" onClick={() => navigate({ name: "landing" })}>Cancel</Button>
            <Button variant="accent" onClick={save} leadingIcon={<I.check size={13}/>}>Save settings</Button>
          </div>
        </div>
      </div>

      <div className="toast-wrap">
        {toast && <Toast message="Settings saved" icon={<I.check size={14}/>}/>}
      </div>
    </div>
  );
};

const SettingSection = ({ title, subtitle, icon, children }) => (
  <section style={{ marginTop: 36 }}>
    <div style={{ marginBottom: 16, display: "flex", gap: 12, alignItems: "flex-start" }}>
      {icon && <span style={{ width: 32, height: 32, borderRadius: 6, background: "var(--bg)", display: "grid", placeItems: "center", color: "var(--fg-muted)", flex: "0 0 auto" }}>{icon}</span>}
      <div>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
        {subtitle && <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{subtitle}</div>}
      </div>
    </div>
    <div className="card card-pad-lg">{children}</div>
  </section>
);

const SettingsField = ({ label, help, children }) => (
  <div style={{ marginBottom: 18 }}>
    <label className="label">{label}</label>
    {children}
    {help && <div className="help">{help}</div>}
  </div>
);

const RadioCardGroup = ({ options, value, onChange }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
    {options.map((o) => (
      <label
        key={o.id}
        className="card"
        style={{
          padding: 16, cursor: "pointer",
          borderColor: value === o.id ? "var(--fg)" : "var(--border)",
          boxShadow: value === o.id ? "0 0 0 1px var(--fg)" : "none",
          transition: "border-color 150ms, box-shadow 150ms",
        }}
      >
        <input type="radio" name="model" value={o.id} checked={value === o.id} onChange={() => onChange(o.id)} style={{ display: "none" }}/>
        <div className="row between" style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{o.title}</div>
          <span style={{ width: 16, height: 16, borderRadius: "50%", border: "1.5px solid", borderColor: value === o.id ? "var(--accent)" : "var(--border-strong)", display: "grid", placeItems: "center" }}>
            {value === o.id && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }}/>}
          </span>
        </div>
        <div className="muted mono" style={{ fontSize: 11, marginBottom: 8 }}>{o.meta}</div>
        <div className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>{o.desc}</div>
      </label>
    ))}
  </div>
);

const ConfidenceSlider = ({ value, onChange }) => {
  const pct = ((value - 0.3) / (0.9 - 0.3)) * 100;
  return (
    <div style={{ padding: "10px 0 4px" }}>
      <div className="row between" style={{ marginBottom: 14 }}>
        <span className="muted mono" style={{ fontSize: 11 }}>0.30 — flag almost nothing</span>
        <span style={{ fontSize: 22, fontWeight: 600, fontFamily: "var(--mono)", color: "var(--fg)" }}>{value.toFixed(2)}</span>
        <span className="muted mono" style={{ fontSize: 11 }}>0.90 — flag aggressively</span>
      </div>
      <div style={{ position: "relative", height: 24 }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 11, height: 4, borderRadius: 2, background: "var(--border)" }}/>
        <div style={{ position: "absolute", left: 0, top: 11, height: 4, width: `${pct}%`, background: "var(--fg)", borderRadius: 2 }}/>
        {/* tick marks */}
        {[0.3, 0.5, 0.6, 0.7, 0.9].map((t) => {
          const p = ((t - 0.3) / 0.6) * 100;
          return <span key={t} style={{ position: "absolute", left: `calc(${p}% - 1px)`, top: 9, width: 2, height: 8, background: "var(--border-strong)" }}/>;
        })}
        <input
          type="range" min={0.3} max={0.9} step={0.01}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%" }}
        />
        <span aria-hidden="true" style={{
          position: "absolute", left: `calc(${pct}% - 9px)`, top: 4,
          width: 18, height: 18, borderRadius: "50%", background: "var(--surface)",
          border: "2px solid var(--fg)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          pointerEvents: "none",
        }}/>
      </div>
      <div className="row between" style={{ marginTop: 14, fontSize: 12 }}>
        <span className="muted">Recommended: 0.60</span>
        <span className="muted">{value < 0.55 ? "Lenient" : value <= 0.65 ? "Balanced" : "Strict"}</span>
      </div>
    </div>
  );
};

Object.assign(window, {
  LandingPage, UploadPage, ProcessingPage, ResultsPage, SettingsPage, Spinner,
});
