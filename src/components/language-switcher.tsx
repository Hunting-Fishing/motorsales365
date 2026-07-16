import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { SUPPORTED_LANGUAGES } from "@/lib/i18n";

interface Props {
  variant?: "icon" | "compact";
  className?: string;
}

export function LanguageSwitcher({ variant = "icon", className }: Props) {
  const { i18n, t } = useTranslation();
  const current = SUPPORTED_LANGUAGES.find(
    (l) => l.code === (i18n.language?.split("-")[0] ?? "en"),
  ) ?? SUPPORTED_LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={variant === "icon" ? "icon" : "sm"}
          className={className}
          aria-label={t("nav.language", "Language")}
          title={t("nav.language", "Language")}
        >
          <Languages className="h-4 w-4" />
          {variant === "compact" && (
            <span className="ml-1 text-xs font-medium uppercase">{current.code}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{t("nav.language", "Language")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SUPPORTED_LANGUAGES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onSelect={() => {
              void i18n.changeLanguage(l.code);
            }}
            className={l.code === current.code ? "font-semibold" : ""}
          >
            <span className="flex-1">{l.native}</span>
            <span className="text-xs text-muted-foreground">{l.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
