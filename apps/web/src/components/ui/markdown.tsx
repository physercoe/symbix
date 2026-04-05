'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface Props {
  content: string;
  className?: string;
}

export function Markdown({ content, className }: Props) {
  return (
    <ReactMarkdown
      className={cn('prose-sm max-w-none break-words', className)}
      remarkPlugins={[remarkGfm]}
      components={{
        pre: ({ children }) => (
          <pre className="my-2 rounded-md bg-zinc-900 p-3 overflow-x-auto">
            {children}
          </pre>
        ),
        code: ({ children, className: codeClass }) => {
          // Fenced code blocks get a className like "language-js"
          const isBlock = typeof codeClass === 'string' && codeClass.startsWith('language-');
          if (isBlock) {
            return (
              <code className="text-xs text-zinc-100 font-mono whitespace-pre-wrap break-words">
                {children}
              </code>
            );
          }
          // Inline code
          return (
            <code className="rounded bg-zinc-800 px-1 py-0.5 text-xs font-mono text-zinc-200">
              {children}
            </code>
          );
        },
        a: ({ href, children }) => (
          <a
            href={href}
            className="text-blue-400 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),
        h1: ({ children }) => <p className="text-base font-bold my-2">{children}</p>,
        h2: ({ children }) => <p className="text-sm font-bold my-1.5">{children}</p>,
        h3: ({ children }) => <p className="text-sm font-semibold my-1">{children}</p>,
        h4: ({ children }) => <p className="text-sm font-semibold my-1">{children}</p>,
        h5: ({ children }) => <p className="text-sm font-semibold my-1">{children}</p>,
        h6: ({ children }) => <p className="text-sm font-semibold my-1">{children}</p>,
        blockquote: ({ children }) => (
          <blockquote className="my-1.5 border-l-2 border-zinc-600 pl-3 text-zinc-400 italic">
            {children}
          </blockquote>
        ),
        ul: ({ children }) => <ul className="my-1 pl-5 list-disc">{children}</ul>,
        ol: ({ children }) => <ol className="my-1 pl-5 list-decimal">{children}</ol>,
        li: ({ children }) => <li className="text-sm">{children}</li>,
        table: ({ children }) => (
          <div className="my-2 overflow-x-auto">
            <table className="text-sm border-collapse">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border border-zinc-700 px-2 py-1 text-left font-semibold">{children}</th>
        ),
        td: ({ children }) => (
          <td className="border border-zinc-700 px-2 py-1">{children}</td>
        ),
        hr: () => <hr className="my-2 border-zinc-700" />,
        p: ({ children }) => <p className="my-1">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
