import type { CSSProperties, JSX } from "react";
import { WarningIcon } from "@/components/icons";

// Run-level banner for the Results screen (Slice 18 — states). The Slice 3
// adapter surfaces summary.banner ("all_failed" | "all_flagged" | null); this
// renders the matching page-level notice. Ported from the prototype's
// ErrorBanner (components.jsx:104) + BannerShowcase (hifi.jsx:414): a left-border
// notice card with a semantic tone, a warning glyph, and the copy.
//
// It self-gates to null on the normal path (and for any unknown value), so the
// page can mount it unconditionally. Tones are the semantic --error / --warning
// tokens — never Crail orange — and the radius matches the page's .card
// (var(--radius-lg)); note --r-md is remapped to a pill here, so it is NOT used.

type BannerKind = "all_failed" | "all_flagged";

interface BannerConfig {
  /** Assertive for a hard failure, polite for an advisory. */
  role: "alert" | "status";
  /** Semantic tone token for the left accent + icon. */
  tone: string;
  message: string;
}

const BANNERS: Record<BannerKind, BannerConfig> = {
  all_failed: {
    role: "alert",
    tone: "var(--error)",
    message:
      "Every question failed to generate. The service couldn't produce any answers for this run. Check the service and run it again.",
  },
  all_flagged: {
    role: "status",
    tone: "var(--warning)",
    message:
      "All answers flagged for review. The knowledge base may not cover this questionnaire's domain.",
  },
};

export function ResultsBanner({ banner }: { banner: string | null }): JSX.Element | null {
  if (banner !== "all_failed" && banner !== "all_flagged") return null;
  const { role, tone, message } = BANNERS[banner];

  const style: CSSProperties = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderLeftWidth: 4,
    borderLeftColor: tone,
    padding: "12px 16px",
    borderRadius: "var(--radius-lg)",
    display: "flex",
    alignItems: "center",
    gap: 12,
    fontSize: 13,
    lineHeight: 1.5,
  };

  return (
    <div role={role} style={style}>
      <span style={{ color: tone, display: "inline-flex", flex: "0 0 auto" }}>
        <WarningIcon size={16} />
      </span>
      <span style={{ flex: 1 }}>{message}</span>
    </div>
  );
}
