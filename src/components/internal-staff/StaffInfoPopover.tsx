import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function StaffInfoPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="About this page">
          <Info className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 text-sm">
        <div className="font-semibold mb-1">Internal 365 team</div>
        <p className="text-muted-foreground mb-2">
          Everyone with an <code className="rounded bg-muted px-1">@365motorsales.com</code>{" "}
          address is part of the internal 365 MotorSales team — not a separate
          seller account.
        </p>
        <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
          <li>Only <b>admin@365motorsales.com</b> can add or remove staff.</li>
          <li>
            Each staff member has one direct manager. Admin sits at the top;
            new hires default to reporting to admin (or to whoever added them).
          </li>
          <li>You can see every teammate and message any of them.</li>
          <li>
            The manager tree is used for org visibility only — there are no
            commission overrides or downline payouts.
          </li>
        </ul>
      </PopoverContent>
    </Popover>
  );
}
