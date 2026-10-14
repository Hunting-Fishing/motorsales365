import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { suggestShopLink } from "@/lib/shop.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Visitors can suggest a link. They cannot publish or edit a Part Pick. */
export function SuggestPartLink() {
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [company, setCompany] = useState("");

  const send = useMutation({
    mutationFn: () => suggestShopLink({ data: { url, note, company } }),
    onSuccess: () => {
      toast.success("Suggestion sent. We’ll look at the link before it goes live.");
      setUrl("");
      setNote("");
      setCompany("");
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not send that suggestion"),
  });

  return (
    <form
      className="rounded-xl border bg-card p-4 sm:p-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (url.trim().length < 4) return;
        send.mutate();
      }}
    >
      <h2 className="font-semibold">Suggest a part</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Found a link on Shopee, Lazada, AliExpress, Alibaba, Amazon, or another store? Paste it
        here. This does not publish a listing. We add it to Part Picks after we review it.
      </p>
      <div className="mt-3 space-y-3">
        <div className="space-y-1">
          <Label htmlFor="suggest-url">Link</Label>
          <Input
            id="suggest-url"
            type="url"
            inputMode="url"
            required
            maxLength={2000}
            placeholder="https://"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="suggest-note">What is it? Optional</Label>
          <Textarea
            id="suggest-note"
            maxLength={400}
            rows={2}
            placeholder="Bidirectional OBD2, budget option"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
          <label>
            Company
            <input
              tabIndex={-1}
              autoComplete="off"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </label>
        </div>
        <Button type="submit" disabled={send.isPending || url.trim().length < 4}>
          {send.isPending ? "Sending…" : "Send suggestion"}
        </Button>
      </div>
    </form>
  );
}
