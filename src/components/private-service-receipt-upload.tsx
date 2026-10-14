import { useState } from "react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { validateReceiptFile } from "@/lib/vehicle-receipts";
import { toast } from "sonner";
export function PrivateServiceReceiptUpload({
  userId,
  vehicleId,
  onChange,
}: {
  userId: string;
  vehicleId: string;
  onChange: (path: string | null) => void;
}) {
  const [busy, setBusy] = useState(false),
    [name, setName] = useState("");
  return (
    <div className="space-y-1">
      <Input
        aria-label="Private service receipt"
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        disabled={busy || Boolean(name)}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          try {
            validateReceiptFile(file);
            const ext =
              file.type === "application/pdf"
                ? "pdf"
                : file.type === "image/png"
                  ? "png"
                  : file.type === "image/webp"
                    ? "webp"
                    : "jpg";
            const path = `${userId}/${vehicleId}/${crypto.randomUUID()}.${ext}`;
            const r = await supabase.storage
              .from("vehicle-service-receipts")
              .upload(path, file, { upsert: false, contentType: file.type });
            if (r.error) throw r.error;
            setName(file.name);
            onChange(path);
          } catch (err: any) {
            toast.error(err.message);
          } finally {
            setBusy(false);
          }
        }}
      />
      <p className="text-xs text-muted-foreground">
        {busy
          ? "Uploading…"
          : name
            ? `${name} · Private attachment`
            : "Private image/PDF attachment, maximum 10 MB."}
      </p>
    </div>
  );
}
