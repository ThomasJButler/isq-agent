// Wireframes — low-fidelity layout sketches.
// Uses grey blocks + dotted lines to show structure without committing visuals.

const wfNoop = () => {};

// —— Wireframe primitives ——
// Warm-grey wireframe palette aligned with Claude DS neutrals (manilla family).
const WFTokens = {
  bg: "#F5F4EE",
  surface: "#FAF9F5",
  border: "#C4C0B2",
  borderDashed: "#8A8880",
  fill: "#E8E6DC",
  fillDim: "#F0EEE5",
  fillStrong: "#D9D6CA",
  text: "#5C5B57",
  textDim: "#8A8880",
  accent: "#5C5B57",  // wireframes stay greyscale, no accent colour
  font: "'Geist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
};

const WFStyle = ({ children, style }) => (
  <div style={{ fontFamily: WFTokens.font, color: WFTokens.text, fontSize: 12, lineHeight: 1.4, ...style }}>{children}</div>
);

const WFBox = ({ w, h, label, dashed, fill, style }) => (
  <div style={{
    width: w || "100%", height: h || "auto",
    background: fill || WFTokens.fillDim,
    border: `1px ${dashed ? "dashed" : "solid"} ${dashed ? WFTokens.borderDashed : WFTokens.border}`,
    borderRadius: 4,
    color: WFTokens.text,
    fontSize: 11,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    padding: "4px 8px",
    ...style,
  }}>{label}</div>
);

const WFText = ({ w = "100%", lines = 1, em }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6, width: w }}>
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} style={{
        height: em ? 14 : 10,
        width: i === lines - 1 ? "70%" : "100%",
        background: em ? WFTokens.fill : WFTokens.fillDim,
        borderRadius: 2,
      }}/>
    ))}
  </div>
);

const WFHeading = ({ children, lvl = 1, w = "60%" }) => (
  <div style={{
    height: lvl === 1 ? 28 : lvl === 2 ? 22 : 18,
    width: w,
    background: WFTokens.fillStrong,
    borderRadius: 3,
    display: "flex", alignItems: "center", paddingLeft: 8,
    fontSize: lvl === 1 ? 14 : 12, color: WFTokens.text, fontWeight: 500,
  }}>{children}</div>
);

const WFButton = ({ label, primary, w, h = 30 }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    height: h, padding: "0 14px", width: w,
    background: primary ? WFTokens.text : WFTokens.surface,
    color: primary ? "#fff" : WFTokens.text,
    border: `1px solid ${primary ? WFTokens.text : WFTokens.border}`,
    borderRadius: 4, fontSize: 11, fontWeight: 500,
  }}>{label}</span>
);

const WFBadge = ({ children }) => (
  <span style={{
    display: "inline-flex", alignItems: "center",
    height: 20, padding: "0 8px",
    background: WFTokens.fillDim, border: `1px solid ${WFTokens.border}`,
    borderRadius: 999, fontSize: 10, color: WFTokens.text, fontWeight: 500,
  }}>{children}</span>
);

const WFTopBar = () => (
  <div style={{ height: 48, borderBottom: `1px solid ${WFTokens.border}`, display: "flex", alignItems: "center", padding: "0 24px", background: WFTokens.surface }}>
    <WFBox w={90} h={20} label="ISQ Agent" fill={WFTokens.fill}/>
    <div style={{ marginLeft: "auto", display: "flex", gap: 16 }}>
      <span style={{ fontSize: 11 }}>Upload</span>
      <span style={{ fontSize: 11 }}>Settings</span>
      <span style={{ fontSize: 11, color: WFTokens.textDim }}>Repo</span>
    </div>
  </div>
);

const WFNote = ({ children, side = "right" }) => (
  <div style={{
    position: "absolute", top: 0, [side]: -180, width: 160,
    fontSize: 10, color: WFTokens.text, lineHeight: 1.45,
    padding: "10px 12px",
    background: "#fef4a8",
    borderRadius: 4,
    boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
  }}>{children}</div>
);

const WFSection = ({ title, children, style }) => (
  <div style={{ border: `1px dashed ${WFTokens.borderDashed}`, borderRadius: 6, padding: 16, position: "relative", ...style }}>
    {title && <div style={{ position: "absolute", top: -8, left: 12, background: WFTokens.bg, padding: "0 6px", fontSize: 10, color: WFTokens.textDim, letterSpacing: 0.5, textTransform: "uppercase" }}>{title}</div>}
    {children}
  </div>
);

// ─────────────────────────────────────────────────────────────
// Screen wireframes
// ─────────────────────────────────────────────────────────────

const WFLanding = () => (
  <WFStyle style={{ background: WFTokens.bg, minHeight: "100%" }}>
    <WFTopBar/>
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "64px 32px" }}>
      <WFSection title="Hero · left-aligned, product-y not marketing-y">
        <div style={{ maxWidth: 640 }}>
          <WFBox label="EYEBROW · ISQ Agent v1" h={16} fill={WFTokens.fillDim} style={{ marginBottom: 16 }}/>
          <WFHeading lvl={1} w="100%">H1 · Answer supplier security questionnaires with grounded AI.</WFHeading>
          <div style={{ marginTop: 16 }}><WFText lines={3}/></div>
          <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
            <WFButton primary label="Upload questionnaire →"/>
            <WFButton label="How it works ↓"/>
          </div>
        </div>
      </WFSection>

      <WFSection title="Product snapshot · screenshot of a real result" style={{ marginTop: 32 }}>
        <div style={{ background: WFTokens.surface, border: `1px solid ${WFTokens.border}`, borderRadius: 4, padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
            <WFText w={200} em/>
            <div style={{ display: "flex", gap: 6 }}>
              <WFBadge>Done · 42s</WFBadge>
              <WFBadge>2 flagged</WFBadge>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {[0, 1, 2].map((i) => (
              <WFBox key={i} h={70} label={`Q + answer ${i + 1}`} fill={WFTokens.fillDim}/>
            ))}
          </div>
        </div>
      </WFSection>

      <WFSection title="How it works · three numbered cards" style={{ marginTop: 32 }}>
        <WFHeading lvl={2} w="40%">H2 · Three steps. Mostly the agent's.</WFHeading>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 16 }}>
          {["01 · Upload", "02 · Ground & answer", "03 · Deliver"].map((t) => (
            <div key={t} style={{ background: WFTokens.surface, border: `1px solid ${WFTokens.border}`, borderRadius: 4, padding: 18 }}>
              <div style={{ fontSize: 11, color: WFTokens.textDim, marginBottom: 8 }}>{t}</div>
              <WFText lines={3}/>
            </div>
          ))}
        </div>
      </WFSection>

      <div style={{ marginTop: 48, textAlign: "center", borderTop: `1px dashed ${WFTokens.border}`, paddingTop: 20 }}>
        <span style={{ fontSize: 10, color: WFTokens.textDim }}>Footer · "Built with Claude · Tom Butler · MIT" · "Powered by Claude" badge top-right</span>
      </div>
    </div>
  </WFStyle>
);

const WFUpload = () => (
  <WFStyle style={{ background: WFTokens.bg, minHeight: "100%" }}>
    <WFTopBar/>
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 32px" }}>
      <div style={{ fontSize: 10, color: WFTokens.textDim, marginBottom: 12 }}>← Home</div>
      <WFHeading lvl={2}>H2 · Upload questionnaire</WFHeading>
      <div style={{ marginTop: 8, marginBottom: 24 }}><WFText lines={1} w="60%"/></div>

      <WFSection title="Dropzone · keyboard-reachable (Enter / Space opens picker)">
        <div style={{
          border: `1.5px dashed ${WFTokens.borderDashed}`,
          borderRadius: 6, padding: "48px 24px", textAlign: "center",
          background: WFTokens.surface,
        }}>
          <div style={{ width: 40, height: 40, borderRadius: 999, background: WFTokens.fill, margin: "0 auto 14px" }}/>
          <div style={{ fontWeight: 500, fontSize: 13 }}>Drop a questionnaire here, or click to browse.</div>
          <div style={{ fontSize: 11, color: WFTokens.textDim, marginTop: 6 }}>PDF or XLSX. Up to 10 MB.</div>
        </div>
      </WFSection>

      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 10, color: WFTokens.textDim, marginBottom: 8 }}>OR · example shortcuts</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <WFButton label="Sunflowers (PDF)" h={26}/>
          <WFButton label="Blackridge (PDF)" h={26}/>
          <WFButton label="Simple Salvage (XLSX)" h={26}/>
        </div>
      </div>

      <div style={{ marginTop: 32, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: WFTokens.textDim }}>📧 Or send to isq-agent@…</span>
        <WFButton primary label="Start processing →" h={36}/>
      </div>

      <WFSection title="States — annotated" style={{ marginTop: 40 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, fontSize: 10 }}>
          <div><strong>EMPTY</strong> — drag prompt + sub-copy</div>
          <div><strong>DRAGGING</strong> — solid accent border, tint fill</div>
          <div><strong>SELECTED</strong> — file chip · size · Remove · Start enabled</div>
          <div><strong>VALIDATING</strong> — spinner · "Checking file…"</div>
          <div><strong>SUBMITTING</strong> — spinner · "Sending to workflow…"</div>
          <div><strong>ERROR</strong> — red border + 1-sentence inline message</div>
        </div>
      </WFSection>
    </div>
  </WFStyle>
);

const WFProcessing = () => (
  <WFStyle style={{ background: WFTokens.bg, minHeight: "100%" }}>
    <WFTopBar/>
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "40px 32px" }}>
      <div style={{ fontSize: 10, color: WFTokens.textDim, marginBottom: 12 }}>← Upload</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 10, color: WFTokens.textDim, marginBottom: 4 }}>RUN · sun-20260525-001</div>
          <WFHeading lvl={2} w={340}>filename.pdf</WFHeading>
        </div>
        <div style={{ display: "flex", gap: 6 }}><WFBadge>Processing</WFBadge><WFBadge>Origin</WFBadge></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 28 }}>
        <WFSection title="Pipeline · vertical timeline · 5 steps">
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              ["✓ Document uploaded",    "done"],
              ["✓ Questions extracted (20 found)", "done"],
              ["◐ Answering 14 of 20",   "active"],
              ["○ Rendering outputs",    "pending"],
              ["○ Done",                 "pending"],
            ].map(([t, s], i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: s === "pending" ? WFTokens.textDim : WFTokens.text }}>
                <span style={{ width: 16, height: 16, borderRadius: 8, border: `1px solid ${s === "active" ? WFTokens.text : WFTokens.border}`, background: s === "done" ? WFTokens.text : "transparent" }}/>
                <span>{t}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 22, height: 4, background: WFTokens.fill, borderRadius: 2 }}>
            <div style={{ height: "100%", width: "60%", background: WFTokens.text, borderRadius: 2 }}/>
          </div>
        </WFSection>

        <WFSection title="Live counters">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {["Answered 14 / 20", "Avg confidence 0.86", "Est. cost $0.058", "Elapsed 28.1s"].map((s) => (
              <div key={s} style={{ background: WFTokens.surface, border: `1px solid ${WFTokens.border}`, borderRadius: 4, padding: "10px 12px", fontSize: 11 }}>{s}</div>
            ))}
          </div>
        </WFSection>
      </div>

      <WFSection title="Activity log · X-Request-Id correlated to n8n execution" style={{ marginTop: 24 }}>
        <WFText lines={4}/>
      </WFSection>
    </div>
  </WFStyle>
);

const WFResults = () => (
  <WFStyle style={{ background: WFTokens.bg, minHeight: "100%" }}>
    <WFTopBar/>
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "40px 32px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 10, color: WFTokens.textDim, marginBottom: 4 }}>RUN · sun-20260525-001</div>
          <WFHeading lvl={2} w={420}>filename.pdf</WFHeading>
          <div style={{ marginTop: 8 }}><WFText lines={1} w="55%"/></div>
        </div>
        <WFButton label="↻ New run"/>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 24 }}>
        <WFSection title="Deliverables · prominent, NOT tucked in a corner">
          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            <WFButton primary label="↓ Download DOCX"/>
            <WFButton label="↓ Download XLSX"/>
            <WFButton label="↓ Download JSON"/>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {["Answered 18/20", "Flagged 2", "Avg conf 0.86", "Cost $0.078"].map((t) => (
              <div key={t} style={{ background: WFTokens.surface, border: `1px solid ${WFTokens.border}`, borderRadius: 4, padding: 10, fontSize: 11 }}>{t}</div>
            ))}
          </div>
        </WFSection>
        <WFSection title="Flagged summary · amber-toned">
          <div style={{ fontSize: 11, marginBottom: 8 }}><strong>2 questions flagged</strong></div>
          <WFText lines={2}/>
          <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
            <WFButton label="Q05" h={24}/><WFButton label="Q11" h={24}/>
          </div>
        </WFSection>
      </div>

      <div style={{ borderBottom: `1px solid ${WFTokens.border}`, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
          <span style={{ fontWeight: 600, paddingBottom: 8, borderBottom: `2px solid ${WFTokens.text}` }}>Answers · 20</span>
          <span style={{ color: WFTokens.textDim, paddingBottom: 8 }}>Flagged · 2</span>
          <span style={{ color: WFTokens.textDim, paddingBottom: 8 }}>Citations · 8</span>
          <span style={{ color: WFTokens.textDim, paddingBottom: 8 }}>Metrics</span>
        </div>
      </div>

      <WFSection title="Answer cards · one per question · click to expand">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { q: "Q01", flagged: false, conf: "0.93" },
            { q: "Q02", flagged: false, conf: "0.91" },
            { q: "Q06", flagged: true,  conf: "0.55" },
            { q: "Q07", flagged: false, conf: "0.92" },
          ].map((r) => (
            <div key={r.q} style={{
              background: r.flagged ? "#fef4d8" : WFTokens.surface,
              borderLeft: r.flagged ? `3px solid #b45309` : `1px solid ${WFTokens.border}`,
              border: `1px solid ${WFTokens.border}`,
              borderLeftWidth: r.flagged ? 3 : 1,
              borderLeftColor: r.flagged ? "#b45309" : WFTokens.border,
              borderRadius: 4, padding: "10px 14px",
              display: "grid", gridTemplateColumns: "40px 1fr auto auto auto", gap: 12, alignItems: "center", fontSize: 12,
            }}>
              <span style={{ color: WFTokens.textDim, fontSize: 10, fontFamily: "monospace" }}>{r.q}</span>
              <span>Question text…</span>
              {r.flagged && <WFBadge>⚠ Review</WFBadge>}
              <span style={{ fontFamily: "monospace", fontSize: 11 }}>conf {r.conf}</span>
              <span style={{ color: WFTokens.textDim }}>›</span>
            </div>
          ))}
        </div>
      </WFSection>

      <WFSection title="Expanded card · answer + citations + dim breakdown + metrics" style={{ marginTop: 16 }}>
        <div style={{ background: WFTokens.surface, border: `1px solid ${WFTokens.border}`, borderRadius: 4, padding: 14 }}>
          <div style={{ marginBottom: 12 }}><WFText lines={3}/></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <div>
              <div style={{ fontSize: 10, color: WFTokens.textDim, marginBottom: 6 }}>CITATIONS</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <WFBadge>ISP §1</WFBadge><WFBadge>ISQ_01 Q1</WFBadge>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: WFTokens.textDim, marginBottom: 6 }}>CONFIDENCE</div>
              <WFText lines={4}/>
            </div>
            <div>
              <div style={{ fontSize: 10, color: WFTokens.textDim, marginBottom: 6 }}>METRICS</div>
              <WFText lines={2}/>
            </div>
          </div>
        </div>
      </WFSection>
    </div>
  </WFStyle>
);

const WFSettings = () => (
  <WFStyle style={{ background: WFTokens.bg, minHeight: "100%" }}>
    <WFTopBar/>
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 32px" }}>
      <WFHeading lvl={2}>H2 · Settings</WFHeading>
      <div style={{ marginTop: 8, marginBottom: 32 }}><WFText lines={1} w="55%"/></div>

      <WFSection title="API configuration · keys masked on display">
        {["Anthropic API key", "Voyage API key", "Pinecone API key"].map((l) => (
          <div key={l} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 4 }}>{l}</div>
            <WFBox h={32} label="••••••••••••••••••••••••3xK" fill={WFTokens.surface} style={{ width: "100%", justifyContent: "flex-start", fontFamily: "monospace" }}/>
          </div>
        ))}
      </WFSection>

      <WFSection title="Model · radio cards" style={{ marginTop: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <WFBox h={70} label="● Claude Sonnet 4.5 · default" fill={WFTokens.surface}/>
          <WFBox h={70} label="○ Claude Haiku 4.5 · fast" fill={WFTokens.surface}/>
        </div>
      </WFSection>

      <WFSection title="Confidence threshold · slider 0.30 → 0.90" style={{ marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 10 }}>
          <span>0.30 lenient</span><span style={{ fontWeight: 600, fontSize: 14 }}>0.60</span><span>0.90 strict</span>
        </div>
        <div style={{ height: 6, background: WFTokens.fill, borderRadius: 3, position: "relative" }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: "50%", height: "100%", background: WFTokens.text, borderRadius: 3 }}/>
          <div style={{ position: "absolute", left: "50%", top: -5, width: 16, height: 16, borderRadius: 8, background: "#fff", border: `2px solid ${WFTokens.text}`, transform: "translateX(-50%)" }}/>
        </div>
      </WFSection>

      <WFSection title="Knowledge base" style={{ marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500 }}>Reindex knowledge base</div>
            <div style={{ fontSize: 10, color: WFTokens.textDim, marginTop: 2 }}>Last reindex · 142 chunks</div>
          </div>
          <WFButton label="↻ Reindex"/>
        </div>
      </WFSection>

      <div style={{ marginTop: 40, paddingTop: 16, borderTop: `1px solid ${WFTokens.border}`, display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <WFButton label="Cancel"/>
        <WFButton primary label="Save settings"/>
      </div>
    </div>
  </WFStyle>
);

// User flow diagram
const WFFlow = () => {
  const node = (label, sub, w = 140) => (
    <div style={{ width: w, padding: "10px 12px", background: WFTokens.surface, border: `1px solid ${WFTokens.border}`, borderRadius: 6, textAlign: "center" }}>
      <div style={{ fontSize: 11, fontWeight: 600 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: WFTokens.textDim, marginTop: 3 }}>{sub}</div>}
    </div>
  );
  const arrow = (label) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 8px", color: WFTokens.textDim, fontSize: 10 }}>
      <span style={{ width: 30, height: 1, background: WFTokens.borderDashed }}/>
      <span style={{ marginTop: 4, marginBottom: 4 }}>›</span>
      <span>{label}</span>
    </div>
  );
  return (
    <WFStyle style={{ background: WFTokens.bg, padding: 32, minHeight: "100%" }}>
      <div style={{ fontSize: 11, color: WFTokens.textDim, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 }}>USER FLOW</div>
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 24 }}>Five screens, one happy path, two off-ramps.</div>

      <div style={{ display: "flex", alignItems: "center", marginBottom: 32, flexWrap: "wrap", gap: 4 }}>
        {node("Landing", "/")}
        {arrow("CTA")}
        {node("Upload", "/upload")}
        {arrow("Start")}
        {node("Processing", "/runs/:id")}
        {arrow("Auto")}
        {node("Results", "/runs/:id/results")}
      </div>

      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ flex: 1, border: `1px dashed ${WFTokens.borderDashed}`, borderRadius: 6, padding: 16 }}>
          <div style={{ fontSize: 10, color: WFTokens.textDim, marginBottom: 8, letterSpacing: 0.5, textTransform: "uppercase" }}>OFF-RAMP A — settings</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {node("Any page", "topbar link")}
            {arrow()}
            {node("Settings", "/settings")}
          </div>
          <div style={{ fontSize: 10, color: WFTokens.textDim, marginTop: 12, lineHeight: 1.5 }}>
            API keys, model picker, confidence threshold, reindex. Save returns user to where they came from.
          </div>
        </div>
        <div style={{ flex: 1, border: `1px dashed ${WFTokens.borderDashed}`, borderRadius: 6, padding: 16 }}>
          <div style={{ fontSize: 10, color: WFTokens.textDim, marginBottom: 8, letterSpacing: 0.5, textTransform: "uppercase" }}>OFF-RAMP B — error</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {node("Upload", "")}
            {arrow("Bad file")}
            {node("Inline error", "single sentence")}
          </div>
          <div style={{ fontSize: 10, color: WFTokens.textDim, marginTop: 12, lineHeight: 1.5 }}>
            Wrong format, oversized, parser fails. Inline message; user retries. Never an alert dialog.
          </div>
        </div>
      </div>

      <div style={{ marginTop: 32, fontSize: 10, color: WFTokens.textDim, lineHeight: 1.55 }}>
        <strong style={{ color: WFTokens.text }}>Page conventions</strong> · slim sticky topbar across all screens · max content width 720px (upload, settings) or 1120px (landing, processing, results) · footer only on landing · system messages via toast bottom-right.
      </div>
    </WFStyle>
  );
};

// IA & spec sheet
const WFSpec = () => (
  <WFStyle style={{ background: WFTokens.bg, padding: 32, minHeight: "100%" }}>
    <div style={{ fontSize: 11, color: WFTokens.textDim, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 }}>SCOPE</div>
    <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 18 }}>5 screens · 12 components · 1 workflow</div>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div style={{ background: WFTokens.surface, border: `1px solid ${WFTokens.border}`, borderRadius: 6, padding: 16 }}>
        <div style={{ fontSize: 11, color: WFTokens.textDim, marginBottom: 10, letterSpacing: 0.5, textTransform: "uppercase" }}>SCREENS</div>
        {[
          ["01", "Landing", "/", "Hero · CTA · how it works"],
          ["02", "Upload", "/upload", "Dropzone · examples · email fallback"],
          ["03", "Processing", "/runs/:id", "5-step timeline · live counters"],
          ["04", "Results", "/runs/:id/results", "Downloads · 4 tabs · answer cards"],
          ["05", "Settings", "/settings", "Keys · model · threshold · reindex"],
        ].map((row) => (
          <div key={row[0]} style={{ display: "grid", gridTemplateColumns: "26px 80px 130px 1fr", gap: 8, fontSize: 11, padding: "6px 0", borderTop: `1px solid ${WFTokens.fillDim}` }}>
            <span style={{ color: WFTokens.textDim, fontFamily: "monospace" }}>{row[0]}</span>
            <span style={{ fontWeight: 500 }}>{row[1]}</span>
            <span style={{ fontFamily: "monospace", color: WFTokens.textDim }}>{row[2]}</span>
            <span style={{ color: WFTokens.textDim }}>{row[3]}</span>
          </div>
        ))}
      </div>

      <div style={{ background: WFTokens.surface, border: `1px solid ${WFTokens.border}`, borderRadius: 6, padding: 16 }}>
        <div style={{ fontSize: 11, color: WFTokens.textDim, marginBottom: 10, letterSpacing: 0.5, textTransform: "uppercase" }}>SHADCN PRIMITIVES</div>
        {[
          ["button", "5 variants"],
          ["card", "containers"],
          ["badge", "status pills · counts"],
          ["tabs", "results page sections"],
          ["progress", "processing"],
          ["dialog", "save confirmation · errors"],
          ["tooltip", "citation chips · confidence"],
          ["separator", "between sections"],
          ["skeleton", "loading states"],
          ["sonner", "toasts"],
          ["slider", "confidence threshold"],
          ["input · label · form", "settings"],
        ].map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderTop: `1px solid ${WFTokens.fillDim}`, fontSize: 11 }}>
            <span style={{ fontFamily: "monospace" }}>{k}</span>
            <span style={{ color: WFTokens.textDim }}>{v}</span>
          </div>
        ))}
      </div>

      <div style={{ background: WFTokens.surface, border: `1px solid ${WFTokens.border}`, borderRadius: 6, padding: 16 }}>
        <div style={{ fontSize: 11, color: WFTokens.textDim, marginBottom: 10, letterSpacing: 0.5, textTransform: "uppercase" }}>TONE</div>
        <ul style={{ paddingLeft: 18, lineHeight: 1.65, fontSize: 11, margin: 0 }}>
          <li>Direct. No emoji.</li>
          <li>Sentence case headings ("Upload questionnaire").</li>
          <li>British English spelling.</li>
          <li>Empty states + errors: one calm sentence.</li>
          <li>No exclamation marks. No "Oops" / "Hold tight" copy.</li>
        </ul>
      </div>

      <div style={{ background: WFTokens.surface, border: `1px solid ${WFTokens.border}`, borderRadius: 6, padding: 16 }}>
        <div style={{ fontSize: 11, color: WFTokens.textDim, marginBottom: 10, letterSpacing: 0.5, textTransform: "uppercase" }}>ACCESSIBILITY (NON-NEGOTIABLE)</div>
        <ul style={{ paddingLeft: 18, lineHeight: 1.65, fontSize: 11, margin: 0 }}>
          <li>WCAG AA (zinc-900 on zinc-50 ≈ 16:1).</li>
          <li>Focus rings always visible · 2px accent ring.</li>
          <li>aria-live on toasts + processing updates.</li>
          <li>Dropzone: Enter / Space opens picker.</li>
          <li>prefers-reduced-motion → transitions become instant.</li>
        </ul>
      </div>
    </div>
  </WFStyle>
);

function WireframesApp() {
  return (
    <DesignCanvas>
      <DCSection id="overview" title="Overview" subtitle="Information architecture and the one happy path.">
        <DCArtboard id="o1" label="User flow" width={900} height={520}>
          <WFFlow/>
        </DCArtboard>
        <DCArtboard id="o2" label="Scope & primitives" width={900} height={620}>
          <WFSpec/>
        </DCArtboard>
      </DCSection>

      <DCSection id="screens" title="Screens" subtitle="Low-fidelity layout sketches. Structure before style.">
        <DCArtboard id="w1" label="01 · Landing" width={1100} height={1000}>
          <WFLanding/>
        </DCArtboard>
        <DCArtboard id="w2" label="02 · Upload" width={1100} height={860}>
          <WFUpload/>
        </DCArtboard>
        <DCArtboard id="w3" label="03 · Processing" width={1100} height={780}>
          <WFProcessing/>
        </DCArtboard>
        <DCArtboard id="w4" label="04 · Results" width={1100} height={1080}>
          <WFResults/>
        </DCArtboard>
        <DCArtboard id="w5" label="05 · Settings" width={1100} height={1100}>
          <WFSettings/>
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<WireframesApp/>);
