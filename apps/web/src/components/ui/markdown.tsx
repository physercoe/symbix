'use client';

import { cn } from '@/lib/utils';

interface Props {
  content: string;
  className?: string;
}

/**
 * Lightweight markdown renderer — supports:
 * - **bold**, *italic*, `inline code`
 * - ```code blocks```
 * - # headings (h1-h3)
 * - - bullet lists
 * - 1. numbered lists
 * - > blockquotes
 * - [links](url)
 * - line breaks
 */
export function Markdown({ content, className }: Props) {
  const blocks = parseBlocks(content);

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
          <code className="text-xs text-zinc-100 font-mono">{block.content}</code>
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

function InlineText({ text }: { text: string }) {
  // Parse inline markdown: **bold**, *italic*, `code`, [link](url)
  const parts: React.ReactNode[] = [];
  // Regex for inline elements
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.+?)\))/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      // **bold**
      parts.push(<strong key={match.index} className="font-semibold">{match[2]}</strong>);
    } else if (match[3]) {
      // *italic*
      parts.push(<em key={match.index}>{match[3]}</em>);
    } else if (match[4]) {
      // `code`
      parts.push(
        <code key={match.index} className="rounded bg-zinc-800 px-1 py-0.5 text-xs font-mono text-zinc-200">
          {match[4]}
        </code>
      );
    } else if (match[5] && match[6]) {
      // [link](url)
      parts.push(
        <a key={match.index} href={match[6]} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
          {match[5]}
        </a>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts.length > 0 ? parts : text}</>;
}
