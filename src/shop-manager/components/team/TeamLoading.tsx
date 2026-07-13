
import { Loader2 } from "lucide-react";

export function TeamLoading() {
  return (
    <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg border border-slate-200">
      <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
      <p className="text-slate-500">Loading team members...</p>
    </div>
  );
}
