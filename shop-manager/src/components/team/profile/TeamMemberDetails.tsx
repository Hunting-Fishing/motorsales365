
import { TeamMember } from "@/types/team";
import { OverviewTab } from "./tabs/OverviewTab";
import { PermissionsTab } from "./tabs/PermissionsTab";
import { ActivityTab } from "./tabs/ActivityTab";
import { EditProfileTab } from "./tabs/EditProfileTab";
import { HistoryTab } from "./tabs/HistoryTab";

interface TeamMemberDetailsProps {
  member: TeamMember;
  activeTab: string;
}

export function TeamMemberDetails({ member, activeTab }: TeamMemberDetailsProps) {
  console.log("TeamMemberDetails received member:", member);

  // Split name into first and last name for form
  const nameParts = member.name.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  // Convert member data to form values format for editing
  const initialFormData = {
    id: member.id,
    firstName,
    lastName,
    email: member.email,
    phone: member.phone || '',
    jobTitle: member.jobTitle || '',
    department: member.department || '',
    role: member.role,
    status: member.status === 'Active',
    notes: member.notes || ''
  };

  return (
    <div className="pt-6">
      {activeTab === "overview" && <OverviewTab member={member} />}
      
      {activeTab === "permissions" && <PermissionsTab memberRole={member.role} memberId={member.id} />}
      
      {activeTab === "activity" && <ActivityTab memberId={member.id} />}
      
      {activeTab === "edit" && <EditProfileTab initialData={initialFormData} />}
      
      {activeTab === "history" && <HistoryTab member={member} />}
    </div>
  );
}
