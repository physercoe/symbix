'use client';

import { useState, useRef, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import { wsManager } from '@/lib/ws';
import { useMessageStore } from '@/stores/message-store';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const MAX_FILES = 10;

interface Props {
  channelId: string;
  workspaceId: string;
  replyTo?: { id: string; content: string | null; senderName: string } | null;
  onCancelReply?: () => void;
}

interface MentionSuggestion {
  id: string;
  name: string;
  type: 'agent';
}

interface PendingFile {
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

function FilePreviewIcon({ ct }: { ct: string }) {
  if (ct === 'audio') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

export function MessageInput({ channelId, workspaceId, replyTo, onCancelReply }: Props) {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>();
  const addMessage = useMessageStore((s) => s.addMessage);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);
  const { t } = useTranslation();

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
      setFiles([]);
      onCancelReply?.();
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

  const uploadFile = async (file: File) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${apiUrl}/upload`, { method: 'POST', body: formData });
    if (!res.ok) throw new Error('Upload failed');
    return res.json() as Promise<{ url: string; contentType: string; filename: string; size: number }>;
  };

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if ((!trimmed && files.length === 0) || sendMessage.isPending || uploading) return;

    let mediaUrl: string | undefined;
    let contentType: string = 'text';
    let attachments: Array<{ url: string; contentType: string; filename: string; size?: number }> | undefined;

    if (files.length > 0) {
      setUploading(true);
      try {
        const results = await Promise.all(files.map((f) => uploadFile(f.file)));
        // First file goes into mediaUrl for backward compat
        mediaUrl = results[0].url;
        contentType = results[0].contentType;
        // All files go into attachments array
        attachments = results.map((r) => ({
          url: r.url,
          contentType: r.contentType,
          filename: r.filename,
          size: r.size,
        }));
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
      attachments,
      parentId: replyTo?.id,
    });
    setMentionQuery(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected) return;
    const remaining = MAX_FILES - files.length;
    const newFiles: PendingFile[] = [];
    for (let i = 0; i < Math.min(selected.length, remaining); i++) {
      const file = selected[i];
      const ct = getContentType(file.type);
      const preview = (ct === 'image' || ct === 'video') ? URL.createObjectURL(file) : null;
      newFiles.push({ file, preview, contentType: ct });
    }
    setFiles((prev) => [...prev, ...newFiles]);
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const f = prev[index];
      if (f?.preview) URL.revokeObjectURL(f.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const insertMention = (suggestion: MentionSuggestion) => {
    const before = content.slice(0, mentionStart);
    const after = content.slice(textareaRef.current?.selectionStart ?? content.length);
    setContent(`${before}@${suggestion.name} ${after}`);
    setMentionQuery(null);
    setMentionIndex(0);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mentionQuery !== null && suggestions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex((i) => (i + 1) % suggestions.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex((i) => (i - 1 + suggestions.length) % suggestions.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(suggestions[mentionIndex]); return; }
      if (e.key === 'Escape') { setMentionQuery(null); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
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
    if (atMatch) { setMentionStart(cursorPos - atMatch[0].length); setMentionQuery(atMatch[1]); setMentionIndex(0); }
    else { setMentionQuery(null); }
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
                  i === mentionIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
                )}
                onMouseDown={(e) => { e.preventDefault(); insertMention(s); }}
              >
                <div className="h-2 w-2 rounded-full bg-violet-500 shrink-0" />
                <span className="truncate">{s.name}</span>
                <span className="ml-auto text-[10px] text-muted-foreground">{t('chat.agent')}</span>
              </button>
            ))}
          </div>
        )}

        {/* Reply banner */}
        {replyTo && (
          <div className="mb-2 flex items-center gap-2 rounded-md border-l-2 border-blue-500 bg-accent/30 px-3 py-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-blue-400">
              <polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" />
            </svg>
            <span className="text-xs font-medium text-blue-400">{replyTo.senderName}</span>
            <span className="text-xs text-muted-foreground truncate flex-1">
              {replyTo.content?.slice(0, 80) || t('chat.attachment')}
            </span>
            <button type="button" onClick={onCancelReply} className="shrink-0 text-muted-foreground hover:text-foreground">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {/* Attachment previews (multi-file) */}
        {files.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {files.map((f, i) => (
              <div key={i} className="relative flex items-center gap-2 rounded-md border bg-accent/30 p-2 max-w-[200px]">
                {f.contentType === 'image' && f.preview ? (
                  <img src={f.preview} alt="" className="h-12 w-12 rounded object-cover shrink-0" />
                ) : f.contentType === 'video' && f.preview ? (
                  <video src={f.preview} className="h-12 w-12 rounded object-cover shrink-0" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-accent shrink-0">
                    <FilePreviewIcon ct={f.contentType} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs truncate">{f.file.name}</p>
                  <p className="text-[10px] text-muted-foreground">{(f.file.size / 1024).toFixed(0)} KB</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute -top-1.5 -right-1.5 rounded-full bg-background border h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
            {files.length < MAX_FILES && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                title={t('chat.addMore', { remaining: MAX_FILES - files.length })}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            )}
          </div>
        )}

        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.tar,.gz"
            onChange={handleFileSelect}
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 h-9 w-9"
            onClick={() => fileInputRef.current?.click()}
            title={t('chat.attachFiles', { max: MAX_FILES })}
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
            placeholder={t('chat.placeholder')}
            rows={1}
            className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 overflow-hidden"
          />
          <Button
            onClick={handleSubmit}
            disabled={(!content.trim() && files.length === 0) || sendMessage.isPending || uploading}
            size="icon"
          >
            {uploading ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
