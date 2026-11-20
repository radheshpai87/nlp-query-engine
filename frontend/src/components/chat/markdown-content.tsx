"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className = "" }: MarkdownContentProps) {
  return (
    <div className={`markdown-body text-sm leading-relaxed space-y-2 select-text ${className}`}>
      <ReactMarkdown
        components={{
          p: ({ children }) => (
            <p className="text-sm leading-relaxed text-foreground my-1.5 last:mb-0 first:mt-0">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-white">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="text-zinc-300 italic">{children}</em>
          ),
          code: ({ className: codeClassName, children, ...props }) => {
            const isCodeBlock = codeClassName?.includes("language-");
            if (isCodeBlock) {
              return (
                <code className="font-mono text-xs text-foreground block" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code
                className="font-mono text-[12px] px-1.5 py-0.5 rounded bg-muted text-brand border border-border font-normal"
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="p-3 my-2 rounded-xl bg-background border border-muted overflow-x-auto font-mono text-xs text-foreground leading-relaxed">
              {children}
            </pre>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside pl-5 space-y-2 my-2 text-sm text-foreground">
              {children}
            </ol>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-outside pl-5 space-y-1.5 my-2 text-sm text-foreground/85">
              {children}
            </ul>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed text-foreground/85 pl-0.5">{children}</li>
          ),
          h1: ({ children }) => (
            <h1 className="text-base font-semibold text-white mt-3 mb-1.5">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-semibold text-white mt-3 mb-1.5">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 mt-2 mb-1">
              {children}
            </h3>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-brand pl-3 py-1 my-2 text-zinc-300 bg-brand/5 rounded-r text-xs leading-relaxed">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
