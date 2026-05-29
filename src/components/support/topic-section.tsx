import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function TopicSection({
  id,
  icon: Icon,
  title,
  description,
  children,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border py-10 sm:py-14">
      <div className="mb-6 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <div className="space-y-10">{children}</div>
    </section>
  );
}
