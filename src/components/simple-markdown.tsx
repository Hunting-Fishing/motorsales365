import { useMemo } from "react";

/**
 * Very lightweight Markdown renderer for the Document Check content.
 * Supports: headings (h2-h4), bullet lists, numbered lists, bold (**),
 * italic (*), inline links [text](url), paragraph breaks. Escapes HTML.
 */
export function SimpleMarkdown({ source }: { source: string }) {
  const blocks = useMemo(() => parseBlocks(source ?? ""), [source]);
  return (
    <div className="space-y-3 text-sm leading-relaxed text-foreground">
      {blocks.map((b, i) => (
        <RenderBlock key={i} block={b} />
      ))}
    </div>
  );
}

type Block =
  | { type: "p"; text: string }
  | { type: "h"; level: 2 | 3 | 4; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] };

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const h = /^(#{2,4})\s+(.*)$/.exec(line);
    if (h) {
      blocks.push({ type: "h", level: h[1].length as 2 | 3 | 4, text: h[2].trim() });
      i++;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }
    // paragraph — collect until blank line
    const buf: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !/^(#{2,4}\s|\s*[-*]\s|\s*\d+\.\s)/.test(lines[i])) {
      buf.push(lines[i]);
      i++;
    }
    blocks.push({ type: "p", text: buf.join(" ") });
  }
  return blocks;
}

function RenderBlock({ block }: { block: Block }) {
  if (block.type === "h") {
    const cls =
      block.level === 2
        ? "text-lg font-semibold mt-4"
        : block.level === 3
          ? "text-base font-semibold mt-3"
          : "text-sm font-semibold mt-2";
    return <div className={cls}>{renderInline(block.text)}</div>;
  }
  if (block.type === "ul") {
    return (
      <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
        {block.items.map((it, i) => (
          <li key={i}>{renderInline(it)}</li>
        ))}
      </ul>
    );
  }
  if (block.type === "ol") {
    return (
      <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
        {block.items.map((it, i) => (
          <li key={i}>{renderInline(it)}</li>
        ))}
      </ol>
    );
  }
  return <p className="text-muted-foreground">{renderInline(block.text)}</p>;
}

function renderInline(text: string): React.ReactNode {
  // Escape HTML characters first
  const esc = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // Process links [text](url), then bold **, then italic *
  const parts: React.ReactNode[] = [];
  const regex = /\[([^\]]+)\]\(([^)]+)\)|(\*\*[^*]+\*\*)|(\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(esc)) !== null) {
    if (m.index > last) parts.push(esc.slice(last, m.index));
    if (m[1]) {
      const url = m[2];
      const safe = /^https?:\/\//.test(url) ? url : "#";
      parts.push(
        <a
          key={key++}
          href={safe}
          target="_blank"
          rel="noreferrer nofollow"
          className="text-primary underline"
        >
          {m[1]}
        </a>,
      );
    } else if (m[3]) {
      parts.push(<strong key={key++}>{m[3].slice(2, -2)}</strong>);
    } else if (m[4]) {
      parts.push(<em key={key++}>{m[4].slice(1, -1)}</em>);
    }
    last = regex.lastIndex;
  }
  if (last < esc.length) parts.push(esc.slice(last));
  return <>{parts}</>;
}
