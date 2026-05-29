"use client";

import type { JSX } from "react";

export interface TabItem {
  id: string;
  label: string;
  /** Optional count shown in a small default badge after the label. */
  count?: number;
}

interface TabsProps {
  items: TabItem[];
  /** The id of the active tab. */
  value: string;
  onChange: (id: string) => void;
}

// Tabs ported near-verbatim from the prototype's <Tabs> (components.jsx:136):
// role="tablist" with role="tab" buttons, the active tab carrying .active (the CSS
// draws the blue underline via .tab.active::after) plus aria-selected. The blue
// underline is the only accent here — zero orange. State (which tab) is parent-owned.
export function Tabs({ items, value, onChange }: TabsProps): JSX.Element {
  return (
    <div className="tabs" role="tablist">
      {items.map((item) => {
        const active = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={["tab", active && "active"].filter(Boolean).join(" ")}
            onClick={() => onChange(item.id)}
          >
            {item.label}
            {item.count != null && (
              <span
                className="badge badge-default"
                style={{ height: 18, padding: "0 6px", fontSize: 10 }}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
