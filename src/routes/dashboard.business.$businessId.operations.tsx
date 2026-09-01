import { createFileRoute } from "@tanstack/react-router";
import { EmployeeOperations } from "@/routes/_authenticated/workspace.operations";

export const Route = createFileRoute("/dashboard/business/$businessId/operations")({
  component: BusinessEmployeeOperations,
  head: () => ({
    meta: [
      { title: "Employee Operations — Business workspace" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function BusinessEmployeeOperations() {
  return <EmployeeOperations embedded />;
}
