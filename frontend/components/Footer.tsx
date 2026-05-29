import type { JSX } from "react";
import { Badge } from "@/components/Badge";

// Site footer chrome — the MIT/author credit plus the "Powered by Claude" badge,
// which is the ONE place Crail orange is allowed in the whole UI (Badge variant
// "claude"; every other surface is paper / semantic / river-blue). It's purely
// presentational and reusable: the prototype models it as a shared <Footer>
// (components.jsx:92), the same way TopBar/Wordmark are shared chrome. The
// Landing screen mounts it now; later screens can reuse it. One divergence from
// the prototype: a wrapping flex row instead of an absolutely-positioned badge,
// so the credit and badge never overlap at narrow widths.
export function Footer(): JSX.Element {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--border)",
        marginTop: 80,
        padding: "28px var(--gutter)",
      }}
    >
      <div
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-4)",
          flexWrap: "wrap",
        }}
      >
        <span className="muted" style={{ fontSize: 12 }}>
          Built with Claude · Tom Butler · MIT
        </span>
        <Badge variant="claude">Powered by Claude</Badge>
      </div>
    </footer>
  );
}
