import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Send, Image as ImageIcon, Video, Smile, X, Loader2, Sticker, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { GifPicker } from "./gif-picker";
import type { GiphyItem } from "@/lib/giphy.functions";

const EmojiPicker = lazy(() => import("emoji-picker-react"));

const MAX_IMAGE_MB = 10;
const MAX_VIDEO_MB = 50;
const MAX_VIDEO_SEC = 60;

export type MessageAttachment = {
  type: "image" | "video" | "gif";
  url: string;
  thumbUrl?: string | null;
  path?: string | null;
  meta?: Record<string, unknown> | null;
  /** Local blob URL used only for pre-send preview; not persisted */
  localPreviewUrl?: string | null;
};

export type MessagePayload = {
  body: string;
  attachment?: MessageAttachment;
};

interface Props {
  onSend: (payload: MessagePayload) => Promise<void> | void;
  sending?: boolean;
  placeholder?: string;
  compact?: boolean;
  disabled?: boolean;
}

async function probeVideo(file: File): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    v.src = URL.createObjectURL(file);
    v.onloadedmetadata = () => {
      const info = { duration: v.duration, width: v.videoWidth, height: v.videoHeight };
      URL.revokeObjectURL(v.src);
      resolve(info);
    };
    v.onerror = () => {
      URL.revokeObjectURL(v.src);
      reject(new Error("Could not read video"));
    };
  });
}

async function probeImage(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Could not read image"));
    };
    img.src = URL.createObjectURL(file);
  });
}

export function MessageComposer({
  onSend,
  sending = false,
  placeholder = "Write a message…",
  compact = false,
  disabled = false,
}: Props) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<MessageAttachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const imageInput = useRef<HTMLInputElement | null>(null);
  const videoInput = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);

  useEffect(() => {
    if (!sending) textareaRef.current?.focus();
  }, [sending]);

  const canSend = !disabled && !sending && !uploading && (text.trim() || attachment);

  const uploadFile = async (file: File, kind: "image" | "video") => {
    if (!user) {
      toast.error("Please sign in");
      return;
    }
    const sizeMb = file.size / (1024 * 1024);
    if (kind === "image" && sizeMb > MAX_IMAGE_MB) {
      toast.error(`Image must be ≤ ${MAX_IMAGE_MB}MB`);
      return;
    }
    if (kind === "video" && sizeMb > MAX_VIDEO_MB) {
      toast.error(`Video must be ≤ ${MAX_VIDEO_MB}MB`);
      return;
    }
    let meta: Record<string, unknown> = { size: file.size, mime: file.type };
    try {
      if (kind === "video") {
        const info = await probeVideo(file);
        if (info.duration > MAX_VIDEO_SEC + 0.5) {
          toast.error(`Video must be ≤ ${MAX_VIDEO_SEC}s (got ${Math.round(info.duration)}s)`);
          return;
        }
        meta = { ...meta, ...info };
      } else {
        const info = await probeImage(file);
        meta = { ...meta, ...info };
      }
    } catch {
      toast.error("Could not read file");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop() || (kind === "image" ? "jpg" : "mp4");
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const localPreviewUrl = URL.createObjectURL(file);
    const { error } = await supabase.storage.from("message-media").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    setUploading(false);
    if (error) {
      URL.revokeObjectURL(localPreviewUrl);
      toast.error(error.message);
      return;
    }
    setAttachment({ type: kind, url: "", path, meta, localPreviewUrl });
  };

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) uploadFile(f, "image");
  };
  const handleVideoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) uploadFile(f, "video");
  };

  const insertEmoji = (emoji: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      setText((t) => t + emoji);
      return;
    }
    const start = ta.selectionStart ?? text.length;
    const end = ta.selectionEnd ?? text.length;
    const next = text.slice(0, start) + emoji + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + emoji.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  useEffect(() => {
    return () => {
      if (attachment?.localPreviewUrl) URL.revokeObjectURL(attachment.localPreviewUrl);
    };
  }, [attachment?.localPreviewUrl]);

  const clearAttachment = () => {
    if (attachment?.localPreviewUrl) URL.revokeObjectURL(attachment.localPreviewUrl);
    setAttachment(null);
  };

  const submit = async () => {
    if (!canSend) return;
    try {
      const outgoing = attachment
        ? { type: attachment.type, url: attachment.url, thumbUrl: attachment.thumbUrl, path: attachment.path, meta: attachment.meta }
        : undefined;
      await onSend({
        body: text.trim(),
        attachment: outgoing,
      });
      if (attachment?.localPreviewUrl) URL.revokeObjectURL(attachment.localPreviewUrl);
      setText("");
      setAttachment(null);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to send");
    }
  };

  return (
    <div className="w-full">
      <input
        ref={imageInput}
        type="file"
        accept="image/*"
        hidden
        onChange={handleImagePick}
      />
      <input
        ref={videoInput}
        type="file"
        accept="video/*"
        hidden
        onChange={handleVideoPick}
      />

      {attachment && (
        <div className="mb-2 rounded-lg border border-border bg-secondary/40 p-2">
          <div className="flex items-start gap-2">
            {attachment.type === "video" ? (
              <video
                src={attachment.localPreviewUrl ?? undefined}
                controls
                playsInline
                preload="metadata"
                className="max-h-40 w-full max-w-[220px] rounded-md bg-black"
              />
            ) : attachment.type === "gif" ? (
              <img
                src={attachment.url}
                alt="GIF preview"
                className="max-h-40 rounded-md object-cover"
              />
            ) : (
              <img
                src={attachment.localPreviewUrl ?? attachment.url}
                alt="Image preview"
                className="max-h-40 rounded-md object-cover"
              />
            )}
            <div className="flex-1 text-xs">
              <div className="font-medium capitalize">{attachment.type} attached</div>
              <div className="text-muted-foreground">
                {attachment.type === "video" && attachment.meta && typeof (attachment.meta as any).duration === "number"
                  ? `${Math.round((attachment.meta as any).duration)}s • ready to send`
                  : "Ready to send"}
              </div>
            </div>
            <button
              type="button"
              onClick={clearAttachment}
              className="rounded-full p-1 hover:bg-secondary"
              aria-label="Remove attachment"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-end gap-1.5">
        <Popover open={plusOpen} onOpenChange={setPlusOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-9 w-9 shrink-0 rounded-full"
              disabled={disabled || uploading}
              aria-label="Add attachment"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-5 w-5" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-40 p-1">
            <button
              type="button"
              onClick={() => {
                setPlusOpen(false);
                imageInput.current?.click();
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-secondary"
            >
              <ImageIcon className="h-4 w-4" /> Photo
            </button>
            <button
              type="button"
              onClick={() => {
                setPlusOpen(false);
                videoInput.current?.click();
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-secondary"
            >
              <Video className="h-4 w-4" /> Video
            </button>
          </PopoverContent>
        </Popover>

        <Popover open={gifOpen} onOpenChange={setGifOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-9 w-9 shrink-0 rounded-full"
              disabled={disabled}
              aria-label="Send a GIF"
            >
              <Sticker className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="p-0">
            <GifPicker
              onPick={(g: GiphyItem) => {
                setAttachment({
                  type: "gif",
                  url: g.full_url,
                  thumbUrl: g.preview_url,
                  meta: { width: g.width, height: g.height, giphy_id: g.id },
                });
                setGifOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>

        <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-9 w-9 shrink-0 rounded-full"
              disabled={disabled}
              aria-label="Insert emoji"
            >
              <Smile className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-0">
            <Suspense
              fallback={
                <div className="flex h-64 w-64 items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              }
            >
              <EmojiPicker
                onEmojiClick={(e) => insertEmoji(e.emoji)}
                width={300}
                height={360}
              />
            </Suspense>
          </PopoverContent>
        </Popover>

        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={compact ? 2 : 2}
          placeholder={placeholder}
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          className="min-h-[40px] resize-none"
        />
        <Button
          type="button"
          onClick={submit}
          disabled={!canSend}
          size="icon"
          className="h-9 w-9 shrink-0 rounded-full"
          aria-label="Send"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
