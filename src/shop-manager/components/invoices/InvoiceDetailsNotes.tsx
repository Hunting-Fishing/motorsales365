
interface InvoiceDetailsNotesProps {
  notes: string;
}

export function InvoiceDetailsNotes({ notes }: InvoiceDetailsNotesProps) {
  if (!notes) return null;
  
  return (
    <div className="mt-8">
      <h3 className="text-sm font-medium text-slate-500 uppercase mb-2">Notes:</h3>
      <p className="text-slate-700 bg-slate-50 p-4 rounded-md">{notes}</p>
    </div>
  );
}
