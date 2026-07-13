
import React, { useState } from "react";
import { Card, CardContent } from "@sm/components/ui/card";
import { Textarea } from "@sm/components/ui/textarea";
import { Label } from "@sm/components/ui/label";

export function AdditionalNotesTab() {
  const [notes, setNotes] = useState('');
  
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="technician-notes">Technician Notes</Label>
            <Textarea
              id="technician-notes"
              placeholder="Enter additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[150px]"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
