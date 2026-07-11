
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TeamMember } from "@/types/team";

interface OverviewTabProps {
  member: TeamMember;
}

export function OverviewTab({ member }: OverviewTabProps) {
  console.log("OverviewTab received member:", member);
  
  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Team Member Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <dt className="text-sm font-medium text-slate-500">Department</dt>
              <dd className="mt-1">{member.department || "Not specified"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">Role</dt>
              <dd className="mt-1">{member.role || "Not specified"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">Job Title</dt>
              <dd className="mt-1">{member.jobTitle || "Not specified"}</dd>
            </div>
            {member.joinDate && (
              <div>
                <dt className="text-sm font-medium text-slate-500">Join Date</dt>
                <dd className="mt-1">{new Date(member.joinDate).toLocaleDateString()}</dd>
              </div>
            )}
            {member.lastActive && (
              <div>
                <dt className="text-sm font-medium text-slate-500">Last Active</dt>
                <dd className="mt-1">{new Date(member.lastActive).toLocaleString()}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {member.role.toLowerCase().includes("technician") && member.workOrders && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Work Order Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div className="flex flex-col items-center p-4 bg-slate-50 rounded-lg">
                <span className="text-sm font-medium text-slate-500">Assigned Work Orders</span>
                <span className="text-3xl font-bold text-esm-blue-600 mt-2">{member.workOrders.assigned}</span>
              </div>
              <div className="flex flex-col items-center p-4 bg-slate-50 rounded-lg">
                <span className="text-sm font-medium text-slate-500">Completed Work Orders</span>
                <span className="text-3xl font-bold text-esm-blue-600 mt-2">{member.workOrders.completed}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {member.notes && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700">{member.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
