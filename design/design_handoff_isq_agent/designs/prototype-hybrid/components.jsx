// Shared UI primitives for the ISQ Agent prototype.
// Read by app.jsx via window.* globals.

const { useState, useEffect, useRef, useCallback, useMemo } = React;

// —— Top bar ——
const TopBar = ({ route, navigate }) => {
  const links = [
    { id: "upload", label: "Upload" },
    { id: "settings", label: "Settings" },
  ];
  return (
    <header className="topbar" data-screen-label="TopBar">
      <a
        href="#"
        onClick={(e) => { e.preventDefault(); navigate({ name: "landing" }); }}
        className="wordmark"
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <span>ISQ</span><span style={{ display: "inline-block", width: 6 }}/><span className="accent">Agent</span>
      </a>
      <nav>
        {links.map((l) => (
          <a
            key={l.id}
            href="#"
            onClick={(e) => { e.preventDefault(); navigate({ name: l.id }); }}
            className={route?.name === l.id ? "active" : ""}
          >{l.label}</a>
        ))}
        <a
          href="https://github.com/ThomasJButler/isq-agent"
          target="_blank" rel="noreferrer"
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <I.link size={13}/> Repo
        </a>
      </nav>
    </header>
  );
};

// —— Buttons ——
const Button = ({ variant = "secondary", size, children, onClick, disabled, type = "button", className = "", style, leadingIcon, trailingIcon, as: As, href }) => {
  const cls = `btn btn-${variant} ${size === "lg" ? "btn-lg" : size === "sm" ? "btn-sm" : ""} ${className}`;
  const content = (
    <>
      {leadingIcon}
      {children && <span>{children}</span>}
      {trailingIcon}
    </>
  );
  if (href) return <a href={href} className={cls} style={style} onClick={onClick}>{content}</a>;
  return (
    <button type={type} className={cls} style={style} onClick={onClick} disabled={disabled}>
      {content}
    </button>
  );
};

// —— Badges ——
const Badge = ({ children, variant = "default", dot, leadingIcon, className = "", style }) => (
  <span className={`badge badge-${variant} ${className}`} style={style}>
    {dot && <span className="badge-dot"/>}
    {leadingIcon}
    {children}
  </span>
);

// —— Confidence bar ——
const ConfidenceBar = ({ score, dimensions, compact = false }) => {
  const pct = Math.round(score * 100);
  const tone = score >= 0.8 ? "high" : score >= 0.6 ? "mid" : "low";
  if (compact) {
    return (
      <span className={`conf conf-${tone}`}>
        <span className="conf-bar"><span style={{ width: `${pct}%` }}/></span>
        <span>{pct}</span>
      </span>
    );
  }
  return (
    <span className={`conf conf-${tone}`} title={dimensions ? `cites_policy ${dimensions.cites_policy} · on_topic ${dimensions.on_topic} · vendor_tone ${dimensions.vendor_tone} · complete ${dimensions.complete}` : ""}>
      <span className="muted" style={{ fontSize: 11 }}>confidence</span>
      <span className="conf-bar"><span style={{ width: `${pct}%` }}/></span>
      <span>{score.toFixed(2)}</span>
    </span>
  );
};

// —— Footer ——
const Footer = () => (
  <footer style={{ borderTop: "1px solid var(--border)", marginTop: 80, padding: "28px 32px", textAlign: "center" }}>
    <div style={{ position: "relative", maxWidth: 1120, margin: "0 auto" }}>
      <span className="muted" style={{ fontSize: 12 }}>Built with Claude · Tom Butler · MIT</span>
      <span style={{ position: "absolute", right: 0, top: 0 }}>
        <span className="badge badge-claude">Powered by Claude</span>
      </span>
    </div>
  </footer>
);

// —— Page-level error banner ——
const ErrorBanner = ({ message, onDismiss }) => (
  <div
    role="alert"
    style={{
      borderLeft: "4px solid var(--error)",
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderLeftWidth: 4, borderLeftColor: "var(--error)",
      padding: "12px 16px", borderRadius: "var(--r-md)",
      display: "flex", alignItems: "center", gap: 12,
      fontSize: 13,
    }}
  >
    <I.warning size={16} style={{ color: "var(--error)", flex: "0 0 auto" }}/>
    <span style={{ flex: 1 }}>{message}</span>
    {onDismiss && (
      <button onClick={onDismiss} className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }}>
        <I.x size={14}/>
      </button>
    )}
  </div>
);

// —— Toast ——
const Toast = ({ message, icon }) => (
  <div className="toast">
    {icon}
    <span>{message}</span>
  </div>
);

// —— Tabs ——
const Tabs = ({ items, value, onChange }) => (
  <div className="tabs" role="tablist">
    {items.map((it) => (
      <button
        key={it.id}
        role="tab"
        aria-selected={value === it.id}
        className={`tab ${value === it.id ? "active" : ""}`}
        onClick={() => onChange(it.id)}
      >
        {it.label}
        {it.count != null && <span className="badge badge-default" style={{ height: 18, padding: "0 6px", fontSize: 10 }}>{it.count}</span>}
      </button>
    ))}
  </div>
);

// —— Skeleton helper ——
const Sk = ({ w = "100%", h = 12, r = 4, style }) => (
  <span className="sk" style={{ display: "block", width: w, height: h, borderRadius: r, ...style }}/>
);

// —— File size formatter ——
const fmtBytes = (b) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};
const fmtMs = (ms) => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
};
const fmtCost = (usd) => `$${usd.toFixed(3)}`;
const fmtNum = (n) => n.toLocaleString();

// —— Dropzone ——
const Dropzone = ({ file, onFile, onRemove, error, onError }) => {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const accept = useCallback((f) => {
    if (!f) return;
    const ok = /\.(pdf|xlsx)$/i.test(f.name);
    if (!ok) { onError("We couldn't read this file. Try a PDF or XLSX."); return; }
    if (f.size > 10 * 1024 * 1024) { onError("File is over 10 MB. Try a smaller file."); return; }
    onFile(f);
  }, [onFile, onError]);

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files?.[0]; accept(f);
  };
  const onPick = (e) => accept(e.target.files?.[0]);

  if (file) {
    return (
      <div className="card card-pad" style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ width: 40, height: 40, borderRadius: 8, background: "var(--bg)", display: "grid", placeItems: "center", color: "var(--fg-muted)" }}>
          <I.file size={18}/>
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 500, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{fmtBytes(file.size)} · {file.type || (file.name.endsWith(".xlsx") ? "Excel" : "PDF")}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onRemove}>Remove</button>
      </div>
    );
  }

  return (
    <div
      role="button" tabIndex={0}
      className={`dropzone ${dragging ? "dragging" : ""} ${error ? "error" : ""}`}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); } }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      aria-label="Upload a questionnaire"
    >
      <input ref={inputRef} type="file" accept=".pdf,.xlsx" onChange={onPick} hidden/>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <span style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--bg)", display: "grid", placeItems: "center", color: "var(--fg-muted)" }}>
          <I.upload size={20}/>
        </span>
        <div>
          <div style={{ fontWeight: 500, fontSize: 15 }}>Drop a questionnaire here, or click to browse.</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>PDF or XLSX. Up to 10 MB.</div>
        </div>
      </div>
    </div>
  );
};

// —— Timeline step ——
const TimelineStep = ({ state, title, sub, last }) => (
  <div className={`tl-step ${state}`} style={last ? { paddingBottom: 0 } : null}>
    <span className="tl-dot" aria-hidden="true">
      {state === "done" ? <I.check size={12} stroke={2.4}/> : state === "active" ? <span style={{ width: 6, height: 6, background: "currentColor", borderRadius: "50%" }}/> : null}
    </span>
    <div style={{ flex: 1 }}>
      <div className="tl-title">{title}</div>
      {sub && <div className="tl-sub">{sub}</div>}
    </div>
  </div>
);

// —— Stat tile ——
const Stat = ({ label, value, sub, icon }) => (
  <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 4, minHeight: 88 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {icon && <span style={{ color: "var(--fg-muted)" }}>{icon}</span>}
      <span className="muted" style={{ fontSize: 12, fontWeight: 500 }}>{label}</span>
    </div>
    <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em", fontFamily: "var(--mono)" }}>{value}</div>
    {sub && <div className="muted" style={{ fontSize: 11 }}>{sub}</div>}
  </div>
);

Object.assign(window, {
  TopBar, Footer, Button, Badge, ConfidenceBar, ErrorBanner, Toast,
  Tabs, Sk, Dropzone, TimelineStep, Stat,
  fmtBytes, fmtMs, fmtCost, fmtNum,
});
