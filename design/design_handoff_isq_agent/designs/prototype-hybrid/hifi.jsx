// Hi-fi design showcase — uses the same components as the prototype.
// Each artboard renders a real component at its design size.

const noop = () => {};

// ─────────────────────────────────────────────────────────────
// FOUNDATIONS
// ─────────────────────────────────────────────────────────────
const ColorTokens = () => {
  const swatches = [
    { name: "Background",       token: "zinc-50",     hex: "#FAFAFA", v: "var(--bg)",            text: "var(--fg)" },
    { name: "Surface",          token: "white",       hex: "#FFFFFF", v: "var(--surface)",       text: "var(--fg)" },
    { name: "Border",           token: "zinc-200",    hex: "#E4E4E7", v: "var(--border)",        text: "var(--fg)" },
    { name: "Foreground",       token: "zinc-900",    hex: "#18181B", v: "var(--fg)",            text: "#fff" },
    { name: "Muted foreground", token: "zinc-500",    hex: "#71717A", v: "var(--fg-muted)",      text: "#fff" },
    { name: "Accent",           token: "orange-600",  hex: "#EA580C", v: "var(--accent)",        text: "#fff" },
    { name: "Success",          token: "emerald-600", hex: "#059669", v: "var(--success)",       text: "#fff" },
    { name: "Warning",          token: "amber-500",   hex: "#F59E0B", v: "var(--warning)",       text: "#fff" },
    { name: "Error",            token: "red-600",     hex: "#DC2626", v: "var(--error)",         text: "#fff" },
  ];
  return (
    <div style={{ padding: 32, background: "var(--bg)", fontFamily: "var(--sans)" }}>
      <div className="eyebrow" style={{ marginBottom: 4 }}>FOUNDATIONS</div>
      <h2 className="h2" style={{ marginTop: 0 }}>Colour tokens</h2>
      <p className="muted" style={{ fontSize: 13, maxWidth: 480, marginTop: 4 }}>
        Locked. Monochrome with a single accent. No background uses the accent colour — accent is reserved
        for primary buttons, focus rings, links, and the Claude badge.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 22 }}>
        {swatches.map((s) => (
          <div key={s.name} className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ background: s.v, height: 80, color: s.text, padding: 14, display: "flex", flexDirection: "column", justifyContent: "flex-end", borderBottom: "1px solid var(--border)" }}>
              <span className="mono" style={{ fontSize: 11, opacity: 0.85 }}>{s.hex}</span>
            </div>
            <div style={{ padding: "12px 14px" }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</div>
              <div className="mono muted" style={{ fontSize: 11, marginTop: 2 }}>{s.token}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const TypeScale = () => (
  <div style={{ padding: 32, background: "var(--surface)", fontFamily: "var(--sans)" }}>
    <div className="eyebrow" style={{ marginBottom: 4 }}>FOUNDATIONS</div>
    <h2 className="h2" style={{ marginTop: 0 }}>Type</h2>
    <p className="muted" style={{ fontSize: 13, maxWidth: 480, marginTop: 4 }}>
      Inter 400/500/600 for everything; JetBrains Mono for technical surfaces. Emphasis from weight + colour, not size.
    </p>
    <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 14 }}>
      {[
        { sz: 36, w: 600, l: "Heading · text-4xl", sample: "Answer questionnaires with grounded AI", track: "-0.02em" },
        { sz: 24, w: 600, l: "Heading · text-2xl", sample: "Processing — 14 of 20", track: "-0.015em" },
        { sz: 18, w: 600, l: "Heading · text-lg",  sample: "Confidence breakdown", track: "-0.01em" },
        { sz: 16, w: 500, l: "Body · text-base",   sample: "All staff sign a confidentiality agreement before accessing customer data.", track: "0" },
        { sz: 14, w: 400, l: "Body · text-sm",     sample: "PDF or XLSX. Up to 10 MB.", track: "0" },
        { sz: 12, w: 500, l: "Label · text-xs",    sample: "CITATIONS", track: "0.04em", upper: true },
        { sz: 12, w: 400, l: "Mono · text-xs",     sample: "isp-001 · score 0.89 · Northstar_ISP.pdf", mono: true },
      ].map((r, i) => (
        <div key={i} className="row" style={{ gap: 24, alignItems: "baseline", paddingBottom: 14, borderBottom: i < 6 ? "1px solid var(--border)" : "none" }}>
          <span className="muted mono" style={{ fontSize: 11, width: 180, flex: "0 0 180px" }}>{r.l} · {r.sz}/{r.w}</span>
          <span style={{
            fontSize: r.sz, fontWeight: r.w, letterSpacing: r.track,
            textTransform: r.upper ? "uppercase" : "none",
            fontFamily: r.mono ? "var(--mono)" : "var(--sans)",
            color: r.l.includes("Label") ? "var(--fg-muted)" : "var(--fg)",
            flex: 1,
          }}>{r.sample}</span>
        </div>
      ))}
    </div>
  </div>
);

const Motion = () => (
  <div style={{ padding: 32, background: "var(--bg)", fontFamily: "var(--sans)" }}>
    <div className="eyebrow" style={{ marginBottom: 4 }}>FOUNDATIONS</div>
    <h2 className="h2" style={{ marginTop: 0 }}>Motion & space</h2>
    <p className="muted" style={{ fontSize: 13, maxWidth: 480, marginTop: 4 }}>
      Linear / ease-out only. No springs, no bounces. Hover is colour, never transform.
    </p>
    <div style={{ marginTop: 22, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <div className="card card-pad">
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Timing</div>
        {[
          ["Hover · colour shift",     "150ms · ease"],
          ["Page transitions",          "200ms · cubic-bezier(.2,.7,.3,1)"],
          ["Dialog enter",              "200ms · fade + 0.98 → 1.0"],
          ["Progress bar / counters",   "smooth determinate"],
          ["prefers-reduced-motion",    "all transitions → instant"],
        ].map(([k, v]) => (
          <div key={k} className="row between" style={{ padding: "8px 0", borderTop: "1px solid var(--border)", fontSize: 12 }}>
            <span>{k}</span>
            <span className="mono muted">{v}</span>
          </div>
        ))}
      </div>
      <div className="card card-pad">
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Spacing rhythm</div>
        {[4, 6, 8, 12, 16, 24, 32].map((n) => (
          <div key={n} className="row gap-4" style={{ padding: "6px 0", fontSize: 12 }}>
            <span className="mono muted" style={{ width: 40 }}>{n}px</span>
            <div style={{ height: 12, width: n * 6, background: "var(--fg)", borderRadius: 2 }}/>
          </div>
        ))}
        <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>If unsure: more whitespace, not less.</div>
      </div>
    </div>
    <div className="card card-pad" style={{ marginTop: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Radii & shadows</div>
      <div className="row gap-6" style={{ alignItems: "center" }}>
        {[
          { r: 6,  l: "rounded-md · 6px",  sub: "buttons, inputs" },
          { r: 8,  l: "rounded-lg · 8px",  sub: "cards" },
          { r: 9999, l: "rounded-full",    sub: "pills, badges" },
        ].map((x) => (
          <div key={x.l} style={{ flex: 1, textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: x.r === 9999 ? "50%" : x.r, background: "var(--bg)", border: "1px solid var(--border)", margin: "0 auto 8px" }}/>
            <div className="mono" style={{ fontSize: 11 }}>{x.l}</div>
            <div className="muted" style={{ fontSize: 11 }}>{x.sub}</div>
          </div>
        ))}
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: 8, background: "var(--surface)", boxShadow: "var(--shadow-sm)", margin: "0 auto 8px" }}/>
          <div className="mono" style={{ fontSize: 11 }}>shadow-sm</div>
          <div className="muted" style={{ fontSize: 11 }}>cards</div>
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: 8, background: "var(--surface)", boxShadow: "var(--shadow-md)", margin: "0 auto 8px" }}/>
          <div className="mono" style={{ fontSize: 11 }}>shadow-md</div>
          <div className="muted" style={{ fontSize: 11 }}>dialog only</div>
        </div>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────────────────────

const ButtonShowcase = () => (
  <div style={{ padding: 28, background: "var(--surface)", fontFamily: "var(--sans)" }}>
    <div className="eyebrow" style={{ marginBottom: 4 }}>COMPONENT</div>
    <h2 className="h2" style={{ marginTop: 0 }}>Buttons</h2>
    <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>Five variants × three sizes. Hover is colour-only. Accent is reserved for the single primary CTA per page.</p>

    <div style={{ marginTop: 22 }}>
      <ShowRow label="Variants">
        <Button variant="accent">Upload questionnaire</Button>
        <Button variant="primary">Start processing</Button>
        <Button variant="secondary">Download XLSX</Button>
        <Button variant="ghost">Cancel</Button>
        <Button variant="link">How it works</Button>
      </ShowRow>
      <ShowRow label="With icons">
        <Button variant="accent" leadingIcon={<I.upload size={14}/>}>Upload</Button>
        <Button variant="secondary" leadingIcon={<I.fileDocx size={14}/>}>Download DOCX</Button>
        <Button variant="ghost" leadingIcon={<I.refresh size={13}/>}>New run</Button>
        <Button variant="accent" trailingIcon={<I.arrowRight size={13}/>}>Continue</Button>
      </ShowRow>
      <ShowRow label="Sizes">
        <Button variant="accent" size="lg">Large CTA</Button>
        <Button variant="accent">Default</Button>
        <Button variant="accent" size="sm">Small</Button>
      </ShowRow>
      <ShowRow label="States">
        <Button variant="accent">Idle</Button>
        <Button variant="accent" leadingIcon={<Spinner/>}>Sending…</Button>
        <Button variant="accent" disabled>Disabled</Button>
      </ShowRow>
    </div>
  </div>
);

const ShowRow = ({ label, children }) => (
  <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 16, padding: "16px 0", borderTop: "1px solid var(--border)", alignItems: "center" }}>
    <span className="muted mono" style={{ fontSize: 11 }}>{label}</span>
    <div className="row gap-2" style={{ flexWrap: "wrap" }}>{children}</div>
  </div>
);

const BadgeShowcase = () => (
  <div style={{ padding: 28, background: "var(--bg)", fontFamily: "var(--sans)" }}>
    <div className="eyebrow" style={{ marginBottom: 4 }}>COMPONENT</div>
    <h2 className="h2" style={{ marginTop: 0 }}>Badges & status</h2>
    <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>Status pills are the only place we use colour-bearing surfaces. Use sparingly — one badge per row is the rule.</p>

    <ShowRow label="Status">
      <Badge variant="success" dot>Done</Badge>
      <Badge variant="accent" leadingIcon={<Spinner size={9}/>}>Processing</Badge>
      <Badge variant="warning" leadingIcon={<I.warning size={11}/>}>Review</Badge>
      <Badge variant="error" leadingIcon={<I.x size={11}/>}>Failed</Badge>
      <Badge variant="default">Queued</Badge>
    </ShowRow>
    <ShowRow label="Counts">
      <Badge variant="default">20 questions</Badge>
      <Badge variant="default">2 flagged</Badge>
      <Badge variant="warning">2 need review</Badge>
      <Badge variant="success" dot>20 of 20 answered</Badge>
    </ShowRow>
    <ShowRow label="Brand">
      <span className="badge badge-claude">Powered by Claude</span>
    </ShowRow>
    <ShowRow label="Confidence (inline)">
      <ConfidenceBar score={0.93} compact/>
      <ConfidenceBar score={0.72} compact/>
      <ConfidenceBar score={0.55} compact/>
    </ShowRow>
  </div>
);

const ConfidenceShowcase = () => (
  <div style={{ padding: 28, background: "var(--surface)", fontFamily: "var(--sans)" }}>
    <div className="eyebrow" style={{ marginBottom: 4 }}>COMPONENT</div>
    <h2 className="h2" style={{ marginTop: 0 }}>Confidence indicator</h2>
    <p className="muted" style={{ fontSize: 13, marginTop: 4, maxWidth: 520 }}>
      Per-question score is a weighted mean of four dimensions. Bar tone follows the same threshold the flagger uses:
      0–60 red, 60–80 amber, 80–100 emerald.
    </p>

    <div style={{ marginTop: 22, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
      {[
        { label: "High · auto-cleared",   score: 0.93, d: { cites_policy: 1.0, on_topic: 0.95, vendor_tone: 0.90, complete: 0.80 } },
        { label: "Mid · borderline",      score: 0.72, d: { cites_policy: 0.85, on_topic: 0.75, vendor_tone: 0.65, complete: 0.55 } },
        { label: "Low · flagged",         score: 0.51, d: { cites_policy: 0.55, on_topic: 0.45, vendor_tone: 0.80, complete: 0.40 } },
      ].map((c) => (
        <div key={c.label} className="card card-pad">
          <div className="muted" style={{ fontSize: 11, fontWeight: 500, marginBottom: 8 }}>{c.label.toUpperCase()}</div>
          <div className="row between" style={{ marginBottom: 14 }}>
            <ConfidenceBar score={c.score} compact/>
            <span className="mono" style={{ fontSize: 13, fontWeight: 500 }}>{c.score.toFixed(2)}</span>
          </div>
          <DimBreakdown d={c.d}/>
        </div>
      ))}
    </div>

    <div className="card card-pad" style={{ marginTop: 16 }}>
      <div className="row between" style={{ marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Weighting (locked)</div>
          <div className="muted" style={{ fontSize: 12 }}>cites_policy is heaviest — grounding is the worst failure mode for an audit-facing tool.</div>
        </div>
        <span className="mono muted" style={{ fontSize: 11 }}>sum = 1.00</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { k: "cites_policy", w: 0.40 },
          { k: "on_topic",     w: 0.25 },
          { k: "vendor_tone",  w: 0.20 },
          { k: "complete",     w: 0.15 },
        ].map((x) => (
          <div key={x.k} className="card card-pad" style={{ background: "var(--bg)" }}>
            <div className="mono muted" style={{ fontSize: 11 }}>{x.k}</div>
            <div style={{ fontSize: 22, fontWeight: 600, fontFamily: "var(--mono)", marginTop: 4 }}>{x.w.toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const DropzoneShowcase = () => {
  const fakeFile = { name: "Sunflowers_Charity_ISQ.pdf", size: 6300, type: "application/pdf" };
  return (
    <div style={{ padding: 28, background: "var(--bg)", fontFamily: "var(--sans)" }}>
      <div className="eyebrow" style={{ marginBottom: 4 }}>COMPONENT</div>
      <h2 className="h2" style={{ marginTop: 0 }}>Dropzone — four states</h2>
      <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>Built with input[type=file] + drag handlers. Keyboard-reachable (Enter / Space opens file picker).</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 22 }}>
        <ShowState title="Empty">
          <Dropzone file={null} onFile={noop} onRemove={noop} error={null} onError={noop}/>
        </ShowState>
        <ShowState title="Dragging">
          <div className="dropzone dragging" style={{ cursor: "default" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <span style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--accent-bg)", display: "grid", placeItems: "center", color: "var(--accent)" }}>
                <I.upload size={20}/>
              </span>
              <div style={{ color: "var(--accent)", fontWeight: 500 }}>Release to upload.</div>
            </div>
          </div>
        </ShowState>
        <ShowState title="File selected">
          <Dropzone file={fakeFile} onFile={noop} onRemove={noop} error={null} onError={noop}/>
        </ShowState>
        <ShowState title="Error">
          <div>
            <div className="dropzone error" style={{ cursor: "default" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                <span style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--error-bg)", display: "grid", placeItems: "center", color: "var(--error)" }}>
                  <I.warning size={20}/>
                </span>
                <div>
                  <div style={{ fontWeight: 500, color: "var(--error)" }}>We couldn't read this file.</div>
                  <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>Try a PDF or XLSX. Up to 10 MB.</div>
                </div>
              </div>
            </div>
          </div>
        </ShowState>
      </div>
    </div>
  );
};

const ShowState = ({ title, children }) => (
  <div>
    <div className="muted mono" style={{ fontSize: 11, marginBottom: 8 }}>{title}</div>
    {children}
  </div>
);

const AnswerCardShowcase = () => {
  const clean = window.ISQ_RUN.answers[0]; // Q1
  const flagged = window.ISQ_RUN.answers[5]; // Q6 OT
  return (
    <div style={{ padding: 28, background: "var(--surface)", fontFamily: "var(--sans)" }}>
      <div className="eyebrow" style={{ marginBottom: 4 }}>COMPONENT</div>
      <h2 className="h2" style={{ marginTop: 0 }}>Answer card — three states</h2>
      <p className="muted" style={{ fontSize: 13, marginTop: 4, maxWidth: 600 }}>
        Collapsed by default. Flagged cards take a 3px amber left border + a very subtle amber tint —
        enough to scan a list and find them, not so much that they shout.
      </p>

      <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div className="muted mono" style={{ fontSize: 11, marginBottom: 8 }}>Collapsed · clean (Q1)</div>
          <AnswerCard answer={clean} open={false} onToggle={noop}/>
        </div>
        <div>
          <div className="muted mono" style={{ fontSize: 11, marginBottom: 8 }}>Expanded · clean (Q1) — citations, confidence breakdown, metrics</div>
          <AnswerCard answer={clean} open={true} onToggle={noop}/>
        </div>
        <div>
          <div className="muted mono" style={{ fontSize: 11, marginBottom: 8 }}>Expanded · flagged (Q6 — OT scope mismatch)</div>
          <AnswerCard answer={flagged} open={true} onToggle={noop}/>
        </div>
      </div>
    </div>
  );
};

const TimelineShowcase = () => (
  <div style={{ padding: 28, background: "var(--bg)", fontFamily: "var(--sans)" }}>
    <div className="eyebrow" style={{ marginBottom: 4 }}>COMPONENT</div>
    <h2 className="h2" style={{ marginTop: 0 }}>Pipeline timeline</h2>
    <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
      Three step states. Active step has a soft pulse (no transform); completed steps are filled foreground with a checkmark.
    </p>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 22 }}>
      {[
        { label: "Pending (before)", steps: [["pending", "Document uploaded"],["pending","Questions extracted"],["pending","Answering"],["pending","Rendering"],["pending","Done"]] },
        { label: "Active (mid-run)", steps: [["done", "Document uploaded","just now"],["done","Questions extracted","20 found"],["active","Answering 14 of 20","stage · generate"],["pending","Rendering outputs"],["pending","Done"]] },
        { label: "Done", steps: [["done","Document uploaded"],["done","Questions extracted"],["done","Answering","20 of 20"],["done","Rendering outputs","DOCX · XLSX · JSON"],["done","Done","42s"]] },
      ].map((col) => (
        <div key={col.label} className="card card-pad">
          <div className="muted mono" style={{ fontSize: 11, marginBottom: 12 }}>{col.label.toUpperCase()}</div>
          <div className="timeline">
            {col.steps.map((s, i) => (
              <TimelineStep key={i} state={s[0]} title={s[1]} sub={s[2]} last={i === col.steps.length - 1}/>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const TabsShowcase = () => {
  const [t, setT] = React.useState("answers");
  return (
    <div style={{ padding: 28, background: "var(--surface)", fontFamily: "var(--sans)" }}>
      <div className="eyebrow" style={{ marginBottom: 4 }}>COMPONENT</div>
      <h2 className="h2" style={{ marginTop: 0 }}>Tabs, fields & toast</h2>
      <div className="row gap-6" style={{ marginTop: 22, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 320 }}>
          <div className="muted mono" style={{ fontSize: 11, marginBottom: 8 }}>TABS · results page</div>
          <Tabs
            value={t} onChange={setT}
            items={[
              { id: "answers",   label: "Answers",   count: 20 },
              { id: "flagged",   label: "Flagged",   count: 2 },
              { id: "citations", label: "Citations", count: 8 },
              { id: "metrics",   label: "Metrics" },
            ]}
          />
          <div className="muted" style={{ fontSize: 12, marginTop: 12 }}>2px foreground underline · 38px height · count chip on tabs with totals.</div>
        </div>
        <div style={{ flex: 1, minWidth: 320 }}>
          <div className="muted mono" style={{ fontSize: 11, marginBottom: 8 }}>FIELDS</div>
          <label className="label">Anthropic API key</label>
          <input className="input input-mono" defaultValue="sk-ant-•••••••••••••••••••••••3xK"/>
          <div className="help">Masked on display. Saved to encrypted local volume.</div>
        </div>
      </div>

      <div style={{ marginTop: 28 }}>
        <div className="muted mono" style={{ fontSize: 11, marginBottom: 8 }}>TOAST · transient confirmation</div>
        <div style={{ display: "inline-block" }}>
          <Toast message="Sunflowers_Response.docx · 24 KB downloaded" icon={<I.check size={14}/>}/>
        </div>
      </div>
    </div>
  );
};

const BannerShowcase = () => (
  <div style={{ padding: 28, background: "var(--bg)", fontFamily: "var(--sans)" }}>
    <div className="eyebrow" style={{ marginBottom: 4 }}>COMPONENT</div>
    <h2 className="h2" style={{ marginTop: 0 }}>Banners & feedback</h2>
    <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <div className="muted mono" style={{ fontSize: 11, marginBottom: 8 }}>ERROR · page-level, dismissable</div>
        <ErrorBanner message="We couldn't read this file. Try a PDF or XLSX." onDismiss={noop}/>
      </div>
      <div>
        <div className="muted mono" style={{ fontSize: 11, marginBottom: 8 }}>WARNING · all answers flagged (banner condition)</div>
        <div style={{ borderLeft: "4px solid var(--warning)", background: "var(--surface)", border: "1px solid var(--border)", borderLeftColor: "var(--warning)", padding: "12px 16px", borderRadius: "var(--r-md)", display: "flex", alignItems: "center", gap: 12, fontSize: 13 }}>
          <I.warning size={16} style={{ color: "#B45309", flex: "0 0 auto" }}/>
          <span style={{ flex: 1 }}>All answers flagged for review. The knowledge base may not cover this questionnaire's domain.</span>
        </div>
      </div>
      <div>
        <div className="muted mono" style={{ fontSize: 11, marginBottom: 8 }}>INFO · inline guidance</div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "12px 16px", borderRadius: "var(--r-md)", display: "flex", alignItems: "center", gap: 12, fontSize: 13 }}>
          <I.info size={16} style={{ color: "var(--fg-muted)", flex: "0 0 auto" }}/>
          <span style={{ flex: 1 }}>Most ISQs finish in under a minute. You can leave the page open — we'll redirect when it's done.</span>
        </div>
      </div>
    </div>
  </div>
);

const DoDontShowcase = () => (
  <div style={{ padding: 28, background: "var(--surface)", fontFamily: "var(--sans)" }}>
    <div className="eyebrow" style={{ marginBottom: 4 }}>RULES</div>
    <h2 className="h2" style={{ marginTop: 0 }}>Do / don't — flagged-card styling</h2>
    <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
      Flagged cards mark attention without shouting. The riskiest move is filling the card with amber tint — looks like an error, undercuts the agent's judgement.
    </p>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 22 }}>
      <DoDont label="Do" tone="ok">
        <div className="card" style={{ padding: "14px 18px", borderLeftWidth: 3, borderLeftColor: "var(--warning)", background: "var(--warning-bg)" }}>
          <div className="row between" style={{ marginBottom: 6 }}>
            <span className="mono muted" style={{ fontSize: 11 }}>Q06</span>
            <Badge variant="warning" leadingIcon={<I.warning size={10}/>}>Review</Badge>
          </div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>How is privileged access to operational technology (OT) controlled?</div>
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>3px amber left border + ~8% amber tint. Identifies the card across a long list; doesn't read as an error.</div>
      </DoDont>
      <DoDont label="Don't" tone="bad">
        <div style={{ padding: "14px 18px", borderRadius: 8, background: "#FEF3C7", border: "2px solid var(--warning)" }}>
          <div className="row between" style={{ marginBottom: 6 }}>
            <span className="mono" style={{ fontSize: 11, color: "#B45309" }}>Q06</span>
            <Badge variant="warning" leadingIcon={<I.warning size={10}/>}>Review</Badge>
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#92400E" }}>How is privileged access to operational technology (OT) controlled?</div>
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>Saturated amber fill + thick border reads as a hard error. The whole results page becomes a warning siren.</div>
      </DoDont>
    </div>

    <h2 className="h2" style={{ marginTop: 32 }}>Do / don't — confidence visualisation</h2>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 14 }}>
      <DoDont label="Do" tone="ok">
        <div className="row gap-4" style={{ alignItems: "center" }}>
          <ConfidenceBar score={0.93} compact/>
          <ConfidenceBar score={0.72} compact/>
          <ConfidenceBar score={0.51} compact/>
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>Inline 60px bar + numeric. Tone follows the threshold the flagger uses.</div>
      </DoDont>
      <DoDont label="Don't" tone="bad">
        <div className="row gap-4" style={{ alignItems: "center", color: "var(--fg-muted)" }}>
          <span>★★★★★</span>
          <span>★★★★☆</span>
          <span>★★★☆☆</span>
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>Five-star scoring is consumer-product vocabulary. We're a B2B audit tool; numeric is honest.</div>
      </DoDont>
    </div>
  </div>
);

const DoDont = ({ label, tone, children }) => (
  <div>
    <div className="row gap-2" style={{ marginBottom: 8 }}>
      <span className="badge" style={{
        background: tone === "ok" ? "var(--success-bg)" : "var(--error-bg)",
        color: tone === "ok" ? "var(--success)" : "var(--error)",
        height: 20, fontSize: 10,
      }}>{tone === "ok" ? <I.check size={10}/> : <I.x size={10}/>} {label}</span>
    </div>
    {children}
  </div>
);

// ─────────────────────────────────────────────────────────────
// SCREEN MOCKS — real pages, no autoplay where applicable
// ─────────────────────────────────────────────────────────────

const StaticProcessing = ({ stage = 2, answered = 14 }) => {
  // A non-autoplaying version of ProcessingPage's content, for the canvas frame.
  const total = 20;
  const stateOf = (idx) => stage > idx ? "done" : stage === idx ? "active" : "pending";
  const elapsed = stage === 4 ? 42180 : (16400 + answered * 1200);
  const cost = 0.0042 * (stage >= 4 ? 20 : answered);

  return (
    <div style={{ background: "var(--bg)", minHeight: "100%", paddingBottom: 40 }}>
      <header className="topbar">
        <div className="wordmark"><span className="mark">i</span>ISQ Agent</div>
        <nav><a>Upload</a><a className="active">Run</a><a>Settings</a></nav>
      </header>
      <div className="container" style={{ paddingTop: 40, maxWidth: 980 }}>
        <div style={{ marginBottom: 28 }}>
          <a className="muted" style={{ fontSize: 12 }}>← Upload</a>
          <div className="row between" style={{ marginTop: 12, alignItems: "flex-end" }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Run · sun-20260525-001</div>
              <h1 className="h2" style={{ margin: 0 }}>Sunflowers_Charity_Supplier_ISQ_Questionnaire.pdf</h1>
            </div>
            <div className="row gap-2">
              {stage < 4 ? <Badge variant="accent" leadingIcon={<Spinner size={9}/>}>Processing</Badge> : <Badge variant="success" dot>Done</Badge>}
              <Badge>Sunflowers Charity</Badge>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 32 }}>
          <div className="card card-pad-lg">
            <div className="eyebrow" style={{ marginBottom: 18 }}>Pipeline</div>
            <div className="timeline">
              <TimelineStep state="done" title="Document uploaded" sub="Sunflowers_Charity_ISQ.pdf · received 19:30"/>
              <TimelineStep state={stateOf(1)} title="Questions extracted" sub="20 questions found · Sunflowers Charity"/>
              <TimelineStep state={stateOf(2)} title={`Answering ${answered} of ${total}`} sub={<RunningStages answered={answered}/>}/>
              <TimelineStep state={stateOf(3)} title="Rendering outputs" sub="DOCX · XLSX · JSON"/>
              <TimelineStep state={stateOf(4)} title="Done" sub={stage >= 4 ? "Redirecting to results…" : "Awaiting"} last/>
            </div>
            <div style={{ marginTop: 28 }}>
              <div className="row between" style={{ marginBottom: 6 }}>
                <span className="muted mono" style={{ fontSize: 11 }}>Overall</span>
                <span className="muted mono" style={{ fontSize: 11 }}>{Math.min(100, Math.round((stage >= 4 ? 1 : (answered / total) * 0.8 + stage * 0.05) * 100))}%</span>
              </div>
              <div className="progress"><span style={{ width: `${stage >= 4 ? 100 : Math.min(100, ((answered / total) * 0.8 + stage * 0.05) * 100)}%` }}/></div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Stat icon={<I.hash size={13}/>}  label="Answered" value={`${answered} / ${total}`} sub={`${total - answered} remaining`}/>
            <Stat icon={<I.spark size={13}/>} label="Avg confidence" value="0.86" sub="weighted across 4 dims"/>
            <Stat icon={<I.zap size={13}/>}   label="Est. cost" value={fmtCost(cost)} sub="Sonnet 4.5 · ~$0.004/q"/>
            <Stat icon={<I.clock size={13}/>} label="Elapsed" value={fmtMs(elapsed)} sub={stage >= 4 ? "Complete" : "Live"}/>
          </div>
        </div>
      </div>
    </div>
  );
};

// Render full pages inside an artboard — wrap them so their topbar styling matches.
const ScreenFrame = ({ children }) => (
  <div style={{ background: "var(--bg)", minHeight: "100%", fontFamily: "var(--sans)", color: "var(--fg)" }}>{children}</div>
);

// Compose canvas
function HiFi() {
  return (
    <DesignCanvas>
      <DCSection id="screens" title="Screens" subtitle="Five screens at 1440×900. Hi-fi, real components, real data.">
        <DCArtboard id="s1" label="01 · Landing" width={1440} height={1100}>
          <ScreenFrame>
            <TopBar route={{ name: "landing" }} navigate={noop}/>
            <LandingPage navigate={noop}/>
          </ScreenFrame>
        </DCArtboard>

        <DCArtboard id="s2" label="02 · Upload" width={1440} height={900}>
          <ScreenFrame>
            <TopBar route={{ name: "upload" }} navigate={noop}/>
            <UploadPage navigate={noop} onSubmit={noop}/>
          </ScreenFrame>
        </DCArtboard>

        <DCArtboard id="s3" label="03 · Processing · mid-run (Q14)" width={1440} height={900}>
          <StaticProcessing stage={2} answered={14}/>
        </DCArtboard>

        <DCArtboard id="s4" label="04 · Results" width={1440} height={1500}>
          <ScreenFrame>
            <TopBar route={{ name: "upload" }} navigate={noop}/>
            <ResultsPage run={window.ISQ_RUN} navigate={noop}/>
          </ScreenFrame>
        </DCArtboard>

        <DCArtboard id="s5" label="05 · Settings" width={1440} height={1200}>
          <ScreenFrame>
            <TopBar route={{ name: "settings" }} navigate={noop}/>
            <SettingsPage navigate={noop}/>
          </ScreenFrame>
        </DCArtboard>
      </DCSection>

      <DCSection id="components" title="Components" subtitle="The reusable pieces. Annotated with state + intent.">
        <DCArtboard id="c1" label="Buttons" width={780} height={420}>
          <ButtonShowcase/>
        </DCArtboard>
        <DCArtboard id="c2" label="Badges, status & confidence" width={780} height={520}>
          <BadgeShowcase/>
        </DCArtboard>
        <DCArtboard id="c3" label="Confidence indicator" width={1100} height={600}>
          <ConfidenceShowcase/>
        </DCArtboard>
        <DCArtboard id="c4" label="Dropzone — 4 states" width={1100} height={600}>
          <DropzoneShowcase/>
        </DCArtboard>
        <DCArtboard id="c5" label="Answer card — 3 states" width={1100} height={1200}>
          <AnswerCardShowcase/>
        </DCArtboard>
        <DCArtboard id="c6" label="Pipeline timeline" width={1100} height={520}>
          <TimelineShowcase/>
        </DCArtboard>
        <DCArtboard id="c7" label="Tabs, fields & toast" width={1100} height={420}>
          <TabsShowcase/>
        </DCArtboard>
        <DCArtboard id="c8" label="Banners & feedback" width={780} height={420}>
          <BannerShowcase/>
        </DCArtboard>
      </DCSection>

      <DCSection id="foundations" title="Foundations" subtitle="Tokens, type, motion. Locked, audit-ready.">
        <DCArtboard id="f1" label="Colour palette" width={780} height={700}>
          <ColorTokens/>
        </DCArtboard>
        <DCArtboard id="f2" label="Type scale" width={920} height={700}>
          <TypeScale/>
        </DCArtboard>
        <DCArtboard id="f3" label="Motion · spacing · radii" width={780} height={700}>
          <Motion/>
        </DCArtboard>
      </DCSection>

      <DCSection id="rules" title="Do · Don't" subtitle="The riskiest design calls, locked.">
        <DCArtboard id="r1" label="Flagged styling · confidence vocab" width={1100} height={780}>
          <DoDontShowcase/>
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<HiFi/>);
