'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  content: string;
  className?: string;
}

/**
 * Fast markdown renderer — converts markdown to HTML via string replacements.
 * Uses dangerouslySetInnerHTML for performance (no React element tree overhead).
 * Only renders user/agent-authored chat messages, not arbitrary external HTML.
 */
export function Markdown({ content, className }: Props) {
  const html = useMemo(() => markdownToHtml(content), [content]);

  return (
    <div
      className={cn('prose-sm max-w-none break-words', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function markdownToHtml(src: string): string {
  // Split into code blocks vs everything else
  const parts: string[] = [];
  const codeBlockRe = /```(\w*)\n([\s\S]*?)```/g;
  let last = 0;
  let match;

  while ((match = codeBlockRe.exec(src)) !== null) {
    if (match.index > last) {
      parts.push(processNonCode(src.slice(last, match.index)));
    }
    const code = escapeHtml(match[2]);
    parts.push(
      `<pre class="my-2 rounded-md bg-zinc-900 p-3 overflow-x-auto"><code class="text-xs text-zinc-100 font-mono whitespace-pre-wrap break-words">${code}</code></pre>`
    );
    last = match.index + match[0].length;
  }

  if (last < src.length) {
    parts.push(processNonCode(src.slice(last)));
  }

  return parts.join('');
}

function processNonCode(text: string): string {
  const lines = text.split('\n');
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Empty line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Heading
    const hm = line.match(/^(#{1,6})\s+(.+)/);
    if (hm) {
      const level = hm[1].length;
      const cls = level <= 1 ? 'text-base font-bold my-2'
        : level === 2 ? 'text-sm font-bold my-1.5'
        : 'text-sm font-semibold my-1';
      out.push(`<p class="${cls}">${inlineToHtml(hm[2])}</p>`);
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const qlines: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        qlines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      out.push(
        `<blockquote class="my-1.5 border-l-2 border-zinc-600 pl-3 text-zinc-400 italic">${inlineToHtml(qlines.join(' '))}</blockquote>`
      );
      continue;
    }

    // Unordered list
    if (/^[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^(\s*[-*+]\s+)/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ''));
        i++;
      }
      out.push(
        `<ul class="my-1 pl-5 list-disc">${items.map((it) => `<li class="text-sm">${inlineToHtml(it)}</li>`).join('')}</ul>`
      );
      continue;
    }

    // Ordered list
    if (/^\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^(\s*\d+[.)]\s+)/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ''));
        i++;
      }
      out.push(
        `<ol class="my-1 pl-5 list-decimal">${items.map((it) => `<li class="text-sm">${inlineToHtml(it)}</li>`).join('')}</ol>`
      );
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}\s*$/.test(line)) {
      out.push('<hr class="my-2 border-zinc-700" />');
      i++;
      continue;
    }

    // Paragraph — collect consecutive lines
    const plines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].startsWith('```') &&
      !/^#{1,6}\s/.test(lines[i]) &&
      !lines[i].startsWith('>') &&
      !/^[-*+]\s+/.test(lines[i]) &&
      !/^\d+[.)]\s+/.test(lines[i]) &&
      !/^[-*_]{3,}\s*$/.test(lines[i])
    ) {
      plines.push(lines[i]);
      i++;
    }
    if (plines.length > 0) {
      out.push(`<p class="my-1">${inlineToHtml(plines.join('\n'))}</p>`);
    }
  }

  return out.join('');
}

function inlineToHtml(text: string): string {
  let s = escapeHtml(text);

  // Inline code (must come before bold/italic to avoid conflicts)
  s = s.replace(/`([^`]+)`/g, '<code class="rounded bg-zinc-800 px-1 py-0.5 text-xs font-mono text-zinc-200">$1</code>');

  // Bold
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>');

  // Italic
  s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Links [text](url)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>');

  // Line breaks within a paragraph
  s = s.replace(/\n/g, '<br/>');

  return s;
}
