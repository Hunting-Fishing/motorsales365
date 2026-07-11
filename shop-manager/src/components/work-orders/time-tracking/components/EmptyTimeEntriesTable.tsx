
import React from "react";
import { Clock } from "lucide-react";

export function EmptyTimeEntriesTable() {
  return (
    <div className="text-center py-10 border rounded">
      <Clock className="mx-auto h-10 w-10 text-slate-300" />
      <p className="mt-2 text-slate-500">No time entries recorded</p>
      <p className="text-sm text-slate-400">Time entries will appear here once added</p>
    </div>
  );
}
