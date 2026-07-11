import { useState } from "react";
import { X } from "lucide-react";
import { useSignedMessageUrl } from "@/hooks/use-signed-message-url";

interface Props {
  type: "image" | "video" | "gif";
  url: string | null;
  path: string | null;
  meta?: { width?: number; height?: number } | null;
}

export function AttachmentBubble({ type, url, path, meta }: Props) {
  const signed = useSignedMessageUrl(path);
  const src = type === "gif" ? url : (signed ?? url);
  const [lightbox, setLightbox] = useState(false);

  if (!src) {
    return (
      <div className="mt-1 h-32 w-48 animate-pulse rounded-lg bg-muted" />
    );
  }

  if (type === "video") {
    return (
      <video
        src={src}
        controls
        playsInline
        preload="metadata"
        className="mt-1 max-h-72 w-full max-w-xs rounded-lg bg-black"
      />
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => type !== "gif" && setLightbox(true)}
        className="mt-1 block"
      >
        <img
          src={src}
          alt={type === "gif" ? "GIF" : "Photo"}
          loading="lazy"
          width={meta?.width}
          height={meta?.height}
          className="max-h-72 max-w-xs rounded-lg object-cover"
        />
      </button>
      {lightbox && (
        <div
          role="dialog"
          className="fixed inset-0 z-[100] grid place-items-center bg-black/85 p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white"
            onClick={() => setLightbox(false)}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <img src={src} alt="" className="max-h-[90vh] max-w-[90vw] rounded-lg" />
        </div>
      )}
    </>
  );
}
