import React from "react";

type Line = { type: "p" | "h1" | "h2" | "h3" | "ul" | "ol" | "code" | "hr" | "quote" | "empty"; text?: string; level?: number };

function parseLines(src: string): Line[] {
  const out: Line[] = [];
  for (const raw of src.split("\n")) {
    const line = raw.replace(/\r$/, "");
    if (/^#{1,3}\s/.test(line)) {
      const m = line.match(/^(#{1,3})\s+(.*)$/)!;
      out.push({ type: `h${m[1].length}` as Line["type"], text: m[2] });
    } else if (/^```/.test(line)) {
      if (out.length && out[out.length - 1].type === "code") out.pop();
      else out.push({ type: "code", text: "" });
    } else if (out.length && out[out.length - 1].type === "code") {
      out[out.length - 1].text = `${out[out.length - 1].text ?? ""}${line}\n`;
    } else if (/^\s*[-*]\s+/.test(line)) {
      const last = out[out.length - 1];
      if (last && last.type === "ul") last.text = `${last.text ?? ""}\n${line.replace(/^\s*[-*]\s+/, "")}`;
      else out.push({ type: "ul", text: line.replace(/^\s*[-*]\s+/, "") });
    } else if (/^\s*\d+[.)]\s+/.test(line)) {
      const last = out[out.length - 1];
      if (last && last.type === "ol") last.text = `${last.text ?? ""}\n${line.replace(/^\s*\d+[.)]\s+/, "")}`;
      else out.push({ type: "ol", text: line.replace(/^\s*\d+[.)]\s+/, "") });
    } else if (/^\s*>\s?/.test(line)) {
      out.push({ type: "quote", text: line.replace(/^\s*>\s?/, "") });
    } else if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) {
      out.push({ type: "hr" });
    } else if (!line.trim()) {
      out.push({ type: "empty" });
    } else {
      out.push({ type: "p", text: line });
    }
  }
  return out;
}

function inline(text: string): React.ReactNode[] {
  // Split on code spans, then apply markdown-ish emphasis to the rest.
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    if (!part) return null;
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i}>{part.slice(1, -1)}</code>
      );
    }
    const bold = part.match(/^\*\*(.*)\*\*$/);
    if (bold) return <strong key={i}>{bold[1]}</strong>;
    const ital = part.match(/^\*(.*)\*$/);
    if (ital) return <em key={i}>{ital[1]}</em>;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const href = link[2];
      const external = /^https?:\/\//i.test(href);
      const anchor = href.startsWith("#");
      return (
        <a
          key={i}
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
          onClick={anchor ? (e) => e.preventDefault() : undefined}
        >
          {link[1]}
        </a>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

export function Markdown({ text }: { text: string }) {
  const lines = parseLines(text);
  return (
    <div className="t-md">
      {lines.map((l, i) => {
        switch (l.type) {
          case "h1":
            return <h1 key={i}>{inline(l.text ?? "")}</h1>;
          case "h2":
            return <h2 key={i}>{inline(l.text ?? "")}</h2>;
          case "h3":
            return <h3 key={i}>{inline(l.text ?? "")}</h3>;
          case "ul":
            return (
              <ul key={i}>
                {(l.text ?? "").split("\n").map((li, j) => (
                  <li key={j}>{inline(li)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i}>
                {(l.text ?? "").split("\n").map((li, j) => (
                  <li key={j}>{inline(li)}</li>
                ))}
              </ol>
            );
          case "code":
            return l.text ? <pre key={i}><code>{l.text.replace(/\n$/, "")}</code></pre> : null;
          case "hr":
            return <hr key={i} />;
          case "quote":
            return <blockquote key={i}>{inline(l.text ?? "")}</blockquote>;
          case "empty":
            return <div key={i} style={{ height: 8 }} />;
          default:
            return <p key={i}>{inline(l.text ?? "")}</p>;
        }
      })}
    </div>
  );
}