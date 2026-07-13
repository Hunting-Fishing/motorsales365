
import { HeaderBackButton } from "./header/HeaderBackButton";
import { HeaderActions } from "./header/HeaderActions";
import { HeaderTitle } from "./header/HeaderTitle";

interface ProfileHeaderProps {
  memberName: string;
  onEditClick: () => void;
  onDeleteClick: () => void;
}

export function ProfileHeader({ memberName, onEditClick, onDeleteClick }: ProfileHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <HeaderBackButton />
        <HeaderTitle memberName={memberName} />
      </div>
      
      <HeaderActions onEditClick={onEditClick} onDeleteClick={onDeleteClick} />
    </div>
  );
}
