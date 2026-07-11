
import { Link } from "react-router-dom";
import { Eye } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TeamMember } from "@/types/team";

interface TeamMemberTableProps {
  members: TeamMember[];
  getInitials: (name: string) => string;
}

export function TeamMemberTable({ members, getInitials }: TeamMemberTableProps) {
  console.log("Table received members:", members.length);
  
  return (
    <div className="rounded-md border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" summary="Team members with their roles, departments, contact information and status">
          <thead className="bg-slate-50">
            <tr className="text-left">
              <th scope="col" className="px-4 py-3 font-medium">Name</th>
              <th scope="col" className="px-4 py-3 font-medium">Role</th>
              <th scope="col" className="px-4 py-3 font-medium">Department</th>
              <th scope="col" className="px-4 py-3 font-medium">Email</th>
              <th scope="col" className="px-4 py-3 font-medium">Phone</th>
              <th scope="col" className="px-4 py-3 font-medium">Status</th>
              <th scope="col" className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {members.map((member) => {
              const hasNoRole = member.role === "No Role Assigned";
              const memberInitials = getInitials(member.name);
              
              return (
                <tr key={member.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage 
                          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`} 
                          alt={`Profile photo of ${member.name}`} 
                        />
                        <AvatarFallback className="bg-esm-blue-100 text-esm-blue-700">
                          {memberInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="text-xs text-slate-500">{member.jobTitle}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {hasNoRole ? (
                      <Badge variant="outline" className="border-yellow-500 text-yellow-700 bg-yellow-50">
                        No Role
                      </Badge>
                    ) : (
                      member.role
                    )}
                  </td>
                  <td className="px-4 py-3">{member.department}</td>
                  <td className="px-4 py-3">
                    <a 
                      href={`mailto:${member.email}`} 
                      className="text-esm-blue-600 hover:underline"
                      aria-label={`Email ${member.name} at ${member.email}`}
                    >
                      {member.email}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <a 
                      href={`tel:${member.phone}`} 
                      className="text-esm-blue-600 hover:underline"
                      aria-label={`Call ${member.name} at ${member.phone || "Not available"}`}
                    >
                      {member.phone || "Not available"}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <Badge 
                      variant={member.status === "Active" ? "success" : "destructive"}
                    >
                      {member.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        asChild
                      >
                        <Link 
                          to={`/team/${member.id}`}
                          aria-label={`View ${member.name}'s profile details`}
                        >
                          <Eye className="h-4 w-4 text-slate-500" aria-hidden="true" />
                        </Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {members.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">
                  No team members found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
