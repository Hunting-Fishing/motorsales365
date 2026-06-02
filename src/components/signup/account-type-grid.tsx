import { AccountTypeCard } from "./account-type-card";
import { SIGNUP_TYPES, type SignupIntent } from "./account-type-grid.types";

interface Props {
  value: SignupIntent | null;
  onChange: (v: SignupIntent) => void;
}

export function AccountTypeGrid({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6">
      {SIGNUP_TYPES.map((t) => (
        <AccountTypeCard
          key={t.id}
          icon={t.icon}
          label={t.label}
          description={t.description}
          badge={t.badge}
          selected={value === t.id}
          onSelect={() => onChange(t.id)}
        />
      ))}
    </div>
  );
}
