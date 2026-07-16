import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { Languages, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { translateText } from "@/lib/translate.functions";
import { toast } from "sonner";

interface Props {
  text: string;
  className?: string;
  size?: "sm" | "default";
  /** Called with translated text so caller can render it. */
  onTranslated?: (translated: string) => void;
}

/**
 * Inline "Translate" toggle for user-generated content (listing
 * descriptions, messages, comments). Uses the current UI language as
 * the target. Shows original again on second click.
 */
export function TranslateButton({ text, className, size = "sm", onTranslated }: Props) {
  const { i18n, t } = useTranslation();
  const call = useServerFn(translateText);
  const [translated, setTranslated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const showOriginal = translated !== null;

  const handleClick = async () => {
    if (showOriginal) {
      setTranslated(null);
      onTranslated?.(text);
      return;
    }
    setLoading(true);
    try {
      const target = (i18n.language?.split("-")[0] ?? "en");
      const res = await call({ data: { text, target } });
      if (!res.translated) {
        toast.error(res.error ?? "Translation failed");
        return;
      }
      setTranslated(res.text);
      onTranslated?.(res.text);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Translation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      className={className}
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
      ) : (
        <Languages className="mr-1.5 h-3.5 w-3.5" />
      )}
      {loading
        ? t("common.translating", "Translating…")
        : showOriginal
          ? t("common.showOriginal", "Show original")
          : t("common.translate", "Translate")}
    </Button>
  );
}
