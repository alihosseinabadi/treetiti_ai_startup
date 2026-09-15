import React, { useEffect, useState } from "react";

/**
 * Dark-only app — theme is fixed to GrokNight. This component is kept as a
 * no-op so any existing call sites / re-exports continue to resolve, but it
 * no longer toggles a light theme (the app no longer has one).
 */
export function ThemeToggle() {
  return null;
}

interface KeyboardShortcutsHelpProps {
  onClose: () => void;
}

export function KeyboardShortcutsHelp({ onClose }: KeyboardShortcutsHelpProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const shortcuts = [
    { keys: "⌘K", description: "Open command palette" },
    { keys: "⌘N", description: "New chat/task" },
    { keys: "⌘⇧D", description: "Toggle dark mode" },
    { keys: "⌘/", description: "Show keyboard shortcuts" },
    { keys: "Enter", description: "Send message" },
    { keys: "Shift+Enter", description: "New line in composer" },
    { keys: "⌘↑/⌘↓", description: "Navigate command palette" },
    { keys: "@", description: "Mention teammate/team" },
    { keys: "#", description: "Mention team" },
    { keys: "/", description: "Slash commands in composer" },
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
      <div className="bg-bg-secondary rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-text-primary">Keyboard Shortcuts</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-secondary/[0.06] text-text-muted hover:text-text-primary">✕</button>
        </div>
        <dl className="space-y-2">
          {shortcuts.map((s, i) => (
            <div key={i} className="flex justify-between py-2 border-b border-border last:border-0">
              <kbd className="px-2 py-1 text-xs font-mono bg-bg-elevated text-text-primary rounded">{s.keys}</kbd>
              <span className="text-sm text-text-muted ml-4">{s.description}</span>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}