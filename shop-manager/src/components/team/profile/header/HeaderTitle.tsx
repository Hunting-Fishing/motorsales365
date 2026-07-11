
interface HeaderTitleProps {
  memberName: string;
}

export function HeaderTitle({ memberName }: HeaderTitleProps) {
  return (
    <h1 className="text-2xl font-bold tracking-tight">
      {memberName || "Team Member Profile"}
    </h1>
  );
}
