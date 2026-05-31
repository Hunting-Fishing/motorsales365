import { useState } from "react";
import { Share2, Facebook, MessageCircle, Link as LinkIcon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface Props {
  url: string;
  title: string;
  onShare?: (target: "facebook" | "whatsapp" | "twitter" | "copy" | "native") => void;
}

export function ShareButtons({ url, title, onShare }: Props) {
  const [copied, setCopied] = useState(false);

  const share = async (target: "facebook" | "whatsapp" | "twitter" | "copy" | "native") => {
    onShare?.(target);
    if (target === "copy") {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        toast.success("Link copied");
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error("Couldn't copy");
      }
      return;
    }
    if (target === "native") {
      try {
        await (navigator as any).share({ title, url });
      } catch { /* user cancelled */ }
      return;
    }
    const enc = encodeURIComponent(url);
    const text = encodeURIComponent(title);
    const targets: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${enc}`,
      whatsapp: `https://wa.me/?text=${text}%20${enc}`,
      twitter: `https://twitter.com/intent/tweet?url=${enc}&text=${text}`,
    };
    window.open(targets[target], "_blank", "noopener,noreferrer,width=600,height=500");
  };

  const hasNative = typeof navigator !== "undefined" && typeof (navigator as any).share === "function";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline">
          <Share2 className="mr-1 h-4 w-4" /> Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {hasNative && (
          <DropdownMenuItem onClick={() => share("native")}>
            <Share2 className="mr-2 h-4 w-4" /> Share via device
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => share("facebook")}>
          <Facebook className="mr-2 h-4 w-4" /> Facebook
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => share("whatsapp")}>
          <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => share("copy")}>
          {copied ? <Check className="mr-2 h-4 w-4" /> : <LinkIcon className="mr-2 h-4 w-4" />}
          Copy link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
