"use client";

import { useId, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Spinner } from "@/components/Spinner";
import { Toast } from "@/components/Toast";
import {
  CheckIcon,
  DatabaseIcon,
  EyeIcon,
  EyeOffIcon,
  KeyIcon,
  RefreshIcon,
  SlidersIcon,
  SparkIcon,
} from "@/components/icons";

// Screen 5 — Settings. The first Phase D screen: it wires the primitives
// (Button, Card, Spinner, Toast) into a real /settings route. Ported from the
// prototype's SettingsPage (pages.jsx:743) with three deliberate divergences:
//  1. API keys are real masked inputs (type=password) with a per-field reveal
//     toggle — the prototype only showed pre-masked strings. Keys are never
//     persisted or logged here; the live save lands in the §8 glue step.
//  2. The Save button is variant="primary" (the locked black-pill CTA), not the
//     prototype's "accent" — accent maps to Crail orange, which the locked
//     design reserves for the Powered-by-Claude badge only.
//  3. The selected-radio accent + slider focus ring are river-blue, not the
//     prototype's var(--accent) (orange). Em dashes in the slider labels are
//     swapped for middle dots (Tom's voice bans em dashes).
// State is local useState only (no backend yet); routing/layout is covered by
// `npm run build` + the Slice 18 browser pass, not this jsdom render.

interface ModelOption {
  id: string;
  title: string;
  meta: string;
  desc: string;
}

const MODEL_OPTIONS: ModelOption[] = [
  {
    id: "sonnet",
    title: "Claude Sonnet 4.5",
    meta: "default · slower · ~$0.004/q",
    desc: "Best quality. Use for customer-facing ISQs.",
  },
  {
    id: "haiku",
    title: "Claude Haiku 4.5",
    meta: "fast · ~$0.0008/q",
    desc: "Use for batch backfill or non-critical runs.",
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const [model, setModel] = useState("sonnet");
  const [threshold, setThreshold] = useState(0.6);
  const [reindexing, setReindexing] = useState(false);
  const [reindexed, setReindexed] = useState(false);
  const [toast, setToast] = useState(false);
  const [keys, setKeys] = useState({
    anthropic: "sk-ant-DEMO-not-a-real-key",
    voyage: "pa-DEMO-not-a-real-key",
    pinecone: "pcsk-DEMO-not-a-real-key",
  });

  const reindex = () => {
    setReindexing(true);
    // Simulated work until the live POST /index is wired (§8 glue).
    setTimeout(() => {
      setReindexing(false);
      setReindexed(true);
    }, 1600);
  };

  // Mock save: no persistence and no logging of key values (secrets stay in the
  // input only). The real save against the service is the §8 glue step.
  const save = () => {
    setToast(true);
    setTimeout(() => setToast(false), 2200);
  };

  return (
    <div style={{ minHeight: "calc(100vh - 64px)" }} data-screen-label="05 Settings">
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "56px var(--space-8) 96px" }}>
        <div style={{ marginBottom: 28 }}>
          <h1
            style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.01em", margin: "0 0 6px" }}
          >
            Settings
          </h1>
          <p className="muted" style={{ fontSize: 14, margin: 0 }}>
            Keys, model, and the threshold the agent uses to flag answers for review.
          </p>
        </div>

        <SettingSection
          title="API configuration"
          subtitle="Keys are masked on display. Saved keys are written to the encrypted local volume only."
          icon={<KeyIcon size={16} />}
        >
          <ApiKeyField
            label="Anthropic API key"
            value={keys.anthropic}
            onChange={(v) => setKeys({ ...keys, anthropic: v })}
          />
          <ApiKeyField
            label="Voyage API key"
            help="Used for embedding the corpus and per-question queries."
            value={keys.voyage}
            onChange={(v) => setKeys({ ...keys, voyage: v })}
          />
          <ApiKeyField
            label="Pinecone API key"
            help="Index name is configured via the PINECONE_INDEX env var."
            value={keys.pinecone}
            onChange={(v) => setKeys({ ...keys, pinecone: v })}
          />
        </SettingSection>

        <SettingSection
          title="Model"
          subtitle="The model used for answer generation. Query rewriting always uses Haiku."
          icon={<SparkIcon size={16} />}
        >
          <ModelRadioGroup value={model} onChange={setModel} options={MODEL_OPTIONS} />
        </SettingSection>

        <SettingSection
          title="Confidence threshold"
          subtitle="Answers below this aggregate score are flagged for human review. Default 0.60."
          icon={<SlidersIcon size={16} />}
        >
          <ConfidenceSlider value={threshold} onChange={setThreshold} />
        </SettingSection>

        <SettingSection
          title="Knowledge base"
          subtitle="Re-embed the source corpus and rebuild the Pinecone index."
          icon={<DatabaseIcon size={16} />}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              padding: "16px 0",
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Reindex knowledge base</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                {reindexed
                  ? "Last reindex · just now · 142 chunks across 3 sources"
                  : "Last reindex · 2026-05-24 14:12 · 142 chunks across 3 sources"}
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={reindex}
              disabled={reindexing}
              leadingIcon={reindexing ? <Spinner /> : <RefreshIcon size={13} />}
            >
              {reindexing ? "Reindexing…" : reindexed ? "Reindex again" : "Reindex"}
            </Button>
          </div>
        </SettingSection>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            marginTop: 40,
            paddingTop: 24,
            borderTop: "1px solid var(--border)",
          }}
        >
          <span className="muted" style={{ fontSize: 12 }}>
            Changes are applied to the next run.
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <Button variant="ghost" onClick={() => router.push("/")}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save} leadingIcon={<CheckIcon size={13} />}>
              Save settings
            </Button>
          </div>
        </div>
      </div>

      <div className="toast-wrap">
        {toast && <Toast message="Settings saved" icon={<CheckIcon size={14} />} />}
      </div>
    </div>
  );
}

function SettingSection({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section style={{ marginTop: 36 }}>
      <div style={{ marginBottom: 16, display: "flex", gap: 12, alignItems: "flex-start" }}>
        {icon && (
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              background: "var(--bg)",
              display: "grid",
              placeItems: "center",
              color: "var(--fg-3)",
              flex: "0 0 auto",
            }}
          >
            {icon}
          </span>
        )}
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
          {subtitle && (
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              {subtitle}
            </div>
          )}
        </div>
      </div>
      <Card padding="lg">{children}</Card>
    </section>
  );
}

function ApiKeyField({
  label,
  help,
  value,
  onChange,
}: {
  label: string;
  help?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const id = useId();
  return (
    <div style={{ marginBottom: 18 }}>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <div className="key-field">
        <input
          id={id}
          className="input input-mono"
          type={revealed ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="button"
          className="key-reveal"
          aria-label={revealed ? `Hide ${label}` : `Show ${label}`}
          aria-pressed={revealed}
          onClick={() => setRevealed((r) => !r)}
        >
          {revealed ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
        </button>
      </div>
      {help && <div className="help">{help}</div>}
    </div>
  );
}

function ModelRadioGroup({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (id: string) => void;
  options: ModelOption[];
}) {
  return (
    <div className="radio-group" role="radiogroup" aria-label="Generation model">
      {options.map((o) => {
        const selected = value === o.id;
        return (
          <label key={o.id} className={selected ? "radio-card is-selected" : "radio-card"}>
            <input
              type="radio"
              name="model"
              value={o.id}
              checked={selected}
              onChange={() => onChange(o.id)}
              className="radio-native"
            />
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600 }}>{o.title}</span>
              <span className="radio-card-ring">
                <span className="radio-card-dot" />
              </span>
            </span>
            <span
              className="muted"
              style={{
                display: "block",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                marginBottom: 8,
              }}
            >
              {o.meta}
            </span>
            <span className="muted" style={{ display: "block", fontSize: 12, lineHeight: 1.5 }}>
              {o.desc}
            </span>
          </label>
        );
      })}
    </div>
  );
}

function ConfidenceSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const pct = ((value - 0.3) / 0.6) * 100;
  const qualitative = value < 0.55 ? "Lenient" : value <= 0.65 ? "Balanced" : "Strict";
  return (
    <div className="slider">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <span className="muted" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
          0.30 · flag almost nothing
        </span>
        <span className="slider-value">{value.toFixed(2)}</span>
        <span className="muted" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
          0.90 · flag aggressively
        </span>
      </div>
      <div className="slider-track-wrap">
        <div className="slider-track" />
        <div className="slider-fill" style={{ width: `${pct}%` }} />
        {[0.3, 0.5, 0.6, 0.7, 0.9].map((t) => (
          <span
            key={t}
            className="slider-tick"
            style={{ left: `calc(${((t - 0.3) / 0.6) * 100}% - 1px)` }}
          />
        ))}
        <input
          type="range"
          className="slider-input"
          min={0.3}
          max={0.9}
          step={0.01}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          aria-label="Confidence threshold"
          aria-valuetext={value.toFixed(2)}
        />
        <span aria-hidden="true" className="slider-thumb" style={{ left: `calc(${pct}% - 9px)` }} />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 14,
          fontSize: 12,
        }}
      >
        <span className="muted">Recommended: 0.60</span>
        <span className="muted">{qualitative}</span>
      </div>
    </div>
  );
}
