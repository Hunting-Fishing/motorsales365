
interface TeamEmptyProps {
  hasMembers: boolean;
}

export function TeamEmpty({ hasMembers }: TeamEmptyProps) {
  return (
    <div className="p-6 text-center bg-white rounded-lg border border-slate-200">
      <p className="text-slate-500">
        {hasMembers 
          ? "No team members match your current filters. Try adjusting your search criteria."
          : "No team members found. Add team members to get started."}
      </p>
    </div>
  );
}
