'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  content: string;
  className?: string;
}

// Cap content length to prevent browser freeze on extremely long messages
const MAX_RENDER_LENGTH = 50_000;

export function Markdown({ content, className }: Props) {
  const blocks = useMemo(() => {
    const text = content.length > MAX_RENDER_LENGTH
      ? content.slice(0, MAX_RENDER_LENGTH) + '\n\n...(truncated)'
      : content;
    return parseBlocks(text);
  }, [content]);

  return (
    <div className={cn('prose-sm max-w-none', className)}>
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  );
}

type BlockType =
  | { type: 'code'; lang: string; content: string }
  | { type: 'blockquote'; content: string }
  | { type: 'heading'; level: number; content: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'paragraph'; content: string };

function parseBlocks(text: string): BlockType[] {
  const blocks: BlockType[] = [];
  const lines = text.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: 'code', lang, content: codeLines.join('\n') });
      i++; // skip closing ```
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      blocks.push({ type: 'heading', level: headingMatch[1].length, content: headingMatch[2] });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      blocks.push({ type: 'blockquote', content: quoteLines.join('\n') });
      continue;
    }

    // Unordered list
    if (line.match(/^[-*]\s+/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[-*]\s+/)) {
        items.push(lines[i].replace(/^[-*]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'list', ordered: false, items });
      continue;
    }

    // Ordered list
    if (line.match(/^\d+\.\s+/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s+/)) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ type: 'list', ordered: true, items });
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Paragraph — collect consecutive non-special lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].startsWith('```') &&
      !lines[i].startsWith('#') &&
      !lines[i].startsWith('> ') &&
      !lines[i].match(/^[-*]\s+/) &&
      !lines[i].match(/^\d+\.\s+/)
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: 'paragraph', content: paraLines.join('\n') });
    }
  }

  return blocks;
}

function Block({ block }: { block: BlockType }) {
  switch (block.type) {
    case 'code':
      return (
        <pre className="my-2 rounded-md bg-zinc-900 p-3 overflow-x-auto">
          <code className="text-xs text-zinc-100 font-mono whitespace-pre-wrap break-words">{block.content}</code>
        </pre>
      );
    case 'heading': {
      const cls = block.level === 1
        ? 'text-base font-bold my-2'
        : block.level === 2
          ? 'text-sm font-bold my-1.5'
          : 'text-sm font-semibold my-1';
      return <p className={cls}><InlineText text={block.content} /></p>;
    }
    case 'blockquote':
      return (
        <blockquote className="my-1.5 border-l-2 border-muted-foreground/30 pl-3 text-muted-foreground italic">
          <InlineText text={block.content} />
        </blockquote>
      );
    case 'list': {
      const Tag = block.ordered ? 'ol' : 'ul';
      return (
        <Tag className={cn('my-1 pl-5', block.ordered ? 'list-decimal' : 'list-disc')}>
          {block.items.map((item, i) => (
            <li key={i} className="text-sm"><InlineText text={item} /></li>
          ))}
        </Tag>
      );
    }
    case 'paragraph':
      return <p className="my-1"><InlineText text={block.content} /></p>;
  }
}

/**
 * Iterative inline parser — avoids regex backtracking.
 * Scans character by character for **, *, `, [link](url).
 */
function InlineText({ text }: { text: string }) {
  const parts = useMemo(() => parseInline(text), [text]);
  return <>{parts}</>;
}

function parseInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let i = 0;
  let buf = '';
  let key = 0;

  const flush = () => {
    if (buf) {
      parts.push(buf);
      buf = '';
    }
  };

  while (i < text.length) {
    // ** bold **
    if (text[i] === '*' && text[i + 1] === '*') {
      const end = text.indexOf('**', i + 2);
      if (end !== -1) {
        flush();
        parts.push(<strong key={key++} className="font-semibold">{text.slice(i + 2, end)}</strong>);
        i = end + 2;
        continue;
      }
    }

    // * italic *  (but not **)
    if (text[i] === '*' && text[i + 1] !== '*') {
      const end = text.indexOf('*', i + 1);
      if (end !== -1 && end > i + 1) {
        flush();
        parts.push(<em key={key++}>{text.slice(i + 1, end)}</em>);
        i = end + 1;
        continue;
      }
    }

    // ` inline code `
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1);
      if (end !== -1) {
        flush();
        parts.push(
          <code key={key++} className="rounded bg-zinc-800 px-1 py-0.5 text-xs font-mono text-zinc-200">
            {text.slice(i + 1, end)}
          </code>
        );
        i = end + 1;
        continue;
      }
    }

    // [link text](url)
    if (text[i] === '[') {
      const closeBracket = text.indexOf(']', i + 1);
      if (closeBracket !== -1 && text[closeBracket + 1] === '(') {
        const closeParen = text.indexOf(')', closeBracket + 2);
        if (closeParen !== -1) {
          const linkText = text.slice(i + 1, closeBracket);
          const url = text.slice(closeBracket + 2, closeParen);
          flush();
          parts.push(
            <a key={key++} href={url} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
              {linkText}
            </a>
          );
          i = closeParen + 1;
          continue;
        }
      }
    }

    buf += text[i];
    i++;
  }

  flush();
  return parts;
}
