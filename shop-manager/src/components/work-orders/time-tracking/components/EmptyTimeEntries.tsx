
import React from "react";
import { Clock } from "lucide-react";

export function EmptyTimeEntries() {
  return (
    <div className="text-center py-10 border rounded">
      <Clock className="mx-auto h-10 w-10 text-slate-300" />
      <p className="mt-2 text-slate-500">No time entries recorded</p>
    </div>
  );
}
