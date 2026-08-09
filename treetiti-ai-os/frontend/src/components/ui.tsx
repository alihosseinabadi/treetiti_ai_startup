export function Spinner({ label = "Thinking…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-zinc-400">
      <span className="inline-block h-4 w-4 rounded-full border-2 border-zinc-700 border-t-emerald-400 animate-spin" />
      {label}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
      {message}
    </div>
  );
}

export function Card({
  title,
  children,
  action,
}: {
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 overflow-hidden">
      {(title || action) && (
        <header className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/80">
          {title && <h3 className="text-sm font-semibold text-white">{title}</h3>}
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    new: "bg-sky-500/15 text-sky-300 border-sky-800/60",
    contacted: "bg-amber-500/15 text-amber-300 border-amber-800/60",
    qualified: "bg-emerald-500/15 text-emerald-300 border-emerald-800/60",
    won: "bg-emerald-500/20 text-emerald-200 border-emerald-700/60",
    lost: "bg-zinc-500/15 text-zinc-400 border-zinc-700/60",
    draft: "bg-zinc-500/15 text-zinc-400 border-zinc-700/60",
    pending_approval: "bg-amber-500/15 text-amber-300 border-amber-800/60",
    approved: "bg-emerald-500/15 text-emerald-300 border-emerald-800/60",
    published: "bg-violet-500/15 text-violet-300 border-violet-800/60",
    rejected: "bg-red-500/15 text-red-300 border-red-800/60",
    success: "bg-emerald-500/15 text-emerald-300 border-emerald-800/60",
    failed: "bg-red-500/15 text-red-300 border-red-800/60",
    running: "bg-amber-500/15 text-amber-300 border-amber-800/60",
  };
  const cls = map[status] ?? "bg-zinc-500/15 text-zinc-400 border-zinc-700/60";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs ${cls}`}>
      {status}
    </span>
  );
}
