
import { Skeleton } from "@/components/ui/skeleton";

export function CompanyTabSkeleton() {
  return (
    <div className="flex justify-center items-center h-40">
      <div className="space-y-6 w-full">
        <div className="flex flex-col space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex flex-col space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex flex-col space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}
