
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamMember } from "@/types/team";
import { 
  TeamMemberHistoryRecord, 
  fetchTeamMemberHistory, 
  formatHistoryRecord 
} from "@/utils/team/history";
import { Loader2 } from "lucide-react";

interface HistoryTabProps {
  member: TeamMember;
}

export function HistoryTab({ member }: HistoryTabProps) {
  const [history, setHistory] = useState<TeamMemberHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (member.id) {
      setIsLoading(true);
      fetchTeamMemberHistory(member.id)
        .then(data => {
          setHistory(data);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [member.id]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Member History</CardTitle>
        <CardDescription>
          View the history of changes for this team member
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : history.length > 0 ? (
          <div className="space-y-6">
            <div className="relative pl-8 border-l border-muted">
              {history.map((record) => (
                <div key={record.id} className="mb-6 relative">
                  <div className="absolute -left-4 h-8 w-8 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                    <span className="h-4 w-4 rounded-full bg-muted-foreground"></span>
                  </div>
                  <div className="pl-6">
                    <h4 className="text-sm font-medium mb-1">{record.action_type.replace('_', ' ')}</h4>
                    <p className="text-muted-foreground text-sm">
                      {formatHistoryRecord(record)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No history records found
          </div>
        )}
      </CardContent>
    </Card>
  );
}
