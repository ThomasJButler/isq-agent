// Main app — hash-based router + page switch.

const { useState: aS, useEffect: aE } = React;

function App() {
  // route = { name, runId? }
  const [route, setRoute] = aS(parseHash());

  aE(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = (next) => {
    const hash = nextToHash(next);
    if (window.location.hash !== hash) window.location.hash = hash;
    setRoute(next);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const run = window.ISQ_RUN;
  const submittedFile = React.useRef(null);

  const onSubmit = (file) => {
    submittedFile.current = file;
    navigate({ name: "processing", runId: run.meta.run_id });
  };
  const onProcessingDone = () => navigate({ name: "results", runId: run.meta.run_id });

  // Build a "current run" view; if user uploaded their own file, use that filename
  const runForView = React.useMemo(() => {
    const f = submittedFile.current;
    if (!f) return run;
    return { ...run, meta: { ...run.meta, filename: f.name } };
  }, [route, run]);

  let body = null;
  switch (route.name) {
    case "upload":     body = <UploadPage navigate={navigate} onSubmit={onSubmit}/>; break;
    case "processing": body = <ProcessingPage run={{ run_id: runForView.meta.run_id, filename: runForView.meta.filename, origin: runForView.meta.origin }} navigate={navigate} onComplete={onProcessingDone}/>; break;
    case "results":    body = <ResultsPage run={runForView} navigate={navigate}/>; break;
    case "settings":   body = <SettingsPage navigate={navigate}/>; break;
    case "landing":
    default:           body = <LandingPage navigate={navigate}/>; break;
  }

  return (
    <>
      <TopBar route={route} navigate={navigate}/>
      {body}
    </>
  );
}

function parseHash() {
  const h = (window.location.hash || "").replace(/^#\/?/, "");
  if (!h) return { name: "landing" };
  const [name, runId] = h.split("/");
  return { name, runId };
}
function nextToHash(r) {
  if (!r || r.name === "landing") return "";
  if (r.runId) return `#/${r.name}/${r.runId}`;
  return `#/${r.name}`;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
