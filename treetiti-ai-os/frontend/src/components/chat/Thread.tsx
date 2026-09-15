import React from "react";

export type ThreadMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  meta?: string;
};

export default function Thread({ messages }: { messages: ThreadMessage[] }) {
  if (messages.length === 0) {
    return (
      <div className="text-sm text-text-muted text-center py-16">
        Ask a question or kick off a workflow — your agents will reply here.
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {messages.map((m) => (
        <div
          key={m.id}
          className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
              m.role === "user"
                ? "bg-success text-bg-primary rounded-br-md"
                : "bg-secondary/80 text-text-primary rounded-bl-md"
            }`}
          >
            {m.content}
            {m.meta && (
              <div className="text-[10px] text-text-muted mt-2">{m.meta}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}