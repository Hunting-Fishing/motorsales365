import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Copy, Download, Loader2, Lock, Printer, QrCode } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { authorizeStaffQrAccess, downloadStaffQrPng } from "@/lib/staff-qr-auth.functions";

type Props = {
  code: string;
  name: string | null;
  email: string;
  active: boolean;
};

export function StaffQrDialog({ code, name, email, active }: Props) {
  const [open, setOpen] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "checking" | "authorized" | "denied">("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const authorize = useServerFn(authorizeStaffQrAccess);
  const downloadPng = useServerFn(downloadStaffQrPng);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (status !== "idle") return;
    let cancelled = false;
    setStatus("checking");
    setErrMsg(null);
    (async () => {
      try {
        const res = await (authorize as any)({ data: { code } });
        if (cancelled) return;
        setLink(res.link);
        setStatus("authorized");
        const png = await QRCode.toDataURL(res.link, {
          width: 900,
          margin: 2,
          errorCorrectionLevel: "H",
        });
        if (!cancelled) setDataUrl(png);
      } catch (e: any) {
        if (cancelled) return;
        setStatus("denied");
        setErrMsg(e?.message ?? "Not permitted");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, status, code, authorize]);

  const reset = () => {
    setOpen(false);
    setDataUrl(null);
    setLink(null);
    setStatus("idle");
    setErrMsg(null);
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        title={`View QR for ${name ?? email}`}
      >
        <QrCode className="mr-1 h-4 w-4" />
        QR
      </Button>
      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : reset())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>QR code — {name ?? email}</DialogTitle>
            <DialogDescription>
              Code <span className="font-mono">{code}</span>
              {!active && (
                <span className="ml-2 rounded bg-yellow-100 px-2 py-0.5 text-[11px] font-medium text-yellow-800">
                  inactive
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {status === "checking" && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifying permission…
            </div>
          )}

          {status === "denied" && (
            <div className="flex flex-col items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-6 text-center">
              <Lock className="h-6 w-6 text-destructive" />
              <div className="text-sm font-medium text-destructive">Access denied</div>
              <div className="text-xs text-muted-foreground">
                {errMsg ?? "You don't have permission to view this QR code."}
              </div>
            </div>
          )}

          {status === "authorized" && (
            <div className="flex flex-col items-center gap-3">
              {dataUrl ? (
                <img
                  src={dataUrl}
                  alt={`QR for ${code}`}
                  className="h-72 w-72 rounded-md border border-border bg-white p-3"
                />
              ) : (
                <div className="h-72 w-72 animate-pulse rounded-md bg-muted" />
              )}
              {link && (
                <a
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-xs text-primary hover:underline"
                >
                  {link}
                </a>
              )}
            </div>
          )}

          <DialogFooter className="flex-wrap gap-2 sm:gap-2">
            {status === "authorized" && link && (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(link);
                  toast.success("Link copied");
                }}
              >
                <Copy className="mr-1 h-4 w-4" /> Copy link
              </Button>
            )}
            {status === "authorized" && (
              <Button
                variant="outline"
                size="sm"
                disabled={downloading}
                onClick={async () => {
                  setDownloading(true);
                  try {
                    const res = await (downloadPng as any)({ data: { code } });
                    // Trigger download from the server-issued PNG only after
                    // the server re-confirms permission on this request.
                    const a = document.createElement("a");
                    a.href = res.dataUrl;
                    a.download = res.filename;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                  } catch (e: any) {
                    toast.error(e?.message ?? "Download not permitted");
                  } finally {
                    setDownloading(false);
                  }
                }}
              >
                {downloading ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-1 h-4 w-4" />
                )}
                Download PNG
              </Button>
            )}
            {status === "authorized" && (
              <Link to="/r/$code/poster" params={{ code }} target="_blank">
                <Button variant="outline" size="sm">
                  <Printer className="mr-1 h-4 w-4" /> Print poster
                </Button>
              </Link>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
