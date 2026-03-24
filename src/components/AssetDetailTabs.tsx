"use client";

import { useState } from "react";
import clsx from "clsx";

const tabs = [
  { id: "overview" as const, label: "Overview" },
  { id: "activity" as const, label: "Activity" },
  { id: "maintenance" as const, label: "Logging & maintenance" },
];

export function AssetDetailTabs({
  overview,
  activity,
  maintenance,
}: {
  overview: React.ReactNode;
  activity: React.ReactNode;
  maintenance: React.ReactNode;
}) {
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("overview");

  return (
    <div>
      <div className="flex flex-wrap gap-1 border-b border-zinc-800 pb-px">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={clsx(
              "rounded-t-md px-3 py-2 text-sm font-medium transition-colors",
              tab === t.id
                ? "bg-zinc-900 text-zinc-100 ring-1 ring-zinc-700 ring-b-0"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="pt-6">
        {tab === "overview" ? overview : null}
        {tab === "activity" ? activity : null}
        {tab === "maintenance" ? maintenance : null}
      </div>
    </div>
  );
}
