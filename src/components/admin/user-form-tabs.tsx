import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BUSINESS_KIND_OPTIONS } from "@/data/business-kinds";

export type StaffRole = "admin" | "moderator" | "support" | "sales" | "advertising";
export const STAFF_ROLES: StaffRole[] = ["admin", "moderator", "support", "sales", "advertising"];

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

export function RoleChips({
  roles,
  onToggle,
  disabled = false,
}: {
  roles: StaffRole[];
  onToggle: (r: StaffRole) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {STAFF_ROLES.map((r) => {
        const on = roles.includes(r);
        return (
          <button
            key={r}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onToggle(r)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              on
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:border-primary/50"
            } ${disabled ? "cursor-not-allowed opacity-60 hover:border-border" : ""}`}
          >
            {on ? "✓ " : "+ "}
            {r}
          </button>
        );
      })}
    </div>
  );
}

export function BusinessKindSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value || "none"} onValueChange={(v) => onChange(v === "none" ? "" : v)}>
      <SelectTrigger className="h-9 text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">None</SelectItem>
        {BUSINESS_KIND_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function compactInput(extra = "") {
  return `h-9 text-sm ${extra}`.trim();
}

export type AddressFields = {
  street_address: string;
  signup_city: string;
  signup_province: string;
  signup_region: string;
  postal_code: string;
};

export function AddressSection({
  value,
  onChange,
}: {
  value: AddressFields;
  onChange: (patch: Partial<AddressFields>) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field label="Street address">
          <Input
            className={compactInput()}
            value={value.street_address}
            onChange={(e) => onChange({ street_address: e.target.value })}
          />
        </Field>
      </div>
      <Field label="City">
        <Input
          className={compactInput()}
          value={value.signup_city}
          onChange={(e) => onChange({ signup_city: e.target.value })}
        />
      </Field>
      <Field label="Province">
        <Input
          className={compactInput()}
          value={value.signup_province}
          onChange={(e) => onChange({ signup_province: e.target.value })}
        />
      </Field>
      <Field label="Region">
        <Input
          className={compactInput()}
          value={value.signup_region}
          onChange={(e) => onChange({ signup_region: e.target.value })}
        />
      </Field>
      <Field label="Postal code">
        <Input
          className={compactInput()}
          value={value.postal_code}
          onChange={(e) => onChange({ postal_code: e.target.value })}
        />
      </Field>
    </div>
  );
}
