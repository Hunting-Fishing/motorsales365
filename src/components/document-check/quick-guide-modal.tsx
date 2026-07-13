import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Printer, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SimpleMarkdown } from "@/components/simple-markdown";
import { getDocCheckCountry } from "@/lib/document-check.functions";

/**
 * Modal shown from Buyer Resources ("LTO & document check"). Fetches the
 * Quick Guide section for the given country and links to the full page +
 * printable guide.
 */
export function QuickGuideModal({
  countryCode = "ph",
  trigger,
}: {
  countryCode?: string;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const fetchFn = useServerFn(getDocCheckCountry);

  const { data, isLoading } = useQuery({
    queryKey: ["doc-check-country-modal", countryCode],
    queryFn: () => fetchFn({ data: { code: countryCode } }),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div onClick={() => setOpen(true)} className="contents">
        {trigger}
      </div>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {data?.country.flag_emoji ?? "🌐"}{" "}
            <span>
              {data?.country.name ?? "Document Check"} — Quick Guide
            </span>
          </DialogTitle>
          <DialogDescription>
            The short buyer checklist. Read the full country page for laws, fees,
            and agency links.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[55vh] overflow-y-auto pr-1">
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && !data && (
            <p className="text-sm text-muted-foreground">
              A Document Check page for this country is being compiled.
            </p>
          )}
          {data && (
            <>
              {(() => {
                const quick = data.sections.find((s) => s.kind === "quick_guide");
                return quick ? (
                  <SimpleMarkdown source={quick.body_md} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Quick guide content for {data.country.name} is coming soon.
                  </p>
                );
              })()}
            </>
          )}
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {data && (
            <>
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link
                  to="/document-check/$country/quick-guide"
                  params={{ country: data.country.slug }}
                >
                  <Printer className="h-4 w-4" /> Print / PDF
                </Link>
              </Button>
              <Button asChild className="w-full sm:w-auto">
                <Link
                  to="/document-check/$country"
                  params={{ country: data.country.slug }}
                >
                  Read full guide <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
