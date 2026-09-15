import React, { useEffect, useState } from "react";
import { api, ContentItem, Campaign } from "../api";
import { Card, ErrorBanner, StatusPill } from "../components/ui";

type DayCell = {
  date: Date;
  items: { kind: "content" | "campaign"; title: string; sub: string; status: string }[];
};

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function CalendarPage() {
  const [month, setMonth] = useState(() => new Date());
  const [content, setContent] = useState<ContentItem[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .content({ limit: 200 })
      .then(setContent)
      .catch(() => {});
    api
      .campaigns()
      .then(setCampaigns)
      .catch(() => {});
  }, []);

  const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const gridStart = new Date(startOfMonth);
  gridStart.setDate(gridStart.getDate() - ((gridStart.getDay() + 6) % 7)); // Monday-first
  const weeks: DayCell[][] = [];
  let row: DayCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    const items: DayCell["items"] = [];
    for (const c of content) {
      const when = c.scheduled_for ? new Date(c.scheduled_for) : null;
      if (when && sameDay(when, d)) {
        items.push({
          kind: "content",
          title: c.title || c.hook,
          sub: `${c.platform} · ${c.content_type}`,
          status: c.status,
        });
      }
    }
    for (const c of campaigns) {
      const when = c.created_at ? new Date(c.created_at) : null;
      if (when && sameDay(when, d)) {
        items.push({
          kind: "campaign",
          title: c.title,
          sub: c.objective,
          status: c.status,
        });
      }
    }
    row.push({ date: d, items });
    if (row.length === 7) {
      weeks.push(row);
      row = [];
    }
  }

  const today = new Date();
  const monthLabel = month.toLocaleString("en-US", { month: "long", year: "numeric" });

  const shiftMonth = (delta: number) =>
    setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1));

  const goToday = () => setMonth(new Date());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Calendar</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Scheduled content and campaigns, month view.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftMonth(-1)}
            className="rounded-lg border border-white/[0.1] px-3 py-1.5 text-sm text-text-muted hover:bg-secondary/[0.06]"
          >
            ←
          </button>
          <span className="text-sm font-medium text-text-primary w-36 text-center">{monthLabel}</span>
          <button
            onClick={() => shiftMonth(1)}
            className="rounded-lg border border-white/[0.1] px-3 py-1.5 text-sm text-text-muted hover:bg-secondary/[0.06]"
          >
            →
          </button>
          <button
            onClick={goToday}
            className="rounded-lg border border-success px-3 py-1.5 text-sm text-success hover:bg-success/10"
          >
            Today
          </button>
        </div>
      </div>

      <ErrorBanner message={error} />

      <div className="grid grid-cols-7 gap-px rounded-xl border border-white/[0.06] border-white/[0.06] overflow-hidden">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="bg-bg-secondary px-3 py-2 text-[11px] font-medium text-text-muted uppercase">
            {d}
          </div>
        ))}
        {weeks.flat().map((cell, i) => {
          const inMonth = cell.date.getMonth() === month.getMonth();
          const isToday = sameDay(cell.date, today);
          return (
            <div
              key={i}
              className={`min-h-[96px] bg-bg-secondary p-1.5 ${inMonth ? "" : "opacity-40"}`}
            >
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  isToday ? "bg-success text-text-primary" : "text-text-muted"
                }`}
              >
                {cell.date.getDate()}
              </div>
              <div className="mt-1 space-y-1">
                {cell.items.slice(0, 3).map((item, j) => (
                  <div
                    key={j}
                    title={`${item.title} — ${item.sub}`}
                    className={`truncate rounded px-1.5 py-0.5 text-[10px] ${
                      item.kind === "campaign"
                        ? "bg-accent/15 text-accent"
                        : "bg-success/10 text-success"
                    }`}
                  >
                    {item.title || item.sub}
                  </div>
                ))}
                {cell.items.length > 3 && (
                  <div className="px-1.5 text-[10px] text-text-muted">
                    +{cell.items.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Card title="Upcoming scheduled content">
        {content.filter((c) => c.scheduled_for).length === 0 ? (
          <p className="text-sm text-text-muted">Nothing scheduled yet.</p>
        ) : (
          <div className="space-y-2">
            {content
              .filter((c) => c.scheduled_for)
              .slice()
              .sort((a, b) => (a.scheduled_for! < b.scheduled_for! ? -1 : 1))
              .slice(0, 12)
              .map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-bg-secondary px-4 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="text-sm text-text-primary truncate">{c.title || c.hook}</div>
                    <div className="text-xs text-text-muted">
                      {c.platform} · {new Date(c.scheduled_for!).toLocaleString()}
                    </div>
                  </div>
                  <StatusPill status={c.status} />
                </div>
              ))}
          </div>
        )}
      </Card>
    </div>
  );
}