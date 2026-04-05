'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { wsManager } from '@/lib/ws';
import { useMessageStore } from '@/stores/message-store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  channelId: string;
  workspaceId: string;
}

interface MentionSuggestion {
  id: string;
  name: string;
  type: 'agent';
}

export function MessageInput({ channelId, workspaceId }: Props) {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>();
  const addMessage = useMessageStore((s) => s.addMessage);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);

  const { data: members } = trpc.channels.listMembers.useQuery({ channelId });
  const { data: allAgents } = trpc.agents.list.useQuery({ workspaceId });

  // Build mention suggestions from channel agent members
  const suggestions: MentionSuggestion[] = [];
  if (mentionQuery !== null && members && allAgents) {
    const agentMembers = members
      .filter((m) => m.memberType === 'agent' && m.agentId)
      .map((m) => allAgents.find((a) => a.id === m.agentId))
      .filter(Boolean);

    const q = mentionQuery.toLowerCase();
    for (const agent of agentMembers) {
      if (!q || agent!.name.toLowerCase().includes(q)) {
        suggestions.push({ id: agent!.id, name: agent!.name, type: 'agent' });
      }
    }
  }

  const sendMessage = trpc.messages.send.useMutation({
    onSuccess: (message) => {
      // Add message to store immediately so it shows up without waiting for WS
      addMessage(channelId, message);
      setContent('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.overflowY = 'hidden';
      }
    },
  });

  const handleTyping = useCallback(() => {
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    wsManager.sendTyping(channelId);
    typingTimeout.current = setTimeout(() => {
      // typing stopped
    }, 3000);
  }, [channelId]);

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (!trimmed || sendMessage.isPending) return;
    sendMessage.mutate({ channelId, content: trimmed });
    setMentionQuery(null);
  };

  const insertMention = (suggestion: MentionSuggestion) => {
    const before = content.slice(0, mentionStart);
    const after = content.slice(textareaRef.current?.selectionStart ?? content.length);
    const newContent = `${before}@${suggestion.name} ${after}`;
    setContent(newContent);
    setMentionQuery(null);
    setMentionIndex(0);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle mention popup navigation
    if (mentionQuery !== null && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(suggestions[mentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Debounced auto-resize: avoid collapsing/expanding on every keystroke
  const resizeRaf = useRef<number>(0);
  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    // Only recalc if needed — avoid expensive relayout on every char
    cancelAnimationFrame(resizeRaf.current);
    resizeRaf.current = requestAnimationFrame(() => {
      el.style.height = 'auto';
      const newHeight = Math.min(el.scrollHeight, 160);
      el.style.height = newHeight + 'px';
      el.style.overflowY = el.scrollHeight > 160 ? 'auto' : 'hidden';
    });
  }, []);

  // Detect @mention — only check last 50 chars before cursor, not entire text
  const detectMention = useCallback((value: string, cursorPos: number) => {
    const lookback = value.slice(Math.max(0, cursorPos - 50), cursorPos);
    const atMatch = lookback.match(/@(\w*)$/);
    if (atMatch) {
      setMentionStart(cursorPos - atMatch[0].length);
      setMentionQuery(atMatch[1]);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);
    handleTyping();
    resizeTextarea();
    detectMention(value, e.target.selectionStart);
  };

  return (
    <div className="shrink-0 border-t p-4">
      <div className="relative">
        {/* Mention autocomplete popup */}
        {mentionQuery !== null && suggestions.length > 0 && (
          <div className="absolute bottom-full left-0 mb-1 w-64 rounded-md border bg-popover p-1 shadow-md z-50">
            {suggestions.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className={cn(
                  'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-left transition-colors',
                  i === mentionIndex
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50',
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(s);
                }}
              >
                <div className="h-2 w-2 rounded-full bg-violet-500 shrink-0" />
                <span className="truncate">{s.name}</span>
                <span className="ml-auto text-[10px] text-muted-foreground">agent</span>
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (@ to mention an agent)"
            rows={1}
            className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 overflow-hidden"
          />
          <Button
            onClick={handleSubmit}
            disabled={!content.trim() || sendMessage.isPending}
            size="icon"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}
