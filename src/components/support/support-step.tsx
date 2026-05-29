import type { ReactNode } from "react";

export function SupportSteps({ children }: { children: ReactNode }) {
  return <ol className="mt-4 space-y-3">{children}</ol>;
}

export function SupportStep({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children?: ReactNode;
}) {
  return (
    <li className="flex gap-3 rounded-lg border border-border bg-card p-3 sm:p-4">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
        {n}
      </span>
      <div className="min-w-0">
        <p className="font-medium leading-snug">{title}</p>
        {children && (
          <div className="mt-1 text-sm text-muted-foreground">{children}</div>
        )}
      </div>
    </li>
  );
}
