
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EquipmentNotesProps {
  notes?: string;
}

export function EquipmentNotes({ notes }: EquipmentNotesProps) {
  if (!notes) {
    return null;
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notes</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-slate-700">{notes}</p>
      </CardContent>
    </Card>
  );
}
