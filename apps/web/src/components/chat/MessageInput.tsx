'use client';

import { useState, useRef, useCallback } from 'react';
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

interface PendingAttachment {
  file: File;
  preview: string | null;
  contentType: string;
}

function getContentType(mime: string): string {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'file';
}

export function MessageInput({ channelId, workspaceId }: Props) {
  const [content, setContent] = useState('');
  const [attachment, setAttachment] = useState<PendingAttachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>();
  const addMessage = useMessageStore((s) => s.addMessage);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);

  const { data: members } = trpc.channels.listMembers.useQuery({ channelId });
  const { data: allAgents } = trpc.agents.list.useQuery({ workspaceId });

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
      addMessage(channelId, message);
      setContent('');
      setAttachment(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.overflowY = 'hidden';
      }
    },
  });

  const handleTyping = useCallback(() => {
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    wsManager.sendTyping(channelId);
    typingTimeout.current = setTimeout(() => {}, 3000);
  }, [channelId]);

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if ((!trimmed && !attachment) || sendMessage.isPending || uploading) return;

    let mediaUrl: string | undefined;
    let contentType: string = 'text';

    if (attachment) {
      setUploading(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const formData = new FormData();
        formData.append('file', attachment.file);
        const res = await fetch(`${apiUrl}/upload`, { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json();
        mediaUrl = data.url;
        contentType = data.contentType;
      } catch (err) {
        console.error('Upload error:', err);
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    sendMessage.mutate({
      channelId,
      content: trimmed || undefined,
      contentType: contentType as any,
      mediaUrl,
    });
    setMentionQuery(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ct = getContentType(file.type);
    let preview: string | null = null;
    if (ct === 'image' || ct === 'video') {
      preview = URL.createObjectURL(file);
    }
    setAttachment({ file, preview, contentType: ct });
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const removeAttachment = () => {
    if (attachment?.preview) URL.revokeObjectURL(attachment.preview);
    setAttachment(null);
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

  const resizeRaf = useRef<number>(0);
  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    cancelAnimationFrame(resizeRaf.current);
    resizeRaf.current = requestAnimationFrame(() => {
      el.style.height = 'auto';
      const newHeight = Math.min(el.scrollHeight, 160);
      el.style.height = newHeight + 'px';
      el.style.overflowY = el.scrollHeight > 160 ? 'auto' : 'hidden';
    });
  }, []);

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

        {/* Attachment preview */}
        {attachment && (
          <div className="mb-2 flex items-center gap-2 rounded-md border bg-accent/30 p-2">
            {attachment.contentType === 'image' && attachment.preview && (
              <img src={attachment.preview} alt="preview" className="h-16 w-16 rounded object-cover" />
            )}
            {attachment.contentType === 'video' && attachment.preview && (
              <video src={attachment.preview} className="h-16 w-16 rounded object-cover" />
            )}
            {attachment.contentType === 'audio' && (
              <div className="flex h-10 w-10 items-center justify-center rounded bg-accent">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              </div>
            )}
            {attachment.contentType === 'file' && (
              <div className="flex h-10 w-10 items-center justify-center rounded bg-accent">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{attachment.file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(attachment.file.size / 1024).toFixed(0)} KB
              </p>
            </div>
            <button
              type="button"
              onClick={removeAttachment}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.tar,.gz"
            onChange={handleFileSelect}
          />

          {/* Attachment button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 h-9 w-9"
            onClick={() => fileInputRef.current?.click()}
            title="Attach file"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </Button>

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
            disabled={(!content.trim() && !attachment) || sendMessage.isPending || uploading}
            size="icon"
          >
            {uploading ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
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
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
