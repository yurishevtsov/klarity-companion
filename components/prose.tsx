import ReactMarkdown from "react-markdown";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const COMPONENTS = {
  p: ({ children }: { children?: ReactNode }) => (
    <p className="mb-1.5 last:mb-0">{children}</p>
  ),
  ul: ({ children }: { children?: ReactNode }) => (
    <ul className="my-1 list-disc space-y-0.5 pl-5">{children}</ul>
  ),
  ol: ({ children }: { children?: ReactNode }) => (
    <ol className="my-1 list-decimal space-y-0.5 pl-5">{children}</ol>
  ),
  li: ({ children }: { children?: ReactNode }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  strong: ({ children }: { children?: ReactNode }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  em: ({ children }: { children?: ReactNode }) => <em className="italic">{children}</em>,
  code: ({ children }: { children?: ReactNode }) => (
    <code className="rounded bg-foreground/10 px-1 py-0.5 font-mono text-[0.9em]">
      {children}
    </code>
  ),
  a: ({ children, href }: { children?: ReactNode; href?: string }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="underline underline-offset-2"
    >
      {children}
    </a>
  ),
};

export function Prose({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("[overflow-wrap:anywhere] [word-break:break-word]", className)}>
      <ReactMarkdown components={COMPONENTS}>{children}</ReactMarkdown>
    </div>
  );
}
